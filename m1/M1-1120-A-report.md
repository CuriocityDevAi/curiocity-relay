fork #212 BLUETOOTH_SCAN O · 방향 landscape · EAS android 빌드 1ed0f9a9-3162-4b8d-834e-4787f3c4b80b https://expo.dev/accounts/curiocity/projects/meros-pos/builds/1ed0f9a9-3162-4b8d-834e-4787f3c4b80b · tests O(pre-existing TS 오류 무관)

## 변경 파일
- `app.json`: orientation portrait→landscape · android.permissions 에 BLUETOOTH_SCAN 추가

## prebuild AndroidManifest 검증 (npx expo prebuild --platform android --no-install)
```
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>
```
- ble-plx plugin 과 충돌 없음 (중복 항목 없음)
- screenOrientation="landscape" MainActivity 에 정상 반영

## 방향 채택안
`"orientation": "landscape"` (루트 설정) — 런타임 코드 추가 없이 Android 태블릿 가로 고정.
iPad Split View 는 landscape 에서 계속 동작.

## EAS 빌드
- 프로필: development / platform: android / buildType: apk
- 빌드 ID: 1ed0f9a9-3162-4b8d-834e-4787f3c4b80b
- URL: https://expo.dev/accounts/curiocity/projects/meros-pos/builds/1ed0f9a9-3162-4b8d-834e-4787f3c4b80b

## Web 1024×600 레이아웃 (스플래시/홈)
- 스플래시 화면 가로 1024×600 렌더링 정상 — 큰 깨짐 없음
- checkout/success 화면은 auth+order 필요 → 태블릿 실기 확인 필요

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/212
