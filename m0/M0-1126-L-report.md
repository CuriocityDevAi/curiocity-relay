PASS #457 7f0bfab #458 2395adb

## 작업 개요

- `feat/M0-1126-J` (#457) · `feat/M0-1126-K` (#458) 를 `origin/main` (ce4f6ad = #456 squash) 위로 rebase.
- `f6743a1` (M0-1126-I · #456 으로 squash 선반영) 를 drop · J 고유 커밋만 유지.
- K 는 J 위에 1커밋 · 새 J head (7f0bfab) 위로 재배치.

## rebase

- J 워크트리: `/Users/kyu.lee/projects/curiocity-relay-wts/M0-1126-J`
  - `git rebase --onto origin/main f6743a1 feat/M0-1126-J` → Successfully rebased · **충돌 없음**.
  - 새 head `7f0bfab` (이전 `be6a71a`).
- K 워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1126-K`
  - `git rebase --onto 7f0bfab be6a71a feat/M0-1126-K` → Successfully rebased · **충돌 없음**.
  - 새 head `2395adb` (이전 `1944852`).
- #456 squash (ce4f6ad) 와 M0-1126-I (f6743a1) diff 동일 (14 files · +1013/-21) 로 확인되어 drop 안전.

## 재실행 결과

| 테스트                        | 결과  | 비고                   |
| ----------------------------- | ----- | ---------------------- |
| commerce-core typecheck       | PASS  | 0 err                  |
| customer-display typecheck    | PASS  | 0 err                  |
| apps/wing typecheck           | FAIL  | **pre-existing** · `components/ui/button.tsx` · J 가 wing 미건드림 · origin/main 에서도 동일 에러 (@types/react@19 mismatch) |
| commerce-core unit            | PASS  | 877/877                |
| customer-display vitest       | PASS  | 327/327 (K 워크트리 328/328) |
| cd-pos-sync-v4-next-customer  | PASS  | 3/3 · 10.95s           |
| cd-pos-sync-v4                | PASS  | 4/4 · 10.85s           |
| cd-pos-sync-v3                | PASS  | 3/3 · 10.74s           |
| cd-parallel-pay               | PASS  | 15/15 · 16.17s         |
| cd-full-flow                  | PASS  | 8/8 · 12.04s           |
| cd-snapshot-skip              | PASS  | 7/7 · 14.47s           |

R0-1126-AB 승인 당시 기록 ("commerce-core 877/877 · customer-display 327/327 · cd-full-flow 8/8 · cd-snapshot-skip 7/7 · cd-pos-sync-v3 3/3 · v4 4/4") 전부 동일. wing 에러는 J 범위 밖·사전 존재·#457 scope 와 무관.

## push

- `git push --force-with-lease origin feat/M0-1126-J` → `be6a71a...7f0bfab (forced update)`.
- `git push --force-with-lease origin feat/M0-1126-K` → `1944852...2395adb (forced update)`.

## PR mergeable 확인

- **#457**: `mergeable=MERGEABLE` · `mergeStateStatus=UNSTABLE` (CI 진행 중) · head `7f0bfab`.
- **#458**: `mergeable=MERGEABLE` · `mergeStateStatus=UNSTABLE` (CI 진행 중) · head `2395adb`.

양 PR 의 CONFLICTING 상태 해소됨. 머지 가능.

## 보존 요소 확인

- #456 계약 v1.4 (actions · locked · cancel_entry · phone-entry 라우트) = ce4f6ad 로 main 에 상주 · J 는 손대지 않음.
- #454 isPostSettlementStale = main 상주 · J 는 손대지 않음.
- J diff (11 files · +697/-48): v4-next-customer spec · tenders route · register_session service · order-snapshot-paid subscriber · customer-display types · index.tsx · LeftPaymentPanel · feature-map · receipt-view-model (order-snapshot · receipt-view · tests). 전부 J 고유 변경 · I/456 변경 없음.
- K diff (6 files · +465/-67): v4-next-customer spec 확장 · tenders route · resolve-cashier-name 신규 · order-snapshot-paid · receipt-view.test · feature-map. 전부 K 고유 변경.

## 메타

- 소요 ≈ 15분 (25분 상한 내).
- /loop 미사용.
