# R0-1105-AQ 재진단 리포트 — Fulfill / Hand over 뒤 Not fulfilled

작성: 2026-11-10 · 분석 기준: storeport origin/main = **8ba49a0** (#203 · 11-09 머지 · 0f4b87b #200 포함)

---

## 0. storeport origin/main 확인

```
8ba49a0 fix(pos): repair-dangling-payment-links · 링크 엔티티 직접 조회로 'missing' 후보 탐지 (M0-1105-X · R0-1105-AI §C) (#203)
0f4b87b feat(pos): fulfill reservation 전수 소진 + body 계약 + delivery 흐름 + maintenance (M0-1105-T) (#200)
4f3cd43 feat(pos): collection 재사용 · hand_over completed 전이 · fulfillment polyfill + M3-M 계약 (M0-1105-R/S) (#199)
```

origin/main = 8ba49a0 → 0f4b87b(#200) **이미 포함**. 이후 분석 전부 origin/main 기준.

---

## REQ 1 — fulfill 경로 전면 재분석

### 1-A. 엔트리포인트 · 오더 조회

`POST /admin/pos/orders/:id/fulfill` → `route.ts:147`

```typescript
// route.ts:169-181
const { data } = await query.graph({
  entity: "order",
  fields: ["id", "metadata", "items.*", "items.variant_sku",
           "items.product_handle",
           "fulfillments.id"],   // ← id 만 투영
  filters: { id: order_id },
});
```

`fulfillments.id` 는 `order_fulfillment` 링크 테이블(Medusa 빌트인)을 통해 조회됨.

### 1-B. 멱등 가드 (hand_over 재누름 방지) — `route.ts:228-265`

```typescript
// route.ts:244
const alreadyHandedOver = Boolean(existingFulBlock.handed_over_at);
// route.ts:245-247
const existingFulfillmentRows = ((order.fulfillments ?? []) as any[])
  .filter((f: any) => f?.id);
// route.ts:248-264
if (stage === "hand_over" && (alreadyHandedOver || existingFulfillmentRows.length > 0)) {
  res.status(200).json({ ..., already_fulfilled: true });
  return;
}
```

**가드 발동 조건** (OR):
- (a) `metadata.fulfillment.handed_over_at` 가 truthy
- (b) `order.fulfillments.length > 0` (링크 테이블에 행 존재)

### 1-C. createOrderFulfillmentWorkflow 시도 — `route.ts:341-525`

```typescript
// route.ts:342-353
try {
  const { result } = await createOrderFulfillmentWorkflow(container).run({
    input: { order_id, items, ... } as any,
  });
  fulfillment_id = (result as any)?.id ?? null;
  inventory_decremented = true;
  // workflow 성공 시 reservation 안전망 삭제
  ...
} catch (e) {
  if (isInventoryLinkError(err)) {
    // ←→ fallback
  } else {
    res.status(500).json(...)  // fatal
  }
}
```

**POS 주문 실패 경로**: shipping_methods 없음 → workflow 내부에서 `shippingOptionId = undefined` → `retrieveProviderRegistration(undefined)` → AwilixResolutionError → 메시지에 "undefined" 포함 → `isInventoryLinkError` = **true** → fallback 진입.

### 1-D. Fallback (c) — polyfill 경로 — `route.ts:416-517`

```typescript
// route.ts:417-512 (try-catch polyErr)
try {
  ...
  // route.ts:471-490
  const created = await fulfillmentModule.createFulfillment({
    location_id: default_location_id,
    provider_id: "manual_manual",   // ← 등록 여부에 의존
    shipping_option_id: null,
    packed_at: new Date(),           // ← 명시 설정
    items: polyfillItems,
    ...
  });
  const row = Array.isArray(created) ? created[0] : created;
  if ((row as any)?.id) {
    fulfillment_id = createdFulfillmentId;
    // route.ts:497-509
    const reg = await registerFulfillmentOnOrder(container, { ... });
    if (!reg.linked && reg.warning) {
      inventory_warning = ...;
    }
  }
} catch (polyErr) {
  // route.ts:512-517 — NON-FATAL
  console.warn(`[M0-1105-T] fulfillment polyfill failed ...`);
}
```

**`createFulfillment` 내부 흐름** (`fulfillment-module-service.js:184`):
1. DB에 fulfillment 행 먼저 생성 (`:186`)
2. `fulfillmentProviderService_.createFulfillment(provider_id, ...)` 호출 (`:189`)
3. 실패 시 → catch → 행 **DELETE** → re-throw (`:14-16`)

**`retrieveProviderRegistration(providerId)` 흐름** (`fulfillment-provider.js:34`):
```javascript
retrieveProviderRegistration(providerId) {
  try {
    return this.__container__[`fp_${providerId}`];
  } catch (err) {
    if (err.name === "AwilixResolutionError") {
      throw new Error(`Unable to retrieve the fulfillment provider with id: ${providerId}\nPlease make sure that the provider is registered...`);
    }
    throw new Error(`Unable to retrieve the fulfillment provider with id: ${providerId}, ...`);
  }
}
```

### 1-E. `registerFulfillmentOnOrder` — `route.ts:107-145`

```typescript
async function registerFulfillmentOnOrder(container, args) {
  try {
    const orderModule = container.resolve(Modules.ORDER);
    // route.ts:117-122 — FULFILL_ITEM OrderChange 생성 + confirm
    await orderModule.registerFulfillment({
      order_id: args.order_id,
      reference: Modules.FULFILLMENT,
      reference_id: args.fulfillment_id,
      items: args.items,  // [{id: line_item_id, quantity: N}]
    });
    try {
      // route.ts:123-130 — order↔fulfillment 링크 등록
      const link = container.resolve(ContainerRegistrationKeys.LINK);
      await link.create([{
        [Modules.ORDER]: { order_id: args.order_id },
        [Modules.FULFILLMENT]: { fulfillment_id: args.fulfillment_id },
      }]);
    } catch (linkErr) {
      // route.ts:131-137 — NON-FATAL inner catch
      console.warn(`[M0-1105-T] fulfillment link create (soft) failed: ...`);
    }
    return { linked: true, warning: null };  // ← link 실패해도 linked:true 반환!
  } catch (e) {
    return { linked: false, warning: `register fulfillment failed: ${e.message}` };
  }
}
```

**멱등 가드 조건 file:line 요약**:

| 조건 | file:line |
|------|-----------|
| `alreadyHandedOver` = `Boolean(metadata.fulfillment.handed_over_at)` | `route.ts:244` |
| `existingFulfillmentRows.length > 0` | `route.ts:245-247` |
| 가드 발동 | `route.ts:248-264` |

**registerFulfillment non-fatal catch 조건 file:line 요약**:

| 항목 | file:line |
|------|-----------|
| outer catch (registerFulfillment 실패) | `route.ts:139-144` |
| inner catch (link.create 실패) | `route.ts:131-137` |
| polyErr catch (createFulfillment 실패) | `route.ts:512-517` |

### 1-F. `updateOrders` — `route.ts:544-578`

```typescript
// route.ts:544-556
if (stage === "hand_over") {
  nextMd.fulfillment = {
    ...,
    handed_over_at: new Date().toISOString(),   // ← 무조건 설정
  };
}
// route.ts:567-578
await (orderModule as any).updateOrders([{ id: order_id, metadata: nextMd }]);
```

`fulfillment_id` 가 `null` 이어도 — 즉 fulfillment 생성이 실패해도 — `handed_over_at` 는 **무조건** 기록된다.

---

## REQ 2 — 가설 ② 코드 판정 (기존 Not fulfilled 주문)

**가설**: "예전 hand_over 때 `metadata.fulfillment.handed_over_at` 이 이미 찍혔는데 fulfillment 는 실패한 주문 → 지금 Hand over 하면 멱등 가드가 "이미 됨"으로 아무것도 안 하고 200 → 영원히 Not fulfilled"

### 판정: **성립** — 두 경로 모두 코드로 확정

**경로 ②-A — `handed_over_at` 선기록**

```
이전 attempt → fulfillment 생성 실패(polyErr non-fatal)
            → updateOrders @ route.ts:568: handed_over_at 무조건 기록
현재 attempt → alreadyHandedOver = true @ route.ts:244
            → 가드 발동 @ route.ts:248
            → res.status(200).json({ already_fulfilled: true })
            → 아무것도 안 함 · fulfillment 영원히 없음
```

- 이전 시도에서 `createFulfillment` 가 실패(`polyErr`)하거나 `registerFulfillmentOnOrder` outer catch가 발동해도, `updateOrders` (route.ts:568)는 **항상** 실행됨 → `handed_over_at` 기록
- 이후 모든 시도: `alreadyHandedOver = true` → 가드 → `already_fulfilled: true` → 실제 fulfillment 없음 → `fulfillment_status = "not_fulfilled"`

**경로 ②-B — fulfillment 행이 있으나 `packed_at = null`**

pre-#200 코드(4f3cd43 · #199)의 polyfill 경로는 `packed_at` 를 명시하지 않았음. 따라서 그 시점에 처리된 주문은:
- `order_fulfillment` 링크 존재 → `order.fulfillments = [{id: "ful_...", packed_at: null}]`
- `getLastFulfillmentStatus`:
  - `fulfillmentStatus["fulfilled"] = 0` (packed_at = null 이므로 카운트 안 됨)
  - fallthrough → `return "not_fulfilled"`
- 현재 attempt: `existingFulfillmentRows.length > 0` → 가드 발동(route.ts:248-250) → `already_fulfilled: true` → 아무것도 안 함

**결론**: 가설 ② **코드상 완전 성립**.

---

## REQ 3 — 가설 ① (신규 주문 #48) 재현 경로 추적

**전제**: preorder paid_full · shipping_option 없음 · variant sku 없음

### 3-A. 실행 경로 추적

```
1. 쿼리 (route.ts:169): order.fulfillments = []  → alreadyHandedOver=false → 가드 미발동
2. stage="hand_over", preorderPickup=true → fulfillment workflow 진입 (route.ts:328)
3. createOrderFulfillmentWorkflow (route.ts:342):
     POS 주문 → shipping_methods=[] → shippingOptionId=undefined
     → retrieveProviderRegistration(undefined) → AwilixResolutionError
     → "undefined" in msg → isInventoryLinkError=true → fallback
4. fallback (c) (route.ts:417):
     polyfillItems 구성 — variant_sku=null → title or "pos-<id tail>" fallback
     → createFulfillment({ provider_id: "manual_manual", packed_at: new Date(), ... })
5. fulfillment-module-service.js:184:
     a. fulfillmentService_.create() → DB row 생성 (packed_at 포함)
     b. fulfillmentProviderService_.createFulfillment("manual_manual", ...)
        → retrieveProviderRegistration("manual_manual")
        → this.__container__["fp_manual_manual"]
```

### 3-B. `manual_manual` 등록 여부

`medusa-config.ts` (origin/main) 에서 fulfillment module 에 대한 providers 설정 없음:

```typescript
// medusa-config.ts modules 배열에 fulfillment 관련 항목 없음
// @medusajs/fulfillment providers.js:23:
await moduleProviderLoader({
  container,
  providers: options?.providers || [],  // ← 미설정 → []
  registerServiceFn: registrationFn,
});
// 결과: fp_manual_manual → container에 없음
```

`@medusajs/fulfillment-manual` 패키지는 pnpm에 존재하나, medusa-config.ts에서 명시적으로 등록하지 않는 한 container에 추가되지 않는다(`providers.js:21-25` — `moduleProviderLoader` 는 옵션 배열만 처리).

### 3-C. 실패 연쇄

```
5-cont. retrieveProviderRegistration("manual_manual"):
        fp_manual_manual 미등록 → AwilixResolutionError
        → throw Error("Unable to retrieve the fulfillment provider with id: manual_manual\n
                       Please make sure that the provider is registered...")
        (fulfillment-provider.js:34-50)
     c. fulfillment-module-service.js:14:
        catch(error) → fulfillmentService_.delete(fulfillment.id) → DB row 삭제
        → re-throw
6. route.ts:512 — catch(polyErr): non-fatal console.warn
   → fulfillment_id = null (할당 안 됨)
   → registerFulfillmentOnOrder 미호출
7. route.ts:544-556: stage="hand_over" 이므로
   nextMd.fulfillment = { ..., handed_over_at: new Date() }  ← 무조건 기록
8. route.ts:568: updateOrders → DB에 handed_over_at 영속화
9. route.ts:640: res.status(200).json({ ok:true, fulfillment_id: null, ... })
```

### 3-D. fulfillment_status = "not_fulfilled" 이유

앱이 `GET /admin/orders/:id?fields=...,fulfillment_status,...` 조회:
- `getOrderDetailWorkflow` → `getLastFulfillmentStatus(order)`
- `order.fulfillments = []` (order_fulfillment 링크 없음 · 행 생성 후 삭제됨)
- `aggregate-status.js:22`: `for (const f of order.fulfillments)` → 루프 0회
- `aggregate-status.js:33`: `totalFulfillments = 0`
- `aggregate-status.js:56`: `fulfillmentStatus["fulfilled"] = 0` → 조건 미충족
- `aggregate-status.js:68`: `return "not_fulfilled"`

### 3-E. `registerFulfillment` 가 Medusa 2.17 fulfillment_status 계산에 반영되는가?

**부분적으로만** — `registerFulfillment` 는 `OrderItem.fulfilled_quantity` 를 갱신한다(`FULFILL_ITEM` OrderChange → applyOrderChanges). 이 값은 `hasUnfulfilledItems` 체크에 사용됨. 그러나 `getLastFulfillmentStatus` 는:

```javascript
// aggregate-status.js:56-63
if (fulfillmentStatus["fulfilled"] > 0) {  // ← order.fulfillments에 packed_at 행 필요
  if (fulfillmentStatus["fulfilled"] === totalFulfillmentsExceptCanceled
      && !hasUnfulfilledItems) {
    return "fulfilled";
  }
  return "partially_fulfilled";
}
return "not_fulfilled";  // ← fulfillments[]가 비면 여기
```

`registerFulfillment` 만으로는 `order.fulfillments` 에 행이 생기지 않는다. `order_fulfillment` 링크(`link.create`) 가 같이 성공해야 `fulfillments[]` 가 채워지며, 각 fulfillment 에 `packed_at` 이 있어야 "fulfilled" 카운트가 올라간다. 따라서:

- `registerFulfillment` → `fulfilled_quantity` 갱신 (필요조건)
- `link.create` → `order.fulfillments[]` 채움 (필요조건)
- `createFulfillment(packed_at: new Date())` → fulfillment 행에 packed_at 기록 (필요조건)

**세 가지 모두 성공해야** `fulfillment_status = "fulfilled"`. 현재 `manual_manual` 미등록으로 `createFulfillment` 단계에서 실패 → 세 조건 모두 미충족.

---

## REQ 4 — 앱의 "Fulfillment status" 표시 경로

`apps/anchor/src/hooks/queries/useQueryOrder.ts:21-24`:
```typescript
sdk.admin.order.retrieve(orderId, {
  fields: "...,fulfillment_status,...,*fulfillments.*,...",
})
```
→ `GET /admin/orders/:id` → `getOrderDetailWorkflow` → `getLastFulfillmentStatus` 계산값 → `order.fulfillment_status` 필드. 서버 계산이므로 앱이 별도 값을 보는 케이스 없음.

---

## REQ 5 — 결론표

### 5-A. 가설 ① 뿌리 — 신규 주문 (Order #48)

| 항목 | 내용 |
|------|------|
| **뿌리** | `manual_manual` fulfillment provider 미등록 |
| **file:line** | `medusa-config.ts` (providers 설정 없음) + `route.ts:471-473` (`provider_id: "manual_manual"`) + `fulfillment-module-service.js:184` (createFulfillment) + `fulfillment-provider.js:34-50` (retrieveProviderRegistration throws) |
| **연쇄 차단** | `createFulfillment` → AwilixResolutionError → DB row 삭제 → re-throw → `route.ts:512` polyErr (non-fatal) → `fulfillment_id = null` |
| **2차 고착** | `route.ts:555`: `handed_over_at` 를 `fulfillment_id` 에 무관하게 무조건 기록 → 다음 시도: `alreadyHandedOver=true` → 가드 발동 → 영구 Not fulfilled |
| **주인** | M0 (백엔드 route.ts · medusa-config.ts) |
| **수정 범위** | ① `medusa-config.ts` 에 `@medusajs/medusa/fulfillment` 모듈 + `manual_manual` provider 등록 (또는 polyfill 경로에서 provider 호출 없이 직접 행 생성하도록 변경) ② `route.ts:555` 의 `handed_over_at` 기록을 `fulfillment_id != null` 조건으로 guard 처리 (실패 시 미기록) |

### 5-B. 가설 ② 뿌리 — 기존 Not fulfilled 주문

| 항목 | 내용 |
|------|------|
| **뿌리 ②-A** | 이전 attempt 에서 fulfillment 실패 후 `handed_over_at` 선기록 → `alreadyHandedOver = true` |
| **뿌리 ②-B** | pre-#200 polyfill 로 `packed_at = null` fulfillment 행 생성 → `order.fulfillments[0].packed_at = null` → "fulfilled" 카운트 0 → `existingFulfillmentRows.length > 0` 가드 발동 |
| **공통 차단** | `route.ts:248-264` 멱등 가드 → `already_fulfilled: true` → 재시도 불가 |
| **file:line** | `route.ts:244` (alreadyHandedOver), `route.ts:245-247` (existingFulfillmentRows), `route.ts:248-264` (가드 조건·리턴), `aggregate-status.js:20` (packed_at → "fulfilled" 카운트) |
| **주인** | M0 (백엔드 route.ts) |
| **수정 범위** | 가드 조건 개선: `existingFulfillmentRows.length > 0` 대신 `existingFulfillmentRows.some(f => f.packed_at)` 체크 (실제로 packed_at 가 있을 때만 가드) + ①번 fix 와 함께 `handed_over_at` 기록 조건화 |

### 5-C. 기존 Not fulfilled 주문 복구 방법

**maintenance 도구 필요 여부**: **필요**

복구 절차 (각 대상 주문):
1. `order.metadata.fulfillment.handed_over_at` 삭제 또는 null 로 초기화
   - 또는 가드 조건 개선 fix 배포 후 재시도 가능하게 경로 열기
2. fulfillment 행이 `packed_at = null` 로 존재하면: 행 `packed_at` 갱신 또는 삭제 후 재생성
3. `POST /admin/pos/orders/:id/fulfill { stage: "hand_over", ... }` 재호출

별도 maintenance endpoint (또는 admin script) 로 대상 주문 일괄 처리 권장.

### 5-D. 재현 테스트 이름 (제안)

```
test: POST /admin/pos/orders/:id/fulfill
  - "preorder paid_full + shipping_option 없음 → fulfillment_status=fulfilled (not_fulfilled 아님)"
  - "hand_over after handed_over_at set + fulfillment absent → retries correctly (not blocked)"
  - "manual_manual provider 미등록 → polyErr non-fatal · fulfillment_id=null · handed_over_at 미설정"
```

---

## 6. 핵심 증거 요약

```
# manual_manual 미등록 확인
medusa-config.ts → modules 배열에 fulfillment 항목 없음
providers.js:23 → providers: options?.providers || [] → []
→ fp_manual_manual 미등록

# createFulfillment 실패 → non-fatal
fulfillment-provider.js:34 → retrieveProviderRegistration("manual_manual") → throw
fulfillment-module-service.js:14 → catch → delete row → re-throw
route.ts:512 → catch(polyErr) → console.warn (non-fatal)
→ fulfillment_id = null

# handed_over_at 무조건 기록
route.ts:544-555 → stage="hand_over" → handed_over_at 기록 (fulfillment_id 체크 없음)
route.ts:568 → updateOrders → DB 영속

# 가드 차단
route.ts:244 → alreadyHandedOver = true (handed_over_at 존재)
route.ts:248-264 → 가드 발동 → already_fulfilled:true → 영구 Not fulfilled

# fulfillment_status 계산
aggregate-status.js:22 → order.fulfillments = [] → 루프 0회
aggregate-status.js:68 → return "not_fulfilled"
```

---

**결론**: ①② 모두 `manual_manual` provider 미등록 + `handed_over_at` 무조건 기록이라는 **동일한 뿌리**에서 비롯됨. ①번 fix(provider 등록 + handed_over_at 조건화)가 ②번 신규 발생도 차단한다. 기존 ② 주문은 별도 복구 도구 필요.
