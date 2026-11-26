# M0-1126-A — CD↔POS 동기화 Case 1 실패 진단 (코드-only · 로컬 재현 미실행)

**판정 (추정 · 강함)**: 서버 `derivePaymentPhase` 는 `pos_screen` 단독으로는 `paid` 를 인식하지 못한다(`snapshot_state='paid'` 전환이 필요). POS→서버 `pos_screen='paid'` emit 은 도달해도 `snapshot_state` 는 `order.updated`/`payment.captured` 서브스크라이버만 바꾸므로, **서브스크라이버가 아직 돌지 않은 폴링 윈도우 동안 CD 가 `payment_phase='building'` 을 보게 되어 영수증 화면이 안 뜸**. Cash 결제수단 화면의 "Enter phone number 비활성" 은 같은 pipeline 상 **POS web 의 `pos_screen='payment_cash'` emit 이 서버에 persist 되지 못했을 가능성이 가장 강한 추정**(미검증 — 네트워크 캡처 필요).

> 다음에 확정하려면: Chrome DevTools Network 에서 `/admin/pos/orders/<draftOrderId>/checkout-snapshot` POST 가 Cash 진입/Process 성공 시점에 각각 `pos_screen:"payment_cash"`, `pos_screen:"paid"` body 로 발사됐는지 + 200 응답인지 확인. 그 뒤 운영 API 에 유효한 device_token 으로 `GET /customer-display/snapshots/active` 를 쳐서 `payment_phase` 필드 값 확인.

---

## 0. 범위 / 모드

- 모델: Opus · 상한 40 분 · 진단만(코드 수정 금지). PR 없음.
- 리포: storeport `origin/main` (4a67be3 `#448`) + agilo fork `origin/master` (acf07db `#268`).
  - 격리 worktree: `/Users/kyu.lee/projects/curiocity-relay-wts/M0-1126-A-storeport` · `.../M0-1126-A-pos` (읽기 전용).
  - Kyu 의 `~/projects/pos-ota` · `~/projects/curiocity-relay` 미수정 확인.
- 로컬 재현(Playwright/commerce-core 로컬 부트) **미실행** — 40 분 상한 안에서 코드 분석 + 운영 GET 2 회만 수행(아래 §4 참조).
- 운영 서버는 지시대로 **GET 만**. POST/PATCH/DELETE 호출 없음.

## 1. 확정된 흐름(코드 레벨 · trace)

### 1-A. POS fork — `pos_screen` emit 경로

| 시점 | 파일 : 라인 | pos_screen |
|---|---|---|
| Cash 결제수단 진입 | `app/checkout/tender-cash/[draftOrderId].tsx:137-149` | `payment_cash` (`method === 'cash'`), `freezeCart:true`, `extras:{amount}` |
| Payment success 마운트 | `app/checkout/success/[orderId].tsx:106-113` | `paid`, `freezeCart:true`, `order_id:orderId` |
| hint → emit 중앙 훅 | `hooks/usePosScreenAutoEmit.ts:66-125` + `components/PosScreenEmitter.tsx` | `_layout.tsx:81` 에서 전역 1 회 마운트 |
| HTTP 발사 | `hooks/usePosScreen.ts:49-75` `postEmit` | `POST /admin/pos/orders/${order_id}/checkout-snapshot` body: `{ register_session_id, pos_screen, seq, stage?, qr_string?, amount? }` · 300ms 디바운스 · 5 회 백오프 |

- POS fork 는 **`payment_phase` · `customer_flow` 를 직접 송신하지 않는다**(`grep -rn 'payment_phase' apps/` fork 측 0 매치). 전부 **서버가 `pos_screen` + 하위 컬럼에서 파생**함.
- Cash tender 효과의 cleanup 이 `pos_screen:'checkout_review'` 로 되돌리고, 그 뒤 success 마운트가 `pos_screen:'paid'` 를 설정 → autoEmit 의 300ms 디바운스가 "최신 1 건" 으로 collapse(`lib/pos-screen/queue.ts:collapse`), 이론상 네트워크엔 `paid` 1 발만 나간다.

### 1-B. 서버 — 수신·persist·derive

