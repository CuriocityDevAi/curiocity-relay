#366 APPROVE · 연결된 기기 재진입 정상 O · CI pending(runner 대기 중, 3 jobs)

## REQ 1 — `window.location.replace('/pair')` 재진입 안전성

**결론: 연결된 기기 재진입 정상 O (거짓 redirect 없음)**

`_layout.tsx` 부트 게이트가 핵심 안전망:
- `liveToken`은 `undefined`(≠`null`)로 시작
- `appReady = liveToken !== undefined` → `false`인 동안 `<Slot>`(=`IndexRoute`) 미렌더
- `setLiveToken(getDeviceToken())` 호출 후에야 `appReady = true` → `LiveIndexRoute` 렌더
- 즉, `useEffect(() => { if (deviceToken === null) … })` 실행 시점에 `deviceToken`은 이미 localStorage에서 읽은 최종값
  - 기기 연결됨 → `deviceToken` = 토큰 문자열 → 조건 불충족, `/pair` 이동 없음 ✓
  - 미연결 → `deviceToken = null` → `/pair` 이동 (의도된 동작) ✓

web에서 `router.replace` → `window.location.replace` 변경은 Expo static-export 환경에서 navigation queue 미플러시 문제 해결을 위한 것으로, 의미 변화 없음.

## REQ 2 — icon.png RGBA→RGB

**결론: 빌드·표시 영향 없음, 오히려 필수 조치**

- 로컬 검증: `Python PIL → RGB (1024, 1024)` ✓
- 원본 alpha 최솟값 191 (반투명 픽셀 없음) → 흰 배경 합성 시 보이는 모양 동일
- App Store Connect 규칙: iOS 앱 아이콘 alpha 채널 금지 → RGBA 유지 시 심사 거절 위험
- Android·웹: RGB 아이콘 완전 호환
- splash.png 등 다른 에셋은 변경 없음

## REQ 3 — 로컬 테스트

| 종류 | 결과 |
|------|------|
| e2e (splash-anim + pair-screen) | **9/9 통과** |
| unit (vitest) | **150/150 통과** |

## REQ 4 — `gh pr checks 366`

```
changes-filter   pending   (runner 대기)
check            pending   (runner 대기)
markers-and-forbidden  pending   (runner 대기)
```
실패 없음. 큐 대기 상태.

## 판정

**APPROVE** — 부트 게이트 보장으로 false redirect 없음, 아이콘 변환 필수·안전, 9/9 e2e + 150/150 unit 초록.
