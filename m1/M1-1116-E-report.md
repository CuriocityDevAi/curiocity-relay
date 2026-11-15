PR #293 · Customer 상세 Loyalty 위젯 · 요약 카드·주문 내역·포인트 내역 · TSC OK · 단위 326 pass · 통합 4/4 pass

## 구현 내용

### 신규 파일 3개

1. `apps/commerce-core/src/api/admin/pos/customers/[id]/summary/route.ts`
   - GET 읽기 전용 엔드포인트
   - 전화번호(전체 phone_e164) · 총 구매액 · 방문 횟수 · 마지막 방문 · 포인트 잔액
   - 주문 목록 (loyalty_earn/used · recovery 반영) · 포인트 거래 내역

2. `apps/commerce-core/src/admin/widgets/customer-loyalty-detail.tsx`
   - zone: `customer.details.before` (상단 요약)
   - SummaryCard + OrdersCard + TransactionsCard
   - 10건 페이지네이션 · 주문 행 클릭 → `/orders/:id` · 거래 연결 주문 링크

3. `apps/commerce-core/integration-tests/loyalty/customer-summary.spec.ts`
   - T1: 없는 customer_id → 404
   - T2: 주문 없는 고객 → 빈 목록 · balance=0
   - T3: 실 line_item 주문 1건 + earnForOrder → 요약·주문목록·거래내역 일치
   - T4: 주문 2건 → total_revenue 합산 · visit_count=2 · last_visit_at=최신

### 금지 사항 준수
- orders-list · order 위젯 · loyalty lib 건드리지 않음
- medusa-config 수정 없음

## 로컬 검증 결과

```
typecheck:  TSC --noEmit → 오류 0
단위 테스트: 23 suites · 326 passed
통합 테스트: integration-tests/loyalty/customer-summary.spec.ts → 4/4 passed (9.84s)
```
