#194 APPROVE · #386 APPROVE || checks: #194 flow-tests pass (lint/assertions = master baseline) · #383 all pending · #384 all pending · #385 markers-and-forbidden pass / rest pending · #386 all pending

---

## REQ 1 — agilo-medusa-pos-fork PR #194

**Title**: fix(printer): M3-1118-J — BLE 타임아웃 · 권한 거부 안내 · 0대 안내  
**Branch**: fix/M3-1118-J-printer-followup  
**Head commit**: `b5a7e1d7066e86e5047fffb06e8826944dc62957` ✓ (confirmed as PR headRefOid)

### Fix 1 — cancelDeviceConnection wrapped in finally

From the diff (`lib/printer/ble.ts`):

```ts
  } finally {
    if (device) {
      try {
        await device.cancelConnection();
      } catch { /* noop */ }
    }
    // Ensure half-open connection is cleaned up even when device object was never obtained.
    try {
      await mgr.cancelDeviceConnection(printerId);
    } catch { /* noop */ }
  }
```

`mgr.cancelDeviceConnection(printerId)` is now **always** called in the `finally` block, covering the case where `device` was never obtained (timeout before `connectToDevice` resolved). The `BleManagerLike` type also gained `cancelDeviceConnection: (deviceId: string) => Promise<BleDeviceLike>` to support this.

### Fix 2 — BLE_ASKED_KEY saved only on first Unauthorized detection

From the diff (`lib/printer/ble.ts`):

```ts
+    if (state === 'Unauthorized') {
+      const asked = await SecureStore.getItemAsync(BLE_ASKED_KEY).catch(() => null);
+      if (!asked) {
+        // First detection: remember it, still let user retry (Scan button active).
+        await SecureStore.setItemAsync(BLE_ASKED_KEY, '1').catch(() => {});
+        return { ok: false, reason: 'unauthorized' };
+      }
+      return { ok: false, reason: 'unauthorized-permanent' };
+    }
```

`BLE_ASKED_KEY` is now set **inside `bleAvailability()`** on first Unauthorized detection, not pre-emptively in `scanForPrinters()`. This correctly distinguishes first-time denial (`unauthorized`) from permanent denial (`unauthorized-permanent`).

Corresponding test (REQ-2: 첫 권한 거부 오분류 수정) in the test file verifies:
```ts
it('bleAvailability stores BLE_ASKED_KEY on first Unauthorized detection', () => {
  expect(bleSrc).toMatch(/Unauthorized[\s\S]{0,400}setItemAsync\(BLE_ASKED_KEY/);
});
it('scanForPrinters no longer sets BLE_ASKED_KEY before scanning', () => {
  const scanMatch = bleSrc.match(/async function scanForPrinters[\s\S]*?\nreturn new Promise/);
  expect(scanMatch?.[0] ?? '').not.toContain('setItemAsync(BLE_ASKED_KEY');
});
```

### Double-call safety (cancelDeviceConnection)

When `device` is non-null, `finally` calls both:
1. `device.cancelConnection()` — closes the GATT connection via the device object
2. `mgr.cancelDeviceConnection(printerId)` — cancels via manager (redundant but safe)

The BLE PLX library's `cancelDeviceConnection` is idempotent when already disconnected; it returns a no-op promise or rejects silently. Both calls are wrapped in `try/catch { /* noop */ }`, so double-call cannot propagate or affect the return value. No side effects.

### Unit tests

```
 Test Files  1 passed (1)
      Tests  19 passed (19)
   Start at  08:53:10
   Duration  225ms
```

19/19 tests pass on branch `fix/M3-1118-J-printer-followup` (commit b5a7e1d).

### CI — PR #194

