# M0-1105-AQ · POS 자동 출고 polyfill 뿌리 진단 + 수정 리포트

## ⚠️ 결론 한 줄 (재고 차감 정확성)

**운영의 재고 차감이 틀어졌다** — fulfill(polyfill fallback) 경로에서 `metadata.inventory_item_id` 가 없는 운영 line_item 은 `adjustInventory` 를 **아예 실행하지 않고** reservation 만 release 해서 stocked_quantity 가 그대로 유지됨. 즉 손님에게 상품은 지급됐지만 재고 수치는 그만큼 과대 계상. 이 라운드 이후 신규 주문부터 1회 정확 차감 · 지난 운영분은 수동 재고 조정 필요.

## 코드 대조표 (file:line · HEAD cce5e9d 기준 · 수정 전)

### 1) POS 결제 → 예약 생성 (성공 경로)

- `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` — 결제 완료 시 `convertDraftOrderWorkflow` 호출.
- `node_modules/@medusajs/core-flows/dist/draft-order/workflows/convert-draft-order.js:108` — `reserveInventoryStep(...)` 이 `variant.inventory_items` 링크를 읽어 `ReservationItem(line_item_id, inventory_item_id, location_id, quantity)` 를 만듦. **← inventory_item_id 가 여기에서 이미 저장돼 있다.**
- 효과: stocked=X 유지 · reserved=qty · available=X-qty.

### 2) POS Hand over → fulfillment 생성 (파손 경로)

- `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts:407-428` — `createOrderFulfillmentWorkflow` 1차 시도.
- `node_modules/@medusajs/core-flows/dist/order/workflows/create-fulfillment.js:283-304` — POS 주문엔 `shipping_methods` 없음 → `shippingOptionId=undefined` 로 remote query throw. 2차 자체 폴백으로 떨어짐.
- `fulfill/route.ts:429-574` (수정 전) — 폴백:
  - **:450-468** `metadata.inventory_item_id` 가 있어야만 `adjustInventory(inv_id, loc, -qty)` 발화. 운영 line_item 은 이 메타가 **없음** → 완전 skip. `inventory_decremented=false`.
  - **:481-485** `releaseReservationsForLineItems` 로 reservation 삭제 → reserved=0, available=stocked 로 복귀 (= 결제 전 상태). **net 효과: 재고 변동 0회.**
  - **:518-520** `buildFulfillmentPolyfillItems(order.items)` — `meta.inventory_item_id` 가 없으니 FulfillmentItem.inventory_item_id=**null**.

### 3) 후속 Void → cancelOrderFulfillmentWorkflow (연쇄 파손)

- `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts:307-323` — 각 pending fulfillment 를 `cancelOrderFulfillmentWorkflow` 로 취소.
- `node_modules/@medusajs/core-flows/dist/order/workflows/cancel-order-fulfillment.js:83-85` — `prepareCancelOrderFulfillmentData` 안에서 `iitems.find((i) => i.inventory.id === fitem.inventory_item_id)` → `fitem.inventory_item_id=null` 이므로 `iitem=undefined` → `iitem.required_quantity` TypeError (Kyu 22:39 실패).
- `cancel-order-fulfillment.js:107-110` — `prepareInventoryUpdate` 는 `!fulfillmentItem.inventory_item_id` 면 조용히 skip. 설령 crash 를 안 피해도 재고 복원 불가.

### 4) 이번 수정 지점

- `apps/commerce-core/src/api/admin/pos/_shared/fulfillment-items.ts`
  - `toPolyfillFulfillmentItem(line, reservationInvId?)` : 두 번째 인자로 reservation 의 inventory_item_id 수용 (운영 정본 우선 · metadata 는 fallback).
  - `buildFulfillmentPolyfillItems(lines, reservationsByLineId?)` : Map/Record 양쪽 지원.
- `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts`
  - 신규 helper `listReservationsForLineItems(...)` — release 전에 reservations 전수 조회.
  - 폴백 재구성 (수정 후:430-562):
    1. `listReservationsForLineItems` → `invByLineId` 맵 + 원 reservations 배열.
    2. `stockAlreadyDeducted=false` 면 reservations 가 있을 땐 `adjustInventory(r.inventory_item_id, r.location_id, -r.quantity)` 를 **reservation 단위로** 발화. 없으면 레거시 `meta.inventory_item_id` 경로로 fallback (테스트 시드 호환).
    3. `releaseReservationsForLineItems` 로 reservation 삭제 (adjust 뒤 → net 1회 차감).
    4. `buildFulfillmentPolyfillItems(order.items, invByLineId)` 로 polyfill 양쪽에 운영 inventory_item_id 채움.

## 재현 (운영 시드)

`integration-tests/pos/p6-e2e.spec.ts` 의 신규 `(b-AQ)` 테스트 시나리오:

1. inventory_item 생성 → inventory_level `stocked=10, reserved=0` seed.
2. `createTestOrder(..., withInventory: false)` 로 line_item 생성 (= `metadata.inventory_item_id` **비움** · 운영 line_item 동일).
3. `seedReservationForLineItem(line_item_id, inventory_item_id, location_id, quantity=1)` — `convertDraftOrderWorkflow` 의 reservation 생성 동작 재현.
4. `POST /admin/pos/orders/:id/tenders` (cash 100k).
5. `POST /admin/pos/orders/:id/fulfill` (hand_over).

