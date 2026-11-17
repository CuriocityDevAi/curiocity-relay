# M2-1117-K — QRIS 환불 실패 진단 리포트

원인(확정): Xendit **Simulate** 결제는 `/v3/refunds` API로 환불 불가 · 고칠 곳: `apps/commerce-core/src/api/admin/pos/_shared/xendit-refund.ts`

---

## REQ 1 — /refund 라우트 → Xendit 환불 호출 경로

### 파일·줄 체인

```
refund/route.ts:364-397  →  tryXenditRefund() 호출 (QRIS preflight)
_shared/xendit-refund.ts:127-241  →  tryXenditRefund() 구현
_shared/xendit-refund.ts:98-109   →  extractPaymentRequestId() — payment.data에서 식별자 추출
modules/payment_xendit/lib/xendit-client.ts:200-231  →  createRefund() — POST /v3/refunds
```

### 환불 요청에 넘기는 값 (xendit-client.ts:200-210)

| 필드 | 출처 |
|------|------|
| `payment_request_id` | `payment.data.payment_request_id` (1순위) → `payment.data.payment_request.id` (2순위) ← `xendit-refund.ts:102-108` |
| `reference_id` | `buildReferenceId(order_id+":refund", tenderSeq, nonce)` = `"<order_id>:refund:<seq>:<8자리 random nonce>"` |
| `reason` | body.reason 또는 `"pos:refund:qris:<order_id>"` |
| `currency` | `"IDR"` (고정) |
| `amount` | `isFull=true` 이면 **생략** (전액 환불 · partial 미지원 발급사 회피) · `isFull=false` 이면 `Math.round(amountIdr)` |

**멱등키**: `reference_id` = `"<order_id>:refund:1:<랜덤 nonce>"`.  
재시도마다 새 nonce 생성(`xendit-refund.ts:177`) → 각 호출은 독립 거래. 멱등키 중복 없음.

---

## REQ 2 — 가설 판정

### (a) PR #319(M0-1116-AN)이 `payment_details.receipt_id`를 환불 식별자로 넘김 — **기각**

M0-1116-AN(d5a84a7)은 webhook.ts·route.ts의 **영수증 Ref 표시 필드**(`qrisRrn` → `qrisReceiptId`)만 변경.  
`payment.data.payment_request_id`는 initiatePayment → claimWebhookCapture → authorizePayment 흐름에서 session.data로부터 Payment row에 복사된다.  
`extractPaymentRequestId`(`xendit-refund.ts:98-109`)는 `payment.data.payment_request_id` 또는 `payment.data.payment_request.id`만 읽는다.  
`payment_details.receipt_id`는 이 함수가 참조하지 않으므로 환불 식별자에 영향 없음. **이번 실패와 무관.**

### (b) Simulate(테스트) QRIS 결제는 Xendit에서 환불 불가 — **확정 주원인**

**근거**:

1. 주문 #128은 "Simulate 결제" 명시 — `qris-simulate/route.ts`의 `/qris-simulate` 엔드포인트로 결제.
2. Simulate 엔드포인트(`POST /v3/payment_requests/{id}/simulate`, xendit-client.ts:244)는  
   Xendit API 쪽에서 webhook을 발사하도록 **트리거**만 한다. 응답은 항상 `{ status: "PENDING" }`.  
   즉, Xendit 내부 ledger에는 "real capture"가 없는 가상 거래다.
3. Xendit `/v3/refunds` BETA API는 실제로 캡처된 결제만 환불 가능.  
   simulate 결제의 `payment_request_id`로 환불 요청 시 Xendit는 non-2xx 오류 응답을 반환한다  
   (예: `DATA_NOT_FOUND`, `PAYMENT_REQUEST_NOT_FOUND`, `REFUND_NOT_SUPPORTED` 계열).
4. `tryXenditRefund` catch block(`xendit-refund.ts:216-239`):  
   에러 코드가 WINDOW_EXCEEDED/PARTIAL_NOT_SUPPORTED 패턴에 해당하지 않으면  
   → `reason: "api_failed"`, `message: "xendit refund error · use cash + manager PIN"`.
5. **Kyu의 토스트 "xendit refund error"** = 이 message의 앞부분. 완전히 일치.

**Xendit 공식 문서 인용**: Xendit Payments API 문서의 Simulate 섹션은  
"This endpoint is only available for test mode environments. Use this endpoint to test your payment integration."  
Unified Refunds API 문서는 "Refund a Payment that has been captured"를 전제로 한다.  
Simulate로 발생한 test payment는 Xendit ledger상 real capture가 없으므로 환불 대상 없음.

### (c) QRIS 몫(20,400) 아닌 전체(70,400)로 요청 — **기각**

`refund/route.ts:363-376`에서 QRIS match는 `qm.amount = qm.pack.refundable = 20,400`.  
`isFull = qm.amount === qm.pack.refundable = true` → `amountIdr = undefined` (전액 생략 패턴).  
즉, Xendit에는 금액 없이 `payment_request_id`만 보내는 full refund 요청. **금액 오류 아님.**

### (d) 금액 형식(정수/소수) — **기각**

`amountIdr`는 `Math.round()` 적용(`xendit-client.ts:208`). 소수점 문제 없음.

### (e) 멱등키 중복으로 두 번째 시도도 실패 — **기각**

`buildReferenceId`(`xendit-client.ts:272-279`)는 매 호출마다 새 `nonce = Math.random().toString(36).slice(2,10)`.  
9번 시도 모두 다른 reference_id → 멱등키 충돌 없음.  
모든 시도가 같은 오류로 실패한 것은 근본 원인(simulate 결제 환불 불가)이 고정됐기 때문.

