판정: 수정 완료 · PR #239 생성 · lint/assertions/flow-tests → curiocity-mac-fork-light 확인

PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/239
브랜치: ci/M2-1123-G-light-always
커밋: 110baf5

## 원인 확진

route 잡 로그 (`runs_on_light` 출력) 는 CI 완료 전 로그 접근이 제한되어 직접 확인은 불가했으나,
코드 분석으로 확진:

- `_light_runner_online()` 이 `gh api repos/$REPO/actions/runners` 를 GITHUB_TOKEN 으로 호출
- 이 API 는 저장소 관리자 권한 필요 → GITHUB_TOKEN 으로 **403**
- 403 → `RUNNER_INFO` 가 빈 문자열 → `echo "false"` 반환
- 따라서 `LIGHT_ONLINE=false` → `RUNS_ON_LIGHT='["self-hosted","curiocity-mac-fork"]'` (heavy) 항상 사용

동일한 이유로 `_runner_busy()` primary 경로 (runners API) 도 403 이지만, fallback (in_progress·queued run 조회) 이 있어 heavy 배차 자체는 동작함 — REQ 분석 일치.

## 수정 내용

`.github/scripts/route-fork.sh`:
- `_light_runner_online()` 함수 전체 제거 (22행)
- `MOCK_LIGHT_ONLINE` 목업 환경변수 제거
- `RUNS_ON_LIGHT` 초기값을 `curiocity-mac-fork-light` 고정
- light 체크 로직(`LIGHT_ONLINE` 계산 및 조건 분기) 제거

## 테스트

`bash .github/scripts/route-fork.sh --test` → **21 / 21 통과**

## CI 증거 (PR #239 · run 45195363872 / 45195363744)

| job         | runner_name                | status    |
|-------------|---------------------------|-----------|
| route       | GitHub Actions 1000007789  | success   |
| assertions  | **curiocity-mac-fork-light** | success |
| flow-tests  | **curiocity-mac-fork-light** | in_progress (완료 예정) |
| heavy-cloud | (skipped)                  | skipped   |
| lint (Lint workflow, run 45195363744) | **curiocity-mac-fork-light** | success |

assertions · lint · flow-tests 모두 `curiocity-mac-fork-light` 에서 실행 확인.
playwright 잡은 M0-1123-G 주인 — 이 PR 미수정 (runs_on = heavy 그대로).
