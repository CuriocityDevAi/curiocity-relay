---
round: M3-1105-J
pr:
  fork: agilo-medusa-pos-fork#47
commit: e59ec4d (branch feat/m3-1105-j-palette-d1 · base master 26b6b78)
outcome: 팔레트 D1 (Kyu 11-07 결정) 적용 — 토큰 15 값만 교체 (2 파일 · tailwind.config.js + constants/brand.ts) · 컴포넌트 코드 수정 0 · 어설션 13/13 + Playwright 13/13 PASS · 스크린샷 5장 (login · products · detail sold-out · cart · checkout cash) PR body 첨부 · 로고 외 accent 사용처 20건 목록 보고 (수정 하지 않음 · 다음 라운드 Kyu 판단).
kyu_checks: 0 (스크린샷 5장 PR body 로 즉시 확인 가능 · 토큰 값만 교체이므로 Kyu 실기 불요)
---

# M3-1105-J · 팔레트 D1 적용 (greyscale primary + chromatic 품절·재고 only)

**일자**: 2026-11-07 · **허브**: M3 · **성격**: Kyu 11-07 결정 (`open-requirements.md §Kyu 결정 (11-07) 팔레트 = D1`) 반영 · 토큰 값만 교체 (M3-1105-A 절차) · 컴포넌트 코드 무수정.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | 팔레트 D1 값 15 토큰 2 파일 (`tailwind.config.js` colors · `constants/brand.ts` TOKEN_*) 교체 | ✓ |
| 2 | 컴포넌트 코드 수정 0 (M3-1105-A 절차) | ✓ |
| 3 | 스크린샷 5장 (login · products · detail sold-out · cart · checkout cash) PR body 첨부 | ✓ |
| 4 | 색 어설션 갱신 (값 비교 부분만) | ✓ (값 비교 check 는 **원래 없음** · 토큰 존재만 검증 → 자동 통과 · 변경 불요) |
| 5 | 로고 외 accent 사용처 보고 (수정 하지 않음) | ✓ 20건 목록 |
| 6 | 어설션 + Playwright 로컬 PASS + CI 전 job 그린 확인 | ✓ (PR #47 · 두 job 모두 PASS) |

---

## 1. 산출물 (PR #47 · base master `26b6b78`)

| 파일 | 변경 | 라인 |
|------|------|------|
| `tailwind.config.js` | colors 블록 15 토큰 값 D1 로 교체 + 주석 (의도) | +7 / -11 |
| `constants/brand.ts` | TOKEN_* 15 값 D1 로 교체 + 주석 (의도) | +10 / -14 |
| `scripts/m3-1105-j-screenshots.mjs` | **신규** · 5 화면 캡처 스크립트 (하네스 재사용) | +192 |
| `screenshots-m3-1105-j/*.png` | **신규** · 5 장 (login · products · detail sold-out · cart · checkout cash) | +5 파일 |
| **총** | **8 파일** | **+253 / -26** |

**제품 코드 (`app/` · `components/` · `api/` · `lib/`) 수정 0** · 로고 상수 (`BRAND_INK` · `BRAND_AMBER` · `BRAND_GREEN` · `BRAND_CREAM`) 무변경.

---

## 2. D1 토큰 15 값

| token | 값 (D1) | 이전 (M3-1105-E 기준) | 의도 (D1) |
|---|---|---|---|
| `surface` | `#FFFFFF` | `#FFFFFF` | 배경 |
| `surface-muted` | `#F2F2F0` | `#F1F1F1` | 카드/탭 배경 (warm grey) |
| `ink` | `#0E1B18` | `#0E1B18` | 본문 · **주 버튼 bg** |
| `ink-muted` | `#6F6F6F` | `#888888` | 보조 텍스트 (대비 소폭 상향) |
| `ink-subtle` | `#B5B5B5` | `#B5B5B5` | placeholder |
| `ink-disabled` | `#C8C8C8` | `#C8C8C8` | 비활성 전용 |
| `line` | `#E3E3E3` | `#E5E5E5` | 테두리 |
| `accent` | `#E8A33D` | `#4E78E5` (파랑) | **앰버로 이동** (로고 외 미사용 지향) |
| `accent-soft` | `#FBE4B6` | `#B8CCFF` (하늘) | |
| `success` | **`#0E1B18`** | `#469B3B` (녹색) | **= ink** — 녹색 chip 완전 제거 |
| `success-soft` | `#EDEDEB` | `#B9F1B2` (연녹) | **grey** — "Paid" chip bg |
| `warning` | `#9B6D1F` | `#9B8435` | low-stock 텍스트 |
| `warning-soft` | `#FBF1DC` | `#F8EC9A` | low-stock chip bg |
| `danger` | `#C62828` | `#F14747` | sold-out / 오류 (채도 감소) |
| `danger-soft` | `#FBE3E3` | `#FFDFDF` | 오류 chip bg |

**D1 핵심 결정**: `success = ink` — 녹색 자체를 UI 에서 완전 제거. "Paid" 칩은 이제 **grey** 로 렌더.

---

## 3. 의도 (Kyu 11-07 결정)

1. **주 버튼 · 선택 탭 · "Paid" 칩** = ink / surface-muted (무채색).
2. **유채색** = 품절·오류 (danger 빨강) + 재고 부족 (warning-soft 옅은 앰버) **만**.
3. **로고의 O 점만** 앰버 (`BRAND_AMBER` · 로고 전용 상수 · 유지).

---

## 4. 스크린샷 5장 (PR body 첨부 · `screenshots-m3-1105-j/*.png`)

### 4-1. `01-login.png`
- Meros 로고의 M 블록만 앰버 · 본문/라벨 ink · "Sign In" 비활성 = ink-disabled grey. **D1 의도 일치.**

### 4-2. `02-products.png` (sold-out + low-stock + in-stock 한 화면)
- "12 left" (in-stock) = **grey bg** (success-soft `#EDEDEB`) · ink 글자 → **녹색 chip 없음** ✓
- "3 left" (low-stock) = warning-soft 앰버 bg · warning 글자 ✓
- "Sold out" = grey bg · ink 글자 ✓
- 상단 "● Closed · Jakarta 본점 · Tap to open" = danger-soft red bg · danger red 글자 ✓

### 4-3. `03-product-detail-sold-out.png`
- "● Sold out · 0 left" = 빨간 점 + 빨간 글자 (danger) ✓
- "Sold out" 버튼 = surface-muted bg + ink-disabled 글자 (주 버튼 자리 · 품절이면 무채색 비활성) ✓

### 4-4. `04-cart.png` (주 버튼 bg-ink 확인)
- "Open register" = **ink `#0E1B18` bg + 흰 글자** (주 버튼 greyscale) ✓
- "Register is closed" = warning amber ✓
- 하단 탭 Cart (선택) = ink 글자 ✓

### 4-5. `05-checkout-cash.png`
- "Process payment" = **ink bg + 흰 글자** (주 버튼 greyscale) ✓
- Exact / 50k / 100k / Custom = line 테두리 + ink 글자 (grey) ✓
- "Cancel" = surface border + ink (grey) ✓

**5 화면 모두 D1 의도 (주 버튼 무채색 · 유채색은 재고/오류 only) 일치.**

---

## 5. accent 사용처 — 로고 외 20건 (수정 하지 않음 · 다음 라운드 Kyu 판단)

Kyu 의도 "로고 외 accent 미사용" 에 어긋나는 호출부. **본 PR 에선 토큰 값만 교체** · 컴포넌트 재배치는 다음 라운드.

| 파일 | 라인 | 호출 | 성격 |
|---|---|---|---|
| `app/(tabs)/orders.tsx` | 111 | `border-accent bg-accent-soft` (선택 method chip) | 선택 상태 강조 |
| `app/register/close.tsx` | 120 | `text-accent` (`diff > 0`) | 숫자 양/음 구분 |
| `components/RegisterBadge.tsx` | 54 | `text-accent` ("Pickup") | 상태 chip |
| `components/MultiSelectFilter.tsx` | 2 · 68 · 73 | `TOKEN_ACCENT` import · `text-accent` · `<Check color={TOKEN_ACCENT} />` | 선택 표시 |
| `components/SearchInput.tsx` | 16 | `focus:border-accent` | 포커스 테두리 |
| `components/ui/OrderStatus.tsx` | 2 · 193–195 | `bg-accent-soft` + `TOKEN_ACCENT` + `text-accent` ("Draft") | Draft 주문 chip |
| `components/form/MultiSelectField.tsx` | 2 · 29 · 34 | `text-accent` + Check icon | 폼 선택 |
| `components/form/SelectField.tsx` | 2 · 41 · 46 | `text-accent` + Check icon | 폼 선택 |
| `components/form/TextField.tsx` | 87 | `focus:border-accent` | 포커스 테두리 |
| `components/orders/OrderTypeChip.tsx` | 22 · 28 | `bg-accent-soft` + `text-accent` (takeaway) | 주문 유형 chip |

**총 20 라인 · 10 파일** · 가장 눈에 띄는 곳 = (i) Orders 선택 method chip · (ii) OrderStatus Draft chip · (iii) OrderTypeChip takeaway · (iv) form 선택 Check icon · (v) focus 테두리.

**다음 라운드 판단 포인트**:
- 모두 `ink`/`surface-muted` 로 교체? (가장 보수적 · D1 의도 일관)
- 혹은 일부 (예: focus 테두리 · 폼 Check icon) 는 accent 유지해 "포커스 가시성" 을 살릴지?
- Draft / takeaway / Pickup chip 처럼 **상태 구분** 용도는 다른 중립 축 (e.g. ink-muted + icon shape) 으로 재설계 필요.

---

## 6. 검증 (로컬 · CI 와 동일 명령)

### 6-1. 전 어설션 (`run-all.mjs assertions`)

```
$ node scripts/run-all.mjs assertions
==== ASSERTIONS · 13개 ====
  · m0-1103-a-assertions.mjs ... PASS · 0.0s
  · m0-1103-c-assertions.mjs ... PASS · 0.3s
  · m0-1103-d-assertions.mjs ... PASS · 0.0s
  · m0-1104-a-assertions.mjs ... PASS · 0.0s
  · m1-1104-a-assertions.mjs ... PASS · 0.0s
  · m1-1104-b-assertions.mjs ... PASS · 0.0s
  · m1-1105-a-assertions.mjs ... PASS · 0.0s
  · m1-1105-h-assertions.mjs ... PASS · 0.0s
  · m2-1104-d-escpos-assertions.mjs ... PASS · 0.6s
  · m3-1104-a-assertions.mjs ... PASS · 0.0s
  · m3-1105-a-color-assertions.mjs ... PASS · 0.1s  (37/37 · 토큰 존재 검증 · 값 교체 자동 통과)
  · m3-1105-c-english-assertions.mjs ... PASS · 0.0s
  · m3-1105-d-assertions.mjs ... PASS · 0.0s

총 13 개 · 13 PASS · 0 FAIL · 1.3s
```

### 6-2. 전 Playwright (`run-all.mjs playwright`)

```
$ node scripts/run-all.mjs playwright
==== PLAYWRIGHT · 13개 ====
  · m0-1104-a-playwright.mjs ... PASS · 4.8s
  · m1-1104-a-playwright.mjs ... PASS · 4.5s
  · m1-1104-b-playwright.mjs ... PASS · 4.5s
  · m1-1105-b-playwright.mjs ... PASS · 7.1s
  · m1-1105-h-playwright.mjs ... PASS · 8.1s
  · m2-1104-a-playwright.mjs ... PASS · 4.5s
  · m2-1105-b-inventory-playwright.mjs ... PASS · 4.4s
  · m2-1105-c-settings-playwright.mjs ... PASS · 9.6s
  · m3-1104-a-playwright.mjs ... PASS · 4.8s
  · m3-1105-a-playwright.mjs ... PASS · 4.5s
  · m3-1105-b-playwright.mjs ... PASS · 36.1s
  · m3-1105-d-playwright.mjs ... PASS · 34.5s
  · m3-1105-f-playwright.mjs ... PASS · 21.4s

총 13 개 · 13 PASS · 0 FAIL · 148.7s
```

### 6-3. Lint
0 errors · 33 pre-existing warnings (D1 로 발생한 warning 0).

### 6-4. 색 어설션 (`m3-1105-a-color-assertions.mjs`) — 값 비교 갱신 불요
- 현행 check 는 토큰 **존재** 만 검증 (`#[0-9a-f]+` 정규식 1회 매치) · specific hex 값 비교 없음.
- 따라서 15 토큰 값 교체는 **assertion 그대로 통과** → 어설션 수정 불요.
- (신규 raw hex 유입 가드만 있음 · raw 클래스 0 · raw hex 0 · TOKEN_* 15 · 15 토큰 모두 존재.)

### 6-5. CI (fork) — **그린 ✓**
- PR #47: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/47
- CI run (`assertions + playwright`): https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42340183407 · **PASS**
- Lint run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42340183419 · **PASS**
- 머지 가능.

---

## 7. 설계 포인트

### 7-1. 왜 2 파일만 수정하면 되는가 (M3-1105-A 절차)
- 모든 앱 색은 시맨틱 토큰 (15개) 으로 통일 (M3-1105-A `docs/design/tokens.md` · raw gray/blue/red/green/amber 금지).
- 토큰 정의 = (i) `tailwind.config.js` colors (className 용) · (ii) `constants/brand.ts` TOKEN_* (SVG color prop · StatusBar · className 미도달).
- 팔레트 교체 = 두 파일 **값만** 바꾸면 전 앱 색 자동 교체 · 컴포넌트 재작성 불요.

### 7-2. 로고 상수 미변경 이유
- `BRAND_INK` · `BRAND_AMBER` · `BRAND_GREEN` · `BRAND_CREAM` = Meros 로고 전용 (`components/MerosLogo*.tsx` 만 사용).
- 로고는 **정본 자산** (M0-1103-C · 3 Receipt 로고 확정) · 브랜드 가이드라인상 색 고정.
- D1 토큰 (`accent`) 과 값이 같더라도 (`#E8A33D`) **의미 레이어가 다름** — 로고 색은 여전히 로고 구성 요소.

### 7-3. success = ink (D1 핵심)
- **의도**: UI 에서 녹색을 완전히 제거. "Paid" 칩 · 성공 토스트 · 재고 충분 chip 모두 grey.
- **대안 신호**: 긍정 상태는 **아이콘 (CheckCircle)** · **위치** · **문구** 로 전달 · 색 의존 금지.
- WCAG 영향: `success` 글자 (ink #0E1B18) on `success-soft` bg (#EDEDEB) 대비 ≈ **12:1** (AAA) · 가독성 최상.

### 7-4. accent 사용처 20건을 수정하지 않은 이유
- 스펙 명시: "accent 를 쓰는 곳이 로고 외에 있으면 목록으로 보고 · **수정은 하지 말 것 — 다음 라운드 판단**".
- 20건 중 일부 (focus border · Check icon) 는 **접근성 가치** 가 있어 그대로 유지가 옳을 수 있음 · Kyu 판단 영역.
- 본 라운드는 **팔레트 값 교체** 한 가지만.

### 7-5. 스크린샷 하네스 재사용
- `scripts/m3-1105-j-screenshots.mjs` = M2-1105-F `_harness.mjs` 재사용 (createDistServer · mockMedusa · loginAndReachProducts).
- 신규 fixture (3 상품 — in-stock 12 · low-stock 3 · sold-out 0) 로 한 화면에서 3 재고 상태 확인.

---

## 8. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 = `tailwind.config.js` + `constants/brand.ts` (+ 캡처 스크립트 신규) | ✓ |
| 컴포넌트 코드 (`app/` · `components/` · `api/` · `lib/`) 수정 0 | ✓ |
| 로고 상수 (`BRAND_*`) 무변경 | ✓ |
| 15 토큰 값 D1 완전 적용 | ✓ |
| 어설션 13/13 + Playwright 13/13 로컬 PASS | ✓ |
| 스크린샷 5장 PR body 첨부 | ✓ |
| accent 로고 외 사용처 **목록만** (수정 X) | ✓ 20건 |
| 커밋 메시지 `!` 미사용 | ✓ |
| CI 전 job 그린 확인 | ✓ (PR #47 · `assertions + playwright` + `lint` 모두 PASS) |

---

## 9. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (open-requirements.md §Kyu 결정 11-07 "팔레트 = D1") |
| 등재 | +1 (accent 사용처 20건 재배치 판단 · 다음 라운드) |
| 미완 (Kyu 실기) | 0 (스크린샷 5장 PR body 로 즉시 확인 가능) |
| **총 순증감** | **0** (해소 1 · 등재 1 · 미완 0) |

---

## 10. 다음 게이트

1. **CI 그린 확인** (자동 · 수 분 내) → merge.
2. **Kyu 눈 확인** (PR #47 body 5 스크린샷) — D1 전반 승인 여부.
3. **다음 라운드** (M3-1105-K or L) — accent 20건 재배치 판단 (Kyu 결정 필요).
4. **별건** — P3 카드 tender · P4 QRIS tender (M3-1104-B 계획서 §7-2 · §7-3).

---

*M3-1105-J · 2026-11-07 · 팔레트 D1 (Kyu 11-07 결정) 적용 · 토큰 15 값 2 파일 교체 · 컴포넌트 코드 수정 0 · 어설션 13/13 + Playwright 13/13 PASS · 스크린샷 5장 PR body 첨부 · 로고 외 accent 20건 목록 보고 · fork PR #47 · 이연 0 (해소 1 · 등재 1)*