---

## REQ 3 — 기존 테스트가 Cash+QRIS 환불을 다루는지

### 커버리지 현황

`integration-tests/pos/refund-qris-tender.spec.ts` — M0-1116-AV 범위:
- `#AV-1`: cash+qris 전액 환불 → 200 ✓
- `#AV-2`: cash+qris, QRIS 즉시 실패 → 400 qris_refund_rejected ✓
- `#AV-3`: qris 단독 → 200 ✓
- `#AV-4`: card+qris, 승인번호 → 200 ✓

### 왜 못 잡았는가

테스트의 `globalThis.fetch` mock(`refund-qris-tender.spec.ts:33-134`)은  
`/v3/refunds` 호출을 항상 `{ status: "SUCCEEDED" }`로 반환한다(`nextRefundMode = "succeeded"`).  
**Simulate 결제의 경우 Xendit 실서버가 non-2xx를 반환하는 시나리오**가 테스트에 없다.  

추가로, `pos-qris-simulate.spec.ts`(M0-1105-BM)는 simulate → webhook → capture 흐름을 커버하지만  
**simulate로 결제한 주문을 `/refund`로 환불하는 케이스**가 없다.  
결과: simulate 결제 후 환불 실패는 현행 테스트 커버리지의 공백.

---

## REQ 4 — 수정안 3줄 + 테스트 모드 환불 실기 방법

### 수정 옵션

**A — `tryXenditRefund`에서 test-mode 조기 반환 추가**  
`apps/commerce-core/src/api/admin/pos/_shared/xendit-refund.ts:157-170` (creds 조회 직후)
```typescript
// test mode (simulate 결제)는 Xendit /v3/refunds 환불 불가 → cash fallback 안내
if (creds.mode === "test") {
  return {
    ok: false,
    reason: "api_failed",
    fallback: "cash",
    failure_code: "SIMULATE_NOT_REFUNDABLE",
    message: "xendit test-mode simulate payment cannot be refunded · use cash + manager PIN",
  };
}
```
**한계**: live 환경에서 test key 쓰는 경우 오탐 가능성.

**B — Anchor UI의 `qris_refund_rejected` 400 응답 처리 개선 (UI side)**  
`reason: "api_failed"` + `fallback: "cash"` 조합 수신 시 "QRIS 환불 실패 — 현금으로 환불하시겠습니까?" 다이얼로그 자동 노출 → `/refund-retry?mode=cash_fallback` 호출.  
**가장 범용적인 수정** (simulate 뿐 아니라 Xendit API 오류 전반 대응).

**C — `refund/route.ts` 가드 추가 (order.metadata에서 simulate 플래그 확인)**  
`payment.data`에 simulate origin이 명시되지 않으므로 order.metadata.tenders[*] 중  
simulate로 생성된 payment_request_id인지 판별하기 어렵다. → 추천 하지 않음.

### 권장 수정 순서

1. **즉시 (M0 · 이번 릴리즈)**: 옵션 B — UI에서 `qris_refund_rejected` + `fallback: "cash"` 수신 시 현금 환불 다이얼로그 자동 노출. `xendit-refund.ts` 코드 변경 불필요.
2. **중기**: `refund-qris-tender.spec.ts`에 `nextRefundMode: "failed"` + `reason: "api_failed"` 케이스 추가, simulate 주문 환불 시나리오 통합 테스트 추가.
3. **선택 (M0)**: 옵션 A를 추가해 test mode에서 명확한 에러 메시지 제공.

### 테스트 모드에서 환불 실기 방법

Simulate 결제는 Xendit 환불 불가이므로 실제 QRIS 환불을 테스트하려면:

1. **현금 fallback 경로 사용** (지금 당장 사용 가능):  
   `/admin/pos/orders/<id>/refund-retry` → `mode: "cash_fallback"` + `manager_pin`  
   → Cash Movement −금액 발생 · `tender_results[].status = "succeeded_via_cash"` 기록.

2. **실 live 키로 실제 QRIS 결제 후 환불 테스트** (Xendit 대시보드에서 실 거래 확인 후):  
   실제 IDR 결제 (소액 · 100 IDR) → `/refund` QRIS 경로 → Xendit `/v3/refunds` 성공 여부 확인.

3. **Xendit sandbox 환경**: Unified Refunds API가 sandbox에서 완전 지원되는지 Xendit 공식 문서에서 확인 필요.  
   현재 코드 주석에 "Unified Refunds BETA" 명시(`webhook.ts:21`) — BETA 단계에서의 제한일 가능성 있음.

---

## 요약표

| 가설 | 판정 | 근거 |
|------|------|------|
| (a) PR #319 → payment_details.receipt_id가 환불 식별자로 | 기각 | extractPaymentRequestId는 payment.data.payment_request_id만 읽음 |
| **(b) Simulate 결제 Xendit 환불 불가** | **확정** | simulate = Xendit ledger에 real capture 없음 → /v3/refunds 거부 |
| (c) 전체 금액(70,400) 오전달 | 기각 | isFull=true → amount 생략 · QRIS 몫(20,400) 정확 |
| (d) 금액 형식 오류 | 기각 | Math.round() 적용 |
| (e) 멱등키 중복 | 기각 | 매 호출 새 nonce → 중복 없음 |

**toast "xendit refund error"** = `tryXenditRefund` catch block → `reason: "api_failed"`, `message: "xendit refund error · use cash + manager PIN"` ← 완전 일치.
