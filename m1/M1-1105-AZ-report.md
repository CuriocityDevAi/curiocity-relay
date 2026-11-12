# M1-1105-AZ 진단 리포트 — Void·재고 실기 이상 7건

작성: 2026-11-12 · 운영 HTTP API 조회: 불가(자격증명 미제공) → 로컬 코드 정적 분석으로 대체 · 코드 수정 0.

---

## 항목별 진단

### 1. R3 — Void 뒤 Reserved +1 (11→12) · Available 88 그대로

| 구분 | 내용 |
|------|------|
| **원인 파일:라인** | `storeport/apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts:307-368` |
| **재현 방법** | Hand Over(completed) 완료된 takeaway 주문을 같은 교대에 Void |

**경로 추적:**

Void 서버 핸들러는 두 단계로 취소한다.

**1a** (라인 307-323): `cancelOrderFulfillmentWorkflow(container).run(...)` — fulfillment 취소.  
Medusa v2 의 `cancelOrderFulfillmentWorkflow` 는 fulfillment 를 취소하면서:
- stocked_quantity 복원 (In stock: 99→100) ✓
- **주문이 아직 활성이라고 판단해 line_item 단위 reservation 을 재생성** (Reserved: 11→12) ← 버그 원인

**1b** (라인 335-368): 주문 status 가 `completed` 이면 `orderModule.cancel(order_id)` 를 직접 호출.  
코드 주석(라인 328-333): "이미 1a 에서 fulfillment·예약 해제 완료" 라고 가정했으나, `cancelOrderFulfillmentWorkflow` 가 reservation 을 **재생성**하므로 가정이 틀렸다.  
`orderModule.cancel()` 은 order status 만 `canceled` 로 전이시키며 **방금 재생성된 reservation 을 삭제하지 않는다**.  
결과: Reserved=12 가 DB 에 남음, Available=88 (기대: Reserved=11, Available=89).

비교: `completed` 가 아닌 주문(라인 353-368)은 `cancelOrderWorkflow` 를 거쳐 정규 reservation 삭제까지 수행. `completed` 경로만 직접 `cancel()` 로 우회하다가 고아 reservation 발생.

**고칠 방향:** `orderModule.cancel(order_id)` 호출 뒤 명시적으로 `inventoryModule.deleteReservationItemsByLineItem(lineItemIds, locationId)` 혹은 `inventoryModule.deleteReservationItems(reservationIds)` 를 호출해 고아 reservation 을 제거한다. reservation id 목록은 `cancelOrderFulfillmentWorkflow` 실행 직전 query.graph 로 조회하거나, 1a 완료 뒤 재조회.

**고칠 허브·파일:**
- `storeport/apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` (1b 완료 직후 reservation cleanup 추가)

---

### 2. R4 — Reserved 11 찌꺼기 예약 정체 · 정리 도구

| 구분 | 내용 |
|------|------|
| **원인** | 과거 POS 거래의 draft/pending 주문에 연결된 reservation 이 order 완료·취소 후에도 남아있는 고아 레코드 |
| **운영 조회** | 불가 (자격증명 없음) — 아래 도구로 직접 확인 필요 |

**주문 상태별 표 (예상):**

| order_status | 예약 수 | 설명 |
|---|---|---|
| completed | 일부 | Hand Over 뒤 completeOrderWorkflow 가 reservation 미삭제한 이력 (R3 패턴 동일) |
| canceled | 일부 | cancelOrderWorkflow 미통과한 void 이력 |
| pending | 일부 | 결제 미완 초안 주문에서 남은 reservation |

**정리 도구 위치:** `POST /admin/pos/maintenance/release-stale-reservations`
- `storeport/apps/commerce-core/src/api/admin/pos/maintenance/release-stale-reservations/route.ts`

**사용법:**
```bash
# 1단계: dry_run=true(기본) 로 후보 목록 확인
curl -X POST https://<host>/admin/pos/maintenance/release-stale-reservations \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"location_id":"<stock_location_id>","dry_run":true}'

# 2단계: 목록 확인 후 실 삭제
curl -X POST ... -d '{"location_id":"<stock_location_id>","dry_run":false}'
```

후보 선정 기준: order_status ∈ {completed, canceled} 또는 metadata.fulfillment_stage = 'hand_over' 인 주문의 line_item 에 걸린 reservation.  
고아 reservation(역조회 실패)도 후보에 포함.

