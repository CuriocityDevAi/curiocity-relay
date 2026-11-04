---
round: M3-1104-A
pr:
  fork: agilo-medusa-pos-fork#16
commit: cb21788
outcome: 품절 카드 흐림 25% + 배지 "품절" + 탭 토스트 (담기지 않음) · 재고 로직 무수정
kyu_checks: 3 (품절 카드 흐림 + 배지 · 품절 탭 토스트 · 재고 있는 상품 기존 동작 유지)
---

# M3-1104-A · 품절 카드 흐림 25% + 탭 토스트

**일자**: 2026-11-04 · **허브**: M3 (신설) · **상대 리포**: `agilo-medusa-pos-fork` (pos-m3 worktree · master cd09eef 기준)

---

## 0. 뿌리 (원장 11-03 신규 요구)

Kyu 11-03 iPad: Meros POS 상품 그리드에서 재고 0 상품도 재고 있는 상품과 동일하게 눈에 띄며, 눌리면 상세로 진입 → 담기 시도 → 혼선. 요구:

1. 재고 0 카드는 **25% 흐리게** (= opacity 0.75) — "흐림 25%" 는 "카드가 25% 희미해진다" 의 뜻 (opacity 0.25 가 아님).
2. "품절" **작은 배지** 표기.
3. 탭 → **담기지 않음** + 짧은 **토스트 "품절"**.
4. **재고 숫자 표시 로직은 건드리지 말 것** (M0-1103-B 에서 확정된 fail-open · "X left" · amber/green ≤ 5 분기).

보호 대상 (M1·M2 동시 작업): `package.json` · `app/login.tsx` · `contexts/*` · `app/_layout.tsx` · `components/setup-wizard/*` — 무수정.

---

## 1. 산출물 (fork PR #16 · base master `cd09eef` · 변경 최소)

| 파일 | 변경 | 라인 |
|------|------|------|
| `app/(tabs)/products.tsx` | `TouchableOpacity` 에 `isSoldOut && 'opacity-75'` · `disabled={isSoldOut}` 삭제 · `onPress` 품절 분기 `Toast.show` · 배지 문구 `Sold out` → `품절` · 이미지 `opacity-40` 제거 · 타이틀/가격 `text-gray-400` 제거 (전체 카드 opacity-75 로 통합) | 26 |
| `scripts/m3-1104-a-assertions.mjs` | 기계 어설션 신규 (16건) | 111 |
| `scripts/m3-1104-a-playwright.mjs` | Expo 웹 실기동 어설션 신규 (4건 · 상시 ⓐ) | 121 |

**토큰 추가 없음** — `opacity-75` 는 Tailwind 기본 유틸 (하드코딩 아님). `constants/brand.ts` 무수정.

**서버 변경 없음** · storeport PR 없음.

---

## 2. 검증 (실행 로그 · 미실행 금지)

### 로직 어설션 16/16 pass

```
$ node scripts/m3-1104-a-assertions.mjs
--- (1) products.tsx shape · M3-1104-A 적용 ---
  ✓ 품절 카드 opacity-75 적용 (25% 흐리게)
  ✓ 배지 문구 "품절" (Sold out 아님)
  ✓ 이전 "Sold out" 문구 잔존 없음 (회귀 가드)
  ✓ 이미지 opacity-40 제거됨 (전체 카드로 이동)
  ✓ Toast import (react-native-toast-message)
  ✓ 품절 탭 → Toast.show text1 "품절"
  ✓ 짧은 토스트 (visibilityTime 명시 · 1500~2500 범위)
  ✓ disabled={isSoldOut} 삭제 (탭 이벤트 발화해야 Toast 뜸)
--- (2) 재고 숫자 표시 로직 보존 (M0-1103-B 확정) ---
  ✓ computeInventoryStatus export 유지
  ✓ fail-open 규약 유지 (숫자 아니면 unknown)
  ✓ "X left" 포맷 유지
  ✓ in-stock 색 로직 유지 (amber/green ≤ 5)
--- (3) 품절 상품 mock · computeInventoryStatus 판정 ---
  ✓ 품절 mock → kind='sold-out'
  ✓ 품절 mock → total=0
  ✓ 재고 7 mock → kind='in-stock' · 흐림/토스트 미적용 분기
--- (4) 하드코딩 가드 ---
  ✓ products.tsx 에 raw hex 색 없음 (brand/tailwind 토큰만 사용)
16/16 passed · 0 failed
```

### Expo 웹 Playwright 4/4 pass (상시 ⓐ · M0-1104-A 로부터 상속)

