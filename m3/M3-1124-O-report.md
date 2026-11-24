PASS

# M3-1124-O — Checkout B안 · tender 제목 · View Cart X 44pt

- 브랜치: `feat/M3-1124-O-checkout-b` (origin master `4efa05b` 에서 분기)
- 커밋: `e89b979` (feat/M3-1124-O-checkout-b)
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/254
- 리포: `CuriocityDevAi/agilo-medusa-pos-fork`
- 모델: Opus · 소요 ~45 분

## REQ 대조

| # | REQ | 구현 파일 | 상태 |
|---|-----|-----------|------|
| 1 | Cart Pay → **Checkout** | `components/cart/CartPanel.tsx` (lines 615, 692) | ✅ |
| 2 | Checkout B안 — Cash/Card/QRIS 3 버튼 + "Pay in parts" 링크 · 아이콘 재사용 · 한 단계 생략 | `app/checkout/[draftOrderId].tsx` · `app/checkout/tender-cash/[draftOrderId].tsx`(method param) · `app/checkout/delivery/[draftOrderId].tsx`(passthrough) | ✅ |
| 3 | Tender 제목 Cash/Card/QRIS payment | `app/checkout/tender-cash/[draftOrderId].tsx` (lines 285, 339–345) · `app/checkout/tender-qris/[draftOrderId].tsx:314` | ✅ |
| 4 | Cart X 44pt 원형 + 피드백 | `components/cart/CartSheet.tsx:95` (Pressable h-11/w-11 rounded-full + opacity/scale) | ✅ |
| 5 | 회귀 0 (split/qris sim/cash quick/delivery/preorder) | 기존 splitDisabled · PaymentMethodTabs · tender flows 그대로 · method param 은 탭 초기값만 | ✅ |
| 색 | 시맨틱 토큰만 | `TOKEN_ON_INK` from `constants/brand.ts` · raw hex 금지 | ✅ |

