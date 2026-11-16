# M1-1116-N 진단 보고서

**공통 원인**: `linkCustomerToOrder`의 `orderModule.updateOrders([{ customer_id }])`가 Medusa v2 link table을 갱신하지 않아 `query.graph customer.*`가 null 반환 → ①②③ 모두 여기서 파생 · ① `orders-list/route.ts:143` query.graph customer.phone=null → "Guest" · ② `link-customer-order.ts:88` createCustomers에 phone만·email/name 없어 admin N/A · ③ `link-customer-order.ts:322` store_credit_balance=PRE-earn 잔액(0) 반환 · **적립식 = 세전(subtotal 90,000)×1.10% / 세후×?%는 미사용**

---

## REQ 1 — 번호 연결 흐름 추적

### 진입 경로 (두 경로 모두 `linkCustomerToOrder` 호출)

| 경로 | 파일 |
|------|------|
| 점원 키패드 | `src/api/admin/pos/orders/[id]/customer/route.ts` → `linkCustomerToOrder({ source: "pos_clerk" })` |
| 손님 iPad | `src/api/customer-display/snapshots/[id]/link-phone/route.ts` → `linkCustomerToOrder({ source: "customer_display" })` |

### `linkCustomerToOrder` 내부 흐름 (`src/lib/link-customer-order.ts`)

1. **전화번호 정규화** (line 180–189): `normalizePhone("08130442480")` → E.164 `"+6281380442480"`, masked `"0813-****-2480"`
2. **order 조회** (line 192–207): `query.graph fields: ["id","metadata","created_at","status","customer_id"]`
3. **결제 완료 판정** (line 208): `isCompleted = !!order.metadata?.receipt_no` — receipt_no 있으면 완료
4. **link_open_until 창 검증** (line 210–241): 완료 주문일 때만 snapshot.link_open_until 비교; register_session 없으면 허용
5. **upsertCustomerAndAccount** (line 244–255):
   - `customerModule.listCustomers({ metadata: { phone_e164 } })` → 기존 customer 조회
   - 없으면 `createCustomers([{ phone: phoneE164, metadata: { phone_e164, loyalty_consent } }])` ← **email/name 없음** (② 원인)
   - `listStoreCreditAccounts({ customer_id })` → 없으면 `createStoreCreditAccounts([{ customer_id, currency_code: "idr" }])`  ← **customer_id 올바르게 전달됨**
6. **order.customer_id 세팅** (line 257–259): `orderModule.updateOrders([{ id, customer_id }])` ← **link table 미갱신** (① 원인)
7. **earnForOrder** (line 262–286): `query.graph`로 order refresh 후 `earnForOrder(container, { order_id, order })` 호출 → 적립 완료, metadata.loyalty_earn 갱신
8. **snapshot receipt 갱신** (line 288–317): `updateOrderSnapshots({ receipt: { earned, new_balance, phone_masked } })` ← **정상 갱신됨**
9. **반환** (line 320–332): `store_credit_balance: upsert.balance` = **step 5 시점의 잔액** = PRE-earn 잔액 (③ 원인)

### subscriber 경로 — 왜 적립 안 됐나

`src/subscribers/loyalty-earn-on-paid.ts:81`:
```ts
if (!order?.customer_id) return;  // 결제 시점 customer_id = null → 즉시 return
```
주문 #111: 결제(13:25–27) → 번호 입력(13:30) 순서 = post-pay. 결제 캡처 시점에 customer_id=null → subscriber 조기 종료. **earnForOrder는 subscriber가 아닌 `linkCustomerToOrder` 내에서 실행됨.** (Admin 카드에 Rp 990이 보이는 건 이 경로로 적립됐기 때문.)

---

## REQ 2 — ①②③ 각 원인 (파일:줄)

### ① Admin Orders 목록 Customer 칸 빈칸, 적립 칸 빈칸

**원인 A — Customer 빈칸**

- **`src/lib/link-customer-order.ts:258`**: `orderModule.updateOrders([{ id, customer_id }])`
  - Medusa v2 모듈 아키텍처에서 Order 모듈과 Customer 모듈은 별개. `orderModule.updateOrders`는 order 테이블의 raw `customer_id` 컬럼만 갱신하며 link module의 pivot/index 테이블을 갱신하지 않음.
  - **`src/links/`** 폴더에는 `order-receipt.ts`만 있고 `order-customer` 링크가 없음 → `query.graph`가 `customer.*` 필드를 traverse할 link 경로 자체가 없거나 미등록.
