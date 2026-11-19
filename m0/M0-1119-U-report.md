relay PR #10 · partial/failed/오래된캐시 skip O · Worker 확인 O · 테스트 20/20

## M0-1119-U — gh-runner-watchdog 안전 가드

- 브랜치: `feat/M0-1119-T-gh-runner-watchdog` · HEAD `baef0b647` · PR #10 push 완료 (머지 금지)
- 파일: `scripts/lib/gh-runner-watchdog.mjs` · `scripts/test/hub-runner-gh-watchdog.test.mjs`

### [REQ1] ci 결과 불완전하면 재시작 통째 skip (기록만)
`isDataIncomplete(ciData, now)` — pure 검사:
- `ciData === null` → `no-ci-data`
- `ciData.partial === true` → `data-partial`
- `ciData.repos_failed.length > 0` → `data-repos-failed`
- `ciData.at` 이 `DEFAULT_STALE_CACHE_MS`(6분) 보다 오래됨 → `data-stale`

`runOnce` 상단에서 체크 · incomplete 이면 각 kind 별로 `action:'skip'` push 후 조기 반환.
`warn()` 콜백에만 로그, jsonl 기록 없음 (틱마다 쌓이지 않도록). `lastRestartAt`·`alerted` 등 상태 손대지 않음.

### [REQ2] stop 직전 Runner.Worker 생존 확인
`hasRunningWorker(svcPath, { workerCheckFn })`:
- 러너 폴더 = `dirname(expandHome(svcPath))`
- 기본: `execFile('pgrep', ['-f', '<runnerDir>.*Runner\\.Worker'])` — **인자 배열 = 셸 없음 = 주입 없음**
- pgrep exit 0 = match → true · exit 1 = no match → false · 기타(ENOENT 등) 예외 → 상위에서 안전측 `true`

`runOnce` 내부 루프에서 cooldown/max-failures 통과한 뒤, `execFn(stop/start)` 바로 직전에 체크.
Worker 살아있으면 `{action:'skip', reason:'worker-running'}` 으로 skip · cooldown·failure 카운터 손대지 않음.

### [REQ3] 테스트 — 20/20 pass (기존 14 + 신규 6)
- **기존 14**: T1~T13 (T4b 포함) — 모두 통과. `withEnv()` 에 `workerCheckFn: async () => false` 추가하고 모든 `runOnce()` 호출에 전달해 실 pgrep 호출 차단.
- **신규 6**:
  - T14 `ci.partial=true` → heavy/light 양쪽 `skip · data-partial` · exec 0
  - T15 `repos_failed:[...]` → `skip · data-repos-failed` · exec 0
  - T16 `ci.at` 6분 초과 → `skip · data-stale` · exec 0 · 5분59초이면 exec 통과 (경계)
  - T17 `workerCheckFn: async ()=>true` → `skip · worker-running` · exec 0 · 호출된 runnerDir = `/` 확인 (주입 없음)
  - T18 `isDataIncomplete` 유닛 — null/partial/repos_failed/stale/정상 5경우
  - T19 `hasRunningWorker` 가 throw 삼키고 `true` 반환 (안전측 재시작 봉쇄)

### 기타
- 다른 15개 relay 테스트 파일 (ci-health · landing · recovery · stuck 등) 도 전부 pass (n=181 추가 · 총 201 pass · 0 fail).
- `hub-runner-v7.5.mjs` 는 손대지 않음 (스펙: "러너 본체 금지"). 기본 `workerCheckFn` 이 실 pgrep 이라 기존 호출부 수정 없이 작동.
- 커밋 `baef0b647` · push `origin/feat/M0-1119-T-gh-runner-watchdog` · 머지는 Kyu 소관.
