# R0-1105-DM report

## A. storeport #240 — 수정 요청

**head SHA**: `7165883` · **mergeStateStatus**: UNSTABLE

1. **변경 범위** ✓ — `integration-tests/pos/pos-tax-lines.spec.ts` 1파일, 프로덕션 코드 diff 0
2. **grep 재확인** ✓ — 프로덕션 `item.tax_total` 직접 접근 없음
   - `tenders/route.ts:269,1311` → `order.tax_total` (aggregate) 사용
   - `tenders/route.ts:309` → "Medusa tax_total 은 0 전제" 주석
   - `orders/[id]/route.ts:61,99,212` → `order.tax_total` (aggregate)
3. **CJ-4 CI FAIL** — `Expected: 3001, Received: 0` (pos-tax-lines.spec.ts:566)
   - `retrieveOrder` 경로도 `item.tax_total` = 0 반환 (Medusa computed 필드 미populate)
   - `it.failing` → `it` 승격 불가 — 근본 수정 없이 CI 통과 불가능
4. **판정**: 수정 요청 — `items.tax_lines.amount` 합산 또는 `metadata.pos_totals.pb1_amount` 경로로 assertion 교체 필요

---

## B. fork #126 — APPROVE 상당

**head SHA**: `8a97f96` · **mergeStateStatus**: UNSTABLE (playwright in_progress)

1. **변경 범위** ✓ — `package.json` + `package-lock.json` 2파일
2. **6.x API 호환** ✓
   - `lib/receipt-share.ts:19` `viewShotRef.current.capture()` ✓
   - `app/orders/[orderId].tsx:706` `React.useRef<{ capture: () => Promise<string> }>` ✓
   - `app/orders/[orderId].tsx:711` `require('react-native-view-shot').default` ✓
   - `app/orders/[orderId].tsx:831` `options={{ format: 'png', quality: 1.0 }}` ✓
3. **html2canvas-pro** ✓ — optional peer dep 선언만, 미설치 → 번들 미포함; 구 `html2canvas@1.4.1` 제거
4. **CI** ✓ — lint pass · assertions(vitest 16 passed) pass · playwright in_progress
5. **판정**: APPROVE 상당 (playwright 완료 후 mergeStateStatus CLEAN 예상)

---

## C. fork #125 — playwright 통과

playwright: **SUCCESS** (job 131618274442 completed) · mergeStateStatus: **CLEAN**