---

### 3. R1 — 앱 품목 상세 "189 left" 계산 위치

| 구분 | 내용 |
|------|------|
| **원인 파일:라인** | `pos-m1/lib/inventory.ts:15-30` + `pos-m1/app/product-details.tsx:140` |

**두 가지 버그:**

**Bug A — 전체 variant 합산:**  
`product-details.tsx:140`:
```ts
const inventoryStatus = computeInventoryStatus(productQuery.data?.product.variants ?? []);
```
`computeInventoryStatus` 는 `variants` 배열의 `inventory_quantity` 를 모두 합산 (`lib/inventory.ts:21-27`).  
선택 옵션(Hot/Iced) 변경 시에도 여전히 모든 variant 를 넘기므로 Hot(100) + Iced(100) = 200 (또는 Kyu 관찰 기준 89+100=189) 가 표시됨.  
올바른 동작: `selectedVariant` 하나만 넘겨야 함.

**Bug B — inventory_quantity = In stock, Available 아님:**  
Medusa의 `GET /admin/products/:id` 가 반환하는 `variant.inventory_quantity` 는 "In stock(stocked_quantity)" 이며, **Reserved 차감 전** 수치.  
Kyu 가 원하는 것은 Available = In stock - Reserved.  
Available 을 얻으려면 별도 API 필요:
- `GET /admin/inventory-items?variant_id={variant_id}&fields=location_levels.*` → `location_levels[].available_quantity`
- 또는 `GET /admin/inventory-items/{id}/location-levels` → `location_levels[].available_quantity`
- Medusa v2 Admin SDK: `sdk.admin.inventoryItems.listLocationLevels(itemId)`

**고칠 방향:** (1) `computeInventoryStatus` 호출 시 `selectedVariant ? [selectedVariant] : []` 로 한정. (2) product query 에 inventory_items 의 location_level 포함하거나 선택 variant 변경 시 available_quantity 를 별도 조회해 `StockLine` 에 전달.

**고칠 허브·파일:**
- `pos-m1/app/product-details.tsx` (computeInventoryStatus 인자 교정 + available_quantity API 추가)
- `pos-m1/lib/inventory.ts` (optional: `available_quantity` 필드 지원 추가)
- `pos-m1/api/hooks/products.ts` or 별도 hook (variant level-inventory 조회 훅)

---

### 4. R6 — Paid Total 33,000 · Outstanding −3,000

| 구분 | 내용 |
|------|------|
| **원인 파일:라인** | `storeport/tenders/route.ts:338` (`computedGrand` 계산) + `pos-m1/app/orders/[orderId].tsx:341` (`pending_difference` 사용) |

**경로:**

서버 `tenders/route.ts:303-338`:
```ts
const sc_amount = sc_pct > 0 ? Math.round(subtotal * sc_pct / 100) : 0;
const pb1_amount = pb1_pct > 0 ? Math.round((subtotal + sc_amount) * pb1_pct / 100) : 0;
const computedGrand = subtotal + sc_amount + pb1_amount;   // PB1 포함: 30,000 + 3,000 = 33,000
const orderTotal = computedGrand > 0 ? computedGrand : toNum(order.total);
```

PaymentCollection 은 `amount = orderTotal = 33,000` 으로 생성·capture 됨 (라인 681-724).  
`payment_collection.captured_amount = 33,000`.

Medusa의 `order.total` = 30,000 (item price만, PB1 미포함).  
Medusa `order.summary.pending_difference = -(captured 33,000 − order.total 30,000) = −3,000`.

앱 표시 (pos-m1 `orders/[orderId].tsx`):
- **Paid Total** (라인 300-317): `payment_collections.reduce(captured_amount - refunded_amount)` = 33,000 → 올바른 실제 납부금 ✓
- **Outstanding** (라인 335-348): `order.summary.pending_difference` = −3,000 → Medusa 가 PB1 을 모르므로 과납처럼 표시 ← 버그

**tendered/change metadata 경로:**  
`received_amount(33,000)`은 `input` payload → `createPaymentSessionsWorkflow` data 필드 → `CashProvider.authorizePayment` → `payment.data.received_amount = 33,000` 에 저장.  
실제 capture amount 는 `payment.amount = orderTotal = 33,000` (PB1 포함 금액).  
Medusa 정석: PB1·SC 를 `addShippingMethodToCart` 또는 `addPriceAdjustment` 등 Medusa fee line item 으로 추가하면 `order.total` 이 33,000 이 되어 `pending_difference = 0`.

