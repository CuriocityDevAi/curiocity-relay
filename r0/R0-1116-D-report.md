#148 CHANGES · CI ❌ billing

## CI
GitHub Actions billing 한도 초과로 assertions · flow-tests · lint 세 job 모두 시작되지 않음. 빌링 해소 후 재실행 필요.

## [BLOCKER] onMutate → mutationFn 이중 누산 (api/hooks/draft-orders.tsx:337)

React Query는 onMutate resolve 후 mutationFn 실행. onMutate가 캐시를 `qty_original + qty_added`로 갱신하면, mutationFn 내부 `queryClient.getQueryData`가 낙관적 값을 읽어 `mergeCartItems`가 `(qty_original + qty_added) + qty_added = qty_original + 2×qty_added`를 서버에 전송. 재현: 기존 수량 1인 상품 1개 추가 → 서버에 3이 전송됨(정상: 2). toAdd 경로(신규 상품)는 onMutate가 캐시 미변경이라 영향 없음.

## 나머지 항목

- toAdd 경로(첫 상품): onMutate 캐시 미변경 → mutationFn 원본 캐시 기준 정상 ✓
- 오프라인: mutate() 직후 animateOut+dismissTo 즉시 실행, 오류 시 onError 롤백+toast ✓
- Checkout 3칩 가로: flex-row + variant="tab" 정확히 구현 ✓
- Split(flex:1)/Pay(flex:2) 한 줄 ✓ · Back to cart 제거 ✓ · 상단 < Cart 미변경 ✓
- Pre-order/Delivery 추가 입력 영역 미변경 ✓
- Link customer: Keyboard.dismiss() on Pressable ✓ · phone-pad ✓ · 기존 흐름 미변경 ✓
- QuantityPicker derived-state 패턴 올바름 ✓
