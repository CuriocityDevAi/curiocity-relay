PR #369 · ci 1건 42분→32분 (commerce-core PR 기준) · 최장 단계 pos-integration(build+tests) 28분 · light 실행기 필요 O

## 측정 (3 run)

| Run | Job | 실행 | 벽시계 | 큐 대기 |
|-----|-----|------|--------|---------|
| 44254445586 | feature-map-check | 1m 35s | 5min | 3.5min |
| 44253857997 | feature-map-check | 25s | 25min | 24.5min |
| 44248873072 | ci-summary | 13s | 27min | 26.8min |

## 적용 사항

1. markers-and-forbidden · changes-filter · feature-map-check · ci-summary · stale-deferred → curiocity-mac-light
2. pnpm install --frozen-lockfile --prefer-offline (5곳)
3. build-commerce-core 출력 /tmp/cc-dist-<run_id> 저장 → pos-integration 중복 build 제거 (-10min)
4. customer-display · e2e-admin-loyalty: 경로 변경 없는 PR에서 건너뜀 (-15-20min)

## 전/후 예상

| 시나리오 | 전 | 후 |
|---------|----|----|
| commerce-core PR 임계 경로 | 42min | 32min |
| feature-map-check 벽시계 | 25min | 1-2min |
| ci-summary 벽시계 | 27min | 1min |

## light 실행기 등록 절차

머지 전: GitHub Settings → Runners → curiocity-mac → Labels → curiocity-mac-light 추가
