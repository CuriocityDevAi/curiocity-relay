---
round: M0-1104-G
pr:
  storeport: storeport#177
outcome: planning-gate · 3 요구 계획서 1파일 · 4 PR 분할 제안 · 코드 변경 0
kyu_checks: 1 (plan-approved · 라운드 분할·asset 확정)
---

# M0-1104-G · 계획 게이트 (Admin 리브랜딩 · Shop URL 제거 · 가게 선택)

**일자**: 2026-11-04 · **허브**: M0 · **성격**: 방법론 ③ 계획 게이트 · **코딩 금지** · **산출**: `storeport/docs/plans/M0-1104-G-plan.md` 1파일.

**원문 (Kyu 11-03)**:
1. Admin 웹 (admin.meros.id · Medusa v2.17.2 admin) "Welcome to Medusa → Welcome to Meros" 리브랜딩 (문구·로고·탭 제목·파비콘).
2. POS 앱 (agilo-medusa-pos-fork) 로그인의 Shop URL 칸 제거 · api.meros.id 를 앱 상수로 고정 · 이메일·비번만.
3. 가게 선택: 로그인 뒤 계정이 속한 매장 목록에서 선택 · 1개면 자동 선택.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | 3 요구별 "코어에 있음/우회/신규 필요" 대사표 (file:line 근거) | ✓ |
| 2 | 건드릴 파일 목록 (리포별 · 파일 1개 주인 1개) | ✓ (15 파일 · 두 리포 교차 0) |
| 3 | 라운드 분할 제안 (몇 개 PR · 순서 · Kyu 실기) | ✓ (4 PR: A·B·C·D + 지연 K) |
| 4 | 위험 1~3줄 | ✓ (3 건) |
| 5 | docs-only PR (`docs/m0-1104-g-plan` · storeport) | ✓ PR #177 |
| 6 | 코딩 0 | ✓ |

---

## 1. 계획서 전문 (`storeport/docs/plans/M0-1104-G-plan.md`)

---

### 코어 매핑 요지 (실측)

| 질문 | 답 | 근거 |
|------|----|------|
| 코어에서 "가게" 가 무엇인가? | **`stock_location_id`** | `apps/commerce-core/src/modules/register_session/models/register-session.ts:9` — "Q9 1 매장 MVP · stock_location_id 로 매장 식별 (tenant 미도입 · Phase Next)". register_session (POS 교대) 는 stock_location_id 로 scope. Medusa 네이티브 `Store` 엔티티는 배포 싱글톤이라 "가게" 아님 · `sales_channel` 은 UI/이행 분류 축. |
| User → stock_location 접근 권한이 코어에 있나? | **없음 (Phase 0 scaffold)** | `apps/commerce-core/src/modules/rbac/service.ts:10-14` empty · `apps/commerce-core/src/modules/tenant/service.ts:4-11` empty. 현재 모든 admin 이 모든 stock_location 가시. |
| 다중 매장 계정 시나리오가 실측 가능한가? | **불가 (1 매장 MVP)** | 상동. 다중 매장은 Phase Next. |

### 요구 1 · Admin 리브랜딩 (storeport)

| 서브 항목 | 분류 | 근거 (file:line) |
|---------|------|---|
| `medusa-config.ts` 공식 admin 옵션 | **우회** | `node_modules/@medusajs/types/.../common/config-module.d.ts:30-124` — `AdminOptions = { disable, path, backendUrl, storefrontUrl, outDir, vite, maxUploadFileSize }`. **title/logo/favicon 전용 키 없음**. |
| "Welcome to Medusa" 문구 | **신규 필요** | `node_modules/@medusajs/dashboard/src/i18n/translations/en.json` 에 해당 문자열 **부재** → 하드코딩 추정. scaffold: `apps/commerce-core/src/admin/i18n/index.ts` (`export default {}`). |
| 로고 교체 | **신규 필요** | 공식 "logo slot" API 없음 (`node_modules/@medusajs/admin-shared/.../index.d.ts:108-109` zone 목록에 logo 미존재). 현재 로고는 번들 임베드 (추정). |
| 파비콘 | **우회** | `apps/commerce-core/.medusa/client/index.html:12` — `<link rel="icon" href="data:," data-placeholder-favicon />` placeholder. bundler 치환 가능성 (추정). |
| 브라우저 탭 제목 | **신규 필요** | `.medusa/client/index.html` 에 `<title>` 부재 (추정). widget 의 `useEffect(() => { document.title = 'Meros Admin' })` 1줄이 가장 안전. |
| 위젯/라우트 확장 API | **코어에 있음** | `node_modules/@medusajs/admin-sdk/dist/index.d.ts:4-83` — `defineWidgetConfig`, `defineRouteConfig`, `defineLayoutConfig`. 150+ zone. 단 logo/favicon zone 없음. |
| storeport 현재 상태 | **코어에 있음 (빈 scaffold)** | `apps/commerce-core/src/admin/` 존재 · `i18n/index.ts` 빈 · widget/route 0건. |

