PR #302 · 웹 export 영향 없음 · Kyu 가 칠 명령 5개

## 수행 결과

PR: https://github.com/CuriocityDevAi/storeport/pull/302 (feat/m0-1116-I · branch m0/M0-1116-I)

| 라운드 | 변경 |
|------|------|
| R0 | `eas.json` 신규 (development(dev-client, internal, simulator false) · preview(internal) · production(TestFlight channel)) · `app.config.ts` (app.json 대체 · 웹 빌드만 `experiments.baseUrl=/customer-display-web` · 네이티브 빌드 비활성화 · `owner=curiocity` · `runtimeVersion.policy=appVersion` · `updates.url` placeholder · EAS projectId 자리) · `expo-updates~58.0.22` + `expo-dev-client~58.0.20` + `expo-keep-awake~58.0.4` (`npx expo install` · SDK 58 매트릭스) |
| R1 | `app/_layout.tsx` 에 `activateKeepAwakeAsync()` useEffect — iPad 손님 화면 자동 잠금 금지. 웹에선 `.catch(() => {})` 로 무시. |
| R2 | `scripts/dev-refresh.sh` — POS (`~/projects/pos-m0-bk/scripts/dev-refresh.sh`) 동형. main gate · `pnpm install` 자동 감지(package.json/pnpm-lock 변경 or node_modules 부재) · `npx expo start --dev-client [--clear]` |

## 검증 (Claude 가 이번 세션에서 실측)

- `pnpm build:web` → `dist/` 생성 · `dist/index.html` 에 `/customer-display-web/favicon.ico` prefix 유지 (grep 확인).
- `EAS_BUILD_PLATFORM=ios npx expo config --type public` → `experiments` 키 **없음** (baseUrl 끔 확인).
- 기본(웹) `npx expo config --type public` → `experiments.baseUrl='/customer-display-web'` + `owner='curiocity'` + `runtimeVersion.policy='appVersion'` + `updates.url='https://u.expo.dev/PLACEHOLDER-RUN-EAS-INIT'` 확인.
- `npx expo-doctor` → **20/20 pass**.
- `pnpm test` → **123/123 pass** (vitest).
- `pnpm typecheck` → clean (tsc --noEmit).
- `bash scripts/naming-check.sh` → pass (초기 코멘트에 'meros' 혼입 발견 → 수정 후 재검증).
- **실 브라우저 Playwright** (viewport 1180×820 iPad · dev-server.mjs 로 dist/ 서빙):
  - `e2e/pair-screen.spec.ts` (1건) — `/pair` 렌더 pass
  - `e2e/snapshots.spec.ts` (12건) — 첫화면 mock + 테마/언어/키패드 전부 pass
  - 스샷: `/tmp/m0-1116-i-screens/pair.png`, `/tmp/m0-1116-i-screens/index-mock.png` (PR 본문 참조용)

## Kyu 가 직접 칠 명령 (처음 하는 사람 기준)

1. **`cd apps/customer-display && eas init`** — Expo 프로젝트와 EAS 프로젝트 연결. `app.config.ts` 의 `EAS_PROJECT_ID` placeholder 가 자동 채워진다. (이 PR 은 자리만 뒀고, 실제 UUID 는 `eas init` 이 `.env` 또는 설정에 기록.)
2. **`eas device:create`** — 손님 iPad 1 대 UDID 등록. 터미널이 QR/링크를 띄우면 iPad 에서 열어 프로비저닝 프로필 설치. 이후 build 가 이 기기에만 설치 가능.
3. **`eas build --profile development --platform ios`** — dev-client 가 포함된 `.ipa` 를 EAS 서버에서 빌드(10–20분). 완료 메일/대시보드의 설치 URL 을 iPad 에서 열어 설치.
4. **(iPad 에서 설치 완료 후) MacBook 에서 `cd apps/customer-display && ./scripts/dev-refresh.sh`** — git pull → (변경 시) `pnpm install` → `npx expo start --dev-client` 를 켠다. 같은 Wi-Fi 상에서 iPad dev-client 가 Metro 를 발견 → 앱 실행.
5. **(매장 운영 단계로 넘어갈 때) `eas build --profile production --platform ios && eas submit --platform ios --latest`** — TestFlight 에 업로드. 이후 JS 변경은 `eas update --channel production` 으로 OTA 배포.

## 미검증 (Kyu 실기 영역)

- `eas init` / `eas build` / `eas submit` / `eas device:create` / `eas update` 는 실행하지 않음 (Apple 인증·기기 등록·외부 업로드 = Kyu 몫).
- 실제 iPad 에서 `activateKeepAwakeAsync()` 가 실제 잠금을 막는지 기기 실기 필요.
- TestFlight production channel OTA 동작은 실 업로드 후 확인 필요.

## 선택지 · 채택 · 이유

- **A(dev client) + B(TestFlight+OTA) 2단계**. Kyu 11-16 11:41 동의. dev client 는 매장 운영 부적합(Mac Metro 상시 필요), 순수 웹은 keep-awake 불가.
- `baseUrl` 분기 방식 = `EAS_BUILD_PLATFORM` 환경 변수 체크. ios/android 때만 OFF. 로컬 `expo export --platform web` 은 해당 env 미설정 → 자동 ON.
