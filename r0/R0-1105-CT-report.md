# R0-1105-CT 보고서 — fork #112 리뷰 (M2-1105-BA · Toast → GestureHandlerRootView 안)

**판정: APPROVE** — 원인 정확·수정 충분·충돌 없음·회귀 없음.  
추가 안전책 불필요: RNGH 내 이동으로 gesture coordinator가 충돌 해소; `onStartShouldSetPanResponder`는 `disable` 무관이므로 `swipeable=false`도 근본 해결책 아님.

| REQ | 항목 | 판정 | 근거 |
|-----|------|------|------|
| 1 | 원인·수정 근거 | ✅ | `usePanResponder.js:3-4` `startShouldSetPanResponder()→true`(`disable` 무관); `onMoveShouldSetPanResponderCapture`도 `disable` 체크 없이 2 px 이상 이동 시 캡처. RNGH 안 이동 시 native 레벨에서 RNGH coordinator가 FlashList scroll gesture를 우선 처리 → PanResponder 선점 차단. 추가 안전책(`swipeable=false` / `pointerEvents=box-none`) 불필요 |
| 2 | 토스트 최상단·회귀 없음 | ✅ | PR 후 Toast는 `KeyboardProvider`/`App` 이후 렌더(last-child → 최상 z-order 유지). "시트 닫힌 뒤 토스트"(`setTimeout 100ms`): Modal이 이미 닫힌 메인 스크린에서 발화 — GHRV 위치 이동 무영향. transparentModal 스크린 위 가시성도 App 뒤 렌더로 동일하게 유지 |
| 3 | #111·#105 `_layout.tsx` 충돌 | ✅ 없음 | #111(M3-1105-BF): `__tests__`, `checkout/success`, `orders/[orderId]`, 아이콘/컴포넌트만 변경 — `_layout.tsx` 미접촉. #105(M1-1105-BE): `ci.yml`, `cart.tsx`, `split-tender`, `orders`, `ReturnItemsPicker`, `ReceiptCard`, `BottomSheet.tsx`, 테스트 파일만 변경 — `_layout.tsx` 미접촉 |
| 4 | PR 코멘트 판정 | ✅ | 아래 댓글로 게시 |
