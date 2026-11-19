storeport PR #388 · 위반 7→0 O · 로직0 O · unit O · build O

## 위반 7건 what→where 표

| # | 위반 파일 | 위반 import | 처리 | 승격 위치 |
|---|---|---|---|---|
| 1 | `src/lib/link-customer-order.ts` | `api/admin/pos/_shared/manager-pin` (verifyManagerPin·resolveStoreId·recordPinAudit·wibDateKey) | 패턴 A | `src/lib/manager-pin.ts` |
| 2 | `src/lib/loyalty/earn.ts` | `modules/pos_settings` (POS_SETTINGS_MODULE) | 패턴 B | `src/lib/pos-settings-module.ts` |
| 3 | `src/lib/loyalty/snapshot-earn.ts` | `modules/pos_settings` (POS_SETTINGS_MODULE) | 패턴 B | (동일) |
| 4 | `src/lib/loyalty/__tests__/earn-offset.unit.spec.ts` | `modules/pos_settings` (POS_SETTINGS_MODULE) | 패턴 C | lib 경로로 전환 |
| 5 | `src/lib/loyalty/__tests__/snapshot-earn.unit.spec.ts` | `modules/pos_settings` (POS_SETTINGS_MODULE) | 패턴 C | lib 경로로 전환 |
| 6 | `src/modules/payment_xendit/__tests__/qris-simulate-bk.unit.spec.ts` | `api/admin/pos/orders/[id]/qris-simulate/route` (handleQrisSimulate) | 패턴 C | `src/modules/payment_xendit/lib/qris-simulate-handler.ts` |
| 7 | `src/modules/payment_xendit/__tests__/qris-xendit-bd.unit.spec.ts` | `api/admin/pos/_shared/xendit-refund` (tryXenditRefund) | 패턴 C | `src/modules/payment_xendit/lib/xendit-refund.ts` |

## ESLint 로그

```
Before: 7 boundary warnings (no-restricted-imports)
After:  0 boundary warnings

✖ 9 problems (0 errors, 9 warnings)   ← pre-existing unused eslint-disable directives only
  0 errors and 9 warnings potentially fixable with the --fix option.
```

## 테스트 로그

```
Unit tests:
  Test Suites: 47 passed, 47 total
  Tests:       539 passed, 539 total
  Time:        8.775 s

Smoke test (checkout-handover-smoke):
  PASS integration-tests/pos/checkout-handover-smoke.spec.ts (205.913 s)
    ✓ cash: pos-complete → fulfill → Fulfilled · 재고 1 감소 (27703 ms)
    ✓ qris (invoice_number 6자리): 같은 흐름으로 Fulfilled · 재고 1 감소 (108730 ms)
  Test Suites: 1 passed, 1 total
  Tests:       2 passed, 2 total
```

## 빌드 로그

```
info:    Backend build completed successfully (10.87s)
info:    Frontend build completed successfully (22.86s)
```

## PR
https://github.com/CuriocityDevAi/storeport/pull/388
