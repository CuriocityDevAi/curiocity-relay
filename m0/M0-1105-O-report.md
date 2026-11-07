---
round: M0-1105-O
type: diagnosis-only
pr: null
outcome: 뿌리 확정 · P2 cash flow 가 tenders 성공 후 draft→order 변환 + draft id 폐기 + 쿼리 invalidate 를 3군데 전부 생략 → 영수증은 발급되지만 Order 는 영구 draft 상태 → `/admin/orders` 하드코딩 필터로 제외 + Cart 탭 draft 유지. 코드 수정 0.
kyu_checks: 0 (진단 라운드)
diagnosis_only: true
replaces: M0-1105-N (중단)
---

# M0-1105-O · "결제 성공 뒤 Cart 미정리 + Orders 탭 미표시" 진단

**일자**: 2026-11-07 · **허브**: M0 · **대상**: 진단 대사표 · 코드 수정 금지.

**Kyu 실기 재현**: 11-07 11:55 WIB · `api.meros.id` · iPad · fork master `fd0aa70`. Cart → Checkout → Pay → Cash → Process payment → "Payment successful · Order #30 · R-261107-0001". **① Cart 탭 품목 그대로** · **② Orders 탭 #30 없음**.

---

## 뿌리 (1줄)

**P2 cash flow 가 tenders 성공 후 `draftOrder.convertToOrder` + `SecureStore.delete(DRAFT_ORDER_ID)` + `['draft-order']/['orders']` invalidate 를 전부 생략** → 결제는 draft 에 붙어 영수증은 발급되지만 Order 는 **`is_draft_order=true` 로 영구 잔존** → `/admin/orders` 하드코딩 필터 `is_draft_order: false` 로 제외됨 (Orders 탭 ✗) · `useCurrentDraftOrder` 는 저장된 draft ID 로 여전히 items 를 받음 (Cart 탭 ✗).

---

## §0 대사표 — 코어/우회/신규

| 항목 | 현 상태 | file:line | 주인 |
|------|---------|-----------|------|
| `/admin/orders` 의 draft 제외 하드코딩 | ✓ core (Medusa 2.17 정책) | `node_modules/.pnpm/@medusajs+medusa@2.17.2/.../api/admin/orders/route.js:9` (`is_draft_order: false`) | Medusa (손댈 수 없음) |
| 서버 `convertDraftOrderWorkflow` — draft → Order (status=PENDING, is_draft_order=false) | ✓ core | `@medusajs/core-flows/.../draft-order/workflows/convert-draft-order.js:15` | Medusa |
| 기존 agilo 흐름 (`useCompleteDraftOrder`) 에서 convertToOrder + SecureStore.delete + invalidate | ✓ 구현됨 | `api/hooks/draft-orders.tsx:638+` (convertToOrder@~720 · SecureStore delete@~725 · invalidate `['draft-order']`@onSettled) | M3 (예시) |
| **P2 tender-cash 흐름** 에서 동일 3단계 | ✗ **전부 누락** | `app/checkout/tender-cash/[draftOrderId].tsx:30-50` (onProcess) · `api/hooks/pos-payments.ts:50-66` (useCreateTender) · `app/checkout/success/[orderId].tsx` | **신규 필요 (M3)** |
| 서버 `tenders` 라우트가 draft 받으면 자동 convert | ✗ 안 함 (draft 에 그대로 collection+session+capture 붙임) | `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` 전 구간 | 보조 (M0 서버, 선택) |
| 영수증 `issued_at` UTC ISO 직렬화 | ✓ (`model.dateTime()` + `res.json`) | `apps/commerce-core/src/modules/receipt/models/receipt.ts:32` · `service.ts:233` · `api/admin/pos/receipts/[id]/route.ts:26` | M3 표시 책임 |

결론: **"앱이 완료(convert) 호출을 안 함"** 가 1차 뿌리 · 서버 tenders 는 draft 에도 payment 잘 붙임 (설계상 정상). 수정 1차 범위는 M3 (앱).

