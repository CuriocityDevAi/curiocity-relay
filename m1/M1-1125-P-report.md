PASS

## M1-1125-P — 원장 대사: 손님화면 영수증 = POS · line_total → total 필드명 단일화

### 필드 표 (snapshot.items vs snapshot.receipt.items)

| 경로 | 타입 | 필드명 | 파일:줄 (변경 전→후) |
|------|------|--------|----------------------|
| `snapshot.items[]` (legacy CD) | `SnapshotItem` | `total` | `packages/receipt-view-model/src/order-snapshot.ts:14` (변경 없음) |
| `snapshot.receipt.items[]` | `ReceiptItem` | ~~`line_total`~~ → **`total`** | `packages/receipt-view-model/src/order-snapshot.ts:24` |
| `OrderLineForReceipt` (receipt module 내부 입력) | 내부 타입 | `line_total` | `apps/commerce-core/src/modules/receipt/service.ts:65` (변경 없음) |

**정책: CD(손님화면)가 읽는 이름 = `total` 하나.**  
`snapshot.items[].total` ← M0-1125-K 가 확립  
`snapshot.receipt.items[].total` ← 이 PR 에서 단일화

### 공용 타입 위치

- **공용 정의**: `packages/receipt-view-model/src/order-snapshot.ts` — `SnapshotItem` · `ReceiptItem`
- **M0-1125-K 와 합칠 위치**: 동일 파일. `CdSnapshotItem` (snapshot-item.ts) 과 `ReceiptItem` 을 한 곳으로 통합 가능.
- `apps/customer-display/src/types/order-snapshot.ts` — `SnapshotItem` · `ReceiptItem` 로컬 정의 제거 → `@storeport/receipt-view-model` re-export
- `apps/commerce-core/src/types/customer-display.ts` — 동일

### 변경 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `packages/receipt-view-model/src/order-snapshot.ts` | `ReceiptItem.line_total` → `total` |
| `packages/receipt-view-model/src/receipt-view.ts` | `it.line_total` → `it.total` |
| `apps/customer-display/src/types/order-snapshot.ts` | `SnapshotItem` · `ReceiptItem` re-export from packages |
| `apps/commerce-core/src/types/customer-display.ts` | 동일 |
| `apps/commerce-core/src/modules/receipt/service.ts` | `buildSnapshot` 출력 `line_total → total` |
| `apps/commerce-core/src/workflows/pos-fulfill/steps/mint-sale-receipt.ts` | subtotal 체크 `> 0` → `!= null` (100% 할인 폴백 수정) |
| `apps/customer-display/src/mocks/adapter.ts` | `line_total: it.total` → `total: it.total` |
| `apps/commerce-core/src/admin/routes/pos-settings/lib/previewSnapshot.ts` | `line_total:` → `total:` |

### 테스트

- non-blocking 테스트 추가:
  - `receipt-passthrough.unit.spec.ts`: `subtotal === 0` 폴백 없음 · 할인 품목 `total` 보존 · `discount_total` 패스스루
  - `packages/receipt-view-model/tests/receipt-view.test.ts`: 동일 케이스
- 65 unit suites · 732 tests green

### CI

- Push: `1badbd4` → `feat/M1-1125-N-cd-receipt-full-snapshot`
- PR #437 본문 업데이트 · R0 리뷰 CHANGES 대응 댓글 추가
- 셀프 머지 없음
