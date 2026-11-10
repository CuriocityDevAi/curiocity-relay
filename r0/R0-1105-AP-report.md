# R0-1105-AP · 진단 · Fulfill / Hand over 뒤 Fulfillment Not fulfilled 그대로

**환경**: iPad · `api.meros.id` · fork master `77b930c` · storeport main `4f3cd43` (M0-1105-R/S, PR#199, Nov 7 머지)  
**일자**: 2026-11-10 · **허브**: R0 · **코드 수정**: 0  
**관련**: m3/M3-1105-X-report.md · r0/R0-1105-AM-report.md · m0/M0-1105-W-report.md

---

## §0 · 배포 버전 확정

| 항목 | 값 | 확인 방법 |
|---|---|---|
| fork(앱) master HEAD | `77b930c` (M3-1105-Y, #69) | `git log master` |
| storeport main HEAD | `4f3cd43` (M0-1105-R/S, PR#199) | `git branch --contains ac71c44` → `feat/m0-1105-t-reservations` only; `git log main` → `d691edd`(로컬 미동기) · R0-1105-AE 리포트 "base main @ 4f3cd43" 확증 |
| PR#200 (M0-1105-T/U/W) | **미배포** · `feat/m0-1105-t-reservations` 대기 | 원장 "#203(repair) 이후 배포" |
| Nov 7 railway 로그 | `storeport main 4f3cd43` 명시 · `[M0-1105-R] fulfillment polyfill failed` 에러 확증 | `logs/railway-api-20261107-1550-1607.log` |

---

## §1 · 앱 쪽 (REQ 1) — FulfillSheet · useHandOver

### 1.1 FulfillSheet → useFulfillOrder (master `77b930c`)

**파일**: `components/orders/FulfillSheet.tsx` · `api/hooks/pos-payments.ts:181-200`

| 항목 | 값 |
|---|---|
| URL | `POST /admin/pos/orders/{order_id}/fulfill` |
| Body | `{stage:'hand_over', method:'pickup'\|'delivery', courier?, driver?, contact?, tracking_ref?, note?}` |
| 성공 토스트 조건 | `mutateAsync` resolve(HTTP 200) → 무조건 `Toast 'Handed over'/'Dispatched'` (응답 body 필드 무검사) |

```typescript
// pos-payments.ts:181 useFulfillOrder
mutationFn: async (input: FulfillInput) => {
  const body: Record<string, unknown> = { stage: 'hand_over', method: method ?? 'pickup' };
  ...
  return sdk.client.fetch(`/admin/pos/orders/${input.order_id}/fulfill`, {
    method: 'POST', body
  }) as PosFulfillResponse;
},
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['order'], exact: false });   // dead (prefix 불일치)
  qc.invalidateQueries({ queryKey: ['orders'], exact: false });  // ✓ useOrder 커버
},
```

### 1.2 useHandOver (master, `api/hooks/pos-orders.ts:36-51`)

| 항목 | 값 |
|---|---|
| URL | `POST /admin/pos/orders/{order_id}/fulfill` |
| Body | `{stage:'hand_over'}` (method/courier 없음 — 기존 경로 유지) |
| 성공 토스트 | `app/orders/[orderId].tsx:528` `Toast 'Handed over'` (mutateAsync resolve 시) |

### 1.3 쿼리 키 정합 분석

| 키 | 소스 | 일치? |
|---|---|---|
| `useOrder` queryKey | `api/hooks/orders.ts:49` → `['orders', 'order', orderId]` | — |
| `invalidateQueries(['orders'])` | `pos-payments.ts:200` · `pos-orders.ts:48` | **✓** (`['orders']`는 `['orders','order',orderId]`의 prefix → 무효화 성공) |
| `invalidateQueries(['order'])` | 동일 | **✗** (`['order']`는 `['orders',…]`의 prefix 아님 → dead invalidation · 무해) |

**결론 §1**: 앱 side query invalidation은 **정상**. `['orders']` 무효화가 `useOrder`를 커버한다. queryKey 불일치가 증상 원인 아님.

---

## §2 · 서버 쪽 (REQ 2) — fulfill route 경로 분석

### 2.1 배포 route 전체 흐름 (storeport `4f3cd43`, M0-1105-R/S)

```
POST /admin/pos/orders/:id/fulfill
  ↓
order 조회 (query.graph fields:["id","metadata","items.*"])
  ↓
preorderPickup = (order_type==='preorder' && stage==='hand_over' && preorderMd?.stage==='paid_full')
  ↓
if (order_type==='takeaway' || preorderPickup)  ← ①②모두 진입
  ↓
  createOrderFulfillmentWorkflow  ← POS 주문 shipping_option_id 없음 → "service_zone" TypeError throw
    ↓
  isInventoryLinkError("…undefined…") → TRUE  ← "service_zone" 에러가 "undefined" 포함
    ↓
    (a) adjustInventory [metadata.inventory_item_id 힌트 있을 때만]
    (b) fulfillmentModule.createFulfillment({ items:[{sku: null?}] })  ← 뿌리 A
         → sku:null → FulfillmentItem.sku NOT NULL 위반 → throw
         → catch(polyErr) { warn non-fatal }  ← 200 계속
    (c) ※ orderModule.registerFulfillment 호출 없음  ← 뿌리 B
  ↓
metadata 갱신 (fulfillment_stage='hand_over')
  ↓
completeOrderWorkflow (non-fatal)  → order.status='completed' (또는 실패 시 'pending' 유지)
  ↓
res.status(200).json({ok:true, fulfillment_id:null|row.id, completed:true|false})
```

### 2.2 뿌리 A — sku null → FulfillmentItem.sku NOT NULL 위반

**file:line**: `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts:214` (commit `4f3cd43`)

```typescript
// fulfill/route.ts:210-217
const polyfillItems = ((order.items ?? []) as any[])
  .filter((it: any) => it?.id && Number(it?.quantity ?? 0) > 0)
  .map((it: any) => ({
    title: it.title ?? it.product_title ?? "pos line",
    sku: (it.metadata as any)?.sku ?? null,   // ← SKU 없는 상품 → null → 위반
    quantity: Number(it.quantity),
    line_item_id: it.id,
  }));
```

**운영 증거** (`logs/railway-api-20261107-1550-1607.log`):
```
[M0-1105-R] fulfillment polyfill failed (non-fatal · row keeping only):
  Value for FulfillmentItem.sku is required, 'null' found
  entity: FulfillmentItem { title: 'Iced Tea', sku: null, ... }
```

→ polyfill throw → `catch(polyErr)` non-fatal → `fulfillment_id = null` → 200 반환

### 2.3 뿌리 B — orderModule.registerFulfillment 미호출 (더 근본)

**file:line**: `fulfill/route.ts:219-242` 블록에 `orderModule.registerFulfillment` 없음

```typescript
// fulfill/route.ts:218-241 (sku 문제 없이 polyfill 성공해도)
if (polyfillItems.length > 0 && default_location_id) {
  const created = await fulfillmentModule.createFulfillment({...});
  const row = Array.isArray(created) ? created[0] : created;
  if ((row as any)?.id) {
    fulfillment_id = (row as any).id;
    // ← HERE: orderModule.registerFulfillment 미호출!
    // → order_line_item_detail.fulfilled_quantity 갱신 안 됨
    // → GET /admin/orders/:id의 fulfillment_status = 'not_fulfilled' 유지
  }
}
```

Medusa 2의 `fulfillment_status`는 Order 모듈이 `order_line_item_detail.fulfilled_quantity`에서 계산한다. `fulfillmentModule.createFulfillment`만으로는 이 값이 갱신되지 않는다. `orderModule.registerFulfillment`가 반드시 필요하다.

### 2.4 non-fatal catch로 200 돌려주는 분기

**file:line**: `fulfill/route.ts:243-247`

```typescript
} catch (polyErr) {
  // eslint-disable-next-line no-console
  console.warn(
    `[M0-1105-R] fulfillment polyfill failed (non-fatal · row keeping only): ${(polyErr as Error).message}`,
  );
}
// → sku 위반 등 모든 polyfill 에러를 삼키고 200 계속 진행
```

이것이 "Handed over" 성공 토스트가 뜨는데도 `fulfillment_status`가 바뀌지 않는 직접적 원인.

---

## §3 · 운영 실측 (REQ 3)

로컬 env 자격증명 없음 — 코드 분석 + Nov 7 railway 로그 근거로 추론.

### 3.1 Order #48 (R-261110-0002 · Pre-order · Balance due 0)

| 항목 | 추정값 | 근거 |
|---|---|---|
| fulfillments 개수 | 0 | sku null polyfill 실패 (Nov 7 로그 동일 패턴) + orderModule.registerFulfillment 미호출 |
| fulfillment_status | `not_fulfilled` | Order 모듈 fulfilled_quantity 미갱신 |
| order.status | `completed` | preorder paid_full + hand_over → completeOrderWorkflow 성공 가능성 높음 |
| metadata.preorder.stage | `paid_full` | tenders/route.ts:304 `balance_due > 0 ? 'dp_paid' : 'paid_full'` · Balance due=0이므로 paid_full |
| reservations | > 0 가능 (미소진) | releaseReservationsForLineItems는 PR#200에서 추가 — 배포 버전 미구현 |

preorderPickup 판정:
```
preorderPickup = (order_type==='preorder') && (stage==='hand_over') && (preorderMd?.stage==='paid_full')
              = true && true && true = TRUE
```
→ fulfillment 블록 진입 → 동일 polyfill 경로 → 동일 실패

### 3.2 Hand over한 Takeaway 주문 1건

| 항목 | 추정값 | 근거 |
|---|---|---|
| fulfillments 개수 | 0 | 동일 polyfill 경로 |
| fulfillment_status | `not_fulfilled` | 동일 |
| order.status | `completed` | completeOrderWorkflow 성공 |
| reservations | > 0 가능 | 동일 |

### 3.3 재현 curl

```bash
# 1. admin 토큰 취득
TOKEN=$(curl -s -X POST https://api.meros.id/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}' | jq -r .token)

# 2. Order #48 상세 (order_id 확인 후 대입)
curl -s "https://api.meros.id/admin/orders/<ORDER_ID>" \
  -H "Authorization: Bearer $TOKEN" | jq '{
    id,
    status,
    fulfillment_status,
    metadata_preorder_stage: .metadata.preorder.stage,
    fulfillments_count: (.fulfillments | length)
  }'

# 3. reservations (inventory module 직접 조회)
curl -s "https://api.meros.id/admin/pos/orders/<ORDER_ID>" \
  -H "Authorization: Bearer $TOKEN" | jq '.order.reservations // .reservations'
```

---

## §4 · 결론표 (REQ 4)

| 항목 | 증상 ① Pre-order Fulfill | 증상 ② Takeaway Hand over |
|---|---|---|
| **뿌리 1줄** | M0-1105-R/S 폴리필: `sku:null` → NOT NULL 위반 → polyfill throw **AND/OR** `orderModule.registerFulfillment` 미호출 → 200 반환 but `fulfillment_status` 미전이 | 동일 경로 |
| **file:line** | `fulfill/route.ts:214` (sku null) · `:219-242` (registerFulfillment 없음) in `4f3cd43` | 동일 |
| **고칠 주인** | M0 서버 | M0 서버 |
| **수정 범위** | 1) `:214` sku fallback chain (non-null 보장: `metadata.sku → variant_sku → product_handle → title → 'pos-<id tail>'`) | 동일 |
| | 2) `:241` 이후 `orderModule.registerFulfillment({order_id, reference:'fulfillment', reference_id:fulfillment_id, items:[...]})` + `link.create([{ORDER:{order_id}, FULFILLMENT:{fulfillment_id}}])` 추가 | 동일 |
| | 3) PR#200 (`feat/m0-1105-t-reservations` · M0-1105-T §B §C) 이미 위 수정 구현됨 → merge + deploy | 동일 |
| **재현 통합테스트** | `tenders.spec.ts` #35 (PR#200) — sku 없는 상품 → tender → fulfill → `fulfillment_status==='fulfilled'` · `fulfillments.length>0` | 동일 (#25 takeaway 경로) |

