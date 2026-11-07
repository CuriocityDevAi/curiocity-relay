---
name: R0-1105-U · 허브-1107-U 진단 relay (코드 수정 0)
description: Kyu iPad 2차 실기 피드백 4건 진단 · 뿌리·증거·주인·수정 범위 · 최소 2 라운드 (M0 서버 1 + M3 앱 1)
author: R0
dated: 2026-11-07
---

# R0-1105-U · Kyu iPad 2차 실기 피드백 진단 (코드 수정 0)

**환경**: iPad · `api.meros.id` · fork master `5a35e23` · storeport main `fe07858` (M0-1105-P 자동 draft→order 전환 포함 배포됨).
**재현**: 로컬 Postgres + `medusa-integration-test-runner` 로 `POST /admin/draft-orders` → `POST /admin/pos/orders/:id/tenders` → `POST /admin/pos/orders/:id/fulfill` 플로우 실측. (api.meros.id 실주문 자격증명은 로컬 env 미지정 → 통합테스트 대체.)
**claim**: `status/claims/R0-1105-U.json` · in_progress → completed.

## 증상별 진단표

| 증상 | 뿌리 (1줄) | 증거 (실측/코드 좌표) | 주인 | 수정 범위 (3줄) |
| --- | --- | --- | --- | --- |
| ① Payment **"Partially captured"** | `/admin/pos/orders/:id/tenders` section 1 이 `createOrderPaymentCollectionWorkflow` 를 무조건 호출 · **기존 (admin Payment 탭 또는 중복 tender 요청으로 생긴) pending collection 을 재사용/정리 안 함** → Medusa 2.17 `payment_status` 계산이 "모든 collection 전부 captured 아니면 partially_captured" 로 떨어짐. **단순 draft→tender 재현에선 1 collection + captured** 가 확인되므로 ① 뿌리는 **다중 요청 또는 pre-existing collection** 공존 (서버 로그/실주문 조회 1회 필요). | 로컬 실측 (draft 생성 직후 collection=0 · 단일 tender 뒤 collection=1 · `/admin/orders` payment_status=`captured`). 재현 로그 §A 참조. 서버 `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:296-315` 가 **기존 pending collection 체크 없이 신 workflow 호출**. Medusa core `node_modules/.pnpm/@medusajs+medusa@2.17.2/.../api/admin/draft-orders/route.js:80-82` 는 `createOrderWorkflow` 만 호출 (payment_collection 자동 생성 없음) · `convertDraftOrderWorkflow` 도 payment_collection 생성 안 함. | **M0** | 1) tenders section 1 앞에 `order.payment_collections` 중 `status !== 'completed'` 인 pending collection 재사용 분기 추가 (기존 ID 반환). 2) 또는 tender 성공 뒤 "완결되지 않은 collection 정리" 보조 로직 (deletePaymentCollections). 3) iPad 실주문 1건 payment_collections 실데이터 요청해 2개 공존 확인 (서버 로그 or `curl` 1회). |
| ② Order **"Pending"** | `convertDraftOrderWorkflow` 가 order.status 를 **PENDING** 으로만 전이 (Medusa core 설계) · POS 어디에서도 `completeOrderWorkflow` 를 호출하지 않아 영원히 pending. | `node_modules/.../draft-order/workflows/convert-draft-order.js:16` `OrderStatus.PENDING` 하드코딩. 로컬 실측 `/admin/orders ourOrder.status=pending` (재현 §A). tenders/route.ts (fe07858 · 전수) · fulfill/route.ts 어디에도 `completeOrderWorkflow` 호출 없음. | **M0** | 1) tenders section 7 (convert 뒤) 에 `completeOrderWorkflow({order_id})` 호출 추가 · preorder dp_paid 는 **제외** (잔금 결제 전엔 미완결). 2) 조건: `effectiveOrderType !== 'preorder' \|\| preorder.stage === 'paid_full'` · 실패 non-fatal (`console.warn` · M0-1105-K 패턴 재사용). 3) 응답 shape 에 `completed: boolean` 추가 · 통합테스트 `expect(row.status).toBe('completed')` 어설션. |
| ③ Fulfillment **"Not fulfilled"** | fulfill 라우트의 `createOrderFulfillmentWorkflow` 가 **shipping_profile / service_zone 미설정** 때문에 throw → M0-1105-C FIX #2 fallback 가 **inventory 만 직접 adjust** · **fulfillment row 는 생성 안 함** → Medusa 가 `fulfillment_status = not_fulfilled` 계산. 재고는 차감되지만 Admin UI 는 "Not fulfilled" 로 표시. | 로컬 실측 fulfill 응답 `{ok:true, fulfillment_id:null, inventory_decremented:true, inventory_warning:"inventory skipped: Cannot read properties of undefined (reading 'service_zone')"}` + `/admin/orders.fulfillments.length=0` + `stocked_quantity: 100→99` (재고 **차감됨** · fulfillment row 없음). 서버 `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts:131-145` catch isInventoryLinkError 블록. Medusa `fulfillment_status` 계산: fulfillments 배열이 비면 `not_fulfilled`. | **M0** | 1) fulfill route catch 블록에서 FULFILLMENT_MODULE 를 **직접 호출**해 minimal fulfillment row polyfill (`createFulfillment({location_id, items:[{title,quantity}]})`) · 재고 차감과 별개로 fulfillment row 생성. 2) 또는 더 근본: stock_location 생성 시 shipping_profile/fulfillment_set 자동 연결 seed · 이후 workflow 재시도 성공하도록 환경 정비. 3) 통합 #4 fulfill 어설션 확장: `fulfillment_status === 'fulfilled'` + `fulfillments.length > 0` 자동 검증. |
| ④ 상세 품목 **썸네일 회색** | fork `api/hooks/orders.ts:50` `useOrder` 의 fields 에 `+items.thumbnail,+items.product.thumbnail,+items.product.images.*` **누락** · 서버 응답에 field 자체 없음 → `item.thumbnail \|\| item.product?.thumbnail \|\| item.product?.images?.[0]?.url` 모두 undefined → `<Image>` 미렌더 · `bg-line` 회색 placeholder 노출. | fork `api/hooks/orders.ts:50` fields 문자열 (실제 코드): `'+tax_total,+discount_total,+subtotal,+total,+items.variant.options.*,+items.variant.options.option.*,+items.variant.inventory_quantity,+customer.*'` → **thumbnail 축 없음**. 반면 `app/orders/[orderId].tsx:281` 은 `item.thumbnail \|\| item.product?.thumbnail \|\| item.product?.images?.[0]?.url` 소비. **#30 M1-1105-F** 가 카트·checkout 쪽 draft-orders.tsx 에 동일 fix 넣은 패턴 (`api/hooks/draft-orders.tsx:191,197,221` = `...,+items.thumbnail,+items.product.thumbnail,+items.product.images.*`) 와 비교 → **동일 누락**. | **M3** | 1) `api/hooks/orders.ts:50` fields 뒤에 `,+items.thumbnail,+items.product.thumbnail,+items.product.images.*` 추가 (1줄 안쪽). 2) Playwright m3-1105-f 어설션에 "Order 상세 썸네일 img.src 존재 (data-testid=order-item-thumb)" 추가. 3) 선택: 같은 패턴을 `useOrders` (list) 에도 적용해 Orders 탭 목록 썸네일도 복원. |

