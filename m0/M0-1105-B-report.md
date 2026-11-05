---
round: M0-1105-B
pr:
  storeport: storeport#184
base_pr: storeport#183
outcome: pos-integration-tests-real-db · 3/6 PASS · 3 발견 (fix 는 M0-1105-C)
kyu_checks: 1 (ci-pos-integration-green · CI pos-integration job 베이스라인 3/6 PASS 안착 확인)
---

# M0-1105-B · POS 결제 API 실 DB 통합 테스트 추가

**일자**: 2026-11-05 · **허브**: M0 · **대상**: `apps/commerce-core/integration-tests/pos/**` + jest 설정 + CI 워크플로.

**base**: storeport PR #183 (`feat/m0-1104-j-b-payment-api`). #183 머지 시 rebase.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | medusa-test-utils + Postgres service container 로 실 DB 통합 테스트 추가 | ✓ |
| 2 | 6 시나리오 구현 (cash · edc 400 · preorder DP50 · takeaway fulfill · preorder fulfill · 2 tenders) | ✓ |
| 3 | 로컬 실행 결과 3/6 PASS · 3 발견 수집 | ✓ |
| 4 | CI 워크플로 `.github/workflows/ci.yml` 에 pos-integration job 추가 | ✓ |
| 5 | 제품 코드 수정 0 (금지 준수) | ✓ |
| 6 | 상시 ⓑ (package.json 변경 시 격리 frozen-lockfile) | ✓ |
| 7 | 결함 fix 는 별 라운드 (M0-1105-C) 로 이연 | ✓ |

---

## 1. 산출물 (storeport PR #184 · test/m0-1105-b-pos-integration)

### 신규 파일
- `apps/commerce-core/integration-tests/setup.js` — jest setup (DB env 기본값)
- `apps/commerce-core/integration-tests/pos/helpers.ts` — `loginAsAdmin` · `ensureBaseSeed` · `createTestOrder`
- `apps/commerce-core/integration-tests/pos/tenders.spec.ts` — 6 시나리오 통합 테스트

### 수정
- `apps/commerce-core/jest.config.js` — `TEST_TYPE=integration:pos` 분기 추가
- `apps/commerce-core/package.json` — `test:integration:pos` script + `pg-god ^1.0.12` devDep + `@medusajs/test-utils@2.17.2` devDep 승격
- `apps/commerce-core/pnpm-lock.yaml` · `pnpm-lock.yaml` — lockfile 갱신
- `.github/workflows/ci.yml` — `pos-integration` job 추가 (Postgres 16-alpine service container · frozen-lockfile · build + test)

### 금지 영역 준수
- `apps/commerce-core/src/**` 변경 **0**

---

## 2. 로컬 실행 결과 (3/6 PASS)

```
TEST_TYPE=integration:pos NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --forceExit
```

| # | 시나리오 | 결과 |
|---|---|---|
| 1 | cash tender → PaymentCollection + provider_id=pp_cash_default | ✅ **PASS** (859 ms) |
| 2 | edc approval_code 누락 → 400 | ❌ **FAIL** (958 ms) |
| 3 | preorder dp_percent=50 → DP 금액 | ✅ **PASS** (849 ms) |
| 4 | takeaway fulfill → 재고 감소 | ❌ **FAIL** (556 ms) |
| 5 | preorder fulfill → metadata.fulfillment_stage 전환 | ❌ **FAIL** (464 ms) |
| 6 | 2 tenders → 2 collections + expected_by_method 합산 | ✅ **PASS** (931 ms) |

**Test Suites**: 1 failed, 1 total · **Tests**: 3 failed, 3 passed, 6 total · **Time**: 15.463 s

---

## 3. 발견 3건 (J-b 제품 코드 결함 · 별 라운드 수정 · M0-1105-C 후보)

### FINDING #1 · POST `/admin/pos/orders/:id/tenders` · edc validation 우회
- **증상**: `pp_edc_manual_default` + `approval_code` 누락 요청 → **200 OK** (기대: 400 with English message).
- **뿌리 (추정)**: 라우트가 `createPaymentSessionsWorkflow` + `capturePaymentWorkflow` 만 호출. `authorizePaymentSessionStep` 명시 호출이 없어 provider 의 `authorizePayment` (여기서 validation throw) 가 **발동되지 않음** → session 만 생성되고 200 반환.
- **수정 방향**: 라우트의 collection 생성 뒤에 `authorizePaymentSessionForOrderWorkflow` 또는 `authorizePaymentSessionStep` 추가.

