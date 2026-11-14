# M0-1105-BV — #248 R0 CHANGES REQ3 완료 · 영수증 중복·초과 결제 차단 (expired QRIS late-paid webhook)

## 결과 한 줄
- storeport #248 (feat/m0-1105-bs-qris-split-tender-status) head SHA = `b76eb0f` · BT 브랜치 (`feat/m0-1105-bt-qris-split-refund-retry`) rebase 성공 · force-with-lease push (`8c25795 → fd375ce`) · 충돌 없음.

## 사실 재확인 (R0-1105-DZ REQ3 시나리오)
1차 QRIS 50k pending → expired webhook → 2차 CASH 100k 로 영수증 발행 완결 → 뒤늦게 Xendit 가 같은 `payment_request_id` 로 paid 를 발사. 기존 코드는:
- `paid` 블록 matchIdx 가 **expired entry 를 captured 로 소생**시켜
- capturedSum 150k ≥ grandTotal 100k 로 `is_order_complete` 재진입
- `createReceiptForOrder` 재호출 = **영수증 중복** · 손님 실제 **초과 결제**

추가 발견: 2차 CASH tender 가 `tenders/route.ts §859` 의 **payment_collection 재사용** 경로를 통과하면서 Medusa `createPaymentSessionsWorkflow` 가 기존 QRIS 세션을 **soft-delete** 한다 (core-flows: "Note: We are deleting an existing active session before creating a new one for a payment collection"). → 뒤늦은 paid 수신 시 `findSessionByXenditRefs` 가 `null` 을 돌려주고 기존 BC/BE 멱등 가드는 전부 우회된다.

## 구현 (B안 · 허브 결정 decision-qris-split-refund-20261113)

### 1. `apps/commerce-core/src/api/hooks/payment/xendit/route.ts` (paid 블록 전체 재배치)
- **session 삭제 분기 (sessionRow=null)**: `parsed.kind==="paid"` 이면 새 helper `findOrderByTenderPaymentRequestId(pg, paymentRequestId)` 로 `order.metadata.tenders[*].payment_request_id` 를 JSONB containment 매칭해 주문을 직조회. 매칭된 tender 가 `expired`/`failed` 거나 주문이 이미 `receipt_id` 를 가지면 → `late-paid` 로 응답 + `order.metadata.late_paid_alerts[]` append. **자동 환불 금지 · 사람이 수동 환불** (경고 로그 남김).
- **session 존재 분기**:
  - `webhook_completed_at` 세션 레벨 **멱등 선행 가드** — 같은 session 에 대한 webhook 이 이미 1회 처리됐으면 `{ok:true, idempotent:true}` 로 조용히 삼킴 (Xendit 재전송 폭주 방지).
  - 그 뒤 **late-paid detect** (`graphSession.payment_collection.id` 기반 · 매칭 tender status / receipt 존재 여부 판정) 로 처리 → `markWebhookCompleted` 로 재진입 차단.
  - 그 뒤 **payment-level `alreadyCaptured`** 가드 (`paymentRow.captured_at` 만). 범위를 좁힌 이유 = QRIS session 과 cash session 이 같은 collection 을 공유할 수 있어 `collectionPayments.some(captures)` 가 교차 오판을 유발하기 때문 (위 soft-delete 경로의 부작용).
- **방어 2중 (is_order_complete 지점)**: `order.metadata.receipt_id` 가 있으면 `createReceiptForOrder` 재호출 skip · `capturedSum > grandTotal` 이면 자동 환불 하지 않고 경보만.

### 2. `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts`
- `findOrderByTenderPaymentRequestId(pg, paymentRequestId)` 추가. `metadata @> '{"tenders":[{"payment_request_id":...}]}'::jsonb` + `LIMIT 2`. 기존 `findOrderByXenditRefundRef` 와 동일한 JSONB containment 패턴 (전체 테이블 스캔 회피 — R0-1105-CS REQ2 준수).

### 3. `apps/commerce-core/integration-tests/pos/tenders.spec.ts`
- `#BV-a 1차 QRIS expired → 2차 CASH 전액 완결 → 뒤늦은 paid webhook → 영수증 1매 유지 · late_paid_alerts 1건` — 재현 시나리오 end-to-end. 최종 assert: `tenders[0].status="expired"`, `tenders[1].method="cash"&status="captured"`, `metadata.receipt_id` 변동 없음, `late_paid_alerts` 길이 1, alert 에 `payment_request_id/amount/at/tender_idx` 전부 persist.
- `#BV-b 같은 late-paid webhook 재전송 → alert 1건 유지 (멱등)` — 2회차는 `alert_added=false` + `idempotent=true` 응답 · `late_paid_alerts` 여전히 1건.

## 자기 검증 (로컬 + CI)

### 로컬 `pnpm --filter commerce-core test:integration:pos`
- `integration-tests/pos/tenders.spec.ts` — **95/95 PASS** (BS-a..d + BV-a/BV-b 포함 · 58.5s).
- `integration-tests/pos/pos-tax-lines.spec.ts` — 9/9 PASS.
- `integration-tests/pos/p6-e2e.spec.ts` — 10/10 PASS.
- `integration-tests/pos/refund-ghost-reservation.spec.ts` — 5/5 PASS.
- `integration-tests/pos/pos-qris-simulate.spec.ts` — 12/12 PASS.
- `integration-tests/pos/refund-receipt-kind.spec.ts` — 4/4 PASS.
- **합계 135/135 PASS**.

### Typecheck
- `pnpm --filter commerce-core typecheck` → 에러 0.
- BT 브랜치 rebase 후에도 `pnpm --filter commerce-core typecheck` 에러 0.

### PR #248 CI (run `43558092283` · 커밋 `b76eb0f`)
- `changes-filter` ✓ pass 11s
- `check` ✓ pass 11s
- `markers-and-forbidden` ✓ pass 7s
- `unit-commerce-core` ✓ pass 52s (unit · pre-commit 로도 11/11, 132/132 PASS 실측)
- `pos-integration` ✓ pass 4m16s
- docker-smoke-* · wrangler-check-care-agent = skipping (관련 경로 미변경 · changes-filter 판정)

## BT rebase 결과
- `git rebase origin/feat/m0-1105-bs-qris-split-tender-status` → 1 커밋 clean rebase (`8c25795 → fd375ce`).
- 충돌 없음 (BT 는 `/refund-retry` route 와 `return/route.ts` 만 건드렸고 BV 는 `/hooks/payment/xendit/route.ts` + webhook.ts 만 건드려 교집합 0).
- `pnpm --filter commerce-core typecheck` → 에러 0.
- `git push --force-with-lease origin feat/m0-1105-bt-qris-split-refund-retry` → 성공 (pre-push hook: 11/11 suites, 132/132 unit tests PASS).

## naming-check
- `bash scripts/naming-check.sh` → ✓ PASS (meros 매치 0 · 모듈명 규격 정합).
