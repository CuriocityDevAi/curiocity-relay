---
round: M0-1105-T
pr: storeport#TBD
base: storeport@main · 4f3cd43 (M0-1105-R/S)
outcome: reservation 전수 정리 + fulfill 단일 지점 + body 계약 + delivery 흐름 + maintenance 도구
kyu_checks: 1 (운영 재현 fulfill → 재고 실 감소 + reservation 0 · Admin Fulfillment "Fulfilled")
---

# M0-1105-T · POS 전달 교통정리 · reservation 소진 뿌리 해소

**일자**: 2026-11-07 · **허브**: M0 · **대상**: `fulfill/route.ts · tenders/route.ts ·
maintenance/release-stale-reservations/route.ts (신규) · tenders.spec.ts · helpers.ts ·
feature-map.yaml`
**base**: `origin/main @ 4f3cd43` (M0-1105-R/S 머지 뒤).

---

## §0 Reservation 흐름 대사표 (끊기는 지점)

실 node_modules 경로 그대로. "어느 workflow 가 reservation 을 만드는가 / fulfill 에서
어디서 끊기는가" 정답.

| 단계 | 파일 | 책임 | 효과 |
|------|------|------|------|
| ① POS 결제 (tender) | `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:685-698` | `is_draft_order=true` 면 `convertDraftOrderWorkflow` 호출 | 아래 ② 로 분기 |
| ② draft→order 전환 | `node_modules/@medusajs/core-flows/dist/draft-order/workflows/convert-draft-order.js:108` | `reserveInventoryStep(formatedInventoryItems)` | `reservation_items` 신규 행 + `inventory_level.reserved_quantity += qty` |
| ③ 손님 픽업 (hand_over) | `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts` | `createOrderFulfillmentWorkflow` 호출 | 아래 ④ 로 분기 |
| ④ fulfillment workflow | `node_modules/@medusajs/core-flows/dist/order/workflows/create-fulfillment.js:283-324` | `shipping_option_id` 추출 → `shipping_options` remote query | POS 주문엔 shipping_methods 없음 → `shippingOptionId=undefined` → **throw** (끊기는 지점) |
| ⑤ throw catch | `.../fulfill/route.ts` `isInventoryLinkError` 분기 (M0-1105-C 이전) | `adjustInventory` + `fulfillmentModule.createFulfillment` | adjustInventory 는 `metadata.inventory_item_id` 없으면 skip(= 운영 재현 경로) · **reservation 미삭제 · order↔fulfillment link 미생성** → Kyu 가 본 "Reserved +2 누적 8 · fulfillments 0 · In stock 15 불변" |

**원래 성공 경로 (workflow 통로)**: `.../create-fulfillment.js:360` `adjustInventoryLevelsStep`
+ `:361` `updateReservationsStep` + `deleteReservationsStep` 가 reservation 소진 + 재고
차감을 동시에 수행 + `createRemoteLinkStep` 이 order↔fulfillment link 작성. 이 경로는
`shipping_option` 전제가 필요.

**M0-1105-T 수렴**: 운영 환경 (shipping_option 미설정) 에서도 `shipping_option` 셋업
없이 fallback 을 "성공 경로와 **같은 결과**" 로 올리는 것이 목적. 요구사항 §1 의 "성공
경로를 운영에서도 타게" 도 장기 과제로 남지만, 재고 ↔ reservation ↔ order 상태의
불변식이 먼저. seed shipping_option 은 후속 라운드 (POS Inventory 앱 UI 라운드)로 유예.

### 통합 테스트 재현 (현재 24 가 "stocked 1회 차감" 통과하면서 운영은 안 된 이유)

통합 테스트는 `createTestOrder` 가 `orderModule.createOrders` 로 **raw order** 를 만든다
— `convertDraftOrderWorkflow` 경로를 안 탄다. 그래서 reservation 이 **0 인 상태에서
hand_over** 시작 → fallback 에서 `metadata.inventory_item_id` 힌트로 adjustInventory 만
수행 → stocked 가 1 감소. 운영은 convertDraftOrder 가 reservation 을 만들어 두고 +
line item 이 variant 체인에서 오기에 `metadata.inventory_item_id` 가 없어 adjust 도 skip
→ 재고 불변 · reservation 잔존.

M0-1105-T 는 `seedReservationForLineItem` 헬퍼를 통합 테스트 헬퍼에 추가해 **운영
재현** (reservation 심음 + hand_over + reserved 0 + stocked 실 감소) 을 #25 로
어설트.

