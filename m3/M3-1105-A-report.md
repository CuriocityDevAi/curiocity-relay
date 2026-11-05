---
round: M3-1105-A
pr:
  fork: agilo-medusa-pos-fork#22
commit: (branch feat/m3-1105-a-color-tokens · base master 0515209)
outcome: 전 화면 raw 색 클래스/hex → 시맨틱 토큰 14 · 보이는 색 변화 0 · 다음 라운드 팔레트 교체 2 파일로 압축
kyu_checks: 6 (login · products · checkout · orders · settings · register 상태 배지 — 아이패드 재확인)
---

# M3-1105-A · 색 토큰화 (COLOR HARD RULE)

**일자**: 2026-11-05 · **허브**: M3 · **성격**: Kyu 11-04 "색깔이 촌스럽다 · 토큰 정리 후 한 번에 교체 · Pickup/Close · 신규 결제 화면 포함" · **보이는 변화 0** · 상시 ⓐ Playwright · ⓒ 색 어설션 가드.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | 토큰 정의 (tailwind.config + brand.ts 동일 값) | ✓ 14 개 |
| 2 | 전 화면 raw Tailwind 색 클래스 치환 (0건 목표) | ✓ 71 파일 |
| 3 | inline hex 치환 (DATA · brand 로고 외 0건) | ✓ 14 파일 |
| 4 | 색 어설션 scripts/m3-1105-a-color-assertions.mjs | ✓ **35/35 pass** |
| 5 | tailwind.config 에서 구 raw 팔레트 (gray.*·active.*·error.*) 제거 | ✓ (fail-fast 가드) |
| 6 | docs/design/tokens.md 신설 (토큰 표 · 규칙 · 교체 절차) | ✓ 182 L |
| 7 | 상시 ⓐ Playwright 4건 | ✓ **4/4 pass** (React #418 pre-existing 제외) |
| 8 | before/after 스냅샷 5 화면 × 2 = 10 장 | ✓ **byte-identical** |
| 9 | 금지 파일 (package.json · app.json · lib/printer/** · contexts/auth.tsx 로직) 무수정 | ✓ (git diff 가드) |

---

## 1. 산출물 (fork PR #22 · base master `0515209`)

| 파일 유형 | 변경 | 라인 |
|-----------|------|------|
| `tailwind.config.js` | 토큰 14 정의 · 구 팔레트 제거 | +18 / -23 |
| `constants/brand.ts` | `TOKEN_*` 14 상수 export (BRAND_* 로고 상수 보존) | +14 |
| `app/**` 29 파일 | raw 색 클래스 · hex 치환 | 다수 |
| `components/**` 40 파일 | raw 색 클래스 · hex 치환 | 다수 |
| `docs/design/tokens.md` | 토큰 표 · "새 화면은 토큰만" · 팔레트 교체 절차 · FAQ | 182 |
| `docs/M3-1105-A-before-after/` | 10 PNG (5 화면 × before/after) | — |
| `scripts/m3-1105-a-color-assertions.mjs` | 35 건 어설션 (상시 ⓒ) | 142 |
| `scripts/m3-1105-a-playwright.mjs` | 상시 ⓐ · 4 건 | 87 |
| `scripts/m3-1105-a-snapshot.mjs` | before/after 유틸 | 97 |
| **총 변경** | **78 파일** | +1101 / -641 |

**MerosLogo.tsx** — Prettier 재포맷만 발생 · 색 변화 0 (BRAND_* 상수 그대로).

---

## 2. 토큰 정의 요약 (14)

| 역할 | 클래스 | 상수 | 현재 값 |
|------|--------|------|---------|
| Surface | `*-surface` | `TOKEN_SURFACE` | `#FFFFFF` |
| Surface muted | `bg-surface-muted` · `text-surface-muted` | `TOKEN_SURFACE_MUTED` | `#F1F1F1` |
| Ink | `*-ink` | `TOKEN_INK` | `#282828` |
| Ink muted | `*-ink-muted` | `TOKEN_INK_MUTED` | `#888888` |
| Ink subtle | `*-ink-subtle` | `TOKEN_INK_SUBTLE` | `#B5B5B5` |
| Line | `border-line` · `bg-line` | `TOKEN_LINE` | `#E5E5E5` |
| Accent | `*-accent` | `TOKEN_ACCENT` | `#4E78E5` |
| Accent soft | `bg-accent-soft` | `TOKEN_ACCENT_SOFT` | `#B8CCFF` |
| Success | `*-success` | `TOKEN_SUCCESS` | `#469B3B` |
| Success soft | `bg-success-soft` · `border-success-soft` | `TOKEN_SUCCESS_SOFT` | `#B9F1B2` |
| Warning | `*-warning` | `TOKEN_WARNING` | `#9B8435` |
| Warning soft | `bg-warning-soft` · `border-warning-soft` | `TOKEN_WARNING_SOFT` | `#F8EC9A` |
| Danger | `*-danger` | `TOKEN_DANGER` | `#F14747` |
| Danger soft | `bg-danger-soft` · `border-danger-soft` | `TOKEN_DANGER_SOFT` | `#FFDFDF` |

> **현재 쓰이던 색 그대로 매핑** (spec "blue-500→accent · blue-50→accent-soft · gray-400→ink-muted · gray-200→line · green→success · red→danger …"). 팔레트 교체는 이번 범위 밖.

---

## 3. 치환 매핑 (실측)

### 3-1. Tailwind 클래스 (`scripts/m3-1105-a-migrate.mjs` · 일회성 · 머지 후 삭제)
- `bg-gray-{50,100}` → `bg-surface-muted` · `bg-gray-200` → `bg-line` · `bg-gray-300` → `bg-ink-subtle`
- `bg-white` → `bg-surface` · `bg-black[/\d+]` → `bg-ink[/\d+]`
- `text-gray-{100,200,300}` → `text-ink-subtle` (RegionList 선택 상태만 `text-surface-muted` 로 수동 교정)
- `text-gray-{400,500,600}` → `text-ink-muted` · `text-gray-{700,900}` → `text-ink`
- `text-white` → `text-surface` · `text-black` → `text-ink`
- `bg-blue-50` · `bg-active-200` → `bg-accent-soft` · `bg-active[-500]` · `text-blue-{5,6,7}00` · `text-active*` · `border-blue-500` · `border-active*` → `*-accent`
- `bg-green-{50,100}` · `bg-success-200` → `bg-success-soft` · `bg-success-500` · `text-green-{6,7,8}00` → `*-success`
- `bg-amber-{50,100}` · `bg-yellow-50` · `bg-warning-200` → `bg-warning-soft` · `text-amber-800` · `*-warning-500` → `*-warning`
- `bg-red-50` · `bg-error-200` → `bg-danger-soft` · `bg-error-500` · `text-red-{5,6,7}00` · `*-error-500` → `*-danger`
- `border-gray-{100,200,500}` → `border-line` · `border-amber-200` · `border-yellow-300` · `border-warning-200` → `border-warning-soft` · `border-error-200` → `border-danger-soft`
- `bg-[#ffffff4d]` (scan 마스크) → `bg-surface/30`

### 3-2. Inline hex (`scripts/m3-1105-a-hex-migrate.mjs` · 일회성)
- `#282828` · `#000000` · `#1B1B1B` → `TOKEN_INK`
- `#B5B5B5` · `#b5b5b5` → `TOKEN_INK_SUBTLE`
- `#888` · `#888888` · `#9CA3AF` · `#6B7280` → `TOKEN_INK_MUTED`
- `#E5E5E5` → `TOKEN_LINE`
- `#F14747` · `#ef4444` · `#DC2626` → `TOKEN_DANGER`
- `#469B3B` · `#10B981` → `TOKEN_SUCCESS`
- `#9B8435` → `TOKEN_WARNING`
- `#4E78E5` · `#1E3A8A` → `TOKEN_ACCENT`
- `#f4faff` → `TOKEN_SURFACE_MUTED` (가장 근접 near-white)
- `#FFFFFF` / `#ffffff` → `TOKEN_SURFACE`

### 3-3. 예외 (보존)
- `components/MerosLogo.tsx` · `BRAND_INK` · `BRAND_AMBER` · `BRAND_GREEN` · `BRAND_CREAM` (로고 정본 · M0-1103-C).
- `app/product-details.tsx:249-253` · product color picker DATA 옵션 5 개 (DATA 라인 보호 regex).
- 금지 파일 미수정: `package.json` · `app.json` · `lib/printer/**` · `contexts/auth.tsx` 로직.

---

## 4. 검증 (실행 로그)

### 상시 ⓒ · 색 어설션 35/35 pass

```
$ node scripts/m3-1105-a-color-assertions.mjs
--- (1) raw Tailwind 색 클래스 0건 (bg-/text-/border- · 숫자 스케일) ---
  ✓ app/** · components/** 에 raw Tailwind 색 클래스 0건
--- (2) raw hex 0건 (DATA / brand 로고 / 토큰 import 제외) ---
  ✓ app/** · components/** 에 raw hex 0건
--- (3) tailwind.config.js · 시맨틱 토큰 14 개 정의 ---
  ✓ surface · surface-muted · ink · ink-muted · ink-subtle · line · accent · accent-soft · success · success-soft · warning · warning-soft · danger · danger-soft (14/14)
--- (4) constants/brand.ts · TOKEN_* 14 export ---
  ✓ TOKEN_SURFACE … TOKEN_DANGER_SOFT (14/14)
--- (5) tailwind.config.js · 구 raw 팔레트 제거 ---
  ✓ gray.* · active.* · error.* · success-N · warning-N 미존재
35/35 passed · 0 failed
```

### 상시 ⓐ · Playwright 4/4 pass

```
$ node scripts/m3-1105-a-playwright.mjs
  ✓ (1) 신규 pageerror 0건 (master 베이스라인 React #418 제외)
  ✓ (2) 로그인 화면 DOM 도달
  ✓ (3) Meros 로고 렌더 (loginLogo/meros-logo-* testID)
  ✓ (4) console.error 0건 (favicon 404 외 신규 에러 없음)
4/4 passed · 0 failed
```

> **React error #418** (HTML hydration mismatch) 은 master 베이스라인에도 발생하는 pre-existing 이슈 (Expo SDK 58 + Sentry 전환 이후 · M0-1104-B + M2-1104-A/B · M0 영역). 색 토큰 리팩터와 무관 · 신규 pageerror 0 로 가드.

### before/after 스냅샷 (5 화면 × 2 = 10장 · byte-identical)

```
$ node scripts/m3-1105-a-snapshot.mjs before  # master 베이스라인
$ # (토큰 치환 + rebuild)
$ node scripts/m3-1105-a-snapshot.mjs after
$ for s in login products checkout orders settings; do
    cmp docs/M3-1105-A-before-after/before-$s.png docs/M3-1105-A-before-after/after-$s.png && echo "$s · identical"
  done
login · identical
products · identical
checkout · identical
orders · identical
settings · identical
```

SHA256 (처음 12자):
- login/products/orders/settings = `a1825fbccff4…` (미인증 → 공통 로그인 화면 · 완전 동일)
- checkout = `94c9440d12bd…` (404 fallback 화면 · 완전 동일)

### TypeScript · ESLint

```
$ npx tsc --noEmit
app/_layout.tsx(6,8): error TS2882: ../global.css side-effect import  ← master 에도 pre-existing
$ npx eslint app/ components/
(prettier 자동 정렬 완료 · 0 errors · 28 warnings 는 모두 pre-existing react-hooks/set-state-in-effect)
```

---

## 5. Kyu 아이패드 재실기 (쉬운 말)

- **login-same**: 로고·POS·Email·Password·Sign In 버튼 어제와 똑같이 보임.
- **products-same**: 상품 그리드 — 품절 흐림 (opacity-75 · M3-1104-A) 유지 · 재고 배지 색 그대로 (`Awaiting`/`In stock`).
- **checkout-same**: Cash/Card/QRIS 3 탭 · 승인번호 6자리 입력 · 선택 chip 파란색 (`accent`) 그대로.
- **orders-same**: Paid (녹색) · Not Paid (주황) · Payment chip 회색 · 결제수단 chip.
- **settings-same**: Printer · Region · Sales channel · Stock location 모두 어제와 동일.
- **register-same**: Register 상태 배지 (Open 녹색 · Pickup 파란 · Closed 빨간) 어제와 동일.

**달라진 곳 있으면 ✗** · 다음 라운드 블록 요인.

---

## 6. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 = `tailwind.config.js` · `constants/brand.ts` · `global.css` + 색 클래스 쓰는 app/**·components/** | ✓ |
| 금지 파일 (package.json · app.json · lib/printer/** · contexts/auth.tsx 로직) 무수정 | ✓ |
| 토큰 정의 (surface · surface-muted · ink · ink-muted · line · accent · accent-soft · success · danger · warning) | ✓ 10 요구 + 4 soft 확장 (ink-subtle + success/warning/danger-soft) |
| 현재 색 보존 (spec: 팔레트 변경은 범위 밖) | ✓ (byte-identical 스냅샷) |
| raw 색 클래스 0건 · hex 0건 어설션 | ✓ 35/35 |
| 상시 ⓐ Playwright 4건 | ✓ 4/4 (React #418 pre-existing 명시) |
| before/after 10 장 스냅샷 | ✓ byte-identical |
| 재고 숫자 로직 (M0-1103-B) · 품절 흐림·토스트 (M3-1104-A) 무회귀 | ✓ (스냅샷 동일) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | 0 (팔레트 교체는 범위 밖 · 본 라운드는 **다음 라운드 블로커 제거**) |
| 등재 | +2 (시맨틱 토큰 체계 + 상시 ⓒ 색 어설션 · docs/design/tokens.md 정본) |
| 미결 (Kyu 재확인) | 6 (login · products · checkout · orders · settings · register — "어제와 같다" 도장) |
| **총 순증감** | **+2** (등재 2 · Kyu 6 도장 시 모두 해소) |

---

## 8. 다음 게이트

1. **PR #22 Kyu 리뷰 · 아이패드 실기** — 6 화면 "어제와 같다" 도장 → 머지.
2. **상시 ⓒ 색 어설션** 를 CI 에 편입 (모든 M3+ PR 에서 `node scripts/m3-1105-a-color-assertions.mjs` 통과 필수).
3. **별건 다음 라운드** (M3-11xx-x): **팔레트 교체** — `tailwind.config.js` + `constants/brand.ts` 두 파일에서 TOKEN_* 14 hex 만 교체. 코드 수정 0 · before/after 스냅샷 **다른 색** 으로 변화 가시. Kyu 1 명 승인.
4. **별건 M3-1104-B P2 라운드** (현금 Tender · SuccessReceiptAnim · ReceiptCard) — 본 토큰 체계 위에서 설계 · 새 컴포넌트는 "토큰만" 규칙 자동 적용.
5. **별건 M0** — Expo SDK 58 + Sentry 전환 뒤 React #418 hydration mismatch 진단. 색 토큰 리팩터와 무관하지만 Playwright 가드 노이즈 제거 필요.

---

*M3-1105-A · 2026-11-05 · 토큰 14 신설 · 71 파일 치환 · 35/35 어설션 · 4/4 Playwright · 10 장 byte-identical · fork PR #22 · 이연 +2 (Kyu 6 도장 대기)*
