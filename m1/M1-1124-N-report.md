PASS · M1-1124-N runner-v8.2 main-guard · ours-merge push · worktree preamble · sleep 보정

## 요약

2026-11-24 러너 폴더 사고 3건이 뿌리.

- **A**: 허브 M1-1124-J 가 러너 폴더(`~/projects/curiocity-relay`) 에서 `fix/M1-1124-J-ci-watch-deploy` 브랜치 + 커밋 → 러너 claim push 가 그 위에 44 개 쌓임 → `pull --rebase` 충돌(`status/claims/M0-1124-I.json both added`) → rebase 중단 방치 → `"Committing is not possible because you have unmerged files"` 로 18:47~20:55 WIB push 전면 정지. Kyu 수동 복구 1차(`rebase --abort` + `main reset`).
- **B**: 노트북 뚜껑 닫힘 → 재개 직후 rebase 중단 → `.git/rebase-merge` 디렉터리 잔존 → `"already a rebase-merge directory"` 로 push 정지. abort 시 HEAD 가 `fix/M1-1124-J-ci-watch-deploy` 로 복귀. Kyu 수동 복구 2차.
- **C**: 오케가 되돌려 둔 untracked claim 파일 때문에 `rebase --abort` 가 `"would be overwritten by merge"` 실패.

Kyu 20:48~21:26 수동 복구 7회 — 러너 폴더가 상시 main 아님.

## 산출물

- 브랜치: `fix/M1-1124-N-runner-main-guard` (commit `04208d3f`)
- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/27
- 러너 버전: v8.1 → v8.2 (self-update 로 배포. TARGET=`hub-runner-v8.2.mjs` · FALLBACK=`hub-runner-v8.1.mjs`)

### 추가 파일

| 경로 | 역할 |
| --- | --- |
| `scripts/lib/main-guard.mjs` | tick 시작 자동 복구 핵심 — `detectViolation` + `performRescue` + `assertMainAtTickStart`. 순수 함수 · exec 주입 가능. |
| `scripts/lib/safe-push.mjs` | rebase 없는 자기 push — fetch + `merge -X ours origin/main` + push. |
| `scripts/lib/hub-preamble.mjs` | REPORT_PATH 조항 + worktree-only 조항 합성 `buildHubPreamble`. |
| `scripts/lib/sleep-tracker.mjs` | tick gap 감지 + `~/.hub-runner/sleep-events.ndjson` 누적 조회. |
| `scripts/hub-runner-v8.2.mjs` | v8.1 복제 + 네 모듈 wiring + 신규 selftest flag 7종. |
| `scripts/test/hub-runner-main-guard.test.mjs` | A/B/C 재현 + safe-push + preamble + sleep-tracker 6 case. |
| `scripts/hub-runner-install.sh` | TARGET=v8.2 · FALLBACK=v8.1 상향. |
| `docs/hub-runner.md` | v8.2 변경 사항 요약 블록 추가. |

## 고친 것 ↔ 큐 1~5번 매핑

1. **러너 폴더 = 항상 main**: `tick()` 맨 앞에 `mainGuardAssert({ repoRoot, runnerHome, impl, logFn })`. 위반 시 (a) rebase/merge abort — 실패 시 `.git/rebase-merge` + `.git/rebase-apply` 디렉터리 수동 제거 (b) `rescue-<ts>` 브랜치 ref 로 현재 HEAD 보존 (c) `git ls-files --others --exclude-standard` 로 untracked 파일 단위 열거 → `~/.hub-runner/rescue/<ts>/files/` copy 보존 (`?? docs/` 로 접히는 문제 ls-files 로 우회) (d) `checkout -f main` + `reset --hard origin/main` (e) 복구 전 ahead 커밋의 runner-scope 파일을 `git show HEAD:<p>` 로 추출 → origin/main 에 없는 것만 재적용 + commit (f) `events/runner-main-guard-<ts>.md` 1줄 + rescue dir `manifest.json`. **Kyu 손 0.**
2. **러너 자기 push 는 rebase 대신 ours-merge**: `runnerProxyLand` · `collectIsolatedReport` 의 `pull --rebase --autostash` 블록을 `safeRunnerPush({ git, timeoutMs })` 로 교체. 흐름: fetch → ahead/behind 계산 → behind>0 이면 `merge -X ours origin/main --no-edit` → 잔존 충돌 파일은 `checkout --ours` + add + `commit --no-edit` → push. 어떤 경우에도 rebase 디렉터리 안 만듦.
3. **sleep/wake 내성**: 1번이 다음 tick 에서 자동 복구. 추가로 safe-push 가 rebase 를 안 쓰므로 `.git/rebase-merge` 잔존 자체가 없음.
4. **허브가 러너 폴더에 브랜치 못 만들게**: `DEFAULT_WORKTREE_RULE` = "relay(curiocity-relay) 작업은 반드시 `~/projects/curiocity-relay-wts/<ID>` worktree 에서만. 러너 폴더에서는 브랜치 생성 · 커밋 · rebase · stash · reset 전부 금지. … 러너 폴더에 쓴 모든 변경은 다음 tick 에 자동 복구되어 사라진다." 를 `buildHubPreamble` 이 자동 삽입. (사후 감지는 기존 `kyu_watch_dirs`/`captureKyuFingerprint` 가 이미 담당 — 러너 폴더를 거기 추가하는 건 runner-config 변경이라 이번 PR 범위 외.)
5. **60분 상한 sleep 보정**: `createSleepTracker({ runnerHome, pollMs, sleepGapMultiplier })` 가 `observeTick()` 호출 시 tick 간 벽시계 점프를 감지해 ndjson 기록. `recoverStuckStartedClaims` 가 `const elapsedMs = Math.max(0, (Date.now()-atMs) - sleepTracker.accumulatedSleepMs(stuck.at));` 로 보정 후 60m 비교. M1-1124-M · M2-1124-Q 같은 "잠자기 포함 60분" blocked 재발 차단.

