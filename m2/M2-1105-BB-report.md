# M2-1105-BB Report

## 경로별 표 — order.status · reservation · Available

| 경로 | order.status | payment_status | reservation | Available | #81 모양? |
|------|-------------|----------------|-------------|-----------|-----------|
| `/void` | **canceled** | refunded | **0** | stocked | ✗ |
| `/return` (모든 품목, fulfillment 없음) | pending | refunded | **0** | stocked | ✗ |
| `/refund` (전액) | **pending** | refunded | **1 잔류** | stocked−1 | **✓ BUG** |

## 원인

**파일**: `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts`

`/refund` route 는 `refundPaymentWorkflow` 로 결제만 환불하고, `orderModule.cancel()` 과 `inventoryModule.deleteReservationItems()` 를 호출하지 않는다.

- `/void/route.ts` 는 step 1b(`orderModule.cancel`) + step 1c(R3 fix, `deleteReservationItems`)를 명시적으로 실행 → reservation 소거 ✓
- `/return/route.ts` 는 unfulfilled 품목에 대해 step 2a(`deleteReservationItems per line`) 실행 → reservation 소거 ✓
- `/refund/route.ts` 는 위 두 단계가 없음 → reservation 잔류 ✗

Order #81 모양(Refunded + NotFulfilled + status=pending): `/refund` 경로 단독으로 발생.

## Stock cleanup 사각지대

**stale 모드** (`release-stale-reservations/route.ts`, line 207–211):
```
const stale =
  info == null ||
  info.status === "completed" ||
  info.status === "canceled" ||
  info.fulfillment_stage === "hand_over";
```
`/refund` 후 주문: `status=pending`, `fulfillment_stage=null` → **어느 조건에도 해당 안 함 → 사각지대**

**query_open 모드**: `status=pending AND created_at < 24h` 로 24시간 뒤에 잡히긴 하지만, "전액 환불됐는데 취소 안 된" 주문은 의미상 stale 범주가 맞음. `payment_status=refunded` 필드로 운영자가 수동 식별 가능.

**올바른 범주**: "전액 환불됐는데 취소 안 된 주문" = **stale**

## 수정 제안

### 선호 방법 (refund/route.ts — step 1 이후)

담당: `/refund` route 수정 (M0 가 `return/route.ts` 작업 중이므로 충돌 없음)

```ts
// --- 1-b) Cancel order & clear reservations (void R3 pattern) ---
const { data: refreshRows } = await query.graph({
  entity: "order",
  fields: ["id", "status"],
  filters: { id: order_id },
});
if (refreshRows?.[0]?.status !== "canceled") {
  const orderModule = container.resolve(Modules.ORDER) as any;
  await orderModule.cancel(order_id);
}
try {
  const inventoryModule = container.resolve(Modules.INVENTORY) as any;
  const lineItemIds = ((order.items ?? []) as any[])
    .map((it: any) => it.id)
    .filter((v: unknown): v is string => typeof v === "string" && v.length > 0);
  if (lineItemIds.length > 0) {
    const reservations =
      (await inventoryModule.listReservationItems({ line_item_id: lineItemIds })) ?? [];
    const resIds = (Array.isArray(reservations) ? reservations : [])
      .map((r: any) => r?.id)
      .filter((v: unknown): v is string => typeof v === "string");
    if (resIds.length > 0) await inventoryModule.deleteReservationItems(resIds);
  }
} catch (e) {
  console.warn(`[M0-1105-AB] refund reservation cleanup failed: ${(e as Error).message}`);
}
```

### 대안 (release-stale-reservations/route.ts, stale 조건 추가)

```ts
const stale =
  info == null ||
  info.status === "completed" ||
  info.status === "canceled" ||
  info.fulfillment_stage === "hand_over" ||
  info.payment_status === "refunded"; // 전액 환불됐지만 미취소
```

## PR · CI

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/232
- **테스트 파일**: `apps/commerce-core/integration-tests/pos/refund-ghost-reservation.spec.ts`
- **통과**: `#BB-void`, `#BB-return`, `#BB-query_open` (3개)
- **it.failing 고정**: `#BB-refund`, `#BB-stale` (2개) — 수정 시 자동 반전
- **유닛 테스트 CI**: 97/97 PASS (push hook 확인)
