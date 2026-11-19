R0 판정: CHANGES

# R0C-1119-Y — curiocity-relay PR #8 3차 리뷰 (M0-1119-O 수정분)

- 대상: PR #8 HEAD a173efe1 (fix/M0-1119-K-ci-deadline) · 직전 R0C-1119-V CHANGES
- 테스트: `node --test scripts/test/*.test.mjs` → tests 175 · pass 175 · fail 0 (8.5s)
- PR 코멘트: https://github.com/CuriocityDevAi/curiocity-relay/pull/8#issuecomment-7008142187
- 모의 실험: 가짜 GitHub(created>= 필터·status 필터·최신순 100개)를 execFn 으로 넣고, 기본 execFn 은 PATH 에 가짜 `gh` 를 두고 실측 (리포에는 넣지 않음)

## 1. V 수정 확인
| 항목 | 결과 |
|---|---|
| V long/short (비-partial 경로) | **해결**. tick1 jsonl_added=1 · 커서 = long.created_at · tick2 long 완료 후 jsonl_added=1 (long 기록) |
| timeout clamp | **해결**. 가짜 gh 호출당 지연 4.9/6.7/9.9/9.99/15/40s → 전체 20.00 / 20.01 / 20.00 / 20.01 / 10.01 / 10.01s. 30s background 마감보다 항상 ~10s 일찍 끝남 |

## 2. 새로 찾은 누락 경로 (CHANGES 사유)
**partial 경로가 activeMin 을 무시함.** `partial && earliestUnprocessed` 이면 커서 = earliestUnprocessed 만 사용.

| tick | 상황 | 결과 |
|---|---|---|
| 1 | long T-40m 진행 중 · short 12개 (T-35m~T-24m 생성, 완료) · 상한 10 | jsonl_added=10 · partial · 커서 = T-25m (long 생성 시각보다 뒤) |
| 2 | long 완료 | jsonl_added=2 (남은 short) · long 은 `created>=T-25m` 에 걸려 조회 안 됨 |
| 3 | — | jsonl_added=0 · long 영구 누락 |

heavy-mac 긴 run 동안 light run 이 10개 넘게 쌓이는 경우라서 실제로 일어날 수 있음.
수정안: partial 경로도 `커서 = min(earliestUnprocessed, activeMin)`. 이 시나리오를 회귀 테스트로 추가.

## 3. 부차 · nit
- (부차) state 단계가 10s(STATE_DEADLINE_MS) 를 넘기면 루프가 멈춰 뒤쪽 repo 의 state 를 못 보는데, history 는 그 repo 도 돔 → activeMin 이 없어 커서가 진행 중 run 너머로 감. 재현: storeport queued 호출 10.2s 지연 → fork 커서 = short.created_at > long.created_at → tick2 jsonl_added=0 (long 누락). 현재 실측 `--once` 가 19.45s · partial 이라 실제로 생길 수 있음. 권장: state 를 못 본 repo 는 비-partial 커서 전진 생략.
- (nit) clamp 로 kill 된 gh 호출은 partial 이 아니라 `Command failed` error 로 올라옴 → 지연 6.7~9.99s 에서는 결과 전체가 `{error}` (queued 데이터도 잃음). 다음 티켓으로 미뤄도 됨.
- (참고) per_page=100 첫 페이지 문제는 그대로 (O 리포트에서 범위 밖으로 둠). 커서가 오래 멈춘 queued run 에 묶이면 더 쉽게 발생.

## 4. 회귀 확인 (T·V 해결 항목)
- partial (K-3 · M-1) · repo 표시 (M-3a · repoShort) · 완료 job 제외 (M-3b) · repo 별 커서 (M-2b/c) 테스트 통과.
- 러너 본업 분리: PR 변경 파일 = .gitignore · ci-health.mjs · ci-health-k.test.mjs · ci-health.test.mjs. hub-runner-v7.5 / ci-background 미변경 · fireCi fire-and-forget · in-flight · 5분 간격 (I-2b · J-1 · J-3) 그대로.
- jsonl 은 job id 로 중복 제거되므로 커서를 created_at 로 당겨 다시 조회해도 중복 기록 없음. 러너 재시작 시 seen-set 이 비어 jobs 재조회가 늘 뿐 (호출당 상한 10).

금지 준수: PR 브랜치 push · 머지 없음.