### FINDING #2 · POST `/admin/pos/orders/:id/fulfill` · takeaway 에서 500
- **증상**: takeaway 주문에 fulfill 호출 → 500 Internal Server Error.
- **뿌리 (추정)**: `createTestOrder` 가 `orderModule.createOrders` 로 **raw items** 생성 → line item 이 `variant_id` / `inventory_item_id` 와 링크 없음 → `createOrderFulfillmentWorkflow` 가 inventory lookup / reservation 단계에서 crash.
- **수정 방향 (2 경로)**:
  - (a) **라우트**: inventory 없는 item graceful handling (fulfillment 생성은 하되 adjust 스킵).
  - (b) **테스트 helper**: product → variant → inventory_item → reservation 전체 체인 구축.

### FINDING #3 · POST `/admin/pos/orders/:id/fulfill` · `order.metadata.fulfillment_stage` 미저장
- **증상**: preorder fulfill → response 는 `stage:"send_to_production"` OK. 그러나 `orderModule.retrieveOrder(id).metadata.fulfillment_stage` 가 `undefined`.
- **뿌리 (추정)**: 라우트의 `orderModule.updateOrders({ id, metadata })` 호출이 `try/catch` 로 감싸져 있고 silent fail (`console.warn` 만). 실제로 저장 안 됨.
- **수정 방향**: `updateOrders` 실패 시 500 반환 OR transactional 묶기. `"order"` resolve name 재확인.

---

## 4. CI 워크플로

`.github/workflows/ci.yml` 에 신 job:

```yaml
pos-integration:
  services:
    postgres: { image: postgres:16-alpine, ports: [5432:5432], ... }
  env: { DB_HOST: localhost, DB_USERNAME: postgres, DB_PASSWORD: postgres, ... }
  steps:
    - Checkout + pnpm 9.15.0 + Node 20
    - pnpm install --frozen-lockfile   # 상시 ⓑ
    - pnpm --filter commerce-core build
    - pnpm --filter commerce-core test:integration:pos
```

CI 트리거: `needs.changes-filter.outputs.commerce_core == 'true' || github.event_name == 'pull_request'` — 사실상 모든 PR 에서 실행.

---

## 5. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 (integration-tests/pos/** · jest config · CI workflow) | ✓ |
| 제품 코드 수정 금지 (src/**) | ✓ (변경 0) |
| 결함 발견 → "발견" 섹션만 · fix 별 라운드 | ✓ (3 건 명시) |
| 상시 ⓑ (package.json 변경 시 격리 frozen-lockfile) | ✓ (pg-god + test-utils devDep 추가 · 격리 /tmp exit 0 확인) |
| 상시 ⓒ (산출물 기동 BOOT OK) | **N/A** · 테스트만 · 제품 코드 미변경 |
| ADDENDUM §2 영어 (테스트 messages · 코멘트) | ✓ |
| naming-check PASS | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (unit → real DB 통합 테스트 승격 · J-b 기술 선택 1 보강) |
| 등재 | +3 (FINDING #1/#2/#3 · M0-1105-C fix 라운드) |
| 미결 | 1 (ci-pos-integration-green · CI 러너 3/6 PASS 확인) |
| **총 순증감** | **+2 (등재 우세)** |

---

## 7. 다음 게이트

1. **CI** — PR #184 push 후 GitHub Actions pos-integration job 러너에서 3/6 PASS 베이스라인 확인.
2. **M0-1105-C (fix 라운드)** — 발견 3건 수정 · 테스트 6/6 PASS 목표:
   - #1: 라우트에 `authorizePaymentSessionStep` 명시 호출 삽입
   - #2: fulfill 라우트 inventory graceful OR 테스트 helper 를 product→variant→inventory_item 체인으로 확장
   - #3: `orderModule.updateOrders` silent fail 제거
3. **M0-1104-J-c (별 라운드)** — Xendit SDK + webhook (Kyu Xendit test key 1Password 공유 선행).

---

*M0-1105-B · 2026-11-05 · 통합 테스트 infra + 6 시나리오 · 3 PASS 3 FAIL · 3 발견 수집 · CI job 신설 · 제품 코드 수정 0 · storeport PR #184 (base #183) · fix 라운드 M0-1105-C 대기*
