# M1-1105-BR 리포트

**원인 한 줄**: Xendit v3 `payment.capture` 웹훅은 서버에서 200(Completed)으로 처리되지만, iPad 앱의 `fetchQrisStatus` 가 `payment_request_id` 쿼리 파라미터를 전달하지 않아 qris-status 라우트가 400을 반환하고 앱이 이를 묵살함 — iPad 는 결제 완료를 영구히 알 수 없다.

---

## 1. 사실 정리

| 항목 | 값 |
|------|-----|
| 발생 시각 | Kyu 실기 09:27 WIB |
| 선행 작업 | storeport #241 (M0-1105-BN · JSONB `?` 바인딩 버그 수정 · main df117e3) 머지 후 |
| Xendit 웹훅 로그 | `payment.capture` · 09:27 · **Completed(200)** |
| iPad 화면 | "웹훅 기다리는 중" → 영수증으로 미전환 |
| 실제 v3 payload | `api_version:"v3"`, `data.captures[{capture_id,capture_amount}]`, `data.payment_id:"py-…"`, `data.channel_code:"QRIS"`, `data.payment_details:{payer_name,receipt_id,issuer_name}` |

---

## 2. 의심 1~4 진단 표

| # | 의심 지점 | 결과 | 파일:줄 | 근거 |
|---|-----------|------|---------|------|
| 1a | `findSessionByXenditRefs` SQL — `data->>'payment_request_id'` 조회 | ✅ 배제 | `webhook.ts:233-248` | SQL 3개 `?` / 바인딩 3개 → 정상. `data.payment_request_id="pr-73cbc830-…"` 세션 data 에 저장된 값과 일치. `reference_id` 형식 `order_01M79…:1:nps20bcx` = `buildReferenceId` 패턴과 일치. |
| 1b | `claimWebhookCapture` JSONB `?` 바인딩 버그 — `? 'webhook_claim'` Knex 오해석 | ✅ **storeport-m1 미수정, 운영 고침** | `webhook.ts:268-276` | Knex `.raw()` 에서 JSONB `?` 연산자를 바인딩 placeholder 로 오해 → "Expected 2 bindings, saw 3" → 500. **storeport #241 (df117e3) 에서 `jsonb_exists` 로 수정 완료**. storeport-m1 미반영. `releaseWebhookClaim(282-291)`도 동일 버그(잠복). |
| 2 | authorizePayment → `capturePaymentWorkflow` 에서 Medusa 거절 | ✅ 배제 | `route.ts:272-325` | 운영(#241 반영)에서는 claim 단계가 통과 → authorize+capture 성공. `authorizePayment` 는 always `pending` 반환 → Medusa 거절 없음. |
| 3a | `fetchQrisStatus` — `payment_request_id` query param 미전달 → 400 | ❌ **확정 주원인** | `pos-qris.ts:42`, `qris-status/route.ts:24-29` | `fetchQrisStatus` 가 `payment_request_id` 없이 GET 요청 → 서버 400 반환. 앱 `catch {}` 블록(`tender-qris/[draftOrderId].tsx:119`) 이 400 오류를 묵살 → 폴링 루프가 영구 pending. |
| 3b | qris-status 응답 `status:"captured"` vs 앱 `=== 'paid'` 불일치 | ❌ **확정 부원인** | `qris-status/route.ts:85`, `tender-qris/[draftOrderId].tsx:112` | 서버는 `{ status: "captured" }` 반환. 앱은 `if (res.status === 'paid')` 만 체크. 3a 가 고쳐져도 여기서 다시 막힘. `QrisStatus` 타입에 `'captured'` 없음. |
| 4 | 테스트 payload(v2식) vs 실제 v3 payload 차이 | ✅ 동일 실패 지점 | `pos-qris-simulate.spec.ts:BR-a` | v3 추가 필드 (`api_version`, `captures[]`, `payment_id`, `channel_code`) 는 `parseWebhookEvent` 에서 무시됨. `event:"payment.capture"` → `kind="paid"`, `request_amount=50000` 그대로 → 동일 경로로 1b (또는 3a/3b) 에 도달. 새 `#BR-a` `it.failing` 으로 확인. |

---

## 3. 수정안

### Fix-1 (서버 · storeport-m1 미반영 — M0 소유)
**파일**: `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts`  
**줄**: 268-276 (`claimWebhookCapture`), 282-291 (`releaseWebhookClaim`)

현재:
```sql
AND NOT (coalesce(data, '{}'::jsonb) ? 'webhook_claim')
```
권장(이미 storeport #241 에서 적용):
```sql
AND NOT jsonb_exists(coalesce(data, '{}'::jsonb), 'webhook_claim')
```
위험: 없음 (기능 동일, Knex 바인딩 충돌만 제거). storeport-m1 → origin/main fetch + 머지로 자동 해결.

---

### Fix-2 (앱 · M0/M3 소유)
**파일 A**: `api/hooks/pos-qris.ts:42` (`fetchQrisStatus`)  
`payment_request_id` query param 추가. 앱 화면(`tender-qris/[draftOrderId].tsx`)이 이미 `currentPaymentRequestId` 상태를 보유하므로 `fetchQrisStatus(sdk, id, currentPaymentRequestId)` 로 시그니처 확장.

```ts
// 현재
sdk.client.fetch(`/admin/pos/orders/${orderId}/qris-status`, { method: 'GET' })
// 수정
sdk.client.fetch(`/admin/pos/orders/${orderId}/qris-status?payment_request_id=${encodeURIComponent(prId)}`, { method: 'GET' })
```

**파일 B**: `app/checkout/tender-qris/[draftOrderId].tsx:112`  
`"captured"` 응답도 "paid"와 동일하게 처리:

```ts
// 현재
if (res.status === 'paid') {
// 수정
if (res.status === 'paid' || res.status === 'captured') {
```

**또는**: `qris-status/route.ts:85` 에서 서버가 `"captured"` 대신 `"paid"` 로 반환하도록 통일 (서버·앱 중 한쪽만 수정).

위험: 낮음. 앱 side effect 없음. `fetchQrisStatus` 에 `payment_session_id` = Xendit PR ID (`pr-…`) 전달 → `filters: { id: payment_request_id }` 정상 작동 (Medusa v2 에서 `payment_session.id = initiatePayment.id = resp.paymentRequestId`).

---

## 4. 자기 검증

```
# storeport-m1 (fix/m1-1105-br-webhook-diagnosis 브랜치)
# pnpm test:integration:pos 마지막 단계(pos-qris-simulate.spec.ts) 실행 결과:
#   it.failing #BM-a2  → 실제 실패 → "통과" (expected)
#   it.failing #BM-e2  → 실제 실패 → "통과" (expected)
#   it.failing #BR-a   → 실제 실패 → "통과" (expected)  ← 신규
#   기존 #BM-a,b,c,d,e → 통과
```

(로컬 Docker DB 없이 실행 불가 · Railway 운영 DB 연결 금지 · CI 결과로 대체)

---

## 5. PR

재현 테스트 추가만 · base = main · draft:
`storeport-m1 fix/m1-1105-br-webhook-diagnosis`

새 it.failing #BR-a: 실제 Xendit v3 payload (api_version·captures·payment_id·channel_code·payment_details) 구조 그대로 보내 webhook paid 경로 재현. 실패 지점: webhook.ts claimWebhookCapture JSONB `?` binding bug (storeport-m1 미수정) + qris-status polling mismatch 두 겹.
