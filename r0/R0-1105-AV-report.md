# R0-1105-AV — Review Report · agilo-medusa-pos-fork #74

**Date:** 2026-11-10  
**Verdict:** APPROVE ✓  
**PR:** fix(m1-1105-ae): fulfilled=false → throw, not success toast (hooks only)  
**Branch:** `fix/m1-1105-ae-fulfill-honest` → `master`

---

## Execution Log

```
git -C ~/projects/pos-r0 fetch origin        # ✓ fresh
# checked out PR branch files for assertion run
node scripts/m1-1105-ae-assertions.mjs       # 28/28 passed · 0 failed
node scripts/run-all.mjs                     # 37/39 PASS · 2 pre-existing FAIL (unrelated)
# restored working tree + git stash pop
```

---

## §1 — Hook Logic · 28/28 Assertions PASS

**useFulfillOrder** (`api/hooks/pos-payments.ts`) and **useHandOver** (`api/hooks/pos-orders.ts`) — logic verified against 3 fixtures:

| Fixture | `fulfilled` | `already_fulfilled` | Condition result | Hook behavior |
|---------|-------------|---------------------|-----------------|---------------|
| `pos-fulfill-fulfilled-false-warning.json` | `false` | absent | `false && true` → **true** | ✓ throws `Error('Not fulfilled — please try again.')` |
| `pos-fulfill-fulfilled-true.json` | `true` | absent | `false && ...` → **false** | ✓ returns res (success) |
| `pos-fulfill-no-fulfilled-field.json` | `undefined` | absent | `undefined === false` → `false` | ✓ returns res (success, old-server compat) |

Edge case `already_fulfilled: true`: `res.fulfilled === false && res.already_fulfilled !== true` → `false && false` = `false` → success. Correct.

`fulfillment_warning` → `console.warn` only (no throw). Noted in PR as M3 round upgrade.

---

## §2 — Call Sites · All 3 Have catch

| File | Line | Error path |
|------|------|-----------|
| `app/checkout/success/[orderId].tsx` | 45 | `catch (e) { Toast.show({ type: 'error', text1: 'Fulfill failed', text2: msg }) }` ✓ |
| `app/orders/[orderId].tsx` | 529 | `catch (e) { showToast.error('Hand over failed', { text2: msg }) }` ✓ (#73 capsule) |
| `components/orders/FulfillSheet.tsx` | 89 | `catch (e) { Toast.show({ type: 'error', text1: 'Fulfill failed', text2: msg }) }` ✓ |

No unhandled call sites. Zero app-crash / unhandled-rejection risk.

**Note (pre-existing, not introduced by this PR):** `checkout/success` and `FulfillSheet` still use `Toast.show` instead of the `showToast` capsule API from #73. #73's PR description explicitly marked these as "파일 미변경." The throw does reach the error toast in both cases; it just renders as a standard toast rather than the capsule style. Updating those two sites to `showToast` is out of scope here.

---

## §3 — invalidate: `onSettled` + `['orders']`

Both hooks changed from `onSuccess` → `onSettled`. Cache is now invalidated on both success **and** failure.

```
// before (pos-orders.ts)
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['order'], exact: false });   // dead
  qc.invalidateQueries({ queryKey: ['orders'], exact: false });
}

// after
onSettled: () => {
  qc.invalidateQueries({ queryKey: ['orders'], exact: false });  // only key kept
}
```

**`['order']` key grep on PR branch:**

| File | Line | Usage |
|------|------|-------|
| `api/hooks/register-session.ts` | 257 | `invalidateQueries({ queryKey: ['order'] })` — pre-existing, not changed by this PR |

No `useQuery` registered with key `['order']`. The only order-detail query uses `['orders', 'order', orderId]` (`api/hooks/orders.ts:49`) — prefix-matched by `['orders']` invalidation. Removal of `['order']` invalidation has zero cache impact.

---

## §4 — Master Conflicts · run-all · Pre-#205 Safety

**Conflicts:** None. #73 (master) touched `app/orders/[orderId].tsx`, `app/_layout.tsx`, UI files. This PR touches `api/hooks/pos-payments.ts`, `api/hooks/pos-orders.ts`, fixtures, scripts. No file overlap.

**run-all results (run on working tree with PR files checked out):**

```
==== ASSERTIONS · 19개 ====
  · m1-1105-ae-assertions.mjs ... PASS · 0.1s   ← this PR
  ... 16 other PASS ...
  · m3-1105-d-assertions.mjs ... FAIL (exit 1)   ← pre-existing: OptionChip
  · m3-1105-s-option-chip-assertions.mjs ... FAIL ← pre-existing: receipt-layout.ts missing

==== PLAYWRIGHT · 20개 ====
  · (all 20) ... PASS

총 39개 · 37 PASS · 2 FAIL
```

The 2 failures (`m3-1105-d`, `m3-1105-s`) are pre-existing and unrelated to this PR — both require `OptionChip.tsx` / `lib/receipt-layout.ts` which are in the stash (WIP for another branch).

**Pre-#205 safety (old server = no `fulfilled` field):**  
`res.fulfilled` → `undefined`. `undefined === false` → `false`. Condition is `false` → no throw → success path. Behavior identical to before this PR. Safe to merge before storeport #205 deploys.

---

## Stale Comment (low priority, not a blocker)

`app/orders/[orderId].tsx:604` (not in this PR's diff):
```
{/* M3-1105-X · Fulfill 시트 — 성공 시 React-Query invalidate (`['order']`/`['orders']`) 가
    useFulfillOrder onSuccess 에서 이미 돌아 목록·상세 새로고침. */}
```
After this PR: `onSuccess` → `onSettled`, `['order']` removed. Comment is stale. Can be fixed in a follow-up pass.

---

## Verdict

**APPROVE.** The fix is correct, minimal, and backward-compatible. 28/28 assertions pass. All 3 call sites have error catch with toast. `['order']` dead key removal is clean. No conflict with master (#73). Pre-#205 behavior unchanged.
