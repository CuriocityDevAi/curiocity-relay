fork #202 CHANGES · 권한 수정은 OK, 그러나 R8 끄기·Sentry 업로드 끄기가 iOS·운영 빌드에도 걸림

# R0C-1119-M — fork PR #202 재리뷰 (M1-1119-E/G/H · Redmi Pad 2 APK)

- 대상: CuriocityDevAi/agilo-medusa-pos-fork #202 · HEAD `49f879d`
- 리뷰: PR 에 COMMENT 게시 ("R0 판정: CHANGES")
- 2026-11-19 · R0 클라우드

## 결과 요약
| 항목 | 판정 | 근거 |
|---|---|---|
| ① prebuild 매니페스트 | OK | BLUETOOTH_SCAN `neverForLocation` + `tools:targetApi="31"` 확인 · 위치권한은 maxSdk 30 한정 · iOS Info.plist diff 0 |
| ② 권한 요청 흐름 | OK | 12+ requestMultiple(SCAN,CONNECT) / 11↓ FINE_LOCATION · 거부 시 영어 Alert + 빈 목록 · 재스캔 시 재요청 · iOS 즉시 true |
| ③ R8·Sentry 범위 | **CHANGES** | R8 끔이 무조건 적용 (운영 Android 포함). `disableAutoUpload` 가 iOS pbxproj 에 `SENTRY_DISABLE_AUTO_UPLOAD=true` 로 들어감 → iOS 운영 소스맵 업로드도 꺼짐. 되돌릴 조건은 본문에 있음 |
| ④ lint·vitest·assertions | OK | lint 0 err · vitest 768 pass (실패 1 = master 의 docs/plans Playwright spec, 무관) · assertions 47/47 · CI 초록 |
| ⑤ API URL·비밀값 | OK | 비-dev 빌드 = `https://api.meros.id` 고정 · 번들 env 는 공개 DSN 뿐 |

## 고칠 것 (차단)
- `app.config.js`: `EAS_BUILD_PROFILE === 'preview'` 일 때만 `withDisableR8Minify`
- Sentry: app.json `disableAutoUpload` 제거 → eas.json `build.preview.env.SENTRY_DISABLE_AUTO_UPLOAD="true"`

## 참고 (비차단)
- runbook 68행 "EXPO_PUBLIC_API_URL 은 eas.json env 에서 주입" 오류 (140행이 맞음)
- `printBytes` 는 권한 확인이 없음 → 설정에서 권한을 끄면 인쇄가 조용히 실패 (후속 검토)
- 지시서에 적힌 SHA(898c47f/47da6a6)와 실제 SHA(7b415f6/ad92d77) 불일치 — rebase 추정
- 실기(Redmi Pad 2) 2항목 미완