## §A · 재현 로그 (로컬 integration test · node v20.19 · pg 16-alpine)

### §A-1 draft → tender (collection count 실측)
```
PRE tender: collections count = 0
TENDER status: 200 · converted:true · is_draft_order:false · receipt_no: R-261107-0001
POST tender: collections count = 1 · {status:completed, amount:100000, captured:100000, payments:1}
/admin/orders: payment_status=captured · fulfillment_status=not_fulfilled · status=pending
```

**관찰**: 단일 draft 생성 + 단일 tender 시나리오에서는 **1 collection + "captured"** · ①의 "Partially captured" 재현 안 됨. **iPad 환경에선 중복 요청/pre-existing collection 가능성이 높음** — Kyu 실주문 1건 payment_collections 조회가 필수.

### §A-2 draft → tender → fulfill(hand_over)
```
FULFILL response:
{
  "ok": true,
  "fulfillment_id": null,
  "inventory_decremented": true,
  "inventory_warning": "inventory skipped: Cannot read properties of undefined (reading 'service_zone')"
}

=== /admin/orders final ===
status: pending
payment_status: captured
fulfillment_status: not_fulfilled
fulfillments count: 0

=== inventory_level ===
[{"id":"ilev_...", "stocked_quantity":99, "reserved_quantity":0}]
```

**관찰** (②·③ 둘 다 재현됨):
- `status=pending` ← convertDraftOrder 만 돌고 complete 안 됨 (② 뿌리 확정)
- `fulfillment_status=not_fulfilled` + `fulfillments.length=0` ← workflow throw + 재고만 fallback (③ 뿌리 확정)
- `stocked_quantity: 100→99` ← 재고 차감은 **성공** (fallback adjustInventory 경로)

## §B · 재현용 curl (api.meros.id · 자격증명 보유 시)

### §B-1 Kyu 실주문 payment_collections 실측 (①)
```bash
# Kyu 오늘 최신 주문 ID 가 'order_XXX' 라고 가정
curl -sH "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.meros.id/admin/orders/order_XXX?fields=%2Bpayment_collections.*,%2Bpayment_collections.payments.*,%2Bpayment_status,%2Bstatus,%2Bfulfillment_status" \
  | jq '.order | {id, display_id, status, payment_status, fulfillment_status, collections: [.payment_collections[] | {id, status, amount, captured_amount, authorized_amount, payments_count: (.payments|length)}]}'
```

