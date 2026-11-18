#359 CHANGES · 사실 불일치 4 · §4.4 권장 4건 · 위험 2

---

## REQ 1 — Fact-check

### 1a. Subscriber 공용성 (3개)

| 구독자 | 실제 채널 중립? | 비고 |
|---|---|---|
| `loyalty-earn-on-paid` | 조건부 공용 | `payment.captured` 구독. earnForOrder는 채널 무관. 단, snapshot 갱신(53-83행)이 `register_session`에 직접 의존 — Wing에서 snapshot 없으면 내부 try/catch가 흡수. |
| `order-snapshot-paid` | POS 편향 | `register_session` import(4-5행). `markSnapshotPaidByOrder` 무조건 호출 — Wing에 register_session 없으면 throw 후 외부 catch에서 warn만 출력. 계획 §S4가 말하는 채널 가드 현재 없음. |
| `register-session-order-attribution` | POS 전용 의도 | 43행 `if (!session) return;` 가드 존재 → Wing에서 open session 없으면 no-op. 공용으로 분류된 사실 오류: plan §1.2에서 ⚠️ POS 전용으로 명시하면서도 subscriber 목록에 "공용"으로 묶임. |

**결론**: 3개 모두 현재 Wing-safe(에러 무시)이지만 `order-snapshot-paid`는 채널 가드 없이 register_session을 호출함 — plan이 "가드 확인 필요"라고 말하는 R-A1-0 사전 검증이 반드시 선행되어야 함.

### 1b. Receipt 인라인 호출 위치

- `tenders/route.ts:1517` — `receiptSvc.createReceiptForOrder(...)` **확인** ✓
- `xendit/route.ts:766` — `receiptSvc.createReceiptForOrder(...)` **확인** ✓

### 1c. pickup_slot 빈 스캐폴드

- `service.ts` 1–17행: `class PickupSlotService extends MedusaService({}) { }` **확인** ✓ (파일 총 17행, plan은 1–18 표기 — 오차 1행)
- `index.ts` 1–8행: Module 선언 **확인** ✓

### 1d. 선주문 metadata 키 수 "11개"

**실제 10개**: plan §3.2 표에 열거된 키는 10행 (order_type + preorder.* 8개 + line_item.lettering_text 1개). 그러나 tenders/route.ts에서 실제 세팅되는 order-level 키에는 `metadata.register_session_id`(563행)와 `metadata.pos_totals`(573행)도 있으며 §3.2 표에서 누락됨. 엄밀히는 order-level metadata 키가 최소 11개(order_type + register_session_id + pos_totals + preorder.* 8개) + line_item별 lettering_text. "11개"라는 숫자 자체보다 §3.2 표의 목록이 불완전한 것이 문제.

**사실 불일치 #1**: §3.2 표 10행을 "11개"로 기술. `register_session_id`와 `pos_totals` 키 누락.

### 1e. 경계 위반 15건

실제 카운트:

| 카테고리 | plan | 실제 |
|---|---|---|
| `payment_xendit/*` → `pos_settings/*` | 3건 | **4건** (provider.ts:36,37,38 + config.ts:11) |
| `payment_xendit/__tests__/*` → `api/admin/pos/*` | 2건 | 2건 ✓ |
| `subscribers/*` → `register_session/*` | 6건 | 6건 ✓ (포함 __tests__ 1) |
| `workflows/pos-fulfill/*` → `api/admin/pos/_shared/*` | 1건 | 1건 ✓ |
| `workflows/pos-void/*` → `api/admin/pos/_shared/*` | 1건 | 1건 ✓ |
| `payment_xendit/__tests__/*` → `pos_settings/*` | (미분류) | 1건 (qris-xendit.unit.spec.ts:15) |
| **합계** | **15건** | **15건** (grouping 오류이지 총수는 일치) |

**사실 불일치 #2**: §4.2 "payment_xendit → pos_settings = 3건"은 provider.ts 3행만 계산. `payment_xendit/lib/config.ts:11` 위반 1건 미분류. R-B1 본문이 "5건 중 3건 fix"라고 쓰는 것은 test 포함 5건임을 인지하고 있으나 §4.2 표와 불일치.

### 1f. 기타 사실 확인

