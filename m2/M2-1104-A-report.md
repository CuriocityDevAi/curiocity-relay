---
round: M2-1104-A
pr:
  fork: agilo-medusa-pos-fork#15
commit: 3f7fed6799288e6c64274aeeb86c3473d8aa045b
outcome: Sentry 앱 SDK 연결 · env-gated · Expo Go 호환 · 운영 영향 0 머지 가능
kyu_checks: 4 (프로젝트 생성 · DSN 투입 · 아이패드 Expo Go 기동 정상 · 테스트 오류 1건 Sentry 도착)
---

# M2-1104-A · Sentry 앱측 연결 (pos-app · curiocity-devai org)

**일자**: 2026-11-04 · **허브**: M2 (신설) · **상대 리포**: `agilo-medusa-pos-fork` (pos-m2 worktree)

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | `@sentry/react-native` 설치 · SDK 57/58 호환 버전 명시 | ✓ `^8.33.0` (peer `expo>=49, RN>=0.65`) |
| 2 | Expo config plugin 등록 | ✓ `app.json` plugins 에 `@sentry/react-native/expo` |
| 3 | `lib/sentry.ts` 신규 · env-gated | ✓ `EXPO_PUBLIC_SENTRY_DSN` 없으면 no-op |
| 4 | release = 앱 버전 + 커밋 | ✓ `meros-pos@<version>+<EXPO_PUBLIC_COMMIT_SHA>` |
| 5 | tracesSampleRate 0.1 | ✓ |
| 6 | setUser id 만 (이메일 미전송) | ✓ `setSentryUser(auth.state.user.id)` · auth 상태 변화 effect |
| 7 | `_layout.tsx` 최상단 init · ErrorBoundary wrap | ✓ 모듈 로드 시 `initSentry()` · `export default wrapRoot(RootLayout)` |
| 8 | 테스트 트리거 (숨은 UI 금지) | ✓ `EXPO_PUBLIC_SENTRY_TEST=1` 환경변수 1회 fire. 방법 제안 → 구현 |
| 9 | `eas.json` development/preview/production | ✓ ios.simulator=false · channel 지정 · `eas build` 미실행 |
| 10 | Expo Go 기동 crash 금지 (native module 미존재) | ✓ `enableNative: Constants.appOwnership !== 'expo'` + try/catch |
| 11 | docs/runbooks/sentry-app.md (Kyu 2 클릭) | ✓ |

## 2. 변경 파일

| 파일 | 변경 종류 | 라인 |
|------|-----------|------|
| `package.json` | dep 추가 | 1 |
| `package-lock.json` | regen | 1107 |
| `app.json` | plugin 1줄 | 3 |
| `app/_layout.tsx` | init + wrap + setUser effect | 18 |
| `eas.json` | profile 확장 | 15 |
| `lib/sentry.ts` | 신규 | 73 |
| `docs/runbooks/sentry-app.md` | 신규 | 118 |
| `scripts/m2-1104-a-playwright.mjs` | 신규 | 93 |

**M1·M3 동시 작업 영역 미수정**. 사용자 지정 owner 범위 100% 준수.

## 3. 자동 검증

### 3-A. Playwright (Expo 웹 export · DSN 미설정)

```
serving /Users/kyu.lee/projects/pos-m2/dist on :9420

--- (1) 미인증 상태 index.html (DSN 미설정) → 기동 ---
  ✓ (1) pageerror 0건 (Sentry init 이 앱 기동을 깨지 않음)

--- (2) 로그인 화면 DOM 도달 ---
  ✓ (2) 로그인 화면 요소 존재

--- (3) console.error 0건 ---
  ✓ (3) console.error 0건

--- (4) Sentry 심볼 흔적 (번들 포함 확인) ---
  ✓ (4) 엔트리 번들 로드됨 (Sentry 포함 번들)

4/4 passed · 0 failed
```

스크린샷: `/tmp/m2-1104-a-screenshot.png` (로그인 화면).

### 3-B. clean-clone `npm ci`

```
$ cd /tmp/pos-m2-ci-test
$ cp /Users/kyu.lee/projects/pos-m2/package.json .
$ cp /Users/kyu.lee/projects/pos-m2/package-lock.json .
$ npm ci --legacy-peer-deps
...
added 1039 packages, and audited 1040 packages in 12s
exit 0
```

### 3-C. tsc

```
$ npx tsc --noEmit
app/_layout.tsx(6,8): error TS2882: Cannot find module or type declarations for side-effect import of '../global.css'.
```

이 1건은 **M2-1104-A 이전부터 존재**하는 NativeWind CSS side-effect import 선언 누락 (M2 범위 밖 · master 에 동일).

### 3-D. expo lint (M2 소유 파일)

- `app/_layout.tsx` · duplicate `expo-router` import 경고 2건 (기존 코드 · M2 추가 import 아님)
- `lib/sentry.ts` · `scripts/m2-1104-a-playwright.mjs` · 경고 0건

## 4. 설계 메모

- **버전 선택**: `^8.33.0` (latest stable). peer `expo>=49` + `RN>=0.65` 로 넉넉 → SDK 57 master · SDK 58 M0-1104-B 양쪽 동시 호환.
- **DSN 비설정 시 no-op**: `initSentry()` 가 DSN 없으면 `Sentry.init` 호출 자체를 건너뜀. 바로 머지 가능 (Kyu 프로젝트 생성 전).
- **Expo Go 호환**: `Constants.appOwnership === 'expo'` → `enableNative: false` 로 JS-only 모드. iPad Expo Go 기동 crash 없이 작동 + JS 에러는 여전히 수집 가능.
- **ErrorBoundary**: `Sentry.wrap(RootLayout)` 로 HOC 패턴 (ErrorBoundary + touch instrumentation 포함). Sentry 미초기화 시 pass-through.
- **이메일 미전송**: `setUser({ id: auth.state.user.id })` — `email`/`username` 필드 명시적 생략. GDPR/개인정보 지침.
- **테스트 트리거**: "숨은 Send test error" 는 번들 노출 위험 → 환경변수 `EXPO_PUBLIC_SENTRY_TEST=1` 로 치환. dev 시 CLI inline · 프로덕션 번들엔 조건 분기 `!== '1'` 로 dead-code (Expo bundler 가 strip).
- **소스맵**: 이번 라운드 **범위 밖**. 활성에는 `SENTRY_AUTH_TOKEN` + plugin options (`organization`, `project`) 필요. 후속 M2 라운드에서 app.json plugin options 확장 + EAS secret 1개로 완료 가능. 지금은 **crash capture 만**.

## 5. Kyu 실기 (PR body 동일)

- [ ] `curiocity-devai.sentry.io` → Create Project `pos-app` (React Native) · DSN 복사
- [ ] `eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value '<DSN>'`
- [ ] 아이패드 Expo Go: `EXPO_PUBLIC_SENTRY_DSN='<DSN>' EXPO_PUBLIC_SENTRY_TEST=1 npx expo start` → Meros POS 기동 정상
- [ ] Sentry `pos-app` 프로젝트에 `M2-1104-A · sentry-app smoke test` 1건 도착 확인

세부: `docs/runbooks/sentry-app.md`.

## 6. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/15
- 브랜치: `feat/m2-1104-a-sentry-app` · 머지 대상: `master`
- 커밋: `3f7fed6`
