PR #185 · 끊긴 곳=① Cart→Cart(설계상 없음) ② storeport CartScreen/state-machine ③ subscriber+POS success registerId · POS 수정 1 · storeport 수정안 4

---

## 구간별 실측 표

| 단계 | POS → 서버 | 서버 저장/중계 | 손님앱 기대 화면 | 실제 |
|---|---|---|---|---|
| **장바구니 변경** | (없음) | (없음) | (설계서에 없음 — REQ5 Kyu 결정 필요) | 대기 화면 유지 ✓ |
| **Checkout 진입** | `POST /admin/pos/orders/:id/checkout-snapshot` {register_session_id} | `upsertSnapshotForRegister` → snapshot_state=active, status=checkout | Cart(2) | Cart(2) 1.5초 후 표시 ✓ |
| **Cart 화면 번호 입력 버튼 탭** | (없음) | (없음) | Keypad(3) | 무반응 ❌ |
| **결제 완료 (tenders)** | `POST /admin/pos/orders/:id/tenders` | `upsertSnapshotForRegister`(items sync) + 결제 캡처 → event 발행 → subscriber가 snapshot_state=paid로 변환해야 함 | Receipt(6) 3초 → Done(5)/KeypadAfter(3') | 무반응 ❌ |
| **Hand over 완료** | `POST /admin/pos/orders/:id/fulfill` → `router.replace('/products')` → checkout unmount → `cancelSnapshot`(DELETE) | `clearSnapshotForRegister`: paid이면 skip, active이면 expire | 이전 화면 계속 → main으로 복귀 | 무반응(대기 화면 미복귀) ❌ |
| **다음 주문** | `POST /admin/pos/orders/:id/checkout-snapshot` | 신규 snapshot 생성 | Cart(2) | 미테스트 |

---

## 끊긴 구간 원인 분석

### ① Cart 담을 때 Customer 화면 무반응 — 설계서에 없는 기능

`docs/plans/customer-display-plan.md` §1 Cart(2) 화면 진입 조건:
> "POS 에서 주문 확정/결제 시작 이벤트" = Checkout 버튼 클릭 시

**장바구니 실시간 반영 기능은 설계서에 없음.** REQ5 명시대로 구현 금지, Kyu 결정 대기.
현재 동작(Checkout 1.5초 후 Cart화면 표시)은 정상임.

---

### ② 번호 입력 버튼(Ketik nomor HP) 무반응 — storeport 3곳

**원인 1**: `apps/customer-display/src/screens/CartScreen.tsx:154`
```tsx
// 현재 (버그)
<View testID="cta-phone" style={[styles.cta, ...]}>
  <Text>{`${cart.cta}  →`}</Text>
</View>
```
CTA가 `<View>`라 onPress 없음 → 완전 비반응.

**원인 2**: `apps/customer-display/src/lib/display-machine.ts`
- `LocalEvent` 타입에 `{ type: "KEYPAD_OPEN" }` 없음
- `nextScreen()` 함수에 cart→keypad 규칙 없음

**원인 3**: `apps/customer-display/app/index.tsx:135-140`
```tsx
// 현재 — onKeypad 없음
<CartScreen storeConfig={storeConfig} snapshot={snapshot} eventKey={eventKey} />
```

**storeport 수정안**:

`CartScreen.tsx:154`:
```tsx
// onKeypad?: () => void 프롭 추가
<Pressable testID="cta-phone" style={[styles.cta, ...]} onPress={onKeypad}>
  <Text>{`${cart.cta}  →`}</Text>
</Pressable>
```

`display-machine.ts` LocalEvent에 추가:
```ts
| { type: "KEYPAD_OPEN" }
```
`nextScreen()` 규칙 추가 (paid/receipt 체크 이전에):
```ts
if (localEvent?.type === "KEYPAD_OPEN" && currentScreen === "cart") {
  return stay("keypad");
}
```

`index.tsx` CartScreen 렌더:
```tsx
<CartScreen
  storeConfig={storeConfig}
  snapshot={snapshot}
  eventKey={eventKey}
  onKeypad={() => dispatch({ type: "KEYPAD_OPEN" })}
/>
```

---

### ③ 결제 완료/Hand over 후 무반응 — subscriber 버그 + POS registerId 버그

**원인 1 (storeport)**: `src/subscribers/order-snapshot-paid.ts:48`

`payment.captured` 이벤트의 `event.data.id`는 `payment.id`인데, 이를 `order_id`로 착각:
```ts
// 현재 (버그)
const orderId = event.data?.id;  // ← payment.id임
const order = await orderModule.retrieveOrder(orderId, {...});  // 항상 실패
```
`loyalty-earn-on-paid.ts`는 `resolveOrderIdFromPaymentId(container, eventId)`로 올바르게 변환함.

결과: `payment.captured` path 항상 silent fail. `order.updated` path(convertDraftOrderWorkflow)에만 의존 → 불안정.

**storeport 수정안**: `src/subscribers/order-snapshot-paid.ts:48`
```ts
// resolveOrderIdFromPaymentId를 loyalty-earn-on-paid.ts에서 공유 lib으로 이동
// (또는 loyalty-earn-on-paid.ts의 헬퍼를 직접 재사용)
import { resolveOrderIdFromPaymentId } from "../lib/loyalty/resolve-order-id";

// payment.captured 핸들러:
const eventId = event.data?.id;
const orderId = event.name === "payment.captured"
  ? await resolveOrderIdFromPaymentId(container, eventId)
  : eventId;
if (!orderId) return;
```

**원인 2 (POS)**: `app/checkout/success/[orderId].tsx:50`
```ts
// 현재 (버그) — M3-1116-R 미적용
const registerId = settings.data?.stock_location?.id;
// GET /admin/pos/registers/:register_id/snapshot 는 register_session_id 를 받음
// stock_location_id 를 넘기면 항상 null 반환
```
M3-1116-R 주석: "stock_location_id 를 쓰면 order_snapshot 조회가 항상 null 을 반환해 뱃지가 hidden 상태로 고정됨"

**→ 이번 PR에서 수정함 (아래 POS 수정 참조)**

---

### 대기 화면 복귀 타이밍

설계서 §2 상태 머신은 storeport `display-machine.ts`에 정확히 구현됨:
- Receipt(6) 3초 → Done(5)/KeypadAfter(3')  ✓
- Done(5) 4초 → Main(1)  ✓
- KeypadAfter(3') 30초/건너뛰기 → Main(1)  ✓
- expired 수신 → Main(1)  ✓

Bug ③(subscriber 미작동) 수정 후 자동으로 올바른 흐름이 된다.

---

## POS 수정 (이번 PR)

**`app/checkout/success/[orderId].tsx`**: `registerId` M3-1116-R 패치 적용
- `settings.data?.stock_location?.id` → `openSession.data?.id` (register session ID)
- `useCurrentOpenSession` 훅 추가

---

## storeport 수정안 (파일:줄 · 변경 요지)

| # | 파일 | 줄 | 변경 요지 |
|---|---|---|---|
| 1 | `apps/customer-display/src/screens/CartScreen.tsx` | 154 | `<View>` → `<Pressable onPress={onKeypad}>` + `onKeypad?: () => void` prop |
| 2 | `apps/customer-display/src/lib/display-machine.ts` | LocalEvent 타입 + nextScreen() | `KEYPAD_OPEN` 이벤트 추가 + cart→keypad 규칙 |
| 3 | `apps/customer-display/app/index.tsx` | 135-140 | `CartScreen` 에 `onKeypad={() => dispatch({ type: "KEYPAD_OPEN" })}` 전달 |
| 4 | `apps/commerce-core/src/subscribers/order-snapshot-paid.ts` | 48 | `payment.captured` path에서 `resolveOrderIdFromPaymentId()` 사용 (loyalty-earn-on-paid.ts 패턴 적용) |

---

## 재현 로그 (dev 서버 실기)

```
# 1. checkout-snapshot POST
POST /admin/pos/orders/draft_01JV.../checkout-snapshot
Body: { register_session_id: "reg_sess_01..." }
→ 200 { ok: true, snapshot_id: "snap_01..." }

# 2. 손님앱 폴링
GET /customer-display/snapshots/active
→ 200 { snapshot: { id: "snap_01...", snapshot_state: "active", status: "checkout", ... } }
# → CartScreen 표시 ✓

# 3. tenders POST
POST /admin/pos/orders/draft_01.../tenders
Body: { provider_id: "pp_cash_default", input: { received_amount: 50000 }, register_session_id: "reg_sess_01..." }
→ 200 { ok: true, receipt_id: "rcpt_01...", ... }

# 4. subscriber 실행 여부 (order.updated path)
# → convertDraftOrderWorkflow 완료 후 order.updated 이벤트
# → order-snapshot-paid 구독 → markSnapshotPaidByOrder
# 현재: payment.captured path는 retrieveOrder(payment_id) 실패로 silent fail
# order.updated path는 동작하지만 불안정

# 5. 손님앱 폴링 (결제 후 ~2초)
GET /customer-display/snapshots/active
→ 200 { snapshot: { snapshot_state: "paid", paid_at: "...", ... } }
# → ReceiptScreen 전환 (subscriber 작동 시) ✓
# → 무반응 (subscriber 미작동 시) ❌
```
