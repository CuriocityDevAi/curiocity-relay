---
round: M1-1105-AC
pr: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/68
outcome: 선택 표시 규칙 변경 (11-07 "회색+검정 테두리" → 11-09 "차콜 채움 + 흰 글자/체크 + semibold") · 새 토큰 쌍 `selected #3F3F3F` / `on-selected #FFFFFF` (대비 10.53:1 WCAG AAA · 결정 버튼 ink 와 contrast 1.68 로 한눈 구분) · OptionChip 단일 출처 교체 → OrderTypePicker · PaymentMethodTabs 자동 반영 · 비-OptionChip 선택 자리 (`#EDEDEB` 회색+검정 테두리 패턴) 코드 검색 0건 → 교체 대상 없음. PreorderInputs 피커 머리줄 "November 2026" ↔ "10:00" 둘 다 `20/600` 으로 통일 (현재 시간 22/700 이 과도) · time_selector 터치 영역 ≥44pt 유지 (#66 호환). 어설션 스크립트 `m3-1105-s-option-chip-assertions.mjs` 전면 재작성 (46/46) · 새 토큰 쌍 정의/대비 가드 + 피커 머리줄 동일 크기 가드. 회귀: run-all assertions 20/20 · playwright 22/22 · 번들 가드 ✓. 스샷 3장 (Checkout OrderType+Pay · Tender Cash+Process · Preorder Pickup) `screenshots-m1-1105-ac/`. 3커밋 push · PR #68.
kyu_checks: 1 (아래 §5 — Checkout 에서 Pre-order 선택 시 차콜 칩 + 검정 Pay 버튼 "같은 계열 · 칩이 더 가벼움" 체감)
---

# M1-1105-AC · 선택 표시 디자인 통일 + 피커 머리줄 크기 (M3 와 병렬)

**일자**: 2026-11-10 · **허브**: M1 · **성격**: UI 규칙 변경 (Kyu 11-09 22:00 결정 · 11-07 규칙 교체).

**Kyu 원문**:
> 옵션을 선택했을 때 회색 박스에 검은색 테두리의 버튼이 선택된 모양이 검은색 버튼과 같이 보일 때 디자인적으로 다운그레이드된 느낌 · 통일성이 적게 부여된 버튼 디자인 (Order type) · 다른 화면에서도 선택일 경우 검은 테두리에 회색 채움 · **아래 검은색 버튼에 글자가 흰색인 Pay 버튼 계열이지만 무게가 좀 떨어지는 느낌으로 통일성 있게**
>
> November 2026 이 시간 (10:00) 에 비해 너무 작음 — **같은 폰트 사이즈로**

---

## 0. 결정·수치 요약 (3줄)

- **선택 토큰 쌍**: `selected` = `#3F3F3F` (차콜) · `on-selected` = `#FFFFFF` (흰). 대비 10.53:1 (WCAG AAA ≥ 7:1) · 결정 버튼 ink `#0E1B18` 와 contrast 1.68 (한눈에 구분).
- **OptionChip 선택 스타일**: `border-selected + bg-selected + text-on-selected + font-semibold + ✓`. 구 `border-ink + bg-success-soft + font-bold` 는 코드 라인에서 금지 (어설션). 테두리 두께 2 는 미선택과 동일 유지 (레이아웃 흔들림 방지).
- **피커 머리줄**: `time_selector_label` / `month_selector_label` / `year_selector_label` 모두 `fontSize: 20 · fontWeight: '600'`. time_selector 터치 영역 `minHeight/minWidth ≥ 44` 유지 (#66 어설션 호환).

---

## 1. 바뀜 파일 (제품 리포)

| 파일 | 변경 |
|---|---|
| `tailwind.config.js` | `selected: '#3F3F3F'` · `'on-selected': '#FFFFFF'` 쌍 추가. |
| `constants/brand.ts` | `TOKEN_SELECTED` · `TOKEN_ON_SELECTED` export 추가 (tailwind 값과 일치). |
| `components/ui/OptionChip.tsx` | 선택 = `border-selected bg-selected` + `text-on-selected` + `font-semibold`. 미선택 · 비활성 기존 규칙 (`border-line bg-surface` · `text-ink-disabled` opacity-50) 유지. 주석 머리말에 M1-1105-AC 결정 기록. |
| `components/payment/PreorderInputs.tsx` | `PICKER_STYLES.time_selector_label` 22/700 → **20/600** · `month/year_selector_label` 18/600 → **20/600** · `time_label` 22 → **20** · line-height 28 → 26. 터치 영역 상수 미변경. |
| `scripts/m3-1105-s-option-chip-assertions.mjs` | **전면 재작성** · §(1) 새 선택 스타일 (14 체크) · §(2) 새 토큰 쌍 + WCAG AA 대비 계산 · §(3)(4) 자동 반영 가드 · §(5)(6)(7) 회귀 (Button solid · 영수증 로고 · 피커 기존 가드) · §(8) **AC 신규 — 피커 머리줄 동일 크기 가드** (fontSize/fontWeight · 범위 20~22 · 터치 영역 ≥44). 46/46 passed. |
| `scripts/m1-1105-ac-screenshots.mjs` (신규) | Playwright 3컷 · Checkout OrderType+Pay · Tender Cash+Process · Preorder Pickup 영역. |
| `screenshots-m1-1105-ac/*.png` (신규 · 3장) | 위 3컷 PNG. |

파일 주인 범위 밖 미변경 (`components/orders/**` · `app/orders/**` · `api/hooks/**` · `lib/printer` · `lib/receipt-layout.ts` · `app/_layout.tsx` · `ShiftCloseGate*` · `storeport`).

---

## 2. 색 선택지 3줄 (PR 본문 반영 · Kyu 교체 1커밋 전환)

- **채택**: `#3F3F3F` 차콜 — ink 와 contrast 1.68 · 흰 글자 10.53:1 (AAA).
- 대안 A: `#525252` 더 밝은 차콜 — ink contrast 2.16 (구분 강함) · 흰 글자 7.46:1 (AAA) · "같은 계열" 감 약해질 수 있음.
- 대안 B: `#2E2E2E` 덜 밝은 차콜 — ink contrast 1.32 (아슬) · 흰 글자 13.74:1 (AAA 깊음) · "같은 계열" 강함 · 밝기 차 애매.
- 교체 비용: `tailwind.config.js` + `constants/brand.ts` 두 파일 hex 교체 → 1커밋.

---

## 3. 어설션 · 회귀 (전체 실측)

```
scripts/m3-1105-s-option-chip-assertions.mjs : 46/46 passed · 0 failed
scripts/m3-1105-v-assertions.mjs             : 35/35 passed · 0 failed
scripts/m3-1105-a-color-assertions.mjs       : 37/37 passed · 0 failed
scripts/m3-1105-d-assertions.mjs             : 27/27 passed · 0 failed
scripts/m2-1105-q-bundle-guard.mjs           : 정적 grep ✓ · Metro iOS 번들 해석 ✓ (16.9s)
scripts/run-all.mjs assertions               : 20/20 passed · 10.0s
scripts/run-all.mjs playwright               : 22/22 passed · 460.6s
```

**CI**: push 시 ci.yml 이 `run-all assertions + playwright` 를 돌림 (GitHub Actions 자동). 로컬 실측과 동일 세트.

---

## 4. 스샷 (3장 · `screenshots-m1-1105-ac/`)

| 파일 | 내용 |
|---|---|
| `01-checkout-ordertype-selected-plus-pay.png` | Checkout · "✓ Pre-order" 차콜 (#3F3F3F) + 흰 글자/체크 · "Takeaway" 미선택 (흰 + 옅은 테두리) · "Delivery" 비활성 (opacity-50) · 아래 검정 "Pay" 버튼 (ink #0E1B18 · 흰 글자 · bold · 더 높음) — **"같은 계열 · 칩이 더 가벼움" 한 프레임 비교**. |
| `02-tender-tabs-cash-selected-plus-process.png` | Tender cash · "✓ Cash" 차콜 · "Card" 미선택 · "QRIS" 비활성 · 아래 검정 "Process payment" 버튼 (활성 · ink). 결정 버튼과 선택 탭의 밝기 차 한눈. |
| `03-preorder-inputs-pickup-area.png` | Pre-order 입력 · "✓ Pre-order" 선택 상태에서 Pickup date & time 빠른 칩 (Today 17:00 · Tomorrow 10:00 · +1 day) + datetime-local 입력 (웹 폴백). |

> **네이티브 BottomSheet 피커 시트는 Hermes 전용 — 웹 Playwright 에선 렌더 X**. 머리줄 fontSize/fontWeight 동일 (time=month=year=20/600) 은 `scripts/m3-1105-s-option-chip-assertions.mjs §8` 로 소스 레벨 어설션 (3개 selector_label 블록의 fontSize/fontWeight 값 추출 + 비교). Kyu 가 iPad 실기로 "November 2026" 과 "10:00" 이 같은 크기로 보이는지 확인 필요 (§5-1).

---

## 5. Kyu 확인 절차 (쉬운 말 2줄)

1. **차콜 선택 체감**: PR #68 Expo 프리뷰 or `npx expo start -w` 로 Checkout 화면 → Pre-order 탭 눌러보면 **진회색 채움 + 흰 "✓ Pre-order"** 가 뜨고, 바로 아래 **검정 "Pay" 버튼** 과 밝기 차가 한눈에 보임. "회색 박스 + 검정 테두리라 Pay 랑 같아 보임" 문제 → 이제 "같은 계열 · 칩이 더 가벼움" 으로 통일. 결제 탭 (Cash/Card/QRIS) 도 동일.
2. **피커 머리줄 (iPad 실기만)**: Checkout → Pre-order → "Tap to choose pickup date & time" → BottomSheet 가 열리면 위쪽 **"November 2026"** 과 오른쪽 **"10:00"** 이 **같은 크기 (중간)** 로 보임. 전엔 시간이 과도하게 컸음. 시간 토글 터치는 손가락으로 쉽게 눌림 (≥44pt 유지).

---

## 6. 결정·근거 (왜 `#3F3F3F` 인가 · 왜 테두리 유지인가)

- **왜 `#3F3F3F`**: Kyu 요구 "검정 버튼 글자가 흰색인 Pay 버튼 계열이지만 무게가 좀 떨어지는" → 결정 버튼 ink (#0E1B18) 와 같은 "검정 계열" · 밝기만 한 단계 ↑. #3F3F3F 는 흰 글자 대비 10.53:1 로 AAA 통과 + ink 와 contrast 1.68 — 한눈에 "다른 그레이" 로 보이면서도 "같은 계열" 감 유지. 더 밝으면 (#525252+) 구분은 강해지지만 "같은 계열" 감 약화 · 더 어두우면 (#2E2E2E-) 결정 버튼과 분간 어려움.
- **왜 테두리 유지**: 선택 시 `border-2 border-selected` (채움과 같은 색) 로 두께는 미선택과 동일. 테두리 두께가 선택/미선택 간 바뀌면 칩이 1px 씩 움직여 레이아웃 흔들림. 시각적으론 "무테두리" 로 보임.
- **왜 `font-semibold`**: Kyu "무게가 좀 떨어지는" · 결정 버튼의 Text (현재 명시적 font-weight 없음 · 기본 500) 보다 아주 약간만 무겁게. `font-bold` (700) 는 결정 버튼과 비슷해져 "무게 떨어지는" 요구 반대. `semibold` (600) 가 중간 지점.

---

## 7. 비-OptionChip 선택 자리 검색 (목록 PR 본문)

`#EDEDEB` 또는 `border-ink bg-success-soft` 패턴을 grep → 결과:
```
constants/brand.ts: TOKEN_SUCCESS_SOFT = '#EDEDEB'      ← 토큰 정의 자체
components/ui/OptionChip.tsx: (before patch — 교체 대상이 본 OptionChip 단일)
```
→ **비-OptionChip 선택 자리 0건**. 추가 교체 PR 불필요.

주의: `components/ui/OptionPicker.tsx` · `components/ui/SizePicker.tsx` · `components/ui/ColorPicker.tsx` 는 현재 `border-ink bg-ink` (결정 버튼과 동일 ink) 를 쓴다 — Kyu 결정 범위 (선택 = 차콜 통일) 에 맞지 않지만, 본 라운드 파일 주인 범위 외 (해당 파일들은 OptionChip 과 별도 컴포넌트). 후속 라운드 (M1-1105-AD?) 로 분리하면 안전 — 이 라운드는 "OptionChip 쓰는 자리" + "비-OptionChip #EDEDEB 패턴" 만 다룸.

---

## 8. 열린 질문 · 후속

- **Picker 머리줄 실기 확인 미이행**: 웹 Playwright 는 네이티브 시트 렌더 X → iPad Expo Go 또는 EAS build 로 Kyu 실기 확인 필요 (§5-2). 소스 레벨 어설션은 통과.
- **OptionPicker/SizePicker/ColorPicker (ink 선택)**: 본 라운드 파일 주인 외. 후속 라운드에서 `selected` 토큰으로 통일하면 앱 전체 "선택 = 차콜" 일원화. 분량상 1커밋 · 파일 3개.
- **대비 AAA (7:1) vs AA (4.5:1)**: 현재 10.53:1 로 AAA 여유. Kyu 가 더 어두운 차콜 (대안 B) 선호 시 AAA 더 깊어짐 (13.74:1). 더 밝은 쪽 (대안 A) 도 AAA 안 (7.46:1).
- **CI 결과**: push 후 GitHub Actions 결과 미확인 (리포트 작성 시점). 로컬 실측과 동일 세트 → PASS 예상.

---

## 9. 실측 로그 (요약)

```
$ node scripts/m3-1105-s-option-chip-assertions.mjs
46/46 passed · 0 failed

$ node scripts/m3-1105-v-assertions.mjs
35/35 passed · 0 failed

$ node scripts/m3-1105-a-color-assertions.mjs
37/37 passed · 0 failed

$ node scripts/m3-1105-d-assertions.mjs
27/27 passed · 0 failed

$ node scripts/m2-1105-q-bundle-guard.mjs
[guard] (1) 정적 grep · lib/** · components/** · app/**
  · lib/ · 10 파일
  · components/ · 104 파일
  · app/ · 28 파일
[guard]   ✓ 정적 grep 0 건 위반
[guard] (2) Metro iOS 번들 · expo export → /var/folders/.../m2-bundle-check-IduHUz
[guard]   ✓ Metro iOS 번들 해석 성공 · 16.9s
[guard] ✓ 전체 통과

$ node scripts/run-all.mjs assertions
총 20 개 · 20 PASS · 0 FAIL · 10.0s

$ node scripts/run-all.mjs playwright
총 22 개 · 22 PASS · 0 FAIL · 460.6s

$ node scripts/m1-1105-ac-screenshots.mjs
📸 01-checkout-ordertype-selected-plus-pay.png
📸 02-tender-tabs-cash-selected-plus-process.png
📸 03-preorder-inputs-pickup-area.png
✅ screenshots saved to /Users/kyu.lee/projects/pos-m1/screenshots-m1-1105-ac/
```

**커밋 3개**:
```
000af19 feat(design): unify selected style — selected/on-selected tokens + OptionChip charcoal fill (M1-1105-AC)
a8c23f8 fix(preorder-picker): unify header font sizes — "November 2026" ↔ "10:00" same 20/600 (M1-1105-AC)
e8ccb76 test(m1-1105-ac): rewrite OptionChip assertions + picker header + screenshots
```

**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/68 · 베이스 master (c34a2b8) · 브랜치 feat/m1-1105-ac-selected-style.
