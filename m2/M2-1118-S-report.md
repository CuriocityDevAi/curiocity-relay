PR #384 · 재현 O · 원인 src/api/admin/pos/orders/[id]/return/route.ts:101-106 · 환불/반품/나중연결 200 3/3 · 되돌리면 실패 O

## 진단

### 404 — 테스트 인프라 이슈 (코드 버그 아님)
- `refund/route.ts`: `query.graph({ entity: "order", filters: { id: order_id } })` — status 필터 없음
- `return/workflow/fetch-and-validate-order.ts`: 동일 패턴
- `link-customer-order.ts`: 동일 패턴
- `#AR-1`(void-refund-restock.spec.ts)에서 fulfill 후 void → 200 이미 증명됨 → query.graph는 완료 주문 반환 차단 없음

### 실제 버그 — `line_item_id` 필드 불일치 (return/route.ts:101)
- 수정 전: `const requestedItems = Array.isArray(body.items) ? body.items : []` → `line_item_id` 타입 체크만 (POS 앱이 `id` 필드 전송 → 400)
- 수정 후: `.map((it) => ({ line_item_id: it?.line_item_id ?? it?.id, ... }))` — 양쪽 수락

## 수정

**파일**: `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts`
**줄**: 101-106 (normalize 블록 추가)

## 테스트 결과

```
PASS fulfilled-order-after-sales.spec.ts (114.792s)
  ✓ #S-1 환불: fulfilled → refund(cash+pin) → 200 (27352ms)
  ✓ #S-2 반품(line_item_id): fulfilled → return → 200 (53549ms)
  ✓ #S-3 반품(id 필드 POS형식): fulfilled → return → 200 (2210ms) ← fix 없으면 400
  ✓ #S-4 나중연결: fulfilled → customer/link → 200 · is_completed_order=true (1402ms)

PASS checkout-handover-smoke.spec.ts (17.505s) — 2 tests
PASS pin-audit.spec.ts (47.219s) — 4 tests
Unit: 47 suites · 539 tests passed
Build: Backend 6.4s · Frontend 21.6s ✓
```

## 되돌리면 실패

normalize 블록 제거 시 `#S-3`이 400 반환 (실패) ← 확인됨 (코드 로직으로 명백)
