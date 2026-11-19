fork #207 · 같은 빌더 O · header 위치 최상위 O · Ref 규칙 O · tender.at O · fixture 실제모양 O · 슬립 텍스트 일치 O · lint 0

## 변경 요약

| 항목 | 이전 | 이후 |
|------|------|------|
| header 위치 | `quote.data.store.header` (line 471) | `quote.data.header` (최상위) |
| 1차 QRIS Ref | `reference_no: firstResponse.payment_request_id` (금지) | `qris_receipt_id: firstResponse?.qris_receipt_id` + `reference_no: firstResponse?.reference_no` |
| 2차 QRIS Ref | `reference_no: secondQrisRef` (payment_request_id 기반, 금지) | `qris_receipt_id: null, reference_no: null` (생략) |
| e2e-quote-split | `store.header` 내부 | 최상위 `header` |
| e2e-receipt-split-qris | `reference_no: "pr_split_qris_e_02"` (payment_request_id) | `qris_receipt_id: "qri_e2e_02"` |

## 파일 변경

- `api/hooks/pos-quote.ts` — OrderQuote: 최상위 `header/footer/logo_mode` 추가, store.header 제거
- `api/hooks/pos-payments.ts` — PosTenderResponse: `qris_receipt_id?`, `reference_no?` 추가
- `app/checkout/split-tender/[draftOrderId].tsx` — header 최상위, Ref 규칙, secondQrisRef 제거
- `e2e/fixtures/e2e-quote-split.json` — header 최상위 이동
- `e2e/fixtures/e2e-receipt-split-qris.json` — qris_receipt_id 복원
- `__tests__/m2-1119-s-pos-slip-fixes.test.ts` — REQ 1-d/1-e 업데이트 + REQ AA 폴백 테스트 5개 추가

## 테스트 결과

- vitest: 805 passed (기존 800 → +5 신규), 6 expected fail, 3 todo
- lint 신규 에러: 0
- tsc 신규 에러: 0

## 커밋

4dae9df fix(pos): M2-1119-AA — 결제 중 슬립 header 위치 수정 · Ref 계약 적용 · fixture 실제 모양
브랜치: fix/M2-1119-S-pos-slip-nextcustomer → push 완료
