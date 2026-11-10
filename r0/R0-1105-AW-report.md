# R0-1105-AW Report

**Date:** 2026-11-10  
**Reviews:** storeport #205 (534da5a re-check) · storeport #206 · agilo-medusa-pos-fork #75  
**Verdicts:** ① APPROVE · ② APPROVE · ③ APPROVE  
**Deploy order:** #205 → #206 → #75

---

## ① storeport #205 — 534da5a re-check only

**Verdict: APPROVE · merge & deploy independently**

### Shared builder `_shared/fulfillment-items.ts`

Single source of truth for Medusa 2.17 `FulfillmentItem` NOT NULL fields.

| field | fallback chain |
|-------|----------------|
| `title` | `line.title → product_title → "pos line"` |
| `sku` | `meta.sku → variant_sku → product_handle → title → product_title → pos-{id-tail}` |
| `barcode` | `meta.barcode → variant_barcode → sku → ""` |
| `quantity` | `Number(line.quantity)` |

**Barcode empty-string concern:** `barcode ?? ""` only triggers if `sku` is also empty. `sku` is guaranteed non-empty via `fallbackTail(line.id)` = `pos-{id-tail}`. In practice `barcode` is always identical to `sku` or better. Empty string is NOT NULL-compatible (SQL NOT NULL rejects only null/undefined). Concern is moot. ✓

**`_shared/` dir not a route:** Routes-loader skips `_`-prefixed path segments (`routes-loader.js:104`). Confirmed via commit message citing actual node_modules source. ✓

**Both routes unified:** `fulfill/route.ts` and `repair-stuck-fulfillments/route.ts` both import and use `buildFulfillmentPolyfillItems`. 40-line inline copies removed. M0-1105-R (sku) and M0-1105-AA (barcode) pattern closed permanently. ✓

**`variant_barcode` projected in both graph queries:** both routes now include `items.variant_barcode` so the fallback chain reaches actual data. ✓

**Unit tests:** 7 cases covering required-field completeness, `metadata.barcode` priority, all-null degenerate, quantity=0 / no-id filter, `inventory_item_id` conditional, constant integrity. ✓

**CI pos-integration:** `pass` 2m35s 43/43 — confirmed via `gh pr checks 205`. ✓

**File overlap with #206:** `integration-tests/pos/tenders.spec.ts` modified in both PRs (#205 adds tests #39-#43; #206 adds #44-#46, updates #26). Will conflict at merge time. **#205 must merge first; #206 must rebase after.** No other overlapping files.

---

## ② storeport #206 — delivery server contract

**Verdict: APPROVE · deploy after #205 merges**

### App body shape vs server `validateDeliveryBody`

App `toDeliveryBody` output: `{recipient_name, phone, address_lines[], note?}`  
Server expects: identical shape. ✓

**Phone validation — 0 app-accepts-but-server-rejects cases:**

| scenario | app | server |
|----------|-----|--------|
| `+62` + 10 digits (`+628111222333`) | valid | valid (pattern 1 `^\+?62[0-9]{8,14}$`) |
| `0` + 11 digits (`081234567890`) | valid | valid (pattern 2 `^0[0-9]{8,13}$`) |
| `0` + 7 digits (`08111222`, edge) | valid (app `{7,14}` after `0`) | valid (pattern 3 `^\+?[0-9]{8,15}$`) |
| bare no-prefix digits | rejected by app | accepted by server |

App is MORE restrictive than server on prefix requirement. Server's third pattern covers all app-valid numbers. Zero 400s from phone. ✓

App sends `phone.trim()` (retains separators); server strips `[\s\-()]`. Both strip the same character set. No data loss. ✓

App filters empty `address_lines` before sending; server filters identically. 1–6 contract aligns. ✓

App omits `note` key when empty; server treats absent `note` as `null`. ✓

### `order.metadata.delivery` — server writes, app reads

Server writes to `metadata.delivery`:
```json
{ "recipient_name": "...", "phone": "<stripped>", "address_lines": [...], "note": "...",
  "stage": "awaiting_dispatch", "awaiting_dispatch_at": "..." }
```
App `extractOrderDelivery(order.metadata)` reads `.recipient_name/.phone/.address_lines/.note`. All four keys present. `phone` stored stripped — correct for display. ✓

