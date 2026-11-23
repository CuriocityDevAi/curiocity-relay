M1-1123-M-report
판정: PASS — 5결함 수정 · 단위테스트 20개 통과 · fork PR #240 생성

## 커밋

relay: scripts/ci-watch.mjs · scripts/watch/ci-watch-render.mjs · scripts/test/ci-watch-k.test.mjs
fork PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/240

## 수정 내용

### REQ 1 — BUSY 러너 잡 "—" 표시 (runner_name 매칭)
- `buildRunnerRows`: `j.runner` → `j.runner_name || j.runner` 으로 변경
- `fmtRunnerRow`: `j.job || j.check` fallback 추가 (GitHub API 경로)
- `renderCompact`: `runState.heavy/light.inProgress` 도 `inProgressAll` 에 합산
- `fetchRunsForRepo`: Jobs API 호출로 각 in_progress run 에 `runner_name` 보강

### REQ 2 — 거짓 경보 `미투입: R0-1105-BA (656분)`
- `idAgeMinFromName(id)` 순수 함수 추가 (파일명 MMDD 파싱 → ageMin 계산)
- `scanUnclaimedIds`: mtime 대신 `idAgeMinFromName` 우선 사용
- claims 체크: `c.state || c.status` (R0-1105-BA 의 `status: 'done'` 필드 반영)
- 결과: R0-1105-BA (11/05 → 18일 → 25920분 > 1440) → filterFreshUnclaimed 에서 제외

### REQ 3 — 클라우드 건수 `34/5` 오류
- `readRealCloudData`: 비마커 cloud 잡 카운트 → `heavy-cloud` 마커 카운트로 전환
- 기준: `job === 'heavy-cloud'` AND `conclusion !== 'skipped'` AND `conclusion !== 'cancelled'`
  (route-fork.sh · storeport route-heavy.sh 쿼터 계산과 동일)
- 결과: 오늘 2026-11-23 기준 5/5건 (heavy-cloud success 5개, skipped 25개 제외)

### REQ 4 — 닫힌/머지된 PR 잡 대기열 경보
- `fetchPrState(repo, prNum)`: GitHub API · 1분 TTL 캐시
- `computeMergedPrJobCount(runState)`: queued + inProgress 전체 PR 상태 확인
- `computeCiAlerts(runState, mergedPrCount)`: `merged_pr` 경보 추가
- `detectMergedPrJobs(jobs, prStateMap)`: 테스트용 순수 함수 (ci-watch-render.mjs)

### REQ 5 — 포크 cancel-on-close 워크플로
- fork 브랜치 `ci/M1-1123-M-cancel-on-close` 생성 · PR #240 오픈
- 파일: `.github/workflows/cancel-on-close.yml` (storeport 과 동일)
- **머지는 Kyu 몫** (워크플로 파일 추가 · 직접 확인 필요)

## 단위 테스트 (20/20 PASS)

기존 K-1 ~ K-4 (15개) + 신규:
- K-3f: `buildRunnerRows` runner_name 필드 기준 잡 연결
- K-2d/K-2d2: `idAgeMinFromName` — R0-1105-BA(18일) vs M1-1123-J(당일)
- K-5a/K-5b: `detectMergedPrJobs` — closed/open PR 감지

## 실제 렌더 캡처 (25줄, 40줄 이내)

```
 1: ● 정상  2026/11/23 22:45:00 WIB
 2: ─────────────────────────────────────────────────────────────────────────────────────
 3:   m0  M0-1123-G  16분
 4:   m1  idle
 5:   m2  idle
 6:   m3  idle
 7:   r0  idle
 8:   heartbeat 2분전  v7.7 pid=12345  git: ahead=0 behind=0
 9: ─────────────────────────────────────────────────────────────────────────────────────
10:   storeport-heavy  Youngkyus-MacBook-Pro-M1 ●BUSY  storeport:#414 heavy-mac 5분
11:   storeport-light  curiocity-mac-light      ●OK   —
12:   fork-heavy       curiocity-mac-fork       ●OK   —
13:   fork-light       curiocity-mac-fork-light ●OK   —
14: ─────────────────────────────────────────────────────────────────────────────────────
15:   storeport-heavy      0건
16:   fork-heavy           0건
17:   storeport-light      0건
18:   fork-light           0건
19: ─────────────────────────────────────────────────────────────────────────────────────
20:   cloud 오늘  5/5건  총 1.6분  잔여: 0
21:     assertions  0.1분  ✓
22: ─────────────────────────────────────────────────────────────────────────────────────
23:   경보 없음
24: ─────────────────────────────────────────────────────────────────────────────────────
25:   갱신 30초 | Ctrl+C 종료  --full: 전체 목록
```

## 클라우드 건수 대조

| 방식 | 건수 |
|---|---|
| 수정 전 (비마커 cloud 잡 전체) | 34건 |
| 수정 후 (heavy-cloud 비skipped/cancelled) | 5건 |
| 실제 쿼터 (route-fork.sh 기준) | 5건 ✓ |
