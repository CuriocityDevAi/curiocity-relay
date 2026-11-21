# M3-1121-B Report

기준 버튼 높이 58dp · 홈 머리 O · Order type 칩 넘침 O · Split/Pay O · 완료 머리줄 O · PR #225

---

## 작업 내용

### 기준 버튼
- `BUTTON_H = 'min-h-[3.625rem]'` = 58dp (Hand over 버튼 사용 중 · 변경 없음)
- `BUTTON_PY = 'py-4'` · `BUTTON_ROUNDED = 'rounded-xl'`

---

### 홈 머리 O — 수정 완료

**문제**: `RegisterBadge` 안에 "Pickup Close" 텍스트가 초록 바 하나에 붙어 버튼처럼 안 보임.  
**원인**: `TouchableOpacity + Text` 로만 구현, 테두리·패딩 없음.

**수정**:
- `RegisterBadge` → 상태 텍스트 바만 표시 (Pickup/Close 분리)
- `products.tsx` 헤더: **Pickup(flex:1)·Close(flex:1)·Next customer(flex:2)** `Button variant="outline"` 한 줄  
- 세션 없을 때: `Next customer` 단독(기준 높이)
- Pickup = `/register/pickup` 이동 · Close = `/register/close` 이동 (라벨·동작 모두 적합)

---

### Order type 칩 넘침 O — 수정 완료

**문제**: `OptionChip` tab variant의 sublabel이 label과 같은 `flex-row` 줄에 있어 390px 폰에서 칩 밖으로 넘침.  
  - "Addr. on checkout" (Delivery chip) · "DP today" (Pre-order chip) 모두 넘침.

**수정** (`components/ui/OptionChip.tsx`):
- tab variant 내부 구조: sublabel을 `flex-col` 2번째 줄로 이동, `numberOfLines={2}`
- sublabel 앞 "· " prefix 제거 (별도 줄이므로 불필요)
- Cash/Card/QRIS 결제 탭은 sublabel 없으므로 미영향
- iPad 가로(1180px): 칩 충분히 넓어 2줄도 자연스러움

---

### Split/Pay O — 이미 기준 높이 적용

**확인**: `app/checkout/[draftOrderId].tsx` 하단 Pay 바의 Split/Pay 버튼은 이미 `Button` 컴포넌트 → `BUTTON_H + BUTTON_PY + BUTTON_ROUNDED` 토큰 적용.  
**코드 변경 없음** (기준 높이와 일치).

---

### 완료 머리줄 O — 수정 완료

**문제**: 헤더 `Next customer` 버튼에 `style={{ width: Math.floor(windowWidth / 3) }}` → OPPO(390px)에서 130px → "Next cust…" 텍스트 잘림.

**수정** (`app/checkout/success/[orderId].tsx`):
- `style={{ width: windowWidth/3 }}` 제거 → 콘텐츠 폭 자동 크기
- `numberOfLines={1}` 제거 → 텍스트 잘림 없음
- `useWindowDimensions` 임포트 제거

---

### 다른 주요 버튼 점검 (범위 외)

아래 버튼들은 모두 `Button` 컴포넌트 → 기준 높이 토큰 적용됨, 별도 수정 불필요:
- Ask phone on display · Link customer → `Button variant="outline"` (SuccessReceiptAnim)
- Reprint / Share / View order → `Button variant="outline"` (SuccessReceiptAnim)

---

## 자기검증 — Playwright

스펙: `e2e/flows/M3-1121-B-btn-height.spec.ts`

| 뷰포트 | 화면 | 스크린샷 |
|---|---|---|
| 390×844 | 홈 | `M3-1121-B-01-home-phone-390w.png` |
| 1180×820 | 홈 | `M3-1121-B-01-home-ipad-1180w.png` |
| 390×844 | Checkout | `M3-1121-B-02-checkout-phone-390w.png` |
| 1180×820 | Checkout | `M3-1121-B-02-checkout-ipad-1180w.png` |
| 390×844 | 결제 완료 | `M3-1121-B-03-success-phone-390w.png` |
| 1180×820 | 결제 완료 | `M3-1121-B-03-success-ipad-1180w.png` |

**칩 넘침 기계 판정**: sublabel `boundingBox`가 칩 컨테이너 범위 안에 있는지 어설션 (Pre-order · Delivery 2개 칩, 양쪽 뷰포트)

---

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/225

## 하드코딩 색 없음

모든 색상은 토큰(`bg-success-soft` · `text-success` · `border-line` 등) 사용. 하드코딩 색 없음.
