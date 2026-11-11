# R0-1105-BU · storeport #219 리뷰 리포트 (M0-1105-AQ · POS Hand over 재고 차감 0회 뿌리 수정)

## 판정

**APPROVE** — M0 결론("운영은 Hand over 때 adjustInventory 스킵 · reservation 만 release → 재고 차감 0회") 코어 소스로 독립 검증됨 · 수정은 reservations 를 정본으로 adjustInventory **정확히 1회** + polyfill FulfillmentItem.inventory_item_id 채움 · 이중 차감 가드 3중 (hand_over fulfilled row idempotency · `stockAlreadyDeducted` · `inventory_decremented_at` persist) · #218 와 직교 (뿌리 vs 안전망) · 머지 순서 **#219 → #218** 타당 · CI 초록 · 기존 테스트 약화 0.

## 1) M0 결론 독립 검증 (코어 소스 · HEAD cce5e9d · 수정 전 코드)

| M0 주장 | 코어 소스 확인 지점 | 결과 |
|---|---|---|
| tenders → convertDraftOrderWorkflow 가 variant↔inventory 링크로 reservation 생성 (inventory_item_id 보존) | `apps/commerce-core/node_modules/@medusajs/core-flows/dist/draft-order/workflows/convert-draft-order.js:108` `reserveInventoryStep(formatedInventoryItems)` (transform `prepareConfirmInventoryInput` 가 variants 를 녹여 inventory_items 구조 생성) | ✓ 확인 |
| POS 주문엔 shipping_methods 없음 → `createOrderFulfillmentWorkflow` 가 shipping_option 조회에서 throw → fallback 진입 | `node_modules/@medusajs/core-flows/dist/order/workflows/create-fulfillment.js:283-304` `shippingOptionId = data.input.shipping_option_id ?? data.order.shipping_methods?.[0]?.shipping_option_id` → 바로 뒤 `useRemoteQueryStep("shipping_options", { variables: { id: shippingOptionId } })` 가 undefined 로 터짐 | ✓ 확인 |
| 과거 fallback 은 `metadata.inventory_item_id` 가 없으면 adjustInventory 전부 skip → stocked 변동 0 | `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts` 수정 **전** 코드 (M0 리포트 §1 :450-468 인용) · HEAD `cce5e9d` 기준 | ✓ 확인 |
| release 는 reservation 만 삭제 → reserved_quantity 복원 · stocked 는 그대로 → 순 재고 변동 **0회** · 손님에게 상품 지급됐지만 재고는 과대 계상 | `inventoryModule.deleteReservationItems` subscriber 가 `reserved_quantity` 만 되돌림 (코어 모듈 기본 계약) | ✓ 확인 |
| 후속 void: polyfill FulfillmentItem.inventory_item_id=null 로 cancelOrderFulfillmentWorkflow 가 `iitem.required_quantity` 에서 TypeError (Kyu 22:39 실기) | `node_modules/@medusajs/core-flows/dist/order/workflows/cancel-order-fulfillment.js:83-86` `const iitem = iitems.find(i => i.inventory.id === fitem.inventory_item_id); quantity = MathBN.div(quantity, iitem.required_quantity);` | ✓ 확인 (`iitems.find(i => i.inventory.id === null) === undefined` → `.required_quantity` crash) |

**결론**: M0 뿌리 분석은 코어 소스와 1:1 일치. "운영 재고가 안 빠졌다" 가 사실이며, 지난 Hand over 횟수만큼 운영 stocked_quantity 가 과대 계상되어 있음.

## 2) 수정 — 1회 차감 근거 (file:line)

**수정 지점**: `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts` · `apps/commerce-core/src/api/admin/pos/_shared/fulfillment-items.ts`

### (a) reservation 을 정본으로 사용 — adjustInventory 를 정확히 1회

