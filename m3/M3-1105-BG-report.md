# M3-1105-BG Report — nav cleanup · pill back · View order → Orders tab

## 변경 요약

| 항목 | 내용 |
|------|------|
| PR | #113 `feat/m3-1105-bg-nav-cleanup` |
| vitest | 99 passed · 6 expected fail (10 files) |
| lint | 0 errors (변경 파일 기준) |
| E2E | `e2e/flows/03-nav-cleanup.spec.ts` 추가 (웹 빌드 후 실행) |

## N1 — 뒤로가기 위·아래 이중

- **Checkout** `< Cart` 알약 버튼 추가 (`app/checkout/[draftOrderId].tsx`) — 아래 Back to cart 유지.
- **Payment successful** 상단 뒤로가기 **제거** — Done / Hand over 로만 나가기. 이유: 결제 후 Checkout 은 Pay 비활성 상태이므로 돌아가도 무의미하고 사용자가 길을 잃음.
- 나머지 결제 흐름 화면은 이미 위(알약) · 아래(Cancel/Back) 두 개 있음 — 이번 N2 작업으로 위 버튼이 커스텀 pill 로 교체됨.

## N2 — 타이틀 격침 (겹침 → 0)

headerShown: false 로 전환 + `PillBackButton` 컴포넌트 삽입:

| 화면 | pill label |
|------|------------|
| Cash / Card / Pre-order DP / Delivery payment / Collect balance (`tender-cash`) | `Checkout` (Collect balance 는 `Order`) |
| Split payment (`split-tender`) | `Checkout` |
| Delivery info (`delivery`) | `Checkout` |
| Payment successful (`success`) | 없음 (N1) |

새 파일:
- `components/icons/chevron-left.tsx` — lucide ChevronLeft 래퍼
- `components/ui/PillBackButton.tsx` — `bg-surface-muted` 알약 · `testID="pill-back-{label}"` · 버튼 디자인 변경 없음

## N3 — View order → Orders 탭

`app/checkout/success/[orderId].tsx` `onViewOrder`:
```
router.replace('/(tabs)/orders');   // checkout 스택 초기화 · Orders 탭 전환
router.push('/orders/[orderId]', …); // 주문 상세 모달 오픈
```
상세를 닫으면(Done / 스와이프) Orders 목록 표시. Checkout 화면 재노출 경로 없음.

## 스샷 경로 (Playwright 웹 빌드 후)

- `e2e/screenshots/03-cash-tender-header.png`
- `e2e/screenshots/03-payment-successful-header.png`
- `e2e/screenshots/03-view-order-orders-tab.png`
- `e2e/screenshots/03-orders-list-after-close.png`

## CI

vitest 99/99 ✓ · lint 0 errors ✓ · PR #113
