R0 판정: CHANGES

# R0C-1119-AA — curiocity-relay PR #8 4차 리뷰 (M0-1119-P 수정분)

- 대상: PR #8 HEAD d0ca182e (fix/M0-1119-K-ci-deadline) · 직전 R0C-1119-Y CHANGES
- 테스트: `node --test scripts/test/*.test.mjs` → tests 176 · pass 176 · fail 0 (8.5s)
- PR 코멘트: https://github.com/CuriocityDevAi/curiocity-relay/pull/8#issuecomment-7008671576
- 모의 실험: 가짜 GitHub(status 필터 · created>= 필터 · 최신순 100개)를 execFn 으로 넣어 실측. 스크립트는 리포에 넣지 않음.

## 1. Y 수정 확인 — 해결
| tick | 상황 | 결과 |
|---|---|---|
| 1 | long T-40m 진행 중 · short 12개 (T-35m~T-24m 완료) · 상한 10 | added=10 · partial · 커서 = T-40m (long 생성 시각) |
| 2 | long 완료 | added=3 (long + 남은 short 2개) |
| 3 | — | added=0 · jsonl 13줄 · long(job 10) 기록 확인 |

## 2. 커서 경로 판독 — 남은 누락 (CHANGES 사유)
커서 후보 = [partial ? earliestUnprocessed : latestProcessedRunCreatedAt] + activeMin → min. partial/비-partial 두 경로 모두 activeMin 이 **있으면** 안전. 문제는 activeMin 이 없거나 earliestUnprocessed 가 실패한 run 을 놓치는 경우.

### 2-1. state 를 못 본 repo (Y §3 부차 · 미해결)
- state 루프가 `STATE_DEADLINE_MS`(10s) 를 넘기면 break → 뒤쪽 repo 는 stateResults 에 없음. non-404 error 난 repo 도 aliveState 에서 빠짐. 둘 다 `minActiveByRepo` 에 없음.
- history 루프는 `repos` 전체를 돌기 때문에 그 repo 커서는 activeMin 없이 앞으로 감.
- 재현: storeport queued 10.2s 지연 · fork = long(T-40m 진행 중) + short(T-30m 완료)
  - t1: added=1 · partial · fork 커서 = T-30m
  - t2 (long 완료): added=0 → long 영구 누락
- `--once` 실측 19.5s (P 리포트) 라 실제로 생길 수 있음.

### 2-2. jobs 조회 실패한 완료 run
- `collectCompletedJobs` catch = `// retry next tick` 으로 continue 만 함. 실패한 run 을 unprocessed 로 표시하지 않음.
- 뒤 run 이 처리되면 latestProcessed 로, 뒤 run 이 deadline 으로 남으면 earliestUnprocessed 로 커서가 실패한 run 의 created_at 을 넘어감.
- 재현: A(T-40m) jobs throw · B(T-30m) 정상 → t1 커서 = T-30m → t2·t3 added=0 → A 영구 누락. 마감 직전 A 호출이 kill(throw) 되고 B 는 처리되는 변형도 같은 결과.
- O 의 timeout clamp 가 마감 직전 gh 호출을 kill 하므로 이 경로를 실제로 탐.

### 수정안
- (a) state 를 끝까지 못 본 repo (aliveState 에 없거나 `sr.partial`) 는 history 커서 전진 생략 (기록은 해도 됨 · seen-set 이 중복 막음).
- (b) catch 에서 `noteUnprocessed(run); break;` — 또는 실패한 run 중 가장 이른 created_at 을 커서 후보에 넣기.
- 두 시나리오(2-1 · 2-2) 를 회귀 테스트로 추가.

## 3. nit (막지 않음)
- per_page=100 첫 페이지만 조회 (O 리포트 범위 밖 그대로).
- `waiting` / `pending` / `requested` 상태 run 은 queued·in_progress 조회에 안 잡혀 activeMin 에서 빠짐 (environment 승인 대기 등). 
- `collectInProgress` 가 루프 중간에 break 하면 뒤 run 의 created_at 이 runCreatedAts 에 빠짐 → 수정안 (a) 의 `sr.partial` 조건으로 같이 해결.
- clamp kill 이 `Command failed` error 로 올라오는 문제 (Y nit) 그대로.

## 4. 회귀 확인
- 176 테스트 전부 통과 (K · M · O · P 포함). PR 변경 파일 = .gitignore · ci-health.mjs · ci-health-k.test.mjs · ci-health.test.mjs (러너 본업 파일 미변경).

금지 준수: PR 브랜치 push · 머지 없음.
