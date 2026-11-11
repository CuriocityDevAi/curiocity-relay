# M1-1105-AW Report

## C1 · lockout 단위 테스트 4건
- 완료. `manager-pin.unit.spec.ts` lockout describe 블록에 "두 매장은 잠금 카운터가 따로 — STORE_A 5회 오답 잠김 · STORE_B 정답 성공" 케이스 추가 → 4건.
- 커밋 sha: **e9f97e0**

## C2 · CI unit 단계 추가
- 완료. `.github/workflows/ci.yml` 에 `unit-commerce-core` 잡 추가 (`pnpm test` = `TEST_TYPE=unit`).
- 기존 잡 동작 변경 없음.
- 커밋 sha: **e9f97e0**
- pre-push hook 로컬 실행: manager-pin.unit.spec.ts 포함 43/43 통과.

## R1 · resolveStoreId 헬퍼 + 4곳 교체
- 완료. `_shared/manager-pin.ts` 에 `resolveStoreId(order, query)` 헬퍼 추가.
  - order.metadata.stock_location_id → 첫 stock_location.id → "default"
- void · refund · return · refund-retry 4개 route 의 중복 블록을 헬퍼 1줄 호출로 교체 (동작 동일).
- Admin GET `/admin/pos/manager-pin`: query param → 첫 stock_location → 400. 헬퍼와 동일 소스 기준 — 변경 불필요.
- 커밋 sha: **e9f97e0**

## CI 실행
- Push 완료: `fix/m1-1105-au-manager-pin-store-id` → `e9f97e0`
- 로컬 단위 테스트: 43/43 통과 (pre-push hook 실행 확인)
- CI URL: https://github.com/CuriocityDevAi/storeport/pull/216

## 이연 순증감
- 없음 (신규 이연 없음)

## PR 리뷰 스레드 답글
- C1 → https://github.com/CuriocityDevAi/storeport/pull/216#discussion_r4539464249
- C2 → https://github.com/CuriocityDevAi/storeport/pull/216#discussion_r4539464792
- R1 → https://github.com/CuriocityDevAi/storeport/pull/216#discussion_r4539465336
