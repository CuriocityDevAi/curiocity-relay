PR #299 · 실패 원인 표(코드/테스트) · POS 주문 status=completed · CI pos-integration ✅

## PR

https://github.com/CuriocityDevAi/storeport/pull/299  
branch: `fix/m1-1116-j-pos-integration-red`  
commits: `92ec851` (R1) → `f102f09` (R2)

## 실패 원인 표

| 테스트 | 실패 원인 | 코드/테스트 | 수정 위치 |
|---|---|---|---|
| orders-list #1 phone mask | `query.graph` 에서 `customer.phone` 크로스모듈 필드 미작동 → `customer_phone_masked=null` | **코드 버그** (route) | `orders-list/route.ts`: `query.graph customer.phone` → `customerModule.listCustomers` 배치 조회로 대체 |
| orders-list #2 q=2480 | (1) Medusa v2 `updateOrders({...})` 단일객체 silent-success → `customer_id` 미반영 → phone null → 필터 결과 `[]` (2) 위 phone 미작동 복합 | **테스트 준비 + 코드 버그** | spec: `updateOrders([{...}])` 배열 형식, route: 위 동일 |
| orders-list #6 순적립 | `updateOrders({...})` 단일객체 silent-success → `loyalty_earn` metadata 미반영 → `parseLoyaltyEarn` null 반환 | **테스트 준비 버그** | spec: `updateOrders([{...}])` 배열 형식 |
| customer-summary T3 | route `filters: { status: ["completed"] }` → 직접 생성 주문(`pending`)이 집계 제외 → `visit_count=0`; 운영에서도 `completeOrderWorkflow` 미호출 주문은 visit_count 에 반영 안 됨 | **운영 코드 버그 + 테스트 준비** | route: `status` 필터 제거, JS단에서 `canceled`/`draft` 만 제외; spec: T3/T4 에 `completeOrderWorkflow` 추가 |
| customer-summary T5 | `orderModule.cancelOrders([id])` Medusa 2.17.2 미존재 | **테스트 준비 버그** | spec: `cancelOrderWorkflow(container).run({ input: { order_id } })` 로 대체 |
| customer-summary T4 | T3+T5 연쇄 실패 | — | 위 수정으로 해결 |

## POS 주문 status 값

POS 완료 주문 status = **`completed`**  
경로: 주문 생성(`pending`) → tenders 결제 → fulfill 라우트 → `completeOrderWorkflow` → `completed`  
`completeOrderWorkflow` 를 거치지 않은 주문(tenders 완료 후 fulfill 미호출)은 `pending` 상태로 남음.  
→ 운영 버그: `customer-summary` route 가 `status: ["completed"]` 로 필터링 시 pending 주문은 visit_count/total_revenue 에서 누락됨. 수정: canceled/draft 만 제외로 변경.

## CI 결과 (run 43792010566)

| job | 결과 |
|---|---|
| changes-filter | ✅ pass |
| markers-and-forbidden | ✅ pass |
| unit-commerce-core | ✅ pass |
| e2e-admin-loyalty | ✅ pass |
| customer-display | ✅ pass |
| **pos-integration** | ✅ **pass** (10m4s) |
| docker-smoke-commerce-core | ❌ fail — migration timeout (480s) · 과거 3회 연속 실패 이력(script 주석 30339149437·30341052330·30343055378) · 내 변경과 무관한 pre-existing 인프라 이슈 |
