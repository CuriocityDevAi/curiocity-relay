M0-1105-BT done — /refund-retry 에 mode (retry · cash_fallback) + 이중 환불 가드 (Guard1 pre-check · Guard2 webhook `succeeded_via_cash` 유지 · `dup_refund_alerts[]`) 추가 · 신규 7건 통합 테스트 + 기존 93건 회귀 PASS · draft PR #251 (base = feat/m0-1105-bs-qris-split-tender-status).

## 결과
- 커밋: `8c25795 feat(pos): QRIS × split tender R2 — /refund-retry mode 분기 (retry · cash_fallback) + 이중 환불 가드 (M0-1105-BT)`
- PR: https://github.com/CuriocityDevAi/storeport/pull/251 (**draft** · base=`feat/m0-1105-bs-qris-split-tender-status` · BS #248 머지 후 main 로 rebase)
- 워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1105-BT-wt`
- 브랜치: `feat/m0-1105-bt-qris-split-refund-retry`
- processes: `commerce-core.pos-tenders-fulfill` (apps/commerce-core/src/api/admin/pos/orders/**, _shared/**, integration-tests/pos/**) · `commerce-core.payment-providers` (apps/commerce-core/src/api/hooks/payment/xendit/**) — 기존 feature-map 커버리지 안에 들어감 (신규 pattern 추가 없음)

## 건드린 파일 (허용 범위)
- `apps/commerce-core/src/api/admin/pos/_shared/xendit-refund.ts` — TryXenditRefundInput 에 `nonce?` 추가 (reference_id 재사용 방지)
- `apps/commerce-core/src/api/admin/pos/orders/[id]/refund-retry/route.ts` — mode 분기 · QRIS tryXenditRefund 재호출 · cash_fallback + Cash Movement · 공용 persistAndRespond + loadQrisPaymentInfo
- `apps/commerce-core/src/api/hooks/payment/xendit/route.ts` — refund 블록만 (withOrderLock 감쌈 · Guard2 · dup_refund_alerts[])
- `apps/commerce-core/integration-tests/pos/refund-retry-qris.spec.ts` — 신규 7 건 (#BT-a ~ #BT-g)

tenders/route.ts · return/route.ts · tenders.spec.ts 는 수정 없음 (금지).

## REQ 매핑 (M0-1105-BT 1~6)
- REQ1 (mode 분기, 기본 retry 후방 호환) → `route.ts:179-188` body.mode 파싱 + 분기
- REQ2 (mode=retry QRIS retry, 새 reference_id, PENDING 409) → `route.ts:410-434` PENDING 409 가드 + `route.ts:476-523` tryXenditRefund 재호출 (`nonce=retry${N}`)
- REQ3 (mode=cash_fallback PIN · 대상/금액 · Cash Movement · succeeded_via_cash · open_drawer · cash_movement_id · receipt_kind) → `route.ts:200-371`
- REQ4 Guard1 (xendit.status===SUCCEEDED → 409) → `route.ts:259-280`
- REQ4 Guard2 (webhook SUCCEEDED 가 succeeded_via_cash 에 올라오면 r.status 유지 + dup_refund_alerts[]) → `hooks/payment/xendit/route.ts:744-777`
- REQ4 (withOrderLock 로 webhook refund 직렬화) → `hooks/payment/xendit/route.ts:708-713, 814` `withOrderLock(orderId, async () => ...)`
- REQ5 단일 QRIS 주문도 동일 — #BT-a/#BT-b/#BT-c/#BT-d/#BT-e 가 단일 QRIS 시드
- REQ6 (a~g 7건 통합 테스트) → `refund-retry-qris.spec.ts`

## R3 앱이 쓸 API shape
PR 본문 "R3 앱 소비 API 계약" 표 참조 (요청 body · 성공 응답 · 에러 코드 표 전부 명시).

## 자기 검증 (로컬)
- `npx tsc --noEmit -p apps/commerce-core` → **에러 0**
- `TEST_TYPE=integration:pos jest --testPathPattern='refund-retry-qris\.spec'` → **PASS · 7/7** (14.8s · 로컬)
  - #BT-a QRIS refund FAILED → mode=retry → SUCCEEDED (716ms)
  - #BT-b cash_fallback (PIN) → Cash Movement −금액 · succeeded_via_cash (1381ms)
  - #BT-c 늦은 SUCCEEDED → dup_refund_alerts 1건 (646ms)
  - #BT-d PENDING 중 retry → 409 xendit_refund_still_pending (745ms)
  - #BT-e PIN 누락 400 · 실패 QRIS 없음 400 (507ms)
  - #BT-f split CASH+QRIS QRIS 몫만 retry · CASH 영향 없음 (944ms)
  - #BT-g default mode CARD 승인번호 회귀 (849ms)
- `TEST_TYPE=integration:pos jest --testPathPattern='tenders\.spec'` → **PASS · 93/93** (64.5s · 회귀 clean · #74~#79 기존 refund-retry 테스트 유지)
- husky pre-push (apps/commerce-core unit test) → **PASS · 132/132** (4.35s)

## CI 상태
`gh pr checks 251` → **no checks reported** (의도). `.github/workflows/ci.yml:on.pull_request.branches=[main]` 이므로 base=BS 로 stacked 인 draft PR 는 CI 트리거 대상 아님. **BS #248 머지 → main 로 rebase 시 CI 자동 실행**. 그 전 QC 는 로컬 (위 통합 테스트 + unit) 로 완결.

## Kyu 실기
**없음** (R2 = 서버 단독). R3 앱이 배포된 뒤 §6-1 시나리오 7종으로 Kyu 수기 실기.

## 이연
순증감 = **0** (신설 커버만 추가 · 기존 이연 항목 영향 없음)