```
$ npx expo export --platform web --output-dir dist
› web bundles (3)  (entry 6MB · index 45KB · css 21KB) · static routes 29

$ node scripts/m3-1104-a-playwright.mjs
serving /Users/kyu.lee/projects/pos-m3/dist on :9411
--- (1) 미인증 상태 index.html 로드 → crash 없음 ---
  screenshot: /tmp/m3-1104-a-screenshot.png
  ✓ (1) pageerror 0건
--- (2) 로그인 화면 DOM 도달 ---
  ✓ (2) 로그인 화면 요소 존재 (Sign In 텍스트 or Shop URL 필드)
--- (3) Meros 로고 렌더 ---
  ✓ (3) Meros 로고 SVG 렌더
--- (4) 콘솔 error 총 수 ---
  ✓ (4) console.error 0건
4/4 passed · 0 failed
```

### TypeScript

```
$ npx tsc --noEmit
app/_layout.tsx(4,8): error TS2882: Cannot find module or type declarations for side-effect import of '../global.css'.
```

→ master `cd09eef` 에서도 동일 (nativewind side-effect import 의 preexisting 경고). 본 라운드 신규 에러 0.

### ESLint

```
$ npx eslint app/(tabs)/products.tsx scripts/m3-1104-a-assertions.mjs scripts/m3-1104-a-playwright.mjs
(출력 없음 · 0 errors)
```

---

## 3. Kyu 아이패드 재실기 체크 (쉬운 말)

- **dim-25**: 상품 그리드 → 품절 상품 카드가 **눈에 띄게 희미해 보임** (전체 카드 25% 흐리게). 옆 카드 비교 시 확실.
- **badge-korean**: 품절 카드 우상단에 작은 "**품절**" 배지. ("Sold out" 영문 아님 · "X left" 숫자는 재고 있는 상품만.)
- **tap-toast**: 품절 카드 탭 → 상세로 **안 넘어감** + 하단에 짧은 "품절" 토스트 ~1.5초. 담기지 않음.
- **in-stock-regression-none**: 재고 있는 상품 탭 → 기존대로 상세 진입, `X left` 그대로 (amber ≤ 5 · green > 5). 재고 숫자 표시 미회귀.

---

## 4. 규약 정합

| 규약 | 정합 |
|------|------|
| M3 책임 범위 (components/Product* · 그리드 · 카드) | ✓ (owner 파일 부재 → 현행 `app/(tabs)/products.tsx` inline 수정 · M0-1103-A/B 선례 동일) |
| 금지 파일 (package.json · login · contexts · _layout · setup-wizard) 무수정 | ✓ |
| 색·불투명도 하드코딩 금지 (brand 토큰만) | ✓ (Tailwind `opacity-75` · 신규 hex 없음 · 어설션 (4) 로 가드) |
| 재고 숫자 표시 로직 (M0-1103-B) 미수정 | ✓ (shape 어설션 (2) 로 가드) |
| 어설션 (품절 mock 포함) | ✓ 16/16 |
| Playwright Expo 웹 실기동 · 로그인 도달 · console.error 0 (상시 ⓐ) | ✓ 4/4 |
| TypeScript 신규 에러 0 | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 5. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (11-03 신규 요구 · 품절 카드 흐림 + 배지 + 토스트) |
| 보강 | +1 (M3 허브 어설션 2종 신설 · 상시 Playwright 포트 9411 분리) |
| 미완 (Kyu 실기) | 1 |
| **총 순증감** | **-1** (Kyu 도장 3건 시 -2) |

---

## 6. 다음 게이트

1. **PR #16 Kyu 리뷰 → 머지** → iPad 실기 (dim-25 · badge-korean · tap-toast · in-stock-regression-none 4건).
2. **M3 허브 상시 ⓐ**: 이후 M3 라운드 PR 마다 `scripts/m3-1104-a-playwright.mjs` 재사용 (DIST 는 자동 ROOT 상대).
3. **잠재 후속**:
   - 품절 카드 우상단 배지 디자인 (현재 `bg-gray-300 text-gray-700`) 을 brand 토큰 (`brand.ink` outline · `brand.cream` bg 등) 으로 재정렬 → M3-110x 별건.
   - `components/ProductCard.tsx` 로 추출 (owner 파일 공식화) → M3 다음 라운드에서 재고 배지 + 품절 분기를 1개 컴포넌트로 통합.

---

*M3-1104-A · 2026-11-04 · 품절 카드 흐림·배지·토스트 · fork PR #16 · 어설션 16/16 + Playwright 4/4 pass · kyu_checks 3 · 이연 -1 (Kyu 도장 시 -2)*
