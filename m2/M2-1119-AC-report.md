fork #207 · quote 재조회 O · qris-status 최상위 읽기 제거 O · 1차 QRIS 동일 O · live/sandbox 일치 테스트 O · lint 0 · #208 merge O

## 커밋

- `4f2c00c` fix(slip): M2-1119-AC #207 — QRIS paid 후 quote.tenders 재조회로 Ref·at 덮기

## 변경 요약

### REQ 1: QRIS paid → quote 재조회 → tenders[i] 덮기
- `api/hooks/pos-quote.ts`: `QuoteTender` 타입 추가 · `OrderQuote.tenders` 필드 추가 · `fetchOrderQuoteDirect()` 추가 (명령형 조회)
- `app/checkout/tender-qris/[draftOrderId].tsx`: paid 후 `fetchOrderQuoteDirect` 호출 → `tenders.find(qris)` → at·qris_receipt_id·reference_no·xendit_payment_id signal 에 채움
- 1차 QRIS(isSplitFirst): quote 재조회 후 `signalSplitQrisFirstDone(payload)` 전달
- 2차 QRIS(isSplitSecond): quote 재조회 후 `navigateToSuccess(qrisTender)` → `signalSplitQrisSecondDone` 에 전달
- `app/checkout/split-tender/[draftOrderId].tsx`: 1차 완료 시 `firstQrisReceiptId/No` 상태 세팅 · 2차 `secondSlipAt` = `secondDone.at`

### REQ 1 (qris-status 최상위 읽기 제거):
- `api/hooks/pos-qris.ts`: `QrisStatusResponse`에서 `qris_receipt_id?` · `reference_no?` 제거

### REQ 1 (1차 QRIS 동일):
- `lib/split-qris-state.ts`: `SplitQrisFirstPayload` 도입 · `signalSplitQrisFirstDone` boolean→payload 변경

### REQ 2: fixture 실제 서버 모양
- `fixtures/m1-1117-e.qris-status-2nd-paid.json`: `{ok,status,payment_request_id,test_mode,...}` 형태 · `qris_receipt_id/reference_no` 제거
- `e2e/fixtures/e2e-quote-split.json`: `footer` · `logo_mode` · `tenders[]` (cash + qris) 추가

### REQ 2: live/sandbox 일치 테스트 (REQ AC 블록 6개)
- qris-status fixture 에 `qris_receipt_id` 없음 확인
- quote fixture 에 `tenders[]` QRIS tender 확인
- live (test_mode=false): quote.tenders QRIS at·qris_receipt_id = receipt snapshot 동일
- sandbox (test_mode=true): split-tender-2nd-qris fixture test_mode=true 확인
- `consumeSplitQrisFirstDone` 반환값 at·qris_receipt_id·reference_no 포함
- 결제 중 Slip 2 at = quote.tenders QRIS at → 완료 Slip 과 동일

### REQ 3: 검증
- vitest: 48/48 통과
- lint: error 0 (기존 경고 7개 → 신규 없음, 1개 감소)
- tsc: 변경 파일에서 신규 오류 없음
- #208(fix/M3-1119-O-cd-emit) 에 충돌 없이 merge 완료 → push
