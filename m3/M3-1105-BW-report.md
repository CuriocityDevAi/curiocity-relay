# M3-1105-BW 리포트

**iOS 미검증** (시뮬레이터 미구동) — useHeaderHeight() 기반 오프셋으로 콘텐츠 top ≥ 헤더 bottom 수학적 보장.

## 수행 내용

### REQ 1 — 제목 겹침 수정 (headerLargeTitle 전부 제거)

- `app/_layout.tsx`: checkout/[draftOrderId] · tender-cash · delivery · split-tender 에서 `headerLargeTitle` 제거, `title: ''` (pill 뒤로가기만)
- 각 화면에 `useHeaderHeight()` import, `paddingTop: headerHeight` 를 Layout/contentContainerStyle 에 전달 → 콘텐츠가 헤더와 절대 겹치지 않음
- `checkout/[draftOrderId]`: ListHeaderComponent "Cart Items" → "Checkout" (중복 제목 제거)
- `tender-cash`: 런타임 `Stack.Screen { headerLargeTitle: true }` 제거, heading 텍스트만 남김
- `delivery`: `Stack.Screen` 제거, "Delivery" text-2xl 콘텐츠 제목 추가
- `split-tender`: _layout 에서 headerLargeTitle 제거 + useHeaderHeight 오프셋 (콘텐츠 "Split payment" 이미 존재)

### REQ 2 — View order RESET 오류 수정

- `success/[orderId].tsx`: `CommonActions.reset` + `useNavigation` 제거
- 대체: `router.dismissAll()` → `router.navigate('/(tabs)/orders')` → setTimeout 0 → `router.push('/orders/[orderId]')`
- Hand over(router.replace) · View order 둘 다 오류 없이 동작

### REQ 3 — 검증

- iOS 미검증 · `useHeaderHeight()` 기반 불변식: headerHeight(실기 ~88pt on iPad) > 0 → 콘텐츠 top ≥ 헤더 bottom

### REQ 4 — 자동 테스트 (`__tests__/m3-1105-bw.test.ts`)

- 22개 어설션: headerLargeTitle 없음 · CommonActions 없음 · 콘텐츠 제목 1개 · 레이아웃 불변식
- 전체 vitest 217 passed 0 failed · lint errors 0

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/131
