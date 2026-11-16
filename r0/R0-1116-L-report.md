#299 APPROVE · 매출 정의 의견

## REQ1 orders-list — `customerModule.listCustomers` 배치 조회

- **N+1 없음** ✅: `customer_id` 중복 제거 Set → `listCustomers({ id: customerIds }, { take: n })` 단 1회 호출.
- **가림 유지** ✅: `customerPhoneMap.get(o.customer_id) → maskPhone()` 경로 그대로. `customer_phone_masked` / `customer_has_phone` 정상 반환.
- **q-페이지네이션 일치** ✅: `q === ""` → DB `skip/take`, `q !== ""` → 전체 로드 후 JS 필터(`display_id` OR `phone.includes`) → `totalCount = orders.length` → `slice(offset, offset + limit)`. count와 슬라이스 일치.

## REQ2 customer-summary — status 필터 제거 / canceled·draft 제외

- **버그 수정 올바름** ✅: `status: ["completed"]` → JS단 `canceled/draft` 제외로 POS `pending` 주문 집계 복원.
- **환불 주문 새 오류 없음** ✅: 매출 계산이 `net = Math.max(0, total - refund_amount)` — 환불 주문 net = 0, `total_revenue` 오염 없음.
- **매출 정의 의견**: 현재 `total - refund_amount`(주문 금액 기반) 집계이므로, tenders 결제 전 `pending` 주문이 포함될 경우 실제 수납액보다 높아질 수 있음. POS 운영 흐름상("주문 생성 = 카운터 결제 직후") 실질 위험은 낮으나, 엄밀한 매출 기준이 필요하다면 `payment_collections.payments.captures` 합산으로 전환 권장. 현 단계에서는 현행 기준으로 충분하다고 판단.

## REQ3 테스트 준비·코드 수정 여부

| 파일 | 변경 내용 | 기대값 변경 |
|---|---|---|
| `orders-list.spec.ts` | `updateOrders({})` → `updateOrders([{}])` 배열 형식 수정 | 없음 ✅ |
| `customer-summary.spec.ts` T3·T4 | `completeOrderWorkflow` 추가 (준비) | 없음 ✅ |
| `customer-summary.spec.ts` T5 | `cancelOrders` → `cancelOrderWorkflow` (Medusa 2.17.2 API) | 없음 ✅ |

모든 변경이 준비·코드 수정이며 기대값(`expect`) 변경 없음.

## CI

CI `pos-integration` ✅ (M1-1116-J 원장 보고 기준). `docker-smoke-commerce-core` ❌는 migration timeout 반복 이력 있는 pre-existing 인프라 이슈 — 본 PR과 무관.

## 결론

블로커 없음. APPROVE (자동화 계정 자기-PR 제약으로 GitHub에 COMMENT로 제출).
