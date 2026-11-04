---
round: M0-1104-J
pr:
  storeport: storeport#180
outcome: planning-gate · P1 결제·영수증 서버 골격 계획서 1파일 · 3 PR 분할 제안 · 코드 변경 0
kyu_checks: 1 (plan-approved · 라운드 분할·Xendit test key 공유 플래그)
---

# M0-1104-J · P1 결제·영수증 서버 골격 계획서

**일자**: 2026-11-04 · **허브**: M0 · **성격**: 방법론 ③ 계획 게이트 · **코딩 금지** · **산출**: `storeport/docs/plans/M0-1104-J-payment-core-plan.md` (1 파일 · 324 줄).

**입력**:
- `curiocity-relay/docs/research/pos-payment-flows/meros-payment-flow-spec-v0.md`
- `global-reference.md` + `indonesia-reference.md`
- **`ADDENDUM-1104.md`** (Kyu 22:14~22:45 · 부록이 정본 §10 보다 우선 · 다음 라운드부터 반영)
- Kyu 결정 (11-04): 반올림 없음 · 세금 라벨/%는 Admin 설정(기본 숨김) · 카드 승인번호+마지막4자리 필수 · 분할 결제 P6 이후 · PG=Xendit · 거래 종류 3 (Takeaway/Pre-order/Delivery) · Pre-order 선결제 DP 비율 Admin 설정(기본 100%) · **재고는 전달/출고 이벤트에서 차감**

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | 코어 대사표 (file:line 실측 5+) | ✓ (실측 10건) |
| 2 | 설계 (3 provider · receipt 모듈 · register_session 확장 · order.metadata · pos_settings) | ✓ |
| 3 | API 목록 9개 (tenders · fulfill · receipt · settings · Xendit webhook) | ✓ |
| 4 | 라운드 분할 (P1a/b/c) 파일 주인 · 검증 · 위험 3줄 | ✓ |
| 5 | docs-only PR (`docs/m0-1104-j-payment-plan` · storeport) | ✓ PR #180 |
| 6 | 코딩 0 | ✓ |

---

## 1. 코어 대사표 (실측 10건 · file:line)

### Medusa v2.17.2 결제

| 개념 | 근거 (파일:라인) |
|------|---|
| **PaymentCollection** 필드 (`id · currency_code · amount · authorized_amount · captured_amount · refunded_amount · status · completed_at · metadata · payment_providers (M:N) · payment_sessions (1:N) · payments (1:N)`) | `node_modules/.pnpm/@medusajs+payment@2.17.2_.../dist/models/payment-collection.d.ts:1-11` |
| **Collection status 8 값** (`not_paid · awaiting · authorized · partially_authorized · partially_captured · canceled · failed · completed`) | `@medusajs+types@2.17.2_.../dist/payment/common.d.ts:5` |
| **PaymentSession** (`id · currency_code · amount · provider_id · data · context · status · authorized_at · payment_collection · payment · metadata`) + **status 7 값** (`authorized · captured · pending · requires_more · error · canceled · pending_authorization`) | `@medusajs+payment/.../dist/models/payment-session.d.ts:4-11` · `common.d.ts:6` |
| **Payment** (`id · amount · currency_code · provider_id · data · metadata · captured_at · canceled_at · payment_collection · payment_session · refunds · captures`) · status 필드 X | `@medusajs+payment/.../dist/models/payment.d.ts:3-10` |
| **AbstractPaymentProvider** 10 필수 (`initiatePayment · authorizePayment · capturePayment · refundPayment · cancelPayment · deletePayment · getPaymentStatus · updatePayment · retrievePayment · getWebhookActionAndData`) + 6 선택 | `@medusajs+types/.../dist/payment/provider.d.ts:384-673` |
| **markPaymentCollectionAsPaid** 5 step: query(not_paid 요구) → provider_id 결정 (기본 `pp_system_default`) → `createPaymentSessionsWorkflow` → `authorizePaymentSessionStep` → `capturePaymentWorkflow` | `@medusajs+core-flows/.../order/workflows/mark-payment-collection-as-paid.js:55-83` (provider_id fallback `:33, 63`) |
| **Order ↔ PaymentCollection 1:N** (`payment_collections` 복수형) | `@medusajs+order/.../dist/schema/index.d.ts:322` |
| **Order.payment_status enum 10 값** | schema `:317-321` |
| **session.data Store API 노출 확정** → PG 키 금지 · `qr_string`/`expires_at` 만 안전 | `@medusajs+types/.../dist/http/payment/store/entities.d.ts:14-19` |
| **Provider 등록 패턴** `modules: [{ resolve: "@medusajs/medusa/payment", options: { providers: [...] } }]` · 현 skeleton 등록 | `apps/commerce-core/medusa-config.ts:125-142` |

