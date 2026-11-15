C1 ✅ · C2 ✅ · CI: changes-filter pass · check pass · markers-and-forbidden pass · unit-commerce-core pass · customer-display pass · e2e-admin-loyalty pass · pos-integration pass · mergeState: OPEN (머지 금지)

## C1 — earn.ts 수정 (2건)

**락 안 srcOrder 순서 수정**
`apps/commerce-core/src/lib/loyalty/earn.ts:195`
- 전: `const srcOrder = input.order ?? freshOrder ?? initialOrder;`
- 후: `const srcOrder = freshOrder ?? input.order ?? initialOrder;`
- 이유: subscriber 가 주입하는 `input.order`(`retrieveOrder` 결과)에는 computed totals(`item_subtotal` 등)이 없어 subtotal=0 → earn=0. 락 안에서 가져온 `freshOrder`(`query.graph`)가 computed totals를 가지므로 우선 사용.

**initialOrder totals 없는 경우 fetchOrderWithTotals 우선**
`apps/commerce-core/src/lib/loyalty/earn.ts:142–147`
- 전: `input.order ?? fetchOrderWithTotals(...)`
- 후: `input.order?.item_subtotal != null ? input.order : fetchOrderWithTotals(...) ?? input.order ?? null`
- 이유: subscriber path에서 `input.order`에 `item_subtotal`이 없으면 totals 조회 결과 우선.

## C2 — subscriber 경로 테스트 추가

`apps/commerce-core/integration-tests/loyalty/link-earn.spec.ts`

케이스: `"subscriber 경로: customer_id 사전 연결 + retrieveOrder 주입 → earned=330 (M0-1116-B C2)"`
- line_item 33_000짜리 주문 + customer_id 사전 연결
- `orderModule.retrieveOrder` 결과(computed totals 없음)를 `input.order`로 주입
- C1 fix 전: srcOrder=rawOrder(subtotal=0) → earn=0 (버그 재현)
- C1 fix 후: srcOrder=freshOrder(item_subtotal=33_000) → earned=330 ✅

**기존 test-0 수정** (부수 작업)
C1 fix으로 `freshOrder` 우선 → `items:[]` DB 주문에서 item_subtotal=0 → earn=0으로 기존 advisory lock 테스트 실패.
실 line_item 주문(`createTestOrder` 사용) + customer_id 연결로 교체해 `query.graph`가 올바른 item_subtotal 반환하도록 수정.

## CI 결과 (run: 43770090835)

| job | 결과 |
|-----|------|
| changes-filter | ✅ pass |
| check | ✅ pass |
| markers-and-forbidden | ✅ pass |
| unit-commerce-core | ✅ pass |
| customer-display | ✅ pass |
| e2e-admin-loyalty | ✅ pass |
| pos-integration | ✅ pass (8m48s) |
| docker-smoke-* | skipping (변경 없음) |
