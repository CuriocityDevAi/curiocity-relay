#258 CHANGES

## 검증 표

| # | 항목 | 결과 | 비고 |
|---|------|------|------|
| 1 | PB1 매장: Cart Total == Checkout Total · "PB1 (10%)" 라벨 | ✓ | `${taxLabel} (${taxPct}%)` 렌더 · `quote.grand_total` 사용 |
| 2 | 비PB1 매장: 세금 줄 숨김 · Total == subtotal | ✓ | `taxLabel != null` 조건 · pct=0 → null |
| 3 | 아이템 변경 후 Cart 합계 quote 재계산 추적 | ✗ | **pos-quote 쿼리 무효화 없음** (상세 하단) |
| 4 | quote 실패/null → draft total 폴백 | ✓ | `quote.data?.grand_total ?? draftOrder.total` |
| 5 | 손님화면 setCartGrandTotal — 주문 전환·Clear 후 초기화 | ✓ | effect cleanup `setCartGrandTotal(null)` 동작 |
| 6 | m2-1119-s · m3-1119-o master에서도 실패 여부 | ✓ | master에서도 동일 실패 (pre-existing · CI __tests__/ 미포함) |
| 7 | Lint CI | 수정 | Prettier 오류 3건 직접 커밋 푸시 |

## CHANGES 사유 — pos-quote 쿼리 무효화 미처리

`api/hooks/draft-orders.tsx` 의 모든 mutation `onSettled` 가 `['draft-order']` 만 invalidate하고
`['pos-quote', draftOrderId]` 는 invalidate하지 않는다.

**재현**: 아이템 추가 → `draft-order` 갱신 → `pos-quote` stale 유지 → Cart 하단 Total이 구 `grand_total` 표시.
Checkout 화면은 navigate 시 remount → 자동 refetch로 맞지만, Cart는 stale 그대로.

**수정 필요**: `useAddToDraftOrder`, `useUpdateDraftOrderItem`, `useRemoveDraftOrderItem`,
`useAddPromotion`, `useRemovePromotion` 각 `onSettled`에 추가:
```ts
await queryClient.invalidateQueries({ queryKey: ['pos-quote'], exact: false });
```

## 직접 실행 테스트 로그

```
# PR 브랜치 (feat/M1-1125-I) — m1-1125-i-cart-pb1-totals.test.ts
 ✓ PB1 매장 — Cart Total == Checkout Total > grand_total = subtotal + PB1
 ✓ PB1 매장 — Cart Total == Checkout Total > taxLabel = "PB1" · taxPct = 10
 ✓ PB1 매장 — Cart Total == Checkout Total > taxAmount = 1500
 ✓ PB1 매장 — Cart Total == Checkout Total > subtotal = 15000
 ✓ PB1 매장 — Cart Total == Checkout Total > Cart Total == Checkout Total (grand_total 동일)
 ✓ 비PB1 매장 — 세금 줄 숨김 · Total == Subtotal > grand_total = subtotal (PB1 없음)
 ✓ 비PB1 매장 — 세금 줄 숨김 · Total == Subtotal > taxLabel = null → 세금 줄 숨김
 ✓ 비PB1 매장 — 세금 줄 숨김 · Total == Subtotal > taxAmount = null
 ✓ quote null — draftOrder 폴백 > quote null → grandTotal = draftOrder.total
 ✓ quote null — draftOrder 폴백 > quote undefined → grandTotal = draftOrder.total
 ✓ quote null — draftOrder 폴백 > quote 있지만 grand_total 없음 → 폴백
 ✓ SC + PB1 복합 매장 > grand_total = subtotal + SC + PB1(subtotal+SC 기준)
 Test Files  1 passed (1) · Tests  12 passed (12)

# PR 브랜치 — m2-1119-s · m3-1119-o (사전 실패 확인)
 FAIL m2-1119-s-pos-slip-fixes.test.ts > REQ 2: Next customer 버튼 헤더 우상단 배치 (M2-1120-B)
   · success screen headerRight 에 next-customer testID + Next customer 텍스트 존재 — testID="next-customer" 없음
   · SuccessReceiptAnim 에서 Next customer 버튼 제거됨 (헤더로 이동) — onNextCustomer? 여전히 존재
 FAIL m3-1119-o-cd-emit.test.ts > M2-1119-AB ③ success 화면 setPosScreenHint 에 order_id 포함
   · success/[orderId].tsx revertDisplayToPaid 도 order_id 포함 — revertDisplayToPaid 없음
 Test Files  2 failed | 1 passed (3) · Tests  3 failed | 64 passed (67)
 → master에도 동일 실패 확인 (M2-1120-B · M2-1119-AB 미구현) — 이 PR 로 새로 깨진 테스트 없음
```

## CI 상태

| 잡 | 결과 |
|----|------|
| lint | ~~fail~~ → Prettier 3건 fix 커밋 후 재실행 예정 |
| assertions | pass |
| flow-tests | pass |
| playwright | pass |

## 처리 내역

- Prettier 오류 3건 수정 커밋 `a6b3045` 푸시 (CartPanel.tsx L378 구조분해 멀티라인 · L563/L566 ternary 멀티라인)
- PR 코멘트 CHANGES 제출 (pos-quote 무효화 수정 요청)
