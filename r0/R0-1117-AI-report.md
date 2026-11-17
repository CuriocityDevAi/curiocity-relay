#344 APPROVE · 문제 0건

리뷰어: R0-1117-AI · 2026-11-17

---

## REQ 1 — 옛 라우트 ↔ 새 step 1:1 대조

| 항목 | 결과 | 비고 |
|------|------|------|
| fetch → execute → updateMetadata → complete 순서 | ✅ 보존 | fetchOrderStep → executeFulfillmentStep → updateMetadataStep → completeOrderStep |
| createOrderFulfillmentWorkflow 성공 경로 | ✅ 동일 | items / no_notification / location_id / metadata 전달 그대로 |
| isInventoryLinkError fallback 조건 | ✅ 동일 | `throw err` (non-inventory) → route catch → 500 |
| adjustInventory (reservations 경로 → 레거시 힌트 경로) | ✅ 동일 | stockAlreadyDeducted 가드 보존 |
| releaseReservationsForLineItems — 이중 삭제 없음 | ✅ 멱등 | 성공 경로 safety net + 폴백 삭제 순서 동일 |
| polyfill createFulfillment + registerFulfillmentOnOrder | ✅ 동일 | provider_id / delivery_address / metadata 필드 그대로 |
| 이중 차감 방지 (inventory_decremented_at 플래그) | ✅ 보존 | prevDecrementedAt → executeFulfillmentStep 입력 |
| 이중 복원 없음 | ✅ | releaseReservationsForLineItems 멱등 (released=0 허용) |
| 교대 체크 (register_session) | ✅ 범위 밖 명시 | 기존 route에 없었고 신 route에도 없음. PR description §범위 밖 기록 |
| 영수증 mint | ✅ route에 남음 | 앱 사이드 트리거 — completed 플래그 응답에 보존 |
| preorder paid_full 가드 | ✅ 동일 | route preflight에서 처리 (workflow 실행 전) |
| delivery courier 가드 | ✅ 동일 | route preflight에서 처리 |
| hand_over 멱등 가드 | ✅ 동일 | packed_at ≠ null + canceled_at = null 조건 보존 |
| 에러 코드 | ✅ 0 변경 | 400/404/500 경로 모두 보존 |

**Minor (block 없음):**

1. `route` preflight query + `fetchOrderStep` = order 2회 조회. preflight는 narrowed fields (id/metadata/items.id/items.quantity/fulfillments.*), step은 full fields (items.*, variant_sku 등). 기능 무관 — 성능 비용은 동일 request 내 최소.

2. metadata persist 500 응답에서 `fulfillment_id` 미포함: 구 route는 `{ ..., fulfillment_id }` 반환. 신 route는 workflow throw → 500 변환 (fulfillment_id 없음). Edge case, 앱 오류 처리 경로에 영향 없음.

3. `registerFulfillmentOnOrder`(utils.ts) — `ContainerRegistrationKeys` dynamic import 사용. 기존 route는 top-level import. Node.js module cache로 실질 오버헤드 없음.

---

## REQ 2 — 응답 JSON 스냅샷

응답 shape 완전 보존:

```json
{
  "ok": true,
  "order_id": "ord_...",
  "order_type": "takeaway",
  "stage": "hand_over",
  "method": "pickup",
  "fulfillment_id": "ful_...",
  "fulfilled": true,
  "inventory_decremented": true,
  "reservations_released": 2,
  "completed": true
}
```

옵션 필드 (`inventory_warning`, `fulfillment_warning`) 조건부 포함 — 구 route와 동일 패턴.

---

## REQ 2 — 전체 테스트 로그

```
Test Suites: 38 passed, 38 total
Tests:       453 passed, 453 total
  - pos-fulfill channel-neutral 5건 신규 포함
Snapshots:   16 passed, 16 total
Time:        13.045s
```

naming-check: **PASS**

---

## REQ 2 — tsc 신규 0

| branch | error TS count |
|--------|----------------|
| base (211741e) | 245 |
| PR branch (084cfc5) | 245 |
| **신규** | **0** |

245건 기존 오류 모두 `admin/` JSX 컴포넌트 (TS2786 · @medusajs/ui bigint) — 본 PR 범위 밖.
pos-fulfill/** 타입 오류 0건.

---

## REQ 2 — `_shared` step 재사용 적절성

`execute-fulfillment.ts` → `../../../api/admin/pos/_shared/fulfillment-items` (`buildFulfillmentPolyfillItems`) 재사용. ✅  
경로 확인: `apps/commerce-core/src/api/admin/pos/_shared/fulfillment-items.ts` 존재.

---

## REQ 3 — 판정

**APPROVE · 문제 0건**

890줄 → 276줄 route 축소, step 1:1 대조 통과, 재고 차감·reservation 소진 로직 그대로, 에러 코드 변경 없음, 테스트 453/453 pass, tsc 신규 0.