## Selftests (전부 PASS · `scripts/test/hub-runner-main-guard.test.mjs`)

| flag | 검증 |
| --- | --- |
| `--selftest-main-guard-a` | 사고 A 재현 → rescue 브랜치 ref `rescue-<ts>` · CLAIM-A·B 재적용 · manifest 기록 |
| `--selftest-main-guard-b` | `.git/rebase-merge` 잔존 + 실제 rebase 진행 중 → abort 실패 시 디렉터리 제거 후 main 복귀 |
| `--selftest-main-guard-c` | rebase 진행 + untracked 파일 → preserve 디렉터리에 사본 + 작업 트리 clean · 사용자 파일 유실 없음 |
| `--selftest-safe-push` | behind=1 상태에서 ours-merge push 성공 · rebase 디렉터리 잔존 없음 |
| `--selftest-hub-preamble` | 리포트 경로 + worktree 조항 2개 합성 · `${ABS_PATH}` 치환 · 토글 OK |
| `--selftest-sleep-tracker` | ndjson 2 line 작성 → 전 구간/부분 구간 누적 조회 150000/120000 ms |

기존 preflight 3종(`--selftest-stale-lock` · `--selftest-merge-fail3` · `--selftest-report-path-off`) + `--selftest-selfupdate-preflight` 자기 자신 전부 PASS — self-update 로 배포 조건 충족.

## 어설션 파일

- `scripts/test/hub-runner-main-guard.test.mjs` — 6 case 단위 `assert()` 20+ 건. 테스트 로그 전체는 PR CI 가 아닌 수동 실행으로 확보 (worktree 커밋 전 콘솔 실행 완료). 러너 폴더 사고 특성상 production relay 를 재현에 쓸 수 없어 임시 git repo(`mkdtemp /tmp/hr-mg-*`) 안에서 재현.

## 미실행 · 미검증

- `--selftest-selfupdate-preflight` 는 자기 자신에 대해 PASS 하지만, 실제 production 환경에서 `--selftest-stale-lock` 이 production 러너 lock 과 겹치는 경로는 테스트 안 함 (v8.1 과 동일한 프리existing 거동 · 이번 PR 범위 외).
- Kyu 폴더 감시(`captureKyuFingerprint`) 에 러너 폴더 자체를 포함시키는 안은 production runner-config 수정이 필요해 이번 PR 범위에서 제외 — 러너 폴더 변경 감지는 tick 시작 main-guard 가 이미 담당.
- v8.2 가 실제 production self-update 로 배포되기까지는 origin/main 머지 후 다음 러너 tick 대기.

## 권장 기술 선택지

1. **main-guard: full rescue vs. soft reset**: 사고 A·B·C 를 전부 커버하려면 `checkout -f main` + `reset --hard origin/main` 외 선택지가 없다 — soft reset 은 unmerged 상태를 남긴다. 따라서 "데이터 유실 위험" 을 rescue 디렉터리 copy 로 상쇄하는 설계 채택.
2. **safe-push: ours-merge vs. force-with-lease**: force-with-lease 는 다른 러너 작업을 덮는다. ours-merge 는 origin 쪽 커밋을 보존하면서도 자기 claim 을 유지. 러너가 자기 scope 밖은 안 건드리므로 ours 가 안전.
3. **worktree-only 조항 삽입 위치**: REPORT_PATH 조항(`DEFAULT_REPORT_PATH_PREFIX`) 뒤. 두 조항이 같이 상시 삽입되므로 허브가 preamble 통째로 "무시" 할 수는 있지만 실질 억지력은 1차 차단으로 충분 — 사후 main-guard 가 백업.

PR 본문 3줄 (이미 PR description 에 반영):
- 사고 A·B·C 재발 방지용 러너 v8.2 — tick 시작 main-guard · ours-merge push · worktree preamble · sleep 보정.
- 6종 selftest 통과(사고 재현 포함) + 기존 preflight 3종 통과 — self-update 배포 조건 충족.
- 러너 폴더에 생긴 모든 비정상 상태(브랜치/rebase/merge/unmerged/untracked)는 다음 tick 에 자동 복구.
