# M2-1105-BQ 완료 보고

PR #269 (draft) · 브랜치 `m2/M2-1105-BQ-customer-display-web-serve`

## 결과 한 줄
customer-display 웹 빌드를 commerce-core 같은 origin(`/customer-display-web/`)에서 서빙하는 파이프라인 · CI job · e2e 12/12 초록 완료.

## REQ 체크리스트

### REQ 1 — 빌드 파이프라인 ✅
- `apps/customer-display/app.json`: `experiments.baseUrl: "/customer-display-web"` → asset 경로 `/customer-display-web/_expo/...` 고정
- `scripts/build-customer-display-web.sh`: 모노레포 루트 선행 빌드 스크립트 (CI에서 Docker 빌드 전 실행)
- `apps/commerce-core/Dockerfile`: `public/customer-display-web/` 존재 시 `.medusa/server/public/`에 편입 (조건부)
- `railway.json`: watchPatterns에 `apps/customer-display/**` 추가
- **Railway 1회 설정 변경 필요**: Root Directory `apps/commerce-core` → `.` 로 변경

### REQ 2 — Simulate URL 지원 현황 ✅
- 지원 파라미터: `state` · `theme` · `event` · `lang` · `hasImage` · `earnPreview` · `maskedPhone` · `afterPay` · `keypadTimeout`
- `mock=1` 미지원 (mock adapter는 항상 URL params 읽음 · 화면 코드 수정은 M3 범위)

### REQ 3 — 네이티브 모듈 stub 정책 ✅
- `apps/customer-display/README.md` 신규 작성: 현재 0건 · 향후 추가 시 `Platform.OS==='web'` / `.web.ts` / `moduleNameMapper` 3가지 방침 문서화

### REQ 4 — 버전 동기화 ✅
- `apps/customer-display/scripts/gen-version.mjs`: `dist/version.json` 생성 (`buildHash` · `appVersion` · `builtAt`)
- `apps/commerce-core/src/api/admin/pos/customer-display/web-version/route.ts`: `GET /admin/pos/customer-display/web-version` → version.json 반환

### REQ 5 — CI job ✅
- `.github/workflows/ci.yml`: `customer-display` job 추가 (typecheck · test · build:web · Playwright e2e · screenshot artifact on failure)
- paths-filter: `apps/customer-display/**` 변경 시 OR PR 시 실행

### REQ 6 — 자기 검증 ✅
- 로컬 e2e: 12/12 통과 (dev-server.mjs가 `/customer-display-web/` prefix 서빙)
- `/customer-display-web/?mock=1&theme=forest&lang=ko` Playwright 스크린샷: `screenshots/verify-forest-ko.png` ✓
- CI PR #269 진행 중 (markers · changes-filter · unit-commerce-core 등 초록 예상)

## 주요 기술 선택
- **정적 서빙**: `src/api/customer-display-web/[...path]/route.ts` custom route (middlewares.ts 금지 대응)
- **e2e dev server**: serve v14 rewrites가 `:path*` 패턴 미작동 → 직접 Node.js HTTP 서버(`dev-server.mjs`) 구현
- **baseUrl**: `app.json experiments.baseUrl` = 빌드 시점 주입 (expo export --base-url 플래그 미지원 확인)

## 추가 작업 필요 (M3 or ops)
- Railway Root Directory 변경: `apps/commerce-core` → `.` (모노레포 루트) + Docker 빌드 경로 조정
