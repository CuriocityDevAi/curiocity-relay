PR #341 · void route 828줄→455줄 · step 6 · 테스트 11

## 작업 요약

### 파일
- **신규**: `apps/commerce-core/src/workflows/pos-void/steps.ts` (436줄)
- **신규**: `apps/commerce-core/src/workflows/pos-void/index.ts` (102줄)
- **신규**: `apps/commerce-core/src/workflows/pos-void/__tests__/pos-void-workflow.unit.spec.ts` (11개 테스트)
- **수정**: `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` (828→455줄, -45%)
- **수정**: `docs/feature-map.yaml` (pos-void-refund 프로세스에 workflow 파일 등록)

### Workflow steps (6개)
1. `loadOrderForVoidStep` — full order load
2. `cancelQrisSessionsStep` — 미결제 QRIS session 취소
3. `recordPaymentRefundsStep` — captured payment 전액 환불 기록
4. `cancelFulfillmentsStep` — 미출하 fulfillment 취소
5. `adjustWastedInventoryStep` — restock=false 시 재고 차감 (compensation: +qty 복귀)
6. `cancelOrderStep` — 주문 취소 + reservation cleanup

### 동작 불변
- 응답 JSON 스냅샷 동일
- 단위 테스트 422개 전부 통과 (신규 11개 포함)
- PIN 없이 step 함수 직접 호출 테스트로 채널 중립 증명

## 미검증
동작 불변 · Kyu 실기 = 현금 Void 1건(회귀)
