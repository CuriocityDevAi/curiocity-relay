# M2-1124-N — 보고서

**판정: COMPLETE** · PR https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/250 · lint error 0 · tsc 신규 에러 0

---

## 구현 내역

| REQ | 위치 | 내용 |
|-----|------|------|
| 1 영수증 하단 | `components/receipt/ReceiptCard.tsx` | 맨 아래 `Order PIM26B1000` (testID=`receipt-custom-id`). `custom_display_id` 없으면 `order_display_id` fallback |
| 1 프린터 | `lib/printer/receipt-escpos.ts` | footer 아래·cut 전 동일 블록 |
| 2 주문 상세 | `app/orders/[orderId].tsx` | `Order #42` 아래 `PIM26B1000` 작게 (testID=`order-detail-custom-id`). `useOrder` fields 에 `+custom_display_id` 추가 |
| 3 목록 검색 | — | **서버 필요**: `/admin/pos/orders-list?q=PIM26B1000` 검색 미지원. `orders-list` 라우트 `q` 필터에 `custom_display_id` ILIKE 매칭 추가 필요 |

## 변경 파일

- `types/receipt.ts` — `Receipt.custom_display_id?: string | null` 추가
- `lib/pos-order-adapter.ts` — `PosOrderRow.custom_display_id?` 추가
- `api/hooks/orders.ts` — `useOrder` fields `+custom_display_id`
- `components/receipt/ReceiptCard.tsx` — 하단 label 블록
- `lib/printer/receipt-escpos.ts` — ESC/POS 하단 label
- `app/orders/[orderId].tsx` — 헤더 + ReceiptCard 주입
- `scripts/m2-1124-n-order-number-display-playwright.mjs` — e2e 하네스 자동 등록

## 금지 파일 미변경 확인

- `app/checkout/**` ✓ 미변경
- `app/(tabs)/sell.tsx` ✓ 미변경
- `SuccessReceiptAnim.tsx` ✓ 미변경

## CI 예상

- tsc: 기존 에러와 동일 (신규 0)
- lint: error 0 (기존 require() warning 1개는 pre-existing)
- playwright m2-1124-n: 주문 상세 헤더 + ReceiptCard 하단 label 검증

## Kyu 실기 항목

1. 닉네임 설정 매장 → 신규 주문 → 영수증 하단 `Order PIM26BXXXX` 확인
2. 닉네임 미설정 → 영수증 하단 `Order 42` (숫자 fallback) 확인
3. Orders 탭 → 주문 상세 헤더에 `PIM26BXXXX` 작게 확인
4. 구 주문 (custom_display_id=null) → 헤더 미노출 확인
