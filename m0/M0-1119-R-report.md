relay PR #8 갱신 · (a) O · (b) O · 회귀 2/2 · 테스트 179/179 · --once 20.1s

# M0-1119-R — relay #8 R0 4차 AA CHANGES 수정 보고 (2026-11-19 · M0 허브)

- 대상 PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/8 (fix/M0-1119-K-ci-deadline)
- 이전 리뷰: R0C-1119-AA (CHANGES · §2-1 state 못 본 repo · §2-2 jobs 조회 실패 run)
- HEAD: `36dcb40d6` (push 완료 · 머지 안 함)
- 변경 파일: `scripts/lib/ci-health.mjs` · `scripts/test/ci-health-k.test.mjs` (범위 준수)
- 러너 본체 · 재설치 · 다른 파일 미변경. `status/ci/*.jsonl` 은 `--once` 실측 중 생성된 부수물이라 커밋에서 제외.

## 수정 요지

### (a) AA §2-1 — state 를 끝까지 못 본 repo 는 history cursor 전진 생략
- `scripts/lib/ci-health.mjs` history 루프 안쪽:
  - `stateResultByRepo = new Map(stateResults.map(sr=>[sr.repo, sr]))`.
  - 해당 repo 의 `sr` 가 `!sr || sr.error || sr.skipped || sr.partial` 면 `setHistoryCursor` 호출을 건너뜀.
  - 기록(`completedRecords.push`) 은 그대로 수행 → seen-set 이 중복 방지.
- 재발 차단: fork state 를 못 보면 fork 의 long(진행 중) run 이 `minActiveByRepo` 에서 빠짐 → 직전 구현은 cursor 를 short(완료) created_at 너머로 올려 다음 tick 에 `created>=` 필터로 long 영구 누락. 이제는 cursor 유지 → 다음 tick 에 재조회.

### (b) AA §2-2 — collectCompletedJobs jobs 조회 실패 run 을 unprocessed 로
- `scripts/lib/ci-health.mjs` `collectCompletedJobs` catch 블록:
  - `// retry next tick` 주석만 → `noteUnprocessed(run); break;`.
- runs 오름차순(`created_at`) 처리라 break 시점의 실패 run 이 `earliestUnprocessed` 로 기록 → cursor ≤ 실패 run.created_at.
- 다음 tick 에 `created>=실패 run.created_at` 로 재조회. timeout clamp 로 마감 직전 kill 되는 gh 호출도 동일 경로.

## 회귀 테스트 (`scripts/test/ci-health-k.test.mjs`, 신규 3건)

| # | 이름 | 재현 시나리오 | 결과 |
|---|---|---|---|
| R-1 | AA §2-1 | fork queued throw (sr.error) + long(T-40m, in_progress) + short(T-30m, completed) → tick1 cursor 미설정 (state 못 봄) · tick2 long 완료 후 `jsonl_added=1` | PASS |
| R-2 | AA §2-2 | A(T-40m, jobs throw) + B(T-30m, jobs OK) → tick1 `jsonl_added=0 · partial=true` · cursor ≤ A.created_at · tick2 A jobs 정상 → `jsonl_added=2` | PASS |
| R-3 | nit (collectInProgress mid-break) | apiBudget=2 로 state partial 유도 → storeport cursor 미설정 (REQ(a) 효과) | PASS |

### 실측 명령
```
node --test scripts/test/ci-health-k.test.mjs      # 25/25 pass
node --test scripts/test/*.test.mjs                # 179/179 pass (7.1s)
node scripts/lib/ci-health.mjs --once              # 20.1s · partial=true · jsonl_added=1 · api_calls=27/40
```

## 남은 nit (후속 티켓 — PR 본문 후속 목록 후보)

1. per_page=100 첫 페이지만 조회 (M-P 범위 밖, 그대로).
2. `waiting` / `pending` / `requested` 상태 run 은 queued·in_progress 조회에 안 잡혀 activeMin 에서 빠짐 (environment 승인 대기 등).
3. clamp kill 이 `Command failed` error 로 올라오는 문제 (Y nit 그대로) — 다만 (b) 가 unprocessed 로 표시해 cursor 는 안전.

## 금지 준수
- PR 브랜치 push · 머지·force 없음.
- Kyu 폴더 수정 없음.
- 러너 본체 (`scripts/ci-background.mjs` 등) · `install.sh` 미변경.
