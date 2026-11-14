# R0-1105-EG — storeport #251 추가 수정 리뷰: /fulfill 부분 품목 · /return 재고 복원 위치 (M0-1105-BY)

**APPROVE** — 세 버그 모두 정확히 수정, CI 12 spec 전 pass, Hand over 기본 흐름 회귀 없음.

---

## 대상 커밋

| sha | 내용 |
|---|---|
| `f5c4589` | fix(pos): #BF-2 /fulfill partial items 500 — body.items 정규화 + partial scope |
| `e542085` | fix(pos): #BF-2 #BC-2 /return inventory_restored=false — listInventoryLevels 위치 |

---

## REQ 1 — 부분 fulfill: 선택 라인만 소진 · 전량 fulfill(Hand over) 기존 동작 유지

### 수정 내용 (fulfill/route.ts:427-480, 646-672)

```
// 정규화
const normalizedItems =
  Array.isArray(body.items)
    ? body.items.map(it => ({ id: it.id ?? it.line_item_id, quantity: it.quantity })).filter(...)
    : order.items.filter(...).map(...);            // body.items 없으면 전체
const line_item_ids = normalizedItems.map(it => it.id);

// polyfill partial scope
const fulfilledIdSet = new Set(line_item_ids);
const scopedOrderItems = order.items.filter(it => fulfilledIdSet.has(it.id));
const polyfillItems = buildFulfillmentPolyfillItems(
  scopedOrderItems.map(it => ({ ...it, quantity: qtyByLineId.get(it.id) ?? it.quantity })),
  invByLineId
);
```

**Hand over 흐름 (body.items 없음):** `normalizedItems` → `order.items` 전체 → `line_item_ids` 전체 → `fulfilledIdSet` 전체 → `scopedOrderItems` = `order.items` 전체. 기존 동작과 동일. ✅

**부분 fulfill (body.items 명시):** `line_item_ids` 가 요청 라인으로 한정 → reservation · polyfill 모두 해당 라인만. 나머지 라인 reservation 유지. ✅

**파일:줄:** `fulfill/route.ts:427-461` (normalizedItems 블록), `646-672` (polyfill partial scope).

### CI 커버 (tenders.spec.ts)
- `#4` takeaway fulfill 재고 1회 차감 ✓
- `#12` 잔금 뒤 fulfill → 재고 1회만 ✓
- `#24` body.stage='hand_over' 수용 ✓
- `#31` hand_over 재누름 멱등 · stocked 1회만 ✓
- `partial-refund-anytime` `#BF-1` qty=3 중 1 취소 → 남은 2 Fulfill 정상 ✓

> **커버리지 갭 (관찰, APPROVE 저해 없음):** body.items에 특정 line_item_id를 넘겨 부분 fulfill 하는 direct 통합 테스트는 없음. 현재 앱(fork) 의 `useHandOver`가 `{ stage: 'hand_over' }` 만 보내고 body.items를 보내지 않으므로 운영 경로에서 partial scope 코드는 비활성 — 회귀 위험 낮음. 추후 partial fulfill UI 추가 시 테스트 필요.

---

## REQ 2 — body.items 키 변환 (`line_item_id` ↔ `id`)

**서버 수정:** `id: String(it?.id ?? it?.line_item_id ?? "")` — 양쪽 키 수용.

**fork 앱 grep 결과 (`pos-r0/api/hooks/pos-orders.ts:50-52`):**
```ts
await sdk.client.fetch(`/admin/pos/orders/${input.order_id}/fulfill`, {
  method: 'POST',
  body: { stage: 'hand_over' },
})
```
앱은 body.items를 보내지 않음 → 키 변환 로직이 적용될 경우는 없음. 현재 운영상 mismatch 위험 없음.

키 변환 자체는 `line_item_id`가 넘어오는 테스트/서드파티 호출에 대한 방어 코드. 로직 정확함. ✅

---

## REQ 3 — /return 재고 복원 위치 결정 로직

**수정 전 문제:** `default_location_id = order.metadata.stock_location_id` → `resolveStoreId` 가 PIN scope 로 scoped id(`${loc}-bc2-${ts}`) 를 쓰면 실제 inventory level 에 없는 location → `adjustInventory` throw → catch → `anyRestored=false` → `inventory_restored: false`.

**수정 후 (`return/route.ts:827-878`):**
```ts
const levels = await inventoryModule.listInventoryLevels({ inventory_item_id: sp.inventory_item_id });
const lvl = Array.isArray(levels) ? levels[0] : levels;
const real_loc = lvl?.location_id ? String(lvl.location_id) : null;
if (real_loc) loc_id = real_loc;
// fallback: default_location_id (기존 경로 호환)
```

- 실제 inventory level 에서 location_id를 뽑아 사용 → scoped id 문제 근본 해결. ✅
- fallback `default_location_id` 유지 → 기존 주문 후방 호환. ✅

> **멀티-로케이션 주의 (관찰):** `levels[0].location_id` 를 무조건 사용. 단일 창고 운영(현 환경) 에서는 정확하나 멀티 창고 도입 시 주문 출고 위치와 다른 location으로 복원될 수 있음. 현재 범위 내 OK.

**CI 커버:**
- `partial-refund-anytime` `#BF-2` A fulfilled · B unfulfilled 환불 → A restore · B reservation release ✓
- `refund-decision-bc` `#BC-2` 혼합 출고 + PB1=10% → disposition 분기 · `inventory_restored` ✓
- `refund-ghost-reservation` `#BB-return` /return → `Available = stocked` ✓

---

## REQ 4 — CI pos-integration 160 pass 로그

**Run:** https://github.com/CuriocityDevAi/storeport/actions/runs/43569373454/job/132370219212

| job | 결과 | 시간 |
|---|---|---|
| pos-integration | **pass** | 6m8s |
| unit-commerce-core | pass | 55s |
| markers-and-forbidden | pass | 7s |
| changes-filter | pass | 7s |

**pos-integration 12 spec 전 PASS:**
open-order-reservations · p6-e2e · partial-refund-anytime · pos-qris-simulate · pos-tax-lines · refund-decision-bc · refund-ghost-reservation · refund-receipt-kind · refund-retry-qris · stock-cleanup · tenders · void-refund-restock

BW의 set -e 제거(BY 1번 커밋)로 silent-drop 없이 전 spec 결과 CI 로그에 노출됨. ✅

새/수정 테스트가 위 1~3 단정 여부:
- **REQ 1(Hand over):** `tenders.spec.ts` #24/#31 커버.
- **REQ 2(키 변환):** 직접 테스트 없음 (운영 경로 미사용이므로 허용).
- **REQ 3(복원 위치):** `partial-refund-anytime` #BF-2, `refund-decision-bc` #BC-2 가 `inventory_restored=true` 단정.

---

## 판정 요약

| 항목 | 결과 |
|---|---|
| Hand over 기존 흐름 회귀 | 없음 ✅ |
| 부분 fulfill reservation 범위 | 정확히 수정 ✅ |
| body.items 키 변환 | 양방향 수용, 운영 미사용 ✅ |
| /return 복원 위치 | listInventoryLevels 우선 · fallback 유지 ✅ |
| CI | 12/12 PASS ✅ |

**APPROVE**
