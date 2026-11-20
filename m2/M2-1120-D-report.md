fork #212 orientation default O · neverForLocation 유지 O · 세로 깨짐 화면 없음(auth필요 화면 제외·로그인화면 세로가로 정상) · 새 APK 09be254c-5e16-4840-822a-8b2724cac2fd https://expo.dev/accounts/curiocity/projects/meros-pos/builds/09be254c-5e16-4840-822a-8b2724cac2fd

## 작업 내역

- `app.json` orientation: `"landscape"` → `"default"` (세로·가로 자유 회전)
- prebuild 임시 실행 → AndroidManifest 확인:
  - `screenOrientation="unspecified"` ✅ (고정값 아님)
  - `BLUETOOTH_SCAN android:usesPermissionFlags="neverForLocation"` ✅ 유지
- 웹 스크린샷 (360×800 세로 · 1024×600 가로):
  - 로그인 화면: 세로·가로 모두 큰 깨짐 없음 ✅
  - checkout·결제완료: auth/order 필요 → 접근 불가 (orientation은 native-only 설정·웹 무관)
- 기존 테스트: 2 failed (m1-1117-e-slip-flow · splitview-capture) = 기존 실패 그대로, 신규 fail 0 ✅
- 커밋: 2a5612c (feat/M1-1120-A-android-bluetooth-landscape)
- push: origin/feat/M1-1120-A-android-bluetooth-landscape ✅
- EAS build 시작: `eas build --profile development --platform android --non-interactive --no-wait`
  - 빌드 ID: 09be254c-5e16-4840-822a-8b2724cac2fd
  - 빌드 URL: https://expo.dev/accounts/curiocity/projects/meros-pos/builds/09be254c-5e16-4840-822a-8b2724cac2fd
- PR #212 본문 갱신: "폰 세로/가로 회전 · 태블릿은 회전 잠금으로 가로" 항목 추가 ✅