| 단계 | 파일 : 라인 | 동작 |
|---|---|---|
| POST 수신 | `apps/commerce-core/src/api/admin/pos/orders/[id]/checkout-snapshot/route.ts:26-152` | `isPosScreen(body.pos_screen)` 로 enum 가드(`'payment_cash'`·`'paid'` 모두 통과) → `upsertSnapshotForRegister` 호출 |
| upsert 가드 | `apps/commerce-core/src/modules/register_session/service.ts:232-238` | 같은 register_session + (order_id 매치 or null) **paid snapshot 존재 시 조기 반환 — `pos_screen` 갱신 없음** (⚠ 아래 §3-B 참조) |
| 활성 갱신 | `service.ts:253-301` | `pos_screen` 을 `payment_cash`/`paid` 등으로 **덮어씀**. `snapshot_state` 는 `input.snapshot_state` 를 안 줘서(POS 미전송) **active 유지**. |
| state → paid 전환 | `subscribers/order-snapshot-paid.ts:45-109` (event `order.updated` + `payment.captured`) | 서브스크라이버만이 `markSnapshotPaid` 호출 → `snapshot_state='paid'`, `paid_at`, `link_open_until` 세팅. 라우트 inline 호출 없음. |
| DTO 직렬화 | `service.ts:697-699` `snapshotToDTO` → `lifecycle.ts:310-400` `serializeSnapshot` | `payment_phase: derivePaymentPhase(snapshot)`, `customer_flow: deriveCustomerFlow(...)`, `tender: deriveTender(...)` 모두 응답에 포함. |

### 1-C. `derivePaymentPhase` (`lifecycle.ts:192-209`) — 핵심 분기

```ts
if (state === "paid") return "paid";
if (state === "expired") return snapshot.paid_at ? "paid" : "cancelled";
const screen = snapshot.pos_screen ?? null;
if (screen === "payment_cash" || screen === "payment_qris"
 || screen === "payment_card" || screen === "payment_split_1"
 || screen === "payment_split_2") return "tendering";
return "building";
```

**⚠ 로직 공백 (아래 §3-A 가 이걸로 설명됨)**: `screen === 'paid'` 는 enum 엔 있지만(`types/customer-display.ts:98`) derive 에선 안 잡힘. `state='active' + pos_screen='paid'` 조합은 **'building'** 으로 떨어진다. 서브스크라이버가 `state='paid'` 로 넘기기 전 폴링 틱에 CD 는 주문내역 화면으로 보인다.

유닛테스트(`__tests__/customer-flow-dto.unit.spec.ts:40-62`)는 `state='active' + pos_screen='payment_cash' → tendering` 와 `state='paid' → paid` 만 검증. 이 틈새 케이스(`state='active' + pos_screen='paid'`)는 테스트 공백.

### 1-D. CD — `cdSnapshot` 선택 로직 (`apps/customer-display/app/index.tsx`)

- Polling: `LiveSnapshotSource` (`src/mocks/snapshot-source.ts:70-99`) `GET /customer-display/snapshots/active` **매 1 초**.
- `cdSnapshot = useMemo(... if (!snapshot?.payment_phase || !snapshot?.customer_flow) return null ...)` — 서버가 두 필드 다 넣어주므로 cart 단계에서도 항상 truthy.
- `selectCdView(phase, flow.state, tender)` (`src/lib/cd-screen-selector.ts:80-98`):
  - `flow === 'none'` + `phase === 'paid'` → `receipt-full` (`PhoneFlowScreen rightPanel='waiting' leftPanel='receipt-mini'` 로 렌더 — `index.tsx:496-504`).
  - `flow === 'none'` + `phase !== 'paid'` → `order-list`, **`enterPhoneEnabled: phase === 'tendering'`**.
- `OrderListScreen` (`src/screens/OrderListScreen.tsx:157-178`): `disabled={!enterPhoneEnabled}`, `opacity: enterPhoneEnabled ? 1 : 0.5`.

→ **CD side 코드는 정상.** `payment_phase` 가 서버에서 올바로 오기만 하면 버튼 활성/receipt-full 전환이 결정론적으로 일어난다.

## 2. 관찰(Kyu 11-26 09:00) ↔ 예상 매핑

| 단계 | 기대 `payment_phase` | 실제 CD | 해석 |
|---|---|---|---|
| Sell/Cart/Checkout (담는 중) | `building` | ✅ 주문내역 렌더 | `pos_screen='cart_building'` emit 정상 persist · derive OK |
| Cash 결제수단 화면 | `tendering` (Enter phone 활성) | ❌ 주문내역 유지 + Enter phone **비활성** | **`pos_screen='payment_cash'` emit 이 서버에 persist 못 함(강력 추정) or persist 됐지만 CD 폴링 시점에 안 보임** |
| Payment successful | `paid` (영수증 전체) | ❌ 주문내역 유지 | **§3-A 로직 공백 or `payment.captured` 서브스크라이버 지연** |

