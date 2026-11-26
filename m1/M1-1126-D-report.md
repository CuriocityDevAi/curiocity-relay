APPROVE — cherry-pick 성공, PR #450 충돌 해소, CI 시작됨

## PR
- URL: https://github.com/CuriocityDevAi/storeport/pull/450
- branch: `feat/M1-1126-B-cd-order-list-font-scale`
- changed_files: **1** (`apps/customer-display/src/screens/OrderListScreen.tsx`)
- mergeable: **MERGEABLE** (기존 CONFLICTING → 해소)
- mergeStateStatus: UNSTABLE (CI 진행 중)

## 작업 내용
- origin/main (4a67be3) 기반 임시 브랜치 생성
- commit `8d4da32` cherry-pick → 충돌 없이 성공
  - items 32px→22px, TOTAL 64px→45px, qtyBadge 비례 축소
  - Subtotal/PB1 24px 그대로 유지
- `feat/M1-1126-B-cd-order-list-font-scale` force-push (8d4da32 → 372444d)
- 기존 18파일 +3276 → 1파일 16변경으로 정리됨

## CI
시작 여부: **시작됨** (force-push 직후 트리거)

| workflow | job | status |
|---|---|---|
| ci | markers-and-forbidden | completed |
| ci | changes-filter | in_progress |
| ci | route | queued |
| feature-map-check | check | in_progress |
| docker-build-pr | docker-build-commerce-core (ubuntu) | in_progress |

runner_name: N/A (gh CLI 미노출 — GitHub-hosted 또는 대기 중 self-hosted)

## 이연 순증감
변동 없음 (0건) — 이 작업은 스타일 수정 cherry-pick만 수행, 이연 항목 추가/제거 없음.
