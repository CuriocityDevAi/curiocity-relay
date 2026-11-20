fork #212 neverForLocation O · CI 실패 원인 "account payments have failed or spending limit needs to be increased" · 코드원인 X · 새 APK 21586113-fd8c-4624-8d8b-11a730940af4 https://expo.dev/accounts/curiocity/projects/meros-pos/builds/21586113-fd8c-4624-8d8b-11a730940af4

## 1. neverForLocation 수정 (REQ 1) — O

- `app.json` `android.permissions` 에서 `"android.permission.BLUETOOTH_SCAN"` 수동 항목 삭제.
- `react-native-ble-plx` 플러그인(`neverForLocation: true`)이 prebuild 시 자동 삽입.
- 임시 prebuild 후 AndroidManifest 확인 줄:
  ```
  <uses-permission android:name="android.permission.BLUETOOTH_SCAN"
      android:usesPermissionFlags="neverForLocation" tools:targetApi="31"/>
  ```
- prebuild 생성 `android/` 디렉토리는 커밋 제외.

## 2. CI 2초 실패 원인 (REQ 2) — 코드 원인 X

annotation 원문:
> "The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings"

- runner_id=0, runner_name="" — 러너 자체가 할당되지 않아 steps 비어 있음.
- 코드/워크플로 문제 아님. GitHub 계정 결제/한도 문제 → Kyu 조치 필요.

## 3. 커밋·push (REQ 4)

- 커밋: `aace0b5` on `feat/M1-1120-A-android-bluetooth-landscape`
- push: origin 완료

## 4. EAS 빌드 (REQ 3)

- 빌드 ID: `21586113-fd8c-4624-8d8b-11a730940af4`
- URL: https://expo.dev/accounts/curiocity/projects/meros-pos/builds/21586113-fd8c-4624-8d8b-11a730940af4
- 프로파일: development / platform: android / --no-wait
