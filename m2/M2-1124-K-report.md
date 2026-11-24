# M2-1124-K 완료 보고

**판정: COMPLETE** · PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/20
**스택**: feat/M2-1124-I-ci-watch-version 위 · feat/M2-1124-K-ci-watch-local 브랜치

---

## 러너 4대 폴더 위치 (launchd plist WorkingDirectory 확인)

| 러너 이름 | 폴더 |
|---|---|
| `Youngkyus-MacBook-Pro-M1` | `~/actions-runner` |
| `curiocity-mac-light` | `~/actions-runner-light` |
| `curiocity-mac-fork` | `~/actions-runner-fork` |
| `curiocity-mac-fork-light` | `~/actions-runner-fork-light` |

plist 확인 경로:
- `~/Library/LaunchAgents/actions.runner.CuriocityDevAi-storeport.Youngkyus-MacBook-Pro-M1.plist`
- `~/Library/LaunchAgents/actions.runner.CuriocityDevAi-storeport.curiocity-mac-light.plist`
- `~/Library/LaunchAgents/actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork.plist`
- `~/Library/LaunchAgents/actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork-light.plist`

---

## 로컬 출처 표시 — 실행 중 화면 캡처

아래는 `node scripts/lib/local-ci.mjs` 직접 호출 결과 (CI 미실행 상태 · idle):

```
=== 로컬 러너 상태 (source: local) ===
Youngkyus-MacBook-Pro-M1       ●OK   heavy-mac       ✓  78분 전 (source: local)
curiocity-mac-light            ●OK   post            ✓  65분 전 (source: local)
curiocity-mac-fork             ●OK   post            ✓  17분 전 (source: local)
curiocity-mac-fork-light       ●OK   lint            ✓  22분 전 (source: local)

데이터 나이: 0초 전 (3초마다 갱신)
```

ci-watch v1.4 화면 하단 카운트다운 줄 (로컬 출처 명시):
```
로컬 3초 | GH큐 갱신 28초 | r GH캐시무시+즉시 · q 종료  --full: 전체 목록   GH 2초 전
```

BUSY 러너가 있으면 `(로컬)` suffix로 출처 표시:
```
storeport-heavy   Youngkyus-MacBook-Pro-M1   ●BUSY  storeport(로컬) heavy-mac 13분
```

---

## 로그 파싱 로직 (`scripts/lib/local-ci.mjs`)

**Runner_*.log 에서 읽는 것**:
- `WRITE LINE: ...: Running job: heavy-mac` → 잡 이름 + 시작 시각
- `finish job request for job <uuid> with result: Succeeded` → 완료 시각 + 결과

**Worker_*.log 에서 읽는 것**:
- `"jobDisplayName": "heavy-mac"` → 사람이 읽는 잡 이름 (앞 5KB)
- `Total job steps: 2` → 총 step 수
- `Job completed.` → Worker 완료 플래그 (뒤 3KB · running 판정 보정)

**running 판정 로직**:
1. Runner log: 마지막 "Running job:" 줄 번호 > 마지막 "finish job request" 줄 번호 → running
2. Worker log: "Job completed." 있으면 → idle 로 보정 (Runner log 보다 먼저 쓰이는 경우 대응)

---

## GitHub 호출 수 변화

### 기존 (v1.3)
- `RUNNER_REFRESH_MS = 120_000` (2분마다)
- 1회 호출: `in_progress` + `queued` × 2 리포 = 4 calls
- **120 calls/hour** (고정)

### 신규 (v1.4)
| 상태 | 간격 | 1회 호출 | calls/hour |
|---|---|---|---|
| 러너 busy | 30s | queued + cloud_in_progress × 2 repos = 4 | **480** |
| 러너 all idle | 5분 | 동일 4 | **48** |
| rate_limit < 500 | 5분 | 동일 4 | **48** |

**핵심 차이**: 로컬 러너 running 상태는 GitHub 호출 **0** — `_diag/*.log` 직접 읽기.
대부분 CI는 self-hosted에서 돌므로, 실제 화면에 필요한 "지금 무엇을 돌리는지"는 GitHub 없이 3초마다 갱신됨.

busy 상태일 때 호출 수가 늘어나는 것은 queued 간격을 30초로 줄인 tradeoff.
GitHub rate limit (5000/hour 인증 사용자)에서 480은 여유 있음.

---

## 구현 세부

### `scripts/lib/local-ci.mjs` (신규)
- `LOCAL_RUNNERS` export: 4대 위치·이름·리포 상수
- `readRunnerState(runnerInfo)`: 러너 1대 상태
- `readAllLocalRunnerStates()`: 4대 일괄 (hub-runner 가 나중에 import 가능)
- 대용량 파일 대응: Runner log 끝 60KB, Worker log 앞 5KB+끝 3KB만 읽음

### `scripts/ci-watch.mjs` v1.4 변경
- `LOCAL_REFRESH_MS = 3_000` (화면 갱신)
- `GH_QUEUE_REFRESH_MS = 30_000` / `GH_IDLE_REFRESH_MS = 300_000`
- `fetchGhQueueAndCloud()`: queued + cloud in_progress만 조회 (in_progress는 로컬로 대체)
- `checkRateLimit()`: 1분 캐시, 잔여 < 500이면 slow mode
- `tick()`: 로컬 상태 → runState.inProgress, ci_runners.busy 충돌 해소
- `buildBusyJobMap(allJson, localStates)`: localStates 보완 (allJson 미반영 러너 대응)
- `fmtCountdownLine()`: GH 캐시 나이 (회색·10분+ 노랑) + rate limit 경고 표시
- `r` 키: `ghIgnoreCache = true` → 즉시 GitHub 조회 (10초 쿨다운)

---

## node --check

```
node --check scripts/ci-watch.mjs   → OK
node --check scripts/lib/local-ci.mjs → OK
```
