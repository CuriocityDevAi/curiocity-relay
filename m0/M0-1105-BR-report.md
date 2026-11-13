# M0-1105-BR — 리포트

**원인 (한 줄):** 서버. `qris-status/route.ts` 가 Xendit `pr_...` 를 Medusa `payment_session.id` (`payses_...`) 로 오매치 → 항상 404 → 앱 4xx 3회 → "Can't check payment status".

## 의심 지점 표 (전부 확인)

| # | 가설 | 결과 |
|---|---|---|
| 1 | 앱이 보내는 payment_request_id 가 비어/다른 값 | **❌ 아님.** fork #130 8118936 이 tender 응답의 `payment_request_id` (서버가 `sData.payment_request_id` = Xendit `pr_...` 를 그대로 내려줌) 를 route param 으로 초기화 (`currentPaymentRequestId` state) · `?payment_request_id=` 쿼리로 정상 전송. undefined 문자열 가능성 X. |
| 2 | 서버가 payment_session.id 를 기대하는데 앱은 pr_... 전송 (닭과 달걀) | **✅ 이게 원인.** `qris-status/route.ts:63` `filters: { id: payment_request_id }` 는 payment_session.id (payses_... ULID) 를 기대. 앱이 보내는 Xendit `pr_...` 는 session.id 가 아니라 **`session.data.payment_request_id`** · 매치 0 → `sessionRow=null` → 404. 참고: simulate (M0-1105-BL) 는 똑같은 버그를 이미 경험하고 `findSessionByXenditRefs` (JSONB `data->>'payment_request_id' = ?`) 로 교체했는데 qris-status 만 미반영. webhook 도 JSONB 직조회 (`webhook.ts:233`). |
| 3 | 404 경로 (draft `order_...` vs order id) · 토큰 | **❌ 2가 먼저 hit.** 세션 조회 자체가 실패하므로 order_id 체크까지 가지도 못함. 401/403 아님 — 라우트 진입은 성공. |
| 4 | simulate 성공 여부 · 웹훅 수신 | Simulate 자체는 M0-1105-BL 에서 JSONB 로 고쳐져 성공 중 (통합 테스트 #BM-a 통과). Webhook 도 M0-1105-BN (df917f5) 에서 ? 바인딩 수정 후 정상 capture. 즉 **Simulate · 웹훅은 정상 · 유일한 미수정 지점이 qris-status**. BR-2 왕복 테스트로 재현. |

## 2. 서버 고침 (단일 교체)

`apps/commerce-core/src/api/admin/pos/orders/[id]/qris-status/route.ts`:

- `query.graph({ entity:"payment_session", filters: { id: payment_request_id } })` 제거.
- `findSessionByXenditRefs(pg, payment_request_id, "")` 로 교체 (simulate · webhook 과 동일 JSONB 경로).
- order_id mismatch 400 `payment_request_mismatch` 가드 추가 (simulate 과 동형).
- 세션 id 확보 후 2차 `query.graph` 로 `payment.captured_at` 당겨 captured 판정 유지.
- captured/expired/pending 응답 shape · 상태 코드 변경 없음.

## 3. 왕복 통합 테스트 신규 4건 (+ 기존 8건 모두 PASS)

`apps/commerce-core/integration-tests/pos/pos-qris-simulate.spec.ts`:

- `#BR-1` **tender → qris-status(?payment_request_id=`pr_...`) → 200 pending** · 회귀 가드. (BR 수정 이전 code 로는 404 로 떨어져야 하는 지점.)
- `#BR-2` 왕복 **tender → simulate → webhook paid → qris-status → 200 captured** · 실기 K3 전체 재현.
- `#BR-3` unknown pr_id → 404 not_found.
- `#BR-4` 다른 주문의 pr_id → 400 `payment_request_mismatch`.

로컬 run:

```
Tests: 12 passed, 12 total  (pos-qris-simulate.spec · 14.6s)
Tests: 89 passed, 89 total  (tenders.spec · 62s)
```

commerce-core typecheck clean.

## 3. 앱 (fork) 쪽

**수정 범위 없음.** fork #130 (8118936) 의 폴링/오류 가드는 올바르며, 서버가 404 를 안 돌려주면 자연 복구. `tender-qris/[draftOrderId].tsx:53` currentPaymentRequestId 초기값도 route param 으로 들어오므로 "닭과 달걀" 아님.

## PR

- **storeport #247** (draft · base main) — https://github.com/CuriocityDevAi/storeport/pull/247
- CI (pos-integration) 는 push 직후 **IN_PROGRESS**. 로컬 테스트 통과 로그는 위 참조.

## Processes

`commerce-core.pos-tenders-fulfill`
