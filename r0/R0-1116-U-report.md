#310 APPROVE · 호출처 4/4 통일

## REQ 1 — 호출처 grep

`pickApiBase()` 결과는 `BootContext.apiBaseUrl` 로 주입. 4개 호출처 모두 확인:

| 경로 | 확인 위치 |
|------|----------|
| `pair` | `app/pair.tsx:59` → `useBoot().apiBaseUrl` → `pairDevice({ baseUrl: apiBaseUrl })` |
| `snapshots` | `app/index.tsx:134` → `new LiveSnapshotSource(deviceToken, apiBaseUrl)` |
| `link-phone` | `app/index.tsx:215` → 직접 `apiBaseUrl` 보간 |
| `display-config` | `app/index.tsx:158` → `new LiveDisplayConfigSource({ baseUrl: apiBaseUrl })` |

`src/lib/api-base.ts` 는 pure (RN/Expo import 없음) · `pickApiBase()` 단일 export · `_layout.tsx` 에서 1회 호출 → 모든 경로가 같은 값 공유. 블로커 없음.

## REQ 2 — 웹 export 회귀

- `pickApiBase({ platform: "web" })` → `""` 고정 · 웹 export 상대 경로 유지 ✅
- `app.config.ts` 의 `config.experiments = { baseUrl: "/customer-display-web" }` 는 `!isNativeBuild` 분기로만 추가 → 네이티브 빌드에선 baseUrl 없음 ✅
- `expo-constants` 는 Expo SDK 에 이미 포함 · lockfile 신규 추가 없음 · SDK 58 호환 문제 없음 ✅

## REQ 3 — `app.config` extra · Metro 재시작 근거

M0 기록 정확:

- **JS 로직 변경(EAS Update)**: Metro 재시작 불필요. EAS Update publish → 앱 재시작 시 새 번들 수신.
- **`extra.apiUrl` 변경**: Expo SDK 50+ EAS Update manifest 가 app config extra 를 포함 → **EAS Update 1회로 반영**, 네이티브 재빌드 불필요.
- **로컬 dev client**: Metro 재시작 시 `app.config.ts` 재평가 → `Constants.expoConfig.extra` 갱신. `_layout.tsx` 에서 모듈 최상위(`const API_BASE = pickApiBase(...)`)에서 1회 읽으므로 Metro 재시작 + Reload 로 반영됨.

Expo 공식 동작(SDK 50+ Update manifest 에 app config 포함)과 일치. M0 기록 맞음.

## REQ 4 — CI 요약

| Job | 결과 |
|-----|------|
| customer-display | ✅ success |
| pos-integration | ✅ success |
| unit-commerce-core | ✅ success |
| e2e-admin-loyalty | ✅ success |
| markers-and-forbidden | ✅ success |

## 판정: APPROVE

순수(pure) helper 분리 → vitest 커버리지 가능. 호출처 4/4 단일 경로 통일. 웹 export 상대 경로("") 유지. throw-on-misconfiguration 으로 silent 404 재발 방지. CI 전항목 통과.
