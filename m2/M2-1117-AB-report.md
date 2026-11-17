PR #352 · 주문 목록 경로 6개 · 공용화 제안

## 진단 결과

| Route | 경로 | 호출 앱 |
|-------|------|---------|
| R1 | GET /admin/pos/orders-list | Commerce Core admin 화면 |
| R2 | GET /admin/pos/draft-orders | 없음 (통합 테스트 전용) |
| R3 | GET /admin/pos/orders/:id | 없음 (Anchor는 SDK 직접) |
| R4 | GET /admin/orders (Medusa SDK, limit:500) | Anchor 주문 목록 |
| R5 | GET /admin/orders (Medusa SDK, limit:1000) | Anchor badge·cash |
| R6 | GET /admin/orders/:id (Medusa SDK) | Anchor 주문 상세 |

## 공용화 제안

`src/workflows/_shared/steps/list-pos-orders.ts` 추출 → 4단계 순서:
1. query.graph + customerModule.listCustomers를 step으로 추출 (R1·R2)
2. Anchor useQueryOrders server-side 필터 추가 (R4 500-row 최적화)
3. R4·R5 hook 통합
4. CareAgent·Wing channel 파라미터 추가 (Phase 1 착수 시)

동작 불변 확인: integration-tests/pos/orders-list.spec.ts toMatchSnapshot 추가 → shape diff 0

산출: docs/plans/order-list-standardize.md