---

## 1. 서버 side — `display_id 30` 정체

tenders 라우트는 body.order_id 를 그대로 `query.graph({ entity:"order", filters:{ id } })` 로 조회한다. Medusa v2 는 draft 와 order 를 **동일 `order` 엔티티로** 관리 (`is_draft_order` boolean 으로 구분). draft_order.convertToOrder 가 일어나지 않으면 raw 는 draft 그대로 남고 `is_draft_order=true · status="draft"`.

`convertDraftOrderStep` 소스 (증거):
```js
// @medusajs/core-flows/.../draft-order/workflows/convert-draft-order.js:15
const response = await service.updateOrders([
  { id, status: utils_1.OrderStatus.PENDING, is_draft_order: false },
]);
```

`/admin/orders` route 소스 (증거):
```js
// @medusajs/medusa/.../api/admin/orders/route.js:9
const GET = async (req, res) => {
  const variables = {
    filters: { ...req.filterableFields, is_draft_order: false },
    ...
```

따라서 **convertToOrder 가 안 불린 모든 "주문" 은 Orders 탭에서 안 보임**. #30 은 orders 테이블에 존재하되 `is_draft_order=true` 로 남아있을 것 (영수증 `order_id` 는 그 ID 를 그대로 참조 — tenders 라우트가 draft 여도 query.graph 로 찾고 payment_collection 붙임).

---

## 2. 앱 흐름 실측 (fork master `fd0aa70`)

### 2.1 `app/checkout/tender-cash/[draftOrderId].tsx`
```tsx
// line 30-55 발췌
const createTender = useCreateTender();
...
const onProcess = async (receivedAmount: number) => {
  const tender = await createTender.mutateAsync({
    order_id: draftOrderId,              // ← draft ID 를 order_id 로 POST
    provider_id: PROVIDER_CASH,
    input: { received_amount: receivedAmount },
  });
  ...
  router.replace({
    pathname: '/checkout/success/[orderId]',
    params: { orderId: tender.order_id, receiptId: tender.receipt_id, ... }
  });
};
```
→ **convertToOrder 호출 없음 · SecureStore.delete 없음 · ['draft-order'] invalidate 없음 · cart 로컬 상태 clear 없음**.

### 2.2 `api/hooks/pos-payments.ts::useCreateTender`
```ts
// line 50-66 발췌
export const useCreateTender = () => {
  const sdk = useMedusaSdk();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PosTenderInput) => {
      const { order_id, ...body } = input;
      return (await sdk.client.fetch(`/admin/pos/orders/${order_id}/tenders`, {
        method: 'POST', body,
      })) as PosTenderResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order'] });       // ← ['orders'] (복수) 아님 · list queryKey 불일치
      qc.invalidateQueries({ queryKey: ['pos-receipt'] });
      // convertToOrder · SecureStore.delete · ['draft-order'] invalidate 없음
    },
  });
};
```
- `useOrders` 의 실제 queryKey 는 `['orders', JSON.stringify(query)]` (`api/hooks/orders.ts:25`) — `['order']` 로 invalidate 해도 **no-match**.
- `useCurrentDraftOrder` queryKey `['draft-order']` (`api/hooks/draft-orders.tsx:203`) — invalidate 안 됨.

### 2.3 `app/checkout/success/[orderId].tsx`
- `useReceipt` + `useFulfillOrder` 만 사용.
- `convertToOrder`, `SecureStore.delete`, `['draft-order']/['orders']` invalidate **전부 없음**.
- Hand-over 성공 후 `router.replace('/products')` — Cart 탭 상태 변경 없음.

### 2.4 비교 · 기존 agilo 흐름 (M3 가 참조해야 할 패턴)
`api/hooks/draft-orders.tsx::useCompleteDraftOrder` (fork master 에 여전히 존재 · line 638-760):
1. `sdk.admin.draftOrder.beginEdit → update → confirmEdit`
2. **`sdk.admin.draftOrder.convertToOrder(draftOrderId)`** ← 핵심
3. **`SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY)`** ← cart 폐기
4. `register-sessions/:sid/pos-complete` (보조 payment path)
5. `onSettled`: `queryClient.invalidateQueries({ queryKey: ['draft-order'] })`

