# M3-1105-AA — 결제 완료 영수증 레이아웃 (상세와 동일 폭·버튼 영수증 아래 중앙)

## 원장 대사
Kyu 11-10 10:33 iPad 실기 — "Payment successful 화면의 영수증이 Order 상세 맨 아래 영수증(가운데 정렬 · 좌우 더 넓음)보다 어색함 → **Order 상세 영수증과 같은 크기·형태로 통일**. Hand over / Reprint / Share / View order 가 너무 오른쪽에 치우침 → **영수증 아래로 · 중앙 정렬**. 캐셔는 스크롤해서 버튼을 만남(영수증을 한 번 더 확인하라는 취지)."

11-09 M3-1105-V ③ "wide 2열 / narrow 하단 고정 바" 정본 **대체**. M3-1105-Z 는 투입 전 폐기 (Fulfill 버그 진단 R0-1105-AP 뒤 재발부).

## 결정
- 폰·iPad 세로·가로 전부 **1열 ScrollView** · 영수증(공용 래퍼 `ReceiptSection`) 아래 Hand over → Reprint/Share/View order 세로 흐름 · 중앙 정렬.
- 영수증 폭 상수 `RECEIPT_MAX_WIDTH = 420` 을 새 공용 래퍼 1곳에서만 정의. `ReceiptCard` 내부 maxWidth 420 과 일치 (값 복사 아님 · 라운드 다음 라운드에서 `ReceiptCard` 를 래퍼 constant 로 치환할 여지).
- `ScrollView` 는 영수증 + 버튼을 함께 스크롤 — 캐셔가 스크롤하는 중 영수증을 다시 한 번 눈으로 확인한 뒤 Hand over 를 누름.

## 변경 파일 (fork master 77b930c · fix/m3-1105-aa-success-layout)

| 파일 | 변경 |
|---|---|
| `components/receipt/ReceiptSection.tsx` | **신규** — 공용 섹션 래퍼. `RECEIPT_MAX_WIDTH = 420` export · `alignSelf: 'center'` · 선택적 `label` / `children`. |
| `components/payment/SuccessReceiptAnim.tsx` | wide/narrow 분기 (useWindowDimensions · WIDE_BREAKPOINT · success-wide · success-actions-column · success-actions-bottombar) 전부 제거. 1열 ScrollView + `<ReceiptSection>` 안에 영수증 + 버튼 세로 흐름. Reanimated slide-in / check mark 유지. |
| `app/checkout/success/[orderId].tsx` | 변경 없음 (SuccessReceiptAnim 교체로 간접 적용). Hand over 로직 · 토스트 문구 `Product handed over to the customer.` 유지. |
| `app/orders/[orderId].tsx` | **1 JSX 요소 교체**: `<View className="mt-4 gap-3" testID="order-receipt-section">` → `<ReceiptSection label="Receipt" className="mt-4" testID="order-receipt-section">`. import 1 줄 추가. |
| `scripts/m3-1105-aa-assertions.mjs` | **신규** — 32 어설션 (ReceiptSection · orders detail · success 1열 · 금지 testID 재발 가드 · Hand over 토스트 보존 · receipt-layout LOGO 불변). |
| `scripts/m3-1105-v-assertions.mjs` | ⑤ Success 2열/하단바 섹션 삭제 → M3-1105-AA 정본 재발 가드로 교체 (success-wide/success-actions-column/success-actions-bottombar/WIDE_BREAKPOINT 재발 금지). |
| `scripts/m3-1105-w-screenshots.mjs` | 성공 2열(03)·하단바(04) 스샷 블록 제거. 헤더 주석 업데이트. Pre-order picker 2 장만 유지. |
| `scripts/m3-1105-aa-screenshots.mjs` | **신규** — Playwright 3 장: iPad landscape 1180×820 · iPad portrait 820×1180 · phone 390×844 (버튼 영역까지 스크롤). |

## 금지 파일 확인 (미변경)
- `components/orders/FulfillSheet*` ✓
- `api/hooks/**` ✓
- `lib/printer` ✓
- `lib/receipt-layout.ts` 상수값 (LOGO.maxHeightPx 110 · maxWidthRatio 0.8) ✓
- `components/receipt/ReceiptCard.tsx` ✓ (maxWidth 420 유지)

## 어설션 결과

```
node scripts/m3-1105-aa-assertions.mjs
32/32 passed · 0 failed

node scripts/m3-1105-v-assertions.mjs
30/30 passed · 0 failed

node scripts/run-all.mjs assertions
총 22 개 · 22 PASS · 0 FAIL · 22.0s
  (m2-1105-q-bundle-guard.mjs — Metro iOS 번들 해석 포함)
```

## 스크린샷 (dist 재빌드 뒤 캡처)

- `screenshots-m3-1105-aa/01-success-ipad-landscape-1180x820.png` — iPad 가로. 영수증 중앙, Hand over(검정 solid), Reprint/Share/View order 가로 3열, 모두 영수증 폭(420px) 과 동일.
- `screenshots-m3-1105-aa/02-success-ipad-portrait-820x1180.png` — iPad 세로. 동일한 1열 구조. 하단 고정 바 없음.
- `screenshots-m3-1105-aa/03-success-phone-390x844-scrolled.png` — 폰. 영수증 → 버튼까지 스크롤한 컷. Hand over 큰 solid · 3개 보조 버튼 한 줄.

## PR 본문 확인(실기) 항목

1. iPad 가로 1180×820 · `/checkout/success/{orderId}?receiptId=<id>` 진입 → 영수증 중앙 · Hand over 가 영수증 바로 아래 가운데 · Reprint/Share/View order 가 Hand over 아래 한 줄로.
2. iPad 세로 820×1180 · 동일 경로 → 1열 유지 · 하단 고정 바 없음 · 영수증 아래로 스크롤하면 버튼이 뒤따라옴.
3. 폰(약 390 폭) · 스크롤하면 버튼 등장 · Hand over tap → 토스트 `Product handed over to the customer.` · `/products` 로 교체 네비.
4. 주문 상세(`/orders/{orderId}`) 의 Receipt 섹션과 Payment successful 의 영수증이 **같은 폭**.
5. `success-wide` / `success-actions-column` / `success-actions-bottombar` 어느 testID 도 DOM 에 없음.

## 삭제 사유 (M3-1105-V ⑤)
M3-1105-W (#66) 의 "wide 2열 / narrow 하단 고정 바" 정본은 Kyu 11-10 iPad 실기로 사용자 불편이 확인되어 폐기. 대체 정본은 폰·iPad 세로·가로 전부 1열 ScrollView · 영수증 아래 세로 버튼. M3-1105-V ⑤ 어설션은 M3-1105-AA 정본 재발 가드(2열/하단바 testID 재등장 금지)로 교체.

## Hand over 동작
- M3-1105-AA 는 레이아웃 정본 교체만 담당. `useFulfillOrder.mutateAsync({ order_id })` 호출 경로 · 토스트 문구 · 네비게이션 (`router.replace('/products')`) 전부 변경 없음.
- Fulfill 자체 버그 진단은 R0-1105-AP 가 맡는다 — M3-1105-Z 는 투입 전 폐기, R0-AP 뒤 재발부 예정.