## 3. 추정 root cause 후보(강도 순)

### 3-A (추정 · 강 · 코드 bug 확정) — `derivePaymentPhase` 가 `pos_screen='paid'` 를 못 잡음

`lifecycle.ts:192-209` 는 `state='active' + pos_screen='paid'` 를 `'building'` 으로 떨어뜨린다. POS 가 Success 화면에서 `pos_screen='paid'` 를 300ms 안에 발사하지만, `markSnapshotPaid` 는 Medusa event bus 를 거쳐 subscriber 가 돌아야만 호출된다. 이 윈도우(수 ms ~ 수 초) 에 CD 가 폴링하면 `'building'` 을 보게 되고, 서브스크라이버 완료 전까지 **주문내역 화면이 유지된다.** Case 1 Step 3 의 "영수증화면이 안나와" 가 정확히 이 모양.

운영 환경에서 서브스크라이버가 **사실상 돌지 못하면**(예: event bus 미설정·Redis 미연결) CD 는 영구히 'building'. 여기선 Kyu 가 "안 나와" 로 보고했고, 분 단위 시간이 지나도 안 바뀌었다면 서브스크라이버 미동작까지 겸하는 추정.

### 3-B (추정 · 중) — `upsertSnapshotForRegister` 의 paid 가드가 이전 주문의 pos_screen 갱신을 막는 케이스

`service.ts:232-238` 이 "같은 session 안의 **다른** paid snapshot" 과 매치되는 조건: `if (!input.order_id) return true;` / `if (!s.order_id) return true;`. 입력에 `order_id` 가 있어도 **이전 paid snapshot 의 `order_id` 가 null 이면** 매치 → 전부 조기 반환. 운영 데이터에 그런 snapshot 이 남아 있을 가능성(예: `nextCustomerForRegister` 가 심은 `order_id:null · snapshot_state:'active'` 가 뒤에 어떤 경로로 paid 로 바뀌었다면 트리거). 가능성은 낮지만 확인 필요.

### 3-C (추정 · 중 · "Enter phone 비활성" 전용) — POS web 측 emit 누락

Cash 결제수단 "Enter phone 비활성" 은 §3-A 로 설명이 안 된다(subscriber 와 무관). `pos_screen='payment_cash'` POST 가 서버까지 안 갔거나, 서버가 받았지만 persist 못 했어야 한다. 추정 포인트:

- **`hooks/usePosScreen.ts:53-61`** — `order_id` 가 null 이면 silent drop(DEV 에선 `console.warn`). Cash 진입 시 `useCurrentDraftOrder` (`api/hooks/draft-orders.tsx:516-578`) 가 돌아 `draftOrderId` 를 넘겨야 하는데, web 에서 `SecureStore` → localStorage shim 특성이나 React Query 캐시 타이밍 꼬이면 null 로 떨어질 가능성. Chrome DevTools Console 에서 `[pos-screen] drop: order_id null` warn 있는지 확인 필요.
- **`hooks/usePosScreenAutoEmit.ts:82`** — `hint?.order_id !== undefined ? ... : draftOrderId`. tender-cash 는 hint 에 `order_id` 를 **미전송** 이라 `draftOrderId` 폴백 경로. 위 drop 과 직결.
- **tender-cash effect 디펜던시**(`[method, total]`) — `total` 이 quote 로드 전 `0` 이면 effect 가 빠르게 두 번 fire → 300ms 디바운스로 합쳐짐. 문제는 아니나 참고.

(items/합계가 CD 에 뜨는 것은 **담는 중엔 hint 가 없어 `confirmedItems.length > 0 → 'cart_building'` 자동 경로가 작동**해서다. Cash 화면은 hint 경로로 전환 — 같은 "폴백" 분기지만 hint 가 켜지면 분기가 달라진다.)

### 3-D (추정 · 약) — CD side 타이밍/캐시

`useDisplayMachine` reducer 는 1s polling snapshot 을 `state.snapshot` 에 저장. 신 CD sync 경로는 `cdSnapshot` memo 만 보고 그린다 — 타이밍 문제 가능성은 매우 낮음(코드상 reset 트리거도 깨끗).

## 4. 라이브 서버 GET 시도(읽기만)

