fork #202 · preview APK https://expo.dev/artifacts/eas/qKxjPzH3ukQOrRULYoaSteK48Ab_bfkoFpSzcSc4Me4.apk · Metro 없이 실행 O(에뮬레이터 Medium_Phone_API_36.1 — 로그인화면 확인) · neverForLocation O · 권한 요청 O

## 빌드

| 항목 | 값 |
|------|-----|
| Build ID | fc4381ed-1b7d-408e-9d64-cfdf76c8c34a |
| Status | finished |
| Commit | ad92d77 (rebase 후 47da6a6) |
| 시작 | 2026-11-19 12:39 WIB |
| 완료 | 2026-11-19 13:04 WIB (25분) |
| APK URL | https://expo.dev/artifacts/eas/qKxjPzH3ukQOrRULYoaSteK48Ab_bfkoFpSzcSc4Me4.apk |

## 에뮬레이터 검증

- 기기: Medium_Phone_API_36.1 (Android 에뮬레이터)
- APK 설치: `adb install -r` → Success
- 첫 화면: MEROS POS 로그인 화면 (Email Address / Password) — Metro 없이 독립 실행 ✅
- 스크린샷: `e2e/screenshots/M1-1119-H-preview-emulator.png`
- Redmi Pad 2 실기: 미검증 (기기 미연결)

## 완료 작업

1. `git fetch origin && git rebase origin/master` 완료
2. PR #202 본문 "되돌릴 조건" 추가 (R8 minify · Sentry 업로드)
3. `docs/runbooks/android-apk-install.md` 실제 APK URL 반영
4. 커밋 `49f879d` push 완료
5. PR 테스트 플랜 체크박스 업데이트

## 미완 항목

- Redmi Pad 2 실기 설치 · BT 권한 팝업 확인 (기기 내일 도착 예정)