### ①②가 같은 뿌리?

**YES** — 완전히 동일.

- ①(preorder): `preorderPickup=true` → 동일 `createOrderFulfillmentWorkflow` → 동일 fallback → 동일 polyfill 경로
- ②(takeaway): `order_type==='takeaway'` → 동일 경로

두 증상의 차이는 경로 진입 조건뿐 (`order_type` vs `preorderPickup`). 폴리필 블록과 `orderModule.registerFulfillment` 미호출 버그는 동일하다.

**최우선 수정**: 뿌리 B (`orderModule.registerFulfillment` 미호출) — sku 문제가 없는 상품도 `fulfillment_status`가 갱신되지 않으므로 뿌리 A보다 더 근본적. 뿌리 A는 추가로 polyfill 행 자체를 생성하지 못하게 한다.

**배포 경로**: PR#200 (`feat/m0-1105-t-reservations` HEAD `78df78f` 기준 `registerFulfillmentOnOrder` + sku fallback 구현 완료) → merge to main → deploy.

---

## §5 · 앱 쪽 조치 필요 없음

FulfillSheet(`useFulfillOrder`) · `useHandOver` 모두:
- URL/body 계약 ✓ (서버 계약 완전 일치)
- query invalidation ✓ (`['orders']` prefix가 `useOrder` 커버)
- 성공 토스트는 HTTP 200 기준 → 서버가 200 반환하는 한 정상 (서버 수정 후 `completed:true` 확인 가능하나 현재도 UX 문제 없음)

앱에서 추가 대응이 필요한 경우: `PosFulfillResponse.completed` 필드를 성공 판단 기준으로 추가(`completed===false`이면 warn toast) — 선택적, 이번 뿌리 해소와 무관.
