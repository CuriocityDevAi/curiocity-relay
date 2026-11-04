---
round: M0-1104-H
pr:
  storeport: storeport#178
outcome: admin-rebranding-landed · "Welcome to Meros" · Meros 로고·파비콘·탭 제목 · Playwright 4건 PASS
kyu_checks: 1 (admin-brand-visible · admin.meros.id 시크릿 창 4건 확인)
---

# M0-1104-H · Admin 리브랜딩 (Meros)

**일자**: 2026-11-04 · **허브**: M0 · **대상**: `admin.meros.id` · Medusa v2.17.2 admin · deployed from `apps/commerce-core/.medusa/server/public/admin/`.

**선행**: M0-1104-G 계획 B 승인 (오케 2026-11-04).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | G 추정 3건 (admin 관련) 첫 커밋에서 실측 승격 | ✓ |
| 2 | "Welcome to Medusa" → "Welcome to Meros" | ✓ (i18n override · en·enGB·id·ko) |
| 3 | 로고 = Meros 3A 풀 (M+MEROS · fork `assets/brand` 재사용) | ✓ (login.before 위젯 · CSS order 로 Heading 위) |
| 4 | 파비콘 = 3A 영수증 마크 단독 | ✓ (admin.vite transformIndexHtml + base64 SVG data URI) |
| 5 | 브라우저 탭 = "Meros Admin" | ✓ (transformIndexHtml `<title>` 주입 · idempotent) |
| 6 | Playwright 자동 4건 스샷 | ✓ (`docs/M0-1104-H-admin-brand.png`) |
| 7 | `docs/runbooks/admin-branding.md` + Medusa 업그레이드 재검증 1절 | ✓ (4건 재검증 절차 명시) |
| 8 | 상시 ⓑ (package.json 변경 시 격리 frozen-lockfile) | **N/A** · package.json 미변경 |

---

## 1. 실측 승격 (G 추정 3건)

### 1-1. "Welcome to Medusa" 하드코딩 위치
- **추정 → 실측**: 하드코딩 **아님** · dashboard **i18n 키** (`login.title` · `invite.title`).
- **근거**:
  - `node_modules/.pnpm/@medusajs+dashboard@2.17.2_.../src/i18n/translations/en.json:3215` (`login.title`) · `3233` (`invite.title`)
  - 동일 구조 `enGB.json:2947`, `id.json`, `ko.json` 포함 25+ lang 전부
  - 렌더링: `.../src/routes/login/login.tsx:116` `<Heading>{t("login.title")}</Heading>`
- **해소**: i18n override (`src/admin/i18n/index.ts` · en·enGB·id·ko).

### 1-2. 파비콘 `data-placeholder-favicon` bundler 자동 치환 여부
- **추정 → 실측**: 자동 치환 **부재** · 마커만 삽입.
- **근거**:
  - `node_modules/.pnpm/@medusajs+admin-bundler@2.17.2_.../dist/index.js:1284` — HTML 템플릿에 `<link rel="icon" href="data:," data-placeholder-favicon />` 삽입만 수행
  - grep `replacePlaceholderFavicon` / `placeholderFavicon` / `setFavicon` = 0 hit
- **해소**: `admin.vite` 커스텀 플러그인 `merosBrandVitePlugin.transformIndexHtml` 로 base64 SVG data URI 치환 + `<title>Meros Admin</title>` 주입 (idempotent).

### 1-3. i18n 덮어쓰기 공식 반영 경로
- **추정 → 실측**: 공식 경로 작동.
- **근거**:
  - `node_modules/.pnpm/@medusajs+admin-vite-plugin@2.17.2_.../dist/index.mjs:1097` — `crawl(\`${source}/i18n\`, "index", { min: 0, max: 0 })`
  - 1112-1125 — `import i18nTranslationsN` + `deepMerge(i18nTranslations0, i18nTranslations1, ...)`
  - 2039-2047 — 가상 모듈 `{ resources: ${mergeCode} }` export
  - `.../src/dashboard-app/dashboard-app.tsx:428-432` — `resources = deepMerge(coreTranslations, plugin.i18nModule?.resources)`
- **해소**: `src/admin/i18n/index.ts` default export 구조 `{ en: { translation: { login: {...}, invite: {...} } }, ... }` 로 공식 병합.

---

## 2. 산출물 (storeport PR #178 · 10 파일 변경)

