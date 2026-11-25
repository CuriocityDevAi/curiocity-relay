PASS

## 원인 (파일:줄)

| 위치 | 내용 |
|------|------|
| `components/cart/CartPanel.tsx:526-554` (수정 전) | `draftOrder.draft_order.tax_total` 사용 — Medusa 기본 세금 필드. PB1 매장에서 이 값은 0. 세율 = 0/15000 = 0 → Taxes IDR 0, Total 15,000. |
| `app/checkout/[draftOrderId].tsx:70` | `useOrderQuote(draftOrderId)` 호출 → `/admin/pos/orders/:id/quote` → PB1 compound 계산 → Total IDR 16,500. |

**Cart 는 Medusa 기본 tax_total(=0)을 사용하고, Checkout 은 별도 quote API(PB1 가산 compound) 를 사용하므로 합계 불일치.**

## 수정 요약

### 변경 파일

1. **`lib/cart-quote-totals.ts`** (신규) — `deriveCartDisplay(quote, draftSubtotal, draftTotal)` 순수 함수. Checkout 과 동일한 quote 값 반환.
2. **`components/cart/CartPanel.tsx`** — `useOrderQuote(draftOrderId)` 추가. `CartSummaryHeader` 에 `taxLabel`/`taxPct` prop 추가. PB1 없으면 세금 줄 숨김. Total = `quote.grand_total ?? draftOrder.total`.
3. **`hooks/usePosScreenAutoEmit.ts`** — `setCartGrandTotal(amount)` 전역 추가. cart_building emit 에 `extras.amount = cartGrandTotal` 전달 → 손님 화면 합계 일치.
4. **`__tests__/m1-1125-i-cart-pb1-totals.test.ts`** (신규) — PB1 매장/비PB1 매장/quote null 폴백/SC+PB1 복합 12케이스.

### 권장안
- 세금 없는 매장: 세금 줄 숨김 (`taxLabel === null` 조건).
- 손님 화면 amount: `setCartGrandTotal` global 추가 → cart_building 단계에서도 PB1 포함 금액 emit.

## 테스트 로그

```
vitest run __tests__/m1-1125-i-cart-pb1-totals.test.ts
  Test Files  1 passed (1)
       Tests  12 passed (12)
    Duration  177ms

vitest run __tests__/m3-1117-s-cart-provisional-tax.test.ts __tests__/pos-screen-transitions.test.ts __tests__/m1-1125-i-cart-pb1-totals.test.ts
  Test Files  3 passed (3)
       Tests  25 passed (25)
```

기존 실패 테스트(`m2-1119-s-pos-slip-fixes`, `m3-1119-o-cd-emit`)는 이 브랜치 이전부터 사전 존재하는 실패이며 본 수정과 무관하다.

## Ask phone 버튼 대사

### 요구 원문 (decision-pos-ui-approval-20261124.md)

> **승인된 것 (Kyu 11-24 11:03):**
> - 우측 상단 손님 번호 상태 칸 6상태(① Ask phone · ② Waiting · ③ 입력 중 실시간 파랑+점 3개 · ④ Done 초록+체크+Re-enter · ⑤ Skipped+Ask again · ⑥ 다른 손님 사용 중 노랑+자물쇠) — Cart · Checkout · Cash/Card/QRIS payment · 나눠결제 · Payment successful 공통
> - **영수증 아래 Ask phone on display 버튼 삭제**

### 현재 코드 위치

**Checkout 오른쪽 위 "Ask phone" 텍스트 (`app/checkout/[draftOrderId].tsx:304-312`)**:
```tsx
<CustomerPhoneStatus
  ...
  onAskPhone={fireAsk}
  onReenter={fireAsk}
  onAskAgain={fireAsk}
/>
```
→ 이것은 승인된 신규 6상태 칩(`CustomerPhoneStatus` state ①). "Ask phone" 텍스트는 state ① 에서 표시되며 **삭제 대상이 아님**.

**삭제 대상이었던 "영수증 아래 Ask phone on display" 버튼 (`components/payment/SuccessReceiptAnim.tsx:174-211`)**:
→ M1-1124-B 에서 `app/checkout/success/[orderId].tsx` 가 `askPhoneBtn` prop 을 `SuccessReceiptAnim` 에 전달하지 않도록 수정. `askPhoneBtn && askPhoneBtn.kind !== 'hidden'` 조건이 `undefined` 로 평가 → 버튼 미렌더. **실질적으로 삭제 완료** (코드 잔재는 있으나 렌더 안 됨).

**결론**: Checkout 화면 오른쪽 위 "Ask phone" = 승인된 신규 디자인. 요구된 "영수증 아래" 버튼 삭제는 이미 완료.

## PR 링크

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/258
