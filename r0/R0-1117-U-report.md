#178 OK · 문제 1건 · 같은 패턴 잔존 1곳(4번)

검토 일시: 2026-11-17  
검토 커밋: e21c381 (origin/master HEAD)

---

## REQ 1 · runOnJS 교체 정석 여부 + scheduleOnRN 잔존 grep

### 정석 여부 ✅

`scheduleOnRN` (react-native-worklets) → `runOnJS` (react-native-reanimated) 교체는 현재 버전 정석.  
- Reanimated 3+ 공식 "worklet → JS 스레드" 브리지가 `runOnJS(fn)(args)`.  
- 직렬화 없이 메시지 큐 디스패치 → React hook setter / prop 클로저 안전 호출 가능.  
- `'worklet'` 지시자 명시 추가도 Babel worklets 플러그인에 명확하게 worklet임을 알림.

### scheduleOnRN 잔존 — 같은 크래시 위험 ⚠️

```
components/ui/BottomSheet.tsx:12   import { scheduleOnRN } from 'react-native-worklets';
components/ui/BottomSheet.tsx:64   scheduleOnRN(callback);        // animateOut withTiming 콜백
components/ui/BottomSheet.tsx:91   scheduleOnRN(handleClose);     // panGesture.onFinalize withDecay 콜백
components/ui/BottomSheet.tsx:98   scheduleOnRN(handleClose);     // panGesture.onFinalize withTiming 콜백
components/ui/BottomSheet.tsx:116  scheduleOnRN(handleClose);     // overlayTapGesture.onEnd withTiming 콜백
```

모두 UI 스레드 worklet 콜백(`withTiming`/`withDecay` callback, `Gesture.Pan.onFinalize`, `Gesture.Tap.onEnd`) 안에서  
`callback`(외부 prop) / `handleClose`(React.useCallback) 를 scheduleOnRN 에 넘기는 패턴.  
Splash 크래시와 동일한 경로 — Babel worklets 플러그인이 직렬화 시도 → `TypeError: property is not writable` 위험.

**SlipMergeAnim(#172)**: `scheduleOnRN` 없음 (파일 자체 없음). 잔존은 BottomSheet 1파일 4곳 뿐.

---

## REQ 2 · preventAutoHideAsync 제거 후 스플래시 깜빡임 위험

**결론: 없음 ✅**

- expo-router ~58.0.30 는 `renderRootComponent` 내부에서 `_internal_preventAutoHideAsync()` 를 자동 호출.  
- 명시적 `SplashScreen.preventAutoHideAsync()` 는 중복이었으며 제거해도 시스템 스플래시는 JS 번들이 준비될 때까지 유지됨.  
- `SplashScreenController` 는 여전히 `auth + settings` 준비 완료 시 `SplashScreen.hideAsync()` 를 직접 호출하여 제어함.  
- `_layout.tsx` 에 별도 `preventAutoHideAsync` 호출 없음 — 이중 제어 없음.  
- 깜빡임 발생 조건(JS 번들 완료 전 시스템 스플래시 해제)에 해당하지 않음.

---

## REQ 3 · #178 에 섞인 M1-1117-G 변경 vs #177 중복·충돌

**결론: 중복 없음, 충돌 없음 ✅**

#178 브랜치는 M1-1117-G 커밋을 선행으로 포함한 채 M1-1117-I 를 추가하여 올라옴.  
#177(M1-1117-G) 이 먼저 머지(14:16 KST) → #178 머지(14:28 KST) 시점에  
`VoidRefundSheet.tsx`, `ReceiptCard.tsx`, `[orderId].tsx`, e2e 파일들이 이미 동일 내용.  
머지 커밋(e21c381) diff에서 해당 파일 변경분 0 — Git 이 올바르게 중복 적용 없이 처리.  
충돌 마커(`<<<`, `>>>`) 없음.

---

## REQ 4 · 수정 지시 목록

### 🔴 P1 — BottomSheet.tsx scheduleOnRN → runOnJS 교체 (같은 크래시 위험)

`components/ui/BottomSheet.tsx` 에서:

| 위치 | 변경 전 | 변경 후 |
|---|---|---|
| L12 import | `import { scheduleOnRN } from 'react-native-worklets'` | 제거 (runOnJS를 Reanimated import에 추가) |
| L64 animateOut | `scheduleOnRN(callback)` | `runOnJS(callback)()` |
| L91 panGesture onFinalize | `scheduleOnRN(handleClose)` | `runOnJS(handleClose)()` |
| L98 panGesture onFinalize | `scheduleOnRN(handleClose)` | `runOnJS(handleClose)()` |
| L116 overlayTapGesture onEnd | `scheduleOnRN(handleClose)` | `runOnJS(handleClose)()` |

BottomSheet는 앱 전역에서 모든 시트 컴포넌트 베이스로 사용 — 수정 우선도 높음.

---

## 종합 판정

| 항목 | 결과 |
|---|---|
| runOnJS 교체 정석 | ✅ |
| preventAutoHideAsync 제거 안전 | ✅ |
| M1-1117-G 중복·충돌 | ✅ 없음 |
| scheduleOnRN 잔존 위험 | ⚠️ BottomSheet.tsx 4곳 — 후속 수정 필요 |

#178 자체 수정은 올바름. 후속 티켓(BottomSheet runOnJS 교체)을 별도 발행 권장.
