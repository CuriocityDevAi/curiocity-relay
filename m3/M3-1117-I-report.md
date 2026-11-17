원인 후보 1순위: useCurrentDraftOrder staleTime=0 → 담기 뮤테이션 중 background refetch 발동 → SecureStore ID 없음(빈 카트) → queryFn null 반환 → 낙관적 캐시 덮어씀 · 수정 포함

## 진입점 전수

| 경로 | mutate 위치 | router.dismiss 위치 | 비고 |
|------|------------|---------------------|------|
| 상품 상세 Add | product-details.tsx:301 | :300 (dismiss **전에** mutate) | 유일한 직접 담기 |
| 스캔 | scan.tsx:82 scanBarcodeMutation | - | 담기 아님 · 상세 화면 navigate |
| 상품 목록 | 직접 담기 버튼 없음 | - | 상세 화면으로만 이동 |
| 카트 undo | cart.tsx:89 | - | 복원 경로 |

animateOut() 은 비동기 애니메이션(Reanimated withTiming 250ms)으로 콜백 없이 호출 → router/mutate 를 블록 안 함.

## 쿼리키 정렬

- useCurrentDraftOrder 쿼리키: `['draft-order']` ✓
- onMutate setQueryData 키: `['draft-order']` ✓ — 동일, 불일치 없음.
- useCurrentDraftOrder queryFn: SecureStore.getItemAsync() → ID 없으면 즉시 null 반환.

## Root Cause 확정

```
staleTime=0(기본) → setQueryData 직후 Cart active observer → background refetch 발동
queryFn → SecureStore ID 없음(빈 카트) → null 반환 → 낙관적 캐시 덮어씀
뮤테이션 완료 → isUpdatingDraftOrder=0 / invalidateQueries 리패치 완료 전 짧은 구간
→ draftOrder.data=null + isUpdatingDraftOrder=0 → cart.tsx:601 "Your cart is empty"
```

기존 아이템 있는 카트 추가 시도 동일 경로: refetch 가 서버 미반영 데이터(신규 항목 없음)를 반환 → 순간적 항목 소실.

## 수정 내용

`useCurrentDraftOrder` 에 `enabled: isAddingToCart === 0` 추가.
- 담기 뮤테이션 진행 중 queryFn 실행 차단 → 낙관적 캐시 보존
- 뮤테이션 완료 후 enabled=true → 즉시 리패치 → 실 서버 데이터
- onSettled.invalidateQueries 는 enabled 여부와 무관하게 stale 마크 → enabled=true 전환 시 즉시 발동

## [cart-timing] 로그 추가 위치

- product-details.tsx:298 `[cart-timing] tap→mutate t=<epoch>`
- product-details.tsx:321 `[cart-timing] server-response +Xms`
- draft-orders.tsx:onMutate 시작 `[cart-timing] onMutate t=<epoch>`
- draft-orders.tsx:setQueryData 후 `[cart-timing] setQueryData done t=<epoch>`
- cart.tsx:mount `[cart-timing] cart-mounted t=<epoch>`
- cart.tsx:data change `[cart-timing] data-change state=X줄|empty|null isFetching=Y mutating=Z t=<epoch>`

실기 맥 터미널(Metro) 에서 상품 탭 후 나오는 `[cart-timing]` 줄 복사 → 오케에게 전달.

## 테스트

__tests__/m3-1117-i.test.ts — 7케이스 (enabled 차단 불변식 · 버그 재현 경로)
모든 기존 테스트 통과 (m3-1117-c · m1-1116-y · add-to-cart-snapshot).
