PASS

## M1-1125-G — fork 러너 감시 + sleep 복귀 재연결 + partial-but-safe (v8.3.2)

### 작업 요약

**브랜치**: `fix/M1-1125-G-watchdog-fork-wake`  
**PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/33  
**커밋**: `8695ac7ae`

### 변경 파일

- `scripts/lib/gh-runner-watchdog.mjs` — 핵심 로직
- `scripts/hub-runner-v8.3.mjs` — 호출부 업데이트 (v8.3.2)
- `scripts/test/hub-runner-gh-watchdog.test.mjs` — T20~T24 + runSelftest()

### REQ별 구현

**REQ1 — fork 러너 2대 추가**
- `DEFAULT_RUNNER_PATHS` 에 `fork-heavy` (`~/actions-runner-fork/svc.sh`) · `fork-light` (`~/actions-runner-fork-light/svc.sh`) 추가
- `DEFAULT_RUNNER_LAUNCHD_LABELS` / `DEFAULT_RUNNER_GH_NAMES` 도 4대 등록
- `judgeStuck` 는 `POOL_MAP` 도입 → fork 종류는 `no-pool` 반환 (storeport 풀 오용 방지)

**REQ2 — sleep 복귀 재연결**
- `sleepGapMs > 0 && kickstartFn` 조건 시 sleep-wake 경로 실행
- `getGhStatusFor()` 가 `gh api repos/{repo}/actions/runners` 조회 (repo 별 1회 캐싱)
- offline + no Runner.Worker → `launchctl kickstart -k gui/<uid>/<label>`
- kickstart 성공 시 `state.lastRestartAt[kind] = now` → stuck 경로 중복 재시작 방지
- `hub-runner-v8.3.mjs`: `sleepTracker.observeTick()` 결과 캡처 → `fireGhWatchdog(config, _sleepGapMs)`
- `fireGhWatchdog` 에 `fetchRunnerStatusesFn: ghRunnerFetchStatuses`, `kickstartFn: ghRunnerKickstart` 주입

**REQ3 — partial-but-safe**
- `data-partial && fetchRunnerStatusesFn` 조건 시 partial-but-safe 경로
- 각 러너: GH offline + partial ciData in_progress=0 + no Runner.Worker → `execFn` (svc.sh stop&&start) 허용
- cooldown/failure tracking 기존과 동일
- `fetchRunnerStatusesFn` 미주입 시 → 기존 skip-all 동작 유지 (T14 backward-compat)

**REQ4 — selftest**
- T20: DEFAULT_RUNNER_PATHS fork 포함 확인
- T21: sleepGapMs>0 → offline 러너 kickstart · online 러너 skip
- T22: sleepGapMs>0 · Runner.Worker alive → kickstart skip
- T23: data-partial + GH offline + no Worker → partial-but-safe restart
- T24: fetchRunnerStatusesFn 미주입 → 기존 skip-all 유지
- `--selftest-watchdog-fork-wake` → `DEFAULT_SELF_UPDATE_PREFLIGHT` 등록

### selftest 로그

```
$ node --test scripts/test/hub-runner-gh-watchdog.test.mjs
# tests 25
# pass 25
# fail 0

$ node scripts/hub-runner-v8.3.mjs --selftest-watchdog-fork-wake
[selftest-watchdog-fork-wake] PASS · 4 checks
```