- **register_session 파일 수**: plan §4.1 "17파일" → 실제 **18파일** (사실 불일치 #3). `customer-display-device.ts` 모델 포함, 4개 모델(register-session, cash-movement, order-snapshot, customer-display-device). plan이 말하는 "cash vs order_snapshot" 2분할이 customer-display-device를 누락함.
- **workflows/pos-*** 파일 수**: plan "41파일" → 실제 **43파일** (사실 불일치 #4, 경미).
- ESLint config: `defineConfig([...medusa.configs.recommended])` 4행, `no-restricted-imports` 없음 **확인** ✓
- tsconfig path alias 없음 **확인** ✓
- pickup_slot 2개 파일 **확인** ✓

---

## REQ 2 — A1 async risk (§S2 응답 바디 보존)

### 핵심 문제: §S2가 POS 앱의 hard-throw를 간과

plan §S2는 "응답 shape 보존 — subscriber가 metadata에 즉시 쓰기 → 클라이언트 polling 1회 → 클라이언트 영향 0"으로 주장.

**실제**:

1. `pos-r0/app/checkout/tender-cash/[draftOrderId].tsx:74–76`:
   ```ts
   if (!tender.receipt_id) {
     throw new Error('server did not mint a receipt');
   }
   ```
   R-A1-1 이후 cash tender 응답의 `receipt_id`는 **null**이 된다(라우트에서 inline 호출 제거됨). 앱은 즉시 throw → 결제 실패 오류 화면으로 떨어짐.

2. split-tender 2nd leg(`split-tender/[draftOrderId].tsx:349`)는 null을 그대로 `receiptId: null`로 전달 → success 화면에서 "Failed to load receipt" 에러 배너.

3. **QRIS 흐름은 이미 polling 패턴이 있음** (`tender-qris/[draftOrderId].tsx:95–134`): 최대 5회, 2s 간격으로 `order.metadata.receipt_id` 재조회 후 없으면 graceful fallback. 이 패턴이 cash/card에는 없음.

### §S2가 말하는 polling 엔드포인트 오류

plan §S2: "기존 `GET /admin/pos/orders/:id/receipt` 재사용"

**실제**: 해당 엔드포인트 존재하지 않음. 실제 엔드포인트는 `GET /admin/pos/receipts/:id` (`pos-payments.ts:145`의 `useReceipt` 훅). `/orders/:id/receipt` 경로 없음(라우트 디렉터리 확인).

### 충분성 평가

§S2의 "클라이언트 영향 0" 주장은 **불충분**. R-A1-1 실행 전 POS 앱(pos-r0)에 아래 작업이 필요:
- `tender-cash` 흐름에 QRIS와 동일한 `receipt_id` polling fallback 추가 (5회 × 2s)
- null receipt_id 시 hard-throw 제거 → graceful fallback 처리
- split-tender 2nd leg도 동일 처리

이것은 **R-A1-1과 동시에 POS 앱 PR을 함께 발행**해야 함을 의미. plan에는 POS 앱 변경 라운드가 없음.

---

## REQ 3 — A2 dual-write 일관성

### Source of Truth

plan §3.3 S3: "쓰기 소스 1곳으로 수렴" — `tenders/route.ts` preorder 블록이 `PickupSlotService.markDeposit/markPaidFull` 호출로 교체되고, 서비스가 model row와 `order.metadata.preorder.*` 양쪽을 모두 씀.

**POS 경로**: `tenders/route.ts` → `PickupSlotService` → (DB row + metadata)
**Wing 경로**: `POST /store/pickup/reserve` → `PickupSlotService.createReservation()` → (DB row + metadata + Medusa Order 생성)

Wing은 같은 service를 거침 → 쓰기 소스 1곳으로 수렴 설계 자체는 올바름.

### 미처리 위험

1. **dual-write 원자성 없음**: plan 어디에도 `transaction` 또는 rollback 언급 없음. `PickupSlotService`가 DB row 생성 성공 → metadata 업데이트 실패 시, 혹은 반대 경우, 불일치 상태 발생 가능. preorder MVP 에서는 metadata가 POS 앱 SoT이므로 모델이 있고 metadata가 없는 경우가 더 위험.

2. **기존 orders 호환**: §3.3이 "기존 orders에는 null"이라고 명시 → DB row 없이 metadata만 있는 orders에 대한 조회/필터 로직(S4 listAvailableWindows)이 null pickup_window_id를 처리해야 함. 이 처리 명세가 plan에 없음.

3. 현재 단계(S1~S3 미구현)에서는 pickup_slot 모델이 존재하지 않으므로 Wing이 아직 same service를 쓸 수 없음 — Wing 연동은 R-A2-S4 이후. 그 전까지 Wing의 SoT는 없음(설계 미완). 이는 허용 범위 내 (Phase Wing으로 미룸).

---

## REQ 4 — §4.4 애매 4건 권장안

### 1. register_session 쪼개기
**권장**: 쪼개기 진행 — 단, "cash vs order_snapshot" 2분할이 아니라 **3분할 필요**.
모듈에 `register-session`, `cash-movement`, `order-snapshot`, `customer-display-device` 4개 모델이 있음. `customer-display-device`는 손님 화면 pairing 인프라로 `order-snapshot`보다 더 넓은 공용 가능성이 있음. 분할 경계를 `register_session/core` (교대+현금+기기 = POS) + `register_session/order_snapshot` (공용)으로 재정의 권장. plan이 customer-display-device를 누락한 채 R-B2에서 45분을 배정한 것은 scope 과소 추정.

### 2. payment_xendit 자격 env 이동
**권장**: 진행 — 설계 방향 맞음.
`xendit-qris-provider.ts`와 `config.ts`가 모두 `pos_settings/lib/xendit-creds`에 의존하는 것은 "결제 provider가 POS 설정 모듈에 종속"되는 명백한 경계 위반. `payment_xendit/lib/config.ts`를 환경변수(`XENDIT_API_KEY`, `XENDIT_MERCHANT_ID`)에서 직접 읽도록 교체 — pos_settings는 Admin UI 표시 전용으로 유지. R-B1 scope에 `config.ts:11` fix도 명시적으로 포함할 것 (현재 "3건 중 3건"이지만 실제는 config.ts 포함 4건).

### 3. customer-display 위치 (POS 전용 유지)
**권장**: 일단 POS 전용 유지 — 단, `customer-display-device` 모델을 register_session 분할 시 별도 처리.
Wing도 "주문 paid" 신호가 필요할 수 있으나 Wing 고객은 모바일 웹이므로 POS 전용 SSE 채널을 쓰지 않음. subscriber 분기(`if (channel === 'pos')`)로 충분. 하드 분리는 Wing 환불/기타 채널이 customer-display를 실제로 필요로 할 때로 미룸.

### 4. workflows/pos-{fulfill,refund,return,void} 보존
**권장**: 현행 POS 전용 유지, Phase Wing에서 재검토 명시.
Wing 환불은 Medusa core void/refund workflow로 처리 가능하고, pos-refund/pos-void는 POS PIN 검증·register_session 연동 등 POS 전용 로직이 섞임. 성급한 추상화보다 Wing 환불 요건이 확정된 뒤 공통 추출 타당성 평가. plan 권고와 동일하므로 추가 결정 불필요.

---

## REQ 5 — 라운드 순서, 파일 겹침, 시간 타당성

### 순서 정확성

`R-B0 → (R-B1 ∥ R-B2) → R-B3 → R-A1-0 → R-A1-1 → (R-A1-2 ∥ R-A2-S1) → R-A2-S3 → R-A2-S4 → R-A2-S5` 순서 자체는 올바름. 파일 겹침 표도 정확 (tenders/route.ts: A1-1 → A2-S3 → A2-S5 의존 체인).

### 명칭 불일치

§3.3이 step S1~S5를 정의하지만 §5 라운드 표에서 `R-A2-S2`가 없음. §3.3 S2(service 메서드 구현)가 `R-A2-S1`에 흡수됨 — 이것이 의도적이면 §3.3 step 번호와 §5 라운드 번호가 1:1이 아님을 명시해야 혼동 없음.

### 30~45분 타당성 검토

| 라운드 | 명시 시간 | 판단 |
|---|---|---|
| R-B2 | 45분 | **빡빡** — register_session 18파일 모듈 분할 + subscribers 3개 import 재조준 + customer-display-device 처리 미포함. 60분 이상 예상. |
| R-A1-1 | 45분 | **위험** — `receipt-mint-on-paid` subscriber 신규 + tenders/xendit 2개 route 수정 + polling fallback이 필요함을 REQ2에서 확인. POS 앱 변경까지 포함하면 별도 라운드 필요. |
| R-A2-S1 | 45분 | **빡빡** — 모델 2개 + migration + service 메서드 3개 + 단위 테스트를 1 PR에 포함. §3.3 S1+S2 합산. |

나머지 R-B0(30분), R-B1(45분), R-B3(30분), R-A1-0(30분), R-A2-S4(30분), R-A2-S5(30분)은 scope이 명확하고 타당.

### POS 앱 변경 라운드 미포함

R-A1-1 이전에 `pos-r0` 앱 측 polling fallback을 별도 라운드로 추가해야 함. 현재 plan이 이를 누락. 미포함 시 R-A1-1 이후 cash/card 결제가 앱에서 오류.

---

## REQ 6 — 최종 판정

**CHANGES (required)**

### 필수 수정 2건

**C1 — R-A1-1 선행 조건 누락 (critical)**
plan이 R-A1-1에서 POS 앱 변경을 요구하지 않음. `tender-cash/[draftOrderId].tsx:74`의 hard-throw 및 `split-tender` 흐름이 null `receipt_id`를 처리하지 못함. R-A1-1 발행 전 POS 앱에서 cash/card 흐름에도 QRIS와 동일한 polling fallback (5회 × 2s, `order.metadata.receipt_id` 재조회)을 추가하는 별도 라운드 삽입 필요 (R-A1-1 앞). §S2 "클라이언트 영향 0" 문구를 수정하고 POS 앱 연동 라운드를 명시할 것.

**C2 — §S2 엔드포인트 오류 (correctness)**
`GET /admin/pos/orders/:id/receipt`는 존재하지 않음. 실제 polling 엔드포인트는 `GET /admin/pos/receipts/:id`. 계획서 §S2 수정 필요.

### 권장 개선 2건 (blocking 아님)

**R1 — §3.2 metadata 키 표 완성**: `register_session_id`와 `pos_totals` 키 추가, 11개 카운트 근거 명시.

**R2 — R-B2 scope 확장**: register_session 분할 시 customer-display-device 처리 방향 명시. 45분 → 60분으로 조정 권장.
