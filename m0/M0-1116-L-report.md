# M0-1116-L — 설치형 손님 화면 앱 API base 결정 (pair 404 수정)

PR #310 · 원인 오케 추정과 동일 · 네이티브 API base = `https://admin.meros.id` (app.config `extra.apiUrl` · `CUSTOMER_DISPLAY_API_URL` env 로 덮어씀)

## 원인/수정

- `_layout.tsx` `API_BASE = process.env.EXPO_PUBLIC_API_URL || ""` — 웹(same-origin)은 OK, 설치형은 상대 경로가 Metro(localhost)로 가서 pair 404.
- 결정 규칙 `src/lib/api-base.ts` (pure · vitest): env 있으면 그것 → 웹이면 "" → 네이티브는 `app.config.extra.apiUrl` → 없으면 throw.
- `app.config.ts` 의 `extra.apiUrl = process.env.CUSTOMER_DISPLAY_API_URL || "<운영 admin 호스트>"`. Expo Constants 로 런타임 읽음.
- `_layout.tsx` 가 Platform/Constants/env 를 모아 `pickApiBase()` 호출 · 결과를 BootContext.apiBaseUrl 로 주입. pair · snapshots · link-phone · display-config 네 경로 모두 BootContext 를 거치는 것 grep 확인.
- `naming-check.sh` 예외 확장: `apps/customer-display/app.config.ts` 배포 URL = medusa-config admin 블록과 동일 범주. 스크립트 주석에 M0-1116-L 근거 명시.

## 검증

- vitest 132 pass (`api-base.test.ts` 9 cases · env override · 웹="" · 네이티브 extra · throw 분기).
- `naming-check.sh` PASS.
- 웹 export 상대 경로("") 유지 — admin 서버 `/customer-display-web/*` 서빙 동작 영향 0.
- 서버 측 `/customer-display/pair` 라우트 확인(apps/commerce-core/src/api/customer-display/pair/route.ts) · 미들웨어는 `/customer-display/snapshots/*` 로 좁혀져 있어 pair 는 공개 POST (M0-1105-CR 설계대로) · 네이티브 fetch 는 CORS 무관.
- 기존 `expo-keep-awake` typecheck 오류는 origin/main 과 동일 — 이 PR 유발 아님.

## Kyu 실기 체크

- **JS 로직만 바뀌는 OTA(EAS Update)**: Metro 재시작 불필요. 설치형 앱은 EAS Update publish → 앱 재시작 시 새 번들 받음. 로컬 dev client 는 Metro 재시작 + Reload 로 JS 반영.
- **`app.config` extra 변경**: Expo SDK 50+ 는 EAS Update manifest 에 app config 를 포함하므로 **EAS Update 한 번으로 extra.apiUrl 도 반영**. 별도 네이티브 빌드 불필요. 로컬 dev client 는 Metro 재시작 시 app.config 재평가 → 반영.
- 스테이징/다른 서버로 바꾸려면 `CUSTOMER_DISPLAY_API_URL` env 설정 후 EAS Update (또는 EAS 빌드) publish. 이 env 를 EAS Secret 으로 두면 안전.

## 메모

- PR 머지는 Kyu/T0 소관 (ticket 규약). 이 터미널은 PR 발의까지만.
- CLAUDE.md §0 의 예외 섹션에도 이 범위를 명시해 두면 좋음(별도 docs 커밋 가능) — 이 PR 에선 naming-check.sh 주석까지만 처리.
