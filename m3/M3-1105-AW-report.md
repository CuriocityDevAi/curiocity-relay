# M3-1105-AW 착지 보고서

날짜: 2026-11-12  
브랜치: `fix/m3-1105-aw-void-ui`  
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/98  
어설션: 53/53 pass (`node scripts/m3-1105-aw-assertions.mjs`)

---

## 항목별 완료 현황

| # | 항목 | 주요 파일 | 커밋 |
|---|------|-----------|------|
| R1 | 재고 available_quantity 우선 | `lib/inventory.ts` · `api/hooks/products.ts` · `app/product-details.tsx` | `821d897` |
| R6 | OrderStatus Captured→Paid | `components/ui/OrderStatus.tsx` | `d803fa4` |
| R7 | extractTenders type + TendersTable Type 열 | `api/hooks/pos-orders.ts` · `components/orders/TendersTable.tsx` | `ae65480` |
| R2/R9 | Verify 버튼 제거 | `components/orders/ManagerPinSheet.tsx` · `VoidRefundSheet.tsx` | `6cf7017` |
| R8 | void toast 형식 | `components/orders/VoidRefundSheet.tsx` | `6cf7017` |
| A안 | restock step + RefundRequestBody.restock | `lib/refund-rules.ts` · `VoidRefundSheet.tsx` | `6cf7017` |
| R10 | 버튼 가시성·Done·pos_totals | `app/orders/[orderId].tsx` | `2ef4d08` |
| R12 | VOID 배너 text-ink | `components/receipt/ReceiptCard.tsx` | `63cc3cb` |
| fx | Fixtures 3종 | `fixtures/pos-void-restock-200.json` 외 | `7acb652` |
| as | Assertions 53개 | `scripts/m3-1105-aw-assertions.mjs` | `4eb5503` |
| av | 기존 assertion 호환 | `scripts/m3-1105-aj/an/x-assertions.mjs` | `1ba523d` |

---

## 서버 fixture 대조 여부

| Fixture | 대조 여부 |
|---------|-----------|
| `payments[].refunds[]` (M0-1105-AR) | 서버 미착 — `metadata.void` fallback 합성으로 backward-compatible |
| `pos_totals` (M0-1105-AR) | 서버 미착 — `metadata?.pos_totals` 옵셔널 접근, 없으면 행 렌더 안 함 |
| `restock` in void body | fixture 완성 (pos-void-restock-200/400) |

---

## Kyu 확인 항목

1. **R1**: Product Detail 재고 숫자가 "Available"(예약 차감) 기준인지 iPad/웹 실기 확인
2. **A안**: Void → PIN 완료 후 재고 질문 시트 나타나는지 — `handedOver=true` 주문 필요
3. **R7**: 주문 상세 Payments 테이블에 Type 열(Sale/Void) + Paid 레이블 확인
4. **M0-1105-AR**: 서버가 `payments[].refunds[]` 올리면 fallback 로직 비활성화 (자동) — 서버 contract 착 후 재검

---

## git ls-tree 증거

```
scripts/m3-1105-aw-assertions.mjs
fixtures/pos-void-restock-200.json
fixtures/pos-void-restock-400.json
fixtures/pos-order-payments-refunds.json
lib/inventory.ts
api/hooks/products.ts
app/product-details.tsx
components/ui/OrderStatus.tsx
api/hooks/pos-orders.ts
components/orders/TendersTable.tsx
lib/refund-rules.ts
components/orders/VoidRefundSheet.tsx
components/orders/ManagerPinSheet.tsx
app/orders/[orderId].tsx
components/receipt/ReceiptCard.tsx
```
