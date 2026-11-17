# 판정: H2 확정 · onMutate setQueryData 동기 순서 수정 · 단위 테스트 20케이스 통과 · Playwright 스크립트 동봉 · 실측 미검증(서버 없음)

## 원인 (H2)

`useAddToDraftOrder.onMutate`에서 `await queryClient.cancelQueries(...)` 가 첫 번째 비동기 대기였음.
`router.dismissTo('/(tabs)/cart')` 직후 React가 Cart 렌더링할 때, `setQueryData`(낙관적 업데이트)가 아직 실행되지 않아 `['draft-order']` 캐시 = `null` → `"Your cart is empty"` 표시.

H1(쿼리키 불일치) · H3(onSettled 경쟁) · H4(cart.tsx 조건) · H5(다른 담기 경로) → 기각.

## 수정

**`api/hooks/draft-orders.tsx`** — `onMutate` 순서 변경:
1. `getQueryData` (동기)
2. `setQueryData` (동기 완료 — await 전)
3. `await cancelQueries` (in-flight 덮어쓰기 방지)

**`app/(tabs)/cart.tsx`** — 스켈레톤 guard 확장:
`(!draft_order || !items.length) && mutating > 0` → skeleton (기존: `draft_order 있고` items=0일 때만 커버)

## 테스트

- 단위 테스트 `__tests__/m3-1117-c.test.ts` 20케이스 추가 · 전체 471 passed
- Playwright 어설션 `e2e/flows/09-cart-instant-display.spec.ts` 동봉 (slow network 2.5초 주입)

## 실측

**미검증** — expo 웹 서버 + 실제 Medusa 백엔드 없이 Playwright 측정 불가.
Playwright 스크립트를 PR에 동봉하여 로컬 환경에서 `npx playwright test e2e/flows/09-cart-instant-display.spec.ts` 로 재현 가능.

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/169

## 이연 순증감

+0
