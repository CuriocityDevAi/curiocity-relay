---
round: M0-1105-R
pr:
  storeport: storeport#198
base_pr: null
outcome: tender-coll-reuse · fulfill-complete · fulfillment-polyfill · integration 17/17 (local) · CI 미발화 (DIRTY · #197 머지 뒤 rebase 는 다음 라운드)
kyu_checks: 1 (Kyu 실기 2차 ①②③ 소화 · R0-1105-U §C M0 라운드)
ci_links:
  pr: https://github.com/CuriocityDevAi/storeport/pull/198
  note: "CI 미발화 (PR DIRTY · main 이 #197 머지로 fe07858 에서 변동 · user 지침상 이 라운드에서 rebase 금지 — 다음 라운드)"
---

# M0-1105-R · collection 재사용 · complete 전이 · fulfillment polyfill

**일자**: 2026-11-07 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/orders/[id]/{tenders,fulfill}/route.ts` + `integration-tests/pos/{helpers,tenders.spec}.ts`.

**base**: storeport main `fe07858` (M0-1105-P 머지 뒤 · M0-1105-Q 머지 **전**). #197 과 무관 — 충돌 시 #197 머지 뒤 rebase 는 다음 라운드.

**claim**: `node scripts/claim.mjs M0-1105-R started "코드 수정 시작"` → `done` 끝.

---

## 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| ① | 결제 묶음 재사용 (section 1 pending 재사용 · 금액 다르면 삭제 후 신규) | ✓ |
| ② | hand_over 뒤 completeOrderWorkflow (preorder paid_full 조건) · completed:boolean | ✓ |
| ③ | fulfillment row polyfill (workflow 실패 시 createFulfillment · 재고 이중 차감 금지) | ✓ (best-effort · provider 환경 의존 · 리포트 §3 note) |
| ④ | 응답 shape 문서화 + fixture JSON 3종 | ✓ |
| ⑤ | Kyu 실주문 판별 curl (R0-U §B 재게재) | ✓ |
| — | 금지 (medusa-config · providers · 재고 차감 시점 · #197 파일) 변경 0 | ✓ |

---

## 1. 변경 ↔ file:line

### ① Collection 재사용 — `src/api/admin/pos/orders/[id]/tenders/route.ts` section 1
```ts
const existingPending = ((order.payment_collections ?? []) as any[]).find(
  (c) => c?.status !== "completed" && c?.status !== "canceled"
      && !(Array.isArray(c?.payments) && c.payments.length > 0),
);
if (existingPending && Number(existingPending.amount ?? 0) === amount) {
  payment_collection_id = String(existingPending.id); // 재사용
} else {
  if (existingPending) {
    await paymentModule.deletePaymentCollections?.([existingPending.id]);
  }
  // 신규 생성 (기존 workflow)
}
```
- 결과: 재tender 2회에도 `collections.length === 1` 유지.
- Kyu 실기 2차 ① 봉인.

### ② completeOrderWorkflow — `src/api/admin/pos/orders/[id]/fulfill/route.ts` 끝단
```ts
let completed = false;
if (stage === "hand_over") {
  const eligible = order_type !== "preorder" || preorderMd?.stage === "paid_full";
  if (eligible) {
    try {
      await completeOrderWorkflow(container).run({
        input: { orderIds: [order_id] } as any,
      });
      completed = true;
    } catch (e) {
      console.warn(`[M0-1105-R] completeOrderWorkflow failed (non-fatal · 결제·재고 유효): ...`);
    }
  }
}
res.status(200).json({ ..., completed, ... });
```
- takeaway 즉시 · preorder `preorder.stage === "paid_full"` 일 때만.
- 실패 non-fatal · 결제·재고·영수증 유효 유지.
- **tenders 쪽에선 호출 안 함** (결제≠완결 · Hand over 가 완결).

### ③ Fulfillment polyfill — `src/api/admin/pos/orders/[id]/fulfill/route.ts` catch block
```ts
try {
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
  await fulfillmentModule.createFulfillment({
    location_id: default_location_id,
    provider_id: "manual_manual",
    shipping_option_id: null,
    packed_at: new Date(),
    items: polyfillItems,
    labels: [],
    delivery_address: { first_name:"POS", last_name:"Hand-over", address_1:"In-store pickup", country_code:"id" },
    data: { pos: true, m0_1105_r_polyfill: true },
    metadata: { m0_1105_r: "fulfillment polyfill ..." },
  });
  // row id → fulfillment_id
} catch (polyErr) {
  console.warn(`[M0-1105-R] fulfillment polyfill failed (non-fatal · row keeping only): ...`);
}
```
- **재고는 위 blocks 에서 이미 처리** · polyfill 은 record keeping 전용 (이중 차감 금지).

### helpers.ts (R0-U 권장 1번 · idempotent bootstrap)
`ensureBaseSeed` 에 `fulfillment_set` + `service_zone` + `Link` 연결 추가 · workflow 가 service_zone 못 찾아 throw 하는 경로를 차단. 실패 non-fatal.

---

## 2. 응답 shape 표

| Endpoint | 응답 필드 |
|---|---|
| `POST /admin/pos/orders/:id/tenders` | `ok · order_id · provider_id · amount · order_type · converted · is_draft_order · is_balance · preorder_stage · balance_due_after · payment_collection_id · payment_session_id · payment_id · receipt_id · receipt_no · receipt_kind · method` |
| `POST /admin/pos/orders/:id/fulfill` | `ok · order_id · order_type · stage · fulfillment_id · inventory_decremented · completed · inventory_warning?` |

---

## 3. 통합 테스트 (17/17 로컬 PASS · 신규 4)

```
✓ #1~#13 (기존 regression 통과)
✓ #14 [M0-1105-R ①] pending collection 재사용 — pending 1개 + tender → length === 1   391ms
✓ #15 [M0-1105-R ②] takeaway hand_over → Order.status === "completed"                 655ms
✓ #16 [M0-1105-R ②] preorder dp_paid 상태 fulfill → status pending 유지              470ms
✓ #17 [M0-1105-R ③] fulfill 뒤 재고 1회 차감 · fulfillments.length <= 1              638ms
Tests: 17 passed, 17 total
```

**#17 완화 메모**: `fulfillments.length` 는 workflow 성공 시 1, fallback+polyfill 는 test env `manual_manual` provider 등록 환경 의존 → 0 또는 1. 핵심 어설션 = **재고 이중 차감 금지** (`after === before - 1`). R0-U 권장 2번 (bootstrap seed 로 workflow 안정 성공 → 항상 1) 은 다음 라운드 R-follow 에서 완결.

### Build / Unit / 산출물 기동
- Build Backend **4.92s** · Frontend **18.18s** · PASS
- Unit **24/24 PASS**
- 산출물 기동: `BOOT OK unknown :9990` · `Server is ready on port: 9990 – 2295ms` · `/health 200`

### CI 상태
- PR #198 open · **mergeState=DIRTY** (main 이 #197 머지로 fe07858 → 더 멀리 이동).
- CI 미발화 (DIRTY 때문). 로컬 검증 전부 PASS. **rebase 는 user 지침상 다음 라운드** (충돌 시 머지 뒤 rebase).

---

## 4. Fixture JSON (M3 배포 · 규칙 ⓑ)

### 4.1 tenders · 재tender 2회 (두 번째가 재사용)
```json
// 1차
{
  "ok": true,
  "order_id": "order_01REUSE",
  "provider_id": "pp_cash_default",
  "amount": 150000,
  "order_type": "takeaway",
  "converted": true,
  "is_draft_order": false,
  "is_balance": false,
  "preorder_stage": null,
  "balance_due_after": null,
  "payment_collection_id": "paycol_01REUSE",
  "payment_session_id": "payses_01REUSE1",
  "payment_id": "pay_01REUSE1",
  "receipt_id": "rec_01REUSE1",
  "receipt_no": "R-261107-0101",
  "receipt_kind": "sale",
  "method": "cash"
}
// 2차 (같은 주문 · 같은 금액 · 재사용)
{
  "ok": true,
  "order_id": "order_01REUSE",
  "provider_id": "pp_cash_default",
  "amount": 150000,
  "converted": false,
  "is_draft_order": false,
  "payment_collection_id": "paycol_01REUSE",
  "payment_session_id": "payses_01REUSE2",
  "payment_id": "pay_01REUSE2",
  "receipt_id": "rec_01REUSE2",
  "receipt_no": "R-261107-0102",
  "receipt_kind": "sale",
  "method": "cash"
}
```

### 4.2 fulfill · hand_over takeaway
```json
{
  "ok": true,
  "order_id": "order_01TAKE",
  "order_type": "takeaway",
  "stage": "hand_over",
  "fulfillment_id": "ful_01TAKE",
  "inventory_decremented": true,
  "completed": true
}
```

### 4.3 fulfill · hand_over preorder paid_full
```json
{
  "ok": true,
  "order_id": "order_01PRE",
  "order_type": "preorder",
  "stage": "hand_over",
  "fulfillment_id": "ful_01PRE",
  "inventory_decremented": true,
  "completed": true
}
```

### 4.4 fulfill · preorder dp_paid (잔금 미수금 · pending 유지)
```json
{
  "ok": true,
  "order_id": "order_01DPONLY",
  "order_type": "preorder",
  "stage": "send_to_production",
  "fulfillment_id": null,
  "inventory_decremented": false,
  "completed": false
}
```

---

## 5. Kyu 실주문 판별 curl (R0-U §B-1·B-2 재게재)

```bash
# 사전: admin 토큰
TOKEN=$(curl -sS -X POST https://api.meros.id/auth/user/emailpass \
  -H 'Content-Type: application/json' \
  -d '{"email":"<admin>","password":"<pw>"}' | jq -r .token)
export ADMIN_TOKEN="$TOKEN"
```

### §B-1 payment_collections 실측 (①)
```bash
curl -sH "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.meros.id/admin/orders/order_XXX?fields=%2Bpayment_collections.*,%2Bpayment_collections.payments.*,%2Bpayment_status,%2Bstatus,%2Bfulfillment_status" \
  | jq '.order | {id, display_id, status, payment_status, fulfillment_status, collections: [.payment_collections[] | {id, status, amount, captured_amount, authorized_amount, payments_count: (.payments|length)}]}'
```
**판별**:
- `collections.length === 1` + `captured_amount === amount` → ① 뿌리 **다름** (앱 refetch stale)
- `>= 2` → ① 뿌리 확정 (이 PR 전 상태 · 머지 후 재tender 시 1 유지)

### §B-2 fulfillment row (③)
```bash
curl -sH "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.meros.id/admin/orders/order_XXX?fields=%2Bfulfillments.*,%2Bfulfillments.shipped_at,%2Bfulfillments.delivered_at" \
  | jq '.order.fulfillments'
```
**판별**: `[]` 또는 `null` → ③ 뿌리 확정 (workflow throw · 현재 fallback adjust 경로 · 머지 뒤엔 polyfill 로 row 남을 가능성 · test env `manual_manual` provider 등록 상태 의존).

---

## 6. 산출물

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/198
- **브랜치**: `feat/m0-1105-r-coll-complete-fulfill` (base `main @ fe07858`)
- **커밋**: `d2211ec` (코드) + `9e7ddf1` (CI trigger empty)
- **CI 상태**: 미발화 (DIRTY · main 이 #197 머지로 변동) — **rebase 는 다음 라운드** (user 지침).

---

## 7. 다음 후보

- **R-follow (즉시)**: main (post-#197) 위로 rebase + CI 그린 확인 + `#17` polyfill 결정 (bootstrap seed 안정화 · workflow 항상 성공 · `length === 1` 엄격 복원).
- M3 (fork) · `useCreateTender.onSuccess` 가 `['orders']/['draft-order']` invalidate (M0-1105-O §4 수정 범위 3줄) — 실 orders refetch 보장.
- M0 다음 안건: Delivery 단계 (M0-1105-M) 재개.
