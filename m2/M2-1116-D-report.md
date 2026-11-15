#287 스레드 2 resolve · mergeState CLEAN · #289 테스트 수정 완료 · CI 결제 한도 블로커

## #287

### 미해결 스레드 → resolve

| ID | 내용 | 반영 확인 | 처리 |
|---|---|---|---
| PRRT_kwDOTe-UYs63uYKL | C1 · `srcOrder` 순서 (`freshOrder ?? input.order ?? initialOrder`) | ✅ earn.ts:195 반영 (M3-1116-B) | ✅ resolved |
| PRRT_kwDOTe-UYs63uYQc | C2 · subscriber earn 경로 테스트 미구현 | ✅ link-earn.spec.ts:379 반영 (M3-1116-B) | ✅ resolved |

### CI (run: 43770090835)

| job | 결과 |
|---|---|
| changes-filter | ✅ |
| markers-and-forbidden | ✅ |
| check | ✅ |
| unit-commerce-core | ✅ |
| customer-display | ✅ |
| e2e-admin-loyalty | ✅ |
| pos-integration | ✅ |

### mergeStateStatus

```json
{"mergeStateStatus":"CLEAN","mergeable":"MERGEABLE"}
```

---

## #289

### 수정 내용 (`refund-recover.spec.ts`)

커밋: `0c77441` (test(loyalty): M2-1116-D — refund-recover seed real line_item + source test)

**블로커 수정: `seedEarnedOrder` real line_item 교체**
- 전: `createOrders({ items: [] })` + `syntheticOrder(item_subtotal 직접 주입)` → `recoverForOrder` 내부 `fetchOrderWithTotals`가 `total=0` → `order_total_zero` guard → `recovered=0`
- 후: `createTestOrder(container, { total, items: [{ title, quantity:1, unit_price: subtotal }] })` + `orderModule.updateOrders(customer_id)` + `earnForOrder({ order_id })` (input.order 없이) → `query.graph`가 real `item_subtotal` 반환 → earn·recover 정상

**테스트 케이스 #1–#4**: 기대값 그대로 유지

**테스트 케이스 #5 추가**: `customer_identified source` 구분
- `pos_clerk` / `customer_display` 양 경로 각각:
  - `createTestOrder` (real items, receipt_no 없음)
  - `linkCustomerToOrder(container, { source })` → customer_id 연결만 (미완료 주문 → earn=null)
  - `updateOrders({ receipt_no })` → 완료 처리
  - `earnForOrder({ order_id })` (query.graph totals) → earned=330
  - `recoverForOrder({ refund_amount: 33_000 })` → recovered=330 ✅

**#289 미해결 스레드 (PRRT_kwDOTe-UYs63uod2)**: `items:[]` 블로커 지적 — 수정 반영, `isOutdated:true`. CI 초록 확인 후 resolve 예정.

### CI 상태

**⚠️ GitHub Actions 결제 한도 초과** — 내 커밋(0c77441) 이후 모든 CI run이 "account payments have failed or spending limit needs to be increased" 로 즉시 실패. 코드 문제 아님. Kyu가 GitHub Billing 설정 확인 필요.

참고: 이전 커밋(`1360b9d`) 기준 run `43769656452`에서 `refund-recover.spec.ts` 4건 실패 확인됨 (블로커 그대로). 내 수정으로 해당 실패 해소 예상.

#289 `mergeStateStatus`: UNKNOWN (CI 미완료로 GitHub가 판정 보류)
