# M2-1105-AP 리포트 — POS Void 운영 실패 (`required_quantity`) 수정

## 원인 한 줄 + file:line
운영 Void 는 variant.manage_inventory=true · polyfill FulfillmentItem.inventory_item_id=null 조합에서 코어 cancelOrderFulfillmentWorkflow 가 `iitem.required_quantity` 를 undefined 에서 읽어 터진다 — `node_modules/.pnpm/@medusajs+core-flows@2.17.2*/dist/order/workflows/cancel-order-fulfillment.js:85-86` (`prepareCancelOrderFulfillmentData` 내 `iitems.find(i => i.inventory.id === fitem.inventory_item_id)` 가 undefined 반환 → `undefined.required_quantity`).

## 왜 테스트는 안 터졌나
`createTestOrder` (helpers.ts) 는 raw `orderModule.createOrders` 로 **variant_id 없이** line_item 을 만든다 → `order.items.*.variant` 가 null → workflow 안 `iitems` 가 undefined → `iitems?.length` 0 → 안전 분기로 흘러 크래시 없음. 운영 상품은 Admin 에서 재고 관리 ON (manage_inventory=true) + 옵션(Iced) 로 inventory_item 링크가 있어 조건 성립. 과거 11-07 로그 `fulfillment polyfill failed: FulfillmentItem.sku null` 과 같은 뿌리 (polyfill builder 가 line_item 에 inventory_item_id 힌트 없으면 null 로 채움).

## 재현 테스트 이름
`tenders.spec.ts` M0-1105-AB describe · **#82 (M2-1105-AP) variant↔inventory 링크 있는 polyfill fulfillment void → required_quantity 크래시 없이 성공** — productModule.createProducts (manage_inventory=true) + inventoryModule.createInventoryItems + link.create (ProductVariantInventoryItem, required_quantity=1) 시드 후 /tenders → /fulfill (폴백 경로로 inventory_item_id=null polyfill 생성) → /void. 수정 전엔 "Cannot read properties of undefined (reading 'required_quantity')" 400, 수정 후 200 + order canceled + fulfillment canceled_at.

## 수정 요약
- 신규 `apps/commerce-core/src/api/admin/pos/_shared/fulfillment-cancel.ts` · `cancelPosOrderFulfillment` helper. query.graph 로 fulfillment items + 각 line_item 의 variant.inventory_items 선조회 → 크래시 조건 사전 판정 (`willWorkflowCrashOnRequiredQuantity`).
- 터질 조건이 아니면 기존 `cancelOrderFulfillmentWorkflow` 그대로 호출.
- 터질 조건이면 **안전 fallback 삼단 원자** (반쪽 상태 금지):
  1. `inventoryModule.adjustInventory(+qty)` — fulfillment_item.inventory_item_id → line_item.metadata.inventory_item_id 순 force-restore (둘 다 없으면 애초 adjust 안 쳤을 것이므로 skip)
  2. `orderModule.cancelFulfillment({order_id, reference, reference_id, items, canceled_by})` — CANCEL_ITEM_FULFILLMENT 액션으로 order_item.fulfilled_quantity 복귀
  3. `fulfillmentModule.cancelFulfillment(id)` — canceled_at 세팅
- `void/route.ts` pendingFulfills 루프가 이 helper 로 교체 (기존 import `cancelOrderFulfillmentWorkflow` 삭제 · 에러 메시지 포장 유지).
- shipped/delivered 가드는 helper 안에서 명시적 throw (호출자 400 그대로).

## PR 번호
**#218** · https://github.com/CuriocityDevAi/storeport/pull/218 · base `main` · head `fix/m2-1105-ap-void-fulfillment-required-quantity`.

## Kyu 확인 항목
없음 — 운영 데이터 직접 조회 없이 코어 workflow 소스 (`node_modules/@medusajs/core-flows/dist/order/workflows/cancel-order-fulfillment.js:85-86`) 와 토스트 문구만으로 원인 확정. Merge 뒤 운영 iPad 에서 (1) 결제 → Void 가 200 응답 · "Order canceled · Receipt printed" 토스트 · (2) Admin → Orders 에서 해당 주문 status=canceled · fulfillment canceled_at 가 있는지 눈으로 1회만 봐 주시면 충분.

## 실행 로그
- `pnpm test:integration:pos` (round 1 · round 2 둘 다): tenders.spec 88 total — 1 passed (#82) · 73 skipped (실행 모드), M0-1105-AB subset 전건 15 passed. p6-e2e.spec 8/8 passed.
- `-t "#82"` 단독 실행 10.2s · `-t "M0-1105-AB"` 15 passed 17.2s.
- pre-commit 훅 (lint-staged + 6 unit suites 43 tests) 통과.

## 이연 순증감
- 신규 파일 1 · 수정 2.
- 제거: `void/route.ts` 가 `cancelOrderFulfillmentWorkflow` import 끊음 (더 이상 직접 호출 안 함) — helper 쪽으로 이동.
- 테스트 신규 1건 (#82) · 변경 0.
- 운영 데이터/CLI/SSH/키체인 접근 0 (지침 준수).

## 착지 명령 (아래 실행)
```
cp /tmp/M2-1105-AP-report.md ~/projects/curiocity-relay/m2/
cd ~/projects/curiocity-relay
git add m2/M2-1105-AP-report.md
git commit -m "m2: M2-1105-AP"
git pull --rebase --autostash origin main
git push
node scripts/claim.mjs M2-1105-AP done "PR #218 · cancel workflow `required_quantity` 크래시 사전 판정 + 안전 fallback 삼단"
```
