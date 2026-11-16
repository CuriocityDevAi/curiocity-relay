#315 CHANGES REQUIRED · 기본 설정 매장 동작 변화 없음

---

## REQ 1 — 돈 로직 `receipt-preview.ts:121` ✅

### 기존 매장 동작 변화 없음
Default `earn_on_balance_tender_only: true`, `earn_base: "paid_non_credit"`. PR 수정 범위는 `!settings.earn_on_balance_tender_only` 브랜치만이며, 기존 매장은 이 브랜치에 진입하지 않는다. **세후 그대로.**

### `true` 분기와 일관성
| toggle | earn_base | earnBase |
|--------|-----------|----------|
| `true` | `paid_non_credit_pre_tax` | `max(0, subtotalAfterDiscount − creditUsed)` |
| `false` | `paid_non_credit_pre_tax` | `subtotalAfterDiscount` |
| `true` | `paid_non_credit` | `paidOtherAfterRefund` |
| `false` | `paid_non_credit` | `total` |

toggle=false 는 "크레딧 tender 포함 전액 적립"이므로 creditUsed 차감 없음. 대칭 의도적. ✓

### 적립금 사용 시 기준
toggle=false + pre_tax → `subtotalAfterDiscount`(세전 전액, credit 미차감). toggle=false 의미에 부합. ✓

### 환불 회수·적립 (#313) 자동 일치
`earn.ts` line 212 에서 동일 `previewReceipt` 호출 확인(`import` line 20). receipt-preview 수정으로 자동 반영. ✓

---

## REQ 2 — 30일 영향 ⚠️ CHANGES REQUIRED

### query.graph computed fields
`ContainerRegistrationKeys.QUERY` + `fields: ["id","item_subtotal","subtotal","discount_total","metadata"]` → Medusa가 computed totals 계산. M0-1116-A 주석 명시. ✓

### `take: 2000` 성능
`sampled` 플래그 반환. 허용 가능. ✓

### 상태 필터
`status: "completed"`. ✓

### 🚨 `discount_total` 미사용 — CHANGES REQUIRED

`computeImpact30d` 루프:
```typescript
// simulate/route.ts 루프
const subtotal = Number(o?.subtotal ?? o?.item_subtotal ?? 0);
// discount_total 미전달
previewReceipt({ subtotal, ... }, ...);
```

`discount_total` 은 query.graph 에 명시 요청했으나 `previewReceipt` 에 전달하지 않는다. `earn.ts` 의 `earnForOrder` 는 명시적으로 `discount: Number(srcOrder.discount_total ?? 0)` 를 전달한다(line ~212 근처):

```typescript
// earn.ts — 올바른 패턴
const subtotal = Number(srcOrder.item_subtotal ?? srcOrder.subtotal ?? 0);
const discount = Number(srcOrder.discount_total ?? 0);
previewReceipt({ subtotal, discount, ... }, loyalty);
```

**영향**: 프로모션/할인이 있는 주문에서 30일 시뮬이 실제 적립보다 과대 계산됨(`subtotalAfterDiscount` = subtotal − 0 instead of subtotal − discount_total). 필드를 가져왔는데 쓰지 않는 것은 명백한 누락.

**수정 제안** (simulate/route.ts 루프):
```typescript
const subtotal = Number(o?.item_subtotal ?? o?.subtotal ?? 0);  // item_subtotal 우선 (earn.ts 일치)
const discount = Number(o?.discount_total ?? 0);                 // 추가
const creditUsed = Number(o?.metadata?.store_credit_used ?? 0);
const b = previewReceipt(
  { subtotal, discount, service_charge_pct: posCtx.service_charge_pct,
    pb1_pct: posCtx.pb1_pct, credit_requested: creditUsed,
    credit_balance_before: 10 ** 9 },
  beforeSettings,
);
```

부수 사항: `subtotal ?? item_subtotal` 순서도 earn.ts 의 `item_subtotal ?? subtotal` 와 반대. Medusa v2에서 두 값이 다를 경우 `item_subtotal` 우선이 맞다.

---

## REQ 3 — 숫자 칸 ✅

| 항목 | 확인 |
|------|------|
| 빈 값 허용 (편집 중) | `raw=""` 허용, onChange 호출 안 함 ✓ |
| 앞자리 0 제거 | `onBlur` → `String(parseInt/parseFloat(s))` ✓ |
| 소수 | `integer=false` → parseFloat ✓ |
| blur 정규화 | `handleBlur` normalize ✓ |
| 마지막 유효값으로 시뮬 | `parse(s) !== null` 일 때만 `onChange` ✓ |
| 레이아웃 고정 | `min-h-[480px]` on results div ✓ |
| raw hex 없음 | className 에 hex 없음 ✓ |

`useEffect` sync: `value !== lastEmitted.current` 조건은 외부 reset 이 같은 값일 때 raw가 안 돌아오는 edge case 있으나 현재 사용 패턴상 무해. ✓

---

## REQ 4 — 테스트 ✅

두 신규 테스트 모두 기대값 변경이 아닌 동작 검증:

- `toggle=false + earn_base=paid_non_credit_pre_tax` → 버그 재현(1,100) + 수정 기대(1,000) 명시. ✓
- `toggle=false + earn_base=paid_non_credit` → 세후 전액 기준(1,100) 검증. ✓

기존 `earn_base=paid_non_credit_pre_tax` 테스트(toggle=true, credit_requested=30,000 → 7,000)는 변경된 브랜치를 타지 않으므로 영향 없음. ✓

CI 체크런 API 403으로 직접 확인 불가. PR 본문 "unit 328개 / TS 에러 0" 신뢰.

---

## 판정

**CHANGES REQUIRED** — `simulate/route.ts:computeImpact30d` 루프에서 `discount_total` 을 `previewReceipt` 에 전달하지 않아 할인 주문의 30일 시뮬이 과대 계산됨. `earn.ts` 와 일치하도록 수정 후 APPROVE 가능.
