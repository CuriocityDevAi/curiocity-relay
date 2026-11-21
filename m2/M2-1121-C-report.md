M2-1121-C report
ci.yml cache 제거 O · #220 assertions 11분 = hang O · RELAY_REPO secret 없음 · PR #224

## 조사 결과

### REQ 1 — hang 재발 위험
- assertions job run 44853876391 기준: startedAt=02:29:25Z completedAt=02:41:00Z = **11분 35초 = hang O**
- `assertions` / `flow-tests` / `playwright` 모두 `runs-on: fromJSON(needs.route.outputs.runs_on)` → Mac(curiocity-mac-fork) 에서 실행 가능
- 세 job 모두 `actions/setup-node cache: 'npm'` 보유 → self-hosted 시 15GB POST hang 재발 경로 확인

### REQ 2 — RELAY_REPO secret
- `gh secret list -R CuriocityDevAi/agilo-medusa-pos-fork` 출력 없음 → **RELAY_REPO secret 없음**
- fork route job에서 `RELAY_REPO` 가 빈 문자열 → `_extra_quota` 가 `echo 0` 반환 → QUOTA=5+0=5
- fork #223(03:33 UTC)에서 cloud_today=5/5 → 한도 5 도달 코멘트 정상 동작 (extra 미적용 원인 = secret 부재)
- relay `ci/cloud-quota/2026-11-21.json` 에 extra=5 존재 확인
- route-fork.sh `_extra_quota` URL 패턴 = `https://raw.githubusercontent.com/${RELAY_REPO}/main/ci/cloud-quota/${TODAY_WIB}.json` → storeport route-heavy.sh 와 동일, 차이 없음
- **secret 설정은 하지 않음 — Kyu 직접 설정 필요**

### REQ 3 — 코멘트 문구 "5회/일" 하드코딩
- route-fork.sh `_pr_quota_exceeded` 169행에 `한도(5회/일, storeport+fork 합산)` 하드코딩 확인
- extra 적용 시 quota=10이어도 "5회/일"로 표시되는 버그 → 수정 O

## 수정 내용

### .github/workflows/ci.yml
assertions / flow-tests / playwright 세 job의 `actions/setup-node`:
```yaml
# before
cache: 'npm'
# after
cache: ${{ runner.environment == 'github-hosted' && 'npm' || '' }}
```
→ self-hosted(Mac) 시 캐시 비활성 → POST 단계 15GB hang 차단
→ GitHub-hosted(ubuntu) 시 npm 캐시 유지

### .github/scripts/route-fork.sh
```bash
# before
_pr_quota_exceeded() {
  local today_wib="$1"
  ...한도(5회/일, storeport+fork 합산)...

# after
_pr_quota_exceeded() {
  local today_wib="$1" quota="${2:-5}"
  ...한도(${quota}회/일, storeport+fork 합산)...

# call site
_pr_quota_exceeded "$TODAY_WIB" "$QUOTA"
```

## PR 및 CI

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/224
- CI run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44864134269
- run_id: 44864134269 (in_progress · 작성 시각 2026-11-21T04:03 UTC)
- Mac assertions POST 단계 정상 통과 여부: **미검증** (CI 실행 중 · Mac runner 배차 여부 route 출력 확인 후 판정 가능)

## Action 필요

- Kyu: fork 리포에 `RELAY_REPO` secret 설정 (`CuriocityDevAi/curiocity-relay` 또는 실제 relay repo 경로)
  → 설정 완료 시 extra 반영되어 quota=10 적용 가능
