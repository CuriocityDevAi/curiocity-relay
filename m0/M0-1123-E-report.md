PASS · https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/234

# M0-1123-E — 결제 완료 스크롤 · 주문 유형 칩 높이 수정

- **브랜치**: `fix/M0-1123-E-checkout-test1`
- **PR**: #234 (CuriocityDevAi/agilo-medusa-pos-fork)
- **SHA**: ba2c7bb
- **워크트리**: `~/curiocity-live/fork-wts/M0-1123-E-wt`

## Kyu 실기 (2026-11-23 16:54)

- **6번**: Payment Successful 화면에서 영수증이 길면 아래로 스크롤이 안 됨 → **수정 완료**
- **E 🔴**: Takeaway/Pre-order/Delivery 버튼 세로 길이 과대 + 보조 문구 삭제 요구 → **수정 완료**

## 원인 1줄 요약

Payment Successful 화면의 ScrollView 가 `flex-1` 만으로 선언돼 있어, 중첩된 flex 컬럼 안에서 RN-Web 의 `flex-basis 0%` 가 부모 높이를 기준점으로 삼지 못해 ScrollView 가 content 전체 높이로 늘어나버렸다. `minHeight: 0` 명시로 수축 허용 → overflow 발생 → 스크롤 켜짐.

## 변경 파일 (11)

**코드 (src)**:
- `app/checkout/success/[orderId].tsx` — headerRight Next customer 제거 · `onNextCustomer` prop 전달 · 중간 wrapper `minHeight:0`.
- `components/payment/SuccessReceiptAnim.tsx` — ScrollView `style={{ flex:1, minHeight:0 }}` + `contentContainerStyle={{ flexGrow:1 }}` · 하단 고정 Next customer 바(`next-customer-footer`) 추가.
- `components/payment/OrderTypePicker.tsx` — `sub: 'DP today'`, `sub: 'Addr. on checkout'` 제거.

**테스트 (e2e)**:
- `e2e/flows/M0-1123-E-checkout.spec.ts` (신규) — 20 품목 영수증 스크롤 + 칩 높이 어설션 + 스샷 2 종.
- `e2e/flows/M3-1121-B-btn-height.spec.ts` — Checkout 칩 "overflow" 블록 → "칩 높이 == Pay 높이" 블록으로 교체.
- `e2e/helpers/api-mocks.ts` — `navigateTo` 가 `/products` 또는 `/sell` 모두 수용 (M3-1123-A 호환).

**스크린샷**:
- `e2e/screenshots/M0-1123-E-01-checkout-390.png` (신규) — 칩 높이 Pay 와 일치 · sublabel 없음 확인.
- `e2e/screenshots/M0-1123-E-02-success-scrolled-390.png` (신규) — Item #20 bottom marker 보임 · Next customer 하단 고정 확인.
- `e2e/screenshots/M3-1121-B-{02-checkout,03-success}-*.png` — UI 변경 반영.

## 버튼 높이 전후 (px · 390×844)

| 버튼 | before | after |
|---|---:|---:|
| Pay (기준) | 58 | 58 |
| Split | 58 | 58 |
| Takeaway 칩 | 58 | 58 |
| Pre-order 칩 | **84** (라벨+"DP today" 2 줄) | **58** |
| Delivery 칩 | **84** (라벨+"Addr. on checkout" 2 줄) | **58** |

## checkout·success 다른 버튼 감사 결과

조사 범위 (`app/checkout/**`, `components/payment/**`, `components/receipt/**`) 의 모든 버튼이 `@/components/ui/Button` (BUTTON_H = `min-h-[3.625rem]`) 또는 `OptionChip` tab variant (BUTTON_H 공유) 사용. Order type 칩 외에 Pay 와 높이가 다른 버튼 **없음**. 이 PR 로 전체 통일.

## 자기 검증 (로컬)

```
npx playwright test e2e/flows/M0-1123-E-checkout.spec.ts
# ✓ 1 passed (9.4s)

npx playwright test e2e/flows/M3-1121-B-btn-height.spec.ts -g "결제 완료|Checkout"
# ✓ 4 passed (6.7s)
```

M3-1121-B 중 `POS 홈 버튼 높이` / `M3-1121-C Hand over 기준` 4건 fail = M3-1123-A (Sell 탭) 가 `products-next-customer` testID 를 이전시킨 **선행 회귀** · 이 PR 밖 (M3 트랙 소관).

## 손대지 않은 파일 (dispatch 범위 밖)

`app/(tabs)/sell.tsx`, `components/cart/*`, `components/order-chips/*`, `api/hooks/draft-orders.tsx`, `components/RegisterBadge.tsx`, `components/cd-preview/*`.

## 운영 접근

없음.
