# M2-1105-BX 리포트

CI 트리거 ✓ (pull_request run 43698376167) · pos-integration/customer-display/e2e-admin-loyalty 모두 SUCCESS · mergeStateStatus: CLEAN

## 원인

ci.yml에 `e2e-admin-loyalty` 잡이 두 번 정의되어 있었음(BW rebase 충돌 해소 중 중복 삽입).

- 1차 정의: 173줄 (customer-display job 직후)
- 2차 정의: 555줄 (pos-integration job 이후)

GitHub Actions는 같은 job ID 중복을 "workflow file issue"로 처리 → ci pull_request 미트리거.

## 조치

`.github/workflows/ci.yml` 2차 `e2e-admin-loyalty` 블록(549-600줄) 제거 → commit `dbfe609` push.

## CI 결과 (run 43698376167)

| job | 결과 |
|---|---|
| markers-and-forbidden | ✅ SUCCESS |
| changes-filter | ✅ SUCCESS |
| unit-commerce-core | ✅ SUCCESS |
| customer-display | ✅ SUCCESS |
| e2e-admin-loyalty | ✅ SUCCESS |
| pos-integration | ✅ SUCCESS |
| docker-smoke-\* | SKIPPED (정상) |
| feature-map-check | ✅ SUCCESS (run 43698376255) |

ci-summary 코멘트 생성: github-actions @ 2026-11-15T09:22:57Z ✓

## 이연 순증감

- 순증: 0
- 순감: ci pull_request 미트리거 (#269 CHANGES)