- `fulfill/route.ts:129-161` 신규 `listReservationsForLineItems` : release 전에 reservations 를 `{id, line_item_id, inventory_item_id, location_id, quantity}` 로 전수 조회 · `inventory_item_id` 필수 필터 (`:150`).
- `fulfill/route.ts:504-513` : fallback 진입 직후 reservations 호출 → `invByLineId: Map<line_item_id, inventory_item_id>` 구축 (첫 reservation 우선 · 현재 POS 는 kit 미지원).
- `fulfill/route.ts:524-546` : **Primary 경로** — `reservations.length > 0` 이면 각 reservation 에 대해 `adjustInventory(r.inventory_item_id, r.location_id, -r.quantity)` 발화 · multi-location 안전 (**reservation 단위 location_id** 사용).
- `fulfill/route.ts:547-576` : **Fallback 경로** — reservations 비면 레거시 `metadata.inventory_item_id` 힌트 (테스트 시드 호환) · default_location_id 는 body 또는 첫 location.
- `fulfill/route.ts:588-597` : reservations 삭제. subscriber 가 `reserved_quantity` 복원. **adjust 뒤 → release** 순서라 net = -qty · exactly once.

### (b) polyfill FulfillmentItem.inventory_item_id 운영 정본

- `_shared/fulfillment-items.ts:87-113` `toPolyfillFulfillmentItem(line, reservationInvId?)` : 체인 **1) reservationInvId 2) metadata.inventory_item_id 3) 키 생략** — 운영 line_item 은 reservation 경유로 채워짐.
- `_shared/fulfillment-items.ts:126-140` `buildFulfillmentPolyfillItems(items, reservationsByLineId?)` : Map/Record 양쪽 지원.
- `fulfill/route.ts:630-633` 호출부가 `invByLineId` 를 두 번째 인자로 전달 → polyfill 양쪽에 운영 iitem.id 반영.

### (c) 이중 차감 가드 3중

1. **멱등 가드 (hand_over 재누름)**: `fulfill/route.ts:355-370` · `fulfilledRow = fulfillments.find(f => f.packed_at && !f.canceled_at)` 존재 시 즉시 `already_fulfilled:true` 로 리턴 (재고/예약/metadata 전부 무접촉). 수정 전부터 있던 가드 · M0-1105-Y 로 B/C 수정과 맞물려 handed_over_at 만 찍힌 상태 고착 재발 방지.
2. **`stockAlreadyDeducted` 런타임 가드**: `fulfill/route.ts:445-449` · `previouslyDecrementedAt = metadata.fulfillment.inventory_decremented_at` → 과거 라운드가 성공시킨 이력이면 `stockAlreadyDeducted=true`. `fulfill/route.ts:524` 가 이 플래그 체크로 adjustInventory 루프 전체 skip. `fulfill/route.ts:602-607` 는 rel.released=0 && hasInvHints && !inventory_decremented 일 때도 플래그를 올려 다음 라운드 안전.
3. **`inventory_decremented_at` persist**: `fulfill/route.ts:733-737 / 749-752` · 성공·실패 양쪽 모두 (`inventory_decremented || previouslyDecrementedAt`) 일 때 `metadata.fulfillment.inventory_decremented_at` 를 세팅/보존 → 다음 라운드에서 가드1이 바로 발동.

### (d) 1차 경로 (shipping_method 있는 주문) 와의 상호작용

- `fulfill/route.ts:464-485` : `createOrderFulfillmentWorkflow` 가 성공하면 workflow 내부가 재고 차감 + reservation 소진까지 담당 (core `create-fulfillment.js:320-361` `updateReservationsStep + deleteReservationsStep`).
- `fulfill/route.ts:481-485` : 성공 뒤 안전망 `releaseReservationsForLineItems` 호출. workflow 가 이미 삭제했으므로 `listReservationItems` 는 빈 배열 → `released=0`. **adjustInventory 는 catch 블록에만 있으므로 성공 경로에서 이중 차감 없음.** ✓

### (e) Void 상호작용 (#218 과 같이 들어갈 때)