**고칠 방향 2가지:**
1. (서버) PB1/SC 를 Medusa 주문의 fee/tax line item 으로 추가 → `order.total = 33,000` → `pending_difference = 0`.
2. (앱) Outstanding 표시에 `order.summary.pending_difference` 대신 `payment_collections.captured_amount - metadata.pos_grand_total` 사용 (서버가 `metadata.pos_grand_total = computedGrand` 를 저장해야 함).

**고칠 허브·파일:**
- `storeport/tenders/route.ts` (PB1 fee line item 추가 또는 metadata.pos_grand_total 저장)
- `pos-m1/app/orders/[orderId].tsx` (Outstanding 계산 교정)

---

### 5. R5 — Void 뒤 Payment Status = Captured

| 구분 | 내용 |
|------|------|
| **원인 파일:라인** | `storeport/void/route.ts:341-348` (completed 경로 직접 `orderModule.cancel()`) |

**경로:**

non-completed 주문 (라인 353-368): `cancelOrderWorkflow` 실행 → 내부에서 `cancelPaymentCollection → cancelPayment` → Medusa payment status = `canceled`.  
completed 주문 (라인 341-348): `orderModule.cancel(order_id)` 직접 호출 → order status = `canceled` 전이만 발생. **결제 모듈 cancel 경로를 거치지 않으므로 payment.canceled_at 미설정** → `payment_collection.status` 미변화 → Medusa `payment_status = captured`.

앱 표시 (`pos-m1/components/ui/OrderStatus.tsx:286-323`): `payment_status = 'captured'` → `paymentStatuses['captured'].label = 'Captured'` → 초록색 "Captured" 표시. 올바른 표시는 "Canceled" (payment_status = 'canceled').

Medusa refund 기록이 없는 이유: `cancelOrderWorkflow` 는 취소(cancel) 경로이므로 Medusa payment refund record 를 생성하지 않는다. void = 취소, refund record ≠ 생성.

**고칠 방향:** `orderModule.cancel()` 뒤 `paymentModule.cancelPayment({ payment_id })` 를 각 활성 payment 에 대해 명시적 호출, 또는 `paymentModule.cancelPaymentCollection({ id: payment_collection_id })` 호출.

**고칠 허브·파일:**
- `storeport/apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` (1b 완료 뒤 payment cancel 추가)

---

### 6. R7 — Payments 표 refund 줄 없음

| 구분 | 내용 |
|------|------|
| **원인 파일:라인** | `pos-m1/api/hooks/pos-orders.ts:68-109` (`extractTenders`) + R5 연동 |

`extractTenders` 는 `payment_collections[].payments[]` 순회, 각 payment 의 `canceled_at` → `'failed'` 로 매핑:
```ts
const status = p.canceled_at ? 'failed' : p.captured_at ? 'captured' : 'authorized';
```

Void 뒤 payment.canceled_at 이 세팅되면 원결제 row 가 `'failed'` 로 바뀌어 1건만 표시됨.  
**void/refund reversal row 는 존재하지 않는다:**
- `cancelOrderWorkflow` 는 Medusa payment refund record 를 생성하지 않음 (취소 ≠ refund)
- `payment.refunds[]` 가 비어 있으므로 `extractTenders` 가 환불 줄을 만들 수 없음
- 현재 `extractTenders` 는 `payment.refunds` 를 아예 조회하지 않음

**데이터 없음 vs 표시 안 함:** 데이터가 없는 것이 본질적 원인. `order.metadata.void` 에는 취소 정보가 있으나 TendersTable 은 이를 활용하지 않음.

**고칠 방향 2가지:**
1. (앱) `extractTenders` 에서 `order.metadata.void` 또는 `order.metadata.refund` 가 있으면 역방향(음수 amount) row 를 합성해 추가.
2. (서버) void 완료 뒤 `refundPaymentWorkflow` 로 Medusa payment refund record 생성 → `payment.refunds` 에 기록 → `extractTenders` 가 `payment.refunds[]` 도 순회하도록 확장.

**고칠 허브·파일:**
- `pos-m1/api/hooks/pos-orders.ts` (extractTenders: metadata.void/refund 로 row 합성 또는 refunds[] 순회 추가)
- `storeport/void/route.ts` (옵션 2 택 시 refundPaymentWorkflow 호출 추가)

