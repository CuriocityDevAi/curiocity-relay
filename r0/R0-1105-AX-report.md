# R0-1105-AX — Review · fork #76 (Toast.show → showToast dark capsule)

**Verdict: APPROVE**

---

## 1. 7 places — text 1:1, type mapping, visibilityTime

| # | File | Old | New | OK |
|---|------|-----|-----|-----|
| 1 | checkout/success | `success · 'Product handed over…' · 2000` | `showToast.success('Product handed over…', { visibilityTime: 2000 })` | ✅ |
| 2 | checkout/success | `error · 'Fulfill failed' · text2=msg · 4000` | `showToast.error('Fulfill failed', { text2: msg, visibilityTime: 4000 })` | ✅ |
| 3 | checkout/success | `info · 'Reprinted' · text2='Receipt sent to printer' · 2000` | `showToast.info('Reprinted', { text2: 'Receipt sent to printer', visibilityTime: 2000 })` | ✅ |
| 4 | checkout/success | `info · 'Share (web preview)' · text2=text.slice(0,80)` (no visibilityTime) | `showToast.info('Share (web preview)', { text2: text.slice(0,80) })` (no visibilityTime → default) | ✅ |
| 5 | checkout/success | `error · 'Share failed'` (no text2, no visibilityTime) | `showToast.error('Share failed')` | ✅ |
| 6 | FulfillSheet | `success · label · 2000` | `showToast.success(label, { visibilityTime: 2000 })` | ✅ |
| 7 | FulfillSheet | `error · 'Fulfill failed' · text2=msg · 4000` | `showToast.error('Fulfill failed', { text2: msg, visibilityTime: 4000 })` | ✅ |

All 7 spots: text1 → first arg, text2 → opts.text2, success/error/info type maps to method name, visibilityTime preserved exactly.

## 2. Direct imports = 0 · remaining direct calls

Both target files:
- `import Toast from 'react-native-toast-message'` — removed ✅
- `Toast.show(` — 0 occurrences ✅
- Both now import `{ showToast } from '@/components/ui/toast'` ✅

App-wide `Toast.show(` remaining (via `git grep` on PR branch):
- `components/ui/toast/index.ts` — 3 calls (the wrapper itself) ✅ correctly in ALLOWED
- All other files: 0 ✅

`react-native-toast-message` direct imports remaining in app:
- `app/_layout.tsx` — `<Toast config=...>` renderer (host), not `Toast.show()` ✅
- `components/ui/BottomSheet.tsx` — `<Toast config=...>` renderer (host), not `Toast.show()` ✅
- `components/ui/toast/index.ts` — wrapper (owns the library boundary) ✅
- `config/toast.tsx` — type import only ✅

## 3. File scope · #75 overlap · run-all

Changed files in #76:
- `app/checkout/success/[orderId].tsx` (+6 / -6) — code files: 2 ✅
- `components/orders/FulfillSheet.tsx` (+3 / -3)
- `scripts/m1-1105-ag-assertions.mjs` (+71, new) — script ✅

#75 files: api/hooks/pos-payments.ts, app/checkout/[draftOrderId].tsx, app/checkout/delivery/[draftOrderId].tsx, app/checkout/tender-cash/[draftOrderId].tsx, app/orders/[orderId].tsx, components/payment/DeliveryInputs.tsx, components/payment/OrderTypePicker.tsx, components/receipt/ReceiptCard.tsx, lib/printer/receipt-escpos.ts, scripts/m3-1105-ac-assertions.mjs, types/receipt.ts.

**No file overlap between #76 and #75** ✅

Assertions: script logic verified manually — `Toast.show(` grep filtered by ALLOWED correctly yields 0 remaining; PR reports 26/26 PASS ✅
