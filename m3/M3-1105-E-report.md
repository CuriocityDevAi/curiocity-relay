---
round: M3-1105-E
pr:
  fork: agilo-medusa-pos-fork#33
commit: (branch chore/m3-1105-e-tokens-polish · base master 6cd6234)
outcome: ink 토큰 값 상향 (#0E1B18) · ink-disabled 토큰 신설 · product-details qty 복원 · m3-1105-b 하네스 주석 정리
kyu_checks: 4 (활성 버튼 더 진한 검정 · 비활성 더 연함 · variant 전환 시 qty 1 복원 · 기존 흐름 무회귀)
---

# M3-1105-E · ink 톤 상향 + ink-disabled 토큰 + qty 복원

**일자**: 2026-11-06 · **허브**: M3 · **성격**: 3 라운드 관찰 (R0-1105-C/R0-1105-G/M1-1105-D) 수렴 · 토큰·시각 디테일 polish · 상시 ⓐⓒⓓ.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | `ink-disabled` 토큰 신설 (tailwind + brand.ts) | ✓ `#C8C8C8` · `TOKEN_INK_DISABLED` |
| 2 | 비활성 4곳 적용 (BaseSelectField · SelectField · MultiSelectField · Button) | ✓ (text + icon + Loader) |
| 3 | 활성 solid 버튼 bg 를 brand-ink 수준 `#0E1B18` 으로 — 토큰 값만 조정 | ✓ (`ink: '#282828' → '#0E1B18'`) |
| 4 | product-details 품절→재고 variant 전환 시 qty 0 → 1 복원 (1줄) | ✓ |
| 5 | `m3-1105-b-playwright.mjs` 공용 하네스화 + PR 본문 polyfill 치환 지시 제거 | ✓ (주석 갱신 · polyfill 불필요 명시) |
| 6 | 색 어설션 갱신 (14 → 15 토큰) | ✓ **37/37 pass** |
| 7 | Playwright 재실행 | ✓ **24/24 pass** (폴리필 치환 없이) |
| 8 | before/after 스냅샷 (이번엔 버튼 색 달라야 함) | ✓ 10장 byte-differ |
| 9 | 금지 파일 (app/checkout/** · components/payment/** #31) 무수정 | ✓ |

---

## 1. 산출물 (fork PR #33 · base master `6cd6234`)

| 파일 | 변경 | 라인 |
|------|------|------|
| `tailwind.config.js` | `ink` 값 · 신규 `'ink-disabled'` | +4 / -2 |
| `constants/brand.ts` | `TOKEN_INK` 값 · 신규 `TOKEN_INK_DISABLED` | +4 / -1 |
| `components/ui/Button.tsx` | disabled text + Loader color → ink-disabled | +3 / -2 |
| `components/form/BaseSelectField.tsx` | isDisabled placeholder/ChevronDown → ink-disabled | +4 / -2 |
| `components/form/SelectField.tsx` | placeholder vs disabled 분리 | +3 / -1 |
| `components/form/MultiSelectField.tsx` | isDisabled 레이블/아이콘 → ink-disabled | +4 / -4 (replace_all) |
| `app/product-details.tsx` | +1줄 — in-stock 복귀 시 qty 0 → 1 | +2 / -0 |
| `docs/design/tokens.md` | 토큰표 15행 · ink 값 · ink-disabled 신규 | +4 / -3 |
| `scripts/m3-1105-a-color-assertions.mjs` | 14 → 15 토큰 가드 | +4 / -2 |
| `scripts/m3-1105-b-playwright.mjs` | 상단 주석 — polyfill 불필요 | +3 / -1 |
| `scripts/m3-1105-e-snapshot.mjs` | **신규** before/after 유틸 (동적 라우트 폴백) | 103 |
| `docs/M3-1105-B-detail-*.png` | 색 변화 반영 재생성 (4장) | — |
| `docs/M3-1105-E-before-after/*.png` | **신규** 10장 (5 화면 × before/after) | — |

**총 13 파일 · 코드 +138 / -18** (+ 스냅샷 14장).

---

## 2. 결정 요지

### 2-1. 왜 ink = `#0E1B18` (brand-ink 수준)
- M1-1105-D §3-① 관찰: 활성 솔리드 버튼 `#282828` 이 **회색처럼 보임** · Kyu iPad.
- `brand.ink = #0E1B18` (Meros 로고 정본) 과 동일 수준으로 상향 → **"검정에 더 가까운 톤"**.
- **"브랜드 토큰은 로고 전용"** 규약은 유지 — 앱 UI 에선 **시맨틱 토큰 `ink`** 를 그대로 사용하되 값을 brand-ink 수준으로 **맞춤**.

### 2-2. 왜 ink-disabled = `#C8C8C8` (별도 토큰)
- R0-1105-C: 기존 disabled 는 `text-ink-subtle` (`#B5B5B5`) 재사용 → placeholder (`#B5B5B5`) 와 **같은 톤** → "비활성 단서 상실".
- 신규 ink-disabled = `#C8C8C8` (더 연함) → **placeholder 보다 명확히 더 흐림** · "눌러도 안 됨" 인지 확보.
- 4곳 일괄 적용 (`Button` · `BaseSelectField` · `SelectField` · `MultiSelectField`).

### 2-3. 왜 qty 복원 1줄 (R0-1105-G)
- M3-1105-B useEffect 가 품절 variant 에서 수량 0 고정. 사용자가 **재고 있는 variant 로 전환** 시 수량 0 잔존 → Add to cart 비활성 (0 이면 담을 수 없음).
- 1줄 추가: `if (quantity === 0) setQuantity(1)` — in-stock 복귀 시 자동 복원.
- 기존 로직 (sold-out 0 고정 · stockMax 상한 클램프) 무회귀.

### 2-4. 왜 하네스 주석만 갱신 (추출 안 함)
- 스펙: "`_harness.mjs` 만드는 중이면 그걸 import · 아니면 m1-1105-b 패턴".
- 조사: `_harness.mjs` 없음 (M2-1105-F 브랜치도 없음).
- 결정: **m3-1105-b-playwright.mjs 는 이미 m1-1105-b 패턴 복제**. 상단 주석만 갱신 (lib/secure-storage master 머지 뒤 폴리필 불필요 명시).
- 후속: M2-1105-F 라운드가 `_harness.mjs` 추출하면 본 스크립트 import 로 전환 (별건 patch).

---

## 3. 검증 (실행 로그)

### 상시 ⓒ 색 어설션 **37/37** (35 → 37)

```
$ node scripts/m3-1105-a-color-assertions.mjs
--- (3) tailwind.config.js · 시맨틱 토큰 15 개 정의 ---
  ✓ surface · surface-muted · ink · ink-muted · ink-subtle · ink-disabled · line
  ✓ accent · accent-soft · success · success-soft · warning · warning-soft · danger · danger-soft
--- (4) constants/brand.ts · TOKEN_* 15 export ---
  ✓ TOKEN_SURFACE … TOKEN_INK_DISABLED … TOKEN_DANGER_SOFT

37/37 passed · 0 failed
```

### 상시 ⓐ Playwright **24/24** (폴리필 치환 없이)

```
$ node scripts/m3-1105-b-playwright.mjs
--- (3) 시나리오 4개 · 각 5 어설션 ---  ✓ 20건
--- (4) 에러 수집 ---                   ✓ 신규 console.error 0 · pageerror 0

24/24 passed · 0 failed
```

### before/after 스냅샷 (10장 · byte-differ)

```
login       before=a1825fbccff4  after=a4f588634f6f  DIFFER
products    before=a1825fbccff4  after=a4f588634f6f  DIFFER
checkout    before=a1825fbccff4  after=a4f588634f6f  DIFFER
orders      before=a1825fbccff4  after=a4f588634f6f  DIFFER
settings    before=a1825fbccff4  after=a4f588634f6f  DIFFER
```

- 미인증 상태 보호 라우트가 공통 로그인 화면으로 가드 → 다수 SHA 일치.
- **육안 변화 포인트**: Sign In 버튼 (비활성 상태) 의 text 색이 **더 연함** — ink-subtle `#B5B5B5` → ink-disabled `#C8C8C8`.
- **활성 solid 버튼 bg** `#282828 → #0E1B18` 변화는 로그인 전 화면에서 가시 X — **Kyu 아이패드 실기** 에서 Pay / Complete order 솔리드 버튼의 더 진한 검정 확인.

### TypeScript · ESLint
```
$ npx tsc --noEmit   → 신규 에러 0 (global.css TS2882 pre-existing)
$ npx eslint ...     → 0 errors
```

---

## 4. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 = tailwind + brand.ts + 폼 3 + Button + product-details (1줄) + playwright 스크립트 + docs | ✓ |
| 금지 파일 (app/checkout/** · components/payment/** — #31) 무수정 | ✓ |
| 색 토큰만 (상시 ⓒ) | ✓ 37/37 유지 |
| 영어 전용 (상시 ⓓ) | ✓ (신규 코드 없음 · 기존 영어 유지) |
| 상시 ⓐ Playwright (폴리필 불필요) | ✓ 24/24 |
| before/after 스냅샷 (버튼 색 다름) | ✓ 10장 byte-differ |
| 재고 숫자 로직 (M0-1103-B) · 품절 가드 (M3-1105-B) 무회귀 | ✓ (playwright 24/24) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +3 (R0-1105-C 비활성 단서 · R0-1105-G qty 잔존 · M1-1105-D §3-① 활성 버튼 톤) |
| 등재 | +1 (상시 ⓒ 토큰 1개 (ink-disabled) · 다음 라운드 비활성 UI 재사용) |
| 미완 (Kyu 실기) | 4 (활성 버튼 톤 · 비활성 톤 · qty 복원 · 무회귀) |
| **총 순증감** | **0** (해소 3 + 등재 1 - 미완 4 = 0 · Kyu 4 도장 시 -4) |

---

## 6. 다음 게이트

1. **PR #33 Kyu 아이패드 실기** 4 체크 → 머지.
2. **별건 M2-1105-F** 가 `scripts/_harness.mjs` 추출 완료하면 본 PR 의 `m3-1105-b-playwright.mjs` 를 재편 (import).
3. **별건 M3-1105-x P3 라운드** — Card tender 화면.
4. **별건 M3-1105-x** — Payment success "activity" (view order 이동 뒤 받은 돈/거스름 확인 UX) · 혹은 History UX polish.

---

*M3-1105-E · 2026-11-06 · ink #0E1B18 · ink-disabled #C8C8C8 · qty 복원 · harness 주석 · fork PR #33 · 색 37/37 + Playwright 24/24 · before/after 10장 byte-differ · 이연 0 (Kyu 4 도장 시 -4)*
