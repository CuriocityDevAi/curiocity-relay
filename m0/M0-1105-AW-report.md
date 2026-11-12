# M0-1105-AW 리포트 — PB1·SC 를 Medusa 주문 총액에 넣는 근본 수정 계획서

작성: 2026-11-12 · 코드 수정 0 · 정적 분석 + 기존 리포트(M1-AZ · R0-CB) 교차 검증

---

## 결론 한 줄

**권장안 D — 각 line_item 에 combined effective tax_line 삽입** · `item.total = subtotal_per_item + tax_per_item` 이 되면 기존 `/return` 공식(`Math.round(item.total × qty_ratio)`)이 **변경 없이** PB1·SC 비율 환불을 자동 수행한다.

---

## 1. 현재 우회 구조 (baseline)

| 위치 | 현황 | 문제 |
|---|---|---|
| `tenders/route.ts:337` | `computedGrand = subtotal + sc_amount + pb1_amount` | Medusa `order.total` 과 별개로 계산 |
| `tenders/route.ts:542` | `metadata.pos_totals = {subtotal, service_charge, pb1, grand_total}` | SoT 가 metadata 에 숨어 있음 |
| `PaymentCollection.amount` | `= computedGrand` (33,000) | 올바름 · 고객 결제는 맞음 |
| `order.total` (Medusa) | `= 30,000` (item price 합) | PB1·SC 미반영 |
| `order.summary.pending_difference` | `= −3,000` (over-captured 처럼 보임) | 버그 표시 |
| `item.total` per line | `= subtotal only` (PB1 미포함) | 부분 반품 시 세금 환불 누락 |
| 앱 `grandTotal` | `= posTotals?.grand_total ?? order.total` | pos_totals 없는 구 주문 fallback |

---

## 2. 대사표 — 경로 후보 4가지

### Path A · Tax Module (tax_region / tax_rate / tax_provider)

Medusa v2.17.2 에 `TAX_MODULE` · `TaxRegion` · `TaxRate` 존재.  
`calculateTaxesWorkflow` 호출 → 각 line_item 에 `tax_lines` 자동 추가 → `order.tax_total` 갱신.

| 항목 | 평가 |
|---|---|
| SC→PB1 복리 계산 | ❌ Tax Module 은 `item_price × rate` 단순 계산. 복리 표현 불가. 커스텀 TaxProvider 필수 |
| 매장별 요율 | △ TaxRegion 은 국가·지역 단위. 위치별로 rate 다르려면 TaxProvider 가 POS_SETTINGS 조회해야 |
| Admin 주문 화면 | ✓ "Tax" 섹션 자동 표시 |
| Z-report | ✓ `order.tax_total` 분리 |
| 반품 시 세금 배분 | ✓ `item.tax_total` 로 자동 |
| 구현 비용 | ❌ 높음 · TaxProvider 모듈 신설 + TaxRegion 설정 + Cart-기반 `calculateTaxes` 타이밍 POS 적응 |

**적합성**: SC 불가·복잡도 높아 1차 미채택.

---

### Path B · 별도 Fee Line Item ("Service Charge" · "PB1" 품목 추가)

`addLineItemWorkflow` or `orderModule.createLineItems()` 로 order.items 에 SC/PB1 추가.  
`order.total = subtotal + sc_amount + pb1_amount` = 33,000 ✓

| 항목 | 평가 |
|---|---|
| SC→PB1 복리 계산 | ✓ 서버에서 계산 후 absolute amount 로 삽입 |
| Admin 주문 화면 | ❌ 품목 목록에 "Service Charge" · "PB1" 혼재 → 혼란 |
| Z-report | ❌ SC·PB1 이 상품 매출에 집계됨 |
| 반품 시 세금 배분 | ❌ SC·PB1 line 을 "품목 반품" 개념으로 처리해야 → return route 대폭 수정 필요 |
| 재고 | ⚠ `requires_shipping=false, no_discounts=true` 등 추가 플래그 필요 |

**적합성**: 가장 단순하지만 반품 로직·Z-report 오염으로 미채택.

---

### Path C · Shipping Method / Adjustment (배송 수수료 활용)

`addShippingMethodToWorkflow` 로 SC+PB1 를 `order.shipping_total` 에 추가.

| 항목 | 평가 |
|---|---|
| Admin 주문 화면 | ❌ "Shipping" 섹션 표시 → 의미론 오류 |
| 반품 시 세금 배분 | ❌ Shipping method refund 경로 미구현 |
| 복리 계산 | ✓ 서버 계산 후 삽입 |

**적합성**: 가장 낮음 · 채택 불가.

---

### Path D · Tax Lines per Item (setLineItemTaxLines) — **권장**

`orderModule.setLineItemTaxLines(taxLinesInput[])` 로 각 line_item 에 combined effective tax_line 삽입.

**핵심 수식:**
```
effectiveRate = sc_pct/100 + (1 + sc_pct/100) × pb1_pct/100
# SC=0, PB1=10%  → effectiveRate = 0.10 (10%)
# SC=10%, PB1=10% → effectiveRate = 0.21 (21%)
```

