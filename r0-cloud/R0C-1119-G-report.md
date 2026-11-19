#383 PENDING · #384 PENDING · #385 FAIL · #386 PENDING · #388 PENDING · #389 PENDING · 조회 O

# R0C-1119-G — storeport 열린 PR 실제 CI 체크 표

- 출처: GitHub MCP `pull_request_read` / `get_check_runs` (perPage=100 · 모든 PR total_count ≤ 9 → 1페이지로 끝) + `actions_get` / `get_workflow_run`
- 조회 시각: 2026-11-19 (UTC · 체크 마지막 완료 시각 04:01:19Z 이후)
- 코멘트·리뷰 작성: 없음
- 시각은 모두 UTC. `—` = 미완료(completed_at 없음)

## 요약

| PR | 판정 | 근거 |
|---|---|---|
| #383 | PENDING | build-commerce-core · unit-commerce-core = queued · ci run 737 status=queued |
| #384 | PENDING | build-commerce-core · unit-commerce-core = queued |
| #385 | **FAIL** | `check` (feature-map-check 워크플로 run 44446099232) = failure · 추가로 unit-commerce-core queued · ci run 740 status=queued |
| #386 | PENDING | build-commerce-core · unit-commerce-core = queued |
| #388 | PENDING | build-commerce-core · unit-commerce-core = queued |
| #389 | PENDING | build-commerce-core · unit-commerce-core · customer-display = queued |

주의:
- 6개 PR 모두 `ci` 워크플로의 commerce-core job 이 queued 상태로 1시간 이상 정체 (02:43~03:53 생성). 러너 대기열 정체 가능성.
- `pos-integration` job 은 #385 에만 생성됨(build-commerce-core 완료 후 skipped). 나머지 PR 은 build-commerce-core 가 끝나지 않아 아직 생성 전 → 체크 목록에 없음.
- #385 의 pos-integration 은 build 성공 후 **skipped** — 실제 통합 테스트가 돌지 않았음(조건부 skip 으로 보임 · 원인 미확인).
- skipped 3종(wrangler-check-care-agent · customer-display · e2e-admin-loyalty)은 changes-filter 결과로 보이며 판정상 통과 취급.

## ci 워크플로 run 상태 확인 (`get_workflow_run`)

| PR | run | 워크플로 | status | conclusion |
|---|---|---|---|---|
| #383 | 44446084600 | ci | queued | — |
| #385 | 44446099298 | ci | queued | — |
| #385 | 44446099232 | feature-map-check | completed | **failure** |

나머지 PR 의 ci run 은 개별 조회 생략 — queued job 이 존재하므로 run 미완료가 자명.

## #383 (ci run 44446084600 · check = run 44446084617)

| 체크 | status | conclusion | 끝난 시각 |
|---|---|---|---|
| wrangler-check-care-agent | completed | skipped | 02:46:47 |
| customer-display | completed | skipped | 02:46:47 |
| e2e-admin-loyalty | completed | skipped | 02:46:47 |
| unit-commerce-core | queued | — | — |
| build-commerce-core | queued | — | — |
| changes-filter | completed | success | 02:46:47 |
| markers-and-forbidden | completed | success | 02:43:53 |
| check | completed | success | 02:43:25 |

판정: **PENDING**

## #384 (ci run 44446077513 · check = run 44446077497)

| 체크 | status | conclusion | 끝난 시각 |
|---|---|---|---|
| wrangler-check-care-agent | completed | skipped | 02:44:41 |
| e2e-admin-loyalty | completed | skipped | 02:44:41 |
| customer-display | completed | skipped | 02:44:41 |
| build-commerce-core | queued | — | — |
| unit-commerce-core | queued | — | — |
| markers-and-forbidden | completed | success | 02:44:40 |
| changes-filter | completed | success | 02:44:14 |
| check | completed | success | 02:41:27 |

판정: **PENDING**

## #385 (ci run 44446099298 · feature-map-check run 44446099232)

| 체크 | status | conclusion | 끝난 시각 |
|---|---|---|---|
| pos-integration | completed | skipped | 04:01:19 |
| e2e-admin-loyalty | completed | skipped | 02:47:14 |
| customer-display | completed | skipped | 02:47:14 |
| wrangler-check-care-agent | completed | skipped | 02:47:14 |
| unit-commerce-core | queued | — | — |
| build-commerce-core | completed | success | 04:01:19 |
| markers-and-forbidden | completed | success | 02:47:13 |
| changes-filter | completed | success | 02:45:02 |
| check | completed | **failure** | 02:47:45 |

판정: **FAIL** — `check` (feature-map-check). unit-commerce-core 도 미완.

## #386 (ci run 44446088415 · check = run 44446088562)

| 체크 | status | conclusion | 끝난 시각 |
|---|---|---|---|
| e2e-admin-loyalty | completed | skipped | 02:49:32 |
| wrangler-check-care-agent | completed | skipped | 02:49:32 |
| customer-display | completed | skipped | 02:49:32 |
| build-commerce-core | queued | — | — |
| unit-commerce-core | queued | — | — |
| markers-and-forbidden | completed | success | 02:49:32 |
| changes-filter | completed | success | 02:48:10 |
| check | completed | success | 02:45:36 |

판정: **PENDING**

## #388 (ci run 44452239406 · check = run 44452239634)

| 체크 | status | conclusion | 끝난 시각 |
|---|---|---|---|
| customer-display | completed | skipped | 03:34:32 |
| e2e-admin-loyalty | completed | skipped | 03:34:32 |
| wrangler-check-care-agent | completed | skipped | 03:34:32 |
| unit-commerce-core | queued | — | — |
| build-commerce-core | queued | — | — |
| changes-filter | completed | success | 03:34:32 |
| markers-and-forbidden | completed | success | 03:34:11 |
| check | completed | success | 03:33:45 |

판정: **PENDING**

## #389 (ci run 44454279529 · check = run 44454280120)

| 체크 | status | conclusion | 끝난 시각 |
|---|---|---|---|
| e2e-admin-loyalty | completed | skipped | 03:53:03 |
| wrangler-check-care-agent | completed | skipped | 03:53:03 |
| unit-commerce-core | queued | — | — |
| customer-display | queued | — | — |
| build-commerce-core | queued | — | — |
| markers-and-forbidden | completed | success | 03:53:03 |
| changes-filter | completed | success | 03:52:35 |
| check | completed | success | 03:51:35 |

판정: **PENDING**
