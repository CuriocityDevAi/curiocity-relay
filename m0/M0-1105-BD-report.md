# M0-1105-BD — QRIS(Xendit) 서버 2차 · 환불 · 취소 · 보고

**원장 대사**: decision-qris-20261112 · 계획서 storeport docs/epics/pos-qris-xendit.md §J-d · decision-p6-20261110 (QRIS 환불 = 현금 + 매니저 PIN) 정정.

## PR

- PR: https://github.com/CuriocityDevAi/storeport/pull/229
- Base: `feat/m0-1105-bc-qris-xendit-server` (BC 라운드 PR #228 위에 쌓음)
- Head: `feat/m0-1105-bd-qris-xendit-refund-cancel` @ `d3edcc6`
- Branch 소유 워크트리: storeport 메인 (의도된 트리)

## 테스트

Fixture 기반 unit test (실 Xendit 호출 없음 · global fetch → factory DI 로 교체).

- 파일: `apps/commerce-core/src/modules/payment_xendit/__tests__/qris-xendit-bd.unit.spec.ts` (19 시나리오 추가)
- 전체: `TEST_TYPE=unit npm test` — **84/84 pass** (BC 15 + BD 19 + 기타 50).
- Typecheck: `tsc --noEmit` — 0 error.
- Naming check: `meros` match = 0.
- Feature-map check: 8 파일 모두 `commerce-core.payment-providers` / `commerce-core.pos-tenders-fulfill` 에 매칭.

구체 시나리오:

- client.createRefund · partial payload 에 amount 포함 · 응답 whitelist (내부 필드 누락)
- client.createRefund · full (amount 생략) → body 에 amount 필드 없음
- client.createRefund · FAILED + failure_code 전달
- client.cancelPaymentRequest · `POST /v3/payment_requests/{id}/cancel`
- webhook refund.succeeded → kind=refund_succeeded + refundId
- webhook refund.failed → kind=refund_failed + failureCode
- webhook refund dedup key 동일 (refund_id 기반)
- webhook refund_id · payment_request_id 모두 결여 → invalid
- tryXenditRefund · 전액 환불 SUCCEEDED · amount 생략
- tryXenditRefund · 부분 환불 SUCCEEDED · amount 포함
- tryXenditRefund · Gopay partial (full-only) · failure_code=PARTIAL_REFUND_NOT_SUPPORTED → fallback cash
- tryXenditRefund · 7일 초과 · API 미호출 · fallback cash
- tryXenditRefund · payment_request_id 결여 · API 미호출 · fallback cash
- tryXenditRefund · 미설정 (XENDIT_API_KEY 없음) · fallback cash
- tryXenditRefund · PENDING 응답 · ok=true (webhook 대기)
- tryXenditRefund · session.data fallback (payment.data 에 payment_request_id 없어도)
- tryXenditRefund · API 500 → fallback cash · reason=api_failed
- provider.cancelPayment · client.cancelPaymentRequest 실 호출
- provider.cancelPayment · payment_request_id 결여 → 멱등 no-op
- provider.cancelPayment · API 에러 삼킴 (이미 만료/취소) → 멱등 no-op

## CI run

- CI 자동 미실행: `.github/workflows/ci.yml` 은 `on.pull_request.branches: [main]` 로 걸려 있어 base=BC 브랜치 PR 에는 트리거되지 않는다. BC 가 main 에 landed 되고 BD PR base 를 main 으로 재지정하면 자동 실행.
- 로컬 (storeport 메인 트리) 에서 `pnpm test` / `tsc --noEmit` / `scripts/naming-check.sh` / `node scripts/feature-map-check.mjs --diff ...` 전부 수동 성공 확인 (위).

## 앱 (M3) 이 알아야 할 응답 필드

### `POST /admin/pos/orders/:id/return` · method='qris' 신규

- 성공 200:
  - `xendit_refund: { refund_id, status: 'SUCCEEDED'|'PENDING', payment_request_id }`
  - 외 기존 필드 (order_id · return_id · refunded_amount · receipt_id 등) 변경 없음.
- 거부 400 (QRIS API 선호출 실패 · Medusa refund 기록 안 함):
  - `{ type: 'qris_refund_rejected', order_id, payment_id, amount, reason, failure_code, fallback: 'cash', message }`
  - `reason` ∈ `outside_7d_window` · `partial_not_supported_by_issuer` · `api_failed` · `not_configured` · `missing_payment_request_id`
  - 앱 UX: `message` 를 토스트/다이얼로그로 노출 후 매니저 PIN + 현금 환불 (`method='cash'`) 로 재호출 안내.

### `POST /admin/pos/orders/:id/void`

- 성공 응답에 `qris_cancellations[]` 추가:
  - `[{ session_id, payment_request_id, xendit_status, error? }]`
  - captured 가 아닌 QRIS payment_session 각각에 Xendit cancel 시도 결과. 멱등 (이미 canceled/만료 상태는 `error` 필드로 기록 후 비치명 통과).

### Webhook `POST /hooks/payment/xendit` (외부 Xendit 발신)

- 신규 처리: `event ∈ { refund.succeeded, refund.failed }`.
- 동작: `order.metadata.returns[].xendit.refund_id` 매칭 entry 의 `status` 를 `SUCCEEDED` / `FAILED` 로 전환. FAILED 수신 시 entry `status='qris_refund_failed'` (앱이 "남은 금액 다시 환불" UI 조건으로 사용).
- 앱 폴링: 환불 직후 status 가 `PENDING` 이면 `/admin/pos/orders/:id` 재조회 (metadata.returns 안 xendit.status) 로 확정 확인. 10s 간격 권장 (BC regenerate · status 폴링 훅과 동일 리듬).

## 보안

- apiKey · webhook_token · refund_id 값은 로그/에러 메시지에 노출 금지. BC 규약 유지.
- 모든 Xendit 호출은 unit test 에서 fetch mock / factory DI 로만 수행 — 실 Xendit API 호출 0.

## 이연 순증감

- Deferred 없음 (BA 계획서 §J-d 정상 종결).
- 남은 라운드 (M1-J-e · M3-J-f) 는 기존 상태 유지.

## 비고 / 후속

- **분할 결제 QRIS 환불**: 현재 `method='qris'` 는 단일 QRIS 결제 주문에만 적용. multi-tender 는 기존 cash fallback (S3 CASH-first) 유지. 후속 라운드에서 재검토.
- **A안 재시도 (decision-refund-failure-20261111)**: Webhook refund.failed 수신 시 entry status 를 `qris_refund_failed` 로 전환만 수행. 실제 "남은 금액 다시 환불" 재시도 flow 는 `/refund-retry` 확장이 필요 (본 라운드 범위 밖 · entry 에 플래그만).
- **spec v0 §6 자구 정정** (relay `docs/research/pos-payment-flows/meros-payment-flow-spec-v0.md`) 은 오케스트레이터 (T0) 가 처리.
