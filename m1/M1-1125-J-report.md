# PASS

## M1-1125-J — 원장 대사: POS Cart 세금 0 / Checkout PB1 합계 불일치

**PR**: agilo-medusa-pos-fork #258 (`feat/M1-1125-I`)  
**커밋**: a9ee8a3 (본 작업) + 1604759 (Prettier 수정)  
**CI**: Lint ✅ · CI ✅ (run 45552387329 / 45552387238)

---

## 변경된 mutation 목록

| mutation | 위치 | 처리 |
|---|---|---|
| `useAddToDraftOrder` | `api/hooks/draft-orders.tsx` | onSettled → `invalidateDraftAndQuote` |
| `useUpdateDraftOrderItem` | 위 동일 | onSettled → `invalidateDraftAndQuote` |
| `useAddPromotion` | 위 동일 | onSettled → `invalidateDraftAndQuote` |
| `useRemovePromotion` | 위 동일 | onSettled → `invalidateDraftAndQuote` |
| `useUpdateDraftOrderCustomer` | 위 동일 | onSettled → `invalidateDraftAndQuote` |
| `useCancelDraftOrder` | 위 동일 | onSettled → `invalidateDraftAndQuote` |
| `useCancelWaitingDraftOrder` | 위 동일 | onSettled → `invalidateDraftAndQuote` |
| `useCompleteDraftOrder` | 위 동일 | onSettled → `invalidateDraftAndQuote` |

## 공용 헬퍼

`lib/query-invalidation.ts` 에 `invalidateDraftAndQuote(queryClient)` 추가.  
`['draft-order']` + `['pos-quote']` 를 `exact: false` 로 병렬 무효화.  
React 의존성 없는 순수 파일로 분리해 테스트 임포트 가능.

## Cart "계산 중" 표시

`components/cart/CartPanel.tsx`:
- Total 줄: `quote.isFetching` 중 `ActivityIndicator` 표시 + 금액 `opacity: 0.5`
- CartSummaryHeader(서브토탈·세금 영역): `isCartLoading` 에 `quote.isFetching` 포함 → 흐리게

## 테스트 로그

```
__tests__/m1-1125-j-quote-invalidation.test.ts (9 tests)
 ✓ invalidateDraftAndQuote 헬퍼 > draft-order 와 pos-quote 를 함께 무효화한다
 ✓ invalidateDraftAndQuote 헬퍼 > 두 무효화 모두 exact:false 로 호출된다
 ✓ invalidateDraftAndQuote 헬퍼 > 두 무효화가 병렬(2회 호출)로 실행된다
 ✓ 각 mutation 경로 → 상품 추가 (useAddToDraftOrder)
 ✓ 각 mutation 경로 → 수량 변경 (useUpdateDraftOrderItem)
 ✓ 각 mutation 경로 → 삭제 (useUpdateDraftOrderItem quantity=0)
 ✓ 각 mutation 경로 → 프로모션 적용 (useAddPromotion)
 ✓ 각 mutation 경로 → 프로모션 해제 (useRemovePromotion)
 ✓ 각 mutation 경로 → 손님 연결/해제 (useUpdateDraftOrderCustomer)

Tests: 9 passed | Duration: 162ms
```

기존 실패(8개 파일) — 내 변경 전부터 존재하는 기존 버그, 본 작업 무관.

## CI 상태

| Run | Job | 결과 |
|---|---|---|
| 45552387238 | CI (vitest + tsc) | ✅ success |
| 45552387329 | Lint (eslint + prettier) | ✅ success |
