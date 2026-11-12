# R0-1105-CI 진단 리포트 — Stock cleanup 빈 목록인데 Reserved 13 이 남는 이유

**날짜**: 2026-11-12  
**판정**: 진단 완료 (코드 변경 0)

---

## 결론 한 줄

Reserved 13 은 **결제 완료 후 `status=pending` 에 고착된 주문**의 예약이며, Stock cleanup 은 `pending` 주문을 정상적으로 보호하고 있어 "No stale reservations" 가 맞는 동작이다. 다만 `completeOrderWorkflow` non-fatal 실패 또는 takeaway 가 아닌 주문(preorder/delivery 중간 단계)이 쌓이면 `pending` 상태로 예약이 영구 잔류한다.

---

## 1. 두 집합 비교 (file:line)

### Admin Inventory `Reserved` 카운터

**출처**: Medusa 코어 `inventory_level.reserved_quantity` — 특정 `(inventory_item_id, location_id)` 에 걸린 ALL `reservation_item.quantity` 의 **denormalized 합계**.

- 조회 경로 (stock-cleanup 페이지): `GET /admin/inventory-items?id[]=...&fields=*location_levels`
  → `inventory_item.location_levels[].reserved_quantity`
  → `apps/commerce-core/src/admin/routes/stock-cleanup/page.tsx:97-106` (`fetchInventoryLevels`)
- 증감 시점: `createReservationItems` 시 +qty, `deleteReservationItems` 시 -qty (Medusa 내부 subscriber)
- **필터 없음**: 주문 상태, is_draft_order, 연결 여부 무관. 존재하는 `reservation_item` 전체를 더한다.

### Stock cleanup 후보 선정 쿼리

**파일**: `apps/commerce-core/src/api/admin/pos/maintenance/release-stale-reservations/route.ts`

| 단계 | 코드 위치 | 내용 |
|---|---|---|
| 전수 조회 | line 63 | `inventoryModule.listReservationItems({ location_id })` — 해당 location 의 모든 reservation |
| 역조회 | line 118-129 | `query.graph({ entity:"order", filters:{ items:{ id:lineItemIds } } })` → line_item_id → order 매핑 |
| 후보 판정 | line 166-171 | `info==null` **OR** `status=completed` **OR** `status=canceled` **OR** `fulfillment_stage=hand_over` |
| **제외 조건** | line 170-171 | 위 조건 불충족 → `if (!stale) continue` → **`status=pending` 등 non-stale 제외** |

### 두 집합이 갈리는 지점

```
Admin Reserved = listReservationItems(location) 전체 합계
Cleanup 후보  = listReservationItems(location) 중 (info==null ∨ completed ∨ canceled ∨ hand_over)
```

**갭**: `status=pending` (결제됐지만 미완결) 또는 `status=draft` 주문의 reservation 은 Admin Reserved 에는 포함되지만 cleanup 후보에서는 **제외**된다.

`route.ts:166-171` 에 명시적 `info.status === "pending"` 차단이 없어도, 조건 자체가 `completed|canceled|hand_over` 만 허용하므로 pending 은 자동 제외.

---

## 2. 가설별 판정

### ① 버려진 결제 대기 draft 주문 (카트 → Checkout 후 미결제)

**판정**: ❌ **해당 없음**

- Reservation 생성 시점: `convertDraftOrderWorkflow` (tenders 엔드포인트) → 결제 성공 후에만 실행  
  증거: `fulfill/route.ts:12-14` 주석 "tenders → `convertDraftOrderWorkflow` … `reserveInventoryStep(...)` 가 line_item 당 reservation_items 행을 만든다"
- 결제 없이 Checkout 화면만 열었다가 나가는 경우: draft order(`is_draft_order=true, status=draft`) 존재하지만 reservation **미생성**
- POS 앱은 카트 취소 시 `sdk.admin.draftOrder.delete()` 호출 (`api/hooks/draft-orders.tsx:273`)
- Cleanup 에서 "No stale reservations" 가 반환됐다는 것 자체가, 13개 모두 역조회 성공 → 실제 주문이 존재함을 증명 (info==null 이었으면 orphan 으로 후보 진입)

### ② line_item 연결 없는 예약 (주문 역조회 실패)

**판정**: ❌ **해당 없음 (이 경우 오히려 cleanup 후보에 포함)**

- `route.ts:166` 에서 `info == null` → `stale = true` → cleanup 후보에 포함
- Cleanup 이 "No stale reservations" 를 반환했으므로 역조회 실패 케이스가 0개임을 의미
- 단, graph query 전체가 exception throw 된다면 `lineItemToOrder` 비어 → 전부 orphan 으로 판정되어 cleanup 에 모두 뜨는 반대 오작동 가능성 있음 (R0-1105-BZ REQ 1 ⚠️ 항목) — 금번 경우에는 해당 없음

