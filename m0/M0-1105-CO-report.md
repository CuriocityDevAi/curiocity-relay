# M0-1105-CO — #277 pos-integration ❌ 원인 판정 + 수정

**제품 버그 (분류 b) · 원인 `apps/commerce-core/src/modules/pos_settings/service.ts:90` · `loyalty_settings/service.ts:101` · `lib/link-customer-order.ts:88·113` (동시 2 경로 getOrCreate/account 레이스 → unique violation 500) · CI 결과 run 43705615290 ci-summary ✅ 통과 (`0da8ff7`)**

돈 관련 (R3 손님 연결 · R4 적립). 재현 테스트는 integration-tests/loyalty/customer-link.spec.ts + link-earn.spec.ts 에 이미 포함(이것이 이번에 실 DB 에서 처음 돌면서 들추어낸 레이스).

## 2단 원인 체인

### 1단 · (a) 테스트 인프라 (ff159e8)
`apps/commerce-core/scripts/test-integration-pos.sh` 는 M0-1105-CN(24cc041)부터 `integration-tests/pos/*.spec.ts` + `integration-tests/loyalty/*.spec.ts` 를 함께 열거해 **TEST_TYPE=integration:pos** 로 jest 호출. 그런데 `jest.config.js:32-36` 가 `integration:pos` 의 testMatch 를 `pos/**` 로만 좁혀둠 → customer-link·expiry·link-earn·store-credit-smoke 가 `--testPathPattern` 에 걸리지 않고 "0 matches" 종료. **run 43701607244 에서 4 spec 가 아예 실행조차 못 됨**.

**ff159e8**: `integration:pos` testMatch 에 `loyalty/**` 추가 → 모든 loyalty spec 실 DB 부팅·실행.

### 2단 · (b) 제품 버그 (cb3cd4a + 0da8ff7)
loyalty spec 가 실 DB 에서 처음 돌면서 **run 43703648208 pos-integration ❌ 8m28s** — 2 spec fail (4 case):
- `FAIL customer-link.spec` 2/12 (`동시 2 요청 → customer 1명만 생성` · `동시 2 요청(옛 customer 2명 공존)`)
- `FAIL link-earn.spec` 2/5 (`earnForOrder × 2 동시` · `동시 두 경로 → 적립 1회 (idempotent on 2nd)`)

뿌리 = **"listX=0 → createX 두 번" naive upsert.** settings 모듈 2종 + store-credit account + customer create 모두 동일 패턴. 서버 500:
- `Pos settings with scope: store, already exists.` at `pos_settings/service.ts:90`
- store_credit_account unique(customer_id) 23505
- customer unique partial index on `metadata->>'phone_e164'` (Migration20261115000001) 23505 — Medusa dbErrorMapper 가 `err.code` 유지 안 하고 "already exists" 메시지로만 넘어오는 경로가 있어 기존 `err?.code === "23505"` 가드가 비껴감.

#### 수정 (4 곳 동일 패턴 "listX=0 → createX; catch 23505 or 'already exists' → 재조회해 승자 row 반환")
- **cb3cd4a** ·
  - `apps/commerce-core/src/modules/pos_settings/service.ts :: getOrCreateByScope`
  - `apps/commerce-core/src/modules/loyalty_settings/service.ts :: getOrCreateStoreSettings`
  - `apps/commerce-core/src/lib/link-customer-order.ts :: upsertCustomerAndAccount` (store_credit account 생성부)
- **0da8ff7** · `apps/commerce-core/src/lib/link-customer-order.ts :: findOrCreate` (customer 생성부 23505 catch 에 Medusa 랩 메시지 포함)

link-earn 의 "적립 1회" 멱등 보장은 `earn.ts` 의 `pg_advisory_xact_lock('loyalty-earn:'||order_id) + metadata.loyalty_earn` (설계대로) 가 담당. 이번 500 은 **settings row 가 없는 첫 적립의 pre-lock 단계** (loadSettings) + **upsertCustomerAndAccount** 에서 터진 것이므로 설계는 유지하고 getOrCreate/upsert 자체를 멱등으로.

## 커밋 · PR

- **ff159e8** `fix(commerce-core): M0-1105-CO — pos-integration testMatch 에 loyalty spec 편입` (분류 a · 인프라)
- **cb3cd4a** `fix(commerce-core): M0-1105-CO — pos_settings·loyalty_settings·store_credit_account 동시 생성 23505 재주사` (분류 b · 제품 버그)
- **0da8ff7** `fix(commerce-core): M0-1105-CO — customer upsert 23505 catch 에 Medusa 랩 메시지 포함` (분류 b · 보강)
- PR #277 `feat/m0-1105-cn-loyalty-ci` · 최신 run **43705615290** ci-summary **✅ 통과** (pos-integration pass 8m35s · customer-display pass · e2e-admin-loyalty pass · unit-commerce-core pass · markers-and-forbidden pass · changes-filter pass)

## 재현 테스트 (제품 버그 가드)

- `integration-tests/loyalty/customer-link.spec.ts` · `동시 2 요청 → customer 1명만 생성` · `동시 2 요청(옛 customer 2명 공존) → customer 1명만` · 12/12 ✅
- `integration-tests/loyalty/link-earn.spec.ts` · `earnForOrder × 2 동시 → credit tx 1건 · 잔액 1회분 (C1)` · `동시 두 경로 → 적립 1회 (idempotent on 2nd)` · 5/5 ✅

CI pos-integration job 에서 상시 가드.

## 이연 순증감

없음.
