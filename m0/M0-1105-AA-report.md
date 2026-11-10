# M0-1105-AA Report · FulfillmentItem.barcode polyfill · 공용 빌더 수렴

- PR: https://github.com/CuriocityDevAi/storeport/pull/205
- Branch: `fix/m0-1105-y-fulfill-provider`
- Commit (AA): `534da5a` fix(pos): FulfillmentItem.barcode polyfill · 공용 빌더 수렴 (M0-1105-AA)
- CI run (AA): https://github.com/CuriocityDevAi/storeport/actions/runs/42779586675
- CI pos-integration job: https://github.com/CuriocityDevAi/storeport/actions/runs/42779586675/job/129706183505

## 결과 (CI 유일 판정 · 로컬 DB 없음)

**pos-integration PASS · 43 passed, 0 failed · 2m35s**

이전 (commit 14a0e4f · `fix/m0-1105-y-fulfill-provider`):

```
Tests:       10 failed, 33 passed, 43 total
```

AA 수정 뒤:

```
Tests:       43 passed, 43 total
```

### #39~#43 PASS 발췌 (대상 테스트 전수)

```
✓ #39 [M0-1105-Y A] takeaway hand_over → fulfillment row 1건 (packed_at non-null) 영속 (provider manual_manual 등록 확정 가드) (501 ms)
✓ #40 [M0-1105-Y A] preorder paid_full + shipping_option 없음 + sku 없음 → fulfilled:true (공식 2 조건 전부 폴백) (484 ms)
✓ #41 [M0-1105-Y B · C] handed_over_at 만 있고 packed row 없는 stuck 주문 → 재누름 성공 · already_fulfilled 가드에 안 걸림 (535 ms)
✓ #42 [M0-1105-Y repair] stuck 주문 (handed_over_at + packed row 없음) → repair dry_run=후보 · dry_run=false → fulfillment row 생성 · 재고 불변 (이중 차감 금지) (463 ms)
✓ #43 [M0-1105-Y B] fulfill 2회 누름 → 재고 1회만 차감 (복구 뒤에도) (505 ms)
```

함께 통과한 관련 회귀 가드 (barcode 누락이 끌고 간 주변 실패도 동반 해소):

```
✓ #19 [M0-1105-R ②] takeaway hand_over → Order.status = completed
✓ #24 [M0-1105-S] fulfill body.stage='hand_over' 수용 (takeaway / preorder paid_full)
✓ #26 [M0-1105-T] delivery · 결제 뒤 metadata.delivery.stage=awaiting_dispatch · hand_over 뒤 dispatched + completed
✓ #31 [M0-1105-U] hand_over 재누름 멱등 · stocked 1회만 감소 · fulfillments 증가 0
✓ #35 [M0-1105-W B] fulfill polyfill · sku 없는 line_item 도 FulfillmentItem.sku NOT NULL 통과
```

## 뿌리 · 수정

#205 1차 (14a0e4f) 로직 (B/C 가드 · medusa-config 1블록 · repair 설계) 은
정상이었으나 CI pos-integration 10 failed · 공통 원인:

```
[M0-1105-Y] fulfillment polyfill failed (fulfilled:false):
  Value for FulfillmentItem.barcode is required, 'undefined' found
```

→ Medusa 2.17 `FulfillmentItem` NOT NULL 필드 중 `barcode` 가 polyfill
(fulfill route · repair-stuck-fulfillments) 양쪽에서 누락.

### Medusa 2.17 `FulfillmentItem` 필수 필드 표

실 소스: `@medusajs/fulfillment/dist/models/fulfillment-item.js`
(`model.define("fulfillment_item", { … })` nullable() 여부 기준)

| 필드 | 타입 | NOT NULL | AA 전 polyfill | AA 후 polyfill (fallback 체인) |
|---|---|---|---|---|
| `title` | text | ✓ | `title ?? product_title ?? "pos line"` | `title → product_title → "pos line"` |
| `sku` | text | ✓ | `metadata.sku → variant_sku → product_handle → title → product_title → pos-<id tail>` | 동일 |
| `barcode` | text | ✓ | **없음 → undefined → createFulfillment throw** | `metadata.barcode → variant_barcode → sku 체인 → ""` |
| `quantity` | bigNumber | ✓ | `Number(it.quantity)` | 동일 |
| `line_item_id` | text | nullable | `it.id` | `String(line.id)` |
| `inventory_item_id` | text | nullable | 조건부 (`metadata.inventory_item_id`) | 동일 |
| `id` | id (prefix `fulit`) | auto PK | — | — |
| `fulfillment` | belongsTo | relation | createFulfillment 쪽이 세팅 | — |

## 변경 지점

- `apps/commerce-core/src/api/admin/pos/_shared/fulfillment-items.ts` 신설.
  `buildFulfillmentPolyfillItems(items)` + `toPolyfillFulfillmentItem(line)`
  + `FULFILLMENT_ITEM_REQUIRED_FIELDS` export. `_shared/` 는 Medusa
  routes-loader 가 `_` 접두 디렉토리를 스킵하는 규약 사용
  (`@medusajs/framework/dist/http/routes-loader.js:104`
  — `!routeFilePathSegment.some((segment) => segment.startsWith("_"))`).
- `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts`
  · fallback polyfillItems 블록을 공용 빌더 1줄 호출로 교체.
  `items.variant_barcode` 를 graph query 에 투영.
- `apps/commerce-core/src/api/admin/pos/maintenance/repair-stuck-fulfillments/route.ts`
  · 로컬 `buildPolyfillItems` 를 공용 빌더로 교체.
  `items.variant_barcode` 를 graph query 에 투영.
- `apps/commerce-core/src/api/admin/pos/_shared/__tests__/fulfillment-items.unit.spec.ts`
  신설. `FULFILLMENT_ITEM_REQUIRED_FIELDS` 상수로 Medusa 모델 필수 필드 표
  전수 커버 — 다음 Medusa 업그레이드에서 필드가 늘어나면 테스트 혹은
  표 중 한쪽만 바뀌는 drift 가 즉시 CI 에 잡힘. 7건 case PASS.
- `docs/feature-map.yaml` · `pos-tenders-fulfill.files` 에 `_shared/**`
  편입 + summary 에 M0-1105-AA 지점 기록.

## 응답 계약 (불변 유지)

- `fulfilled` · `fulfillment_warning` · `already_fulfilled` 그대로.
- 재고 1회 차감 (`inventory_decremented_at` + reservations 재조회).
- `handed_over_at` 는 실 fulfillment 성공 시만 기록 (M0-1105-Y B).
- `completeOrderWorkflow` 는 `stage=hand_over && fulfilled` 일 때만 실행.

## 자기 검증 (로컬 · 사전 pass)

- `pnpm --filter commerce-core typecheck` → 에러 0
- `pnpm --filter commerce-core test` (unit) → 5 suites · 33 tests PASS
  (신규 `_shared/__tests__/fulfillment-items.unit.spec.ts` 포함)
- `node scripts/feature-map-check.mjs --diff ...` → unmatched 0
- `bash scripts/naming-check.sh` → PASS

## 금지 영역 준수

- medusa-config.ts: AA 라운드는 **변경 없음** (1차 Y 에서 1블록 등록 완료).
- 운영 SSH · railway CLI · 운영 DB · 키체인 · 다른 앱 데이터 접근 없음.
- 네이밍 3층 규약 (naming-check PASS).
