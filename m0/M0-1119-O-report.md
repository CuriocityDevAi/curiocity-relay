relay PR #8 갱신 · 커서 min(created) O · long/short 회귀 O · timeout clamp O · 테스트 175/175 · --once 19.45s

# M0-1119-O — relay PR #8 R0 재리뷰 CHANGES

- 브랜치: `fix/M0-1119-K-ci-deadline` · HEAD `a173efe17` (직전 `4fc3f4541`)
- 리뷰 근거: `r0-cloud/R0C-1119-V-report.md` CHANGES ② 의 재현 시나리오
- 접근: scripts/lib/ci-health.mjs + scripts/test/ci-health-k.test.mjs 만 수정 · 러너 본체·재설치 불변

## ② 재현 시나리오 재발 원인

| 시각 | 사건 |
|---|---|
| tick1 | `long` run (T-40m 생성·진행 중) + `short` run (T-35m 생성·T-30m 완료) · 기록 = short · 커서 = `max(completed_at) = T-30m` |
| tick2 | long 이 완료돼도 `created=>=T-30m` 필터가 long (T-40m 생성) 을 제외 → `jsonl_added=0` 영구 누락 |

## 수정 요지 (REQ 대사)

| REQ | 수정 |
|---|---|
| 1 커서 = min(처리 max created, 상태 min active created) + seen-set 중복 방지 | `collectCompletedJobs` 가 `latestProcessedRunCreatedAt` 반환 · `collectQueued`/`collectInProgress` 가 `runCreatedAts` 반환 · `collectStateForRepo` 가 `activeRunCreatedAts` 로 모으고 `fetchCiHealth` 가 `minActiveByRepo` 를 계산해 `min(latestProcessedRunCreatedAt, activeMin)` 로 커서 전진 (partial 경로는 기존 `earliestUnprocessed` 그대로) |
| 2 (nit) execFile timeout = min(남은 시간, 10s) | `computeExecTimeoutMs(deadlineAt, maxMs=10s)` 추가 · `defaultExecFn` 을 `makeDefaultExecFn(deadlineAt)` 로 교체 · 남은 시간 ≤ 0 이면 호출 거부 (`throw`) · 기존 `deadlineExceeded` 앞단 검사와 이중 안전망 |

## 회귀 테스트 (총 7개 신설 · 175/175 pass · 7.1s)

- **O-1a** long/short 겹침 — tick1 cursor ≤ long.created_at + tick2 에 long 기록 (직접 회귀)
- **O-1b** completed 만 — cursor = max 처리 run.created_at
- **O-1c** active 만 — cursor = min active.created_at (active1 T-55m vs active2 T-20m)
- **O-2a** `computeExecTimeoutMs` 3s 남음 → ≈3000ms
- **O-2b** 30s 남음 → 10_000ms cap
- **O-2c** deadline 지남 → 0 (호출 거부)
- **O-2d** deadline null → 10_000ms

## 실측

- `node --test scripts/test/*.test.mjs` → tests 175 · pass 175 · fail 0 (7.13s)
- `node scripts/lib/ci-health.mjs --once` → real 19.45s · jsonl_added=17 · partial=true (내부 20s 마감 근처 수렴)

## 커밋 · push

- 커밋: `a173efe17 fix(ci-health): M0-1119-O R0 재리뷰 CHANGES — 커서 min(created) · timeout clamp`
- push: `fix/M0-1119-K-ci-deadline` origin 완료 (4fc3f4541..a173efe17)
- 머지 없음 · R0 재평가 대기

## 남은 참고 (범위 밖)

- R0 V ③ 의 "per_page=100 첫 페이지만" 주의는 변경하지 않음. 이번 범위 (REQ1+nit) 외 요구로 Kyu 판단 영역. 필요 시 다음 티켓.