**판별 기준**:
- `collections.length === 1` + `captured_amount === amount` → ① 뿌리 **다름** (서버 외 요인 · react-query refetch stale 등)
- `collections.length >= 2` → ① 뿌리 **확정** (section 1 재사용 안 함)

### §B-2 fulfillment row (③)
```bash
curl -sH "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.meros.id/admin/orders/order_XXX?fields=%2Bfulfillments.*,%2Bfulfillments.shipped_at,%2Bfulfillments.delivered_at" \
  | jq '.order.fulfillments'
```

**판별 기준**: `[]` 또는 null → ③ 뿌리 확정 (workflow throw · fallback adjust 경로).

### §B-3 재고 차감 전후 (③ inventory-side 확인)
```bash
# tender 전 inventory snapshot, tender 후 inventory snapshot, fulfill 전 inventory snapshot, fulfill 후 inventory snapshot 4시점
curl -sH "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.meros.id/admin/inventory-items?fields=%2Blocation_levels.*&limit=10" \
  | jq '.inventory_items[] | {id, title, levels: [.location_levels[] | {location_id, stocked_quantity, reserved_quantity}]}'
```

## §C · 종합 (최소 수정 라운드 권장)

**최소 2 라운드로 묶기**:

### M0 (storeport) 1 라운드 — `M0-1105-Q · tenders 완결화 + fulfillment polyfill`
파일: `src/api/admin/pos/orders/[id]/tenders/route.ts` · `src/api/admin/pos/orders/[id]/fulfill/route.ts` · `integration-tests/pos/tenders.spec.ts`

- ① section 1 pending collection 재사용 가드 (예상 +15 lines)
- ② section 7 뒤에 `completeOrderWorkflow` 호출 (takeaway + paid_full 조건 · 예상 +20 lines)
- ③ fulfill catch 블록에서 FULFILLMENT_MODULE 직접 호출로 fulfillment row polyfill (예상 +25 lines)
- 통합 #1·#4·#14 신규/확장 어설션: payment_collections.length=1 · order.status=completed · fulfillments.length=1 · fulfillment_status=fulfilled

### M3 (fork) 1 라운드 — `M3-1105-M · Order 상세 썸네일 field`
파일: `api/hooks/orders.ts` · `scripts/m3-1105-f-playwright.mjs`

- ④ `useOrder` fields 에 `,+items.thumbnail,+items.product.thumbnail,+items.product.images.*` 추가 (1줄)
- Playwright m3-1105-f 어설션 추가: Order 상세 썸네일 Image src 존재 검증
- 선택: `useOrders` (list) 도 같은 fields 승계 (list 썸네일이 있는 경우)

### M1 (fork) · 없음
tenders/fulfill 호출 자체는 fork 쪽 정상 (M1-1105-M 자동 주입 · M1-1105-O 안전망 둘 다 OK). 서버 측 응답 shape 변경 뒤 fork 는 `converted · completed · fulfillment_id` 추가 필드를 선택 소비하면 UI 정합 유지.

## §D · 비고

- **네트워크 중복 요청 가드 추가 권장 (fork M3)**: 사용자가 Process payment 버튼 연타 시 tender POST 가 2번 나갈 수 있음 — react-query `useMutation` 기본 설정이 중복 호출 허용. 현 M1-1105-M `useCreateTender` 가 `isPending` 체크 없이 호출 가능 → CashTenderPanel 에서 버튼 disable 가드 확인 필요 (이미 있을 수 있음 · 재검 안 함).
- **Medusa core 측 이슈**: `convertDraftOrderWorkflow` 가 PENDING 으로만 전이 · POS 는 POS 완결 (영수증 발행 뒤)이면 completed 가 자연 — core issue 로 보기엔 Medusa "일반 commerce" 설계 (고객이 결제 뒤 사장이 approve 라는 중간 단계) 가정이 원인. POS 는 양방향 즉시 완결이므로 서버 레벨에서 complete 호출 필요.
- **실측 자격증명**: `.env` 없음 → 통합테스트로 대체 · §A-1·A-2 단일 플로우로는 ① 재현 불가 (1 collection · captured). Kyu 실주문 1건 직접 조회 (§B-1 curl) 가 우선.

## 참조

- 직전 리뷰: `r0/R0-1105-T-report.md` (fork #51 · #52 · #53 전부 APPROVE)
- storeport main: `fe07858` (#196 M0-1105-P)
- fork master: `5a35e23` (#53 M1-1105-P)
- 로컬 재현: Postgres 16-alpine · Node 20.19 · medusaIntegrationTestRunner · 통합 테스트 `diag-collections.spec.ts` (재현 후 삭제)