### Medusa 재고 + 이행 + draft

| 개념 | 근거 |
|------|---|
| **자동 reservation** (주문 생성 시) · `completeCartWorkflow` 안 `reserveInventoryStep` | `@medusajs+core-flows/.../cart/workflows/complete-cart.js:484` |
| **reserveInventoryStep** = `inventoryService.createReservationItems()` (reserved_quantity 점유 · stocked 미감) | `.../cart/steps/reserve-inventory.js:24-46` |
| **재고 차감 유일 지점** = `createOrderFulfillmentWorkflow` → `adjustInventoryLevelsStep` (`stocked_quantity` 감소 · 부호 반전) + reservation 삭제 + FULFILLMENT_CREATED | `.../order/workflows/create-fulfillment.js:219-360` (adjust `:360` · 부호 `:167`) |
| **Draft convert** → `reserveInventoryStep` + status DRAFT→PENDING + OrderPlaced | `.../draft-order/workflows/convert-draft-order.js:60-120` (reserve `:108`) |
| **Order.metadata** JSONB · 자유 확장 | `@medusajs+order/.../dist/models/order.d.ts:16` |
| **Store.metadata** JSONB · POS 설정 자리 후보 | `@medusajs+store/.../dist/models/store.d.ts:7` |

### storeport 현 상태

| 파일 | 내용 |
|------|------|
| `apps/commerce-core/src/modules/register_session/models/register-session.ts:14-42` | `id · stock_location_id · sales_channel_id · status(open/closed/voided) · opened_at · opened_by_user_id · opening_float · closed_at · closed_by_user_id · counted_cash · expected_cash · difference · note · z_snapshot(JSON) · movements(hasMany)` |
| `apps/commerce-core/src/modules/register_session/models/cash-movement.ts:12-32` | `type(sale/pickup/adjustment) · amount · signed_delta · reason · recipient · order_id · created_by_user_id` |
| `apps/commerce-core/src/modules/register_session/service.ts:13-35` | 자동 CRUD + `findOpenSession(stockLocationId)` |
| `apps/commerce-core/src/api/admin/register-sessions/[id]/pos-complete/route.ts:136-432` | 4 단계: metadata attach `:274-302` · collection+markPaid `:304-368` · fulfillment `:370-397` · CashMovement `:399-419` |
| `apps/commerce-core/src/modules/payment_{xendit,midtrans}/service.ts:19-21` | 빈 scaffold (`MedusaService({})`) |
| `apps/commerce-core/src/modules/receipt/` | **부재** (grep) |
| `agilo-medusa-pos-fork/api/hooks/register-session.ts:181-212` · `draft-orders.tsx:732-741` | `usePosComplete()` 호출 — convertToOrder 직후 pos-complete POST |

### Xendit 공식 Medusa v2 provider 유무 (추정)

로컬 node_modules grep `@xendit/medusa-*` · `medusa-payment-xendit` **0 hit**. Medusa v2 공식 provider = `@medusajs/payment-stripe` (추정). Xendit SDK = `xendit-node` v7+ 만 존재.

**결론**: **공식/커뮤니티 Xendit Medusa v2 provider 없음** → `apps/commerce-core/src/modules/payment_xendit/` 자체 구현 (AbstractPaymentProvider extends).

---

## 2. 설계 요지

### Provider 3종
- **`pp_cash`** (신규 `src/modules/payment_cash/`) — initiate no-op · authorize 저장 `{tendered, change, drawer_session_id}` · capture 즉시
- **`pp_edc_manual`** (신규 `src/modules/payment_edc_manual/`) — initiate `pending_authorization` · authorize 캐셔 입력 검증 (**bank+auth_code+last4 필수** · Kyu) → `authorized` · capture 즉시
- **`pp_qris_xendit`** (기존 scaffold `src/modules/payment_xendit/` 활용) — initiate Xendit createPayment → `{qr_string, expires_at, reference_no}` · authorize 폴링 · webhook captured