분배: 각 item 별 `item_tax = Math.round(item_line_total × effectiveRate)`  
마지막 item 은 `total_expected_tax − sum_of_others` 로 rounding drift 흡수.

Medusa 처리: `order.tax_total = Σ item_tax_lines` → `order.total = subtotal + tax_total`  

**Coffee Latte 30,000 + PB1 10% 예시:**
| 단계 | 현재 | Path D 후 |
|---|---|---|
| `item.total` | 30,000 | **33,000** (item.subtotal 30k + item.tax_total 3k) |
| `order.total` | 30,000 | **33,000** |
| `order.tax_total` | 0 | **3,000** |
| `order.summary.pending_difference` | −3,000 | **0** |
| Partial return (qty=1/1) refund | 30,000 (세금 누락) | **33,000** (자동 수정) |

**Coffee Latte 30,000 + SC 10% + PB1 10% 예시:**
| 항목 | 계산 |
|---|---|
| subtotal | 30,000 |
| SC | 3,000 |
| PB1 (복리) | 3,300 |
| `order.total` | **36,300** |
| effectiveRate | 21% |
| item_tax | Math.round(30,000 × 0.21) = **6,300** |

| 항목 | 평가 |
|---|---|
| SC→PB1 복리 계산 | ✓ effective_rate 로 흡수 (item level 에서 exact match · 단일 item 기준 ±0) |
| 매장별 요율 | ✓ tenders route 가 이미 `getForLocation(stock_location_id)` 로 조회 |
| Admin 주문 화면 | ✓ "Tax" 줄 자동 표시 · 품목 목록 오염 없음 |
| Z-report | ✓ `order.subtotal` = 상품 매출 · `order.tax_total` = SC+PB1 |
| 반품 시 세금 배분 (#208) | ✓ `item.total` 에 세금 포함 → 기존 `Math.round(item.total × qty_ratio)` 공식 **무변경** 으로 자동 수정 |
| 반올림 규칙 | ✓ `Math.round` · % round 규약 준수 |
| 영수증 | ✓ `order.tax_total` 활용 · `metadata.pos_totals` SC/PB1 명세 미러 병행 |
| 구현 비용 | ✓ 낮음 · tenders route 추가 10~20 줄 |

---

## 3. 권장안 — Path D 채택 · 이유 · 우회 제거

### 권장 이유 (3줄)

1. **반품 무변경 수정**: `item.total` 에 세금이 반영되면 `/return` 의 `Math.round(item.total × share)` 가 세금 비율 환불을 **코드 변경 없이** 자동 수행 → R11 근본 해소.
2. **Admin + Z-report 의미론 정합**: `order.tax_total` 이 SC+PB1 합계 · `order.subtotal` 이 상품 매출 → 별도 집계 도구 불필요.
3. **기존 우회 흡수**: `order.total` 이 33,000 이 되면 `metadata.pos_totals.grand_total` 과 일치 → 앱 fallback 자연 수렴 · `pending_difference = 0`.

### 우회 제거 경로

| 현재 우회 | 수정 후 |
|---|---|
| `computedGrand` → PaymentCollection.amount | `order.total` (= computedGrand) → PaymentCollection.amount (동일 값) |
| `metadata.pos_totals.grand_total` SoT | `order.total` SoT로 승격 · pos_totals 는 SC/PB1 명세 표시용 보조 유지 |
| 앱 `posTotals?.grand_total ?? order.total` | `order.total` 직접 사용 (pos_totals 없어도 동일) |
| `outstanding = order.summary.pending_difference` | `outstanding = order.total - paidTotal` (= 0 for complete orders) |

### 기존 주문 (세금이 metadata 에만 있는 주문) 호환

- 기존 주문: `order.total = 30,000` · `metadata.pos_totals.grand_total = 33,000`
- 앱의 기존 fallback(`posTotals?.grand_total ?? order.total`) 가 33,000 반환 → 그대로 작동
- 환불 금액은 `payment.amount = 33,000` 에서 오므로 void/refund 금액 정확 (변화 없음)
- 부분 반품에서만 여전히 세금 미포함 계산 → 기존 주문에서 허용 오차 (fix 가 없던 시점 거래이므로 backward compat 허용)

---

## 4. 구현 라운드 쪼개기

### Round 1 — 서버: tenders route 에 tax_lines 삽입

**파일**: `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts`

**변경 위치**: 기존 `computedGrand` 계산 직후 · `createOrderPaymentCollectionWorkflow` 호출 직전.

```
신규 블록 (tenders/route.ts · 현재 laun 337~345 부근 삽입):

if (sc_amount > 0 || pb1_amount > 0) {
  const totalTax = sc_amount + pb1_amount   // compound formula 기준 authoritative
  const orderModule = container.resolve(Modules.ORDER)
  const items = (order.items ?? []) as any[]
  let allocated = 0
  const taxLines = items.map((it, idx) => {
    const lineTotal = toNum(it.total ?? it.subtotal) + toNum(it.unit_price) * 0  // toNum(it.total)
    const isLast = idx === items.length - 1
    const taxAmt = isLast
      ? totalTax - allocated
      : Math.round(lineTotal / subtotal * totalTax)
    allocated += taxAmt
    return {
      item_id: it.id,
      description: "POS Tax (SC+PB1)",
      code: "pos_tax",
      rate: effectiveRate * 100,          // 표시용 · Medusa 계산 reference
      tax_rate_id: null,
    }
  })
  await orderModule.setLineItemTaxLines(taxLines)
  // order.total 이 갱신됨 → 아래 PaymentCollection.amount = order.total 로 수렴
}
```

**effectiveRate** = `sc_pct/100 + (1 + sc_pct/100) × pb1_pct/100`

**검증 주의**: Medusa v2.17.2 에서 `orderModule.setLineItemTaxLines` 가 절대 amount 를 받는지, rate 기반으로 재계산하는지 반드시 실 호출 테스트로 확인.  
만약 rate 기반 재계산이면: `effectiveRate × item.total` 이 `compound formula` 와 ±1 Rp 허용 범위 내 일치 (단일 품목 주문에서는 exact match).

**돈 수치 바뀌는 필드:**
- `order.tax_total`: 0 → sc_amount + pb1_amount
- `order.total`: subtotal → subtotal + sc_amount + pb1_amount
- `item.tax_total` per item: 0 → item_tax
- `order.summary.pending_difference`: −3,000 → 0

**수정 불필요 파일:**
- `return/route.ts`: `item.total` 에 세금 포함되면 공식 자동 수정
- `void/route.ts`: `payment.amount = computedGrand` 는 기존부터 올바름
- `refund/route.ts`: 동일

---

### Round 2 — 서버: 통합 테스트 갱신

**파일**: `apps/commerce-core/integration-tests/pos/void-refund-restock.spec.ts` + tenders.spec

**운영 같은 시드:**
- Coffee Latte Hot 1개, unit_price=30,000, qty=1
- sc_pct=0, pb1_pct=10 (Soopsok Sweets 운영 설정)
- **기대값 변경**:
  - `order.total = 33,000` (기존 30,000)
  - `order.tax_total = 3,000`
  - `order.summary.pending_difference = 0`
  - partial return qty=1: refund = 33,000 (기존 30,000이었던 버그 → 33,000 수정)

---

### Round 3 — 앱: grandTotal 소스 단순화

**파일**: `pos-m1/app/orders/[orderId].tsx`

| 항목 | 현재 | 수정 후 |
|---|---|---|
| `grandTotal` | `posTotals?.grand_total ?? order.total` | `order.total` (신규 주문에서 동일) |
| `outstanding` | `order.summary.pending_difference` | `order.total - paidTotal` (= 0) or 완전 삭제 |
| SC/PB1 breakdown 표시 | `posTotals.service_charge + posTotals.pb1` | `order.tax_total` (합산) + `posTotals` 명세 |

기존 주문 fallback: `posTotals?.grand_total ?? order.total` 는 유지해도 무방 (기존 주문: pos_totals = 33k, 신규 주문: order.total = 33k → 동일).

---

## 5. Kyu 질문 (최대 2개)

**Q1 — SC 운영 여부**: 현재 Soopsok Sweets 의 `service_charge_pct` 는 0% 맞나요?  
SC=0 이면 Round 1 구현이 단순해집니다(`effectiveRate = pb1_pct/100` · 별도 SC 계산 불필요). SC>0 이면 복리 계산과 함께 two-line 명세(SC: 3,000 / PB1: 3,300) 도 고려해야 합니다.

**Q2 — Admin 세금 명세 표시**: Admin 주문 상세에서 세금을 "POS Tax: 3,000" 단일 줄로 표시해도 되나요, 아니면 "Service Charge: 3,000 / PB1: 3,300" 으로 분리해야 하나요?  
분리가 필요하면 tax_line 을 2개(SC · PB1) 삽입해야 하고 PB1 의 rate 표시가 "11%"(= 복리 환산)로 나옵니다. 단순화를 원하면 1개 combined line 추천.

---

## 6. 이연 순증감

- **−1 이연**: "PB1·SC 를 Medusa `order.total` 에 반영" (R0-1105-CB §5 +1 이연 · M1-1105-AZ §4 R6 2가지 고칠 방향 中 1번) → 본 계획서로 설계 완료. 구현 착지 후 소멸.
- **+0 신규 이연 없음**.

---

## 7. 착지 명령

```bash
cp /tmp/M0-1105-AW-report.md ~/projects/curiocity-relay/m0/ && cd ~/projects/curiocity-relay && git add m0/M0-1105-AW-report.md && git commit -m "m0: M0-1105-AW" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M0-1105-AW done "권장 Path D (setLineItemTaxLines · effectiveRate) · Round1=서버tenders · Round2=통합테스트 · Round3=앱 · Kyu질문2개"
```
