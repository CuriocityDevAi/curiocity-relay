# M0-1105-AL — 환불 안전장치 (부분 실패 되돌리기 · 나눠 결제 환불 분배)

## 변경 요약
- `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts`
  - `refundableCap` (originPayment 1개 기반) → `totalRefundable` (allPaymentPacks 합계). line share 가 origin cap 을 넘어도 S3 CASH-first 로 다른 수단에 재분배 (이연 #68).
  - 2-phase 환불 집행: Phase 1 pre-plan (no side-effects) · Phase 2 execute. 2 번째 이후 refundPaymentWorkflow 실패 시 `order.metadata.refund_partial_failures` 마커 persist + **500 refund_partial_failure** 명시 (조용한 부분 환불 금지 · R0-1105-BI 이연).
  - 테스트 전용 refund 실패 주입 훅: `NODE_ENV=test` 가드 + `order.metadata.__test_fail_refund_after` (opt-in · 운영 경로 도달 불가).
- `apps/commerce-core/integration-tests/pos/tenders.spec.ts`
  - `#68 [M0-1105-AJ S3 · M0-1105-AL]` un-skip · cross-tender 재분배 · CASH-first (Bug 2 회귀).
  - `#68b [M0-1105-AL S3]` 신규 · 환불 중간 실패 → 500 + 마커 persist (Bug 1 회귀).

## 기술 선택지 · 채택 · 이유
- **A (DB 트랜잭션 롤백)** — Medusa v2 워크플로우는 독립 트랜잭션·바깥 공유 보상 미지원. **기각**.
- **B ("un-refund" 보상)** — `refundPaymentWorkflow` 는 비가역 (capture row 역상쇄 API 부재). **기각**.
- **C (채택) — pre-plan + loud 500 + 마커 persist** — 사전 검증으로 mid-stream 실패 거의 소거하고, 극단 상황은 명시적 500 + 원장으로 수동 재조정. 지시서 "오류는 호출자에게 명시적으로 올리고 조용한 부분 환불 금지" 와 정합.

## 테스트 · CI
- `pnpm --filter commerce-core typecheck` — 0 err.
- `pnpm --filter commerce-core test:integration:pos` 로컬 2 회 전수 pass.
  - Run 1 — `Tests: 77 passed, 77 total · Time: 56.518 s` (`/tmp/M0-1105-AL-logs/run1.log` tail 참조)
  - Run 2 — `Tests: 77 passed, 77 total · Time: 55.685 s` (`/tmp/M0-1105-AL-logs/run2.log` tail 참조)
- `bash scripts/naming-check.sh` — PASS.

### 어설션 파일 (기계 판정 가능)
- `return/route.ts` refundableCap → totalRefundable 치환: `git diff origin/main..HEAD -- '*return/route.ts' | grep -c 'totalRefundable'` ≥ 3.
- Phase 1 pre-plan + Phase 2 execute 블록 존재: `grep -c "Phase 1 · pre-plan\|Phase 2 · execute" apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts` = 2.
- `#68` un-skip: `grep "it.skip.*#68" apps/commerce-core/integration-tests/pos/tenders.spec.ts` = 0.
- 회귀 테스트 추가: `grep -c "#68b\|#68 \[M0-1105-AJ S3" apps/commerce-core/integration-tests/pos/tenders.spec.ts` ≥ 2.

## PR
- **PR #214** · https://github.com/CuriocityDevAi/storeport/pull/214
- Head: `feat/m0-1105-al-refund-safety` (commit `b79e817`).
- **Base: `main`**. #212 가 본 PR 준비 중 main 으로 merge (SHA `c1148df`) → 지시서의 "stacked on #212 — retarget to main after #212 merges" 조항 충족해 base 를 main 으로 올림. PR 본문 상단에 명시.

## 이연 순증감
- 소진 2 건:
  - `R0-1105-BI` "multi-payment refund 부분 실패 무롤백" (Bug 1 · 500 + 마커 persist · 조용한 부분 환불 금지).
  - `M0-1105-AK` "#68 refundableCap single-payment · cross-tender 재분배 부재" (Bug 2 · un-skip 통과).
- 신규 이연 0.

## 워크트리 위생 노트 (사용자 확인 요청)
- 작업 중 `/Users/kyu.lee/projects/storeport` 워크트리의 브랜치가 다른 세션에 의해 `fix/m1-1105-as-void-fulfillment` 로 전환되고 `void/route.ts` 미커밋 변경이 추가됐음을 관찰. 내 작업은 격리 유지 위해 `/tmp/M0-1105-AL-wt` 에 origin/main 기반 별도 worktree 로 분리 후 커밋·push. 원 워크트리의 `void/route.ts` 미커밋 변경은 손대지 않음.
