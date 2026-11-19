#391 CHANGES · fork #200 CHANGES · 가짜 초록 차단 X · paths 필터 오판 O · 실행기 O || 총 2분

(범례: "paths 필터 오판 O" = 오판 없음 확인 OK. 기대 워크플로 목록 방식이 아니라 paths-ignore 로 안 도는 워크플로를 미시작으로 잡지 않음.)

# R0C-1119-E · ci-summary M2-1119-F 리뷰

대상: storeport PR #391 (1a15da0) · agilo-medusa-pos-fork PR #200 (6c2adc6). 두 파일 동일 로직 (차이 = workflows 목록, runs-on).

## OK
- 수집: `actions/runs?head_sha=…&per_page=100 --paginate` → run 별 jobs. head SHA 의 Actions 체크 전부 (Actions 외 앱 체크는 제외, 현재 없음).
- 자기 제외: `select(.name != "ci-summary")`, workflow_run 대상 목록에 자신 없음, 댓글 PATCH 는 트리거 아님 → 루프 없음.
- upsert: `<!-- ci-summary -->` 로 시작하는 댓글 PATCH, 없으면 POST. 유지.
- 권한: checks:read · actions:read · pull-requests:write. 최소.
- 실행기: storeport = [self-hosted, curiocity-mac-light] · fork = ubuntu-latest. OK.

## CHANGES (가짜 초록 잔존 경로)
1. run.status 미사용. pending = job conclusion null 만. needs 로 아직 생성 안 된 job (storeport pos-integration ← build-commerce-core; fork playwright ← assertions) 은 목록에 없음 → 생성 전 시점에 다른 워크플로 완료로 ci-summary 가 돌면 ✅ all green. 수정: run.status != completed → pending.
2. cancelled / timed_out / startup_failure / action_required 가 실패도 pending 도 아님 → ✅. 수정: success|skipped|neutral 화이트리스트.
3. 기본 셸 bash -e (pipefail X) → runs API 실패 시 [] → 행 0개 → ✅. 수정: 행 0개 green 금지 + shell: bash.
4. (부가) cancel-in-progress 로 구 SHA run cancelled 완료 → 구 SHA 로 같은 댓글 덮어씀. PR head.sha 대조 또는 concurrency 그룹.

## #385 실측 대조 (MCP get_check_runs, head 639ecd4)
- 실제: ci run 44446099298 = markers ✅, changes-filter ✅, customer-display/e2e-admin-loyalty/wrangler ⏭, build/unit queued, pos-integration 미생성(목록 부재). feature-map-check run 44446099232 = check ❌.
- 현행 댓글: "CI: ❌ 1 failed" (check 1행).
- 새 로직 예상: "CI: ❌ 1 failed · ⏳ 2 pending", 8행. pos-integration 은 표에 없음 → 결함 1 실증.

리뷰 제출: 두 PR 모두 event=COMMENT, 머지 안 함.
