fork#142 APPROVE · #269 CHANGES

---

## fork #142 — fix(netinfo): M3-1105-CO

**판정: APPROVE**

### 체크 항목

| 항목 | 결과 |
|---|---|
| diff가 hooks/use-network-status.ts + 테스트뿐인지 | ✅ 2파일만 변경 (hooks/use-network-status.ts 수정, __tests__/use-network-status.test.ts 신규) |
| static netinfo import 잔류 없는지 | ✅ `grep -rn "@react-native-community/netinfo"` → hooks/use-network-status.ts의 lazy require 1건 외 없음. master 브랜치에서도 동일 파일 1건뿐이었음 |
| Metro 지연 평가 안전성 | ✅ `NativeModules.RNCNetInfo ? require(...) : null` — ternary가 require() 호출 전에 falsy 평가되면 require 미실행. metro.config.js에 inlineRequires 미설정(Expo 기본값)이나 inlineRequires 활성 시에도 ternary 분기 자체가 require를 건너뜀 — 안전 |
| New Architecture(TurboModule) | ⚠️ 주의수준: TurboModule 환경에서 NativeModules.RNCNetInfo가 undefined일 수 있음 → 재빌드된 앱에서도 always-online 폴백 진입 가능. 앱 크래시 없이 오프라인 감지만 비활성화됨 — REQ 명시대로 주의 수준 기록 |
| vitest 직접 실행 | ✅ 3/3 passed (`node_modules/.bin/vitest run __tests__/use-network-status.test.ts` — Duration 175ms) |
| expo export --platform ios | ✅ 번들 생성 성공 (`_expo/static/js/ios/entry-949d81b55bf377cf10a52528986d7667.hbc` 12MB) |
| CI | assertions pass · flow-tests pass · lint pass · playwright pending |

### 코멘트 (파일:줄)

`hooks/use-network-status.ts:6` — New Architecture 대응 주석 추가 권장. `NativeModules.RNCNetInfo` 는 TurboModule 환경에서 항상 undefined 이므로 재빌드 후에도 offline 감지가 꺼질 수 있음. 현재는 안전한 폴백이지만 추후 `NetInfoTurboModule` 등의 대안 탐색 필요.

---

## storeport #269 — feat(customer-display): M2-1105-BQ A0

**판정: CHANGES**

### 체크 항목

| 항목 | 결과 |
|---|---|
| safePath traversal 방어 | ✅ `resolve(join(base, ...parts))` 후 `full.startsWith(base + "/")` 체크 — %2e%2e·역슬래시·절대경로 모두 방어 |
| MIME 테이블 | ✅ html/js/mjs/css/json/png/jpg/svg/ico/woff/woff2/ttf/map 커버 |
| 캐시 헤더 | ⚠️ **CHANGES** `version.json`이 `immutable` 캐시 적용됨. 파일명이 고정이므로 배포마다 갱신되어야 하는데 `max-age=31536000, immutable`로 브라우저가 1년간 캐싱 → 신규 배포 반영 불가. `index.html`처럼 `no-cache`로 처리해야 함 |
| SPA fallback | ⚠️ 주의: `cdwResolveFile`이 모든 404(`.js`·`.css` 에셋 포함)를 `index.html` 200으로 반환함. 번들 에셋 누락 시 브라우저가 JS 대신 HTML을 받아 디버깅 어렵게 됨. 에셋 경로(`_expo/static/`)는 404 그대로 반환 권장 |
| matcher 패턴 | ⚠️ **CHANGES** `matcher: "/customer-display-web"` — 기존 `"/customer-display/*"`와 달리 wildcard 없음. path-to-regexp v8에서 `/customer-display-web`은 정확히 그 경로만 매칭, 하위 경로(`/index.html` 등)는 미매칭 가능. PR 로컬 curl 테스트는 통과했다고 하나 Medusa defineMiddlewares의 prefix 매칭 여부 명확히 확인 필요. `"/customer-display-web/*"`로 명시적 wildcard 사용 권장 |
| req.path prefix 스트리핑 | ⚠️ 코드 주석 "req.path is the path after Express strips the '/customer-display-web' mount prefix"가 defineMiddlewares 환경에서 실제로 동작하는지 확인 필요. app.use() 마운트 시에만 prefix 제거됨 — defineMiddlewares matcher 방식에서는 req.path가 풀 경로일 수 있음 |
| 미들웨어 순서 | ✅ `/customer-display-web` 핸들러가 auth 미들웨어(`/customer-display/*`) 이후에 위치 — 간섭 없음 |
| naming-check 검사 3 | ✅ `[...]` 패턴 bash 정규식 `\[\.\.\. ]` 올바름. `api/` 하위 디렉터리 순회 |
| CI (pos-integration) | 미검증 — CI checks 없음(`no checks reported on the 'm2/M2-1105-BQ-customer-display-web-serve' branch`) |

### 코멘트 (파일:줄)

`apps/commerce-core/src/api/middlewares.ts:134` — `matcher: "/customer-display-web"` → `"/customer-display-web/*"` 으로 변경 필요. 기존 `/customer-display/*` 패턴 참조. 현재 패턴으로는 `/customer-display-web/index.html` 등 하위 경로가 매칭되지 않을 수 있음.

`apps/commerce-core/src/api/middlewares.ts:117` — `version.json`은 콘텐츠 주소 파일명 아님. `immutable` 캐시 대신 `no-cache` 적용 필요. 현재 로직에서 `file.endsWith("index.html")` 외에 `|| file.endsWith("version.json")`을 추가하거나 별도 분기로 처리.

`apps/commerce-core/src/api/middlewares.ts:107` — SPA fallback이 에셋 경로(`_expo/static/`) 404도 흡수함. `subPath.includes("/_expo/static/")` 등 에셋 패턴 매칭 시 fallback 건너뛰고 404 반환 권장.

---

## 실행 명령 로그

```
$ cd /tmp/wt-netinfo
$ git worktree add /tmp/wt-netinfo origin/fix/m3-1105-co-netinfo-guard
$ node_modules/.bin/vitest run __tests__/use-network-status.test.ts
  Test Files  1 passed (1) | Tests  3 passed (3) | Duration 175ms
$ npx expo export --platform ios
  › ios bundles (1): _expo/static/js/ios/entry-949d81b55bf377cf10a52528986d7667.hbc (12MB)
  Exported: dist
$ gh pr checks 269 --repo CuriocityDevAi/storeport
  no checks reported on the 'm2/M2-1105-BQ-customer-display-web-serve' branch
$ gh pr checks 142 --repo CuriocityDevAi/agilo-medusa-pos-fork
  assertions pass · flow-tests pass · lint pass · playwright pending
```
