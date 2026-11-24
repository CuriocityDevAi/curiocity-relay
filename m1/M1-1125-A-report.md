FAIL (원인분석 완료 · v8.3 구현 진행 중 · PR 미생성)

# M1-1125-A — 러너 "리포트 없는 done" 원인 규명 + v8.3 수정

작성: 2026-11-25 · 러너: v8.2 (`scripts/hub-runner-v8.2.mjs`) · 워크트리: `~/projects/curiocity-relay-wts/M1-1125-A` · 브랜치: `fix/M1-1125-A-runner-no-report-done` (origin/main 기점)

---

## 25분 체크포인트 — 원인 규명 (파일:줄 포함)

### A. 리포트 없는 done (손님화면 감사 4회 포함)

**근본 원인 1 — `head-moved` 착지 오탐**:
`scripts/lib/land-detect-v2.mjs:126-136` — Check L3 는 `getHead() !== headSnapshot && localReport` 이면 즉시 `head-moved` 로 성공 판정. 그러나 HEAD 는 아래 "허브 작업과 무관한" 원인으로도 움직인다:
- `scripts/hub-runner-v8.2.mjs:3151-3168 pushHeartbeatIfDue()` 가 5분마다 `commit chore(runner-...): heartbeat` + `push HEAD:main` — HEAD 이동.
- `scripts/hub-runner-v8.2.mjs:1322-1363 collectIsolatedReport()` 자체가 report 파일을 copy·commit·push — 자기 자신이 HEAD 를 움직이고, 돌아간 폴에서 L3 가 "head-moved" 로 판정 (localReport=true 이미 참).
- claim done 알림용 heartbeat/claim 커밋이 다른 허브에서 올라와 fetch 될 때 로컬 HEAD 전진.

**근본 원인 2 — localReport 참 조건이 과도**: `scripts/hub-runner-v8.2.mjs:2359-2365 waitForLanding` 의 `reportExists` 콜백은 매 폴에서 `collectIsolatedReport` 를 호출해 "허브가 report.md 를 디스크에 쓴 시점" 을 "작업 완료" 로 치부. 그러나 허브 세션은 report 직후에도 ① PR 생성 ② 코드 커밋 ③ 리뷰 댓글 ④ 2차 검증 등을 계속한다.

**결론**: HEAD 가 (허브와 무관한 사유로) 움직이고 report 파일이 (설사 과거 세션에서 생성돼 디스크에 남아 있어도) 존재하면 → **첫 폴에서 head-moved** → `exitPaneClaude` 가 ctrl-u + /exit 로 세션을 강제 종료.

**ID별 실측**:

