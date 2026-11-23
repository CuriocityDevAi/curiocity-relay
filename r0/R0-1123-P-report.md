#241: APPROVE
#240: APPROVE

## PR #241 — test(harness): M0-1123-H 레거시 playwright 4건 홈 라우트 갱신

판정: **APPROVE**

### ① stale test 여부 (버그 가림 없음)

4건 모두 stale test 맞음. M3-1123-A (#228)가 `app/(tabs)/_layout.tsx`에 `initialRouteName: 'sell'` + `products` 탭 `href: null` 설정 → wizard `router.replace('/(tabs)/products')` 호출은 아직 갱신 전이지만 hidden tab 조합으로 expo-router가 `/sell` 폴백. sell 화면이 "상품 그리드 + 칩 + 카트 패널" 구조이므로 "홈 상품 그리드 도달" 테스트 의도 보존.

기대값 완화(`/\/products/` → `/\/(sell|products)/`)는 현 앱 동작에 맞는 갱신이며 버그를 숨기지 않음. wizard stale `router.replace` 호출은 cleanup 대상이지만 이 PR scope와 무관 · 보고서에 별건 명기됨.

m1-1105-h check(3) "현 URL 아직 홈 아님" 범위 확장: wizard 미완료 시점 URL은 `/` 또는 `/wizard`이므로 `/(sell|products)/` 패턴에 걸리지 않음 — 올바름.

### ② 앱 코드 변경 없음

`scripts/` 하위 테스트 파일 5개만 변경. 앱 소스 · `ci.yml` · `route-fork.sh` 무수정 ✓

### ③ 공용 헬퍼 타 하네스 영향

`_harness.mjs` `loginAndReachProducts` waitForFunction: 기존 `includes('products')` 유지 + `includes('sell')` OR 추가. 기존 하네스는 products 조건에서 여전히 PASS — regression 없음 ✓. 기존 중복 `endsWith('/products')` 제거도 적절.

### ④ 로컬 `--workers 4` 결과

27 하네스 · 22 PASS · 5 FAIL(m3-1105-b/d/f/m/q — 범위 외 M3 track) · wall 202.8s. 내 몫 4건 전부 PASS ✓

---

## PR #240 — ci(fork): M1-1123-M cancel-on-close 워크플로 추가

판정: **APPROVE**

### ① 브랜치 범위 필터링

API 쿼리 `?event=pull_request&branch=${HEAD_BRANCH}` + jq 이중 가드:
- `select(.event == "pull_request")` — push · workflow_run 등 제외
- `select(.head_branch == $branch)` — 닫힌 PR 브랜치만
- `select(.id != $self)` — 자기 run 제외
- `select(.status == "queued" or .status == "in_progress")` — completed 제외

master 및 다른 브랜치는 쿼리 파라미터 `branch=` 단계에서 이미 걸러지고 jq에서 head_branch 재확인. 건드리지 않음 ✓. 인라인 mock 단위 테스트(1001~1005)로 필터 로직 자기 검증 ✓

### ② 권한 최소화

`permissions: actions: write` 하나만 선언. 추가 시크릿 없음 ✓

### ③ storeport 동일 방식

ubuntu-latest · `actions: write` · `gh api … | jq | gh run cancel` 패턴 · `timeout-minutes: 5` — relay report(M1-1123-M §REQ5) 및 PR 본문 모두 동일 방식 명시 ✓

### ④ 머지 주체 명기

PR 본문에 **"워크플로 파일 추가이므로 머지는 Kyu 몫. 직접 확인 후 머지해 주세요."** 볼드 처리로 명기 ✓

참고: `per_page=100` pagination 미구현이지만 단일 브랜치 기준 100건 초과 가능성 극히 낮아 허용 가능한 단순화.
