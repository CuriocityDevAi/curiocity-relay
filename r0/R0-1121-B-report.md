R0-1121-B-report

#221 APPROVE · 한도 집계: `heavy-cloud` job name 기준으로 카운트 · route 자신 미포함 · fork+storeport 합산 일관

---

## ① 권한·토큰·gh CLI (ubuntu 계약)

PR 브랜치 route job permissions:
```
contents: read
actions: read
pull-requests: write
```
storeport `route-heavy.sh` permissions와 동일.

env 계약 비교:
| env | route-fork.sh 요구 | PR ci.yml 주입 |
|-----|--------------------|----------------|
| GH_TOKEN | 필수 | `secrets.GITHUB_TOKEN` ✅ |
| REPO | 필수 | `github.repository` ✅ |
| IS_DRAFT | 선택 | `github.event.pull_request.draft` ✅ |
| IS_PR | 선택 | `github.event_name == 'pull_request'` ✅ |
| FORCE_CLOUD | 선택 | `inputs.force_cloud` ✅ |
| PR_NUMBER | 선택 | `github.event.pull_request.number` ✅ |
| RELAY_REPO | 선택 | `secrets.RELAY_REPO` ✅ |
| PARTNER_REPO | 선택 | `vars.PARTNER_REPO` ✅ |

ubuntu-latest 기본 탑재: `gh` CLI ✅ · `jq` ✅ · `python3` ✅ · `curl` ✅

**결론**: storeport `route-heavy.sh`와 동일 계약. ubuntu-latest에서 완전히 충족.

---

## ② 한도 집계 — route 자신이 ubuntu에서 돌면서 한도에 섞이는지

`route-fork.sh` `_cloud_today()` 카운트 로직:
```bash
IS_CLOUD_JOB=$(gh api "repos/$SCAN_REPO/actions/runs/$RID/jobs?per_page=100" \
  --jq '[.jobs[] |
    select(.name == "heavy-cloud") |
    select(.status != "completed" or .conclusion != "skipped")
  ] | length')
[ "$IS_CLOUD_JOB" -gt 0 ] && LOCAL=$((LOCAL + 1))
```

- route job name: `route` → `select(.name == "heavy-cloud")` 불일치 → **route 자신 미포함** ✅
- fork `heavy-cloud` job: name `heavy-cloud` · `if: needs.route.outputs.is_cloud == 'true'` 조건부 → 클라우드 routing 시에만 실행 · 카운트 대상 ✅
- storeport `heavy-cloud` job: 동일 name → `PARTNER_REPO` 경로로 별도 집계 후 합산 ✅
- 집계 단위: 리포별(fork, storeport) 각각 `heavy-cloud` job 비-skipped 개수 → 합산. 두 리포 모두 같은 job name 사용 → **일관성** ✅

---

## ③ force_cloud 입력·light 러너 폴백 — storeport와의 차이 표

| 항목 | storeport route | fork route (PR #221 후) |
|------|-----------------|------------------------|
| 기본 러너 | `curiocity-mac-light` (self-hosted) | `ubuntu-latest` 고정 |
| light runner 폴백 | idle → 즉시 실행 | 없음 (ubuntu로 대체) |
| force_cloud → route 러너 위치 | ubuntu-latest 폴백 (fromJSON 조건) | 이미 ubuntu · 변화 없음 |
| force_cloud → downstream routing | `FORCE_CLOUD=true` env → route-heavy.sh 내부 | 동일 (route-fork.sh 내부) |
| route timeout | 6분 | 3분 (단축) |
| 스크립트 | `route-heavy.sh` | `route-fork.sh` |
| env 계약 | 동일 | 동일 |
| permissions | 동일 | 동일 |

`force_cloud=true` 시 storeport에선 route job 러너 자체도 ubuntu로 바뀌는 추가 효과가 있었으나, fork route는 항상 ubuntu이므로 동일 결과 → 의도된 단순화 ✅

---

## ④ 다른 job 동작 변화 없음 · actionlint

diff 범위:
- `ci.yml` route job: `runs-on` + `timeout-minutes` 2행 변경 · permissions/outputs/steps 무변경
- `assertions` / `flow-tests` / `playwright`: `needs.route.outputs.runs_on` 사용 → 변화 없음 ✅
- `heavy-cloud` job: 변경 없음 ✅
- `lint.yml`: `timeout-minutes: 15` 단순 추가 ✅
- actionlint: `ubuntu-latest` 표준 값 · `timeout-minutes: 3` / `timeout-minutes: 15` 정수 → 이슈 없음 ✅

---

## 명령 로그

```
Read /Users/kyu.lee/projects/curiocity-relay/m2/M2-1121-A-report.md
gh pr view 221 --repo curiocity-dev/agilo-medusa-pos-fork  → 404 (repo 이름 오류)
MCP Github pull_request_read CuriocityDevAi/agilo-medusa-pos-fork #221 get
MCP Github pull_request_read CuriocityDevAi/agilo-medusa-pos-fork #221 get_diff
MCP Github get_file_contents agilo-medusa-pos-fork ci.yml ref=ci/M2-1121-A-fork-route-runner
MCP Github get_file_contents agilo-medusa-pos-fork ci.yml ref=master
MCP Github get_file_contents agilo-medusa-pos-fork .github/scripts/route-fork.sh ref=ci/M2-1121-A-fork-route-runner
gh repo list CuriocityDevAi  → storeport 리포 확인
MCP Github get_file_contents storeport ci.yml
```