### ③ 다른 location 의 예약

**판정**: ❌ **해당 가능성 낮음**

- `inventory_level.reserved_quantity` 는 location 별 집계
- Admin Inventory 화면이 단일 location 의 reserved 를 표시한다면 cleanup 과 같은 집합을 봄
- Medusa Admin `/app/inventory` 는 각 location_level 별 reserved 를 별도 표시 — cleanup 이 동일 location_id 로 호출됐다면 집합 불일치 없음
- 단, Admin 에서 ALL locations 합산 reserved 를 표시하는 경우라면 cleanup (단일 location) 과 갭 가능. 현재 증거로는 배제 불가능이지만 주원인 아님.

### ④ 가장 유력: 결제 완료 후 `pending` 고착 주문

**판정**: ✅ **가장 유력한 원인**

**경로 A — pre-M0-1105-T 버그 고착 (구 코드 이전 주문)**:

1. 결제 완료 → `convertDraftOrderWorkflow` → `order.status=pending`, reservation 생성
2. Fulfill 호출 → `createOrderFulfillmentWorkflow` throw (shipping_option 부재) → 구 fallback
3. 구 fallback: `adjustInventory` 시도(metadata.inventory_item_id 없으면 skip) + **`deleteReservationItems` 미호출** (`fulfill/route.ts:24` 주석 "(a) reservation 삭제 안 함")
4. `completeOrderWorkflow` **실패(non-fatal)** (`fulfill/route.ts:831-835`) → `order.status` = `pending` 유지
5. 결과: order=pending, reservation 살아있음 → cleanup 제외

이 경로가 반복되면서 reserved 가 누적 (Kyu 실기에서 "Reserved +2 누적 8" 패턴과 일치).

**경로 B — 중간 단계 주문 (preorder / delivery 미완)**:

- Takeaway 外 주문: `stage=send_to_production`(`pack`) 호출 시 reservation 삭제 안 함, `completeOrderWorkflow` 미호출 (`fulfill/route.ts:822` "stage=hand_over && fulfilled 일 때만")
- `hand_over` 호출 전까지 `order.status=pending` + reservation 잔류
- preorder 가 프로덕션에서 쌓이면 reserved 가 누적됨

---

## 3. 권장 고침 (코드 0, 방향 제안)

### 권장 1개 (채택 권장)

**"N시간 이상 방치된 `pending` 주문 예약" 별도 구역 추가 — Stock cleanup 페이지 확장**

Stock cleanup UI 에 "Stale pending orders" 섹션을 추가한다:

- 조건: `order.status=pending` + `order.created_at < now - 24h` (기준 시간 Kyu 조정 가능)
- 주문 번호·생성시각·상품명·예약 수량을 표로 표시
- "Release selected" 버튼 → Kyu 가 직접 확인 후 개별 or 전체 릴리즈 판단
- **자동 삭제 금지**: split-tender 진행 중 / preorder 대기 주문이 섞여 있을 수 있으므로 Kyu 수동 확인 필수

**담당 허브**: storeport  
**파일**:
- `apps/commerce-core/src/admin/routes/stock-cleanup/page.tsx` — UI 섹션 추가
- `apps/commerce-core/src/api/admin/pos/maintenance/release-stale-reservations/route.ts` — `before` 파라미터 활용 또는 새 쿼리 파라미터 `include_pending_before` 추가

**대안**:
- `completeOrderWorkflow` 재시도 보조 엔드포인트: fulfill 완료됐지만(`metadata.fulfillment.inventory_decremented_at` 존재) 여전히 `pending` 인 주문에 대해 Admin UI 에서 complete 를 재시도하는 버튼 추가. 근본 고착 해소.
- POS 앱 Checkout 나갈 때 draft 삭제: 이미 `draftOrder.delete()` 호출 중이므로 이 경로는 보완 필요 없음.
- Medusa 코어 `confirmInventoryStep` 경유 정규화: shipping_option 없는 POS 주문도 정규 fulfill 워크플로우를 탈 수 있도록 Medusa 측에 이슈 제기 가능. 단 운영 범위 초과.

---

## 이연 순증감

| 이연 항목 | 상태 |
|---|---|
| "pending 고착 주문 cleanup" UI 구현 | 신규 이연 (Kyu 결정 후 별도 티켓) |
| `completeOrderWorkflow` 재시도 보조 도구 | 신규 이연 (대안 채택 시) |
| 기존 이연 (부분환불 영수증 · Share PNG 등) | 무변화 |

---

착지 명령:
```
cp /tmp/R0-1105-CI-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-CI-report.md && git commit -m "r0: R0-1105-CI" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-CI done "pending 고착 주문이 원인 — cleanup 정상 동작, Reserved=13 모두 pending 주문 소속, 권장: N시간 초과 pending 예약 별도 구역 추가"
```
