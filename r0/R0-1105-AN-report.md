# R0-1105-AN · fork #68 리뷰 — feat/m1-1105-ac-selected-style

**판정: APPROVE**
head `e8ccb76` · base `master c34a2b8`

---

## §0 master 충돌 여부

| | |
|---|---|
| PR base | `c34a2b8` |
| master 현재 | `79419d05` (#67 feat/m3-1105-x 머지 · 2026-11-09T21:44:31Z) |
| 상태 | master가 PR base보다 앞섬 |

**겹치는 파일 없음 → 충돌 없음.**

#67이 건드린 파일: `api/hooks/pos-payments.ts`, `app/orders/[orderId].tsx`, `components/orders/FulfillSheet.tsx`(신규), `components/orders/OrderTypeChip.tsx`, `fixtures/pos-fulfill-*.json`, `scripts/m3-1105-x-*`, `scripts/m3-1105-d-assertions.mjs`

PR #68이 건드린 파일: `components/payment/PreorderInputs.tsx`, `components/ui/OptionChip.tsx`, `constants/brand.ts`, `tailwind.config.js`, `scripts/m3-1105-s-option-chip-assertions.mjs`, `scripts/m1-1105-ac-screenshots.mjs`(신규), `screenshots-m1-1105-ac/*.png`(신규)

---

## §1 토큰 쌍 `selected` / `on-selected`

**tailwind.config.js** (line ~61–62):
```
selected: '#3F3F3F',
'on-selected': '#FFFFFF',
```
✅ 존재 · 값 `#3F3F3F` / `#FFFFFF` 일치

**constants/brand.ts** (line ~27–28):
```
export const TOKEN_SELECTED = '#3F3F3F';
export const TOKEN_ON_SELECTED = '#FFFFFF';
```
✅ 존재 · 값 일치

**hex 하드룰:** 두 토큰 정의 파일에만 hex. 컴포넌트 코드에서 raw hex 인라인 없음 ✅

---

## §2 OptionChip (`components/ui/OptionChip.tsx`)

| 규칙 | 결과 |
|---|---|
| 선택 = `border-selected bg-selected` | ✅ |
| 선택 글자/체크 = `text-on-selected` | ✅ |
| 선택 굵기 = `font-semibold` (bold → semibold 변경) | ✅ |
| 체크 `✓` prefix 유지 | ✅ |
| 미선택 = `border-line bg-surface text-ink` | ✅ |
| 비활성 = `text-ink-disabled opacity-50` | ✅ |
| 테두리 두께 선택/미선택 동일 (`border-2` 항상) | ✅ 레이아웃 흔들림 0 |
| `bg-ink` 칩 적용 금지 | ✅ |

**결정 버튼 (Button solid) 미변경:**
`components/ui/Button.tsx`: `'bg-ink': variant === 'solid'` → ✅ 그대로

---

## §3 PreorderInputs 머리줄 (`components/payment/PreorderInputs.tsx`)

```
time_selector_label:  { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 }
month_selector_label: { fontSize: 20, fontWeight: '600' as const }
year_selector_label:  { fontSize: 20, fontWeight: '600' as const }
```

| 항목 | 결과 |
|---|---|
| time/month/year fontSize 동일 | ✅ 모두 20 |
| time/month/year fontWeight 동일 | ✅ 모두 '600' |
| time_selector 터치 영역 | `minHeight: 44, minWidth: 96` ✅ ≥44pt 유지 (#66 회귀 없음) |

---

## §4 후속 라운드 — 비-OptionChip 선택 자리 (`bg-ink` 유지 중)

이번 PR 범위 밖. file:line 기록:

| 파일 | 위치 | 현재 선택 스타일 |
|---|---|---|
| `components/ui/OptionPicker.tsx` | line ~36 | `'border-ink bg-ink': isSelected` |
| `components/ui/SizePicker.tsx` | line ~35 | `isSelected ? 'border-ink bg-ink'` |
| `components/ui/ColorPicker.tsx` | line ~36 | `isSelected ? 'border-ink bg-ink'` |

세 컴포넌트 모두 현재 `bg-ink` 선택 유지. 후속 라운드에서 `bg-selected/on-selected`로 통일 필요.

---

## §5 기타 검사

| 항목 | 결과 |
|---|---|
| 파일 범위 밖 미수정 | ✅ (9 files all in-scope) |
| 영어 UI | ✅ |
| bundle guard (정적 grep + Metro iOS) | ✅ |
| FulfillSheet.tsx 주석 stale | 주석 `components/orders/FulfillSheet.tsx:11` 에 구 스펙 `bg-success-soft + border-ink + ✓` 참조 — 코드는 `<OptionChip>` 올바르게 사용 · 머지 시 자동 차콜 스타일 적용됨 · 주석만 stale · 기능 영향 없음 · 후속 cleanup 권고 |
| CI check runs | GitHub API 403 (통합 앱 권한 없음) → 직접 접근 불가 |

---

## §6 assertions 직접 실행 로그 (pos-m1 worktree · `e8ccb76`)

```
node scripts/m3-1105-s-option-chip-assertions.mjs  →  46/46 passed · 0 failed ✅
node scripts/m3-1105-v-assertions.mjs               →  35/35 passed · 0 failed ✅
node scripts/m3-1105-a-color-assertions.mjs         →  37/37 passed · 0 failed ✅
node scripts/m3-1105-d-assertions.mjs               →  27/27 passed · 0 failed ✅
node scripts/m2-1105-q-bundle-guard.mjs             →  정적 grep 0건 · Metro iOS 성공 (19.7s) ✅
node scripts/run-all.mjs assertions                 →  20/20 PASS · 10.8s ✅
node scripts/run-all.mjs playwright                 →  22/22 PASS · 461.4s ✅
```

---

## 판정

**APPROVE**

토큰 정의 일치, OptionChip 차콜 선택 스타일 올바름, 테두리 두께 동일, 결정 버튼 ink 미변경, PreorderInputs 머리줄 20/600 통일, time_selector 터치 영역 ≥44pt 유지. 충돌 없음. 전 assertions·playwright green.

후속 라운드 권고: OptionPicker/SizePicker/ColorPicker `bg-ink` → `bg-selected` 통일 (§4). FulfillSheet.tsx:11 주석 cleanup (§5).
