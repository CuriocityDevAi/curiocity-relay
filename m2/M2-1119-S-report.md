fork PR #207 · 슬립 통일 O · Ref O(payment_request_id→reference_no) · 상단 출처 Medusa StockLocation.name(split-tender:[draftOrderId].tsx:456) → null 로 변경 · Next customer O · 미연결 문구 O(hasPolledSincePayment 가드) · 버튼 줄바꿈 O(flex-wrap+numberOfLines=1) · 테스트 17/17

## M2-1119-S 완료 보고

**브랜치**: `fix/M2-1119-S-pos-slip-nextcustomer`
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/207
**커밋**: 3a7ee21

### REQ 1 — 슬립 통일 · Ref · 상단 출처

**슬립 컴포넌트**: 결제 중 슬립(SlipConfirmedStep)과 완료 화면 Slip 1/2 모두 `PaymentSlipCard` 사용 ✓

**QRIS Ref**:
- 완료 화면 Slip: `receipt.snapshot.tenders[i].qris_receipt_id` (기존) ✓
- 결제 중 슬립: `PosTenderResponse.payment_request_id` → `reference_no` 추가 ✓
- `qris_receipt_id` 는 receipt 생성 후에만 사용 가능 → in-progress 슬립은 Xendit payment_request_id 로 대체

**상단 출처 — "Soopsok Store (Jakarta)" 원인**:
- 파일: `app/checkout/split-tender/[draftOrderId].tsx` (변경 전 line 456)
- 코드: `const storeName = settings.data?.stock_location?.name ?? null`
- 출처: Medusa admin StockLocation API (`sdk.admin.stockLocation.retrieve`) 의 `.name` 필드
- 이제 사용 안 함: `storeName = null` 로 변경

**스토어 헤더**:
- `PaymentSlipData` 에 `storeHeader` 필드 추가
- `tenderToSlipData` 5번째 인수 추가 (storeHeader)
- `SuccessReceiptAnim`: `receipt.snapshot.header` → storeHeader 전달 ✓
- `PaymentSlipCard`: `storeHeader` 렌더 추가 · `storeName` null 이면 미렌더(MEROS fallback 제거) ✓
- split-tender in-progress 슬립: `storeName = null` (receipt 미획득 상태) → 상단 매장명 없음

### REQ 2 — Next customer 버튼

- `SuccessReceiptAnim`: `onNextCustomer?: () => void` prop 추가, `testID="next-customer"` 버튼 (Hand over 아래)
- `success/[orderId].tsx`: `useNextCustomer` + `clearDraftOrderCustomer` 연결
  - 누르면: 즉시 draft-order 캐시에서 customer 비움 → next-customer API 호출 → `/products` 이동

### REQ 3 — 손님 화면 미연결 분기

- `LinkCustomerCard` 에 `hasPolledSincePayment` 가드 추가
- 조건: `snapshot.polled_at < snapshot.paid_at` 이면 entering 카드 미노출 (display가 결제 후 폴링 안 함)
- 순수 함수 `classifyCustomerDisplay` 는 변경하지 않음 (기존 테스트 보호)

### REQ 4 — 주문 상세 버튼 줄바꿈

- `app/orders/[orderId].tsx` 버튼 컨테이너: `flex-row flex-wrap gap-2`
- `components/ui/Button.tsx`: `numberOfLines?: number` prop 추가
- 하단 9개 버튼 모두 `numberOfLines={1}` 적용

### 테스트

- 신규: `__tests__/m2-1119-s-pos-slip-fixes.test.ts` 17케이스 모두 pass
- 전체: 786 pass | 1 pre-existing fail (docs/plans/splitview-capture.spec.ts, Playwright 미설치)

### 미검증

시뮬레이터/웹 빌드 미실행. iPad Split View 실기 캡처 없음.
