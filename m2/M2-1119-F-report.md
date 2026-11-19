storeport PR #391 · fork PR #200 · 전체 체크 집계 O · gh pr checks 일치 O · 미시작 표시 O

## 검증 결과 (storeport PR #389)

| 항목 | 결과 |
|------|------|
| gh pr checks 체크 수 | 8 |
| 새 로직 집계 체크 수 | 8 |
| 헤더 일치 | ✅ CI: ⏳ 3 pending |
| 미시작 표시 로직 | ✅ (jobs=0이면 "(not started)" 행) |

## 체크 목록 대조

| gh pr checks 이름 | 상태 | 새 로직 |
|------------------|------|---------|
| markers-and-forbidden | pass | ci / markers-and-forbidden ✅ |
| changes-filter | pass | ci / changes-filter ✅ |
| unit-commerce-core | pending | ci / unit-commerce-core 🔄 |
| build-commerce-core | pending | ci / build-commerce-core 🔄 |
| customer-display | pending | ci / customer-display 🔄 |
| wrangler-check-care-agent | skipping | ci / wrangler-check-care-agent ⏭ |
| e2e-admin-loyalty | skipping | ci / e2e-admin-loyalty ⏭ |
| check | pass | feature-map-check / check ✅ |

## 변경 내용

- 집계 범위: 트리거 run 1개 → `actions/runs?head_sha=` 전체 (paginated)
- ci-summary 자기 자신 제외
- 출력: `워크플로명 / 잡명` 형식
- Actions 링크: ?query=head_sha 필터로 변경
