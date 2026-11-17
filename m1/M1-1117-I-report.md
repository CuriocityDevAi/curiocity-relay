원인: PR #162 · components/SplashReceiptAnim.tsx:61 + SplashScreenController.tsx:33 · 수정 PR #178

## 원인 상세
PR #162 (스플래시 애니메이션) 에서 `withTiming` 완료 콜백(UI 스레드 worklet) 안에서
`scheduleOnRN(onDone)` 에 클로저를 넘겼는데, Babel worklets 플러그인이 해당 클로저를
UI-runtime 용으로 직렬화하면서 React hook setter(`setOverlayVisible`)의 non-writable 내부
속성에 쓰기 시도 → `TypeError: property is not writable` → `[runtime not ready]` 크래시.

추가로 `SplashScreenController.tsx` 모듈 최상위에서 `SplashScreen.preventAutoHideAsync()`를
직접 호출했는데, expo-router 가 이미 처리하므로 중복 호출이 런타임 초기화 전 충돌 유발.

## 수정 내용 (커밋 656df7a → PR #178)
- `scheduleOnRN(onDone)` → `runOnJS(onDone)()` (SplashReceiptAnim.tsx)
- `scheduleOnRN(() => setOverlayVisible(false))` → `runOnJS(setOverlayVisible)(false)` (SplashScreenController.tsx)
- 모듈 최상위 `SplashScreen.preventAutoHideAsync()` 제거

## Kyu 재시작 방법
PR #178 머지 후: `npx expo start --clear`
