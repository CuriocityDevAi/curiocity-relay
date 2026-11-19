R0 판정: CHANGES

# R0C-1119-T — curiocity-relay PR #8 (M0-1119-K · ci-health deadline 분할)

- 대상: PR #8 HEAD 670e68e · 변경 = `scripts/lib/ci-health.mjs` · `scripts/test/ci-health-k.test.mjs` · `.gitignore`
- 테스트: `node --test scripts/test/*.test.mjs` → tests 161 · pass 161 · fail 0 (8.4s)
- PR 코멘트: https://github.com/CuriocityDevAi/curiocity-relay/pull/8#issuecomment-7006762355

## 검토 포인트
(a) partial: 내부 로직상 상태 → 기록 순서와 `partial:true` 는 맞음. **하지만 끝에서 끝까지는 보장 안 됨**: 내부 `overallDeadlineMs` 30s = `ci-background` 마감 30s. 마감 검사는 repo 사이에서만 하고, run 안 jobs 호출(개당 최대 10s × ≤10)에는 검사가 없음 → 30s 를 넘기면 background 가 `deadline 30000ms` 로 덮고, 늦게 온 결과는 버려짐(`deadlineTriggered`). 원래 증상이 재발할 수 있음.
(b) 호출 수: run 10개 상한 + seen-set 으로는 줄어듦. 커서는 실효 없음 — List workflow runs 문서상 `updated` 필터는 없음(`created` 만 지원)이라 무시되는 것으로 판단. 커서 = 처리한 records 의 최대 completed_at · 두 repo 공용이라, 필터가 실제로 걸리면 상한 밖의 오래된 run 은 영구 누락됨. 추정 호출 수 = 12회/h × 12~40 ≈ 150~480/h (한도 5000/h 안).
(c) 러너 분리: tick 은 `fireCi()` fire-and-forget · in-flight 가드 · 5분 간격 · execFile async → 본업을 막지 않음. OK.
(d) 211m: **계산은 맞음**. 대상은 fork `agilo-medusa-pos-fork` run 44476507188(07:02:02Z 생성, 같은 브랜치 `ci/M2-1119-J-one-heavy`)의 heavy-mac job(라벨 curiocity-mac)으로, 07:02:14Z 부터 queued(10:33Z 기준 211m). storeport 의 10:21Z run 은 in_progress 상태로 heavy.in_progress(#394) 에 정상 집계됨. 문제는 표시: repo 표기가 없고, fork run 은 pull_requests 가 비어 있어 브랜치명만 나와 오인하게 됨. 부차: 대기 시간 기준이 run.created_at 이고, kind 를 분류할 때 완료된 job 도 포함됨.

## CHANGES
1. 내부 마감 < background 마감(예: 20s), run 루프 안에서 매 호출 전에 남은 시간 검사 — 또는 background 가 마감 뒤에 온 결과도 반영하도록. 회귀 테스트 추가.
2. 커서: `created` 로 바꾸거나 제거. 유지한다면 repo 별로 두고 처리 못 한 run 앞에서 멈추게 하며, 상한에 걸리면 partial:true.
3. alert·oldest_queued_pr 에 repo 표시. 선택: queued 판정·대기 시간은 완료되지 않은 job 의 created_at 기준으로.

참고: fork run 44476507188 은 curiocity-mac 러너가 fork 에 없어 보임 → cancel 하거나 러너를 등록할지 사람이 판단해야 함.