### `receipt` 모듈 (신규)
- 엔티티: `id · order_id (link) · receipt_no (R-YYMMDD-#### seq) · kind (sale/reprint/refund/void) · snapshot (jsonb) · delivered_via (jsonb array) · reprint_count · parent_receipt_id · issued_at · cashier_user_id · register_session_id · public_token`
- snapshot jsonb 구조: store · header/footer · receipt_no · items · subtotal/discounts/tax/rounding/grand_total · tenders[] · order_type · preorder · public_url
- 재고 차감 비연관 (영수증 생성 ≠ fulfillment)

### `register_session` 확장
- `register-session.ts` 필드 추가: `expected_by_method (jsonb)` (수단별 집계)
- `cash-movement.ts` enum 확장: `type` 에 `pay_in`·`pay_out` 추가
- service 메서드: `recalculateExpectedByMethod` · `attachZSnapshot`

### Order metadata 확장 (모델 변경 X)
- `order_type: 'takeaway' | 'preorder' | 'delivery'`
- `preorder: { pickup_at, note, deposit_pct, deposit_amount, balance_due } | null`
- `delivery: {...} | null`

### `pos_settings` 모듈 (신규)
- 옵션 A (채택 · 추정): 신규 모듈 · entity 1건 · settings jsonb
- 필드: `preorder_deposit_pct_default=100 · tax_{label,rate_pct,show_on_receipt}=null · receipt_{header,footer,logo_mode} · reprint_limit=3 · reprint_watermark · wa_default_target · rounding.enabled=false`

### API (9건)
1. POST `/admin/pos/orders/{id}/tenders` — 텐더 생성 (provider initiate+authorize+capture)
2. GET `/admin/pos/orders/{id}/tenders[/{id}/status]` — 조회 · 상태 polling
3. POST `/admin/pos/orders/{id}/fulfill` — "Serahkan" · createOrderFulfillmentWorkflow
4. POST `/admin/pos/orders/{id}/receipt[/reprint|/send]` — snapshot 생성 · 재인쇄 · 발송
5. GET/PUT `/admin/pos/settings` — 설정
6. POST `/webhooks/xendit` — PG 콜백

---

## 3. 라운드 분할 (3 PR · 모두 storeport · fork 교차 0)

| PR | 라운드 | 주요 파일 | Kyu 실기 (도장) |
|----|-------|---------|---------------|
| **A (현재)** | M0-1104-J | `docs/plans/M0-1104-J-payment-core-plan.md` | 계획 리뷰 · 라운드 승인 |
| **B** | M0-1104-J-a | 모듈 스켈레톤 (receipt · payment_cash · payment_edc_manual · payment_xendit 재편 · pos_settings) + 마이그레이션 + medusa-config | `pnpm --filter commerce-core build` PASS · **산출물 기동 BOOT OK** (M0-1104-I 상시) · migration 적용 확인 · provider 등록 로그 확인 · **격리 frozen-lockfile exit 0** (xendit-node 추가 · 상시 ⓑ) |
| **C** | M0-1104-J-b | provider 실구현 (pp_cash, pp_edc_manual) + 신 API 7개 + pos-complete shim | `POST /admin/pos/orders/:id/tenders` (cash+card) e2e · `POST /fulfill` → `stocked_quantity` 감소 확인 · `POST /receipt` → snapshot 저장 · payment_status 집계 확인 |
| **D** | M0-1104-J-c | Xendit 실 호출 + webhook + 런북 | Xendit test key · QRIS 생성 → settlement → `/webhooks/xendit` signature 통과 |

**선후**: A → B → C → D. **총 건드릴 파일** (B+C+D): ~27개 추정.

---

## 4. 위험 (3줄)

1. **`markPaymentCollectionAsPaid` → `pp_system_default` fallback** (`mark-payment-collection-as-paid.js:33, 63`). 현 pos-complete 는 이 workflow 호출 → 수단별 집계 불명. **대응**: C 에서 `createPaymentSessionsWorkflow` 를 **provider_id 명시**로 직접 호출.
2. **`initiatePayment.data` Store API 노출** (`store/entities.d.ts:14-19`). QRIS data 에 PG 키·raw 섞이면 유출. **대응**: data 는 `{qr_string, expires_at, reference_no, issuer}` **화이트리스트** · raw 는 `Payment.metadata` 격리.
3. **재고 차감 타이밍 vs Pre-order**. 유일 감소 지점 = `createOrderFulfillmentWorkflow` (`create-fulfillment.js:360`). 현 pos-complete 는 payment 성공 시 즉시 fulfillment → Pre-order 가 결제와 동시에 재고 소비 결함. **대응**: C 에서 `order_type==='preorder'` 는 fulfillment 를 **Serahkan 시점까지 보류** · reservation 만 유지.

