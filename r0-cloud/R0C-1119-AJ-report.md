relay #10 APPROVE

# R0C-1119-AJ — relay PR #10 재리뷰 (2026-11-19)

push·머지 없음. PR 코멘트: relay #10 issuecomment-7012741628
대상: HEAD baef0b6 (M0-1119-U 수정 반영) · 직전 R0C-1119-AH D = CHANGES

| 확인 | 결과 |
|---|---|
| `node --test scripts/test/*.test.mjs` | 201/201 pass (watchdog 20) |
| 대조군: 같은 stuck 데이터 · 완전한 ci | restart 2 (heavy·light) |
| AH 경로 1: `partial:true` | skip `data-partial` · exec 0 O |
| AH 경로 2: `repos_failed` 1개 | skip `data-repos-failed` · exec 0 O |
| AH 경로 3: `ci.data.at` 10분 전 | skip `data-stale` · exec 0 O |
| Worker 확인 방식 | `execFile('pgrep', ['-f', '<runnerDir>.*Runner\\.Worker'])` · 인자 배열 · 셸 없음 O |
| 실제 pgrep (가짜 `<dir>/bin/Runner.Worker` 실행) | 살아있음 → true → skip `worker-running` · 없음 → false O |
| 주입 시도: 경로에 `$(touch PWNED)` | 파일 안 생김 O |
| pgrep 오류 | true 반환 (재시작 막음 · 안전측) O |
| 경로 출처 | runner-config.json `gh_runner_watchdog.runner_paths` 또는 모듈 기본값만 O |
| 회귀: 3시간 매분 stuck | exec 2회 (0분·30분) → alert · 이후 정지 O |
| 허브 본업 | fire-and-forget + try/catch 그대로 (hub-runner 변경 없음) O |

## nit (차단 아님)
- `ci.data.at` 이 없거나 못 읽는 값이면 stale 검사를 통과함 (fail-open). ci-health 는 항상 ISO `at` 을 넣으니 지금은 안 생김 · Worker 확인이 뒤에서 막음.
- stop/start 는 아직 `sh -c "\"$abs\" stop && ..."`. existsSync 가 실제로 있는 경로만 통과시키므로 위험 낮음 · `execFile(abs, ['stop'])` → `execFile(abs, ['start'])` 권장.
- heavy 패턴(`~/actions-runner.*Runner\.Worker`)은 light 폴더(`~/actions-runner-light`)의 Worker 도 잡음 → light 가 일하는 중이면 heavy 재시작도 미뤄짐 (안전한 쪽).
- ci fetch 간격 5분 · stale 한도 6분 → fetch 가 늦어지면 그 사이 watchdog 은 쉼 (안전한 쪽).