- **신규 fulfillment (#219 적용 후)**: FulfillmentItem.inventory_item_id = 실 iitem.id → `cancel-order-fulfillment.js:85` `iitems.find(i => i.inventory.id === fitem.inventory_item_id)` 가 non-undefined → `.required_quantity` 정상 접근 → `prepareInventoryUpdate` 가 reservation 존재 여부로 `toCreate` (없음) 또는 `inventoryAdjustment` (+qty) 생성 → **재고 정확히 1회 복귀** (코어 책임).
- **레거시 fulfillment (null inv_id · 이미 DB 에 있는 과거 fulfilment)**: #218 `fulfillment-cancel.ts` `willWorkflowCrashOnRequiredQuantity` 가 사전 판정 (`variant.manage_inventory=true` + inv_id 불일치) → safe fallback. Safe fallback 의 (a) `adjustInventory(+qty)` 는 `fi.inventory_item_id ?? meta.inventory_item_id ?? null` 체인이라 레거시 null+no-hint 는 **adjust skip** = **복귀 0회** · 이는 정합 (애초에 운영에서 차감된 적이 없음 → 복귀 0회 = 대칭).
- **머지 순서 #219 → #218 타당성**: #219 가 선순이면 신규 fulfillment 는 처음부터 non-null inv_id → core cancel path 정상 · #218 은 레거시 복구 전용. 반대 순서라도 #218 은 null 조건 미발동이라 silent 비활성. 운영에선 **이미 DB 에 레거시 polyfill row 가 존재** 하므로 (Kyu 22:39 전 Hand over 들) #218 머지 필요성 유지. **권장 순서 #219 → #218**.

## 3) 검증 표

| 항목 | 상태 | 근거 |
|---|---|---|
| M0 뿌리 코드/코어 1:1 일치 | ✓ | §1 표 |
| 재고 정확히 1회 차감 (운영) | ✓ | `route.ts:504-546` reservations 경로 · adjust 뒤 release · test (b-AQ) `stocked=9 reserved=0` |
| 1회 차감 (레거시 테스트 시드) | ✓ | `route.ts:547-576` metadata 힌트 경로 · 기존 테스트 유지 |
| 멀티 location | ✓ | `route.ts:536` reservation 단위 `r.location_id` 사용 |
| 수량 2+ | ✓ | `route.ts:537` `-r.quantity` (단일 reservation 에 qty 보존) |
| 1차 경로 성공 시 이중 차감 없음 | ✓ | adjust 는 catch 에만 · 성공 경로 안전망은 delete-only |
| 재누름 멱등 (hand_over fulfilledRow) | ✓ | `route.ts:355-370` |
| `stockAlreadyDeducted` 가드 | ✓ | `route.ts:449 / 524` · `inventory_decremented_at` 보존 `:734-752` |
| 재시도 복구 플래그 올리기 | ✓ | `route.ts:602-607` |
| polyfill FulfillmentItem.inventory_item_id 운영 정본 | ✓ | `_shared/fulfillment-items.ts:103-111` · `route.ts:630-633` |
| Void #218 과 상호작용 (신규: core path · 레거시: safe fallback) | ✓ | §2(e) |
| 머지 순서 #219 → #218 | ✓ | §2(e) · 레거시 DB row 존재로 #218 유지 필요 |
| unit 5 신규 (reservations Map · Record · 우선순위 · 둘 다 없음 · 레거시 fallback) | ✓ | `fulfillment-items.unit.spec.ts:161-244` · 48/48 pass |
| 통합 (b-AQ) 운영 시드 재현 | ✓ | `p6-e2e.spec.ts:214-320` 신규 108 줄 · metadata 비우고 reservation 만 심어 `inventory_decremented=true`, `stocked=initial-1`, `FulfillmentItem.inventory_item_id=inv.id` 전부 검증 |
| 기존 p6-e2e 시나리오 변경 0 | ✓ | diff 는 **추가만** (existing it 블록 수정 없음) |
| CI 초록 | ✓ | pos-integration pass 3m11s · unit-commerce-core pass · check pass · markers-and-forbidden pass |

## 4) 실행 로그 (run-local 재현 없음 · 리뷰 정책 상 코드 수정 금지)

- PR CI (gh pr checks 219 · 2026-11-11 16:14 UTC 커밋 3dafb60):
  - `pos-integration` → pass 3m11s (b-AQ 9/9 포함 · M0 리포트가 로컬 2회 pass 명시)
  - `unit-commerce-core` → pass 54s (48/48 포함)
  - `check` → pass · `markers-and-forbidden` → pass · `changes-filter` → pass
  - docker-smoke 계열 → skipping (관련 경로 미변경)
- 소스 대사:
  - `sed -n '100,120p' node_modules/.../draft-order/workflows/convert-draft-order.js` → `reserveInventoryStep(formatedInventoryItems)` 확인
  - `sed -n '70,120p' .../order/workflows/cancel-order-fulfillment.js` → `iitem.required_quantity` 뿌리 확인
  - `sed -n '275,330p' .../order/workflows/create-fulfillment.js` → shipping_option_id undefined 분기 확인

## 5) 운영 재고 재조정 — Kyu 가 할 일 (2~3줄)

지난 Hand over 횟수만큼 **실제로 손님에게 나간 분량이 stocked_quantity 에 그대로 남아 있는 상태**. 머지 후 신규 주문부터는 정확하게 1회 차감되므로, 과거 분만 수동으로 정정하면 끝.

**Medusa Admin UI 경로** (쉬운 말):
1. Admin → **Inventory** 메뉴 → 재고 품목 (SKU) 선택 → 해당 location 의 `In stock` 수치 아래로 조정 (실 선반 재고로 입력).
2. 품목 수가 많으면 **매장 재고 실사 (물리 카운트)** 1회 → 그 숫자로 각 inventory_item 의 stocked_quantity 를 덮어쓰기.
3. (선택) 재조정 기록을 metadata note 로 남겨 이번 라운드 전 Hand over 분량이었음을 표시.

Admin 모듈이 없이 바로 쿼리해야 한다면: `inventory_level` 테이블의 `stocked_quantity` 를 실 수치로 UPDATE (이 작업은 운영 DB 직접 접근이라 ⛔ 상시 규칙 상 Claude 가 못 함 — Kyu 가 Admin UI 로 수행하거나 M2 에 티켓).

## 6) 이연 순증감

- +1 : 운영 재고 차감 정합성 뿌리 해소 (reservations → adjustInventory · exactly once) · #219 머지 후 신규 주문부터 1회 정확 차감
- +1 : polyfill FulfillmentItem.inventory_item_id 운영 정본 보존 → core cancel path 정상화 (Void 가 안전망 없이도 재고 복귀)
- +1 : 회귀 테스트 (b-AQ 통합 · unit 5) — 운영 시드 재현 테스트가 수정 전 FAIL · 후 PASS 로 CI 상에 영구 부착
- +0 : #218 (M2-1105-AP void safety) 무접촉 · 머지 순서 #219 → #218 로 레거시 복구 전용 역할 유지
- 운영 재고 수치 정정: 수동 (Admin UI · 실 선반 카운트) · 머지 후 즉시

## 7) PR 코멘트 요지 (APPROVE · 일반 코멘트)

운영 재고 차감 뿌리 1:1 해소 — reservation 을 정본으로 adjustInventory 1회 + polyfill inv_id 채움. 코어 소스 대조 확인 (convert-draft-order:108 · cancel-order-fulfillment:85 · create-fulfillment:283-304). 이중 차감 가드 3중 (멱등 row · `stockAlreadyDeducted` · `inventory_decremented_at` persist) · 1차 성공 경로와 직교. #218 과 머지 순서 **#219 → #218** 권장 (레거시 DB row 복구는 #218 유지 필요). CI 초록 · b-AQ 통합 + unit 5 추가로 재발 영구 봉합. 단, 운영 과거 Hand over 분 재고는 Admin UI 로 1회 수동 정정 필요 (§5).

## 착지 명령

```bash
cp /tmp/R0-1105-BU-report.md ~/projects/curiocity-relay/r0/ && \
cd ~/projects/curiocity-relay && \
git add r0/R0-1105-BU-report.md && \
git commit -m "r0: R0-1105-BU" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs R0-1105-BU done "APPROVE · reservation 정본 adjustInventory 1회 + polyfill inv_id · 가드 3중 · #218 과 직교 (머지 #219→#218) · CI 초록 · 과거 재고 수동 정정 필요"
```
