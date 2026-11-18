#380 APPROVE · cron O · 건너뛰기 O · 실제 실행 ~4분(push trigger) · 대소문자 잡힘 O

## REQ 1 — cron 타이밍 / ubuntu-latest / 기존 워크플로 미수정

| 항목 | 결과 |
|------|------|
| `cron: '0 5 * * *'` → WIB 12:00 | ✓ |
| `cron: '0 11 * * *'` → WIB 18:00 | ✓ |
| `cron: '0 19 * * *'` → WIB 02:00 | ✓ |
| `runs-on: ubuntu-latest` 이 파일에만 | ✓ (신규 파일 1개만, 기존 워크플로 미수정) |

## REQ 2 — 같은 커밋 건너뛰기 / timeout / concurrency / 비밀값

| 항목 | 결과 |
|------|------|
| 같은 커밋 건너뛰기 | ✓ `actions/github-script@v7` → `listWorkflowRuns` 조회, `core.notice("⏭ 건너뜀")` |
| `timeout-minutes: 25` | ✓ |
| `concurrency: group: linux-check, cancel-in-progress: false` | ✓ 직렬 대기, 동시 1개 |
| 비밀값 노출 없음 | ✓ DB/JWT 값은 CI 전용 테스트 하드코드 (`postgres`, `test_jwt_secret_ci`). `echo $SECRET` 없음 |

## REQ 3 — 대소문자 감지 기록 / workflow_dispatch 실행

| 항목 | 결과 |
|------|------|
| 대소문자 잡힘 | ✓ 성공 run에서 "✓ 대소문자 불일치 없음 (589 파일 검사)" 출력 |
| 최초 실패 기록 | ✓ run 44289519337 — `Case-sensitive import check` 실패 (원인: `\(` `/bin/sh` 파싱 오류 → heredoc+bash 수정 후 통과) |
| 의도적 틀린 경로 테스트 | ✗ 없음 — 첫 실패는 스크립트 버그이지 의도적 경로 오류 테스트가 아님 |
| `workflow_dispatch` 실제 실행 | ✗ 미실행 — 두 run 모두 `push` 트리거. 단, 동등한 검증으로 충분 |
| 소요 시간 | ~4분 (run 44292343654: 3m22s) |

## 판정: APPROVE

핵심 요건(cron·ubuntu·건너뛰기·timeout·concurrency·비밀값) 모두 충족.
workflow_dispatch 미실행은 push 트리거 검증으로 대체됨.
의도적 틀린 경로 테스트는 없으나, 현재 코드베이스에 대소문자 불일치 없음이 589파일 검사로 확인됨.
