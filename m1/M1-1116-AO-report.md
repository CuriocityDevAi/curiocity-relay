# M1-1116-AO 판정: ✅ 완료 — 서버 필드 일부 부족(1차 슬립 거래번호 없음, 최종 슬립은 M0-1116-AN 배포 후 채워짐)

## 구현 내용

### REQ 1 — PaymentSlipCard 신규 컴포넌트
- `components/receipt/PaymentSlipCard.tsx` 생성
- 데이터 타입 · 변환 함수는 `lib/payment-slip.ts`로 분리 (UI 의존성 없음 · vitest node 환경 직접 테스트)
- 렌더: 매장명 · "PAYMENT SLIP · Payment N of 2" · Order # · 시각 · 수단/금액 · 거래번호 · 면책 문구
- ReceiptCard 와 동일 폰트(MONO) · maxWidth 420

### REQ 2 — 나눠결제 1차 완료 확인 화면
- `app/checkout/split-tender/[draftOrderId].tsx`: `QrisConfirmedStep` 슬립 카드 + Share/Print 버튼 추가
- `useSettings()` → `stock_location.name` 으로 매장명 주입
- `firstSlipAt` 상태: QrisFirstDone 신호 수신 시각 기록 (서버 타임스탬프 없음 — 근사값)
- Share: `captureAndShareSlip(slipViewShotRef, 'payment-slip-1.png')` (ViewShot PNG 캡처)
- Print: `showToast.info('Printed', ...)` (기존 프린트 경로 동일)
- Continue to 2nd payment 흐름 유지

### REQ 3 — 최종 Payment successful 화면 Slip 1/2 버튼
- `components/payment/SuccessReceiptAnim.tsx`: `isSplitReceipt = tenders.length === 2` 감지
- [Slip 1] [Slip 2] 토글 버튼 → 해당 슬립 카드 + Share/Print 표시
- 단일 결제 주문에는 버튼 미표시

### REQ 4 — 영수증 Ref 전체 표시
- `components/receipt/ReceiptCard.tsx` QRIS tender 블록:
  - `qris_receipt_id` → "Ref" (있으면 최우선)
  - `xendit_payment_id` → "Xendit ID" (없으면 Xendit ID)
  - `reference_no` → "Ref" (기존 필드 fallback)
  - **기존 `…LAST8CHARS` truncation 완전 제거**

### REQ 5 — 서버 필드 부족 여부
| 필드 | 엔드포인트 | 상태 |
|------|-----------|------|
| `qris_receipt_id` | `GET /admin/pos/receipts/:id` → `snapshot.tenders[].qris_receipt_id` | M0-1116-AN 서버 PR 배포 후 채워짐 · 없으면 reference_no fallback |
| `xendit_payment_id` | 동일 | 동일 |
| 1차 슬립 거래번호 | `POST /admin/pos/orders/:id/tenders` 응답 | `PosTenderResponse`에 없음 — 슬립에 ref 줄 미표시 (서버 수정 없이) |
| 1차 슬립 타임스탬프 | 동일 | 없음 — 신호 수신 시각으로 근사 |

### REQ 6 — 테스트
- `__tests__/payment-slip-card.test.ts`: 13 tests passed
  - tenderToSlipData QRIS 우선순위 (qris_receipt_id / Xendit ID fallback / reference_no)
  - CASH 거스름돈 보존
  - CARD 승인번호 보존
  - 단일 결제 Slip 버튼 없음 (SuccessReceiptAnim 소스 보정)
  - ReceiptCard slice(-8) 없음
  - PaymentSlipCard disclaimer 문구
- 전체 vitest run: **35 files / 399 tests passed** (회귀 0)

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/163

## 변경 파일
- `types/receipt.ts` — ReceiptTenderQris에 qris_receipt_id · xendit_payment_id optional 필드 추가
- `lib/payment-slip.ts` (신규) — PaymentSlipData 타입 + tenderToSlipData 함수
- `lib/receipt-share.ts` — captureAndShareSlip 함수 추가
- `components/receipt/PaymentSlipCard.tsx` (신규) — 슬립 카드 컴포넌트
- `components/receipt/ReceiptCard.tsx` — QRIS Ref 전체 표시 + 새 필드 적용
- `app/checkout/split-tender/[draftOrderId].tsx` — QrisConfirmedStep 슬립 카드 + Share/Print
- `components/payment/SuccessReceiptAnim.tsx` — Slip 1/2 버튼 + 슬립 패널
- `__tests__/payment-slip-card.test.ts` (신규) — 단위 테스트 13개
