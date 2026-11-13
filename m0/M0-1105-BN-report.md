# M0-1105-BN — QRIS webhook paid 처리 복구 (DONE · merge 보류)

**원인 (1줄)**: Knex 가 raw SQL 의 JSONB `?` 연산자를 positional binding 으로 오해 → `claimWebhookCapture` UPDATE 가 `Expected 2 bindings, saw 3` 로 500. 1차 버그 수정 후 **동반 버그 2개** 노출 (셋 모두 QRIS 결제 완료 경로 blocker).

## 수정 방식

1. **webhook.ts JSONB `?` → `jsonb_exists`** (REQ1 · 티켓 권장안). `claimWebhookCapture` / `releaseWebhookClaim` 의 `NOT (... ? 'key')` 를 `NOT jsonb_exists(..., 'key')` 함수 형태로 치환 (Postgres 9.4+ 에서 `?` 연산자와 동일 의미, `?` 없는 형태로 바인딩 혼선 뿌리 차단). CAS 멱등 의미 (M0-1105-BE REQ1) 보존.
2. **xendit-qris-provider.authorizePayment** (스코프 확장 1). 하드코딩 `"pending"` → Medusa payment-module 이 AUTHORIZED/CAPTURED/PENDING_AUTHORIZATION 가 아니면 `"was not authorized"` throw. `data.webhook_claim` 존재로 분기 — webhook 경로는 `CAPTURED`, tenders 선제 authorize 경로는 `PENDING_AUTHORIZATION` (no-op · tenders QRIS short-circuit 호환).
3. **webhook route · order 역추적 쿼리** (스코프 확장 2). `filters: { payment_collections: { id } }` → "Trying to query by not existing property Order.payment_collections" throw (non-fatal catch 로 삼켜져 receipt_id=null). `entity: "order_payment_collection"` 링크 엔티티 직접 조회 (qris-regenerate · repair-dangling-payment-links 와 동일 패턴) 로 교체.
4. **테스트 전환**: pos-qris-simulate.spec.ts #BM-a2 · #BM-e2 `it.failing` → `it` + unit fake pg regex `jsonb_exists` 반영.

## 테스트 요약

- commerce-core unit: **132/132 pass** (11 suites)
- integration:pos: **118/118 pass** (5 specs: tenders 89 + pos-tax-lines 7 + p6-e2e 10 + refund-ghost-reservation 5 + pos-qris-simulate 7)
- commerce-core typecheck: **0 errors**
- wing typecheck: pre-existing React 19 button.tsx 실패 — origin/main 동일 (본 PR 변경 무관)

## CI run

- PR: https://github.com/CuriocityDevAi/storeport/pull/241
- head SHA: `f200606`
- CI 체크 전부 녹색: markers-and-forbidden · check · changes-filter · unit-commerce-core · **pos-integration** SUCCESS. docker-smoke · wrangler-check SKIPPED (해당 경로 touch 0).

## merge 상태

**머지 보류** (티켓 "결제 PR 이라 Kyu "머지해" 필요"). Kyu 승인 대기.

## 미완 항목

없음 (REQ1·REQ2·REQ3 전부 충족 · 1차 버그 scope 초과분 2건은 PR 본문 "기술 선택지 · 채택 · 이유 3줄" 에 기록).