P2 흐름은 2–5 단계를 **모두** 빼먹었다.

---

## 3. Orders 목록 필터 — 재현 (사용자 run)

앱 `useOrders` 는 `sdk.admin.order.list({ q, fields:'+customer.*,+total,+currency_code', order:'-created_at', status?, created_at?, limit:20, offset:0 })` 호출. sales_channel_id 없음. `is_draft_order` 명시 없음 → 서버가 하드코딩으로 `false` 적용 → draft 는 안 나옴.

```bash
# 사전 · 토큰 발급
TOKEN=$(curl -sS -X POST https://api.meros.id/auth/user/emailpass \
  -H 'Content-Type: application/json' \
  -d '{"email":"<admin>","password":"<pw>"}' | jq -r .token)

# (A) Order 테이블에 #30 조회 (앱 필터 그대로 재현)
curl -sS "https://api.meros.id/admin/orders?fields=%2Bcustomer.*,%2Btotal,%2Bcurrency_code&order=-created_at&limit=50" \
  -H "Authorization: Bearer $TOKEN" | jq '.orders | map(select(.display_id==30))'
# 예상: 빈 배열 [] (is_draft_order=false 필터로 제외)

# (B) 전체 (is_draft_order 명시) — Medusa 가 override 허용하는지 확인
curl -sS "https://api.meros.id/admin/orders?is_draft_order=true&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.orders[] | {id,display_id,status,is_draft_order}'
# route.js 의 하드코딩 (...req.filterableFields, is_draft_order:false) 가 override 위라 여전히 false.

# (C) draft_orders 엔드포인트 — 여기에 #30 이 있을 것
curl -sS "https://api.meros.id/admin/draft-orders?limit=50" \
  -H "Authorization: Bearer $TOKEN" | jq '.draft_orders[] | select(.display_id==30) | {id,display_id,status,is_draft_order,created_at,metadata}'
# 예상: status="draft" · is_draft_order=true · metadata 에 receipt_id 가 (M0-1105-K 덕에) 저장돼 있음

# (D) 영수증 — order_id 가 draft 쪽을 가리키는지
RID=$(curl -sS "https://api.meros.id/admin/draft-orders?limit=50" -H "Authorization: Bearer $TOKEN" \
  | jq -r '.draft_orders[] | select(.display_id==30) | .metadata.receipt_id')
curl -sS "https://api.meros.id/admin/pos/receipts/$RID" \
  -H "Authorization: Bearer $TOKEN" | jq '{receipt: {order_id: .receipt.order_id, receipt_no: .receipt.receipt_no, issued_at: .receipt.issued_at, order_display_id: .receipt.snapshot.order_display_id}}'
# 예상: order_id == draft_orders.id (R-261107-0001 · snapshot.order_display_id=30 · issued_at ISO 8601 UTC)
```

**credential 없는 로컬 재현 (지원)**: `pnpm --filter commerce-core test:integration:pos` 에 신규 어설션 추가하면 바로 재현 가능 (현 `#1` 과 동일 흐름으로 draft ID 를 tenders 에 보내고 fulfill 전에 `/admin/orders?q=<display_id>` 가 0건인지 체크).

---

## 4. 결론

> **"앱이 완료 호출을 안 함"** (주 책임 · M3). 서버 tenders 라우트는 draft 에도 collection+session+capture+receipt 를 정상 발행 — 설계상 정상 동작 (draft 여도 "결제 중" 상태를 지원). **convertToOrder 는 앱 책임**.

### 수정 주인