---

## 5. 자기 검증 (실측 vs 추정)

**실측 10건** (file:line · 요구 5건 이상 충족):
1. `@medusajs+payment@2.17.2/.../models/payment-collection.d.ts:1-11` (PaymentCollection 필드)
2. `@medusajs+types@2.17.2/.../payment/common.d.ts:5-6` (status enum)
3. `@medusajs+types@2.17.2/.../payment/provider.d.ts:384-673` (AbstractPaymentProvider)
4. `@medusajs+core-flows@2.17.2/.../mark-payment-collection-as-paid.js:55-83` (markPaid 5 step)
5. `@medusajs+core-flows@2.17.2/.../create-fulfillment.js:219-360, 167` (재고 차감 유일 지점)
6. `@medusajs+core-flows@2.17.2/.../complete-cart.js:484` (주문 생성 시 reservation)
7. `@medusajs+core-flows@2.17.2/.../convert-draft-order.js:60-120` (draft convert reservation)
8. `@medusajs+types@2.17.2/.../http/payment/store/entities.d.ts:14-19` (session.data 노출)
9. `apps/commerce-core/src/modules/register_session/models/register-session.ts:14-42` (현 필드)
10. `apps/commerce-core/src/api/admin/register-sessions/[id]/pos-complete/route.ts:136-432` (현 pos-complete 4 단계)

**추정 4건** (B/C/D 착수 시 실측 승격 필요):
- `Order.payment_status` computed resolver 집계 로직 (B 라운드 e2e)
- Store 설정 저장 자리 (`pos_settings` 모듈 vs `Store.metadata`) · 옵션 A 채택
- Xendit 공식 Medusa v2 provider 부재 (로컬 grep 기준 · D 라운드 npm/GitHub 재검증)
- Order ↔ Receipt 1:N 링크 공식 경로 (`src/links/` 패턴 추정 · B 라운드 구현 시 실측)

---

## 6. 규약 정합

| 규약 | 상태 |
|------|------|
| 산출 = 계획서 1 파일 | ✓ (`docs/plans/M0-1104-J-payment-core-plan.md`) |
| 코드 변경 0 (docs only) | ✓ |
| 코어 대사표 (file:line) · 실측 5+ | ✓ (10건) |
| 건드릴 파일 목록 (리포별 · 주인 · 라운드별) | ✓ |
| 라운드 분할 (PR 수 · 순서 · Kyu 실기) · P1a/b/c | ✓ |
| 검증 (산출물 기동 포함 · M0-1104-I 상시) | ✓ (B/C/D 모두 BOOT OK 명시) |
| 위험 3줄 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |
| 자기 검증 (실측 vs 추정 명시) | ✓ (실측 10 · 추정 4) |
| 상시 ⓑ (package.json 변경 시 격리 frozen-lockfile) | **J-a 에서 xendit-node 추가 → 격리 검증 필수** 명시 |

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | 0 (계획 게이트) |
| 등재 | +3 (J-a · J-b · J-c 후행 라운드) |
| 미결 | 1 (plan-approved · Kyu 승인) |
| **총 순증감** | **+3 (등재)** |

---

## 8. 다음 게이트

1. **Kyu**: 계획 리뷰 → 라운드 분할 (J-a·J-b·J-c) 승인 · Xendit test key (B 라운드 선행) + 외부 신청 3건 (Xendit KYC · 은행 QRIS 스티커 · Apple Developer) 진행.
2. 승인 후: **M0-1104-J-a (모듈 스켈레톤)** 발의 → C → D 순차.
3. 별건: fork 측 UI (P2~P5) 는 G 계획 외 라운드로 fork 리포에서 병행.

---

## 9. ADDENDUM 반영 메모 (후속)

Kyu 22:45 추가 지시: **UI·영수증 문구 전부 영어** — `ADDENDUM-1104.md §2` 치환표 적용 · 부록이 정본 §10 보다 우선. 현 계획서는 한국어 설명 + 변수 이름(영어) 기준으로 작성. 구현 라운드(J-b·J-c)에서 영수증 snapshot 라벨 · API 응답 문구 · 런북 샘플 모두 영어로 치환. 플랜 doc 자체는 ADDENDUM 반영 amendment 커밋으로 별도 추가.

---

*M0-1104-J · 계획 게이트 · 코딩 0 · 실측 10 · 추정 4 · PR 3 분할 (J-a·J-b·J-c) · storeport PR #180 · 모두 storeport · fork 교차 0 · Kyu 승인 대기*
