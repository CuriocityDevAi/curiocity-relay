# M1-1117-G Report

**Branch:** feat/m2-1116-ak  
**Date:** 2026-11-17  
**Status:** ✅ All 4 fixes implemented, 3 E2E tests passing

---

## ① Cash 1st Slip 표시 (M1-1117-E 이미 수정 확인)

**Result:** Already fixed by M1-1117-E. The `SuccessScreen` correctly shows Slip 1 / Slip 2 buttons for split payment flows. No additional changes needed.

---

## ② Split 영수증 tender 줄에 "(1st Slip)" / "(2nd Slip)" 오디널 레이블

**File:** `components/receipt/ReceiptCard.tsx`

**Changes:**
- Added `ordinal(n)` pure function that returns English ordinal suffix (1st, 2nd, 3rd, 4th, etc.) with correct th/st/nd/rd rules
- `TenderBlock` now accepts `slipIndex?: number` prop; when present, appends `(Nth Slip)` to the method label
- Tenders rendered with `slipIndex` only when `tenders.length > 1` (split payments)

**Result:** Cash+QRIS split receipt now shows "CASH (1st Slip)" and "QRIS (2nd Slip)" in tender rows.

**Test:** `e2e/flows/10-m1-1117-g.spec.ts` — test ② ✅  
**Screenshot:** `e2e/screenshots/M1-1117-G-slip-labels.png`

---

## ③ 환불 실패 후 PIN 재진입 시 이전 값이 채워진 채 멈추는 버그

**File:** `components/orders/VoidRefundSheet.tsx`

**Root cause:** `onPressConfirm` called `setStep('pin')` without resetting `pin` state. `DigitsInput.onComplete` only fires on new 4-digit completion — if `pin` was already `'1234'` from the previous attempt, `onComplete` never re-fired and the submit loop was stuck.

**Fix:**
```ts
const onPressConfirm = async () => {
  if (needsPin) {
    setPin('');
    setPinError(null);
    setPinLocked(null);
    setStep('pin');
    return;
  }
  await submit();
};
```
Same reset added to the "Refund in cash" fallback button path.

**Bonus:** `submit()` catch block now includes error code from server response in the toast:
```ts
const errCode = extractErrorCode(e);
showToast.error(`${plan.actionLabel} failed`, {
  text2: `No money was returned. Try again.${errCode ? ` (code: ${errCode})` : ''}`,
});
```

**Test:** `e2e/flows/10-m1-1117-g.spec.ts` — test ③ ✅  
**Screenshot:** `e2e/screenshots/M1-1117-G-pin-reset.png`

---

## ④ QRIS 주문 Void 시트 — "Go to Refund" 버튼으로 Refund 모드 전환

**Files:** `components/orders/VoidRefundSheet.tsx`, `app/orders/[orderId].tsx`

**Root cause:** `isQrisVoidBlocked = true` when `plan.action === 'void'` and `originalTender === 'qris'`. Previously the method selector was hidden but no actionable path was provided to the user. The `onSwitchToRefund` prop was missing.

**Changes in `VoidRefundSheet.tsx`:**
- Added `onSwitchToRefund?: () => void` prop
- When `isQrisVoidBlocked`: hides method selector and PIN notice; shows notice text + "Go to Refund" button (testID: `qris-void-go-to-refund`)

**Changes in `app/orders/[orderId].tsx`:**
- Passes `onSwitchToRefund={() => setVoidRefundAction('refund')}` to `VoidRefundSheet`
- `voidRefundAction = 'refund'` → `sameShift = false` → `plan.action = 'refund'` → `isQrisVoidBlocked = false` → shows Refund Confirm button

**Test:** `e2e/flows/10-m1-1117-g.spec.ts` — test ④ ✅  
**Screenshots:** `e2e/screenshots/M1-1117-G-qris-void-blocked.png`, `e2e/screenshots/M1-1117-G-qris-switched-to-refund.png`

---

## Test Navigation Note

Tests ③ and ④ use the **checkout flow approach** to reach the order detail BottomSheet:
1. Navigate to `/checkout/tender-cash/order_mock_01` via `navigateTo()`
2. Click `cash-process` → see `payment-success`
3. Click `view-order` → `router.push` to Orders tab
4. `useFocusEffect` fires → BottomSheet becomes visible

This avoids the `navigateTo('/orders')` + order-row click approach which caused blank white screens when multiple routes were registered (the orders list rendered but the order row's `testID` wasn't found due to a mismatch between the LIFO route priority and complex mock structure).

---

## Files Changed

- `components/receipt/ReceiptCard.tsx` — ordinal slip labels (fix ②)
- `components/orders/VoidRefundSheet.tsx` — PIN reset + error code + Go to Refund (fixes ③ ④)
- `app/orders/[orderId].tsx` — onSwitchToRefund prop wiring (fix ④)
- `e2e/flows/10-m1-1117-g.spec.ts` — new E2E test file (3 tests)
- `e2e/fixtures/e2e-receipt-split-qris.json` — tenders updated to Cash+QRIS
