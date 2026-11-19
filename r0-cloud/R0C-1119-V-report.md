R0 판정: CHANGES

# R0C-1119-V — curiocity-relay PR #8 재리뷰 (M0-1119-M 수정분)

- 대상: PR #8 HEAD 4fc3f45 (fix/M0-1119-K-ci-deadline) · 직전 판정 R0C-1119-T 의 CHANGES 3건
- 테스트: `node --test scripts/test/*.test.mjs` → tests 168 · pass 168 · fail 0 (8.5s)
- PR 코멘트: https://github.com/CuriocityDevAi/curiocity-relay/pull/8#issuecomment-7007564695
- 모의 실험: fetchCiHealth 에 가짜 execFn 을 넣어 직접 실행 (리포에는 넣지 않음)

## CHANGES 3건 확인
| # | 항목 | 결과 |
|---|---|---|
| ① | 내부 마감 < background 마감 · 매 호출 전 검사 | **해결**. 기본 마감 20s. jobs 호출 1회 3s × 15개 → 21.0s 에 partial:true 로 반환. 최악의 경우(19.8s 에 호출 시작, 9.9s 소요)는 29.7s → 여유 0.3s (nit) |
| ② | 커서 created · repo 별 · 상한 시 partial | **일부만 해결 · 새 누락 경로 생김**. repo 별 커서와 상한 시 partial 은 OK(커서 = 처리 못 한 가장 오래된 created_at, tick2 에서 남은 4건 처리). 하지만 partial 이 아닐 때 커서 = 처리한 job 의 최대 **completed_at** 이고 필터는 `created=>=` → 그 시각보다 먼저 생성되어 진행 중이던 run 이 영구 누락됨 |
| ③ | repo 표시 · 완료 job 제외 | **해결**. 완료 job 은 kind 분류에서 빠지고, 대기 시간은 남은 job 의 created_at 기준. alert 3종과 oldest_queued_pr(heavy/light)에 `fork:` 같은 repo 접두가 붙음 |

## ② 재현
- long run: T-40m 생성 · 진행 중 / short run: T-35m 생성 · T-30m 완료
- tick1: short 를 기록, 커서 = T-30m (long 생성 시각보다 뒤)
- tick2: long 이 완료돼도 `created>=T-30m` 이라 조회되지 않음 → jsonl_added=0 (영구 누락)
- 실제로는 긴 heavy-mac run 과 짧은 light run 이 겹치면 자주 생기는 상황.

## 수정안
1. 커서 = min(처리한 run 의 최대 **created_at**, 상태 단계에서 본 queued/in_progress run 의 최소 created_at). seen-set 이 중복을 막아 줌. 위 long/short 시나리오를 회귀 테스트로 추가.
2. (nit) 남은 시간 < PER_REPO_TIMEOUT_MS 이면 호출하지 않거나 execFile timeout = min(남은 시간, 10s).
3. (부차) per_page=100 첫 페이지만 보므로 커서 이후 run 이 100개를 넘으면 오래된 쪽이 빠짐 → 페이지를 더 넘기거나 partial 로 표시.

## 러너 본업 회귀
- 이 PR 은 러너 파일을 건드리지 않음(변경 = ci-health.mjs · 테스트 2개 · .gitignore).
- v7.5 fireCi 는 fire-and-forget · ci-background 의 in-flight 가드 · 5분 간격 그대로. 동기 fs 는 작은 커서 JSON 읽기/쓰기뿐 → 큐 실행·claim 을 막지 않음. OK.
