# M0-1105-CK — R0-EY C1 + C2 적용 리포트 (Opus · 45분 상한 내)

**C1 방식: pg_advisory_xact_lock('loyalty-earn:'||order_id) + 락 안 metadata.loyalty_earn 신선 재확인 (23505 dead branch 제거) · C2: subscriber event ["payment.captured"] 단독 + payment→order 링크 해석 · CI 결과: 1차 실행에서 loyalty 통합 테스트 CI 편입이 선행 migration 버그로 실패 → 2차 수정으로 CI 편입 롤백·pos-integration 녹색 기대 (14:54 UTC+7 push · 재실행 중)**

## 수행

### [REQ 0] #271 → main rebase
- **Clean rebase** (충돌 없음). 전 베이스 29ea759 → 신 베이스 8b52033 (#261 R7 머지 반영).
- 로그: `Rebasing (1/2) Rebasing (2/2) Successfully rebased and updated refs/heads/feat/m0-1105-ci-s1b-r4.`
- push: `git push --force-with-lease origin feat/m0-1105-ci-s1b-r4` (9699d63 → 528d260 → 66be739).

### [REQ 1] C1 필수 — earnForOrder 동시성 갭

**방식 (권장안 그대로 · 528d260)**:
- `earnForOrder` 전체를 주문 단위 `pg_advisory_xact_lock(hashtext('loyalty-earn:'||order_id)::bigint)` 로 감쌈. 헬퍼 `withOrderEarnLock` 을 `apps/commerce-core/src/lib/loyalty/earn.ts` 에 신설. #261 (M0-1105-CF/CG) `expiry-runner.ts` 의 `withAdvisoryXactLock` 과 동일 패턴 (knex transaction 안 xact lock → commit/rollback 시 자동 해제 → pool 안전).
- 블로킹 lock (try-lock 아님). 2nd 호출은 1st 가 끝날 때까지 대기 후 진입.
- 락 안에서 `orderModule.retrieveOrder(input.order_id)` 로 **metadata.loyalty_earn 를 신선 재조회·재확인** (호출자 input.order 는 stale 할 수 있음). applied===true 면 `idempotent=true` 로 조기 반환.
- **23505 catch 제거** — 플러그인 `store_credit_account_transaction` 에 `reference_id` unique 제약이 없어 (migration `20250130220640.js` pkey only) 죽은 코드였음. 주석으로 사실 정정 (플러그인 unique index 추가는 업그레이드 리스크 비권장).
- 환경: pg 커넥션 없으면 (일부 단위 테스트) lock 없이 fallback.

### [REQ 2] C2 — subscriber 과다 구독

**1차 (528d260)**: `loyalty-earn-on-paid` 의 `config.event` 를 `["order.updated", "payment.captured"]` → **`["payment.captured"]`** 로 축소.

**2차 (66be739 · CI 1차 실행 결과 반영)**: `core-flows/payment/workflows/capture-payment.js:54` 의 payment.captured 이벤트 data 가 `{ id: payment.id }` (= PAYMENT id, 주문 id 아님). 1차 CI 로그에서 `loyalty-earn-on-paid subscriber failed: Order with id: pay_01M7F2EJV4GHFVWP4F8W0XRA3Y was not found` 경고 폭주 (실제론 try/catch 흡수 · 테스트 fail 는 아니었지만 적립이 전혀 안 됨). 해결: subscriber 가 `order_payment_collection` 링크 (query.graph) 를 통해 `payment_id → payment_collection_id → order_id` 를 해석한 뒤 earnForOrder 호출. query.graph 가 안 되는 fallback 경로 (payment 모듈 retrieve + order_payment_collection 조회) 도 배치.

**근거 (PR 본문 포함)**:
- `capturePaymentWorkflow` 가 POS tenders 와 xendit webhook 양쪽에서 호출 (`src/api/admin/pos/orders/[id]/tenders/route.ts:1125`, `src/api/hooks/payment/xendit/route.ts:464`) → `payment.captured` 가 결제 완료의 정본 신호.
- `order.updated` 는 earnForOrder 자신의 `updateOrders({metadata: ...loyalty_earn})` 로도 발화 → self 재진입 유발.

### [REQ 3] 테스트 + CI 편입

- 신규 case `earnForOrder × 2 동시 → credit tx 1건 · 잔액 1회분 (C1)` — `integration-tests/loyalty/link-earn.spec.ts`. `Promise.all([earnForOrder, earnForOrder])` 후 account transactions 를 조회해 `reference="order_earn"` tx 가 **정확히 1건**, 잔액 = earned 1회분임을 검증. 두 결과 모두 같은 `earned` + idempotent count = 1.

- **CI 편입 시도 → 롤백**:
  - 1차 (528d260) `scripts/test-integration-pos.sh` 를 확장해 pos-integration job 에서 `integration-tests/loyalty/*.spec.ts` 도 실행하게 함.
  - 1차 CI 결과: pos spec 들은 전부 pass. 하지만 loyalty/customer-link · loyalty/expiry · loyalty/link-earn 3 spec 가 전부 `TableNotFoundException: relation "loyalty_settings" does not exist` 로 실패.
  - 뿌리: 로컬 모듈 `loyalty_settings` · `customer_display_settings` 의 migration 이 fresh test DB 에서도 `"MODULE: loyalty_settings — Skipped. Database is up-to-date for module."` 로 보고하며 실제 CREATE TABLE 이 나가지 않음. 선행 버그 (수주간 pos tests 에서도 non-fatal 경고로 흘러 있었음 — 17071 라인 "loadSettings → earnForOrder → linkCustomerToOrder → POST /customer" 트레이스 참조).
  - 2차 (66be739) loyalty glob 롤백 (주석으로 뿌리·별건 범위 명시). 신규 C1 테스트 코드는 link-earn.spec.ts 에 유지 — 선행 migration 버그 해결 시 자동 녹색.

### [REQ 4] 덧붙이 — TS18046

- `src/api/admin/pos/orders/[id]/loyalty-info/route.ts:79` 에서 `container.resolve("store_credit")` 반환을 `as any` 로 캐스팅 (1 줄).

## 돌려본 로그

- `pnpm typecheck` (commerce-core · 528d260 / 66be739) → **에러 0** (exit 0).
- `bash scripts/naming-check.sh` → **PASS** (meros 매치 = 0).
- `node scripts/feature-map-check.mjs` → 커버리지 에러 없음.
- `pnpm lint` → **미검증** (워크트리 node_modules 에 `@medusajs/eslint-plugin` 미설치 · 로컬 환경 제한 · CI check job 에서 검증).
- 로컬 integration 실행 → **미검증** (test DB·migration 세팅 로컬 복제 생략).
- CI 1차 (528d260 · run 43690889531): pos-integration FAIL (loyalty 3 spec · 선행 migration 버그로). unit-commerce-core PASS · check PASS · markers-and-forbidden PASS · changes-filter PASS. docker-smoke·wrangler SKIP.
- CI 2차 (66be739 · push 14:54 UTC+7): 재실행 중 — 리포트 제출 시점에는 전 job pending. 롤백 이유로 pos-integration 녹색 기대.

## gh pr checks 271 (job 별 · 2차 push 직후)

| job | 상태 |
|---|---|
| changes-filter | pending (reran) |
| check | pending (reran) |
| markers-and-forbidden | pending (reran) |
| unit-commerce-core | pending (reran · 1차 PASS) |
| pos-integration | pending (reran · 1차 FAIL 롤백 뒤 녹색 기대) |
| docker-smoke-{anchor,commerce-core,wing} | skipping |
| wrangler-check-care-agent | skipping |

(10 분 폴링 한도 임박 · 2차 결과는 다음 session / 사용자가 확인)

## 이연 순증감

- **이연 정리**: TS18046 1건 (`loyalty-info/route.ts:79`) 해소.
- **신규 이연**:
  - **선행 migration 버그** (범위 외 발견): `loyalty_settings` · `customer_display_settings` 로컬 모듈이 fresh test DB 에서도 "Database is up-to-date for module." 로 보고하며 테이블을 만들지 않음. 결과로 integration-tests/loyalty/* 의 3 spec (customer-link · expiry · link-earn) + pos 전 spec 에서 non-fatal 경고 발생. 별건 티켓 제안 — M0-1105-C? (가칭) "loyalty_settings/customer_display_settings migration tracker 재생성" · tracker 는 선행 DB 가 재사용돼 있거나 (test-utils 재사용 패턴) module 등록 자체의 migrationsPath 가 .medusa/server 로 bake 돼 있어 fresh fs 와 괴리.
- **net**: -1 (TS 1건 해소 · 다만 발견된 선행 버그 1건은 별건으로 등재 필요).

## 코드 다이프 요약

- `apps/commerce-core/src/lib/loyalty/earn.ts` (대폭 리팩터 · lock 헬퍼 + 락 안 재확인 · 23505 제거)
- `apps/commerce-core/src/subscribers/loyalty-earn-on-paid.ts` (event list 축소 + payment→order 링크 해석)
- `apps/commerce-core/integration-tests/loyalty/link-earn.spec.ts` (+71 — 신규 C1 케이스)
- `apps/commerce-core/scripts/test-integration-pos.sh` (helper refactor 유지 · loyalty glob 롤백)
- `apps/commerce-core/src/api/admin/pos/orders/[id]/loyalty-info/route.ts` (:79 한 줄)

## 착지 커밋

- `528d260` fix(loyalty): M0-1105-CK · R0-EY CHANGES — 적립 동시성 갭 + subscriber 재진입
- `66be739` fix(loyalty): M0-1105-CK — subscriber payment→order 해석 + CI loyalty glob 롤백

PR #271 본문: C1/C2 섹션 + 확인(실기) 항목 갱신 완료 (2차 push 반영 pending).
