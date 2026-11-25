# M0-1125-L PASS

PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/264
Commit: ccd3e1b (`feat/M0-1125-L-bottomsheet-worklet-crash` on `agilo-medusa-pos-fork`)
Base: `master` @ `36d211f`

## 원장 대사

손님화면 통합 테스트 2-⑤ 매니저 PIN 기록(#428) 실기 중 — 🔴 Kyu 14:46 POS 환불 시 앱
오류(Uncaught Error) · 매니저 PIN 입력 전.

## 원인

### #1 BottomSheet worklet remote-function 크래시

`components/ui/BottomSheet.tsx:76` (수정 전) — `animateOut` 가 JS 스레드에서 미리
`runOnJS(callback)` 을 만들어 `jsCallback` 변수에 담아두고, `runOnUI(...)` 안의
`withTiming` 완료 콜백(worklet) 에서 `jsCallback()` 을 동기 호출.
react-native-worklets 0.13 / Reanimated 4 는 UI 런타임 worklet 에서 Remote Function 을
동기 호출하는 것을 금지(`remoteFunctionUnpacker.native.ts`) → "Tried to synchronously
call a Remote Function" 크래시 → 환불 → BottomSheet 열기 전에 터짐 → 매니저 PIN
입력까지 가지 못함.

같은 파일 다른 경로(line 104·112·131)와 `SplashReceiptAnim.tsx`·`SplashScreenController.tsx`
는 이미 worklet 안에서 `runOnJS(fn)()` 를 호출하는 정석 패턴. `animateOut` 만
이례였음. 앱 전체(components/ · app/ · hooks/ · api/ · lib/) grep 결과 동일 패턴
파일 없음 — `BottomSheet.tsx` 단일 수정으로 충분.

### #2 restoreWaitingDraftOrders status 필터 거부

`api/hooks/draft-orders.tsx:356` (수정 전) — `GET /admin/draft-orders?status[]=draft&...`
를 Medusa v2 가 거부: `Invalid request: Unrecognized fields: 'status'`.
`/admin/draft-orders` 경로 자체가 draft 로 스코프되므로 status 필터 불필요 → 제거.

## 수정 파일

- `components/ui/BottomSheet.tsx` — `animateOut` worklet 패턴 통일 (JS 측 선생성
  `jsCallback` 제거 · `runOnUI` 랩퍼 제거 · worklet 안에서 `runOnJS(callback)()`).
- `api/hooks/draft-orders.tsx` — `/admin/draft-orders` 쿼리에서 `status[]=draft` 제거.
- `__tests__/m0-1125-l-bottomsheet-worklet.test.ts` (신규) — 회귀 가드 4건:
  1. JS 측 `runOnJS` 선생성 금지 (`const jsCallback = runOnJS(...)` 재도입 차단)
  2. `withTiming/withSpring/withDecay` worklet 콜백 안 JS 함수 호출은 `runOnJS(fn)()` 로
     감싸기 (정적 검사)
  3. `/admin/draft-orders` 쿼리에 `status` 금지
  4. `fields`, `limit` 파라미터 유지 (복원 범위 보존)

## 테스트 로그

```
$ npx vitest run __tests__/m0-1125-l-bottomsheet-worklet.test.ts
 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  165ms

$ npm test
 Test Files  82 passed (82)
      Tests  1034 passed | 6 expected fail | 3 todo (1043)
   Duration  2.10s

$ npx tsc --noEmit
error TS 13 (전부 pre-existing baseline · 신규 0 · 비교: origin/master 도 동일한 13)

$ npx expo lint (변경 파일만)
0 errors, 8 warnings
  - 8 warnings 전부 react-hooks/immutability — translateY.value =, overlayOpacity.value =
    를 React.useCallback 안에서 수정하는 shared-value 패턴 (baseline 6 · animateOut
    구현을 기존 animateIn 과 동일한 모양으로 통일하면서 2 warnings 증가).
  - 신규 error 0.
```

## CI

PR #264 — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/264

| Check | Status | Duration |
|---|---|---|
| route (CI) | pass | 11s |
| route (Lint) | pass | 9s |
| lint | pass | 1m18s |
| unit-tests | pass | 1m17s |
| assertions | pass | 1m31s |
| flow-tests | pass | 54s |
| playwright | pass | 5m27s |
| heavy-cloud | skipping | — |

CI workflow runs: 45572176341 (CI · success · 13m27s) · 45572176344 (Lint · success · 3m9s).

## 실기 확인 범위 (사용자 실기 대기)

POS My Orders → 결제된 주문 → Refund → BottomSheet 열림 → 매니저 PIN 입력 화면까지
크래시 없이 → 환불 완료 → Admin Manager PIN 기록.

## M3 와의 중첩 — 회피 확인

M3 가 My Orders 화면(M3-1125-N) · QRIS(#262) 작업 중. 이 PR 은
`components/ui/BottomSheet.tsx` (공용 UI) · `api/hooks/draft-orders.tsx` (공용 hook) ·
신규 테스트 파일만 수정 — My Orders 화면 파일(`app/orders/*` · `components/orders/*` 등)
및 QRIS 파일은 손대지 않음.

## 다음 정리 후보 (범위 밖)

- `SafeAreaView` deprecated
- `ImageBackground` deprecated
- `Sentry.wrap` 순서
- tabs `anchor` / `backBehavior`

## 셀프 머지

하지 않음.