| 파일 | 변경 | 분류 |
|------|------|------|
| `apps/commerce-core/medusa-config.ts` | `admin.vite` 콜백 + `merosBrandVitePlugin` 추가 | 주인 (계획 B) |
| `apps/commerce-core/src/admin/widgets/meros-brand.tsx` (신규) | `login.before` 위젯 · 로고·title·CSS 숨김/order | 주인 (계획 B) |
| `apps/commerce-core/src/admin/i18n/index.ts` | en/enGB/id/ko login·invite.title override | 주인 (계획 B) |
| `apps/commerce-core/src/admin/assets/meros-logo.svg` (신규) | 풀 로고 (fork 재사용) | 주인 (계획 B) |
| `apps/commerce-core/src/admin/assets/meros-favicon.svg` (신규) | 3A 영수증 마크 (fork 재사용 · 647 B) | 주인 (계획 B) |
| `docs/runbooks/admin-branding.md` (신규) | 구성·체크리스트·**Medusa 업그레이드 4건 재검증 절차** | 주인 (계획 B) |
| `docs/feature-map.yaml` | `docs-plans` 에 `M0-*-admin-*.png` 패턴 추가 | 비주인 (CI infra) |
| `docs/M0-1104-H-admin-brand.png` (신규) | Playwright 캡쳐 (self-verification) | 비주인 (검증 증빙) |
| `scripts/naming-check.sh` | admin 예외 로직 (admin/ + medusa-config.ts 제외) | 비주인 (규약 1회 손질 · Kyu "A") |
| `CLAUDE.md` §0 | "예외 (M0-1104-H · Kyu 2026-11-04 승인 · A)" 추가 | 비주인 (규약 1회 손질 · Kyu "A") |

---

## 3. 규약 1회 손질 (Kyu 승인 "A")

**배경**: pre-commit `scripts/naming-check.sh` 는 `apps/`/`packages/` 에서 "meros" 단어 매치를 fail. 이번 라운드가 admin UI 에 명시적으로 "Meros" 를 노출 → 두 요구 상충. Kyu 중간 응답 "A" (규약 범위 좁히기).

**예외 범위** (UI 텍스트·asset 한정):
- `apps/commerce-core/src/admin/**` (widgets · i18n · assets)
- `apps/commerce-core/medusa-config.ts` 의 admin 블록 (`merosBrandVitePlugin` 식별자)

**불변 규약**: 모듈/플랫폼/디렉토리 네이밍 (storeport · commerce-core · anchor · wing · care-agent) 규약은 변동 없음. 다른 admin 외 소스에 "meros" 노출은 여전히 금지.

---

## 4. 검증

### 빌드
```
$ pnpm --filter commerce-core build
Backend  3.73s · Frontend 15.22s · PASS · exit 0
```

### Playwright 4건 자동 (headless chromium)
```json
{
  "title": "Meros Admin",
  "faviconHref": "data:image/svg+xml;base64,PD94bWw...",
  "faviconIsSvgDataUri": true,
  "headingText": "Welcome to Meros",
  "merosLogoRendered": true,
  "merosLogoAlt": "Meros"
}
```
4건 전부 PASS. 스샷: `docs/M0-1104-H-admin-brand.png`.

### 격리 검증 환경
```
cd apps/commerce-core/.medusa/server/public && ln -sfn admin app
python3 -m http.server 9999 --bind 127.0.0.1 &
# Playwright node 스크립트로 http://127.0.0.1:9999/app/ 열기 → 4 assertion
```

### CI
| 체크 | 결과 |
|------|------|
| naming-check (pre-commit) | ✓ PASS (meros 매치 0 · admin 예외 적용) |
| feature-map-check | ✓ PASS (697/697 matched) |
| build | ✓ PASS |
| markers-and-forbidden (Anchor Tauri 잔재) | pre-existing fail on main (PR 무관) |

---

## 5. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 (계획 B · medusa-config · widgets · i18n · assets · 런북) | ✓ |
| `node_modules` 수정 금지 (패치 패키지 금지) | ✓ |
| G 추정 3건 실측 승격 (PR 본문 명시) | ✓ (3/3) |
| 빌드 PASS | ✓ |
| feature-map 697/697 matched | ✓ |
| naming-check PASS (meros 매치 0 · admin 예외) | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |
| Playwright 4건 자동 + 스샷 | ✓ |
| 런북 · Medusa 업그레이드 재검증 1절 | ✓ |
| 상시 ⓑ (package.json 변경 시 격리 frozen-lockfile) | **N/A** · package.json 미변경 |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +2 (admin 리브랜딩 착지 · G 추정 3건 실측 승격) |
| 등재 | +1 (admin-brand-visible kyu_checks 신설) |
| 미결 | 1 (admin-brand-visible · Kyu admin.meros.id 시크릿 창 4건 확인 대기) |
| **총 순증감** | **-1** |

---

## 7. 다음 게이트

1. **Kyu**: PR #178 머지 → admin.meros.id 자동 재배포 → 시크릿 창 열어 4건 확인 (탭 · 파비콘 · 문구 · 로고) → kyu_checks `admin-brand-visible` PASS.
2. **병렬**: **M0-1104-I** (fork Shop URL 제거 · G 계획 C) 발의 가능 (파일 교차 0).
3. **후행**: **M0-1104-J** (fork 1 매장 auto-select · G 계획 D).
4. **지연**: **M0-1104-K** (다중 매장 RBAC · 트리거 "2+ 매장 계정").

---

*M0-1104-H · 2026-11-04 · admin 리브랜딩 착지 · G 추정 3건 실측 승격 · Playwright 4건 자동 PASS · 규약 1회 손질 (Kyu "A") · storeport PR #178 · 이연 -1 (Kyu 도장 대기)*
