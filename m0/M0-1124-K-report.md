PASS

# M0-1124-K · PR #421 R0-1124-AC CHANGES 반영

- 브랜치: `fix/M0-1124-I-order-number-assign` (PR #421 추가 커밋)
- 커밋: `d94eb52` — push 완료 2026-11-24 14:37 UTC
- 이전 head: `f5f0f04`

## R0-1124-AC CHANGES → 적용 결과

### 1. refund 환불 영수증 custom_display_id 전달 lockdown (R0 #1)

- R0 지적 "refund/route.ts 가 조회만 하고 buildSnapshot 에 전달 안 함" 은
  현재 코드 상태에서는 부분 사실만 참임을 확인:
  - `refund/route.ts` 는 `custom_display_id` 를 fields 에 넣어 조회
    (PR #421 f5f0f04 에 반영됨).
  - 그 order 는 `posRefundWorkflow` 의 `mint-receipt` 단계로 전달되고,
    해당 단계가 `buildSnapshot` 의 `order.custom_display_id` 로 매핑
    (f5f0f04 에 반영됨).
  - 즉 플럼빙은 존재하지만, 그 플럼빙에 **단위 수준 lockdown 이 없어**
    회귀가 쉽다. R0 의 요지는 이 회귀 가드 추가.
- 적용: `apps/commerce-core/src/workflows/pos-refund/steps/mint-receipt.ts`
  - 핸들러를 `mintRefundReceiptHandler` 로 export (createStep 은 그대로).
- 신규 단위 테스트: `apps/commerce-core/src/workflows/pos-refund/__tests__/mint-receipt-custom-display-id.unit.spec.ts`
  - ① "PIM26B1000" 값이 `buildSnapshot` input.order.custom_display_id 로 전달.
  - ② null 그대로 전달 (back-compat).
  - ③ 필드 미포함 시 null 로 정규화.

### 2. fallback 4 (닉네임 설정 매장 1 개) 제거 (R0 #2)

- 뿌리: PS 매장이 추가될 예정. PS 닉네임 설정 전에 PS 주문이 들어오면
  fallback 4 가 기존 PIM 매장을 집어 PS 주문이 PIM 번호를 받는 혼동.
  모호하면 null 이 더 안전 (주문 성공 · 번호 없이 · 앱은 display_id 로 fallback).
  뿌리 해법은 POS 앱이 draft 생성 시 `metadata.stock_location_id` 를 보내는 것
  (M3-1124-M 병행).
- 수정 파일:
  - `apps/commerce-core/src/modules/order_number/lib/reserve.ts`
    · fallback 4 블록 (`order_number_store` 단일 닉네임 조회) 제거 · 주석 갱신.
  - `apps/commerce-core/src/modules/order_number/__tests__/resolve-stock-location.unit.spec.ts`
    · fallback 4 확정/모호 테스트 2 건 제거 · "닉네임 1 개여도 → null" +
    "sales_channel 2 개 연결 → null" 신설.
  - `apps/commerce-core/integration-tests/pos/order-number-receipt.spec.ts`
    · 테스트 ①② 는 metadata.stock_location_id 를 제공 (M3-1124-M 올바른 거동).
    · 테스트 ④ 신설: metadata 없이 생성 + 닉네임 설정 → `custom_display_id = null`.

### 3. CI heavy-mac skip 라우팅 조사 (R0 #3)

- PR #421 의 commit `f5f0f04` CI run `45387102899` 실측:
  - `heavy-cloud`: ✅ 15m 10s · `integration-tests/pos/order-number-receipt.spec.ts`
    실행됨 → `PASS integration-tests/pos/order-number-receipt.spec.ts (12.029 s)`
    로그 확인 (2026-11-24 11:55:22Z).
  - `heavy-mac`: ⏭ skip — route 가 cloud 로 배정했기 때문 (설계대로).
- 즉 R0 가 걱정한 "통합 테스트가 한 번도 안 돈 것 아니냐" 는 사실 아니었음:
  heavy-cloud 에서 돌아 PASS 로 끝났음. heavy-mac ⏭ 는 cloud 배정의 부산물.
- 이번 push 도 `commerce_core` 필터 매치 (src/modules/order_number · src/workflows/pos-refund · integration-tests/pos · docs/feature-map 변경) → heavy 가 돌아 신규 테스트가 검증됨 (아래 로컬 로그 참조 · CI 배정은 route 스크립트 산출).

## 어설션 파일 동봉 (로컬 실행 결과)

### A. Unit tests (apps/commerce-core · `pnpm test`)

```
Test Suites: 54 passed, 54 total
Tests:       602 passed, 602 total
Snapshots:   18 passed, 18 total
Time:        21.931 s
```

핵심 신규/변경 스펙:

```
PASS src/workflows/pos-refund/__tests__/mint-receipt-custom-display-id.unit.spec.ts
PASS src/modules/order_number/__tests__/resolve-stock-location.unit.spec.ts
```

세부 (resolve-stock-location):

```
M0-1124-I · resolveStockLocationIdForOrder · fallback 체인
  ✓ 1 · metadata.stock_location_id 가 있으면 즉시 반환 (SQL 미호출)
  ✓ 1 · metadata.location_id 도 인식
  ✓ 2 · shipping_methods[*].data.stock_location_id
  ✓ 3 · sales_channel_id → 단일 링크 (1 ↔ 1)
  ✓ 3 · sales_channel 이 2 개 location 과 연결되어 있으면 모호 → null
  ✓ M0-1124-K · 닉네임 설정된 매장이 1 개여도 (fallback 4 제거) → null
  ✓ 모든 fallback 실패 → null (주문 생성은 계속 · 번호 없음)
```

세부 (mint-receipt-custom-display-id):

```
M0-1124-K · mintRefundReceiptHandler · custom_display_id 전달
  ✓ order.custom_display_id 가 buildSnapshot input.order.custom_display_id 로 전달된다
  ✓ order.custom_display_id 가 null 이면 그대로 null 전달 (back-compat)
  ✓ order 에 custom_display_id 필드가 아예 없으면 null 로 정규화
```

### B. Integration tests (로컬 Postgres · `test:integration:pos` 서브셋)

로컬 `storeport_local_m0_1124_k` DB 로 `order-number-receipt.spec.ts` 단독 실행:

```
PASS integration-tests/pos/order-number-receipt.spec.ts (13.458 s)
    M0-1124-I · POS 주문 완료 → custom_display_id → receipt snapshot
      ✓ ①② metadata.stock_location_id 있는 주문은 custom_display_id 자동 발급 + receipt snapshot 에 포함 (865 ms)
      ✓ ③ 이미 custom_display_id=null 로 만들어진 주문은 소급 부여되지 않음 (767 ms)
      ✓ ④ M0-1124-K · metadata 없이 생성 + 닉네임 설정됨 → null (fallback 4 제거) (647 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### C. Build (`pnpm --filter commerce-core build`)

```
info:    Backend build completed successfully (5.97s)
info:    Frontend build completed successfully (19.16s)
```

### D. Lint (`pnpm --filter commerce-core lint`)

```
✖ 107 problems (0 errors, 107 warnings)
```

error 0 · warning 107 (모두 기존 "Unused eslint-disable directive" · 이번 변경 무관).

### E. Pre-commit 가드

- `scripts/naming-check.sh` ✓ PASS (meros = 0 · Medusa 모듈명 정합 · 동명 마이그 없음)
- `scripts/upstream-tracking-check.sh` ✓ PASS (3 리포 fresh)
- `scripts/dispatch/validate.sh` ✓ PASS (0 violations)
- lint-staged (husky) · prettier auto-format 적용 (후속 jest 재실행에서도 통과).

### F. CI (push 후 · ci-summary 대기)

- Push: `f5f0f04..d94eb52` on `fix/M0-1124-I-order-number-assign` · 2026-11-24 14:37 UTC.
- 이전 commit `f5f0f04` 의 CI run (참조): `heavy-cloud ✅ 15m 10s · heavy-mac ⏭`,
  `order-number-receipt.spec.ts` PASS 로그 확인됨.
- 이번 push 의 route 배정 결과 (cloud or mac) + 신규 unit 3 건 + 통합 테스트는
  push 후 ci-summary 코멘트로 확인 가능. 로컬 실행 결과는 상단 A·B 참조.

## 변경 파일 요약

```
 .../pos/order-number-receipt.spec.ts               |  41 ++-
 .../__tests__/resolve-stock-location.unit.spec.ts  |  38 +--
 .../src/modules/order_number/lib/reserve.ts        |  34 +-
 .../__tests__/mint-receipt-custom-display-id...    | 139 ++++++++++  (신규)
 .../src/workflows/pos-refund/steps/mint-receipt.ts |  40 +--
 docs/feature-map.yaml                              |   2 +-
 6 files changed, 322 insertions(+), 172 deletions(-)
```

## PR 본문 추가 3 줄 (권장안)

> R0-1124-AC CHANGES 반영 (d94eb52):
> 1. fallback 4 (닉네임 설정 매장 1 개) 제거 — PS 매장이 PIM 번호를 받는 혼동 방지 · 모호하면 null.
> 2. refund mint-receipt 핸들러 export + custom_display_id 전달 lockdown 단위 테스트 3 건.
> 3. CI heavy-cloud 는 PR #421 f5f0f04 에서 이미 돌아 통합 테스트 PASS 확인 (heavy-mac ⏭ = cloud 배정 산물).

## 범위·안전 가드

- 운영 DB · railway 접근 X.
- `~/projects/curiocity-relay` 수정 X (리포트는 `~/.hub-runner/reports/m0/M0-1124-K/report.md` 에만).
- `/loop` · 예약 깨우기 호출 X.
- PR 자기 머지 X — 승인·착지는 Kyu/T0.
- lint error 0 확인 후 push.
