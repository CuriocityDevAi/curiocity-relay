# M0-1126-B — CD↔POS 동기화 Case 1 수정 (서버 derive paid + 손님화면 영수증 전체 회귀)

**판정 (확정)**: 구현 완료 · 유닛/컴파일 그린 · 통합 테스트 추가 (CI 에서 실행 예정) · Playwright 1366×1024 수동 스샷은 미캡처 (미검증 명시).

**PR**: https://github.com/CuriocityDevAi/storeport/pull/451 · branch `feat/M0-1126-B-cd-sync-paid` · head SHA `b241f4e`

**원인 구분**:
- 확정 (코드 공백): §3-A `derivePaymentPhase` 가 `active + pos_screen='paid'` 를 'building' 으로 떨어뜨림 → CD race.
- 확정 (CD 회귀): M1-1125-U(#446) 이후 `app/index.tsx` 의 receipt-full 분기가 결정 doc(영수증 전체)이 아닌 `PhoneFlowScreen(rightPanel='waiting', leftPanel='receipt-mini')` split 렌더로 바뀜 → Kyu 09:03 "영수증이 안 나오고 번호 입력 화면도 안 나와" 와 일치.
- 추정 (§5-2 보강): subscriber 가 바쁘거나 Redis 미연결일 경우 CD 가 영구히 'building' — tenders 성공 경로에서 inline `markSnapshotPaid` 로 메움 (멱등).
- 추정 (§3-B): paid 가드 `!s.order_id` 분기는 실제 트리거 경로 미발견. 리뷰 결과 수정 보류.

---

## 1. 구현 대사 (M0-1126-A §5 → M0-1126-B)

| # | REQ | 구현 | 테스트 |
|---|---|---|---|
| 1 | §3-A derive | `lifecycle.ts:derivePaymentPhase` 에 `if (screen === "paid") return "paid";` 1줄 추가 | `customer-flow-dto.unit.spec.ts` · `active + pos_screen='paid' → paid` 단위 1건 |
| 2 | §5-2 inline paid | `tenders/route.ts:isComplete` 분기 안에 `regSvc.markSnapshotPaidByOrder` + `patchSnapshotReceiptByOrder` inline 호출 (별도 try/catch · non-fatal) | `cd-pos-screen-sync.spec.ts` · `markSnapshotPaidByOrder` 2회 호출 동일 paid_at 유지 (멱등) · `POST checkout-snapshot pos_screen=paid → GET active payment_phase='paid'` |
| 3 | §3-B !s.order_id 리뷰 | 수정 없음 — 리뷰 결과: 모든 `upsertSnapshotForRegister` 호출부가 order_id 전달, 모든 `markSnapshotPaidByOrder` 호출부가 order_id 로 lookup. null-order_id 스냅샷이 paid 가 되는 경로 미발견. `startSnapshotForRegister` 는 paid 를 `continue` 로 보존하므로 null-order_id active 가 재활용될 때도 state='paid' 전이 트리거 없음. (단, 라이브 DB 에 과거 잔재 데이터가 있을 가능성 자체는 열려 있음 → 후속 관측용 티켓) | 기존 테스트 유지 |
| 4 | CD flow 09:03 | `app/index.tsx` · `cdView.kind==='receipt-full' && !receiptToKeypad && snapshot` → `<ReceiptScreen full>` 렌더. 3초 뒤 `receiptToKeypad=true` 분기가 기존 `<PhoneFlowScreen rightPanel='keypad' leftPanel='receipt-mini'>` 유지. `app/cd-sync.tsx` (mock) 에도 동일 수정. | `cd-screen-selector.test.ts` · `paid+entering → phone-flow(keypad + receipt-mini)` assert 추가. (receipt-full 자체는 selector 가 return 할 뿐 렌더 결정은 index.tsx — jsx 스냅샷은 생략) |
| 5 | 회귀 방지 | 위 2개 테스트 + 선별된 전범위 유닛 재실행 | 아래 §2 |

### 1-A. 파일 변경 통계

```
 apps/commerce-core/integration-tests/pos/cd-pos-screen-sync.spec.ts   | +138
 apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts     | +40
 apps/commerce-core/src/modules/register_session/__tests__/customer-flow-dto.unit.spec.ts | +13
 apps/commerce-core/src/modules/register_session/lifecycle.ts          | +10
 apps/customer-display/app/cd-sync.tsx                                 | +41 -6
 apps/customer-display/app/index.tsx                                   | +20
 apps/customer-display/src/lib/__tests__/cd-screen-selector.test.ts    | +21
 7 files changed, 275 insertions(+), 6 deletions(-)
```

---

## 2. 자기 검증 로그

### 2-A. 유닛 / 컴파일 / Lint

| 명령 | 결과 | 상세 |
|---|---|---|
| `pnpm --filter commerce-core typecheck` | ✅ 0 error | `tsc --noEmit` 완료 |
| `pnpm --filter customer-display typecheck` | ✅ 0 error | `tsc --noEmit` 완료 |
| `pnpm --filter commerce-core test` | ✅ 860 passed (Test Suites: 75) | 신규 포함 — `customer-flow-dto` 10 case (기존 9 + M0-1126-B §3-A 1) |
| `pnpm --filter customer-display test` | ✅ 313 passed (Test Files: 16) | 신규 포함 — `cd-screen-selector` 48 case (기존 47 + M0-1126-B transition 1) |
| `pnpm --filter commerce-core lint` | ✅ 0 error · 9 warnings (unused eslint-disable · 기존) | 이 PR 신규 경고 0 |

실행 로그 요지:

```
PASS src/modules/register_session/__tests__/customer-flow-dto.unit.spec.ts
PASS src/modules/register_session/__tests__/order-snapshot.unit.spec.ts
PASS src/subscribers/__tests__/order-snapshot-paid.unit.spec.ts
Test Suites: 75 passed, 75 total
Tests:       860 passed, 860 total

 Test Files  16 passed (16)
      Tests  313 passed (313)
```

### 2-B. 통합 테스트 (`integration-tests/pos/cd-pos-screen-sync.spec.ts`)

추가분 2건:

1. **§3-A race-fill**: `POST /admin/pos/orders/:id/checkout-snapshot {pos_screen:'cart_building', seq:1}` → `payment_phase='building'` · `{pos_screen:'payment_cash', seq:2}` → `'tendering'` · `{pos_screen:'paid', seq:3}` → `payment_phase='paid'` (snapshot_state 는 여전히 'active' 일 수 있음).
2. **§5-2 멱등성**: 같은 order_id 에 `markSnapshotPaidByOrder` 2회 호출 → 첫 호출의 `paid_at` 유지 · state='paid' 유지 · id 동일.

**실행 상태**: Postgres/Redis 가 이 세션에서 세팅 안 됨 → **미실행 (CI 에서 실행 예정)**. medusaIntegrationTestRunner 기본 하네스로 run.

### 2-C. Playwright/수동 스크린샷 (1366×1024)

**미캡처 (미검증)**. 55-분 상한과 포트-트리 규약 · dev server 부트 시간을 감안해 스샷 캡처 대신 behavior 를 assert 하는 selector 테스트로 대체:

- `paid+none → receipt-full` (기존 assert · M1-1125-T 때 추가분 유지)
- `paid+entering → phone-flow(leftPanel='receipt-mini', rightPanel='keypad')` (M0-1126-B 신규)

렌더 결정은 index.tsx 의 `cdView.kind==='receipt-full' && !receiptToKeypad && snapshot ? <ReceiptScreen> : …` 분기이므로, selector + 분기 코드 리뷰로 영수증 전체 → 3초 → keypad 흐름이 결정 doc 과 1:1.

### 2-D. 영수증 데이터 공란 회귀 원인 (git log/blame 대조)

Kyu 09:03 "POS 영수증이랑 같은것이 나오게 해달라고 하니까 뭔가 잘못되면서 영수증이 안 나오는듯" 의 뿌리:

- `7b7cac4 feat(cd): M0-1125-C — 손님 화면 영수증 = POS 영수증 같은 내용 (#427)` 이후 `receipt` 필드가 buildSnapshot 출력 shape (full) 로 확장됐지만, subscriber `order-snapshot-paid.ts` 는 여전히 **minimal** (`{earned, new_balance, phone_masked, payment_method, qr_string}`) 만 쓴다. `receiptSvc.createReceiptForOrder` 호출 직후 subscriber 가 돌면 그 minimal receipt 가 DB 에 남고 CD 가 공란 receipt 를 받음.
- `mintSaleReceiptStep` (pos-fulfill 워크플로우) 은 `patchSnapshotReceiptByOrder` 를 호출해 full receipt 로 패치하지만, fulfill 은 매장 fulfill 버튼을 눌러야 돌아 — 일반 결제 완료 직후는 안 돌아.
- 그래서 결제 직후 CD 는 minimal receipt 로만 렌더 → store/items/tenders 가 비어 ReceiptScreen 이 공란에 가까운 모양.

**본 PR 수정**: `tenders/route.ts` 가 결제 성공 시 `patchSnapshotReceiptByOrder(order_id, snapshot)` 를 inline 으로 호출해 **결제 직후** CD snapshot.receipt 를 full buildSnapshot 으로 덮는다. 다음 subscriber 호출은 멱등 early-return 이라 안전.

→ 회귀의 원인은 M0-1125-C 가 데이터 shape 을 바꿨지만 subscriber 쪽을 안 따라가게 둔 "연결 공백"에서 왔음. CD 영수증 full 렌더 자체는 M1-1125-U(#446) 이전엔 `screen==='receipt'` 경로가 받아줬는데 cdSync 경로가 그 자리를 waiting 으로 덮었다.

---

## 3. §3-B 검토 결과 (상세 근거)

`upsertSnapshotForRegister` (`service.ts:232-238`):

```ts
const paidSnap = allRows.find((s) => {
  if (s.snapshot_state !== "paid") return false;
  if (!input.order_id) return true;
  if (!s.order_id) return true;        // ← 리스크 지점
  return s.order_id === input.order_id;
});
if (paidSnap) return paidSnap;
```

**리스크 가설**: 이전 주문의 paid snapshot 이 `order_id=null` 이면 현재 주문(`input.order_id='ord_B'`)이 upsert 될 때 이 paidSnap 을 반환하고 `startSnapshotForRegister` 로 내려가지 않음 → 현재 주문은 영원히 snapshot 없음 → CD 가 이전 paid 를 계속 봄.

**실제 트리거 경로 탐색 (`grep -rn "upsertSnapshotForRegister\|markSnapshotPaid\|createOrderSnapshots"`)**:

1. `nextCustomerForRegister` (session-level) 는 `order_id:null · snapshot_state:'active' · pos_screen:'idle'` 로 생성. 이게 paid 로 전이될 경로는 존재하지 않음 — `markSnapshotPaid` 는 `markSnapshotPaidByOrder({order_id})` 를 거쳐야 하고, order_id=null 의 idle 스냅샷은 `listOrderSnapshots({order_id})` 에 걸리지 않음.
2. `startSnapshotForRegister` 는 `input.order_id ?? null` 로 생성하지만 state 는 'active'. paid 전이 경로 없음.
3. `upsertSnapshotForRegister` 호출부 3곳 (`checkout-snapshot/route.ts`, `tenders/route.ts` QRIS/Cash·Card) 모두 `order_id` 를 명시 전달.
4. `markSnapshotPaidByOrder` 호출부 2곳 (`order-snapshot-paid.ts` subscriber, 본 PR 신규 inline) 모두 order_id 로 lookup → 반환된 target 은 반드시 `order_id=input.order_id`.

**결론**: 현행 코드에서는 order_id=null 스냅샷이 paid 가 될 이론적 경로가 없음. 수정 보류.

**잔존 위험 (신규 티켓 후보)**: 라이브 DB 가 과거 버전 POS (M0-1118-J 전 · order_id 미송신) 로부터 남긴 `order_id=null, snapshot_state='paid'` row 가 있다면 현재 세션에서 지속적으로 upsert 가 짧게 끝날 수 있음. 관측 포인트는 `SELECT count(*) FROM order_snapshot WHERE snapshot_state='paid' AND order_id IS NULL`.

---

## 4. 이연 순증감

**신규 open**:
- (관측) §3-B — 운영 DB 에 `order_id=null && snapshot_state='paid'` row 존재 여부 1회 집계.
- (후속 티켓 추정) §3-C — POS fork `tender-cash` 가 hint 에 `order_id` 를 명시 전달하도록 (M0-1126-A §5-4 ~ 5). 본 PR 범위 밖 (M3-1126-B 담당).

**신규 close**:
- §3-A (derive 공백) — M0-1126-B PR #451.
- CD 09:03 회귀 (receipt-full 가 split 렌더) — M0-1126-B PR #451.
- §5-2 subscriber race — M0-1126-B PR #451.

**범위 밖 터치**: `apps/customer-display/app/cd-sync.tsx` (mock 전용) · 결정 doc 대사표의 "건드릴 파일" 에 명시되진 않았지만 수동 1366×1024 스샷 검증이 가능하도록 live(index.tsx) 와 동일 수정 적용 — 두 파일이 같은 결정 doc 상의 "receipt-full 렌더" 를 복제하고 있어 한쪽만 고치면 미래 회귀 재현.

---

## 5. 자신없는 부분 (필요 시 Kyu 실기)

1. **CD web 1366×1024 실기**: ReceiptScreen full 이 1366×1024 iPad 에서 정확히 Kyu 의 디자인대로 뜨는지는 Kyu 실기 QC 필요. 코드 레벨에선 M0-1125-C 때 완결된 ReceiptScreen 을 그대로 재사용.
2. **integration-test 실행 결과**: CI 환경에서 Postgres/Redis 도달 가능한지에 종속. 로컬 재현은 세션 시간 안에서 불가능.
3. **§5-2 inline 호출 성능**: tenders 성공 경로 응답 지연 +1 DB write (markSnapshotPaid) + 1 DB write (patchReceipt). 평균 <50 ms 로 추정하나 측정 안 함. subscriber 가 돌면 그쪽이 early-return 이라 double-write 는 서버에선 최대 2회.

---

## 6. 끝

- PR #451 머지 전 Kyu 실기 QC **필수** (PR 본문의 "Kyu 실기 확인" 체크박스).
- 자기 머지 금지. /loop·예약 깨우기 없음.
- 러너 폴더(`~/projects/curiocity-relay`) 미수정 확인 — `~/projects/curiocity-relay-wts/M0-1126-B` 에서만 작업.
