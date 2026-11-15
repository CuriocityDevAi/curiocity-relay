# R0-1116-B — #287 리뷰 리포트

#287 CHANGES · CI pos-integration pending · 적립 기준: 세금 제외 item_subtotal + previewReceipt SC/PB1 가산 (receipt-preview 동일 경로)

---

## 돌려본 명령·로그

```
# PR 메타·diff 확인
gh pr view 287 --repo CuriocityDevAi/storeport --json ...
MCP pull_request_read method=get       → PR #287 open, 3 files, +115/-16
MCP pull_request_read method=get_diff  → earn.ts / link-customer-order.ts / link-earn.spec.ts diff 확인

# CI 상태
gh pr checks 287 --repo CuriocityDevAi/storeport
  customer-display      pass   2m27s
  e2e-admin-loyalty     pass   1m37s
  pos-integration       pending 0s     ← 아직 미완료
  unit-commerce-core    pass   1m3s

# 소스 확인
MCP get_file_contents earn.ts (PR branch)        → 전체 소스 확보
MCP get_file_contents link-earn.spec.ts (branch) → 전체 테스트 확보
MCP get_file_contents loyalty-earn-on-paid.ts    → subscriber 소스 확보 (main)
MCP get_file_contents pos/helpers.ts             → createTestOrder 구현 확보
```

---

## REQ 1 — retrieveOrder computed totals · query.graph 적립 기준

### Medusa v2.17.2 retrieveOrder computed totals 미반환 확인
`orderModule.retrieveOrder` = raw ORM select, Medusa computed fields(`item_subtotal` / `subtotal` / `total` / `discount_total`) 는 반환 안 함(undefined). `query.graph({ entity:"order", fields:["item_subtotal",...] })` 로 명시 field 요청 시 framework 가 집계값을 채워 반환. 원인(c) 진단 정확 ✓

### query.graph totals = "실제 낸 돈"과 일치 여부
`earn.ts` 경로: `subtotal = item_subtotal`(세금·SC 미포함 순 품목 합계) → `previewReceipt(subtotal, service_charge_pct, pb1_pct, credit_requested, ...)` → earnBase = `paidOtherAfterRefund`. receipt-preview 화면과 **동일 공식** 사용.

### 세금 포함/제외?
`item_subtotal` 은 세금 미포함. SC/PB1 은 `previewReceipt` 가 가산. 운영 기본(SC=0, PB1=0)이면 earnBase ≈ item_subtotal. `metadata.pos_totals` 는 earn 경로 미사용. receipt-preview 규칙과 동일 경로 → 일관성 OK ✓

### subscriber(payment.captured) 경로 — 같은 버그?
**있었고, 이 PR 에서 완전히 고쳐지지 않았다.**

- `loyalty-earn-on-paid.ts:71`: `const order = await orderModule.retrieveOrder(orderId)` → computed totals 없음
- 그 order 를 `earnForOrder(container, { order_id, order })` 로 전달
- `earn.ts` 락 안: `const srcOrder = input.order ?? freshOrder ?? initialOrder;`
- `input.order` 가 non-null(subscriber 주입) → `freshOrder` 무시 → `subtotal = item_subtotal ?? subtotal ?? 0` = **0** → earn=0

현 운영 POS 흐름에서는 결제 시 `customer_id = null` → subscriber 조기 반환 → 미발화. 하지만 사전 연결 고객(웹주문 등) 시 latent bug 재발.

**필요한 fix**: `earn.ts` 락 안 `srcOrder` 선택 순서 변경
```ts
// 현재 (버그)
const srcOrder = input.order ?? freshOrder ?? initialOrder;
// 수정
const srcOrder = freshOrder ?? input.order ?? initialOrder;
```

---

## REQ 2 — 신규 테스트 데이터 경로 · CI

### 실 데이터 경로 커버 여부
`createTestOrder(container, { items:[{unit_price:33000, quantity:1}] })` → `orderModule.createOrders` 로 실 line_item 생성 → Medusa DB 계산 `item_subtotal = 33000`. `POST /admin/pos/orders/:id/customer` → `linkCustomerToOrder` → `query.graph` fetchOrderWithTotals → earn = floor(33000×0.01) = 330. `linkCustomerToOrder` 경로(이 PR 의 핵심 fix)를 실 데이터로 커버 ✓

단, `seedPaidSnapshot` fallback session_id 타임스탬프가 `createTestOrder` 에 넣은 `register_session_id` 와 불일치 가능. `isCompleted=true`(receipt_no 존재)로 window 우회 → earn 경로에는 무해. snapshot 갱신 단계 silent fail 여부 CI 에서 확인.

### CI pos-integration 통과 여부
**pending(0s)** — 아직 미완료. 머지 전 pass 확인 필요.

---

## REQ 3 — advisory lock + query.graph 충돌

`withOrderEarnLock` = knex `pg.transaction` + `pg_advisory_xact_lock` (커넥션 A). `fetchOrderWithTotals` = `ContainerRegistrationKeys.QUERY` ORM layer (커넥션 풀 B). 독립 커넥션 → lock/transaction 충돌 없음 ✓

락 안 `fetchOrderWithTotals` = READ-only committed state. 1st 경로 `updateOrders`(`loyalty_earn.applied=true`) 커밋 → 2nd lock 진입 → fetchOrderWithTotals committed state 읽음 → `applied=true` 감지 → idempotent 반환. 멱등 보장 유효 ✓

`updateOrders` 는 ORM 커넥션(knex tx 밖) → `creditAccounts` 성공 후 `updateOrders` 실패 시 credit 롤백 불가. Pre-existing design, 이번 PR 도입 아님.

---

## REQ 4 — PR 코멘트

GitHub 정책상 자기 PR REQUEST_CHANGES 불가 → COMMENT 로 제출(내용 CHANGES 판정).

제출 내용:
- 라인 코멘트 1: `earn.ts` 179번줄(신규 `freshOrder = fetchOrderWithTotals` 라인) — C1 srcOrder 선택 순서 버그 + 1줄 fix 제시
- 라인 코멘트 2: `link-earn.spec.ts` 388번줄(신규 테스트 끝) — C2 subscriber earn 경로 테스트 케이스 미구현
- 전체 body: CHANGES 판정 + REQ 1-3 전체 분석

---

## 판정 요약

| 항목 | 판정 | 근거 |
|---|---|---|
| 원인(c) 진단 | 정확 | retrieveOrder computed totals 미반환 확인 |
| linkCustomerToOrder fix | 정확 | query.graph refreshedOrder → earnForOrder 전달 |
| subscriber fix | **미완** | srcOrder = input.order ?? freshOrder → subscriber 여전히 earn=0 |
| 신규 테스트 경로 | 실 데이터 ✓ | createTestOrder + line_item + linkCustomerToOrder API |
| CI pos-integration | **pending** | 머지 전 pass 확인 필요 |
| lock + query.graph | 충돌 없음 | 별도 커넥션, committed read, 멱등 유효 |
| 적립 기준 | 세금 제외 | item_subtotal + previewReceipt SC/PB1 가산, receipt-preview 동일 경로 |
