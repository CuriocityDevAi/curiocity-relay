APPROVE

## PR #166 · fix(cart): M1-1117-A/B — onSettled cache 오염 제거 · 재시작 즉시 크래시 방지

Reviewer: R0 (Claude Code) · 2026-11-17

---

### (a) `['draft-order']` cache shape pollution — CLEAN

All 6 `setQueryData` calls on `['draft-order']` in `api/hooks/draft-orders.tsx`:

| Line | Call site | Shape written |
|------|-----------|--------------|
| 456 | `useAddToDraftOrder` onMutate optimistic | `{ draft_order: { ...baseDraftOrder, items: nextItems } }` — explicit `AdminDraftOrderResponse` shape |
| 481 | `useAddToDraftOrder` onError rollback | `ctx.previousDraftOrder` — snapshot taken from cache (already valid shape) |
| 641 | `useUpdateDraftOrderItem` onMutate | `updatedDraftOrder: AdminDraftOrderResponse` — typed, spread from cached |
| 650 | `useUpdateDraftOrderItem` onError rollback | `context.previousDraftOrder` — snapshot |
| 799 | `useUpdateCustomer` onMutate | `updatedDraftOrder: AdminDraftOrderResponse` — typed spread |
| 807 | `useUpdateCustomer` onError rollback | `context?.previousDraftOrder` — snapshot |

The offending line from M1-1116-AJ:
```typescript
// REMOVED:
queryClient.setQueryData(['draft-order'], data as unknown as AdminDraftOrderResponse);
// data was AdminDraftOrderPreviewResponse = { draft_order_preview: ... }
```
is **gone** (confirmed by diff and reading `api/hooks/draft-orders.tsx:466-476`).

No `as unknown as` cast near a `setQueryData(['draft-order'])` call remains. The lone surviving `as unknown as AdminDraftOrderResponse` on line 462 is inside the optimistic `onMutate` and writes a correctly structured `{ draft_order: { ...baseDraftOrder, items } }` object — shape is valid.

No other files (`app/`, `components/`) call `setQueryData` with the `draft-order` key. Only `{ draft_order: DraftOrder }` or null/snapshot can enter the cache.

---

### (b) onSettled removal vs M1-1116-AJ "instant display / no flicker" intent — PRESERVED

M1-1116-AJ's UX requirement was: "second item appears instantly, no stale flicker". That was implemented in **two layers**:
1. `onSettled` setQueryData — **this was the buggy layer, now removed**
2. `onMutate` optimistic update — **this is the primary layer, still present**

Evidence at `api/hooks/draft-orders.tsx:434-465` (comment M2-1116-U / M3-1116-C / M1-1116-Y):
```
// M3-1116-C · 낙관적 갱신: 카트에 이미 있는 variant 는 수량을 즉시 반영
// M2-1116-U · 새 variant(toAdd)도 temp ID 로 즉시 캐시에 추가 → "빈 카트" 깜빡임 제거
// M1-1116-Y · cached=null(빈 카트) 에서도 동작하도록 guard 제거
```

The `onMutate` block (lines 438-465) still immediately writes `{ draft_order: { id: '__temp__', items: nextItems } }` to the cache before the network call. The `onSettled` now only calls `invalidateQueries` which triggers a background refetch after the optimistic update is already visible. No flicker regression.

---

### (c) Persistent cache buster `v1` + `isDraftOrderCacheCorrupted` — CORRECT

**Implementation** (`api/hooks/draft-orders.tsx:131-137`, `app/_layout.tsx:172`):
```typescript
export function isDraftOrderCacheCorrupted(data: unknown): boolean {
  if (data === null || data === undefined) return false;  // null/undefined = empty cart = OK
  if (typeof data !== 'object') return true;              // primitive = corrupted
  return !Object.prototype.hasOwnProperty.call(data, 'draft_order');  // must have key
}
```

**Restart with corrupted cache**: `isDraftOrderCacheCorrupted({ draft_order_preview: {...} })` → `true` → `removeQueries` called → data cleared. Test: `m1-1117-b.test.ts:48-54` PASS.

**Restart with valid cache**: `isDraftOrderCacheCorrupted({ draft_order: { items: [] } })` → `false` → cache untouched. Test: `m1-1117-b.test.ts:62-66` PASS.

**Fresh install** (empty cache): `queryClient.getQueryData(['draft-order'])` returns `undefined` → `isDraftOrderCacheCorrupted(undefined)` → `false` → no removeQueries, no crash. Test: `m1-1117-b.test.ts:28` PASS.

**buster `v1`** (`app/_layout.tsx:172`): `PersistQueryClientProvider persistOptions={{ ..., buster: 'v1' }}` invalidates all pre-PR persisted cache on first launch. Belt-and-suspenders alongside the runtime validator.

Edge note: `{ draft_order: null }` → `hasOwnProperty` returns `true` → `false` (not corrupted). This is correct — a null `draft_order` value is treated as empty cart, not corruption.

---

### (d) M1-1117-B scope in `app/checkout/*` — OPTIONAL CHAINING ONLY

Files touched in `app/checkout/`:
- `app/checkout/[draftOrderId].tsx` — **1 change**: line 55, `draftOrder.data?.draft_order.region?.` → `draftOrder.data?.draft_order?.region?.`

No other checkout files (`delivery/`, `split-tender/`, `success/`, `tender-cash/`, `tender-qris/`) are modified. Change is a pure null-guard tightening with no behavioral change.

---

### (e) `pendingVariantAdds` and `_draftOrderCreationPromise` from #158 — UNMODIFIED

Both module-level variables confirmed present and unmodified:
- `_draftOrderCreationPromise` at `api/hooks/draft-orders.tsx:85`
- `pendingVariantAdds` at `api/hooks/draft-orders.tsx:318`

All associated logic (lines 377-427) untouched.

---

### Test Results

- `npx vitest run __tests__/m1-1117-a.test.ts __tests__/m1-1117-b.test.ts` → **26/26 PASS**
- `npx vitest run __tests__/` → **303/303 PASS** (2 todo)
- `npx expo export --platform web` → **exit 0**, full bundle emitted to `dist/`

---

### Summary

Both crash paths are closed:
- **M1-1117-A** (runtime): removed the `onSettled` setQueryData that wrote wrong-shaped data into cache; UX intent preserved via `onMutate`.
- **M1-1117-B** (restart): `buster: 'v1'` purges old persisted cache; `AuthedBootstrap` validator removes any surviving corruption at login; `?.` optional chains prevent crash even if corruption somehow persists.

No blockers. APPROVE.