GET `/admin/pos/orders/:id` also exposes top-level `delivery` from same `metadata.delivery` source as convenience. App reads from `order.metadata` directly — consistent. ✓

### Receipt `snapshot.delivery` key

`buildSnapshot` accepts `delivery?` in `ReceiptSnapshotInput` and passes verbatim: `delivery: input.order.delivery ?? null`. Key name `delivery` matches on both server snapshot output and app `ReceiptSnapshot` type. ✓

Tenders route: `delivery: effectiveOrderType === 'delivery' && deliveryBody ? {...} : null`. Takeaway/Preorder get `null`. ✓

### Takeaway / Pre-order regression: 0

`validateDeliveryBody` only invoked when `effectiveOrderType === 'delivery'`. Existing preorder paths untouched. `medusa-config.ts` changes: 0. `fulfill/**` changes: 0. ✓

---

## ③ agilo-medusa-pos-fork #75 — delivery app side

**Verdict: APPROVE · deploy after #206 is live in production**

### Request body matches server contract

`PosTenderInput.delivery?` shape (`{recipient_name, phone, address_lines[], note?}`) matches server `validateDeliveryBody` input exactly. ✓

`toDeliveryBody`: trims name, trims phone (server strips separators after), filters empty lines, omits empty note. Server validates identical trimmed/stripped values. Zero 400s. ✓

### Phone validation alignment

App `isPhoneValid` strips `[\s()-]+` then checks `^(\+62|0)\d{7,14}$` + digits-length `[8,15]`. Server's third pattern `^\+?[0-9]{8,15}$` covers all app-valid numbers. No app-valid-but-server-reject case. ✓

### Order detail `order.metadata.delivery`

`extractOrderDelivery(order.metadata)` reads `metadata.delivery.{recipient_name, phone, address_lines, note}`. Server writes exactly those keys. ✓  
Guards against pre-feature orders: `orderType !== 'delivery' → null`, `!d.recipient_name → null`. ✓

### Receipt snapshot key alignment

`ReceiptSnapshot.delivery?` type matches server `buildSnapshot` output key-for-key. `ReceiptCard.tsx` and `receipt-escpos.ts` both guard `snap.order_type === 'delivery' && snap.delivery`. ✓

### Takeaway / Pre-order regression: 0

`tender-cash` spreads delivery only when `resolvedType === 'delivery' && deliveryBody` — both cash and card paths. Otherwise `{}`. ✓  
`OrderTypePicker` only removes `disabled: true` from Delivery chip — Takeaway/Pre-order unchanged. ✓

### Assertions script

`scripts/m3-1105-ac-assertions.mjs` covers 7 points: (a) `toDeliveryBody` deep-equal with #206 fixture, (b) no unconditional delivery spread, (c) `isDeliveryValid` guards, (d) no raw hex, (e) Delivery enabled, (f) receipt/order-detail render paths, (g) `PosTenderInput.delivery?` declared. All verified against source. ✓

---

## ③ Recommended deploy order

```
1. storeport #205  (fulfill fix · no delivery dep · independent)
2. storeport #206  (server delivery contract · rebase on updated main after #205)
3. agilo-medusa-pos-fork #75  (app delivery · deploy after #206 is live)
```

**Operational impact between steps:**

| window | risk |
|--------|------|
| #205 deploying | 0 — fulfill only, no delivery touch |
| #206 live but #75 not yet | 0 — old app has Delivery button `disabled: true`; no user can initiate delivery |
| #75 live (Delivery enabled) | Server (#206) already validates and stores → clean path |

No broken delivery payments at any point in this sequence. Existing Takeaway and Pre-order orders unaffected throughout.

---

## Run log

- `git fetch origin` — storeport ✓, pos-r0 ✓
- storeport #205 CI: `gh pr checks 205` → `pos-integration pass 2m35s` (43/43 · run 42779586675) ✓
- 534da5a full diff reviewed via GitHub MCP `get_commit(detail=full_patch)` ✓
- #206 `tenders/route.ts`, `receipt/service.ts`, `orders/[id]/route.ts` full content reviewed ✓
- #75 full diff reviewed (DeliveryInputs, tender-cash, checkout/delivery, receipt, order detail, assertions script) ✓
- PR review comments submitted: storeport#205 ✓, storeport#206 ✓, agilo-medusa-pos-fork#75 ✓
  (GitHub returned 403 for self-approve; submitted as COMMENT reviews instead)
