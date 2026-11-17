PR #350 · fulfill route 276줄→284줄 · 영수증·인계 시각 step

## M2-1117-Z — W4b 출고 나머지 (영수증 mint · handed_over_at step)

### 변경 요약

- **Step 5 — recordHandoverAtStep**: `handed_over_at` no-overwrite 보호.
  - `updateMetadataStep` 에서 분리; eligible=false 시 no-op.
  - 이미 찍혔으면 DB write 없이 기존 값 반환.
- **Step 6 — mintSaleReceiptStep**: `kind: 'sale'` 영수증 발행 (비치명).
  - `metadata.tenders` 집계 사용; 실패 시 swallow → receipt_id=null 반환.
- fulfill route: `register_session_id` pass-through + response에 `handed_over_at`, `receipt_id`, `receipt_no` 추가.

### 테스트

- 483 passed (41 suites) · 신규 fail 0
- 신규 단위 테스트 6건 (recordHandoverAt 3 + mintSaleReceipt 3)

### REQ 3 메모 (Todoboss pickup complete 이벤트)

Todoboss pickup complete 이벤트에 필요한 필드 (구현 없음 · 메모):
- `order_id`: 주문 ID
- `handed_over_at`: `metadata.fulfillment.handed_over_at` (recordHandoverAtStep 기록)
- `store`: `stock_location_id` → 로케이션 이름 (pos_settings 에서 조회 가능)