| 요청 | 응답 | 해석 |
|---|---|---|
| `GET https://api.meros.id/customer-display/snapshots/active` (토큰 없음) | `401 {"type":"missing_device_token"}` | 라우트 생존 확인. |
| 동일 (`X-Device-Token: dummy`) | `401 {"type":"device_token_revoked"}` | 미들웨어 작동. 유효 토큰 없이 `payment_phase` 값 확인 불가. 다음 Kyu 세션이 pairing 된 CD 기기에서 Chrome DevTools Application → localStorage → `cd_device_token` 복사해서 같은 요청에 넣으면 활성 snapshot DTO 확인 가능. |

Playwright/로컬 commerce-core 부트는 40 분 상한 안에 완료 불가로 판단 — **미검증**.

## 5. 수정 계획 (대사표)

| # | 리포 | 파일 | 요지 | 크기 | M1-1126-B 겹침 |
|---|---|---|---|---|---|
| 1 | storeport | `apps/commerce-core/src/modules/register_session/lifecycle.ts:192-209` (`derivePaymentPhase`) | `pos_screen==='paid'` 를 명시 처리 → `'paid'` 반환(§3-A 해소). 유닛 테스트에 `active + pos_screen='paid' → 'paid'` 1 건 추가. | 1 ~ 3 줄 + 테스트 1 건 | **없음** (B 는 `apps/customer-display/src/screens/OrderListScreen.tsx` 스타일만) |
| 2 | storeport | `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` (tender 성공 branch) | 서브스크라이버 무관하게 `regSvc.markSnapshotPaid(...)` 를 인라인으로 1 회 호출해 race 제거(§3-A 궁극 해결, §3-B 영향 없음). | 5 ~ 15 줄 + 멱등성 테스트 | **없음** |
| 3 | storeport (선택) | `apps/commerce-core/src/modules/register_session/service.ts:232-238` | paid 가드 매치 조건에서 `!s.order_id` 분기 제거 — 이전 주문 null order_id 가 현재 주문 갱신을 막지 않게. 위험성 재검토 필요. | 1 줄 | 없음 |
| 4 | fork | `agilo-medusa-pos-fork/app/checkout/tender-cash/[draftOrderId].tsx:138-144` | hint 에 `order_id: draftOrderId` 명시 전달 → `usePosScreenAutoEmit:82` 폴백 의존 제거, §3-C 재현 방지. 운영에서 재현 확인 후 적용. | 1 줄 | 없음 |
| 5 | fork (진단 보조) | `hooks/usePosScreen.ts:53-61` | `__DEV__` 가드 떼서 production 로그로 `order_id null drop` 발견 가능하게. 영구 적용은 Sentry breadcrumb 쪽이 적절. | 2 줄 | 없음 |

**M1-1126-B 와 겹치는 파일 없음.** 그 작업은 `apps/customer-display/src/screens/OrderListScreen.tsx` 글자 크기만 손대고, 본 진단의 수정 계획은 전부 서버·POS 쪽.

## 6. Kyu 가 다음 실기에서 1 분만에 확인해야 할 것

1. Chrome DevTools **Network** 탭에서 `/admin/pos/orders/.../checkout-snapshot` POST payload 가 Cash 진입/Process 성공 시각에 각각 `pos_screen:"payment_cash"`, `pos_screen:"paid"` 를 담는지 + status 200.
2. Console 에 `[pos-screen] drop: order_id null` 또는 `[pos-screen] emit failed` warn 이 있는지.
3. (운영 CD iPad 열려 있으면) Safari Web Inspector → `localStorage.getItem('cd_device_token')` 로 토큰 확보 후 `curl -H 'X-Device-Token: <t>' https://api.meros.id/customer-display/snapshots/active` 로 `payment_phase` 필드 값 직접 확인.

## 7. 이연 순증감

- 신규 open: §3-A (`derivePaymentPhase` 공백 → race) · §3-C (POS web emit 누락 가능성) · §3-B (upsert paid 가드 조건).
- 신규 close: 없음.
- 범위 밖 터치: 없음 (리포만).

---

**확정도 요약**: 
- 확정 — CD 렌더 로직 · derive 함수 코드 공백(§3-A) · POS fork 의 pos_screen enum 포함 ↔ tender-cash/success 의 hint 설정.
- 추정 — 실제 운영 구간에서 어느 지점이 끊기는지(POS 송신 실패 vs 서버 derive race vs 서브스크라이버 지연). 네트워크 캡처 1 회로 결정됨.
