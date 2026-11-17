PR #186 · 세금·소계 즉시 · 계산 유틸 재사용

## 변경 요약

- `app/(tabs)/cart.tsx` — `CartSummaryHeader` 스켈레톤 제거; 값 행 전체 `opacity 0.5` dimming 으로 대체
- `lib/cart-provisional-tax.ts` — `computeProvisionalCartTotals` 순수 함수 (직전 서버 `tax_total/subtotal` 비율 역산)
- `__tests__/m3-1117-s-cart-provisional-tax.test.ts` — 세금 별도·포함 / 동일 입력 일치 / 빈 카트 / null 필드 8개 케이스

## REQ 대응

| REQ | 처리 |
|-----|------|
| 1 (서버 응답 전 provisional 표시) | `cartSummary` useMemo 내에서 `computeProvisionalCartTotals` 호출, `isCartLoading && !hasDiscounts` 분기 |
| 2 (Total 스피너 유지, 숫자 교체) | Total 스피너 기존 유지; Taxes·Subtotal 은 opacity dimming → 서버 값 도착 시 state 교체 |
| 3 (할인 시 직전 값 유지) | `hasDiscounts` 플래그로 provisional/stale 분기 |
| 4 (테스트 · tsc 0) | 8 tests passed; tsc 신규 0 |

## 테스트 로그

```
Test Files  1 passed (1)
     Tests  8 passed (8)
  Duration  176ms
```
