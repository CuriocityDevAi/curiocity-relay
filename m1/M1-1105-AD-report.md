# M1-1105-AD Report

**Branch**: feat/m1-1105-ad-picker-selected (from master 77b930c)  
**PR**: #72  
**Commits**: c01e015 · 75145a9

---

## Deliverables

### 1. pickerChipStyles.ts (new)
`components/ui/pickerChipStyles.ts` — shared style helpers:
- `chipContainer(isSelected, isDisabled, extra?)` → `border-2 border-selected bg-selected` / `border-line bg-surface`
- `chipLabelClass(isSelected, isDisabled)` → `text-on-selected font-semibold` / `text-ink-disabled` / `text-ink`
- `colorChipContainer(isSelected, isDisabled, extra?)` → ring-only: `border-selected` (no fill)
- `colorChipLabelClass(isSelected, isDisabled)` → `text-ink font-semibold` when selected (no on-selected since no fill)

No token value copying — all from design tokens.

### 2. OptionPicker.tsx
- Imports `chipContainer` / `chipLabelClass` from pickerChipStyles
- Selected: charcoal fill + white semibold + ✓ check
- Unselected: surface + line border + ink text
- 0 `bg-ink` / `border-ink`

### 3. SizePicker.tsx
- Imports `chipContainer` / `chipLabelClass` from pickerChipStyles
- Same selected/unselected/disabled rules as OptionChip
- 0 `bg-ink` / `border-ink`

### 4. ColorPicker.tsx
**Choice: charcoal border ring + ✓ check (no fill)**
- Selected: `border-selected` ring (2px) + ✓ in `text-selected`, color swatch preserved
- Unselected: `border-line bg-surface`
- Why: fill would cover the color swatch; ring gives clear selection signal without obscuring content
- 0 `bg-ink` / `border-ink`

---

## Assertions: run-all 22/22 PASS

```
§1  pickerChipStyles.ts — 10/10 checks
§2  OptionPicker.tsx   — 6/6
§3  SizePicker.tsx     — 5/5
§4  ColorPicker.tsx    — 7/7
§5  OptionChip regression guard — 3/3
§6  App-wide components/ui/*.tsx (Button excluded) — 1/1 (0 violations)
Bundle guard (Metro iOS) — PASS
```

---

## Screenshots (screenshots-m1-1105-ad/)

- `01-option-picker-type-large-selected.png` — OptionPicker "Type" option, "Large" selected (charcoal ✓)
- `02-option-picker-size-m-selected.png` — OptionPicker "Size" option, "M" selected
- `03-option-picker-color-black-selected.png` — OptionPicker "Color" option, "Black" selected

SizePicker and ColorPicker visual correctness is covered by assertions §3–§4 (no live screen wires them yet).

---

## PR Body (실기 확인)

**선택지·채택·이유 (ColorPicker):**

| 선택지 | 채택 | 이유 |
|---|---|---|
| 차콜 채움 (OptionChip 동일) | ✗ | 색 견본 완전히 가림 |
| 견본 위 오버레이 | ✗ | 각 견본 색에 맞는 대비 계산 필요 |
| **차콜 테두리 링 + 체크** | ✅ | 견본 보존 · 링 색 = selected 토큰 · 체크로 선택 명확 |
