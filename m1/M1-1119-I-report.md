fork #202 · R8 preview 한정 O · Sentry iOS pbxproj 깨끗 O · printBytes 권한 O · runbook O · lint/vitest/assertions O

## 변경 요약

### 1. app.config.js — R8 preview 한정
- `withDisableR8Minify` 를 `EAS_BUILD_PROFILE === 'preview'` 일 때만 적용
- production/development 프로필에서는 R8 minification 기본값 유지

```js
module.exports = process.env.EAS_BUILD_PROFILE === 'preview' ? withDisableR8Minify(config) : config;
```

### 2. Sentry disableAutoUpload 범위 좁힘
- `app.json` `@sentry/react-native/expo` 플러그인에서 `"disableAutoUpload": true` 제거
- `eas.json` `build.preview.env` 에 `"SENTRY_DISABLE_AUTO_UPLOAD": "true"` 추가
- iOS prebuild (`expo prebuild --platform ios --clean`) 결과 pbxproj 에 `SENTRY_DISABLE_AUTO_UPLOAD` 없음 ✅

```
$ grep -n "SENTRY_DISABLE_AUTO_UPLOAD" ios/*.xcodeproj/project.pbxproj
CLEAN: SENTRY_DISABLE_AUTO_UPLOAD not found in pbxproj
```

### 3. printBytes 권한 확인
- `printBytes` 진입 직후 `ensureAndroidBluetoothPermissions()` 호출 추가
- 거부 시 영어 Alert (기존 `ensureAndroidBluetoothPermissions` 구현에 포함)
- 단위 테스트 `REQ-printBytes: 진입 시 권한 확인` 추가 → 20/20 통과

### 4. runbook 68행 정정
- 오류: `eas.json 의 env 에서 주입되는 값이다` (잘못된 설명)
- 정정: `빌드 시점에 고정되는 값이다. preview/production 빌드는 코드에 직접 고정된 https://api.meros.id 를 사용한다` (140행과 일치)

## 결과
- vitest: 20/20 (printer 테스트) · 전체 769 passed (기존 Playwright spec 충돌 1건은 prebuild 이전부터 존재)
- lint: 0 errors
- APK 재빌드 없음 (오늘 APK 그대로 사용)
