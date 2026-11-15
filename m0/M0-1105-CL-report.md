# M0-1105-CL — 돈 버그 · 1차 QRIS paid 뒤 remaining 전액 노출 수정

**원인(파일:줄) · 수정 위치(서버/앱) · PR · 테스트**: `apps/commerce-core/src/api/admin/pos/orders/[id]/route.ts:196-205` 가 `paid_so_far` 를 구 경로(`payment_collections.payments.captures.raw_amount`)로 계산 → QRIS 비동기 웹훅 캡처가 reader-replica 전파 전까지 captures=[] → remaining=총액. 서버 쪽 GET 응답 교체 (SoT = `metadata.tenders[status=='captured']`) · PR #273 (draft) · 회귀 테스트 `integration-tests/pos/tenders.spec.ts#CL-a`.

## 원인 규명 (REQ #1)
- 앱이 참조하는 "Remaining (2nd payment)" 값의 서버 출처 = GET `/admin/pos/orders/:id` 응답의 `remaining` 필드 (top-level).
- 해당 라우트의 계산 (route.ts:193-205):
  - `paid_so_far = Σ payment_collections[*].payments[*].captures[*].raw_amount` (단, `canceled_at` null).
  - `remaining = max(0, total - paid_so_far)`.
- QRIS 결제는 비동기: tenders/route.ts:960-1065 (`isQris` short-circuit) 가 session 만 만들고 metadata.tenders 에 `status='pending'` append 후 pending 응답. 실제 capturePaymentWorkflow 는 `hooks/payment/xendit/route.ts:558-611` 웹훅에서 돈다.
- 핵심 포인트: 웹훅은 `orderModule.updateOrders` 로 `metadata.tenders[idx].status='captured'` 를 **동기** patch 함 (route.ts:572-598). 하지만 `payment_collections.payments.captures` 쪽은 Medusa 2 workflow 전파에 약간의 lag 가 있어, 바로 이어지는 앱의 GET 요청에서는 captures=[] 가 돌아올 수 있음.
- 같은 timing 문제로 tenders/route.ts:356-363 (Bug 2 수정) 는 이미 `metadata.tenders` 를 SoT 로 전환. GET 엔드포인트만 구 경로에 잔존 = 돈 버그.
- 1차 CASH 가 정상이었던 이유: cash/edc 는 tenders/route.ts 에서 동기 `capturePaymentWorkflow` 가 즉시 실행되어 captures 가 같은 트랜잭션에 반영.

**가설 3개 중 확정**: "서버가 1차 응답의 remaining 을 안 쓰고 총액을 다시 씀" 이 아니라 "서버 GET 의 remaining 계산이 pending/비동기 캡처를 못 봄" 이었다.

## 수정 (REQ #2)
- `apps/commerce-core/src/api/admin/pos/orders/[id]/route.ts` — `paid_so_far` 를 `metadata.tenders[status=='captured'].amount` 합산으로 교체. metadata.tenders 가 없는 레거시 주문만 구 captures 경로로 폴백 (후방 호환).
- 서버가 정답의 원천 유지 — 앱은 응답의 `remaining` 을 그대로 표시만 하면 됨 (별도 앱 수정 불필요).
- 2차 과수령 400 가드는 `tenders/route.ts:502-508` 에 이미 존재 (`split tender must close out (remaining=X, given=Y)`). 이번 버그에서 안 막힌 이유 = 가드는 `metadata.tenders` 기반이라 정상 동작하지만, **UX 단에서 틀린 remaining 을 보여줘 사용자가 틀린 숫자를 그대로 확정하도록 유도**했음. 즉 UI 입장에서는 전액을 입력해도 가드가 400 으로 끊지만, 손님에게 요구하는 금액이 틀리게 보이는 것 자체가 돈 버그. GET 수정으로 2차 UI 가 처음부터 53,400 을 보여주게 됨.

## REQ #3 — 1차 QRIS pending 중 2차 진입 차단
`tenders/route.ts:398-409` 가 `lastActive.method==='qris' && status!=='captured'` 일 때 409 `qris_pending_cannot_split_next` 로 거절. 테스트 `#BS-b` (tenders.spec.ts:5282) 로 이미 회귀 가드. **코드상 정상**. (앱 쪽에서 막는 경로가 추가로 있는지 여부는 fork 리포 범위라 이번에는 서버 가드 확인으로 종결 — 서버가 반드시 401/409 로 끊기 때문.)

## REQ #4 — 재발 방지 테스트
`integration-tests/pos/tenders.spec.ts` `#CL-a` 추가:
1. total 103,400 draft order (Kyu 실기 Order #105 재현)
2. 1차 QRIS 50,000 pending → `postPaidWebhook(prId, 50000)` → captured
3. GET `/admin/pos/orders/:id` → `paid_so_far==50000` · `remaining==53400`
4. 2차 CASH 103,400 요청 → **400 `split tender must close out`** (과수령 가드)
5. 2차 CASH 53,400 → `is_complete=true` · `receipt_id` truthy · `tender_sequence=2`

## REQ #5 — Order #105 데이터 보정 여부
수정 뒤 앱이 다시 열면 `metadata.tenders[0].status=='captured' · amount=50000` 이 이미 저장돼 있으므로 (웹훅이 patch 완료) `paid_so_far=50000 · remaining=53400` 이 즉시 반환. **운영 DB 보정 불필요** · 코드만 배포하면 해결.

## PR · CI
- PR: https://github.com/CuriocityDevAi/storeport/pull/273 (draft)
- 브랜치: `feat/m0-1105-cl-qris-split-remaining` (origin/main 분기 · 1 커밋)
- `gh pr checks 273` (리포트 시점):
  - changes-filter — **pending**
  - check — **pending**
  - markers-and-forbidden — **pending**
  - unit-commerce-core — **pending**
  - (integration-tests/pos 는 로컬 run 미검증 — 개별 pnpm test 는 real Postgres 세팅 요구 · CI 레인에서 검증. 로컬 `tsc --noEmit` 은 통과 · 기존 origin/main 의 `loyalty-info/route.ts:79` TS18046 는 본 PR 범위 밖 선행 에러)

## 이연 순증감
- 없음 (돈 버그 단건 · 즉시 수정 완료).

## 커밋
- `0be460c fix(pos): M0-1105-CL — 돈 버그 · 1차 QRIS paid 뒤 remaining 전액 노출 수정`