**수정 전 (코드 실행 안 함 · 이론 확인)**: `fulfillRes.data.inventory_decremented` = **false** · `stocked_quantity` = 10 (변동 없음) · `FulfillmentItem.inventory_item_id` = null → 후속 void 시 cancelOrderFulfillmentWorkflow TypeError.

**수정 후 (실측)**:
- `fulfillRes.data.inventory_decremented` = **true**
- inventory_level: `stocked_quantity = 9` · `reserved_quantity = 0` (net 1회 차감)
- `FulfillmentItem.inventory_item_id` = inv.id (실제 iitem id) · `line_item_id` = order.item_ids[0]

## 수정

- `apps/commerce-core/src/api/admin/pos/_shared/fulfillment-items.ts` : +30 / -8
- `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts` : +121 / -19 (helper 신설 · 폴백 재구성)
- `apps/commerce-core/src/api/admin/pos/_shared/__tests__/fulfillment-items.unit.spec.ts` : +87 unit (reservations Map 경로 · 우선순위 · Record 지원 등 5개)
- `apps/commerce-core/integration-tests/pos/p6-e2e.spec.ts` : +108 (운영 시드 재현 테스트 b-AQ)

### 차감 정확히 1회 — 증거
- reservations 경로가 돌면 `inventory_decremented=true` 세팅 · `stockAlreadyDeducted` 가드로 이중 호출 차단.
- `metadata.fulfillment.inventory_decremented_at` 세팅돼 다음 라운드 재시도도 skip.
- `releaseReservationsForLineItems` 는 `delete`만 수행 (reserved 복원) — adjust 뒤이므로 net = -qty · exactly once.

## PR 번호

**#219** · https://github.com/CuriocityDevAi/storeport/pull/219 · 커밋 `3dafb60`.

## #218 과의 관계 (머지 순서)

- #218 (M2-1105-AP) 은 `_shared/fulfillment-cancel.ts` 로 `cancelOrderFulfillmentWorkflow` 의 required_quantity crash 를 감싸는 **안전망**. main 아직 미머지 (origin/main HEAD = cce5e9d).
- **이 라운드 (#219 · M0-1105-AQ) 는 뿌리 수정** — FulfillmentItem.inventory_item_id 가 운영 iitem.id 로 채워지므로 core cancel workflow 가 정상 경로 (iitem 참조 non-null) 를 탄다.
- **권장 머지 순서**: #219 → #218. #219 가 선순이면 신규 fulfillment 는 처음부터 정합 · #218 안전망은 legacy 주문 (이미 polyfill null 로 생성된 fulfillment) 복구 경로용으로만 작동.
- 반대 순서라도 안전 — #218 은 null 케이스를 감싸는 defensive 코드이므로 #219 가 들어와도 silently 비활성 (null 조건 미발동).

## 회귀 테스트 (운영 같은 시드)

- `(b-AQ)` : inventory_item_id 보존 · 재고 1회 차감 · `pos-integration` 로컬 통과.
- Void 1회 복귀는 **skip** — #218 머지 전이라 polyfill 이 null inventory_item_id 로 들어오던 과거 경로는 더 이상 존재 안 함 · 신규 fulfill 은 처음부터 inventory_item_id 세팅 → core cancel workflow 정상 → 재고 복원도 core 가 담당 (이번 PR 범위 밖 · #218 머지 후 end-to-end 검증은 M2 소관).

## 실행 로그

```
pnpm --filter commerce-core typecheck → PASS (0 err)
pnpm --filter commerce-core exec jest unit\.spec → 6 suites · 48/48 pass
pnpm test:integration:pos (1st) → tenders.spec PASS · p6-e2e.spec 9/9 PASS (b-AQ 포함)
pnpm test:integration:pos (2nd) → tenders.spec PASS · p6-e2e.spec 9/9 PASS
```

## 이연 순증감

- +1 : 운영 재고 차감 정합성 뿌리 해소 (reservations → adjustInventory 경로 신설)
- +1 : polyfill FulfillmentItem.inventory_item_id 운영 정본 보존 → core cancel workflow 정상화
- +1 : 회귀 테스트 (b-AQ · unit 5개)
- +0 : void/_shared/fulfillment-cancel.ts (M2 #218) 무접촉 (요구 준수)
- 운영 누적 재고 수치 정정: **수동 작업 필요** — 이 PR 머지 후, 지난 Hand over 횟수만큼 stocked_quantity 가 과대 계상된 상태이므로 사용자/M2 가 inventory 재조정 (카탈로그 skus 별 실 재고 재입력) 필요.

## 착지 명령 (지시대로)

```bash
cp /tmp/M0-1105-AQ-report.md ~/projects/curiocity-relay/m0/ && \
cd ~/projects/curiocity-relay && \
git add m0/M0-1105-AQ-report.md && \
git commit -m "m0: M0-1105-AQ" && \
git pull --rebase --autostash origin main && \
git push && \
node scripts/claim.mjs M0-1105-AQ done "폴백이 reservations 경유로 inventory_item_id 보존 + 재고 1회 정확 차감 (뿌리 재고 차감 0회 해소) · #219"
```
