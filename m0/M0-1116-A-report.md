# M0-1116-A — 운영 적립 0 원인 규명 + 수정

**원인(c) · apps/commerce-core/src/lib/loyalty/earn.ts:168 (subtotal=0) ← apps/commerce-core/src/lib/link-customer-order.ts:265 (orderModule.retrieveOrder) · 수정 PR = 자기 브랜치 fix/m0-1116-a-loyalty-earn · Kyu 운영 확인 1줄 = "pos-settings/loyalty 에서 Loyalty program enabled 가 ON 인지 확인(1줄 토글). 2026-11-17 거래부터 적립이 즉시 들어와야 함"**

## 후보 판정

| 후보 | 참/거짓 | 파일:줄 · 근거 |
|---|---|---|
| (a) enabled 토글 저장/읽기 키 불일치 | 거짓 | `src/modules/loyalty_settings/service.ts:10` persistence 와 `src/lib/loyalty/earn.ts:137` runtime 모두 `enabled` 동일 키. 미검증(DB 접근 불가) 보조 가설: Kyu 토글 미클릭이면 default=false. → Kyu 운영 확인 항목에 편입 |
| (b) earn_on_balance_tender_only=TRUE 기본 ⇒ 현금=0 | **거짓** | `src/lib/loyalty/receipt-preview.ts:120-130` 실 분기: TRUE + `earn_base='paid_non_credit'` (기본) → earnBase=`paidOtherAfterRefund` = **현금/QRIS 금액**. 현금 결제도 earn>0 이 정상. Admin UI 라벨 "When on, points are earned only on the store-credit portion of payment" (`src/admin/routes/pos-settings/loyalty/page.tsx:1076-1078`) 와 서버 동작은 **역방향**이지만 `0` 유발과는 무관. (UI 라벨 vs 서버 플래그명 불일치는 별건 처리 권고.) |
| (c) earn_base 계산이 paid=0 (subtotal 미독) | **참 · 주원인** | `src/lib/loyalty/earn.ts:168` `const subtotal = Number(srcOrder.item_subtotal ?? srcOrder.subtotal ?? 0);` + `link-customer-order.ts:265` `refreshedOrder = await orderModule.retrieveOrder(input.order_id)` — Medusa v2 `orderModule.retrieveOrder` 는 **raw column 만** 돌려주고 computed totals(`item_subtotal`/`subtotal`/`total`/`discount_total`)는 비어있음. 결과: subtotal=0 → `previewReceipt` paidOther=0 → earnBase=0 → earn=0. 참조: `src/api/admin/register-sessions/_helpers.ts:99-115` 는 동일 모듈에서 `select` 로 명시 field 요청하는 정합 패턴. 기존 통합 테스트 `integration-tests/loyalty/link-earn.spec.ts:59-62` 주석 "earnForOrder 는 order.item_subtotal 기본 → 없으면 0" 이 이미 알고 있었지만 syntheticOrder 로 우회만 하고 실 데이터-경로 결함을 잡는 테스트가 없었다. |
| (d) linkCustomerToOrder 가 post-payment 에서 earnForOrder 미호출 | 거짓 | `src/lib/link-customer-order.ts:208` `isCompleted = !!(order.metadata as any)?.receipt_no` + `:264-269` `isCompleted ? earnForOrder(...)`. 운영 #108/#109 는 "Paid" → 영수증 발급 → `metadata.receipt_no` 저장 (`src/api/admin/pos/orders/[id]/tenders/route.ts:1478`) → earnForOrder 호출. 호출은 되었으나 subtotal=0 로 조기 반환(zero_earn)만 발생. |
| (e) Store Credits 계정 customer_id 미연결 ("N/A") | 부분 참(부작용) | `src/lib/link-customer-order.ts:130` · `src/lib/loyalty/earn.ts:205` 둘 다 `{ customer_id: customerId, currency_code: "idr" }` 로 생성. 신규 생성 account 는 항상 customer_id 포함. 운영 스샷의 "N/A" account 는 **별건** — fork 앱의 과거 결제 경로나 이전 라운드에서 생성된 이전 데이터 가능성(이 수정 범위에서는 신규 탄생을 방지하지 않지만 신규 탄생도 아님). 이번 수정 이후 적립이 돌면 Admin 의 올바른 계정에 Balance/Credits 가 누적되고 해당 account 의 Customer 열은 실 id 로 표시된다. 운영의 잔존 "N/A" 열 1건은 이번 라운드 범위 밖(이연). |

