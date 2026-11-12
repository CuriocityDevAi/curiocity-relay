# M0-1105-BF — 부분 환불 "언제든" 서버 쪽 리포트

**브랜치**: `feat/m0-1105-bf-partial-refund-anytime` (main 에서 분기 · QRIS #228/#229 와 별개)
**커밋**: `ee8fc67` on `main..` (base `2afb5be`)
**PR**: [#230](https://github.com/CuriocityDevAi/storeport/pull/230)
**CI run**: https://github.com/CuriocityDevAi/storeport/actions/runs/43203413144 (in_progress · feature-map-check success)

## 1) 진단 표 (서버 변경 전)

| 시나리오 | 경로 | 상태 | 파일:줄 |
|---|---|---|---|
| (a) 같은 교대 완결 주문 부분 환불 | `POST /admin/pos/orders/:id/return` | **됨** (line 비율 배분 · 재고 +qty) | `return/route.ts:306-318, 640-657` |
| (b) 미출고 품목 부분 취소 (선주문 Fulfill 전) | 동 경로 | **반쪽** (환불 OK · In stock 과잉 복구 · reservation 남음) | `return/route.ts:640-657` |
| (c) 선주문 계약금만 낸 주문 부분 환불 | `/refund` | **막힘** (전액만) · scope 밖 | `refund/route.ts:195` |

**결론**: (a) 는 서버 변경 0 (앱만). (c) 는 전액은 `/refund`, 품목 지정은 `/return` 로 커버. **이번 라운드 서버 변경 핀포인트 = (b)**.

## 2) 대사표 (Medusa 코어 있음 / 우회 / 신규)

| 기능 | 소스 |
|---|---|
| line 환불 금액 비율 배분 (세금 포함 · #224 Path D 정합) | 기존 (`return/route.ts:306-318`) |
| refundPaymentWorkflow + S3 CASH-first | Medusa 코어 + 기존 route |
| 품목별 fulfillment 상태 판정 | **신규 route 내** (fulfilled qty map) |
| fulfilled → `inventoryModule.adjustInventory(+qty)` | 기존 경로 |
| **unfulfilled → reservation 삭제/축소** | **신규 route 내** (`listReservationItems` + `deleteReservationItems` / 부분은 `createReservationItems(leftover)`) |
| 영수증 · 매니저 PIN · Cash Movement · split-payment | 기존 그대로 |

**Medusa 코어 claim/createReturn/cancelOrderLineItem** 은 fulfillment 기반 사후 처리 모델 → POS 선주문 (custom-written line + polyfill fulfillment) scope 에 안 맞음. inventory 모듈 직접 호출로 RPO 축소.

## 3) M3 앱이 쓸 엔드포인트 계약

**Request** (기존과 동일 · 확장 없음):
```
POST /admin/pos/orders/:id/return
{
  "items": [{ "line_item_id": string, "quantity": int>0 }, ...],
  "method": "card_terminal" | "cash",
  "manager_pin"?: "0000",                 // cash 필수
  "terminal_approval_code"?: "123456",     // card_terminal 필수
  "register_session_id": "regs_...",
  "reason"?: string
}
```

**Response** (BF 추가 필드 **굵게**):
```jsonc
{
  "ok": true,
  "order_id": "...",
  "return_id": "ret_...",
  "items": [
    // 한 line_item 이 fulfilled + unfulfilled 섞이면 두 행으로 분리 보고.
    { "line_item_id": "li_a", "quantity": 1, "amount": 10000, "disposition": "returned" },
    { "line_item_id": "li_b", "quantity": 1, "amount": 20000, "disposition": "canceled_unfulfilled" }
  ],
  "refunded_amount": 30000,
  "method": "cash",
  "refund_distribution": [{ "payment_id": "pay_...", "method": "cash", "amount": 30000 }],
  "tender_results": [...],
  "status": "completed",
  "receipt_id": "...",
  "receipt_no": "...",
  "cash_movement_id": "...",
  "open_drawer": true,
  "inventory_restored": true,     // fulfilled 품목 실제 +qty 걸림
  "reservation_released": true    // unfulfilled 품목 reservation 삭제 걸림
}
```

**규약**:
- `items[].disposition` 값 2종: `returned` (출고 뒤 반품 · In stock 복원) · `canceled_unfulfilled` (미출고 품목 · reservation 만 해제 · In stock 불변).
- mixed line 은 **두 행 분리 보고** → M3 UI 가 각 행 뱃지 달리.
- 나눠 결제 환불은 **CASH-first** (`refund_distribution`), 기존 S3 규칙 그대로.
- **CASH 포함 → manager_pin 필수** (기존).

## 4) 테스트 (CI run 으로 판정)

**파일**: `apps/commerce-core/integration-tests/pos/partial-refund-anytime.spec.ts`

- **#BF-1** 선주문 qty=3 중 1 취소 → Stocked 변화 X (50) · Reserved -1 (3→2) · 남은 2 Fulfill 정상 (48/0) · `disposition='canceled_unfulfilled'` 단독.
- **#BF-2** 혼합 (라인 A fulfilled · 라인 B unfulfilled) · 두 라인 환불 요청 → A restore (49→50) · B reservation release (Reserved 1→0 · Stocked 50 불변) · items[] 에 `returned` + `canceled_unfulfilled` 양쪽 반환.
- **#BF-3** 선주문 qty=2 전액 (Void 동등) → Stocked 그대로 (50) · 모든 reservation 해제 (Reserved 2→0) · refunded_amount = 결제 전액 (30,000).

**로컬 typecheck**: PASS (`npx tsc --noEmit` exit=0).
**로컬 unit tests**: PASS (48/48 · pre-commit 실행).
**CI run**: https://github.com/CuriocityDevAi/storeport/actions/runs/43203413144 · [#230](https://github.com/CuriocityDevAi/storeport/pull/230).

## 5) 변경 파일

- `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts` — 품목별 fulfillment 분기 추가 (fulfilledQtyPerLine · lineSplits · reservation 삭제/축소 · fulfilled restore · 응답 items[].disposition + reservation_released + metadata.returns persist 확장).
- `apps/commerce-core/integration-tests/pos/partial-refund-anytime.spec.ts` — 신설.
- `docs/feature-map.yaml` — `pos-void-refund` 요약에 BF 추가.