---

### 7. R8 — Void 된 주문에 Hand over 버튼 표시 조건

| 구분 | 내용 |
|------|------|
| **원인 파일:라인** | `pos-m1/app/orders/[orderId].tsx:612` (`showHandOverImmediate`) |

```ts
// orderId.tsx:612
const showHandOverImmediate = !isFulfilled && orderType === 'takeaway' && payState === 'paid';
```

**void 뒤 각 조건 평가:**
- `isFulfilled = (order.fulfillment_status === 'fulfilled' || ... === 'delivered') = ('canceled' → false)`
- `orderType = 'takeaway'` (metadata.order_type, void 후에도 유지됨)
- `payState = toPayState(order.payment_status)` → R5 버그로 payment_status = `'captured'` → `toPayState('captured') = 'paid'`

결론: `showHandOverImmediate = !false && true && true = true` → 버튼 노출 → 누르면 `/fulfill` POST → 서버가 `order is canceled` 로 에러 반환.

**직접 원인 2개:**
1. R5 bug: `payment_status = captured` (should be `canceled`) → `payState = 'paid'`
2. `order.status !== 'canceled'` 가드 없음

R5 를 수정하면 `payState = 'not_paid'` 가 되어 버튼이 숨겨질 수 있으나, 추가 방어 가드가 필요.

**고칠 방향:** 
```ts
const showHandOverImmediate = 
  !isFulfilled && 
  order.status !== 'canceled' &&   // ← 추가
  orderType === 'takeaway' && 
  payState === 'paid';
```

또는 `deriveVoidRefundExposure` 의 `voided` 판단 로직(metadata.void 체크, `lib/refund-rules.ts:181`)을 `showHandOverImmediate` 에서도 활용.

**고칠 허브·파일:**
- `pos-m1/app/orders/[orderId].tsx:612` (order.status !== 'canceled' 가드 추가)

---

## 요약표

| # | 항목 | 원인 | 허브:파일 |
|---|------|------|-----------|
| R3 | Void 후 Reserved +1 | `cancelOrderFulfillmentWorkflow` 가 reservation 재생성 + `orderModule.cancel()` 이 cleanup 안 함 | storeport `void/route.ts:341-348` |
| R4 | Reserved 11 찌꺼기 | 과거 완료·취소 주문의 고아 reservation | 정리 도구: `maintenance/release-stale-reservations/route.ts` |
| R1 | "189 left" 오표시 | (a) 전체 variant 합산 `product-details.tsx:140` (b) `inventory_quantity` = In stock ≠ Available | pos-m1 `app/product-details.tsx` + `lib/inventory.ts` |
| R6 | Paid Total 33k / Outstanding -3k | PB1 포함 `computedGrand` 가 PaymentCollection amount 이나 Medusa `order.total` 은 PB1 미포함 | storeport `tenders/route.ts:338` + pos-m1 `orders/[orderId].tsx:341` |
| R5 | Payment Status = Captured | completed 경로에서 `orderModule.cancel()` 직접 호출 → payment cancel 미수행 | storeport `void/route.ts:341-348` |
| R7 | Payments 표 refund 줄 없음 | Medusa cancel 경로는 refund record 미생성 → `extractTenders` 가 void 역방향 row 만들 데이터 없음 | pos-m1 `api/hooks/pos-orders.ts:68-109` |
| R8 | Hand over 버튼 노출 | R5 연동(payment_status=captured → payState=paid) + `order.status !== 'canceled'` 가드 없음 | pos-m1 `orders/[orderId].tsx:612` |

## 운영 조회 여부
운영 HTTP API (Admin/Store GET) 조회 미수행 — 자격증명 허브 env 에 없음. 로컬 코드 정적 분석만으로 진단.

## PR
없음 (진단 전용 태스크).

---

착지 명령:
```
cp /tmp/M1-1105-AZ-report.md ~/projects/curiocity-relay/m1/ && cd ~/projects/curiocity-relay && git add m1/M1-1105-AZ-report.md && git commit -m "m1: M1-1105-AZ" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M1-1105-AZ done "7건 진단 완료: R3=cancelFulfill 재예약+orderModule.cancel 미정리, R4=정리도구 위치 확인, R1=variant합산+In stock사용, R6=PB1 computedGrand vs order.total 괴리, R5=payment cancel 미수행, R7=refund record 없음, R8=order.status!==canceled 가드 없음"
```