| # | 주인 | 역할 | 긴급도 |
|---|------|------|--------|
| 1 | **M3 (앱)** | `useCreateTender` (또는 `tender-cash` onProcess · `success` 화면) 에서 tenders 성공 후 **convertToOrder + SecureStore.delete + ['draft-order']/['orders'] invalidate** 3단계 호출 | **즉시 (Kyu 실기 봉인)** |
| 2 | M3 (앱) | `useCreateTender.onSuccess` 의 invalidate queryKey 를 `['order']` → `['orders']` 로 수정 (상세 `['orders','order',id]` 커버 유지) | 즉시 (상세 리스트 일관성) |
| 3 | M1 (앱 api hooks) | `useCurrentDraftOrder` 의 isStaleDraftOrderError 가 "주문으로 convert 됨" 도 stale 로 간주하도록 매칭 패턴 보강 — 보조 안전망 | 중 |
| 4 | M0 (서버 · 선택) | tenders 라우트에서 draft 수신 시 `convertDraftOrderWorkflow` 트랜잭션 끝에 자동 호출 — 앱 측 누락 방어 | 저 (설계 결정 Kyu) |

### 수정 범위 3줄 (M3 즉시 패치)
1. `api/hooks/pos-payments.ts::useCreateTender.mutationFn` — tenders POST 성공 후 `await sdk.admin.draftOrder.convertToOrder(order_id)` 호출 (Medusa v2 는 draft 와 order 의 ID 가 동일 — convert 뒤에도 같은 ID 로 조회 가능).
2. 같은 mutationFn 안 — `await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY)` (import from `@/lib/secure-storage`).
3. 같은 hook `onSuccess` — `qc.invalidateQueries({ queryKey: ['orders'], exact: false })` + `qc.invalidateQueries({ queryKey: ['draft-order'], exact: false })` (list + cart 둘 다 커버).

### 부수 — 영수증 `issued_at` UTC ISO
- `apps/commerce-core/src/modules/receipt/models/receipt.ts:32` · `issued_at: model.dateTime()`
- `apps/commerce-core/src/modules/receipt/service.ts:233` · `issued_at: date` (date = `new Date()`)
- `apps/commerce-core/src/api/admin/pos/receipts/[id]/route.ts:26` · `res.json({ receipt: row })` → Express JSON.stringify → `Date.toJSON()` → **ISO 8601 UTC (`"YYYY-MM-DDTHH:mm:ss.sssZ"`)**.
- **결론**: 서버 UTC ISO 로 정상 송출. 앱 표시 포맷팅 (현지 TZ 변환 · 시각 포맷) 은 M3 책임. (예: `fdw/utils/date.ts::formatDate` 가 `new Date(iso).toLocaleString(..., {timeZone:'Asia/Jakarta'})` 처리하는지 확인.)

---

## 5. 산출물

- **커밋 0** (진단 라운드 · 코드 수정 금지 명시).
- **리포트**: `curiocity-relay/m0/M0-1105-O-report.md` (이 파일).
- **다음 라운드 후보 (대기)**:
  - **M3-1105-?** · 즉시 패치 (수정 범위 3줄 · 위 §4) · Kyu 재현 테스트.
  - **M0-1105-M** (Delivery stages · #194 머지 뒤) — 원래 예정.
  - **M0-1105-? 선택** · tenders 라우트 draft 자동 convert 방어 (Kyu 결정).

---

## 6. 메모

- 서버 측 `/admin/orders` 의 하드코딩 `is_draft_order: false` 는 Medusa 2.17 정책 (bundled). override 불가 — 앱이 draft 상태인 "주문" 을 Orders 탭에 보이려면 서버가 convert 를 거쳐야 함.
- M0-1105-K 의 `order.metadata.receipt_id` 저장은 **draft 상태에서도 정상 동작** (tenders 라우트는 `Modules.ORDER.updateOrders` 로 쓰는데 draft 도 같은 테이블). convert 이후에도 같은 ID 로 metadata 유지.
- Receipt `order_id` 는 draft 에 결속돼 있으나 convert 후에도 ID 동일 — 영수증 포인터는 유효.