- **`src/api/admin/pos/orders-list/route.ts:143–165`**: `query.graph({ entity:"order", fields:["customer.id","customer.phone",...] })` → customer.phone = null
- **`src/api/admin/pos/orders-list/route.ts:201–210`**: `customer_has_phone = rawPhone !== null && rawPhone !== ""` → false → "Guest"
- **`src/admin/routes/pos-orders/page.tsx:341–355`**: `{o.customer_has_phone && o.customer_id ? <전화번호_버튼> : "Guest"}` → "Guest"

**원인 B — 적립 칸 빈칸**

- 적립 칸은 `metadata.loyalty_earn.amount`를 읽음 (`orders-list/route.ts:parseLoyaltyEarn`).
- `metadata` 필드는 직접 컬럼이므로 link 문제와 무관하게 조회됨.
- 가능한 원인: 주문 목록을 **적립 발생(13:30) 전에 로드**한 뒤 새로 고침 안 했거나, `loyalty_earn.amount`는 있지만 `loyalty_earn.applied=false`인 경우 `parseLoyaltyEarn`이 null 반환.
  - `parseLoyaltyEarn` (route.ts 중 inline 버전): `obj.applied ? Number(obj.amount) : null` → applied=true여야 표시됨.
  - 페이지 새로 고침 시 적립 칸은 Rp 990으로 나타날 가능성 있음.

**공통 뿌리**: `orderModule.updateOrders`의 link table 미갱신으로 customer.* = null.

### ② Store Credit Accounts Customer = N/A

- **`src/lib/link-customer-order.ts:88–96`** (`upsertCustomerAndAccount` → `findOrCreate`):
  ```ts
  createCustomers([{
    phone: phoneE164,
    metadata: { phone_e164: phoneE164, loyalty_consent: ... }
    // email: 없음, first_name: 없음, last_name: 없음
  }])
  ```
- Medusa Admin UI의 Store Credit Accounts 목록은 customer의 표시명을 `first_name + last_name` 또는 `email`에서 가져옴. 모두 없으면 "N/A" 또는 customer 자체를 미연결로 표시.
- **customer_id는 account에 올바르게 저장됨** (`createStoreCreditAccounts([{ customer_id, currency_code: "idr" }])`). 단지 admin UI가 이름/이메일을 표시 못하는 것.
- 단독 원인: phone-only customer 생성 시 displayable 필드 부재.

### ③ POS iPad Credit balance = Rp 0

두 가지 경로:

**경로 A — DoneScreen 직후 (결제 직후 화면)**
- DoneScreen (`apps/customer-display/src/screens/DoneScreen.tsx:85–90`):
  ```ts
  const newBalance = snapshot.receipt?.new_balance ?? snapshot.loyalty?.balance ?? 0;
  ```
