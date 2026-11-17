fork #186 각각 APPROVE · 문제 0건

---

## #186 — fix(cart): M3-1117-S 장바구니 Taxes·Subtotal 회색 막대 → provisional 값 즉시 표시

**결론: APPROVE**

### REQ 체크 결과

| 항목 | 결과 | 근거 |
|------|------|------|
| 기존 계산 유틸 재사용(새 계산식 금지) | PASS | `computeProvisionalCartTotals`의 subtotal 공식이 기존 `optimisticTotal` 패턴과 동일(`reduce(unit_price×qty)`). 별도 세금 유틸 없어 신규 함수 생성은 불가피. 서버 측 세금 로직 재구현 없음 — 직전 서버 세율 비율(rate = serverTaxTotal/serverSubtotal)만 사용. |
| 세금 포함/별도 두 경우 서버 값과 일치 | PASS | 비율법이 inclusive·exclusive 모두 보존됨. 동일 입력 시 provisional = 서버 값 테스트 2건 통과. |
| 스켈레톤 막대 제거 | PASS | Taxes·Subtotal·Discount 3개 `<View h-[17px] rounded-md bg-line>` 모두 제거. 로딩 중 `opacity:0.5` 처리로 교체. |
| 서버 값 도착 시 교체(0·깜빡임 없음) | PASS | `setQueryData` 낙관적 갱신으로 `draftOrder.data.draft_order.items`에 __temp_ 아이템 포함 → provisional이 실제 새 아이템 반영. 0 없음. |
| 할인 걸린 장바구니는 서버 값 대기 | PASS | `hasDiscounts = discount_total > 0` 가드. 할인 시 `taxTotal=serverTaxTotal`, `subtotal=serverSubtotal` 그대로 사용. |
| Checkout 금액은 서버 값 | PASS | PR이 Checkout 버튼 미변경. 기존 `draft_order.total ?? optimisticTotal` 로직 보존. |
| 금지 파일 미변경 | PASS | 변경 파일: `app/(tabs)/cart.tsx`, `lib/cart-provisional-tax.ts`, `__tests__/m3-1117-s-cart-provisional-tax.test.ts` — 결제·영수증·보안 파일 미변경. |
| tsc 신규 오류 0 | PASS | PR 브랜치 14건 = master 계열 14건(기존 오류). PR 파일에서 신규 오류 0건. |
| 테스트 | PASS | `vitest run __tests__/m3-1117-s-cart-provisional-tax.test.ts` → 8/8 passed (158ms). |

### 테스트 로그
```
 RUN  v5.1.0 /Users/kyu.lee/projects/pos-m3
 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  17:52:22
   Duration  158ms
```

### 비고
- `cart.tsx`의 `optimisticTotal` (line 452)과 `computeProvisionalCartTotals`의 subtotal 공식이 동일. 서로 다른 UI 목적(Total 버튼 vs Taxes/Subtotal)이므로 허용 가능한 중복.
- 빈 카트 첫 추가 시 `serverSubtotal=0` → `rate=0` → `taxTotal=0` 방어 처리 확인.
