#452 CHANGES

## 판정 근거

### ⛔ CHANGES — REQ #1: `customer_flow.phone` 에 `phone_partial` 미반영 (POS-2 불동작)

**경로 추적**

```
CD KeypadPanel.onDigitsChange("0812…")
  → 150ms debounce sendPhonePartial
  → PATCH /customer-display/snapshots/:id { phone_partial: "0812…" }
  → service.updatePhonePartial → DB: phone_entry_state="typing", phone_partial="0812…"  ✓
  → serializeSnapshot → top-level phone_partial: "0812…"  ✓
  → deriveCustomerFlow(lifecycle.ts ~L257):
      phone = snapshot.customer_phone ?? null  ← null (submit_phone 전)
      phoneExposed = state==="entering" ? phone : null  ← null 그대로
  → customer_flow.phone = null  ✗
```

POS `CustomerPhoneStatus.tsx:231` (`CustomerFlowChip`, M3-1126-D):
```ts
if (chipKind === 'typing') {
  const partial = flow.phone ?? '';   // null → ''
  // → 항상 "Waiting for customer" (digits 입력 중에도)
}
```

**plans/cd-sync-contract-20261125.md 기준 판정**

§1 `phone`: "entering/first_visit/confirming 동안만 전체". POS M3-1126-D 는 `entering` 중 `flow.phone` 에 partial 이 채워진다고 가정해 구현됨. 계약서 v1.3(`phone_partial` 재명시)이 미완인 채로 POS 착지 → **서버가 `customer_flow.phone` 에 partial 반영하는 것이 정답**. POS chip 은 `customer_flow` 외부 필드에 접근하지 않으므로 서버 수정이 최소 범위.

**수정 위치 (1줄)**

`apps/commerce-core/src/modules/register_session/lifecycle.ts` → `deriveCustomerFlow` ~L296:
```diff
-    ? phone
+    ? (state === "entering" ? (snapshot.phone_partial ?? phone) : phone)
```

---

### ✅ REQ #2 — CD-1 `paid_age > 30s` 정상 흐름 중단 없음

`stalePaid = paid && (settled || !phoneEntryOpen) && paidAge > 30s`

활성 entering 상태:
- `settled = false` (entering ≠ confirmed/skipped/unconfirmed)
- `phone_entry_open = true` (`link_open_until` = `computeLinkOpenUntil` → 당일 22:00 WIB, 최소 ~2h)
- → `settled || !phoneEntryOpen = false || false = false` → `stalePaid = false` ✓

30초 가드는 CD refresh/재연결 시 지난 주문 잔존 방지용. 정상 흐름 중단 없음.

---

### ✅ REQ #3 — CD-2/CD-4 레이아웃·타이머

- `PhoneFlowScreen rightPanel="payment-complete"` → `PaymentCompletePanel` 우측 2/3, `leftPanel="receipt-mini"` 좌측 1/3 ✓
- 타이머: `index.tsx` 단일 3s `useEffect`, `ReceiptScreen.durationMs` 중복 제거 ✓
- e2e `cd-pos-sync-v2.spec.ts` CD-4 (`page.clock.fastForward`):
  - t=2.5s: `payment-complete-panel` visible ✓
  - t=3.5s: `keypad-panel` visible, `left-receipt-mini` 고정 ✓

---

### ✅ REQ #4 — CD-3 receipt `total` 키 / NaN 없음

`packages/receipt-view-model/src/receipt-view.ts` L90:
```ts
lineTotal: num(it.total)  // ← 서버 receipt.items[].total 키와 일치
```
서버 `receipt/service.ts`: `total: it.line_total` 로 저장 → 클라 `it.total` 로 읽음 → 일치.
CD ReceiptMiniVariant `formatRp(it.lineTotal)` NaN 없음 ✓.

모든 섹션(storeName·storeAddress·Order#·items·subtotal·tax·TOTAL·tenders·bottomOrderNumber·footer) 렌더 + testID 추가 ✓.

---

### ✅ REQ #5 — 테스트 결과 (직접 실행)

```
CD typecheck                : ✓ 0 errors
commerce-core typecheck     : ✓ 0 errors
CD unit (vitest)            : 313/313 passed
CD e2e (Playwright)         : 137/137 passed (132 기존 + 5 신규 cd-pos-sync-v2.spec.ts)
commerce-core unit (jest)   : 860/860 passed
```

apps/wing typecheck 오류 (`ButtonPrimitive` JSX type) 는 본 PR 도입 전 기존 문제.

---

## 실행 로그

```bash
# CD typecheck
cd ~/curiocity-live/storeport-wts/M0-1126-D-wt/apps/customer-display
pnpm typecheck
# → (no output = 0 errors)

# commerce-core typecheck
cd ~/curiocity-live/storeport-wts/M0-1126-D-wt/apps/commerce-core
pnpm typecheck
# → (no output = 0 errors)

# CD unit
cd ~/curiocity-live/storeport-wts/M0-1126-D-wt/apps/customer-display
pnpm test
# → Test Files 16 passed (16) / Tests 313 passed (313) / Duration 723ms

# e2e
pnpm exec playwright test --reporter=line
# → 8 skipped / 137 passed (25.9s)

# commerce-core unit
cd ~/curiocity-live/storeport-wts/M0-1126-D-wt/apps/commerce-core
pnpm test
# → Test Suites: 75 passed / Tests: 860 passed / Time: 43.535s
```

---

## 결론

**CHANGES 1건**: `deriveCustomerFlow` entering 분기에 `phone_partial` 반영 (`lifecycle.ts` 1줄) 추가 후 재요청.

나머지(CD-1~5 로직, 타이머 중복 제거, 영수증 키, e2e/unit) 모두 정상.