## 수정

1. **`apps/commerce-core/src/lib/loyalty/earn.ts`** — `fetchOrderWithTotals(container, orderId)` 신설(query.graph 로 `item_subtotal · subtotal · total · discount_total · customer_id · metadata` 명시 field 요청). `retrieveOrder` 호출 2개소(initialOrder · 락 내부 freshOrder)를 이 helper 로 교체. 호출자가 order 를 주입하지 않아도 earnBase 가 0 으로 떨어지지 않도록 안전하게.
2. **`apps/commerce-core/src/lib/link-customer-order.ts`** — post-payment 분기(`isCompleted` 안)의 refreshedOrder 를 기존 `orderModule.retrieveOrder` 대신 함수 상단에서 이미 쓰고 있던 `query.graph` 로 명시 field 요청. earnForOrder 에 totals 가 채워진 order 를 전달.
3. **응답의 `skipped_reason`** — 기존에도 `EarnResult.skipped_reason` 는 `src/lib/loyalty/earn.ts:28-38` 에 정의되어 응답에 포함되고 있음(별도 조치 불요). 앱이 "비활성(loyalty_disabled)·no_customer·zero_earn" 등을 받아 표시할 수 있다(앱 표시는 이연).
4. **(b)/UI 라벨 vs 서버 플래그 역방향** — 이번 라운드 범위 밖으로 이연. 운영에서 default 인 채로 둬도 R4 결정 "적립 = 실제 낸 돈" 과 **현재 서버 동작은 부합**(현금 전체액이 earnBase). UI 라벨 문구만 혼동. 별건 티켓 권고.

## 재발 방지 (테스트 1건)

**`apps/commerce-core/integration-tests/loyalty/link-earn.spec.ts`** — "Cash 결제 완료 → 결제 후 번호 연결 → earn = floor(subtotal × 1%)" 신규 case. 실 `createTestOrder` (pos/helpers) 로 line_item 포함 주문 생성 → `POST /admin/pos/orders/:id/customer` 호출 → `res.data.earn.earned === floor(33000*0.01) === 330` 보장 + account.customer_id 검증. 기존 테스트가 왜 못 잡았는가 1줄: **모든 기존 case 가 `items: []` (subtotal 없음) orders 거나 synthetic order 를 earnForOrder 에 직접 주입해서 실 데이터-경로(orderModule.retrieveOrder → computed field 미populate)의 결함이 발화하지 않았다**(파일 상단 주석에서 이미 저자가 알고 있었음).

## 재현 로그

- **미검증(로컬 DB boot 미실행 · integration-tests 는 CI pos-integration 에서 돈다)**. 수정 근거는:
  - typecheck 통과 (`pnpm typecheck` EXIT=0)
  - naming-check 통과
  - 코드 리딩으로 확증(위 (c) 근거)
  - 테스트 파일 line 59-62 주석이 결함 존재를 명시
- 추가 미실행: `pnpm test:integration:loyalty`(Postgres+boot 필요 · 25분 상한 고려 CI 위임)

## Kyu 운영 확인 1줄

> Admin → pos-settings/loyalty 에서 **Loyalty program enabled** 가 ON 인지 확인. ON 이고 수정 배포 후 거래라면 결제 → 번호 연결 즉시 Admin Customer 의 Store Credit Account IDR 에 "총액 × 1%" (반올림 floor) 가 적립되어야 함. 새 거래 2건(현금) 후 Admin Customer 의 Credit balance 를 봐주세요.

## 이연 순증감

- +1 이연: **UI 라벨 vs 서버 플래그 역방향**(`earn_on_balance_tender_only`). Admin 라벨 "Earn only when paying with store credit" + 부제 "points are earned only on the store-credit portion of payment" 는 서버가 플래그 TRUE 에서 `paid_non_credit` 로 earn 하는 동작과 역. 별건 티켓로 분리(라벨 변경 or 서버 의미 반전) 권고.
- +1 이연: 운영 Store Credits 목록의 "N/A" Customer 1건 조사(이번 수정으로 신규 생성은 방지되지만 과거 잔존 account 정리는 별건).
- 0 신규.
