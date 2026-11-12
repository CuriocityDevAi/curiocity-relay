# M2-1105-BA 보고서 — Products·Orders 탭 스크롤 간헐 불능

## 원인 (코드 확정)

### 파일·줄
`app/_layout.tsx:163–169` — global `<Toast>` 가 `<GestureHandlerRootView>` **밖**에 위치.

### 충돌 메커니즘

```
<GestureHandlerRootView>
  <App />               ← FlashList(Products·Orders) 는 여기
</GestureHandlerRootView>
<Toast ... />           ← ← ← 여기가 문제 (RNGH 밖)
```

`react-native-toast-message`의 `AnimatedContainer` 는 `PanResponder` 를 등록하며
`onStartShouldSetPanResponder: () => true` 와 `onMoveShouldSetPanResponderCapture`
가 항상 활성화 상태(disable flag 무관).

토스트가 visible (~4 s) 동안 capsule 이 y ≈ 60 에 등장.
사용자가 그 근방에서 스크롤을 시작하면 PanResponder 가 touch 를 선점 →
RNGH 기반 `FlashList` (Products·Orders) 가 gesture 를 잃어 스크롤 불능.

토스트 사라지면 → PanResponder disable → 스크롤 복귀.

### Settings 미영향 이유

Settings 는 `LayoutWithScroll` = native `ScrollView` (UIScrollView on iOS).
native scroll 은 PanResponder 보다 iOS 레이어에서 우선순위가 높아 선점 불가.

### #108 (M3-1105-BB) 연관

`VoidRefundSheet` / `RefundRetrySheet` 에 `setTimeout(toastFn, 100)` 도입으로
BottomSheet 닫힌 뒤 100 ms 후 global Toast 가 메인 탭에서 발화.
이전에는 토스트가 Modal 안(BottomSheet의 내부 Toast)에서만 표시됐으므로 충돌 미발생.

**BottomSheet 내부 Toast** (`BottomSheet.tsx:238–240`) 는 `GestureHandlerRootView` 안에
이미 올바르게 위치 → 추가 수정 불필요.

### 근거 코드

`node_modules/react-native-toast-message/lib/src/hooks/usePanResponder.js`:
```js
export function startShouldSetPanResponder() {
    return true;  // 항상 true — disable 체크 없음
}
PanResponder.create({
    onStartShouldSetPanResponder: startShouldSetPanResponder,
    onMoveShouldSetPanResponderCapture: moveShouldSetPanResponder, // disable 체크 없음
    ...
})
```

## 수정

`app/_layout.tsx` 1 파일 — `<Toast>` 를 `<GestureHandlerRootView>` **안**으로 이동.

```diff
 <GestureHandlerRootView>
   <KeyboardProvider>
     <App />
   </KeyboardProvider>
+  {/* M2-1105-BA: GestureHandlerRootView 안으로 이동 — 밖에 두면 RNGH FlashList 스크롤과 PanResponder 충돌. */}
+  <Toast config={toastConfig} position="top" topOffset={60} />
 </GestureHandlerRootView>
-{/* M3-1105-AB · 캡슐 토스트 */}
-<Toast config={toastConfig} position="top" topOffset={60} />
```

RNGH subtree 안에 두면 FlashList scroll gesture 와 Toast PanResponder 가 동일
gesture coordinator 하에 관리되어 충돌 해소.

## 스샷

Playwright(웹) 으로는 재현 불가 — web 환경은 HTML scroll 을 쓰고 native
PanResponder / RNGH 충돌이 존재하지 않음. 스샷 생략·코드 분석으로 확정.

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/112

## Kyu 재현 확인 방법 (iPad)

1. Orders 탭 → Not Paid 주문 → Retry payment 성공 (or 아무 BottomSheet 액션으로 성공 토스트 발화)
2. BottomSheet 닫힘 직후 캡슐 토스트 뜨는 동안(≈4 초) Orders 목록을 스크롤
3. **수정 전** (옛 build): 토스트 표시 중 스크롤 안 됨
4. **수정 후** (이번 PR build): 토스트 떠 있어도 스크롤 정상
