# M0-1105-BI Report

## A. /refund ghost reservation (storeport #232 흡수)

### 원인

**파일**: `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts:258-291`

`refundPaymentWorkflow` 만 호출하고 `orderModule.cancel()` + `inventoryModule.deleteReservationItems()` 를 하지 않아 `order.status=pending + payment_status=refunded + reservation 잔류` 상태 (운영 Admin Order #81) 가 만들어졌다. Stock cleanup 의 stale 모드 (`status∈{completed,canceled} OR fulfillment_stage=hand_over`) 는 이 모양을 사각지대에 두었다.

### 수정

**1. `refund/route.ts`** (`apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts`)

- 라인 136–140: query.graph fields 에 `fulfillments.{id,canceled_at,shipped_at,delivered_at}` 추가.
- 라인 261–269: step 1 뒤 미출고 (shipped/delivered fulfillment 없음) 판정.
- 라인 302–353: step 1b 추가 — 미출고면 `orderModule.cancel(order_id)` + `listReservationItems(line_item_id)` → `deleteReservationItems(resIds)`. 출고된 주문은 `/return` 경로 소관이므로 분기 없이 기존 동작 유지 (task 의 "출고된 주문의 /refund 동작은 바꾸지 말 것" 조건 준수).

**2. `release-stale-reservations/route.ts`** (`apps/commerce-core/src/api/admin/pos/maintenance/release-stale-reservations/route.ts`)

- 라인 163–204: query.graph fields 에 `payment_status` 추가 · lineItemToOrder 에 저장 · Row 타입에 `payment_status: string | null` 추가.
- 라인 221: stale 조건에 `info.payment_status === "refunded"` OR 추가. 레거시 #81 모양 (BI 이전에 쌓인 refunded+pending+reservation) 을 Admin 이 정리할 수 있게 함.
- 응답 row 에 `payment_status` 노출 — 운영자가 식별 가능.

### #232 처리

#232 는 OPEN 상태 (아직 머지 X) — 이 PR 에 **흡수**. 테스트 파일 `apps/commerce-core/integration-tests/pos/refund-ghost-reservation.spec.ts` 를 `git checkout origin/test/m2-1105-bb-refund-ghost-reservation -- <path>` 로 가져와 `it.failing` 2개 (`#BB-refund`, `#BB-stale`) 를 일반 `it` 로 반전.

- `#BB-refund`: `/refund` 전액 뒤 `order.status === "canceled" + reserved === 0 + available === initial_stock` (코드 수정 기대값).
- `#BB-stale`: 레거시 #81 모양 (refundPaymentWorkflow 만 호출해 재현) 이 stale 후보에 뜨고, row.payment_status === 'refunded' 로 식별 가능한지 검증.

머지 후 #232 는 head 브랜치 공유로 closed (gh pr close) · body 는 "흡수: M0-1105-BI #<번호>" 로 간결 교체.

### 테스트 반전 로그 (unit 레벨)

```
$ pnpm test
Test Suites: 9 passed, 9 total
Tests:       107 passed, 107 total
```

- 기존 unit 101 + BI 신규 Xendit 공식 payload 테스트 6.
- 통합 테스트 (`integration-tests/pos/refund-ghost-reservation.spec.ts`) 는 실 Postgres + Medusa boot 필요 → PR CI 가 실기. 로컬 unit CI 는 통과 (단, it.failing 반전 직후 코드 수정 없이 테스트만 돌리면 #BB-refund 가 fail — unit CI 에서는 커버 X 이므로 이상 無).

## B. Xendit 대시보드 webhook (V2 Payment Requests + Unified Refunds BETA)

### 사실 (Xendit payments-api-webhooks 공식 docs)

출처 (WebFetch 결과):
- `https://docs.xendit.co/apidocs/payment-webhook-notification` (Payment Request v3 webhook)
- `https://docs.xendit.co/apidocs/refund-webhook-notification` (Refund webhook)
- `https://docs.xendit.co/docs/payments-api-webhooks` (이벤트 enum)

Dashboard 의 "PAYMENT REQUESTS V2" 섹션은 **/v3/payment_requests** 가 생성한 Payment Request 의 결제·실패·만료 webhook 을 함께 수신 (버전 네이밍이 섹션명 과 API 버전 사이에 어긋나 있지만 라우팅은 같은 URL 로 통합).

### 이벤트 대응표 (parseWebhookEvent 매핑)

| Xendit 이벤트 (공식) | Dashboard 섹션/항목 | data.status | 우리 kind | 비고 |
|---|---|---|---|---|
| `payment.capture` | Payment Requests V2 · Payment Succeeded | SUCCEEDED | `paid` | QRIS 1-step capture · 신규 매칭 (M0-1105-BI) |
| `payment.failure` | Payment Requests V2 · Payment Failed | FAILED | `failed` | 신규 매칭 (M0-1105-BI) |
| `payment.expiry` | Payment Requests V2 · (Authorization 전용) | EXPIRED | `expired` | 2-step (카드) · QRIS 는 안 씀 |
| `payment_request.expiry` | Payment Requests V2 · (QR 만료) | EXPIRED | `expired` | QR 자체 만료 · 신규 매칭 (M0-1105-BI) |
| `payment.authorization` | Payment Requests V2 · Awaiting Capture | AUTHORIZED | `unknown` (현재 미사용) | 카드 2-step · QRIS 안 씀 |
| `refund.succeeded` | Unified Refunds (BETA) · Refund request succeeded | SUCCEEDED | `refund_succeeded` | 이미 매칭 (BD 라운드) |
| `refund.failed` | Unified Refunds (BETA) · Refund request failed | FAILED | `refund_failed` | 이미 매칭 (BD 라운드) |

**비공식/레거시 이름** (혹여 들어와도 수용): `payment.succeeded` · `payment.failed` · `payment.expired` · `payment_request.paid` · `payment_request.expired` · `payment_request.failed` · `status:SUCCEEDED/PAID` · `status:FAILED/CANCELED` · `status:EXPIRED`.

### 코드 수정

**`apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts`**:

- 라인 2–28 docstring: Xendit 공식 payments-api-webhooks 를 근거로 이벤트 이름 명시 (payment.capture · payment.failure · payment.expiry · payment_request.expiry · refund.succeeded · refund.failed).
- 라인 17: `XenditWebhookEvent.data.payment_id?: string` 타입 추가 (Unified Refunds payload 가 `payment_request_id` 없이 `payment_id` 를 가짐).
- 라인 134–162: `parseWebhookEvent` 이벤트명 매칭에 공식 이름 1차 추가:
  - `payment.capture` → paid
  - `payment.failure` → failed
  - `payment.expiry` · `payment_request.expiry` → expired

**단위 테스트 추가** (`qris-xendit.unit.spec.ts` 내 `M0-1105-BI · Xendit v3 공식 이벤트명` describe):

1. `payment.capture` → paid (QRIS 공식 payload)
2. `payment.failure` → failed
3. `payment_request.expiry` → expired (QR 자체 만료)
4. `payment.expiry` → expired (카드 authorize 후 만료)
5. `refund.succeeded` (Xendit 공식 샘플 그대로 · `payment_id` 만 가짐) → refund_succeeded + refundId 추출
6. `refund.failed` → refund_failed + failure_code 보존

전체 unit 107/107 PASS.

### Kyu 가 대시보드에서 채울 칸 (최종)

Xendit Dashboard · Settings · Developers · Webhooks (Test Mode 와 Live Mode 각각 동일):

- **섹션: "PAYMENT REQUESTS V2 (/v2/payment_requests)"** — 아래 4개 체크:
  - ✅ **Payment Succeeded** (payment.capture · QRIS 결제 완료)
  - ✅ **Payment Failed** (payment.failure · 결제 실패)
  - ✅ **Payment Request Expired** (payment_request.expiry · QR 만료)
  - ☐ Awaiting Capture (payment.authorization · 카드 2-step — 현재 미사용, 추후 카드 도입 시 체크)

- **섹션: "Unified Refunds (BETA)"** — 아래 2개 체크:
  - ✅ **Refund request succeeded** (refund.succeeded)
  - ✅ **Refund request failed** (refund.failed)

- **WebHook URL (양 섹션 공통)**: `https://<storeport host>/hooks/payment/xendit`
- **x-callback-token**: 현재 운영에 설정된 값 그대로 (env `XENDIT_WEBHOOK_TOKEN`).

Test Mode 와 Live Mode 가 분리된 설정이므로 두 모드 모두에서 위 체크를 반복.

## PR · CI

- 브랜치: `fix/m0-1105-bi-refund-ghost-xendit-webhook` (main 055f1c3 기반 · #229 #230 #231 포함)
- PR: https://github.com/CuriocityDevAi/storeport/pull/234
- CI runs (push 뒤 신규):
  - feature-map-check: https://github.com/CuriocityDevAi/storeport/actions/runs/43253544061
  - ci: https://github.com/CuriocityDevAi/storeport/actions/runs/43253544418
- 로컬 unit: 107/107 PASS · typecheck PASS · naming-check PASS