### ⛔ 수정 금지 영역 (검증)
- `app/checkout/success/*` (M3-1124-M/#252 리뷰 중) — 미수정 ✅
- `api/hooks/draft-orders.tsx` (#253 리뷰 중) — 미수정 ✅
- 우측 상단 손님 번호 상태 칸 · Ask phone (라운드 2) — 미수정 ✅
- 손님 화면 앱 (storeport) — 미수정 ✅

## 하네스 실행 로그

### 1) Lint (expo lint)
```
✖ 67 problems (0 errors, 67 warnings)
```
→ **error 0** (요구사항 충족). 잔여 warning 은 기존 master 와 동일.

### 2) Vitest (unit)
```
Test Files  2 failed | 73 passed (75)
Tests       3 failed | 977 passed | 6 expected fail | 3 todo (989)
```
→ 3 실패는 **master 에서도 동일하게 실패**(사전 존재 결함, M3-1124-O 와 무관).
- `__tests__/m2-1119-s-pos-slip-fixes.test.ts > REQ 2: Next customer 버튼 헤더 우상단 배치`
- `__tests__/m2-1119-s-pos-slip-fixes.test.ts > SuccessReceiptAnim 에서 Next customer 버튼 제거됨`
- `__tests__/m3-1119-o-cd-emit.test.ts > success/[orderId].tsx revertDisplayToPaid 도 order_id 포함`

이 3 테스트는 success/[orderId].tsx · SuccessReceiptAnim.tsx 대상. 이번 PR 은 둘 다 **미수정**. master checkout 후 재실행하여 동일 실패 확인됨.

### 3) Playwright (`e2e/flows/M3-1124-O-checkout-b.spec.ts`) — 신규
```
Running 5 tests using 1 worker
  ✓  1 › M3-1124-O · Checkout B안 — Cash/Card/QRIS 3 버튼 · Pay in parts 링크 (1.2s)
  ✓  2 › M3-1124-O · method=cash → tender 제목 "Cash payment" (1.1s)
  ✓  3 › M3-1124-O · method=card → tender 제목 "Card payment" (1.1s)
  ✓  4 › M3-1124-O · method=qris → tender 제목 "QRIS payment" (1.6s)
  ✓  5 › M3-1124-O · Cart X 버튼 44pt 터치 + accessibility — source 가드 (795ms)
  5 passed (7.2s)
```

### 4) Playwright 회귀 (갱신된 기존 하네스)
```
  ✓  M1-1117-D · iPad 가로(1180×820) — 높이·라운딩 측정 및 어설션 (1.6s)
  ✓  M1-1117-D · 화면 분할(590×820) — 높이·라운딩 측정 및 어설션 (1.2s)
  ✓  M0-1123-E · 20개 품목 success 영수증 스크롤 + 칩 높이 (9.5s)
  ✓  03-nav-cleanup · N2: Cash tender · Payment successful · N3 Orders 복귀 (×4) (3.4s 이하)
  ✓  M3-1121-B · Checkout 칩 · Split/Pay 높이 — phone-390w / ipad-1180w (1.2s)
  ✓  M3-1121-B · 결제 완료 헤더 · Hand over 높이 — phone-390w / ipad-1180w (1.1s)
  ✘  M3-1121-B · POS 홈 버튼 높이 — phone-390w / ipad-1180w (products-next-customer 미존재 · master 동일)
  ✘  M3-1121-C · Hand over 기준 ±2px — phone-390w / ipad-1180w (products-pickup 미존재 · master 동일)
  11 passed · 4 failed
```
→ 4 실패 모두 **홈 화면(Sell/Products 탭)**: `products-next-customer`, `products-pickup`, `products-close` testID. grep 결과 `app/(tabs)/products.tsx:277` 에만 존재 — 현 default 탭은 `/sell` 이므로 하네스 기대값과 불일치. **M3-1124-O 와 무관** (체크아웃 화면은 전부 통과).

## 스샷 (6장)

- `e2e/screenshots/M3-1124-O-01-checkout-b.png` — Checkout B안 (Cash/Card/QRIS 3 버튼 + Pay in parts)
- `e2e/screenshots/M3-1124-O-02-cash-payment.png` — "Cash payment" 머리글
- `e2e/screenshots/M3-1124-O-03-card-payment.png` — "Card payment" 머리글
- `e2e/screenshots/M3-1124-O-04-qris-payment.png` — "QRIS payment" 머리글
- `e2e/screenshots/M3-1124-O-05-checkout-header.png` — Checkout 머리글 가드
- `e2e/screenshots/M3-1124-O-05-home-portrait.png` — 세로 phone 홈 (Cart 진입용)

Cart X 버튼 실샷은 세로 BottomSheet 가 draftOrder 활성 세션 세팅을 요구해 하네스 모의로 재현 불가 — 소스 가드(testID=cart-sheet-close, h-11 w-11 rounded-full, Pressable opacity/scale 피드백, accessibilityLabel) 로 대체.

## 어설션 파일

- 신규: `e2e/flows/M3-1124-O-checkout-b.spec.ts` (5 tests)
- 갱신: `e2e/flows/M0-1123-E-checkout.spec.ts`, `e2e/flows/M1-1117-D-measure.spec.ts`, `e2e/flows/M3-1121-B-btn-height.spec.ts`, `e2e/flows/03-nav-cleanup.spec.ts`

## 기술 선택지 — 권장안

**B1**: `method` route param 으로 tender-cash 탭 초기값 pre-select — 기존 PaymentMethodTabs/CashTenderPanel/CardTenderPanel/QrisTenderPanel/split-tender 로직 재사용, balance/preorder/delivery 흐름 영향 0. ✔ 채택.

- B2: tender 별 route 분리 (`/tender-cash`, `/tender-card`, `/tender-qris`) — 중복 로직 증가, split/balance 전환 비용 큼. ✗
- B3: 체크아웃에서 바로 POST tenders — 에러 복구 UI/오프라인 가드 중복. ✗

## 미검증 / 비고

- Cart sheet X 버튼 실샷 — 하네스에서 draftOrder 활성 세션 재현 비용 큼 → 소스 가드로 대체.
- QRIS 시뮬레이트 end-to-end 는 신규 B안 변경과 무관(QrisTenderPanel 미수정) → 기존 05-qris-payment / 07-qris-simulate-bk 하네스 유효.
- 선주문(preorder) pickup 가드 overlay 는 `preorderMissingPickup` 플래그 그대로 유지 — Pay in parts 링크도 `splitDisabled` 로 함께 비활성.
