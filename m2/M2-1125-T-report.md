PASS

## M2-1125-T — 비동기 수집 · 데이터 원점 타이머 수정

**작업 브랜치**: `feat/M2-1125-S` 위에 이어서 (`feat/M2-1125-T` 로 커밋 준비 완료, 미push)
**측정 일시**: 2026-11-25

---

## 수정 내용 요약

### Bug 1: 데이터 고착 (data stale)

**원인**: `_fs.fetchedAt`는 `git fetch` 시작 시각에 세팅됨. 그런데 헤더가 이 값으로 "N초 전 fetch"를 계산해, 화면에 표시된 데이터와 실제 fetch 완료 시각이 불일치. fetch 후 sha가 바뀌어도 재수집·재렌더 경로가 없어 화면 데이터가 stale 상태 유지.

**수정**:
- `buildExtendedViewAsync` 반환 시 `dataOrigin.builtAt = Date.now()` 세팅
- `renderDataOriginLine`: `builtAt` 기반 경과 시간 "Ns 전" 표시 (fetch 시각 아님)
- `runScheduledTick`: fetch 완료 후 `cachedView?.dataOrigin?.sha` vs `getDataOrigin().sha` 비교 → 변경 시 `collectViewAsync` 재호출

### Bug 2: 스피너 끊김 (event loop blocking)

**원인**: `buildExtendedView`(sync)가 `execFileSync` git 호출 (200-500ms) + `execSync` gh 호출 (최대 5000ms)로 이벤트 루프 차단 → 120ms spinner 타이머 미발화.

**수정**:
- `sources-git.mjs`: `gitShowTextAsync`, `gitListPathsAsync`, `gitCatFileBatchAsync`, `readAllJsonGitAsync`, `readClaimGitAsync`, `scanClaimsDirGitFastAsync` 비동기 버전 추가
- `collect-view.mjs`: `defaultFetchPrStateAsync`, `fetchGhForkRunsAsync`, `buildExtendedViewAsync` 추가 (모든 git/gh 호출 비동기)
- `ci-watch-v2.mjs`: `collectViewAsync`, `tickFastAsync`, `runScheduledTick` async로 전환; spinner timer는 별도 `setInterval` 유지

---

## 실측 로그

### (a) SHA 변경 → 허브 `└` 실행줄 출현

**시뮬레이션** (bare origin + clone 구조):
```
Initial SHA: 5dc4695  (m0.current=null)
New SHA:     a08428c  (m0.current="M0-1125-SIM-A", claim.state="started") — t=8s에 push

--once BEFORE:  └ 없음 ✓ (기대 동작)
--once AFTER:   └ ⠋ M0-1125-SIM-A  작업 0분 ✓
                ● M0-1125-SIM-A m0  ●◐○○○○○○○  작업    0분
```

**fetch 감지** (`--measure=65s`):
```
t=0s   fetch sha changed: null → 5dc4695
t≈30s  fetch sha changed: 5dc4695 → a08428c  ← 새 커밋 감지
t≈30s  collect sha changed: 5dc4695 → a08428c ← 재수집 트리거
```

### (b) 스피너 프레임 간격 실측

**시뮬레이션** (`--measure=65s`):

| 항목 | 실측 |
|------|------|
| spinnerCount | 537 (65s) |
| p95 간격 | 122ms |
| 70-170ms 범위 | **100%** |
| missed frames | 0 |
| avgCollectMs | 70ms |

**실제 릴레이** (`--measure=180s = 3분`):

| 항목 | 실측 |
|------|------|
| spinnerCount | 1480 (180s) |
| p95 간격 | **122ms** ✓ |
| 70-170ms 범위 | **99.9%** ✓ (기준 ≥95%) |
| missed frames | **1** (1480 중) |
| avgCollectMs | 287ms (비차단) |

### (c) 3분 git/gh 프로세스 수

**실제 릴레이 (`--measure=180s`)**:

| 항목 | 수 |
|------|-----|
| git fetch (maybeGitFetchAsync) | 6회 |
| collect 호출 | 60회 |
| gitProcCount 추정 | **186** (6 + 60×3) |
| sha 변경 감지 | 2회 (null→7f7d800 초기 + 수집) |

---

## 수정 전/후 비교

| 항목 | 수정 전 (M2-1125-S) | 수정 후 (M2-1125-T) |
|------|------|------|
| 데이터 수집 | `buildExtendedView` (동기, execFileSync) | `buildExtendedViewAsync` (비동기, spawn/execFile) |
| 이벤트 루프 | 차단 (200-500ms/틱) | 비차단 (async) |
| 스피너 p95 | ≫ 120ms (freeze 보고) | 122ms ✓ |
| 헤더 "N초 전" | fetch 시작 시각 기반 (오해 소지) | 데이터 빌드 시각 기반 (정확) |
| SHA 변경 → 재수집 | 없음 | fetch 후 SHA 비교 → 재수집 |
| 허브 `└` 실행줄 | 새 클레임 커밋 후 미갱신 | SHA 변경 시 재수집 → 즉시 반영 ✓ |

---

## 테스트

```
node --test scripts/test/ci-watch-s.test.mjs scripts/test/ci-watch-t.test.mjs
# tests 12 / pass 12 / fail 0
```

**신규 테스트** (ci-watch-t.test.mjs):
- T-sha-1: `buildExtendedViewAsync` → `dataOrigin.builtAt` 필드 존재
- T-sha-2: `renderV2` → "Ns 전" 형식 (builtAt 기반)
- T-sha-3: `renderV2` → `builtAt` 없을 때 `ageSec` 폴백
- T-async-1: `buildExtendedViewAsync` → allJson 오버라이드 정상 뷰
- T-async-2: `skipGh=true` → PR API 미호출

---

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/watch/sources-git.mjs` | async git 읽기 함수 추가, `resetFetchGuard` export |
| `scripts/watch/collect-view.mjs` | `buildExtendedViewAsync` 추가, async gh 래퍼 |
| `scripts/watch/pipeline-view.mjs` | `claimCacheOverride` 파라미터 (async 경로 gitCatFileBatch 건너뜀) |
| `scripts/watch/render-v2.mjs` | `renderDataOriginLine` builtAt 기반 live age |
| `scripts/ci-watch-v2.mjs` | collectViewAsync, tickFastAsync, runScheduledTick, --measure 모드 |
| `scripts/test/ci-watch-t.test.mjs` | 신규 테스트 5건 |

**커밋 준비 완료. push 승인 없이 대기.**