**요구 1 실행 경로**: `admin.vite` 콜백 + widget 조합 (문구=widget · 로고=Vite alias · 파비콘=transformIndexHtml · 탭=widget useEffect).

### 요구 2 · POS Shop URL 제거 + api.meros.id 고정 (fork)

| 서브 항목 | 분류 | 근거 (file:line) |
|---------|------|---|
| Shop URL 입력 | **코어에 있음** | `app/login.tsx:275-286` — `<TextField name="medusaUrl" placeholder="Shop URL" testID="loginShopUrl" />`. zod + `/health` 검증 추정 `app/login.tsx:74-96`. |
| URL 저장소 | **코어에 있음** | `contexts/auth.tsx:102` set · `contexts/auth.tsx:164` get. 보조: `utils/loginRemember.ts:6,47` key `'meros.loginRemember.v1'`. |
| URL → SDK baseURL | **코어에 있음** | `contexts/auth.tsx:79,174,289` · `contexts/settings.tsx:25` 4 소비처 모두 `new Medusa({ baseUrl: medusaUrl })`. |
| 앱 상수 자리 | **신규 필요** | `constants/` 에 brand/Colors/countries/provinces 만 · API URL 상수 부재. `app.json extra` 에도 없음. `constants/api.ts` 신설 권장. |
| 마이그레이션 로직 | **신규 필요** | `contexts/auth.tsx:159-256` `loadAuthState` 초입에 분기 삽입 (저장 URL ≠ 고정 상수면 apiKey + 종속 상태 atomic clear → 재로그인 유도). |
| 세션/토큰 URL-coupling 위험 | **신규 필요 (flag)** | `contexts/auth.tsx:104` apiKey flat key · userEmail · sales_channel_id · stock_location_id · region_id · draft_order_id 전부 flat. URL 변경 시 old apiKey 로 401. 마이그레이션에서 atomic clear 필수. |

**요구 2 종합**: UI 1곳 + SecureStore 1 key + SDK baseUrl 4 소비처. 위험 flag 1건.

### 요구 3 · 가게 선택 (fork + storeport)

| 서브 항목 | 분류 | 근거 (file:line) |
|---------|------|---|
| "가게" 코어 매핑 | **코어에 있음** | `apps/commerce-core/src/modules/register_session/models/register-session.ts:9` — stock_location_id = 매장 단위. |
| 현재 매장 결정 흐름 | **코어에 있음 (수기)** | `components/setup-wizard/StockLocationSelectionStep.tsx:24-46` — `sdk.admin.stockLocation.list()` 전체를 UI 리스트 (count=1 auto-select 없음). 흐름: `SetupWizardContent.tsx:30-106`. 저장: `contexts/settings.tsx:38-40`. 재진입: `app/index.tsx:19-39`. 재선택: `app/settings/stock-location.tsx:23-26`. |
| User → stock_location 권한 (서버) | **신규 필요** | `apps/commerce-core/src/modules/rbac/service.ts:10-14` empty. `apps/commerce-core/src/api/admin/register-sessions/route.ts:20-21` 쿼리필터 있으나 user-scope X. |
| `/admin/me/accessible-stock-locations` | **신규 필요 (지연)** | 부재. 1 매장 MVP 는 list count=1 auto-select 로 우회 가능. 다중 매장은 Phase Next. |
| 런타임 매장 switcher UI | **신규 필요 (지연)** | 없음. 재선택은 Settings 깊숙이. 1 매장 MVP 는 불필요. |

**요구 3 종합**: "1 매장 자동 선택" 는 wizard 분기 1곳. 다중 매장 RBAC 는 별건 (Phase Next).

---

### 라운드 분할 (PR 4개 제안)

| PR | 라운드 | 리포 | 주요 파일 | Kyu 실기 (도장) | 선행 |
|----|-------|------|---------|---------------|------|
| **A** (현재) | M0-1104-G | storeport | `docs/plans/M0-1104-G-plan.md` | 계획서 리뷰 · 라운드 분할 승인 · 로고/파비콘 asset 확정 | 없음 |
| **B** | M0-1104-H | storeport | `medusa-config.ts` · `src/admin/widgets/meros-brand.tsx` · `src/admin/i18n/index.ts` · logo/favicon assets · 런북 | admin.meros.id "Welcome to Meros" · Meros 로고 + 파비콘 · 탭 "Meros Admin" | A 승인 |
| **C** | M0-1104-I | fork | `constants/api.ts` · `app/login.tsx` · `contexts/auth.tsx` · `contexts/settings.tsx` · `utils/loginRemember.ts` | Shop URL 칸 안 보임 · 기존 설치 (옛 URL) + clean install 둘 다 로그인 성공 · 옛 URL 자동 clear 로 1회 재로그인 | A 승인 |
| **D** | M0-1104-J | fork | `components/setup-wizard/StockLocationSelectionStep.tsx` · `SetupWizardContent.tsx` | 1 매장 계정 → setup wizard 매장 선택 자동 통과 (토스트 1회) | A 승인 · C 이후 |

