# M1-1105-AK Report

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/79

## Kyu 실기 항목
- 배달 결제 → 완료 화면에 Hand over 없음·Done 버튼 + "Awaiting dispatch — dispatch it from Orders when the courier picks up."
- 선주문(전액) → 완료 화면에 Hand over 없음·Done + "Awaiting pickup — fulfil it from Orders when the customer comes."
- 선주문(계약금) → "Deposit paid — collect the balance at pickup."
- Orders 목록에 Awaiting dispatch 칩 (warning 토큰, raw hex 없음)

## 변경 사항

### `lib/order-status-label.ts` (신규)
순수 함수 `orderStatusLabel(order)`:
- `completed` → "Completed"
- `canceled` → "Canceled"
- `delivery` + `payment_status=captured` + `fulfillment_status!=fulfilled` → "Awaiting dispatch"
- `preorder` + `payment_status=partially_captured` → "Deposit paid"
- `preorder` + `payment_status=captured` + `fulfillment_status!=fulfilled` → "Awaiting pickup"
- 그 외 → Medusa status 첫 글자 대문자

### `components/payment/SuccessReceiptAnim.tsx`
- props 추가: `isDepositOnly`, `onDone`
- `takeaway`: 기존 Hand over 버튼 유지
- `delivery/preorder`: Hand over 제거, 안내 문구(`testID="success-hint"`) + Done 버튼(`testID="done"`) 렌더

### `app/checkout/success/[orderId].tsx`
- `order_type` 을 `receiptQuery.data.snapshot.order_type` 에서 읽음 (기존 `"takeaway"` 하드코딩 제거)
- `isDepositOnly`: `preorder` + `preorder.balance_due > 0`
- `onDone`: `() => router.replace('/products')`

### `app/(tabs)/orders.tsx`
- `import { orderStatusLabel }` 추가
- `OrderStatusLabelChip` 인라인 컴포넌트: warning(대기)/success(완료)/muted(기타) 토큰
- Order 목록 행 상단 칩 열에 `<OrderStatusLabelChip order={item} />` 추가

## 테스트 결과

### 단위 테스트 (`vitest`) — 실행 완료
```
 Test Files  1 passed (1)
      Tests  13 passed (13)
   Duration  162ms
```

### 단위 테스트 케이스 표

| status | payment_status | fulfillment_status | order_type | expected |
|--------|---------------|--------------------|------------|----------|
| completed | any | any | any | Completed |
| canceled | any | any | any | Canceled |
| pending | captured | not_fulfilled | delivery | Awaiting dispatch |
| pending | captured | fulfilled | delivery | Pending |
| pending | awaiting | not_fulfilled | delivery | Pending |
| pending | captured | not_fulfilled | preorder | Awaiting pickup |
| pending | partially_captured | not_fulfilled | preorder | Deposit paid |
| pending | captured | fulfilled | preorder | Pending |
| pending | captured | not_fulfilled | takeaway | Pending |
| requires_action | awaiting | not_fulfilled | takeaway | Requires_action |

### 버튼 노출 표 (UI 어설션)
| order_type | hand-over | done |
|-----------|-----------|------|
| takeaway | ✓ visible | ✗ |
| delivery | ✗ (0) | ✓ visible |
| preorder | ✗ (0) | ✓ visible |

**미검증**: @testing-library/react-native 미구성으로 UI 컴포넌트 테스트 미실행.

### Playwright 스샷
**미검증**: expo start --web + Playwright 미구성으로 미실행.
