# 로열티 R2 — 서버 ↔ Admin UI 계약 (오케 확정 2026-11-15 · M0-1105-CB 서버 / M2-1105-BM Admin UI 공통 정본)

근거: decision-loyalty-20261114 "11-15 06:15 추가" · 06:18 "1, 2 너의 추천대로 함"

## 설정 키 (`LoyaltySettings`)
enabled(bool) · earn_rate_pct(number) · earn_base("paid_non_credit"|"paid_non_credit_pre_tax") · round_mode("floor"|"round"|"ceil") · min_use_amount(int Rp) · max_use_pct_per_order(0~100 · 기본 100) · expiry_days(int · 0=무기한 · 기본 365) · signup_bonus(int Rp) · exclude_product_ids(string[]) · earn_on_balance_tender_only(bool) · tax_mode("payment"|"discount" · 기본 payment)
- **시뮬 게이트 대상(GATED)**: earn_rate_pct · earn_base · round_mode · min_use_amount · max_use_pct_per_order · expiry_days · signup_bonus · tax_mode · exclude_product_ids
- **바로 저장(UNGATED)**: enabled · earn_on_balance_tender_only

## API (전부 admin 인증)
1. `GET /admin/pos/loyalty/settings` → `{ current: LoyaltySettings, pending: PendingChange|null, timezone: "Asia/Jakarta" }`
2. `POST /admin/pos/loyalty/settings/simulate` body `{ settings: LoyaltySettings }` → `{ simulation_id, settings_hash, expires_at(+30분), scenarios: Scenario[6], impact_30d: Impact }`
   - Scenario = `{ key: "normal"|"credit_partial"|"credit_full"|"credit_plus_qris"|"partial_refund"|"preorder_dp", title, description(한 줄), before: ReceiptPreview, after: ReceiptPreview, changed_line_keys: string[] }`
   - ReceiptPreview = `{ lines: [{ key, label, amount }] }` — 줄 순서: subtotal · discount? · service_charge? · pb1 · total · store_credit_used · paid_other(cash/qris) · credit_earned · credit_balance
   - Impact = `{ window_days: 30, orders: n, earned: {before, after}, used: {before, after}, outstanding_liability: {before, after}, tax_reported: {before, after} }` (지난 30일 실제 주문 재계산 · 적립금 미사용 잔액 = 부채)
3. `POST /admin/pos/loyalty/settings` body `{ settings, simulation_id, reason(필수 · 5자+), apply: { mode: "now" } | { mode: "scheduled", date: "YYYY-MM-DD" } }`
   - GATED 키가 바뀌면 `simulation_id` 필수 · settings_hash 일치 · 만료 전 — 아니면 409 `simulation_required`
   - scheduled = 매장 timezone 00:00 반영 · 대기 예약 1개만(있으면 409 `pending_exists`) · 과거 날짜 400
   - UNGATED 만 바뀌면 simulation 불필요(reason 은 여전히 필수)
4. `POST /admin/pos/loyalty/settings/pending/:id/cancel` body `{ reason }`
5. `GET /admin/pos/loyalty/settings/audit?limit&offset` → `{ items: AuditEntry[] , count }`
   - AuditEntry = `{ id, created_at, actor: {id, email}, before, after, diff: [{key, from, to}], reason, apply_mode, effective_at, status: "scheduled"|"applied"|"cancelled", applied_at, cancelled_at, cancel_reason, simulation_snapshot }` — **append-only**(수정·삭제 API 없음)
## 규칙
- 변경은 **반영 시점 이후 결제**에만 적용 · 기존 잔액·이미 적립된 건의 소멸일 소급 없음
- 반영 job: 매장 timezone 00:00 직후 pending → applied (멱등)
