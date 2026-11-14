# M0-1105-CA — 로열티 R1 리포트

**한 줄**: `@medusajs/loyalty-plugin@2.17.2` 설치·migrate·credit/debit 스모크 2 pass · draft PR #255 올림 · 결제 흐름 무변경.

PR: https://github.com/CuriocityDevAi/storeport/pull/255 (draft · base main)
Branch: `feat/m0-1105-ca-loyalty-plugin-install`
HEAD: `5860c76`

---

## 1. 버전 선택 근거

| 버전 | peerDeps | 결과 |
| --- | --- | --- |
| `@medusajs/loyalty-plugin@2.22.7` (latest · dist-tag) | `@medusajs/framework@2.22.7` 등 | 미채택 · 2.21+ workflow registry 변경 가능성 (진단 #253 위험 "버전 괴리") |
| **`@medusajs/loyalty-plugin@2.17.2`** | `react@^18.3.1` · `@medusajs/framework|cli|admin-sdk|dashboard|icons|test-utils@2.17.2` · `@medusajs/ui@4.1.19` · `react-router-dom@6.30.4` — commerce-core 의 선존 pin 과 1:1 정합 | **채택** |
| 자체 최소 모듈 | — | 플러그인이 정확히 fit 하므로 보류 (R5+ 재검토) |

peer warning (`@medusajs/icons@2.22.3` vs 요구 `2.17.2`) 은 commerce-core 의 선존 상태 · 이번 PR 이 도입한 게 아님.

## 2. 설치 + migrate 결과

- `pnpm add @medusajs/loyalty-plugin@2.17.2` 성공 (11s).
- `medusa-config.ts` 에 `plugins: ["@medusajs/loyalty-plugin"]` 등록.
- 로컬 postgres (`postgres://postgres@localhost:5432/medusa-ca-loyalty-test`) 에서 `medusa db:migrate` **성공**.

### 신 테이블 (6종 · psql `\dt` 실측)

- `store_credit_account` (id text PK · currency_code · customer_id · metadata jsonb · created/updated/deleted_at · code text — 나중 마이그레이션에서 추가됨)
- `store_credit_account_transaction` (id text PK · **amount `numeric`** · type text CHECK IN (credit,debit) · reference · reference_id · note · account_id FK · raw_amount jsonb · metadata jsonb · timestamps)
- `loyalty_gift_card`
- `loyalty_gift_card_store_credit_store_credit_account` (link)
- `cart_cart_loyalty_gift_card` (Medusa auto-link)
- `order_order_loyalty_gift_card` (Medusa auto-link)

### IDR 0 소수 확인

- `amount` 컬럼 = `numeric` (precision 미설정 · 임의 정밀도).
- 테스트에서 50000 / 20000 / 10000 정수로 저장 → 조회 시 정확히 복원.
- IDR 10 억 (10^9) 까지 정수 저장 문제 없음.

## 3. Admin "Store Credits" / "Gift Cards" 메뉴

실제 dev 서버 부팅은 범위 외이지만 플러그인 번들 **실파일** 로 증거 확인:

- `node_modules/@medusajs/loyalty-plugin/.medusa/server/src/admin/index.mjs` 안에 `label: "Store Credits"` · `label: "Gift Cards"` 문자열 포함.
- Medusa admin-bundler 가 플러그인의 `./admin` export (`package.json` exports 필드 참조) 를 Vite 번들로 흡수 → `/app` admin 사이드바에 자동 출현.
- **스크린샷은 Railway 배포 후 Admin 시크릿 창에서 1차 확인 필요** (또는 R2 범위에서 자체 smoke).

## 4. 통합 테스트 (`integration-tests/loyalty/store-credit-smoke.spec.ts`)

```
PASS integration-tests/loyalty/store-credit-smoke.spec.ts (8.029 s)
    M0-1105-CA · store_credit 계좌 credit/debit 스모크
      ✓ credit 50k → debit 20k → balance 30k (562 ms)
      ✓ 잔액 초과 debit · 2.17.2 는 'Insufficient balance' MedusaError 로 거부 (737 ms)
```

- Customer 생성: `email: null` · `metadata.phone_e164: "+62812..."` → PK 는 Medusa 기본 `cus_…` id · phone 은 metadata 용.
- 계좌 생성: `currency_code=idr` · 실제 id prefix = `sc_acc_…` (문서 예시의 `sca_` 와 다름 · 플러그인 실측 기준).
- credit 50k → debit 20k → `listStoreCreditAccounts` 응답의 `balance=30000` · `credits=50000` · `debits=20000`.
- 잔액 초과 debit (balance 10k 상태에서 100k debit 시도) → `store-credit/service.js:164` (`debitAccounts_` 내부) 가 `MedusaError(INVALID_DATA, "Insufficient balance")` throw.

### 잔액 초과 debit 거부 여부 — **있음** (최초 가정 뒤집음)

- 계획서/티켓 가정: "2.17 에서 검증 없으면 '없음' 명시 — R5 자체 lock 근거".
- **실측**: 2.17.2 의 `StoreCreditService.debitAccounts_` 가 `MathBN.convert(accountStats.balance).lt(amountBN)` 시 throw. 거부 **있음**.
- **R5 설계 영향**: 자체 lock 레이어가 플러그인 service 를 그대로 재사용하면 추가 가드 불필요. 단 workflow step 레벨 (`debitAccountStep`) 은 그냥 service 호출만 할 뿐 자체 가드 없음 → 다른 모듈에서 workflow step 을 우회해 직접 DB 에 debit row 를 꽂는 경로는 여전히 위험 (R5 설계에서 명시적 lock + idempotency key 로 보강 권장).

## 5. 배포 영향

- 머지 시 Railway `predeploy = "medusa db:migrate"` 가 신 테이블 6종을 생성 (idempotent).
- 되돌리기: npm 에서 plugin 제거만으론 테이블 drop 안 됨 → down 마이그레이션 수동 실행 필요 (`store_credit_*` · `loyalty_*` · 2 auto-link).
- 운영 데이터 유입 전 (= 지금) 이면 drop 안전.
- 기존 결제 흐름 (`@medusajs/medusa/payment` providers · `/admin/pos/orders/:id/tenders|refund|return|void` · xendit webhook) 코드 변경 0 — regression 가능성 낮음.
- Admin 사이드바에 "Store Credits" · "Gift Cards" 2개 메뉴 추가 (R2~R6 에서 활용).

## 6. 금지사항 준수

- POS 결제 라우트 미수정 (`src/api/admin/pos/` 변경 0).
- 운영 SSH · Railway CLI · 운영 DB · 키체인 접근 0.
- PR 머지 금지 — draft 로만 제출.
- 네이밍 3층 규약 (naming-check PASS · meros 매치 0).
- `feature-map.yaml` 신 L2 `commerce-core.loyalty-store-credit` 등록 → PR diff 전수 커버.

## 7. CI (push 후 자기 검증)

GitHub Actions 상태 — `gh pr checks 255 --watch` 백그라운드 실행 중.
초기 상태 (push 직후):
- `changes-filter` · `check` · `markers-and-forbidden` · `unit-commerce-core` — all pending.

CI 결과가 확정되면 PR 코멘트에 상태 요약 필요. 지금 리포트는 로컬 선-검증 기준 (typecheck pass · unit 160/160 pass · integration:loyalty 2/2 pass · naming-check pass).

**리포트 제출 시점 CI 실측 (`gh pr checks 255`)**:
- `changes-filter` · `check` · `markers-and-forbidden` · `unit-commerce-core` — **pass**.
- `pos-integration` — pending (실행 중 · 결제 라우트 변경 없어 regression 가능성 낮음).
- `docker-smoke-anchor` · `docker-smoke-commerce-core` · `docker-smoke-wing` · `wrangler-check-care-agent` — **skipping** (changes-filter 기준 트리거 안 됨 · 예상 동작).

## 8. 실패 시 대안 (해당 없음)

`@medusajs/loyalty-plugin@2.17.2` 설치·migrate·workflow 호출·admin 번들 모두 성공했으므로 "플러그인 모듈만 복사 / 자체 최소 모듈" 대안 경로는 트리거되지 않았다.

## 9. 파일

- `apps/commerce-core/package.json` + `pnpm-lock.yaml` + 루트 `pnpm-lock.yaml`
- `apps/commerce-core/medusa-config.ts`
- `apps/commerce-core/jest.config.js`
- `apps/commerce-core/integration-tests/loyalty/store-credit-smoke.spec.ts` (신규)
- `docs/feature-map.yaml` (loyalty-store-credit L2 추가)
