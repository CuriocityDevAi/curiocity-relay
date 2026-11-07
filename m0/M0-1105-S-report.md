---
round: M0-1105-S
pr:
  storeport: storeport#199
supersedes: [storeport#198]
outcome: rebase-complete · M3-M contract · Integration 24/24 · CI 전부 그린
kyu_checks: 1 (M3-1105-M 서버 contract 수용 · #197 과 #198 통합)
ci_links:
  markers-and-forbidden: https://github.com/CuriocityDevAi/storeport/actions/runs/42369830800/job/128395470685
  check: https://github.com/CuriocityDevAi/storeport/actions/runs/42369830799/job/128395470575
  changes-filter: https://github.com/CuriocityDevAi/storeport/actions/runs/42369830800/job/128395470614
  pos-integration: https://github.com/CuriocityDevAi/storeport/actions/runs/42369830800/job/128395499548
---

# M0-1105-S · #198 rebase + M3-M contract

**일자**: 2026-11-07 · **허브**: M0 · **대상**: `tenders · fulfill · settings · helpers · tenders.spec`.
**base**: `origin/main @ 5742460` (M0-1105-Q 머지 뒤).

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | #198 → main rebase · tenders/route.ts 충돌 해결 | ✓ (abort + 수동 replay) |
| 2 | CI green · 통합 17/17 (Q) 유지 + 신규 어설션 | ✓ (24/24 PASS) |
| 3 | M3-M a. preorder 입력 키 수용 | ✓ (#23) |
| 4 | M3-M b. fulfill body.stage='hand_over' 수용 | ✓ (#24) |
| 5 | M3-M c. preorder_deposit_pct alias (기본 100) | ✓ (#22) |
| 6 | 응답 shape 표 최종본 + fixture + Kyu curl | ✓ (§3·§4·§5) |

## 2. 변경 ↔ file:line

### M0-1105-R 재적용 (Q 위)
- `tenders/route.ts` · section 1 pending collection 재사용 (같은 금액 재사용 · 금액 다르면 삭제 후 신규).
- `fulfill/route.ts` · `completeOrderWorkflow({orderIds:[id]})` + polyfill (record keeping · 재고 이중 차감 금지).
- `helpers.ts` · `ensureBaseSeed` 에 fulfillment_set + service_zone (R0-U 1번).

### M0-1105-S · M3-M contract
- **a. preorder 입력 키**: `body.preorder.{pickup_at, note}` 서버 수용 (M0-1105-L 유지). 앱 shape 그대로.
- **b. fulfill body.stage='hand_over'**: `stage = body.stage || stageFromOrderType(order_type)` (기존). preorder+paid_full 조건에서 createOrderFulfillmentWorkflow 발동.
- **c. settings 라우트** `src/api/admin/pos/settings/route.ts`:
  ```ts
  // PUT · alias 수용
  if (!("dp_percent" in body) && "preorder_deposit_pct" in body && body.preorder_deposit_pct != null) {
    body.dp_percent = body.preorder_deposit_pct;
  }
  // GET · alias 노출
  const settingsWithAlias = {
    ...(row.settings ?? {}),
    preorder_deposit_pct: (row.settings as any)?.dp_percent ?? 100,
  };
  ```

### 통합 테스트 (24/24 · 신규 7)
- #18~#21 (M0-1105-R) · 재사용 · complete 전이 · fulfillment polyfill.
- #22~#24 (M0-1105-S) · preorder_deposit_pct alias · body.preorder 영속 · fulfill hand_over.
- #1~#17 (Q) 전부 통과.

## 3. 응답 shape 표 (최종본)

| Endpoint | 응답 필드 |
|---|---|
| `POST /admin/pos/orders/:id/tenders` | `ok · order_id · provider_id · amount · order_type · converted · is_draft_order · is_balance · preorder_stage · balance_due_after · payment_collection_id · payment_session_id · payment_id · receipt_id · receipt_no · receipt_kind · method` |
| `POST /admin/pos/orders/:id/fulfill` | `ok · order_id · order_type · stage · fulfillment_id · inventory_decremented · completed · inventory_warning?` |
| `GET /admin/pos/orders/:id/quote` (Q) | `subtotal · service_charge{pct,amount} · tax{label:"PB1",pct,amount} · grand_total · store{id,name,logo_url}` |
| `GET /admin/pos/settings` (S) | `settings.{dp_percent, preorder_deposit_pct, service_charge_pct, pb1_pct, logo_url, ...}` (alias 둘 다 노출) |

## 4. Fixture (M3 배포 · 규칙 ⓑ)

### 4.1 tenders · DP (preorder 첫 tender)
```json
{
  "ok": true,
  "order_id": "order_01PRE",
  "provider_id": "pp_cash_default",
  "amount": 100000,
  "order_type": "preorder",
  "converted": true,
  "is_draft_order": false,
  "is_balance": false,
  "preorder_stage": "dp_paid",
  "balance_due_after": 100000,
  "payment_collection_id": "paycol_01PRE",
  "receipt_id": "rec_01PREDP",
  "receipt_no": "R-261107-0201",
  "receipt_kind": "sale",
  "method": "cash"
}
```

### 4.2 tenders · Balance (preorder 잔금)
```json
{
  "ok": true,
  "order_id": "order_01PRE",
  "amount": 100000,
  "order_type": "preorder",
  "converted": false,
  "is_draft_order": false,
  "is_balance": true,
  "preorder_stage": "paid_full",
  "balance_due_after": 0,
  "receipt_kind": "balance",
  "receipt_id": "rec_01PREBAL",
  "receipt_no": "R-261107-0202",
  "method": "cash"
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

## 5. Kyu 실주문 판별 curl (R0-U §B 재게재)

### §B-1 payment_collections 실측 (①)
```bash
curl -sH "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.meros.id/admin/orders/order_XXX?fields=%2Bpayment_collections.*,%2Bpayment_status,%2Bstatus,%2Bfulfillment_status" \
  | jq '.order | {id, display_id, status, payment_status, fulfillment_status, collections: [.payment_collections[] | {id, status, amount, captured_amount, payments_count: (.payments|length)}]}'
```

### §B-2 fulfillment row (③)
```bash
curl -sH "Authorization: Bearer $ADMIN_TOKEN" \
  "https://api.meros.id/admin/orders/order_XXX?fields=%2Bfulfillments.*" \
  | jq '.order.fulfillments'
```

## 6. 검증
- Build Backend **3.98s** · Frontend **15.22s** · PASS
- Unit **24/24** · Integration **24/24** PASS
- 산출물 기동: `BOOT OK unknown :9989` · `Server is ready on port: 9989 – 2261ms` · `/health 200`
- CI 전부 그린: markers-and-forbidden 8s · check 12s · changes-filter 7s · **pos-integration 2m13s**

## 7. 산출물
- **PR**: https://github.com/CuriocityDevAi/storeport/pull/199
- **브랜치**: `feat/m0-1105-s-rebase-m3m` (base `main @ 5742460`)
- **커밋**: `7063ac9` · 5 파일 · +437/-18
- **Supersedes**: #198 (close + 코멘트)
- **CI run**: https://github.com/CuriocityDevAi/storeport/actions/runs/42369830800
