PASS

## 기기 빌드 정보

EAS 최근 10개 빌드 (curiocity/meros-pos) — 전부 `development` 또는 `preview` 프로필, `production` 채널 바이너리 없음.

| ID (앞 8자) | Platform | Profile | Status | RuntimeVersion |
|---|---|---|---|---|
| e5af2c3d | Android | development | errored | 1.0.0 |
| 5a73b64e | iOS | development | finished | 1.0.0 |
| 09be254c | Android | development | finished | 1.0.0 |
| 21586113 | Android | development | finished | 1.0.0 |
| 1ed0f9a9 | iOS | development | finished | 1.0.0 |
| fc4381ed | iOS | preview | finished | 1.0.0 |
| 31fdc6ba | Android | preview | errored | 1.0.0 |
| 6011d6bb | Android | preview | errored | 1.0.0 |
| 00e216ef | Android | preview | canceled | 1.0.0 |
| e8f0e2ac | Android | preview | canceled | 1.0.0 |

## OTA 가능/새 빌드 필요 판정

**판정: 새 빌드 필요 (OTA 현재 불가)**

근거 1 — `updates.url` 미선언:
- `app.config.js` / `app.json` 어디에도 `updates.url` 없음.
- `eas update` 실행 시 "Cannot automatically write to dynamic config" → 명령 실패.
- `extra.eas.projectId` 는 EAS 프로젝트 식별자일 뿐, `updates.url` 을 자동 생성하지 않는다. (M3-1125-U 오판 근거)

근거 2 — production 채널 바이너리 없음:
- `updates.url` 고쳐도 기기에 `production` 채널로 빌드된 바이너리가 없으면 OTA 도달 불가.
- 현재 기기에는 `development` 또는 `preview` 채널 빌드가 설치된 것으로 추정.

## env 출처

| 변수 | 출처 | production 위험 |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | 코드 하드코딩 (`https://api.meros.id`), `__DEV__`에서만 오버라이드 허용 | 없음 |
| `EXPO_PUBLIC_CD_WEB_URL` | 코드 하드코딩 (`https://admin.meros.id/customer-display-web`), `__DEV__`에서만 오버라이드 허용 | 없음 |
| `EXPO_PUBLIC_SENTRY_DSN` | `eas.json` build.production `env` → EAS 시크릿 `$EXPO_PUBLIC_SENTRY_DSN` 참조 | eas update 시 별도 주입 필요 (아래 참조) |

`eas update` 실행 시 `EXPO_PUBLIC_SENTRY_DSN` 가 로컬에 없으면 Sentry 미적용 번들이 됨 → 아래 명령에서 해결 방법 제시.

## CD iPad 앱 (storeport apps/customer-display) 확인

- `app.config.ts` 에 `updates.url: https://u.expo.dev/5b023fc6-c56a-4846-b187-ba16019e3ca3` **이미 선언됨** — 함정 없음.
- `runtimeVersion: { policy: "appVersion" }` — 정상.
- `CUSTOMER_DISPLAY_API_URL` 기본값 `https://admin.meros.id` 하드코딩 — 환경변수 없어도 운영값 사용.
- **CD는 OTA 준비 완료. 새 빌드 불필요.**

## PR 번호

- fork PR #267: `fix(ota): M3-1125-V — app.config.js updates.url 추가`
  https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/267

## Kyu 명령 (단계별)

```bash
# [0] PR #267 merge 대기 후

# [1] fork master pull
cd ~/projects/agilo-medusa-pos-fork
git pull origin master

# [2] production iOS 바이너리 신규 빌드
npx eas-cli build --profile production --platform ios --non-interactive

# [3] 빌드 완료 확인 (별도 터미널 또는 EAS 대시보드)
npx eas-cli build:list --platform ios --limit 3

# [4] TestFlight 에서 기기에 설치

# [5-a] EAS environment 에 Sentry DSN 등록 (최초 1회)
npx eas-cli env:create --name EXPO_PUBLIC_SENTRY_DSN --environment production

# [5-b] 이후 OTA 업데이트
npx eas-cli update --branch production --environment production --message "M3-1125-R customer_flow chip" --non-interactive
```

참고: [5-a] EAS environment 등록을 원하지 않으면 [5-b] 대신:
```bash
EXPO_PUBLIC_SENTRY_DSN=<실제값> npx eas-cli update --branch production --message "M3-1125-R customer_flow chip" --non-interactive
```
