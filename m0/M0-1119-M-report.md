relay PR #8 갱신 · 내부마감 20s · 호출전 검사 O · 커서 created · repo별 · repo 표시 O · 테스트 168/168 · --once 20.88s

## 범위
- 브랜치: `fix/M0-1119-K-ci-deadline` (PR #8 에 이어서 커밋)
- 수정 파일:
  - `scripts/lib/ci-health.mjs`
  - `scripts/test/ci-health-k.test.mjs`
  - `scripts/test/ci-health.test.mjs`

## R0 CHANGES 반영

### REQ1 — 내부 마감 < background · 매 API 호출 전 남은 시간 검사
- `DEFAULT_OVERALL_DEADLINE_MS = 20_000` (background 30s 보다 짧게 · 외부 timer 가 먼저 터져 state 가 날아가는 재발 경로 차단).
- `fetchCiHealth` 에서 `const deadlineAt = startMs + overallDeadlineMs` 계산, 모든 수집 함수에 전달.
- `collectCompletedJobs` / `collectInProgress` / `collectQueued` **run 루프 안**에서 **매 API 호출 직전** `deadlineExceeded(deadlineAt)` 검사 · 넘기면 그 자리에서 partial 반환.
- 회귀 테스트 M-1: 각 jobs 호출 60ms × 10 run (총 600ms) · `overallDeadlineMs=500` · 실측 elapsed < 1.2s · `partial=true` · state 보존 확인.

### REQ2 — 커서: `created=>=` · repo 별 · maxRuns 상한에서 earliest 미처리 앞까지만 전진
- List workflow runs 필터를 `updated` → `created` 로 교체 (`&created=>=` · 정상 동작하는 공식 필터).
- 커서 포맷을 **per-repo map** 으로 변경: `{ "<repo>": "<iso>" }` (back-compat: 옛 단일 키 `last_completed_at` 자동 흡수 후 새 쓰기 시 삭제).
- API: `getHistorySince(repoRoot, repo)` · `updateHistoryCursor(repoRoot, repo, records)` · 신규 `setHistoryCursor(repoRoot, repo, iso)`.
- `collectCompletedJobs` 는 runs 를 `created_at` 오름차순으로 정렬 후 처리 · maxRuns / deadline / budget 에 걸려 skip 된 가장 오래된 run 의 `created_at` 을 `earliestUnprocessed` 로 반환.
- 커서 갱신 전략: partial 이면 `setHistoryCursor(earliestUnprocessed)` 로 clamp (오래된 run 영구 누락 금지) · 아니면 `updateHistoryCursor(records)` 로 max completed_at 전진.
- 테스트: M-2a (`created=>=` URL) · M-2b (per-repo 분리) · M-2c (상한 clamp).

### REQ3 — oldest_queued_pr / alert 에 repo 표시 · queued 판정은 미완 job 기준
- 신규 `repoShort(repo)`: `CuriocityDevAi/storeport` → `storeport` · `agilo-medusa-pos-fork` → `fork`.
- queued/in_progress 엔트리에 `pr_display = "<short>:<pr_or_branch>"` 추가.
- `heavy.oldest_queued_pr` / `light.oldest_queued_pr` 가 `pr_display` 사용 (예: `fork:ci/M2-1119-J-one-heavy`).
- `queue_wait` / `long_job` / `runner_idle` / `light_wait` alert detail 에 repo 표시.
- `collectQueued` 에서 jobs 응답의 **완료되지 않은 job 만** kind 분류 + `queued_min` 기준 (완료된 prior-stage job 의 created_at 로 대기 시간 부풀리는 버그 제거). 모든 job 이 완료 상태면 queued 통계에서 제외.
- 테스트: M-3a (fork 접두 + alert detail) · M-3a-repoShort (유닛) · M-3b (완료 job 제외 · 미완 job 의 created_at 로 queued_min).

## 검증
- `node --test scripts/test/*.test.mjs` → **168/168 pass** (베이스 161 + 신규 7 · K 파일 내 K-/M- 분리).
- `time node scripts/lib/ci-health.mjs --once` → 실측 **20.88s** · `partial=true` 로 20s 내부 마감에 정확히 걸림 · background 30s 전에 반환 · state 블록 모두 채움.
- 실 데이터 출력 예: `oldest_queued_pr: "storeport:#398"` (repo 표시 적용) · `api_calls: 14` · `partial: true` (history 분할 중).

## 커밋
- `fix(ci-health): M0-1119-M R0 CHANGES — 내부 20s deadline · created cursor per-repo · repo 접두` (push 완료 · 머지 금지).