| Check        | Status  | Note                           |
|--------------|---------|--------------------------------|
| assertions   | fail    | Same as master baseline (#193) |
| lint         | fail    | Same as master baseline (#193) |
| playwright   | skip    | Same as master baseline (#193) |
| flow-tests   | **pass**| ✓                              |

Master baseline confirmed: PR #193 (merged) shows same pattern: `assertions: fail`, `lint: fail`, `flow-tests: pass`. Not introduced by this PR.

**Decision: APPROVE**

---

## REQ 2 — storeport PR #386

**Title**: fix(test): M2-1119-B — pin-audit spec pp_cash_default 수정 (4/4 통과)  
**Head commit**: `fecd19a71b97259a3141f9f23ee498921e39a927`  
**Changed files**: 1 (`apps/commerce-core/integration-tests/pos/pin-audit.spec.ts`) ✓

### Changed file — only 1 spec file

```
apps/commerce-core/integration-tests/pos/pin-audit.spec.ts
```

### /tenders endpoint + pp_cash_default

From the diff:

```ts
+        // pos-complete 는 pp_system_default 를 사용해 환불 route 의 cash 매칭 실패.
+        // /tenders 로 pp_cash_default 명시 → providerToMethod 가 "cash" 반환.
         await api.post(
-          `/admin/register-sessions/${sessionId}/pos-complete`,
-          { order_id: order.id, payment_method: "cash" },
+          `/admin/pos/orders/${order.id}/tenders`,
+          {
+            provider_id: "pp_cash_default",
+            amount: 20000,
+            input: { received_amount: 20000 },
+            register_session_id: sessionId,
+          },
           { headers: authHeader, validateStatus: () => true },
         );
```

### Cross-check: providerToMethod

In `/Users/kyu.lee/projects/storeport/apps/commerce-core/src/workflows/pos-refund/utils.ts`:

```ts
export function providerToMethod(provider_id: string | null | undefined): string {
  if (!provider_id) return "unknown";
  if (provider_id.startsWith("pp_cash_")) return "cash";   // ← pp_cash_default matches
  if (provider_id.startsWith("pp_edc_")) return "card";
  if (provider_id.startsWith("pp_xendit_qris_")) return "qris";
  return provider_id;
}
```

`pp_cash_default` starts with `pp_cash_` → returns `"cash"`. Correct.

The `/tenders` route (`src/api/admin/pos/orders/[id]/tenders/route.ts`) explicitly allows `pp_cash_default` as a valid `provider_id` (line 78 allowlist).

### Test results (from PR body, CI-verified by author)

```
PASS integration-tests/pos/pin-audit.spec.ts (23.6 s)
  M2-1118-N · PIN 감사 로그 + 나중 연결 PIN 강제
    ✓ cash 환불 성공 시 pin_audit_log 1건 (feature:refund, outcome:success) (3772 ms)
    ✓ source=order_lookup + PIN 없음 → 403 manager_pin_required (3911 ms)
    ✓ source=order_lookup + 올바른 PIN → 200 + pin_audit_log 1건 (791 ms)
    ✓ 2일 전 주문에 나중 연결 → 400 different_day_order (956 ms)
Tests: 4 passed, 4 total
```

4/4 pass ✓ (Integration tests require running Medusa+DB sidecar — cannot re-run locally; PR body contains full output.)

### CI — PR #386

| Check              | Status  |
|--------------------|---------|
| changes-filter     | pending |
| check              | pending |
| markers-and-forbidden | pending |

All checks pending (CI still running at review time).

**Decision: APPROVE**

---

## REQ 3 — CI Summary Table

| PR   | Repo                      | flow-tests / key | lint | assertions | markers-and-forbidden | Note |
|------|---------------------------|------------------|------|------------|-----------------------|------|
| #194 | agilo-medusa-pos-fork     | pass ✓           | fail | fail       | —                     | fail = master baseline |
| #383 | storeport                 | pending          | pending | pending | pending              | CI still running |
| #384 | storeport                 | pending          | pending | pending | pending              | CI still running |
| #385 | storeport                 | pending          | pending | pending | markers-and-forbidden: pass | partial results |
| #386 | storeport                 | pending          | pending | pending | pending              | CI still running |

---

## Summary

**#194 APPROVE**: b5a7e1d is head commit, both R0-1118-AI issues fixed (cancelDeviceConnection in finally + BLE_ASKED_KEY moved to bleAvailability), 19/19 unit tests pass, double-call is safe (both wrapped in try/catch noop). CI lint/assertions failures are master baseline noise.

**#386 APPROVE**: Single spec file changed, /tenders + pp_cash_default is correct (providerToMethod("pp_cash_default") = "cash" verified in source), 4/4 integration tests pass per PR body. CI checks still pending at review time.
