# M2-1127-O 리포트

PASS · PR #74 · head da8b6519d · 테스트 11개 (selftest ×3 + unit ×8)

---

## 사고 원인 (확정)

M2-1126-T 에서 `status/runners/` 를 `RUNNER_SCOPE_PREFIXES` 에서 제거했다.
이후 self-update 로 v8.3.4 로 올라간 직후, 이전 버전이 git index 에 staged 해뒀던
`status/runners/all.json` 이 ci-health 커밋에 포함됐다. `autoRecoverDivergence()` 가
`status/runners/` 를 "자기 파일"로 인식하지 못해 "사람/허브 파일 혼입"으로 판정,
30초마다 반복 보고하며 러너 정지.

---

## REQ별 처리

### REQ1 — `status/runners/` RUNNER_SCOPE_PREFIXES 복구

```js
// Before (v8.3.4):
const RUNNER_SCOPE_PREFIXES = ['status/claims/', 'status/hubs.json', 'status/ci/', ...];

// After (v8.3.5):
const RUNNER_SCOPE_PREFIXES = ['status/claims/', 'status/runners/', 'status/hubs.json', 'status/ci/', ...];
```

`autoRecoverDivergence()` 가 `status/runners/all.json` 포함 ci-health 커밋을
"자기 커밋"으로 올바르게 분류 → "사람/허브 파일 혼입" 오인 차단.

### REQ2 — ci-health push 실패 → uncommit, 다음 루프 재시도

`pushHeartbeatIfDue()` 의 ci-health push 경로에 3가지 방어:

1. **push 전 stale staged 제거**: `git restore --staged -- status/runners/`
   (이전 버전이 남긴 staged 파일 제거)
2. **자기 커밋 squash**: push 전 `HEAD ^origin/main` 범위 커밋이 모두
   RUNNER_SCOPE_PREFIXES 소속이면 `git reset --soft origin/main` 으로 squash
   (커밋 누적 방지)
3. **push 실패 시 uncommit**: push 예외 발생 → 에러 로그 → `git reset --soft HEAD~1`
   → 다음 루프에서 재시도 (커밋 쌓임 방지)

### REQ3 — `status/runners/all.json` 갱신 경로 (코드 변경 없음)

| 경로 | 역할 | 읽는 주체 |
|---|---|---|
| `~/.hub-runner/status-wt/all.json` (runner-status branch) | 신 위치 — v8.3.4+ 쓰기 | ci-watch, 오케 (`readAllJson()`) |
| `REPO_ROOT/status/runners/all.json` | 구 위치 — fallback | ci-watch legacy (`readAllJsonGit()`) |

`sources-local.mjs:readAllJson()` 이 양쪽 읽고 `at` 타임스탬프 최신 우선 반환.
오케(감시)가 읽는 경로 단절 없음 → 코드 변경 불필요.

### REQ4 — 테스트

| 테스트 | 결과 | 검증 내용 |
|---|---|---|
| `--selftest-auto-recover` | PASS | 자기 커밋 4개 → dropped=3(heartbeat), reapplied=1(claim), 복구 |
| `--selftest-human-files` | PASS | 사람 파일 혼입 → `{status:'manual'}`, HEAD 보존 (여전히 차단) |
| `--selftest-ci-health-recover` | PASS | ci-health 커밋 2개(runners+ci) → dropped=2, HEAD=origin/main |
| `hub-runner-recovery.test.mjs` | 8/8 PASS | 재시작 복구 판정 단위 테스트 |

---

## 변경 요약

- `RUNNER_VERSION`: `v8.3.4` → `v8.3.5`
- `RUNNER_SCOPE_PREFIXES`: `'status/runners/'` 복구
- `pushHeartbeatIfDue()`: stale staged 제거 + squash + push 실패 uncommit 추가
- `SELFTEST_CI_HEALTH_RECOVER` 상수 + guard 조건 + selftest 블록 추가
- 총 +80 lines

---

## PR

- **#74** `feat/M2-1127-O` → main
- URL: https://github.com/CuriocityDevAi/curiocity-relay/pull/74
- HEAD: da8b6519d
- 머지: 오케(허브 빌 때) · self-update 주의
