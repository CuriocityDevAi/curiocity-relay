# M0-1105-BJ Report — Xendit QRIS 테스트 모드 시뮬레이션 절차서

**결과**: docs-only · 코드 0 · PR open · 2026-11-12

## 절차 요약 (단계별)

**준비**
1. iPad POS 에서 평소대로 QRIS 결제 선택 → QR 화면 띄운 상태로 둔다 (닫지 말 것).
2. Xendit Dashboard (Test Mode) → **Transactions → Payment Requests** 필터 → 방금 생성된 QRIS 건 클릭 → `Payment Request ID` (`pr-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` · 39자) 복사.

**시뮬레이션 호출 (Kyu Mac 터미널)**

3. env 세팅 (영구 저장 X):
   ```
   read -s XENDIT_TEST_KEY
   read PR_ID
   export XENDIT_TEST_KEY PR_ID
   ```
4. simulate 호출 (`amount` 는 iPad QR 금액과 동일 · IDR 정수):
   ```
   curl -sS -X POST "https://api.xendit.co/v3/payment_requests/$PR_ID/simulate" \
     -H "api-version: 2024-11-11" \
     -H "Content-Type: application/json" \
     -u "$XENDIT_TEST_KEY:" \
     -d '{"amount": 15000}'
   ```
   응답: `{"status":"PENDING","message":"..."}` (**항상 PENDING · 결과는 webhook**)

**성공 판정** (4개 모두 OK)
5. iPad POS: 10초 이내 영수증 화면 전환
6. Admin 주문 상세: Paid · draft→order 변환
7. Admin Payments 표: QRIS 1줄 · 금액 일치 · reference = `pr-...`
8. Xendit Webhook Logs: HTTP 200 · event = `payment.capture`

**실패 진단** (webhook HTTP 코드)
- 401 — `x-callback-token` 불일치 (Railway env `XENDIT_WEBHOOK_TOKEN` vs Xendit Callback Settings verification token 재확인)
- 400 "amount mismatch" — simulate `amount` ≠ QR 금액
- 500 — 서버 내부 (Xendit 자동 재시도 6회)
- 503 — `XENDIT_WEBHOOK_TOKEN` env 미설정

## 핵심 판정
- **대시보드 전용 QRIS 시뮬레이션 버튼은 없다.** 대시보드 red banner 는 Invoice link 결제 흐름 한정 — v3 payment request 는 Invoice 가 아니라 API 전용.
- **테스트 모드 QR 을 실 월렛 앱 (GoPay/OVO/DANA/BCA 등) 으로 스캔하면 안 된다.** 테스트 키 QR string 은 BI QRIS 결제망 미등록 더미 — 실 월렛이 "merchant not registered" 로 거부. 실 월렛 실기는 live 모드 전환 이후.

## 출처
- Simulate Payment (test mode): https://docs.xendit.co/apidocs/simulate-payment-test-mode
- QR Codes Test Guideline: https://docs.xendit.co/qr-codes/integrations/test-guideline
- QR Codes Testing Scenarios (실패 트리거): https://docs.xendit.co/qr-codes/integrations/test-scenarios
- Payment Webhook Notification: https://docs.xendit.co/apidocs/payment-webhook-notification
- Invoice-mode red banner 시뮬레이션: https://help.xendit.co/hc/en-us/articles/4406696409357
- QR test mode 생성: https://help.xendit.co/hc/en-us/articles/11663847733785
- storeport webhook 수용 이벤트 (`apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts` M0-1105-BI)

## 산출물
- storeport docs/runbooks/qris-test-simulation.md (169 lines · 7 섹션 · 참고 링크 6건)
- PR: https://github.com/CuriocityDevAi/storeport/pull/235
- Branch: `docs/m0-1105-bj-qris-test-simulation` @ 7eecd3c
