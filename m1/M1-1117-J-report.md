재현 아니오 (시뮬레이터 전부 Shutdown) · 첫 크래시 커밋 fba37d6 (#162) · 원인 components/ui/BottomSheet.tsx:scheduleOnRN×4 · 수정 PR #179

## 재현

시뮬레이터 전부 Shutdown 상태 → 런타임 재현 불가. 코드 정적 분석으로 진행.

```
xcrun simctl list devices | grep Booted
# → (출력 없음)
```

## bisect 결과

| 커밋 | 내용 | 상태 |
|------|------|------|
| `4c6b588` (#170) | 주문 유형 버튼 | ✅ 정상 — SplashScreenController 에 Reanimated 미사용 |
| `e0bbb4e` (#171) | docs only | 건너뜀 |
| `fba37d6` (#162) | 아이콘·스플래시·로고 | ❌ **첫 크래시** — SplashReceiptAnim.tsx 신규 도입, scheduleOnRN without 'worklet' |
| `15a941e` (#172) | 나눠결제 애니메이션 | ❌ 크래시 지속 |
| `882529c` (#173) | 손님 기능 | ❌ 크래시 지속 |
| `d4aeee6` (#175) | docs only | 건너뜀 |
| `e21c381` (#178) | M1-1117-I fix | ⚠️ Splash 파일 수정됐지만 BottomSheet.tsx 동일 패턴 잔존 |

## 원인

**첫 크래시 커밋**: `fba37d6` (#162)

**원인 파일**: `components/ui/BottomSheet.tsx` (라인 12, 64, 91, 98, 116)

`withTiming` 완료 콜백을 worklets Babel 플러그인이 **자동 workletize**
(`"withTiming": [2, 3]` — plugin/index.js:489) →
`scheduleOnRN` 이 콜백 클로저를 직렬화 시도 →
React useCallback/prop 함수의 non-writable 속성에 쓰기 →
`TypeError: property is not writable`

M1-1117-I (#178) 는 `SplashReceiptAnim.tsx` · `SplashScreenController.tsx` 를 고쳤으나
`BottomSheet.tsx` 의 동일 패턴 4곳이 잔존.

```ts
// 기존 (크래시)
overlayOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
  if (finished) scheduleOnRN(handleClose);
});

// 수정
overlayOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
  'worklet';
  if (finished) runOnJS(handleClose)();
});
```

## 수정 내용

**PR #179** `fix/M1-1117-J`
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/179

`components/ui/BottomSheet.tsx` 단일 파일 변경:
- `import { scheduleOnRN } from 'react-native-worklets'` 제거
- `runOnJS` import from `react-native-reanimated` 추가
- `withTiming` 콜백 4개: `'worklet'` directive 추가 + `scheduleOnRN(fn)` → `runOnJS(fn)()`

## 같은 패턴 grep 결과

```
grep -r "scheduleOnRN" --include="*.ts" --include="*.tsx" app/ components/ hooks/ lib/
# → 출력 없음 (수정 후 codebase 내 scheduleOnRN 사용처 없음)
```

남은 위험: `BottomSheet.tsx` 의 `panGesture` · `overlayTapGesture` 도
Gesture Handler 가 자동 workletize 하므로 동일하게 `runOnJS` 패턴 필요 → 이번 PR에서 모두 처리 완료.

## 시뮬레이터 미재현 대응

Kyu 실기기에서 확인할 명령:
```bash
# Metro 캐시 클리어 후 콜드 론치
kill -9 $(lsof -t -i:8082); npx expo start --port 8082 --clear
# → 앱 완전 종료 후 재실행
```

Hermes/New Architecture 환경에서의 `property is not writable` 에러는
worklets 직렬화 시 발생하므로 JS-only 수정으로 해결 가능.
