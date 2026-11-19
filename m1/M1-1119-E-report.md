fork PR #202 · BLUETOOTH_SCAN O · APK https://expo.dev/artifacts/eas/jmJeh9Q_IP-fefIP7xxMC0E_bV3NUiHPAKjs8HbIbW4.apk · runbook O

## M1-1119-E 완료 리포트

### PR
- https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/202
- 브랜치: `feat/M1-1119-E-android-apk`

### REQ1 — BLUETOOTH_SCAN + neverForLocation
- `android.permission.BLUETOOTH_SCAN` 기존 유지 (M3-1118-G 에서 이미 추가됨)
- `neverForLocation: true` 추가 (`react-native-ble-plx` 플러그인 config)
  - 판단 근거: POS 앱은 BT-58D 프린터 연결 전용이며 위치 추론 불필요
  - Android 12+ 에서 위치 권한 팝업 없이 BT 스캔 가능

### REQ2 — EAS APK 빌드
- 빌드 ID: `bc346c41-1b6d-4820-b560-b99381434615`
- 빌드 URL: https://expo.dev/accounts/curiocity/projects/meros-pos/builds/bc346c41-1b6d-4820-b560-b99381434615
- APK 다운로드: https://expo.dev/artifacts/eas/jmJeh9Q_IP-fefIP7xxMC0E_bV3NUiHPAKjs8HbIbW4.apk
- 상태: finished ✔

### REQ3 — runbook
- `docs/runbooks/android-apk-install.md` 신규 생성
- 내용: Redmi Pad 2 HyperOS 기준 APK 설치 · 권한 팝업 · 배터리 설정 · dev-client 연결

### REQ4 — lint/test
- lint: 0 errors (warnings 61개 모두 pre-existing)
- vitest: 763 tests passed, 6 expected fail, 3 todo ✔
- gh pr checks: lint ✔ · flow-tests ✔ · assertions ✔ · playwright 진행 중
