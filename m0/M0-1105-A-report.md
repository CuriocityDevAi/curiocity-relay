---
round: M0-1105-A
pr:
  storeport: storeport#182
outcome: admin-brand-polish · 다크 wordmark 가시 복구 · 로고 최상단 배치 · 제목 "Admin Page" · Playwright 라이트·다크 2 스샷 PASS
kyu_checks: 1 (admin-brand-visible-themes · admin.meros.id 라이트·다크 2 테마에서 로고·중앙·제목·부제 4 항 확인)
---

# M0-1105-A · Admin 리브랜딩 핫픽스 (Kyu A2 실기 ✗ · 11-05)

**일자**: 2026-11-05 · **허브**: M0 · **대상**: `apps/commerce-core/src/admin/{widgets/meros-brand.tsx,assets/meros-logo.svg,i18n/index.ts}` + 스샷 2.

**선행**: M0-1104-H (#178) 배포 후 Kyu 실기 실패 (다크 테마 wordmark 안 보임 · 로고 중앙 어긋남 · 로고가 제목 아래).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | Wordmark 다크 테마 가시 (currentColor + CSS 변수 + inline SVG) | ✓ |
| 2 | 마크+워드마크 수평 중앙 정렬 (viewBox 트림 + CSS) | ✓ |
| 3 | 로고 → 제목 → 부제 순서 (DOM move + MutationObserver) | ✓ |
| 4 | 제목 "Welcome to Meros" → "Welcome to Meros Admin Page" (en·enGB·id·ko 전부) | ✓ |
| 5 | medusa-config.ts 손대지 말 것 (런타임 파일 읽기 금지 유지) | ✓ (변경 0) |
| 6 | 산출물 기동 BOOT OK + /health 200 (상시 ⓒ) | ✓ |
| 7 | Playwright 라이트·다크 2 테마 스샷 | ✓ |
| 8 | ADDENDUM §2 영어 (제목 전 lang 동일) | ✓ |

---

## 1. 뿌리 (왜 M0-1104-H 가 다크에서 실패했나)

M0-1104-H 는 wordmark fill 을 `currentColor` 로 바꾸고 CSS `color` 로 theme 분기할 계획이었으나, SVG 를 `<img src=meros-logo.svg>` 로 로드했다. SVG 가 `<img>` 로 로드되면 **격리 렌더링**되어 parent 문서의 CSS `color` 를 상속하지 않는다 → `currentColor` 가 SVG 내부 기본값 (black) 으로 떨어져서, 다크 테마 bg 가 어두워도 wordmark fill 이 ink 검정 고정 → 안 보임.

**해법**: inline SVG (React 트리에 직접 `<svg>` JSX 로) 로 교체. 이제 React 트리에 들어가므로 parent CSS color 상속 작동.

---

## 2. 변경 3 파일 (주인)

### 2-1. `apps/commerce-core/src/admin/assets/meros-logo.svg`
- Wordmark `<g>` fill `"#0E1B18"` → `"currentColor"` (amber receipt bg + M glyph 는 브랜드 고정)
- viewBox `"0 0 500 200"` → `"40 32 430 124"` (content 타이트 바운드 · 대칭 패딩)

### 2-2. `apps/commerce-core/src/admin/widgets/meros-brand.tsx` (full rewrite)
- `<img src=merosLogo>` → `MerosLogo` React 컴포넌트 (inline `<svg>` JSX · currentColor 상속 작동)
- CSS 변수 `--meros-brand-ink`: light `#0E1B18` · dark `#F2F4F1` · `html.dark` class 분기 (Medusa Tailwind `darkMode: "class"` 대응)
- **DOM move**: `findLoginOuter` + `outer.prepend(brand)` + `MutationObserver` 로 widget 을 outer (`max-w-[280px]`) 의 첫 자식으로 영구 배치 (CSS order 가 flex-container 경계 불가 해법)
- `document.title = "Meros Admin"` 유지 · unmount 시 복원
- 중앙 정렬: `display:block + margin:0 auto` on SVG · `width:180px`

### 2-3. `apps/commerce-core/src/admin/i18n/index.ts`
- `const merosWelcome = { title: "Welcome to Meros Admin Page" }` (en·enGB·id·ko 모두 동일)
- 이전 id/ko 현지어 제거 (ADDENDUM §2 영어 전용 재확인)

---

## 3. 검증

### 빌드
```
$ pnpm --filter commerce-core build
Backend  3.03s · Frontend 16.36s · PASS
```

### 산출물 기동 (상시 ⓒ · M0-1104-I)
```
$ cd apps/commerce-core/.medusa/server
$ NODE_ENV=production DATABASE_URL=... PORT=9997 npx medusa db:migrate
… Migration scripts completed
$ ... npx medusa start > /tmp/boot.log &
$ sleep 25 && grep -E "BOOT OK|Server is ready" /tmp/boot.log
SENTRY disabled · SENTRY_DSN not set (set in Railway Variables to enable)
BOOT OK unknown :9997
{"message":"Server is ready on port: 9997", ...}
$ curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9997/health
200
```

### Playwright 라이트·다크 2 테마 (brandColor + wordmarkColor 매칭 확인)
```json
{
  "light": {
    "heading": "Welcome to Meros Admin Page",
    "brandColor":    "rgb(14, 27, 24)",    // #0E1B18 brand-ink
    "wordmarkColor": "rgb(14, 27, 24)",    // SVG currentColor 상속 OK
    "logoRect": {"x": 510, "y": 233.25, "width": 180, "height": 51.9},
    "htmlDark": false
  },
  "dark": {
    "heading": "Welcome to Meros Admin Page",
    "brandColor":    "rgb(242, 244, 241)", // #F2F4F1 brand-cream
    "wordmarkColor": "rgb(242, 244, 241)", // wordmark 도 cream · 다크 bg 선명히 보임
    "logoRect": {"x": 510, "y": 233.25, "width": 180, "height": 51.9},
    "htmlDark": true
  }
}
```

- **wordmarkColor === brandColor** 양쪽 테마 매칭 → currentColor 상속 작동 확정 (M0-1104-H 실패 뿌리 해소).
- `logoRect.x = 510` · viewport 1200 중앙 ((1200-180)/2=510) ✓
- `logoRect.y = 233` · 이전 M0-1104-H 292 보다 59px 위 → Heading 보다 상단 ✓

### 스샷 (PR 본문 임베드)
- `docs/M0-1105-A-admin-brand-light.png`
- `docs/M0-1105-A-admin-brand-dark.png`

Layout 순서 확정: **LOGO** (M mark amber + MEROS wordmark · 중앙) → **"Welcome to Meros Admin Page"** heading → **"Sign in to access the account area"** subtitle → Email/Password form.

---

## 4. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 (widgets/meros-brand.tsx · assets/meros-logo.svg · i18n/index.ts) | ✓ |
| 금지 (medusa-config.ts 손대지 말 것 · 런타임 파일 읽기 금지 유지 · M0-1104-I) | ✓ (변경 0) |
| build PASS | ✓ |
| 산출물 기동 BOOT OK + ready + /health 200 (상시 ⓒ) | ✓ |
| Playwright 라이트·다크 2 테마 스샷 | ✓ (로고 글자 보임 · 중앙 · 제목 전부 PASS) |
| ADDENDUM §2 영어 전 lang 동일 | ✓ |
| naming-check PASS (admin 예외 유지) | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |
| 상시 ⓑ (package.json 변경 시 격리 frozen-lockfile) | **N/A** · package.json 미변경 |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (admin 다크 wordmark 가시 · 로고 상단 · 제목 문구 Kyu A2 실기 복구) |
| 등재 | 0 |
| 미결 | 1 (admin-brand-visible-themes · Kyu 재검증 대기) |
| **총 순증감** | **-0 → Kyu 도장 시 -1** |

---

## 6. 다음 게이트

1. **Kyu**: PR #182 머지 → admin.meros.id 자동 재배포 → 시크릿 창 + OS 다크 모드 토글 → 2 테마 모두 4 항 확인 (로고 상단·중앙·글자 보임 · 제목 "Admin Page" · 부제 Sign in · 파비콘/탭 유지) → `admin-brand-visible-themes` PASS.
2. 별건: M0-1104-J-b (POS 결제 API 실구현) · M0-1104-J-c (Xendit) 발의 가능.

---

*M0-1105-A · 2026-11-05 · 핫픽스 3건 (currentColor inline SVG · DOM move · title) · 주인 3 파일 · medusa-config 변경 0 · Playwright 2 테마 PASS · storeport PR #182 · Kyu 재검증 대기*