- 결제 후 DoneScreen 진입 시점에 subscriber가 early return → `snapshot.receipt = null` → `snapshot.loyalty?.balance`를 봄.
- `snapshot.loyalty.balance`는 번호 입력 시점(13:30, 주문 #111의 경우 결제 후 3분)이 아닌 카트 checkout 시점의 customer 잔액(= 없으면 null/미설정).
- 주문 #111은 post-pay(결제 후 번호 입력)이므로 checkout 시점에 loyalty 없음 → `snapshot.loyalty = null` → balance = 0.

**경로 B — 번호 입력 후 POS 잔액 조회**
- POS iPad에서 고객 잔액 조회는 `GET /admin/pos/customers/:id/summary` 또는 `store_credit_balance`를 반환하는 API를 사용.
- **`src/lib/link-customer-order.ts:322`**: `store_credit_balance: upsert.balance` = step 5(upsert) 완료 후, earnForOrder 실행 **전** 잔액 = 신규 고객 → 0.
- POS 클라이언트가 `linkCustomerToOrder` 응답의 `store_credit_balance`를 화면에 표시하면 0으로 보임.
- earnForOrder는 그 뒤 비동기적으로 완료되나, 반환값에 반영 안 됨. (earn.new_balance는 반환되지만 store_credit_balance와 별도 필드.)

**공통 뿌리**: post-pay 흐름에서 ① subscriber 조기 return으로 snapshot.receipt 미갱신 + ② linkCustomerToOrder가 earn 전 잔액 반환.

---

## REQ 3 — 적립 계산식

### Admin 카드 표시: "Rp 90,000 × 1.10% = 990"

`src/lib/loyalty/receipt-preview.ts:119–135` (및 `src/lib/loyalty/earn.ts` 동일 로직):

```ts
// earn_base = "paid_non_credit_pre_tax"일 때
earnBase = Math.max(0, subtotalAfterDiscount - creditUsed);
// subtotalAfterDiscount = item_subtotal - discount_total = 90,000
// creditUsed = 0 (loyalty balance 사용 없음)
// earnBase = 90,000

creditEarned = roundBy(earnBase * settings.earn_rate_pct / 100, settings.round_mode);
// = 90,000 × 1.1 / 100 = 990
```

### 결론

- **실제 로직**: 세전(subtotal, 90,000) × 1.10%
- `earn_base = "paid_non_credit_pre_tax"` (Rp 90,000 = 세금 제외 순매출액)
- `earn_rate_pct = 1.1` (1.10%)
- **세후(total 99,000) × 1%** 아님. 세전 × 1.10%.

### 세전/세후 기준 변경 시 고쳐야 할 곳

| 위치 | 파일 | 역할 |
|------|------|------|
| 적립 계산 | `src/lib/loyalty/earn.ts` earnBase 분기 | 실제 earn 실행 |
| 미리보기 계산 | `src/lib/loyalty/receipt-preview.ts:119–131` | 체크아웃 UI 표시 |
| 설정 기본값 | `src/modules/loyalty_settings/service.ts` DEFAULT_SETTINGS | earn_base 기본값 |
| Admin 설정 UI | loyalty settings 관리 페이지 | 설정 변경 UI |
| 환불 회수 | `earnForOrder`의 loyalty_recover 처리 / 환불 subscriber | 환불 시 회수 금액 기준 동일하게 변경 필요 |
| POS 미리보기 표시 | `receipt-preview.ts:displayFormula` (or equivalent) | 카드에 표시되는 "90,000 × 1.10%" 문구 |

---

## REQ 4 — 수정안 대사표

| # | 증상 | 위치 | 유형 | 건드릴 파일 | 비고 |
|---|------|------|------|------------|------|
| ①-A | query.graph customer.* = null | Medusa v2 link 미갱신 | **코어(Medusa) 우회** | `src/lib/link-customer-order.ts:258` 이후 — `orderModule.updateOrders` 대신 Medusa의 `remoteLink.create/dismiss` 또는 `linkDefs`를 통해 OrderCustomer link 명시 등록; 또는 orders-list에서 customer를 직접 customer 모듈로 fallback 조회 | link 모듈 등록이 없다면 `src/links/order-customer.ts` 신규 생성 필요 |
| ①-B | 적립 칸 빈칸 (페이지 미새로고침) | 페이지 로드 타이밍 | **UI/UX** | 페이지 자동 새로 고침 또는 SSE 갱신 | link 수정 시 자연 해결 가능성 있음 |
| ② | Store Credit Accounts N/A | phone-only customer 생성 | **신규 필드 추가** | `src/lib/link-customer-order.ts:88–96` — `createCustomers`에 `first_name: "Guest"` 또는 phone 마스킹 값을 name으로 추가; 또는 Admin UI가 phone을 fallback으로 표시하도록 패치 | 기존 phone-only customer에는 별도 backfill 필요 |
| ③ | POS 잔액 Rp 0 | store_credit_balance = PRE-earn | **코어 반환값 수정** | `src/lib/link-customer-order.ts:322` — `earn?.new_balance ?? upsert.balance`로 변경하여 POST-earn 잔액 반환 | earn 실패 시 fallback으로 upsert.balance |

### 기존 990 계정을 손님에게 붙이는 데이터 보정 (실행 금지, 방법만)

현황:
- `order_01M7HGH3TJRMVXRF8NHRK4A484`의 `customer_id` 컬럼에는 customer ID가 저장됨 (updateOrders 는 raw 컬럼 갱신함)
- store_credit_account에 `customer_id`도 올바르게 저장됨
- 문제는 link table에 order↔customer 연결이 없어 query.graph가 null 반환

보정 방법:
1. **link table 등록**: `src/links/order-customer.ts` 작성 후 배포 → Medusa가 link pivot 테이블 생성
2. **기존 주문 backfill**: 배포 후, `order.customer_id IS NOT NULL`인 POS 주문들에 대해 Medusa의 `remoteLink.create({ [Modules.ORDER]: { order_id }, [Modules.CUSTOMER]: { customer_id } })` 형태의 스크립트 실행
3. **이 한 건만 보정**: order ID `order_01M7HGH3TJRMVXRF8NHRK4A484`에 대해 위 remoteLink.create 1회 호출로 Admin 목록 Customer 칸 복구 가능
4. **customer 이름 보정**: 해당 customer 레코드에 `first_name` 또는 `email` 추가 patch → Admin Store Credit Accounts N/A 해소
5. **snapshot receipt**: 이미 `linkCustomerToOrder`에서 `updateOrderSnapshots`가 호출됐으므로 DoneScreen 재진입 시 정상 표시; POS 잔액은 `GET /admin/pos/customers/:id/summary` API로 현재 잔액(990) 조회 가능
