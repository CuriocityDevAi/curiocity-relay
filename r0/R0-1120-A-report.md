#212 CHANGES · SCAN X(neverForLocation 누락) · iPad 방향 모든 방향 허용(OK) · checks 3 fail

## REQ 1 — AndroidManifest BLUETOOTH 권한

### 생성된 `android/app/src/main/AndroidManifest.xml` 권한 목록
```xml
<uses-permission-sdk-23 android:name="android.permission.ACCESS_COARSE_LOCATION" android:maxSdkVersion="30"/>
<uses-permission-sdk-23 android:name="android.permission.ACCESS_FINE_LOCATION" android:maxSdkVersion="30"/>
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>  <!-- ← neverForLocation 없음 -->
```

### 판정: SCAN X — neverForLocation 플래그 누락

**원인**: `app.json` 의 `android.permissions` 배열에 `BLUETOOTH_SCAN` 을 직접 추가했기 때문에,
`react-native-ble-plx` 플러그인의 `addScanPermissionToManifest()` 가 이미 존재한다고 판단하고
`android:usesPermissionFlags="neverForLocation"` 플래그를 붙이지 않는다.

**플러그인 로직 (`withBLEAndroidManifest.js` 발췌)**:
```js
if (!androidManifest.manifest['uses-permission'].find(
    item => item.$['android:name'] === 'android.permission.BLUETOOTH_SCAN')) {
  // ← 이미 있으면 이 블록을 건너뜀 → neverForLocation 미적용
  androidManifest.manifest['uses-permission']?.push({
    $: {
      'android:name': 'android.permission.BLUETOOTH_SCAN',
      ...(neverForLocation ? { 'android:usesPermissionFlags': 'neverForLocation' } : {}),
      'tools:targetApi': '31'
    }
  });
}
```

**react-native-ble-plx 문서 기준**: `neverForLocation: true` 를 설정하면
`android:usesPermissionFlags="neverForLocation"` 이 반드시 AndroidManifest 에 있어야
Android 12+ (SDK 31+) 기기에서 위치 권한 없이 BLE 스캔 가능.
현재 상태로는 Google Play 심사 시 위치 권한 필요 경고 또는 런타임 거부 가능.

**수정 방법**: `app.json` 의 `android.permissions` 에서 `BLUETOOTH_SCAN` 을 **제거**한다.
`react-native-ble-plx` 플러그인이 `neverForLocation: true` 와 함께 올바르게 추가한다.

### 중복·충돌 여부
- `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT` 는 중복 없음
- `BLUETOOTH_SCAN` 은 한 번만 선언되나 플래그가 잘못됨

---

## REQ 2 — iOS iPad 방향 영향

### 생성된 `ios/MerosPOS/Info.plist` 관련 키

```xml
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>

<key>UISupportedInterfaceOrientations~ipad</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
  <string>UIInterfaceOrientationPortraitUpsideDown</string>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>

<key>UIRequiresFullScreen</key>
<false/>
```

### 분석

- **iPhone**: `orientation: "landscape"` 로 인해 Landscape만 허용 (Left + Right). Portrait 차단됨.
- **iPad (`~ipad` 키)**: Expo SDK는 `supportsTablet: true` 일 때 `~ipad` 에 항상 4방향 모두를 설정한다.
  `orientation: "landscape"` 설정이 `~ipad` 에는 반영되지 않아, iPad는 Portrait/Landscape 모두 허용.
  → iPad 세로 사용이 차단되지 않음.
- **`UIRequiresFullScreen: false`**: iPad Split View / Slide Over 허용 상태.
  Landscape-only POS 앱이 Split View 에서 세로로 실행될 수 있음.

### 판정: OK (iPad 세로 사용 막히지 않음)

iPad 가 Portrait 도 지원하고 Split View 도 가능하므로 가로 고정 필요 시 추가 조치 필요.
PR 설명의 "landscape Split View에서 계속 동작함" 주장은 사실이나,
iPad 에서 Portrait 모드 레이아웃이 깨질 가능성 있음.

**권장안**: `ios.infoPlist.UISupportedInterfaceOrientations~ipad` 를 명시적으로
`["UIInterfaceOrientationLandscapeLeft","UIInterfaceOrientationLandscapeRight"]` 로 고정하거나,
Android 전용 orientation 적용이 필요하면 `orientation: "portrait"` 유지 후
`android.screenOrientation: "landscape"` plugin 으로 분기한다.

---

## REQ 3 — CI Checks

```
gh pr checks 212 -R CuriocityDevAi/agilo-medusa-pos-fork
```

| check       | 결과    | 소요  |
|-------------|---------|-------|
| assertions  | fail    | 2s    |
| flow-tests  | fail    | 2s    |
| lint        | fail    | 2s    |
| playwright  | skipping| 0     |

**판정: CHANGES** — assertions·flow-tests·lint 3개 모두 fail.
소요 시간이 2초로 조기 종료되어 의존성 설치 또는 환경 문제로 추정.
(playwright는 skip — 조건부 실행)

---

## 종합 판정: CHANGES

| 항목 | 결과 |
|------|------|
| BLUETOOTH_SCAN 권한 존재 | O (있음) |
| neverForLocation 플래그 | X (누락) |
| iPad 방향 (Portrait 차단 여부) | 차단 안 됨 — 레이아웃 위험 |
| CI checks | 3/3 fail |

BLUETOOTH_SCAN `neverForLocation` 누락 + CI 3개 fail → **CHANGES 필요**.
