---
round: M0-1105-L
pr:
  storeport: storeport#194
base_pr: null
outcome: preorder-balance-tender-live · tenders 라우트 balance 분기 · GET order detail 신규 · fulfill hand_over 전이 · Integration 12/12 · Unit 24/24 · CI 전부 그린
kyu_checks: 1 (open-requirements §결제 · 디자인 보드 9·10 소화 · fixture JSON M3 배포)
ci_links:
  markers-and-forbidden: https://github.com/CuriocityDevAi/storeport/actions/runs/42317048347/job/128232118859
  check: https://github.com/CuriocityDevAi/storeport/actions/runs/42317048245/job/128232118062
  changes-filter: https://github.com/CuriocityDevAi/storeport/actions/runs/42317048347/job/128232119181
  pos-integration: https://github.com/CuriocityDevAi/storeport/actions/runs/42317048347/job/128232164107
---

# M0-1105-L · Pre-order 잔금 수금 서버 지원

**일자**: 2026-11-07 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/orders/[id]/{tenders,fulfill,./}/route.ts` + `src/modules/receipt/{models/receipt.ts, service.ts, migrations/Migration20261107000001.ts}` + `integration-tests/pos/tenders.spec.ts`.

**base**: `origin/main @ 946d31c` (M0-1105-K 머지 직후).

---

## §0 실측 대사표 — 코어에 있음 / 우회 / 신규

| 기능 | 현 상태 (M0-1105-K base) | 판정 |
|------|-------------------------|------|
| preorder 주문에 **2번째 tender** 수용 | ✓ 200 응답 (`body.amount` 명시 필요) | **우회 (존재)** |
| `metadata.preorder.balance_due` 를 0 으로 전이 | ✗ 재계산 손상 (`balance_due = max(0, total - 잔금)` 꼬임) | **신규 필요** |
| `metadata.preorder.deposit_amount` 보존 | ✗ 잔금 값으로 덮어씀 (손상) | **신규 필요** |
| `preorder.stage` 전이 (`dp_paid → paid_full`) | ✗ 아예 stage 필드 없음 | **신규 필요** |
| 영수증 `kind="balance"` | ✗ 매번 `"sale"` | **신규 필요 (enum 확장 + 마이그레이션)** |
| 잔금 초과/미달 → 400 | ✗ 아무 금액이나 수용 | **신규 필요** |
| `GET /admin/pos/orders/:id` 로 `balance_due · expected_by_method` 조회 | ✗ 해당 라우트 자체 없음 | **신규 필요** |
| `fulfill` 로 preorder pickup → 재고 차감 | ✗ preorder 는 재고 차감 분기 없음 (단일 createOrderFulfillmentWorkflow 가 workflow 단일 지점) | **신규 필요 (조건 분기만 · 시점 불변)** |

결론: 최소 변경으로 7개 신규 지점 뚫음. **createOrderFulfillmentWorkflow 단일 지점 보존 (ADDENDUM §3)**.

---

## 1. 변경 ↔ file:line

### `src/api/admin/pos/orders/[id]/tenders/route.ts`
- `isBalanceTender` 판별 (preorder + `metadata.preorder.balance_due > 0`).
- 잔금 tender: body.amount 가 metadata.balance_due 와 다르면 **400** ("balance amount must equal metadata.preorder.balance_due (expected X, got Y)").
- metadata 손상 방지 분기:
  - 잔금 tender: `deposit_amount` 기존 값 유지 · `balance_due=0` · `stage="paid_full"` · `paid_full_at`.
  - 첫 preorder tender: `stage="dp_paid"` or `"paid_full"` + `dp_paid_at`.
- 영수증 `kind: isBalanceTender ? "balance" : "sale"`.
- `snapshot.preorder`: 잔금 tender 때 `{ deposit_pct, deposit_amount, balance_paid, balance_due: 0, pickup_at, stage }` (DP + 잔금 둘 다 보이게).
- metadata persist · 배열 형식 (M0-1105-K 패턴).
- 응답 shape 확장: `is_balance · preorder_stage · balance_due_after · receipt_kind`.
- `register_session_id` 를 metadata 에 보존 (GET 에서 재참조).

### `src/api/admin/pos/orders/[id]/route.ts` (신규)
- `GET /admin/pos/orders/:id` → `query.graph({ entity:"order", fields:[..., "items.*", "payment_collections.*"] })`.
- `metadata.register_session_id` 로 register_session 조회 → `expected_by_method` 노출.
- `balance_due` top-level 미러링 (앱 참조 편의).

### `src/api/admin/pos/orders/[id]/fulfill/route.ts`
- `preorderPickup = order_type==="preorder" && stage==="hand_over" && preorderMd?.stage==="paid_full"`.
- 조건 참이면 takeaway 처럼 `createOrderFulfillmentWorkflow` 발동 (재고 1회 차감).
- body.stage 없으면 기존 `send_to_production` 유지 — **재고 차감 시점 불변**.

### `src/modules/receipt/{models/receipt.ts, service.ts, migrations/Migration20261107000001.ts}`
- `kind` enum: `["sale", "balance", "reprint", "refund", "void"]`.
- 마이그레이션: `drop constraint + add constraint` (check 재정의).

---

## 2. 검증

| 체크 | 결과 |
|---|---|
| ⓐ Build | Backend 3.67s · Frontend 15.22s · **PASS** |
| ⓒ 산출물 기동 | `BOOT OK unknown :9998` · `Server is ready on port: 9998 – 2063ms` · `curl /health 200` |
| Unit | **24/24 PASS** |
| Integration | **12/12 PASS** (신규 3건 포함) |
| CI `markers-and-forbidden` | **PASS** 6s |
| CI `check` (feature-map) | **PASS** 11s |
| CI `changes-filter` | **PASS** 6s |
| CI `pos-integration` | **PASS** 2m13s |

### Integration 로그 (12/12)
```
✓ #1  cash tender · receipt metadata persist (M0-1105-K)      510ms
✓ #2  edc missing approval → 400 + cleanup (M0-1105-F)        590ms
✓ #3  preorder dp_percent=50 → DP 100k                        489ms
✓ #4  takeaway fulfill inventory decrement                    508ms
✓ #5  preorder fulfill (단일 DP) → send_to_production         627ms
✓ #6  2 tenders → 2 collections + aggregate                   757ms
✓ #7  settings dp%=30 · body override (new order)             594ms
✓ #8  show_tax_label=false → snapshot.tax.show=false          427ms
✓ #9  receipt_header 3줄 CRLF→LF                              395ms
✓ #10 [M0-1105-L] DP → balance → paid_full · kind=balance     485ms
✓ #11 [M0-1105-L] balance 미달/초과 → 400                     421ms
✓ #12 [M0-1105-L] balance → fulfill(hand_over) → 재고 1회 차감 520ms
Tests: 12 passed, 12 total
```

---

## 3. 금지 영역 변경 0

- `medusa-config.ts` — 손 안 댐.
- `src/modules/payment_cash/**` · `src/modules/payment_edc_manual/**` · `src/modules/payment_xendit/**` (providers 코드) — 손 안 댐.
- **재고 차감 시점**: `createOrderFulfillmentWorkflow` 단일 지점 유지 (fulfill 라우트의 조건 분기만 확장 · 호출 시점 불변).
- `readFileSync` 0.

---

## 4. Fixture JSON (fork fixtures 용 · 규칙 ⓑ · M3 가 복사)

### 4.1 DP tender 응답
```json
{
  "ok": true,
  "order_id": "order_01M6TXXXXXX",
  "provider_id": "pp_cash_default",
  "amount": 100000,
  "order_type": "preorder",
  "is_balance": false,
  "preorder_stage": "dp_paid",
  "balance_due_after": 100000,
  "payment_collection_id": "paycol_01M6TXXXXXX",
  "payment_session_id": "payses_01M6TXXXXXX",
  "payment_id": "pay_01M6TXXXXXX",
  "receipt_id": "rec_01M6TXXXXXX",
  "receipt_no": "R-261107-0001",
  "receipt_kind": "sale",
  "method": "cash"
}
```

### 4.2 Balance tender 응답
```json
{
  "ok": true,
  "order_id": "order_01M6TXXXXXX",
  "provider_id": "pp_cash_default",
  "amount": 100000,
  "order_type": "preorder",
  "is_balance": true,
  "preorder_stage": "paid_full",
  "balance_due_after": 0,
  "payment_collection_id": "paycol_01M6TYYYYYY",
  "payment_session_id": "payses_01M6TYYYYYY",
  "payment_id": "pay_01M6TYYYYYY",
  "receipt_id": "rec_01M6TYYYYYY",
  "receipt_no": "R-261107-0002",
  "receipt_kind": "balance",
  "method": "cash"
}
```

### 4.3 GET /admin/pos/orders/:id 응답
```json
{
  "order": {
    "id": "order_01M6TXXXXXX",
    "display_id": 1234,
    "total": 200000,
    "subtotal": 200000,
    "tax_total": 0,
    "discount_total": 0,
    "currency_code": "idr",
    "items": [
      {
        "id": "ordli_01M6TXXXXXX",
        "title": "Custom Cake",
        "quantity": 1,
        "unit_price": 200000,
        "total": 200000
      }
    ],
    "payment_collections": [
      { "id": "paycol_01M6TXXXXXX", "amount": 100000 },
      { "id": "paycol_01M6TYYYYYY", "amount": 100000 }
    ],
    "metadata": {
      "order_type": "preorder",
      "register_session_id": "regses_01M6TZZZZZZ",
      "receipt_id": "rec_01M6TYYYYYY",
      "receipt_no": "R-261107-0002",
      "preorder": {
        "deposit_pct": 50,
        "deposit_amount": 100000,
        "balance_due": 0,
        "stage": "paid_full",
        "pickup_at": null,
        "note": null,
        "dp_paid_at": "2026-11-07T04:12:34.567Z",
        "paid_full_at": "2026-11-07T06:45:12.890Z"
      }
    }
  },
  "balance_due": 0,
  "expected_by_method": {
    "cash": 200000
  }
}
```

### 4.4 400 (잔금 미달) 응답
```json
{
  "type": "invalid_data",
  "message": "balance amount must equal metadata.preorder.balance_due (expected 100000, got 90000)"
}
```

---

## 5. 산출물

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/194
- **브랜치**: `feat/m0-1105-l-preorder-balance` (base = `main @ 946d31c`)
- **커밋**: `f9bd74c` · 7 파일 · +541/-41
- **CI run**: https://github.com/CuriocityDevAi/storeport/actions/runs/42317048347

---

## 6. 다음 후보

- M3 (앱) · fixtures 복사 · 디자인 보드 9 (잔금 수금 화면) · 10 (fulfillment stages UI) 구현.
- Admin 쪽 "Receipt configuration" sub-page (tax label PBJT/PPN · footer · logo_mode) — 보류 중.
- Preorder `pickup_at` 입력 UI 를 admin 또는 앱에 노출 여부 — Kyu 결정 대기.