---

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | §0 reservation 흐름 대사표 (file:line) | ✓ |
| 2 | fulfill fallback: reservation 전수 삭제 + order↔fulfillment link | ✓ |
| 3 | fulfill body 계약: `{stage, method, courier?, driver?, contact?, tracking_ref?, note?}` | ✓ |
| 4 | preorder dp_paid + hand_over → **400** (잔금 먼저) | ✓ |
| 5 | delivery hand_over 는 takeaway 단일 경로 (재고 차감 + completed) | ✓ |
| 6 | tender 시점 delivery → `metadata.delivery.stage=awaiting_dispatch` · fulfill 뒤 `dispatched` | ✓ |
| 7 | maintenance `POST /admin/pos/maintenance/release-stale-reservations` (dry_run 기본) | ✓ |
| 8 | 통합 어설션: reserved=0 · stocked −qty · fulfillments 1 · status completed | ✓ (#25) |
| 9 | 기존 24 유지 · 신규 6 추가 (총 30) | ✓ |
| 10 | POS Inventory 페이지 **계획만 (5줄)** | ✓ (§6) |

---

## 2. 변경 ↔ file:line

### 2.1 fulfill route (운영 재현 수렴 + 계약 확장)

- `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts`
  - §0 대사표 주석 머리 (file:line 명시 · 다음 세션 참조).
  - 신규 body 필드: `method (pickup|delivery) · courier · driver · contact · tracking_ref · note · location_id`.
  - **400 가드**: `order_type=preorder` + `preorderMd?.stage !== 'paid_full'` + `stage='hand_over'` → 즉시 400 (잔금 먼저).
  - **delivery hand_over**: `order_type='delivery'` + `stage='hand_over'` 도 재고 차감 경로 (`deliveryHandOver`).
  - `releaseReservationsForLineItems(container, line_item_ids)` 신규 helper · `listReservationItems({line_item_id: [...] })` → `deleteReservationItems(ids)` · subscriber 가 `inventory_level.reserved_quantity` 를 자동 복원.
  - `registerFulfillmentOnOrder(container, {order_id, fulfillment_id, items})` 신규 helper · `orderModule.registerFulfillment({order_id, reference, reference_id, items})` + `link.create([{ORDER:{order_id},FULFILLMENT:{fulfillment_id}}])` · `/admin/orders/:id/fulfillments` 에서 비지 않는다.
  - workflow 성공 경로 뒤 **안전망**: reservation 이 남으면 전수 삭제 (멱등 · 보통 0건).
  - workflow 실패 경로 (fallback): `(a) adjustInventory` → `(b) releaseReservationsForLineItems` → `(c) createFulfillment + registerFulfillmentOnOrder` 세 단계 일관.
  - metadata 쓰기: `fulfillment_stage` · `{stage}_at` · (hand_over 만) `fulfillment.{method,courier,driver,contact,tracking_ref,note,handed_over_at}` · (delivery hand_over 만) `delivery.{stage:'dispatched',dispatched_at}`.
  - 응답 shape 신규 키: `method · reservations_released` (기존 유지: `fulfillment_id · inventory_decremented · completed · inventory_warning?`).

### 2.2 tenders route (delivery awaiting_dispatch)

- `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:262-266`: metadata update 블록 진입 조건에 `effectiveOrderType === 'delivery'` 추가.
- `tenders/route.ts:282-295`: delivery 주문 metadata 에 `delivery.stage='awaiting_dispatch' · awaiting_dispatch_at` 세팅 (멱등 · 기존 값 유지).

### 2.3 신규 라우트

- `apps/commerce-core/src/api/admin/pos/maintenance/release-stale-reservations/route.ts` (신규)
  - POST body: `{location_id?, before?, dry_run?=true}`.
  - inventory 모듈 `listReservationItems` + (옵션) `before` ISO 필터.
  - 역방향 조회: `query.graph(entity:'order', filters:{items:{id:[...]}}})` 로 각 line_item 의 order status · fulfillment_stage 매핑.
  - 후보 판정: order_status ∈ {completed, canceled} 또는 `metadata.fulfillment_stage='hand_over'` 또는 역조회 실패 (고아).
  - dry_run=true (기본): 행 반환만 · 삭제 0.
  - dry_run=false: `deleteReservationItems(ids)` · released 카운트 반환.

### 2.4 helpers / tests / feature-map

- `apps/commerce-core/integration-tests/pos/helpers.ts`: `seedReservationForLineItem(container, {line_item_id, inventory_item_id, location_id, quantity})` 신규 · `inventoryModule.createReservationItems([...])` 직접 호출.
- `apps/commerce-core/integration-tests/pos/tenders.spec.ts`: 신규 테스트 #25~#30 (6건).
- `docs/feature-map.yaml:248-256`: `pos-tenders-fulfill` process 의 summary/files 를 M0-1105-T 범위로 확장 + `apps/commerce-core/src/api/admin/pos/maintenance/**` glob 추가.

---

## 3. 응답 shape 표 (M0-1105-T 최종본)

### 3.1 `POST /admin/pos/orders/:id/fulfill`

| 필드 | 타입 | 조건 |
|------|------|------|
| ok | boolean | 항상 true (실패는 500/400) |
| order_id | string | |
| order_type | 'takeaway'\|'preorder'\|'delivery' | |
| stage | 'hand_over'\|'send_to_production'\|'pack' | |
| method | 'pickup'\|'delivery'\|null | body.method 또는 order_type 유추 |
| fulfillment_id | string\|null | workflow 성공 시 workflow id · fallback 시 polyfill id |
| inventory_decremented | boolean | workflow 성공 또는 adjust-fallback 성공 |
| reservations_released | number | 삭제된 reservation 개수 (workflow 성공이면 0 전제 · fallback 에서 운영 재현 경로) |
| completed | boolean | takeaway/delivery 즉시 · preorder paid_full 조건에서만 true |
| inventory_warning | string? | fallback 분기 진입 시 사유 노출 |

### 3.2 `POST /admin/pos/maintenance/release-stale-reservations`

| 필드 | 타입 |
|------|------|
| ok | boolean |
| dry_run | boolean (기본 true) |
| total_candidates | number |
| released | number (dry_run=true 면 항상 0) |
| rows | `[{reservation_id, line_item_id, inventory_item_id, location_id, quantity, order_id, order_status, fulfillment_stage}]` |

---

## 4. Fixture (앱 fixture · 3종)

### 4.1 pickup (takeaway)

```json
POST /admin/pos/orders/order_01.../fulfill
{
  "stage": "hand_over",
  "method": "pickup",
  "note": "Phone + sugar-free"
}
→ 200 {
  "ok": true,
  "stage": "hand_over",
  "method": "pickup",
  "fulfillment_id": "ful_01...",
  "inventory_decremented": true,
  "reservations_released": 1,
  "completed": true
}
```

### 4.2 delivery

```json
POST /admin/pos/orders/order_02.../fulfill
{
  "stage": "hand_over",
  "method": "delivery",
  "courier": "Grab Express",
  "driver": "Bagus",
  "contact": "+6281234",
  "tracking_ref": "GX-2026-001",
  "note": "Call before arrival"
}
→ 200 {
  "ok": true,
  "stage": "hand_over",
  "method": "delivery",
  "fulfillment_id": "ful_01...",
  "inventory_decremented": true,
  "reservations_released": 1,
  "completed": true
}
```

(결제 시점 tender 응답에는 변화 없음. 그러나 order.metadata.delivery.stage 는
`awaiting_dispatch` 로 pre-set · fulfill 뒤 `dispatched` 로 전이.)

### 4.3 dp_paid 거부

```json
POST /admin/pos/orders/order_03.../fulfill   (preorder · stage=dp_paid)
{
  "stage": "hand_over",
  "method": "pickup"
}
→ 400 {
  "type": "invalid_data",
  "message": "preorder hand_over requires paid_full · current preorder.stage=\"dp_paid\""
}
```

---

## 5. Kyu curl — 찌꺼기 정리 1회 실행

운영 DB 에 Kyu 실기 5차 (11-07 22:03) 로 남은 "완결 뒤 reservation" 잔존분 전수 정리.

```bash
# 0) Admin 로그인 (예시 · 기존 운영 토큰 그대로 사용)
export ADMIN_TOKEN="<storeport admin bearer>"
export BASE="https://storeport-production.up.railway.app"

# 1) Dry-run (삭제 없음 · 후보 확인)
curl -X POST "$BASE/admin/pos/maintenance/release-stale-reservations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}' | jq .

# 응답 예시:
# {
#   "ok": true,
#   "dry_run": true,
#   "total_candidates": 8,
#   "released": 0,
#   "rows": [
#     {"reservation_id":"resi_01...", "line_item_id":"lit_01...",
#      "inventory_item_id":"iitem_01...", "location_id":"sloc_01...",
#      "quantity":2, "order_id":"order_01...","order_status":"completed",
#      "fulfillment_stage":"hand_over"},
#     ...
#   ]
# }

# 2) 특정 매장 필터
curl -X POST "$BASE/admin/pos/maintenance/release-stale-reservations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true, "location_id": "sloc_01..."}' | jq .

# 3) 실 삭제 (Kyu 확인 뒤 명시적으로 dry_run=false)
curl -X POST "$BASE/admin/pos/maintenance/release-stale-reservations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false}' | jq .

# 응답:
# { "ok": true, "dry_run": false, "total_candidates": 8, "released": 8, "rows": [...] }
```

`released` 가 `total_candidates` 와 일치 + `/admin/inventory-items/:id/location-levels`
재조회 시 Kyu 가 본 매장의 `reserved_quantity` 가 정상 수치로 복원되는 것이 완결 신호.

---

## 6. §0 끝 · POS Inventory 페이지 계획 (5줄)

Kyu 요청 "Inventory 목록에 Available 열" · 이번 라운드는 **서버 계약 선행** · UI 다음
라운드 (M0-1105-U 후보).

1. **route**: Admin UI `apps/commerce-core/src/admin/routes/pos/inventory/page.tsx` + 라우트 설정 (좌측 사이드바 POS 섹션 하위).
2. **API 계약**: 기존 `/admin/inventory-items` + `location_levels` 를 재사용 · POS 전용 응답 shape (SKU · In stock · Reserved · **Available = stocked − reserved**) 만 매장별 집계.
3. **뷰**: 매장(location_id) 선택 드롭다운 + 검색 필드(SKU/title) + 단일 테이블 (6 열: SKU · 상품 · 매장 · In stock · Reserved · Available). Vaul/shadcn 재사용.
4. **버튼**: 행별 "Release reservations" 바로가기 (기본 dry-run · 모달 확인 후 wet) — 본 라운드 신설한 maintenance 라우트 그대로 재사용.
5. **DoD**: Kyu 실기 — reservation 잔존 매장을 열어 Available 음수/누적 Reserved 가 눈에 띄고 · Release 실행 뒤 수치 복원. 통합 테스트 #28 과 일치.

---

## 7. 통합 테스트 (30/30 · 신규 6)

- #25 hand_over 뒤 reservation 전수 삭제 + `reserved_quantity` 0 + `stocked_quantity 15→13`.
- #26 delivery · tender 뒤 `metadata.delivery.stage=awaiting_dispatch` · hand_over 뒤 `dispatched` + `completed`.
- #27 preorder dp_paid + hand_over → 400 (`preorder hand_over requires paid_full`).
- #28 maintenance dry_run 기본 (released=0 · rows 노출) · dry_run=false (released>=1 · 레코드 소멸).
- #29 takeaway hand_over body.{courier?,tracking_ref?,note?} → `metadata.fulfillment.{method,contact,note,courier:null}` 영속.
- #30 fulfill body.method='bogus' → 400.
- 기존 #1~#24 전부 통과.

실 실행 결과 (local · real Postgres):

```
Test Suites: 1 passed, 1 total
Tests:       30 passed, 30 total
Time:        30.474 s
```

---

## 8. CI green

- `pnpm typecheck` · 0 errors (local).
- `pnpm test` · unit 24/24 PASS.
- `pnpm test:integration:pos` · integration 30/30 PASS.
- `bash scripts/naming-check.sh` · PASS (meros 매치 0).
- `node scripts/feature-map-check.mjs` · matched 743/744 (unmatched 1건 = 기존 `integration-tests/setup.js` · 본 라운드 변경 무관).

---

## 9. 금지 준수

- `medusa-config.ts` 미변경 ✓
- providers 미변경 ✓
- #197 세금 파일 미변경 ✓

---

## 10. 다음 라운드 후보

- **M0-1105-U**: POS Inventory 페이지 (§6 계획 반영).
- **(장기)** `ensurePosFulfillmentInfra` seed (shipping_profile/fulfillment_set/service_zone/shipping_option "In-store pickup" 매장별 idempotent 등재) → `createOrderFulfillmentWorkflow` 성공 경로 자체를 운영에서도 타게. 통합 테스트는 workflow 결과를 직접 어설트 (fallback 분기 축소).
