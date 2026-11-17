전: 높이 차 12px · 라운딩 차 4px → 후: 0/0

## 실측 전/후 비교표

### iPad 가로 (1180×820)

| button     | 전 height | 전 radius | 후 height | 후 radius |
|------------|-----------|-----------|-----------|-----------|
| Pay        | 58px      | 12px      | 58px      | 12px      |
| Takeaway   | 70px      | 8px       | 58px      | 12px      |
| Pre-order  | 70px      | 8px       | 58px      | 12px      |
| Delivery   | 70px      | 8px       | 58px      | 12px      |

### 화면 분할 (590×820)

| button     | 전 height | 전 radius | 후 height | 후 radius |
|------------|-----------|-----------|-----------|-----------|
| Pay        | 58px      | 12px      | 58px      | 12px      |
| Takeaway   | 70px      | 8px       | 58px      | 12px      |
| Pre-order  | 70px      | 8px       | 58px      | 12px      |
| Delivery   | 70px      | 8px       | 58px      | 12px      |

## 왜 M3-1116-AM(#165)이 효과 없었나

`OptionChip` tab 변종에서 sublabel 유무로 패딩을 분기함:
```
sublabel ? BUTTON_PY : 'py-6'   // OptionChip.tsx
```
- Takeaway: sublabel 없음 → `py-6`(24px×2) → 70px (Pay 58px 대비 12px 초과)
- Pre-order/Delivery: sublabel 있음 → `py-4` 적용됐지만 Takeaway와 같은 flex-row에서 70px로 늘어남
- 셋 모두 `rounded-lg` (8px) ≠ Pay의 `rounded-xl` (12px)

## 수정 내용

**`components/ui/Button.tsx`**
- `BUTTON_ROUNDED = 'rounded-xl'` 추출(신규 export)
- `BUTTON_H = 'min-h-[3.625rem]'` 추출(신규 export) — 58px 고정

**`components/ui/OptionChip.tsx`**
- tab 변종: `sublabel ? BUTTON_PY : 'py-6'` → `BUTTON_PY` + `BUTTON_H` + `BUTTON_ROUNDED`
- row 변종: `rounded-xl` → `BUTTON_ROUNDED`(기능 동일)
- tab 인라인 sublabel에 `numberOfLines={1}` 추가(말줄임 보호)

## 다른 선택 버튼 확인 (Cash/Card/QRIS — PaymentMethodTabs)

PaymentMethodTabs도 OptionChip `variant="tab"` 사용. 동일 토큰 적용으로 Process Payment 버튼과도 일치. 별도 수정 불필요.

## 어설션 스크립트

`e2e/flows/M1-1117-D-measure.spec.ts` — iPad 1180×820 · 화면 분할 590×820 두 케이스 모두 `height === Pay.height` · `borderRadius === Pay.borderRadius` 어설션 포함.
