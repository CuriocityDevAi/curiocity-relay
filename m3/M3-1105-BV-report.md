# M3-1105-BV 리포트

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/131 (base: master · draft)

## 수정 내용

### REQ1 — 카트 삭제 디바운스 경쟁 (`api/hooks/draft-orders.tsx`)
`useUpdateDraftOrderItem` mutationFn 내 debounce Promise 진입 시 `quantity === 0`이면 즉시 resolve — 300ms 대기 없이 삭제를 서버에 즉시 확정. 이후 Undo(재추가)가 항상 삭제 완료 이후 순서로 실행되어 "삭제 → 재추가 → 다시 삭제"되는 경쟁 없음.

**권장안 선택 이유**: 삭제는 의도된 확정 동작이므로 즉시 반영이 UX 기대와 일치하고, Undo 대기 방식 대비 변경 범위가 1줄로 최소화됨.

### REQ2 — QR 재발행 직후 ID 갱신 (`app/checkout/tender-qris/[draftOrderId].tsx`)
`onNewQr` 에서 `regenerate.mutateAsync` 응답의 `payment_request_id`를 `setCurrentPaymentRequestId`로 즉시 반영. 재발행 직후 "Check payment" 또는 10s 폴링이 새 번호로 서버를 조회함.

## 자기 검증
- lint errors: 0 (기존 warnings는 pre-existing, 내 변경 무관)
- vitest: 195 passed · 0 failed (신규 9건 포함)
- 웹 번들 가드: 미검증 (Expo 환경)

## Kyu 실기 확인 항목
카트에서 휴지통 버튼 → 바로 Undo(같은 상품 재스캔)를 빠르게 눌러도 상품이 한 줄·원래 수량으로 돌아옴.
