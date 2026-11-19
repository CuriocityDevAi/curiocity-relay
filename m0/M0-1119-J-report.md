relay PR #7 · 간격 5분 O · 캐시 O · 시간당 호출 약 480(max)/50-120(expected) · 겹침 0 O · /tmp O · 기록범위·분류·fork O · 테스트 154/154

## 처리 (R0C-1119-P CHANGES · 이전 차단 4건 해결됨 가정 · v7.4 대비 추가만)

### REQ1 — 간격 5분 · run 캐시 · API 호출 상한

- `scripts/lib/ci-background.mjs` `maybeStartCiFetch(..., { minIntervalMs })` 추가. `state.lastStartedAt` 기준 미만이면 `{started:false, reason:'min-interval'}`.
- `scripts/hub-runner-v7.5.mjs` 상단 상수 `CI_MIN_FIRE_INTERVAL_MS = 5 * 60_000`. `fireCi()` 가 `minIntervalMs: CI_MIN_FIRE_INTERVAL_MS` 로 전달 (호출부만 수정).
- `scripts/lib/ci-health.mjs` 모듈 전역 `seenCompletedRunIds: Set` — 이미 jobs 를 가져와 기록한 `${repo}:${run.id}` 는 다음 회차에서 jobs 호출 스킵.
- `apiBudget` (default 40) · `makeBudget/budgetCheck` 로 1회 조회 내 모든 `execFn` 호출을 세고 초과 시 다음 회차로 미룸 (`api_overflow: true`).
- **예상 시간당 API 호출**:
  - fireCi 시작: 상한 3600s / 300s = **12/h** (in-flight 겹침까지 고려하면 보통 더 적음).
  - 1회 조회 budget 상한 40 → 최악 **12 × 40 = 480/h**.
  - 캐시 포함 일반 조회(완료 run 재조회 0 · queued 소수) → 보통 **12 × 5~10 ≈ 60~120/h**.
  - 허브 gh 와 공유하는 5000/h 한도 대비 **최악 9.6%** · 일반 1~2%.

### REQ2 — inFlight 는 실 fetch 완료까지 유지 (겹침 0)

- `ci-background.mjs` 재작성: `setTimeout` 은 `latest = {error:'deadline …'}` 만 쓰고 `inFlight=false` 로 풀지 않음. 실 `fetchFn` 가 settle 할 때만 `inFlight=false`. 테스트 J-3: deadline 지나도 두 번째 start 는 `in-flight` 로 skip · maxActive=1.

### REQ3 — suspect_done 경로 `/tmp` 고정

- `ci-suspect.mjs` 에서 `os.tmpdir()` 제거 · `SUSPECT_DONE_TMP_DIR = '/tmp'` export · `join('/tmp', …)`. macOS `/var/folders/…` 라우팅 영향 없음. 테스트 J-4.

### REQ4 — 기록 범위 · 분류 · fork · 옛 jsonl 삭제

- `ci-health.mjs` completed runs 쿼리 `created=>=` → `updated=>=` (오래 걸린 run 누락 방지).
- queued run 분류: run 당 jobs 호출로 `job.labels` 분석 (`classifyFromJobs`) → light/heavy/cloud 로 라우팅. labels 못 가져오면 fallback heavy.
- `DEFAULT_REPOS = ['CuriocityDevAi/storeport', 'CuriocityDevAi/agilo-medusa-pos-fork']` (옛 `KyuuuLee/storeport` 추측값 제거).
- fork 404 처리: 첫 실패에 1회 경고 발행 · `repoDailySkip.set(repo, todayWibStr)` · 그날 재조회 스킵. `repos_skipped` 에 노출. 테스트 J-5/5b.
- `status/ci/2026-11-19.jsonl` (옛 형식 35 줄) 삭제.

### REQ5 — 테스트

- `node --test scripts/test/*.test.mjs` → **154/154 pass** (기존 143 + 신규 11: I-2b 갱신 + J-1~J-8).
- 신규 커버: J-1 min-interval gate · J-1b off · J-1c 소스 상수 · J-2 run id 캐시 · J-3 겹침 0 · J-4 /tmp 리터럴 · J-5/5b fork 404 daily skip · J-6 budget overflow · J-7 updated=>= · J-8 queued jobs 분류.

## 비용 상수 확인

`CLOUD_COST_PER_MIN_USD = 0.008` (`ci-history.mjs`). "estimate" 명시(`CLOUD_COST_NOTE`) 유지.

## 범위 밖 · 미실행

- Kyu 폴더 수정 없음.
- 러너 재설치 미실행 (아래 1줄로 Kyu 수동 적용).

## 머지 후 Kyu 1줄 (러너 재설치)

```
cd ~/projects/curiocity-relay && git pull && bash scripts/hub-runner-uninstall.sh && TARGET=hub-runner-v7.5.mjs FALLBACK=hub-runner-v7.4.mjs bash scripts/hub-runner-install.sh && tail -n 20 ~/.hub-runner/launchd.err.log
```
