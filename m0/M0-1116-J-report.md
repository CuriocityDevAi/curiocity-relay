PR #302 · 웹 export 영향 없음 · Kyu 가 칠 명령 5개 · (I 에서 만든 fork PR 없음)

## 요지

M0-1116-J = M0-1116-I 의 "저장소 지정 오지정" 정정. M0-1116-I 는 이미 **storeport**(PR #302) 에 커밋/푸시되어 있었음 — fork 가 아님(fork 에는 `apps/` 자체가 없다). 지침("storeport 쪽에 이미 했다면 그 PR 을 이어서") 에 따라 **PR #302 를 이어서** 사용. fork 에 M0-1116-I 브랜치/PR 은 발견되지 않음.

## 이번 라운드(J)의 추가 변경 1건

`docs/feature-map.yaml` cd-envelope.files 에 `apps/customer-display/app.json` 추가.
- 원인: I 가 `app.json` → `app.config.ts` 로 전환 (deletion) 했는데 cd-envelope 패턴에 `app.json` 이 없어 feature-map-check 가 unmatched=1 로 **FAILURE** 였음.
- 커밋: `e208e7c fix(feature-map): M0-1116-J — customer-display app.json 삭제 매칭 추가` (processes: [customer-display.cd-envelope]).
- 재검증: 로컬 `node scripts/feature-map-check.mjs --diff` → unmatched=0. CI `feature-map-check` → **SUCCESS**.

## PR #302 전체 변경 (I 의 것 그대로 · J 의 feature-map 패치만 추가)

| 파일 | 내용 |
|------|------|
| `apps/customer-display/eas.json` 신규 | development(dev-client · internal · simulator=false) · preview(internal) · production(TestFlight · `channel: production`). `appVersionSource: local`. |
| `apps/customer-display/app.config.ts` 신규 (app.json 대체) | `EAS_BUILD_PLATFORM` 가 ios/android 일 때만 `experiments.baseUrl` 생략. owner `curiocity` · `runtimeVersion.policy=appVersion` · `updates.url` = EAS projectId 있으면 `https://u.expo.dev/<id>`, 없으면 `https://u.expo.dev/PLACEHOLDER-RUN-EAS-INIT`. |
| `apps/customer-display/package.json` · `pnpm-lock.yaml` | `expo-updates~58.0.22` · `expo-dev-client~58.0.20` · `expo-keep-awake~58.0.4` (`npx expo install`). |
| `apps/customer-display/app/_layout.tsx` | `activateKeepAwakeAsync()` useEffect 추가 (웹은 `.catch(() => {})` 로 무시). 기존 #295 mount-gate/mock/pairing 로직 **무변경**. |
| `apps/customer-display/scripts/dev-refresh.sh` 신규 | POS 동형 (main gate · pnpm install 자동 감지 · `npx expo start --dev-client [--clear]`). |

**M3 소관 금지선 준수**: `app/pair.tsx` · `src/i18n/**` · `e2e/pair-screen.spec.ts` 미변경.

## Claude 가 이번 세션에서 실측

- `pnpm build:web` → `dist/index.html` 에 `/customer-display-web/favicon.ico` prefix 유지 (grep 3건).
- `EAS_BUILD_PLATFORM=ios npx expo config --type public` → `experiments` 키 **없음** (baseUrl 끔 확인).
- 기본(웹) `npx expo config --type public` → `experiments.baseUrl='/customer-display-web'` + `owner='curiocity'` + `runtimeVersion.policy='appVersion'` + `updates.url='https://u.expo.dev/PLACEHOLDER-RUN-EAS-INIT'` 확인.
- `npx expo-doctor` → **20/20 pass**.
- `pnpm test` → **123/123 pass**.
- `pnpm typecheck` → clean.
- Playwright `--grep "snapshots|pair"` → **13/13 pass**.
- 스크린샷 (viewport 1180×820 · dist/ 를 dev-server.mjs 로 서빙):
  - `/tmp/m0-1116-j-screens/mock-index.png` = `?mock=1` 첫 화면 (Soopsok Sweets · 포인트 안내 3단계 · 영문)
  - `/tmp/m0-1116-j-screens/pair.png` = `/pair` (기기 연결 · 6자리 입력 · 숫자 키패드) — **현 브랜치는 M3-1116-H 미머지라 2열 상태**; M3 머지 후 3열로 교체됨
- 운영 웹(`https://admin.meros.id/customer-display-web/`) 영향: **없음**. Railway Dockerfile(apps/commerce-core/Dockerfile) 의 customer-display 웹 빌드 단계는 `pnpm --filter customer-display build:web` 호출만 하므로 산출물 포맷 불변 → 영향 0.
- CI (push 직후): `feature-map-check=SUCCESS` · `markers-and-forbidden=SUCCESS` · `changes-filter=SUCCESS` · 나머지 IN_PROGRESS (M1-1116-J 로 수정 중인 pre-existing pos-integration 은 이 PR 의 코드 변경과 무관).

## Kyu 가 직접 칠 명령 (처음 하는 사람 기준 · 순서대로)

1. **`cd apps/customer-display && eas init`** — Expo 프로젝트와 EAS 프로젝트를 연결. 현재 `app.config.ts` 의 `EAS_PROJECT_ID` placeholder 가 자동 채워진다(혹은 shell env `EAS_PROJECT_ID=<uuid>` 설정 가능).
2. **`eas device:create`** — 손님 iPad 1 대 UDID 등록. 터미널에 뜨는 QR/링크를 iPad 에서 열어 프로비저닝 프로필 설치. 이후 build 가 이 기기에만 설치 가능.
3. **`eas build --profile development --platform ios`** — dev-client 포함 `.ipa` 를 EAS 서버에서 빌드(약 10–20분). 완료 메일/대시보드의 설치 URL 을 iPad 에서 열어 설치.
4. **(iPad 설치 완료 후) MacBook 에서 `cd apps/customer-display && ./scripts/dev-refresh.sh`** — git pull → (변경 시) pnpm install → `npx expo start --dev-client` 가 떠서 같은 Wi-Fi 의 iPad dev-client 와 연결.
5. **(매장 운영 단계로 넘어갈 때) `eas build --profile production --platform ios && eas submit --platform ios --latest`** — TestFlight 업로드. 이후 JS 변경은 `eas update --channel production` 으로 OTA.

## 미검증 (Kyu 실기 영역)

- `eas init` / `build` / `submit` / `device:create` / `update` 모두 미실행 (Apple 인증·기기 등록·외부 업로드 = Kyu 몫).
- 실제 iPad 에서 `activateKeepAwakeAsync()` 가 잠금을 막는지는 기기 실기 필요.
- TestFlight channel OTA 동작은 production 업로드 후 확인 필요.

## 선택지 · 채택 · 이유 (PR 본문 3줄 요약)

- **A(dev client) + B(TestFlight+OTA) 2단계** 채택 — Kyu 11-16 11:41 동의. dev client 는 매장 운영 부적합(Mac Metro 상시 필요), 순수 웹은 keep-awake 불가.
- `baseUrl` 분기 = `EAS_BUILD_PLATFORM` env 체크. ios/android 때만 OFF. 로컬 `expo export --platform web` 은 env 미설정 → 자동 ON.
- feature-map 는 "삭제되는 파일도 어느 프로세스에 속했는지"로 매칭 — app.json 을 cd-envelope.files 에 남겨 이 round 의 deletion 을 흡수.
