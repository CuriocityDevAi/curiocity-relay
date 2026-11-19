relay PR #8 · 원인 completed-runs jobs 반복 호출(최대 40×~600ms=~24s) · 상태 조회 ~4s · 기록 분할 O · partial O · 테스트 161/161 · --once ~24s

## 원인 분석

`fetchCiHealth` 가 completed run 기록 조회 시 모든 run 에 대해 개별 jobs API call 을 순차 실행:
- storeport: completed runs 목록 1회 + run당 jobs 1회 = 최대 ~39 calls
- 각 call ~600ms → 총 ~24s → runner deadline 30s 에 빈발 충돌

## Per-call ms 표 (before)

| 호출 종류 | 건수 | 합계 |
|---|---|---|
| state (queued/in_progress/runners) | ~6 | ~3-4s |
| completed runs 목록 | 1-2 | ~2.2s |
| completed runs jobs (각 run별) | 최대 38 | ~21s |
| **합계** | **40** | **~27.5s** |

## Per-call ms 표 (after)

| 호출 종류 | 건수 | 합계 |
|---|---|---|
| state (queued/in_progress/runners) | ~6 | ~4.2s |
| history (completed runs 목록 + jobs, N≤10/repo) | ≤22 | ~15-20s |
| **합계** | **≤28** | **~24s** |

## 변경 내용 (scripts/lib/ci-health.mjs)

1. **Phase 분리**: `collectStateForRepo` (queued/in_progress/runners) → 항상 먼저 실행 · ≤STATE_DEADLINE_MS=10s 목표. `collectHistoryForRepo` (completed jobs) → 남은 시간/budget 에서만 실행.
2. **History cap**: `HISTORY_MAX_RUNS_PER_CALL=10` — invocation 당 최대 10 run 처리 (jobs API call 10개 상한). 나머지는 다음 호출로 defer.
3. **Cursor**: `.cache/ci-history-cursor.json` — 첫 실행 최근 2시간 since · 이후 last `completed_at` 에서 재개. `getHistorySince()` / `updateHistoryCursor()` export.
4. **Partial flag**: `overallDeadlineMs`(기본 30s) 초과 시 `ci.partial:true` 설정. 상태 블록은 반드시 보존.
5. `.gitignore`: `.cache/ci-history-cursor.json` 추가 (runtime-local state).

## 새 테스트 (scripts/test/ci-health-k.test.mjs)

- K-1: 25 completed run → jobs call ≤10 검증
- K-2 / K-2b / K-2c: cursor 없을 때 ~2h · cursor 있을 때 재개 · updateHistoryCursor 최신 timestamp
- K-3 / K-3b: overallDeadlineMs 짧게 → partial=true · 상태 보존 · fast path → partial 없음
- K-4: state API calls 항상 history 보다 먼저 발생

## 미완료 사항

없음. 모든 REQ 항목 구현 완료.
