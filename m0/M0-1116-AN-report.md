PR #319 · receipt_id 1순위 확정

## 요약
- URL: https://github.com/CuriocityDevAi/storeport/pull/319
- 브랜치: `feat/m0-1116-ah-qris-rrn` (기존 AH 브랜치에 AN 커밋 1개 추가)
- 커밋: `e73d349 fix(payment): M0-1116-AN — QRIS 영수증 Ref 를 Xendit 공식 receipt_id 로 확정`

## 필드 결론
Xendit v3 Payments webhook 공식 필드 = **`payment_details.receipt_id`**
근거: docs.xendit.co/apidocs/payment-webhook-notification — "Receipt reference number communicated to the end user by their payment method provider for this specific payment".

**추출 우선순위**:
1. `data.payment_details.receipt_id` (공식 · 정본)
2. `data.payment_details.rrn` (레거시 별칭 가능성 · 공식 문서 미기재 · 근거 주석)
3. (부재 시) `null` → 호출측 폴백 `data.payment_id` (라벨 "Xendit ID")

M0-1116-AH 때 추측으로 긁어둔 `channel_properties.*` / `payment_method.qr_code.*` 경로는 **삭제**.

## 네이밍
- `qrisRrn` → `qrisReceiptId` (ParsedWebhook)
- `qris_rrn` → `qris_receipt_id` (metadata/snapshot · TenderForReceipt)
- 기존 `issuer_rrn` · `reference_no` 는 호환 유지 (레거시 데이터 대응)
- 영수증 "Ref" 폴백 체인: `qris_receipt_id → xendit_payment_id → reference_no → paymentRequestId`

## 변경 파일 (AH 와 동일 4개)
- `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts`
- `apps/commerce-core/src/api/hooks/payment/xendit/route.ts`
- `apps/commerce-core/src/modules/receipt/service.ts`
- `apps/commerce-core/src/modules/payment_xendit/__tests__/qris-xendit.unit.spec.ts`

## 자기 검증
```
jest qris-xendit.unit.spec.ts
Test Suites: 1 passed, 1 total
Tests:       31 passed, 31 total
Time:        1.199 s
```
전체 unit (pre-push hook):
```
Test Suites: 25 passed, 25 total
Tests:       350 passed, 350 total
Time:        7.938 s
```
tsc --noEmit: 신규 에러 0 (총 245 = main baseline 동일 · 전부 admin/widgets React 19 JSX 선재 에러)

## 영수증 표시 (ReceiptCard)
**이 PR 범위 밖** — fork 쪽 별도 PR **M1-1116-AO** 가 라벨 전환 ("Ref" ↔ "Xendit ID") · 전체 표시 · 길면 줄바꿈 처리.

## Kyu 확인 항목
- 새 QRIS 결제 영수증의 Ref 가 손님 결제앱 영수증 번호와 같은지 (Sandbox simulate 에서는 `receipt_id` 없어 Xendit ID 로 나올 수 있음 · 실 거래에서만 `receipt_id` 들어옴).

## 실행 범위 (상시 금지 준수)
- Kyu 개인 폴더 미사용
- 운영 SSH/railway CLI/운영 DB 미호출
- 실 Xendit live 미호출 (webhook 파서 단위 테스트만)
- PR 머지 금지 (발의만)
- 앱(fork) 미수정 (영수증 화면은 M1-1116-AO 별도)
- CI 대기 없이 즉시 보고
- /loop 미사용