**지연 (별건)**: M0-1104-K — 다중 매장 RBAC (Medusa User → stock_locations ACL + `GET /admin/me/accessible-stock-locations` + 앱 switcher UI). Phase Next · 트리거 "2+ 매장 계정" 요구.

**순서 근거**: A → (B · C 병렬) → D. B/C 는 교차 없음. D 는 C 후행 (auth 재진입 가드 변경 흡수).

**총 건드릴 파일** (B+C+D): storeport 7 · fork 8 = 15. 두 리포 교차 0.

---

### 위험 (3줄)

1. **옛 URL SecureStore 잔재** — 기존 사용자 `medusaUrl != api.meros.id` 저장 시 토큰 재사용 → 401. 마이그레이션에서 atomic clear + "서버 주소 변경으로 재로그인 필요합니다" 토스트 1회. `utils/loginRemember.ts` 기억 레코드 URL 필드 폐기도 필요.
2. **Medusa 로고/파비콘 override 가 공식 비노출** — `admin.vite` 콜백 의존 · Medusa v2 메이저 bump 시 API 깨질 위험 (추정). 런북에 "Medusa 업그레이드 시 asset path 재검증" 명시.
3. **다중 매장 계정 미지원** — "1 매장 auto-select" MVP 는 2+ 매장 계정 만나면 리스트 전체 노출 (ACL 없음 → 다른 매장 데이터 가시화 위험). 1 매장 MVP 전제 아래 안전 · 다중 매장 계정 생기기 전 M0-1104-K 필수.

---

## 2. 자기 검증 (실측 vs 추정)

### 실측 (직접 열어 확인 · file:line 3+ 인용 규약 충족)

- `apps/commerce-core/src/modules/register_session/models/register-session.ts:9` — "Q9 1 매장 MVP · stock_location_id 로 매장 식별"
- `apps/commerce-core/src/admin/i18n/index.ts` — `export default {}`
- `app/login.tsx:275-286` — `<TextField name="medusaUrl" placeholder="Shop URL" testID="loginShopUrl" />`
- `contexts/auth.tsx:102` — `SecureStore.setItemAsync('medusaUrl', medusaUrl)`
- `contexts/auth.tsx:164` — `const medusaUrl = await safeGetSecureItem('medusaUrl')`
- `contexts/auth.tsx:174` — `new Medusa({ baseUrl: medusaUrl, ... })` (reauth)

### 추정 (B/C/D 착수 시 각 라운드 첫 커밋에서 실측 승격)

- `node_modules/@medusajs/dashboard` 내 "Welcome to Medusa" 하드코딩 위치 (추정: `apps/dashboard/src/routes/login/login.tsx` 류 · DOM 탐색 or 번들 grep 필요)
- `admin-bundler` 의 `data-placeholder-favicon` 치환 실 수행 여부 (빌드 실행으로 검증)
- i18n 리소스 덮어쓰기로 문구 교체가 반영되는지 (런타임 확인)
- `app/login.tsx:74-96` zod + `/health` 검증 라인 정확 범위 (파일 전체 재조회)

---

## 3. 규약 정합

| 규약 | 상태 |
|------|------|
| 산출 = 계획서 1 파일 | ✓ (`storeport/docs/plans/M0-1104-G-plan.md`) |
| 코드 변경 0 (docs only) | ✓ |
| 항목별 "코어에 있음/우회/신규 필요" 대사표 + file:line | ✓ |
| 건드릴 파일 목록 (리포별·주인) | ✓ (15 파일 · 교차 0) |
| 라운드 분할 (PR 4개·순서·Kyu 실기) | ✓ |
| 위험 1~3줄 | ✓ (3 건) |
| 커밋 메시지 `!` 미사용 | ✓ |
| 자기 검증 (실측 file:line 3+ · 추정 구분) | ✓ (실측 6건 · 추정 4건) |

---

## 4. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | 0 (계획 게이트 · 실행 아님) |
| 등재 | +4 (M0-1104-H · M0-1104-I · M0-1104-J · M0-1104-K [지연]) |
| 미결 | 1 (plan-approved · Kyu 승인) |
| **총 순증감** | **+4 (등재) · -0 (해소)** |

---

## 5. 다음 게이트

1. **Kyu**: 계획서 리뷰 → 라운드 분할 (B·C·D) 승인 · 로고/파비콘 asset 확정 (M0-1103-C `3 Receipt` 재사용 가능 여부). "승인" 1어로 플랜 확정.
2. 승인 후: **M0-1104-H (storeport admin 리브랜딩)** · **M0-1104-I (fork Shop URL 제거)** 두 라운드 **병렬** 발의 가능 (파일 교차 0).
3. **M0-1104-J** (fork 자동 선택) 는 I 후행.
4. **M0-1104-K** (다중 매장 RBAC) 는 트리거 대기 ("2+ 매장 계정" 요구 시).

---

*M0-1104-G · 계획 게이트 · 코딩 0 · storeport PR #177 (docs/plans/M0-1104-G-plan.md) · 4 PR 분할 제안 · 실측 6건 · 추정 4건 · Kyu 승인 대기*
