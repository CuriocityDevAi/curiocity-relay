# M0-1105-AN — storeport PR #214 × #215 머지 충돌 해소

- 모델: Opus · 2026-11-11 · 워크트리 `/private/tmp/M0-1105-AL-wt` (PR #214 head branch `feat/m0-1105-al-refund-safety`).

## 상황 요약
- 2026-11-11 PR #215 (M1-1105-AS · POS void · fulfillment 가 있어도 cancel 후 void) 가 storeport main 에 squash merge 됨 (4234b26).
- 그 뒤 PR #214 (M0-1105-AL + AM · 환불 safety · partial-failure 500 · cross-tender 재분배 · GET /refund-status + POST /refund-retry) 가 GitHub 에서 "merge conflicts" 로 머지 불가 (mergeStateStatus=DIRTY · mergeable=CONFLICTING).
- 지시: #214 브랜치에 origin/main 을 머지해 충돌 해소 · **두 PR 동작 모두 보존** · pos-integration 로컬 2 회 pass · 해소 외 신규 작업 금지.

## 충돌 파일 목록
- `apps/commerce-core/integration-tests/pos/tenders.spec.ts` — 실제 충돌 (3 개 hunk).
- `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` — 자동 머지 (clean · #214 branch 는 미수정 · #215 신규 로직 그대로 수용).

## 충돌 해소 요약 (한 줄씩)
1. `tenders.spec.ts:4164-4175` (`#68` cross-tender 재분배) — HEAD (`it(...)` · PR #214 실제 로직) 채택, origin/main 의 `it.skip(...)` (#215 가 CI 초록 복구용으로 넣은 임시 skip) 폐기.
2. `tenders.spec.ts:4248-4261` (`#68b` refund partial-failure · all-or-nothing) — 동일 사유로 HEAD 채택, origin/main `it.skip(...)` 폐기.
3. `tenders.spec.ts:4358-4726` (`M0-1105-AM · 환불 실패 재시도` describe 블록 · `#74`~`#79` 6 건) — HEAD 블록 전체 채택. origin/main 은 해당 describe 가 아예 없어 삭제 지시 였으나 #214 가 소유한 기능 범위라 보존 필수.
- `void/route.ts` — PR #214 branch 는 미수정, origin/main (#215) 의 `cancelOrderFulfillmentWorkflow` + `shipped_at`/`delivered_at` 가드 + "pending fulfillment 먼저 cancel 후 order cancel" 로직 그대로 수용.

## 머지 commit
- SHA: `86c0554b8aa856fcd4d3dadb5f7d70c364982c25`
- 메시지: `Merge remote-tracking branch 'origin/main' into feat/m0-1105-al-refund-safety`
- Diff: 2 files · +240 insertions · -19 deletions (tenders.spec.ts +153, void/route.ts +87 -19).

## 테스트 (로컬 pos-integration · 2 회)
- 명령: `cd apps/commerce-core && pnpm test:integration:pos -- integration-tests/pos/tenders.spec.ts`
- Run 1: `Test Suites: 1 passed, 1 total · Tests: 85 passed, 85 total · Time: 60.82 s`
  - 포함: `#68 cross-tender 재분배 CASH-first` · `#68b refund_partial_failure 마커 persist` · `#74~#79 M0-1105-AM retry` · **`#61 (M1-1105-AS) POST /fulfill 뒤 void`** · **`#62 (M1-1105-AS) shipped fulfillment → void 400`**.
- Run 2: `Test Suites: 1 passed, 1 total · Tests: 85 passed, 85 total · Time: 60.341 s`.
- 두 PR 범위 테스트 모두 교차 pass — #214 (환불 safety · retry) × #215 (void · fulfillment cancel) 공존 확정.

## CI 결과
- Push 후 (c0f5e34 → 86c0554) PR mergeable 상태: `MERGEABLE` (BLOCKED = required reviews/CI 대기 · 충돌 해소 완료).
- CI 전체 초록 확인은 push 직후 시점이라 아직 러닝 가능 — PR 페이지 체크 리스트 참조.

## 해소 외 신규 작업
- 없음. (`git diff --stat origin/main..HEAD` = commerce-core 쪽 refund-status route · refund-retry route · return route · tenders.spec.ts 등 PR #214 기존 범위만.)

## Deferred 순증감
- 소진: 0 (이번 티켓은 순수 머지 · 신규 기능 없음).
- 신규: 0.
- 파생: 없음.

## 착지 명령 (예정)
```sh
cp /tmp/M0-1105-AN-report.md ~/projects/curiocity-relay/m0/
cd ~/projects/curiocity-relay
git add m0/M0-1105-AN-report.md
git commit -m "m0: M0-1105-AN"
git pull --rebase --autostash origin main
git push
node scripts/claim.mjs M0-1105-AN done "storeport #214 × #215 머지 충돌 해소 · 로컬 85/85 x2 · MERGEABLE"
```
