relay PR #10 · 판정 N=8분 · 상한 30분/1회 · job 보호 O · 2회실패 정지 O · 기록 O · 테스트 14/14

# M0-1119-T 리포트 — gh self-hosted runner watchdog

## 산출
- relay PR #10 — https://github.com/CuriocityDevAi/curiocity-relay/pull/10
- 브랜치 `feat/M0-1119-T-gh-runner-watchdog` · push 완료 · 머지 전.
- 커밋 1개 (d7b088008) · 4 파일 +612 lines.

## [REQ] 체크

1. **판정 (N=8분, 기본값)**: `pool.queued > 0 AND pool.in_progress.length === 0 AND pool.oldest_queued_min >= 8`. ci-health 캐시(`getLatestCi().data`)를 그대로 재사용 · **추가 API 호출 0**. (`runner_idle` alert 과 동일 조건.)
2. **조치**:
   - `~/actions-runner{,-light}/svc.sh stop && start` 체인 (sh -c · timeout 30s). 경로는 `runner-config.json` 의 `gh_runner_watchdog.runner_paths` 키 (기본값 상수에도 동일 값 하드코딩).
   - **같은 러너 30분/1회 상한** (`cooldown_ms=1,800,000`).
   - 다음 회차에 상태 복귀 안 되면 "verification failure" 1회 · consec++.
   - **2회 연속 실패 → 더 안 하고** `status/runners/all.json` 의 `gh_runner_alert` 플래그를 writeHeartbeat 가 세팅 (`getGhWatchdogAlert()` 를 호출).
3. **기록**: `status/ci/runner-restarts-<WIB-date>.jsonl` · 1 재시작 = 1 줄 · at·kind·svc·reason·result·consecutive_failures.
4. **안전**:
   - **실행 중 job 보호**: ci 의 `in_progress.length > 0` 이면 judgeStuck 이 stuck=false 반환. svc.sh 호출 자체가 없어진다.
   - **svc.sh 없거나 실패** → `defaultExec` 가 reject → runOnce 가 consec 증가만 하고 return. 허브 본업은 `fireGhWatchdog` 가 try/catch 안에서 fire-and-forget 으로 호출하므로 완전 격리.
   - **테스트 14개**: 판정 5 (T1~T4b) · cooldown · 재시도 · 2회 정지 · exec 실패 · job 보호 · 복구 reset · runnerPaths 전달 · withinCooldown 경계.
5. **PR 본문**: 머지 후 Kyu 할 일 1줄 (`bash ~/projects/curiocity-relay/scripts/hub-runner-install.sh`) 명시.

## 파일 변경

| 파일 | 변경 |
|---|---|
| `scripts/lib/gh-runner-watchdog.mjs` | 신규 (236 lines) · judgeStuck · runOnce · withinCooldown · getLatestAlert |
| `scripts/test/hub-runner-gh-watchdog.test.mjs` | 신규 (14 tests) |
| `scripts/hub-runner-v7.5.mjs` | +31 lines · import 1 · 상수 3 · fireGhWatchdog · writeHeartbeat `gh_runner_alert` 필드 |
| `status/runner-config.json` | +10 lines · `gh_runner_watchdog` 블록 (stuck_threshold_min / cooldown_ms / max_failures / runner_paths) |

## 테스트 결과

```
node --test scripts/test/*.test.mjs
# tests 195
# pass 195
# fail 0
```

(기존 181 + 신규 14.)

## 설계 메모

- **상태 파일 `.cache/gh-runner-watchdog-state.json`** — 허브 재기동과 무관하게 cooldown 과 consec 카운트 유지. 각 kind 마다 `lastRestartAt`, `pendingVerification`, `consecutiveFailures`, `alerted` 추적.
- **"실패" 세만틱**: (a) exec 자체가 throw 하면 즉시 consec++, (b) 성공 exec 후 cooldown 지나서 여전히 stuck 이면 verification 실패 → consec++. 둘 다 1 회 카운트.
- **복구**: 다음 회차에 ciData 가 not-stuck 이면 consec/alerted/alert 모두 reset. gh_runner_alert 자동 clear.
- **all.json 단일 작성자 유지**: 워치독은 `.cache/` 에 상태만 쓰고, 알림은 `getLatestAlert()` 를 writeHeartbeat 가 payload 에 포함. all.json 을 두 곳에서 쓰는 레이스 피함.
- **모듈 inject 가능**: `execFn`, `recordFn`, `now`, `stateFile`, `runnerPaths` 전부 테스트에서 주입. 실제 svc.sh 는 default 로만 호출.

## 머지 전 Kyu Mac 실측 금지 ✅

이 PR 이 머지되고 Kyu 가 `hub-runner-install.sh` 재실행해야 실제 `fireGhWatchdog` 가 로드된다. 테스트는 전부 모의(mocked execFn).

## 후속

- 실측 데이터가 쌓이면 `stuck_threshold_min` (8 → ?) 재조정 고려.
- M0-1119-G (ci-health) 가 15분 넘어 alert 하므로 8분 threshold 는 CI 쪽 알림 전에 자동 복구 시도를 깔아 둠.
