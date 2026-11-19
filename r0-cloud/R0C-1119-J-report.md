#393 APPROVE(heavy 6개 job 에서만 cache:pnpm 제거 · 부작용 없음) · CI 상태: 진행(heavy job 2개 queued 14분+, light/check 통과) · Setup Node 실측: 이 PR 미확보 (이전 main: 복원 363s / 저장 322s)

# R0C-1119-J — storeport PR #393 리뷰 (M2-1119-I)

- PR: https://github.com/CuriocityDevAi/storeport/pull/393 · head `1db0b1d`
- 리뷰: COMMENT 로 등록 ("R0 판정: APPROVE")
- 점검 시각: 2026-11-19 ~05:00 UTC

## ① 범위 — OK
- 제거 6곳 모두 `curiocity-mac` (heavy): unit-commerce-core · build-commerce-core · customer-display · e2e-admin-loyalty · wrangler-check-care-agent · pos-integration
- light job 들은 원래 setup-node 없음 → 무변경
- ubuntu `linux-check.yml` 은 `cache: 'pnpm'` 유지 (맞음)

## ② install 경로 — OK
- 순서: pnpm/action-setup(9.15.0) → setup-node → pnpm install. packageManager(pnpm@9.15.0) 와 일치
- store 경로 별도 설정 없음 = 러너 기본 로컬 store 재사용. `--prefer-offline` 유지

## ③ 시간
- 이전 main run 실측: Setup Node 복원 363s (run 44453215209) · Post Setup Node 저장 322s (run 44444689248) · Install 22~26s
- 이 PR run 44460473541: unit/build-commerce-core 가 04:46 부터 계속 queued → 실측 못 함
- 기대값: job 당 약 11분 절감

## ④ 부작용 — 없음
- cache-hit 출력 의존 step 없음
- 참고(기존 이슈): wrangler-check-care-agent install 에 `--prefer-offline` 없음

## 할 일
- heavy 러너가 job 을 잡는지 확인 (14분 넘게 대기 중). 돌고 나면 Setup Node 수 초 · Install 20~30s 확인 후 머지.