| ID | log 라인 | 원인 요약 |
|---|---|---|
| M1-1124-R | `poll=1 · latency=1s` · 화면=`⏺ Searching for 2 patterns…` | poll=1 head-moved 오탐 (세션 시작 직후). 이전 heartbeat/claim 커밋으로 HEAD 이동 + 과거 리포트 잔존. **작업 0초 수행**. |
| M2-1124-T(1차) | `poll=1 · latency=2s` · 화면=`Bash echo REPORT_PATH… Whirring…` | 동일. 커밋 메시지 보기 전에 kill. |
| R0-1124-AK | `poll=1 · latency=0s` · 화면=`Frosting…` | 동일. |
| M1-1124-O | `poll=177 · latency=2s` · 화면=`Baked for 17m 43s` · 수거 실패 로그 있음 | collectIsolatedReport 가 `수거 실패` 로 return 했지만, 로컬 디스크엔 report 가 이미 존재 → L3 가 head-moved 판정. 세션은 후속 작업 중이었음. **relay 에 report 커밋 안 됨**. |
| M0-1124-L | `poll=59 · latency=367s` · 화면=`Canoodling…` · 수거 완료 | 수거 push 는 성공했지만 세션은 아직 추가 검증 중. L3 가 `commit+push 뒤` HEAD 이동을 외부 이동으로 오해 → kill. **relay 엔 들어갔으나 세션 미완료**. |
| M2-1124-S | `poll=221` · 화면=`Cogitated 21m52s` | 수거 완료 후 L3 kill. |
| M3-1124-P | `poll=116` · 화면=`Roosting 12m13s · Listing dirs` (worktree 커밋 중) | 수거 완료 후 세션은 worktree 커밋을 시도 중. L3 kill. |
| M3-1124-Q | `poll=128` · 화면=`Kneading 12m51s` (리포트 보완 중) | 동일. |
| R0-1124-AA | `poll=108` · 화면=`리포트 작성 완료 ... 감사 결과 요약` (후속 설명) | 수거 완료 + 세션 후속 설명 중. L3 kill. |
| R0-1124-AJ | `poll=63` · 화면=`Ruminating 6m44s` (PR #254 리뷰 작성 중) | 수거 완료 + PR 리뷰 작성 중단. |
| R0-1124-AN | `poll=47` · 화면=`APPROVE…` | 수거 완료 + 결과 요약 중. |
| M1-1124-R(PR #423) | — | 세션이 **극초기**에 killed 되었지만 사전 PR 분기는 남은 사이드이펙트 (R 은 poll=1 종료라 별도 PR 열렸을 가능성은 낮음 — 다른 세션 작업으로 추정). |

### B. `rebase_in_progress: true` · claim/heartbeat/state push 실패

`scripts/hub-runner-v8.2.mjs:970` — `safePullOriginMain` 이 아직 `git pull --rebase --autostash` 사용. 충돌 시 983 에서 `rebase --abort` 하지만 **`.git/rebase-merge` 가 잔존하는 경로가 있음**: ① autoMergeConflicts 가 부분 성공 후 add_fail ② 러너가 abort 직후 kill 신호 받는 경우 ③ claim.mjs 가 rebase 중일 때 외부에서 commit 시도.

또 `scripts/hub-runner-v8.2.mjs:1398 recoverReportFromBranch` 도 `pull --rebase` 여전히 사용.

`claim.mjs` / `heartbeat` / `state.json push 실패 (status-wt push --force runner-status)` 반복은 — `.git/rebase-merge` 잔존 상태에서 `git commit` 실행 시 "fatal: You are in the middle of a rebase" 가 뜨고, 그 뒤 push 도 실패하는 체인.

**main-guard 가 다음 tick 에 복구**되므로 러너는 "시작 시" 안전해지나, **tick 도중에 발생한 rebase 잔존은 그 tick 안에서는 복구되지 않음**.

`safeRunnerPush` 의 merge-ours 자체는 깨끗하나, claim.mjs · heartbeat · state.json 중 일부가 아직 `pull --rebase` 경로를 쓰거나, 리스코프 밖에서 리베이스를 시작한 흔적이 남을 때까지 상황이 유지된다.

### C. M1-1124-U — pane busy (2nd · 재시도 소진) · dispatch=claude-foreground-timeout

`scripts/hub-runner-v8.2.mjs:2309-2313 waitSessionStartedWithRetry` — Enter 2 회 재전송 후 **세션 미시작** 시 `claude-foreground-timeout` 리턴.
`scripts/hub-runner-v8.2.mjs:3363-3392 dispatchFailed` 처리 — `pane-busy` 와 `claude-foreground-timeout` 을 **동일한 pane-busy 재시도 트랙으로 묶는다**. 1차 실패 → retry 마크, 2차 실패 → exhausted → blocked. Exhausted 마크는 clear 경로가 좁아(`clearPaneBusyExhausted`), 사실상 영구 blocked.

M1-1124-U 로그: `initial=unknown · C-c ×2 · shell 복귀 · send=true · Enter 2회 재전송 → unknown · dispatch-fail · reason=claude-foreground-timeout`. 세션 자체는 cmux 상의 shell 은 보이지만 claude CLI 가 foreground 로 안 올라옴 — 가능한 원인: claude CLI 가 hub 세팅 중 (hub-preamble 입력 중), 또는 PATH 에서 claude bin 이 안 보임, 또는 pane 에 다른 프로세스가 점유. 그러나 러너는 **cmux workspace close + 재생성** 대신 "다음 tick 재시도" 만 하므로 복구 불가.

### D. relay PR #27 content on main without PR merge

커밋 `512b57020` (2026-11-25 00:05:48 +0700 = **2026-11-24 17:05 UTC**, author=hub-runner):
```
Merge: 572005495 aeb4e4496
Merge remote-tracking branch 'origin/main' into HEAD
```
파일 포함: `m2/M2-1124-U-report.md` 외 다수 queue/status 파일.

경로: `scripts/lib/safe-push.mjs:65 safeRunnerPush` — `behind > 0` 이면 `git merge -X ours --no-edit origin/main` → `git push origin HEAD:main`.

**치명 결함**: `push origin HEAD:main` 이 **HEAD 가 main 분기가 아니어도 push** 함. 17:30:48Z `main-guard rescue · head_before=(detached)` 가 증명 — 러너 폴더 HEAD 가 detached 상태였다. Detached HEAD 가 과거 PR 브랜치 (예: PR #27 의 feature 브랜치) 커밋 어딘가에 머물러 있는 동안 `safeRunnerPush` 가 호출되면:
1. `fetch origin main` OK
2. `rev-list HEAD...origin/main` 로 ahead/behind 계산
3. `merge -X ours origin/main` 성공 (HEAD 는 feature 분기 tip 기준)
4. `push origin HEAD:main` → **feature 브랜치 상태가 main 으로 force 아닌 fast-forward 또는 merge-commit 으로 밀림**

→ PR #27 의 파일들이 PR merge 없이 main 에 반영. 이것이 17:05Z 의 "Merge remote-tracking branch 'origin/main' into HEAD" (주의: into HEAD — main 아님) 커밋.

---

## v8.3 수정 설계 (구현 중)

1. **land-detect-v2: head-moved 엄격화** — HEAD 가 움직여도 "해당 commit 이 `<hub>/<id>-report.md` 를 터치했을 때만" 성공 판정. 아니면 무시하고 폴 계속. 추가로 pane state = `shell` 조건도 요구 (옵션).

2. **safe-push: HEAD 가 main 아니면 거부** — `symbolic-ref --short HEAD` ≠ `main` 이면 `{ ok:false, reason:'not-on-main' }` 리턴 + 로그. Detached HEAD 도 거부.

3. **remaining `pull --rebase` → safeRunnerPush 치환** — `safePullOriginMain:970`, `recoverReportFromBranch:1398`. pull 은 `fetch + merge -X ours` 로 교체.

4. **rebase 잔존 cleanup tick 시작부** — `.git/rebase-merge` · `.git/rebase-apply` · `.git/MERGE_HEAD` 를 tick 진입 시 자동 abort. (이미 main-guard 에 있지만 tick 중 재발 대비 가벼운 가드 추가.)

5. **collectIsolatedReport done 보장** — commit 성공했으면 "리포트 파일이 origin/main 에 push 됐는지" 를 확인한 뒤에야 landing 판정에 포함. `report-origin` 조건을 우선시.

6. **dispatch: claude-foreground-timeout 별도 처리** — pane-busy 재시도 트랙과 분리. foreground-timeout 은 cmux workspace close + 재생성 + retry 1회. 그래도 안 되면 blocked.

7. **done 판정 1차 가드**: `isReportLanding` 성공 후 relay 에 report 파일이 실제 origin/main 에 올라갔는지 1회 재확인 → 올라가지 않았으면 `blocked: no-report` + 로그 tail 요약을 claim note 에 기록.

---

## 지금 러너 상태 (손대지 않음) · Kyu/오케가 할 안전한 단일 명령 제안

러너 폴더 `~/projects/curiocity-relay` 는 상시 main 체크아웃. 다음 tick 자동 main-guard rescue 로 복구된다. 그래도 즉시 수동 복구가 필요하면 **러너 폴더 밖** 에서:

```sh
# 1) 러너 폴더 상태 확인 (수정 없이)
ls -la /Users/kyu.lee/projects/curiocity-relay/.git/ | grep -E "rebase|MERGE_HEAD"

# 2) 필요 시 (rebase/merge 중이면) — 한 줄 안전 복구
cd /Users/kyu.lee/projects/curiocity-relay && \
  git rebase --abort 2>/dev/null; git merge --abort 2>/dev/null; \
  git reset --hard origin/main
```

이 명령은 러너 폴더에만 영향. worktree (`~/projects/curiocity-relay-wts/*`) 는 손대지 않음.

---

## 다음 단계 (진행 중)

- [ ] `scripts/hub-runner-v8.3.mjs` 작성 (v8.2 복사 + 6가지 패치)
- [ ] `scripts/lib/safe-push.mjs` HEAD-on-main 가드 추가
- [ ] `scripts/lib/land-detect-v2.mjs` head-moved commit touches report 체크 추가
- [ ] selftest 추가: `--selftest-head-moved-unrelated` · `--selftest-safe-push-detached` · `--selftest-foreground-timeout-recovery`
- [ ] 기존 selftest 통과 확인 (preflight core 3)
- [ ] PR 생성 (자기 머지 금지)
- [ ] 리포트 최종본 갱신 (첫 줄 PASS/FAIL)
