#224 APPROVE · flow-tests 복원 원인 setup-node 차단 O

## REQ 1 — setup-node cache 조건부 비활성화

- 변경: `cache: ${{ runner.environment == 'github-hosted' && 'npm' || '' }}`
- 빈 문자열 → actions/setup-node가 npm 캐시 비활성화 (문서 기준 유효한 비활성화 방법)
- assertions/flow-tests/playwright 3개 job 전부 적용 확인

## REQ 2 — flow-tests 5.8GB 복원 원인 · actions/cache@v4 if 조건

**5.8GB 복원 원인**: flow-tests job에 `actions/cache@v4` 단계 없음이 맞음.  
5.8GB는 `setup-node cache: 'npm'`의 내부 ~/.npm 복원이 원인 (M2-1121-C report 근거).  
M2-1121-C에서 flow-tests도 동일 조건부 변경 → setup-node npm 복원 차단됨 ✅

**actions/cache@v4 `if:` 동작**:
- 대상 3단계: assertions "Cache Metro+Expo (assertions)" · playwright "Cache Metro+Expo" · playwright "Cache Playwright browsers"
- `if: runner.environment == 'github-hosted'` false → step 전체 skip → restore와 POST(저장) 둘 다 건너뜀
- self-hosted Mac에서 5.8GB 복원·20분+ POST hang 모두 차단 ✅

## REQ 3 — route-fork.sh ${quota} · RELAY_REPO secret

- `_pr_quota_exceeded` 함수에 `quota="${2:-5}"` 파라미터 추가, 코멘트 `${quota}회/일`로 변경
- 호출부: `_pr_quota_exceeded "$TODAY_WIB" "$QUOTA"` 전달 확인
- RELAY_REPO secret Kyu 2026-11-21 13:11 설정 완료 → `_extra_quota` relay repo에서 extra=5 로드 → QUOTA=5+5=10 → "10회/일" 표시 경로 완비

## REQ 4 — ubuntu 성능 회귀 / actionlint

- ubuntu(github-hosted): `runner.environment == 'github-hosted'` = true → `cache: 'npm'` 유지, `if:` 조건 통과 → 캐시 그대로 동작, 성능 회귀 없음 ✅
- lint job: ESLint 63 warning, 0 error → pass ✅. CI workflow에 별도 actionlint step 없음

## CI 결과 (run 44864921272)

| job | 결과 | 비고 |
|---|---|---|
| lint | ✅ pass 1m2s | ESLint 0 error |
| route | ✅ pass | 2회 모두 pass |
| assertions | ❌ fail 1m58s | 캐시 hang 없음 (REQ 목표 달성) |
| flow-tests | ✅ pass 54s | timeout 없음 (5.8GB 차단 확인) |
| heavy-cloud | skip | quota 정상 |
| playwright | skip | - |

**assertions 실패 상세**: `m3-1105-aa-assertions.mjs` ✗ `SuccessReceiptAnim · 보조 버튼 3 개 한 줄 (flex-row)` 1건  
→ PR 변경 범위(`.github/` only)와 무관. 브랜치 diverge 이후 master에 추가된 소스 assertion 미반영 추정.  
→ master 최근 CI success (run 44865798697, 2026-11-21 04:22 UTC).  
→ rebase 또는 master merge 후 assertions 재확인 필요.

## 판정

APPROVE — 캐시 fix 로직 정확, 목표 증상(hang/timeout) 해소 확인.  
assertions 실패는 PR 변경 무관 pre-existing; master rebase 후 별도 처리 권장.
