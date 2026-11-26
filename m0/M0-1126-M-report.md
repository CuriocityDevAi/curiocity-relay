PASS #459 663e260

# M0-1126-M — V4-7/V4-8 보존 테스트 + phone-entry 판정·열기 원자화

- PR: https://github.com/CuriocityDevAi/storeport/pull/459
- Branch: `feat/M0-1126-M`
- Commit: `663e260 feat(commerce-core): M0-1126-M — V4-7/V4-8 보존 테스트 + phone-entry 판정·열기 원자화`

## 원장 대사
- **decision-cd-pos-sync-v4-20261126 V4-8 · V4-7** · R0-1126-AA [NOTE] 2건
  - ① Re-enter → cancel_entry 원래 번호 복원 통합 테스트 부재 → 추가.
  - ② `openPostSettlementPhoneEntry` 판정~열기 사이 트랜잭션 없음 → register 단위 pg advisory lock + 전이 직전 재검증으로 원자화.
- **decision-spec-guard-20261126 §4** (보존 테스트) — 계약 v1.4 7종 사유 코드/`cancel_entry`/`isPostSettlementStale` 보존.

## 변경 (4 파일 · +687 / -145)
- `apps/commerce-core/src/modules/register_session/service.ts`
  - `PgLike` 에 선택 `transaction?` 추가 · `withRegisterPhoneEntryLock` 헬퍼.
  - `openPostSettlementPhoneEntry(order_id, pgConnection?)` : peek→lock→fresh re-read→sibling 검사→전이 직전 재검증→update.
  - `askPhoneOnDisplayForOrder(order_id, pgConnection?)` : 같은 lock 패턴.
- `apps/commerce-core/src/api/admin/pos/orders/[id]/phone-entry/route.ts` · `.../ask-phone-on-display/route.ts`
  - pair route 의 `__pg_connection__` fallback 패턴으로 pgConnection 해석 후 서비스에 주입. 미해석 시 서비스가 lock 없이 fallback.
- `apps/commerce-core/integration-tests/pos/cd-pos-sync-v4.spec.ts`
  - ⑤ Re-enter → cancel_entry → 번호 A · 고객 연결 · 포인트 잔액 보존.
  - ⑥ Re-enter → skip → 번호 A · 고객 연결 · 포인트 잔액 보존.
  - ⑦ Re-enter → 번호 B 확정 — 현 동작 고정: metadata.loyalty_earn idempotent 가드로 재적립·회수 모두 없음.
  - ⑧ V4-7 원자화 — openPhoneEntry 판정 후 새 장바구니가 끼어들면 결정론적 `new_cart_started` (Promise.all race).

## ⑦ 현 동작 서술 (리포트 반영)
`submit_phone(B)` 가 snapshot.customer_phone 을 B 로 교체 → `confirm` 이 `linkCustomerToOrder` 호출 → `order.customer_id = B` 로 덮어쓴다. `earnForOrder` 는 `metadata.loyalty_earn.applied === true` 플래그를 보고 idempotent 반환 (B 재적립 없음, A 회수 없음).
- 결과: **A 계좌 = 최초 적립액 그대로 보존 · B 계좌 = 0.**
- 이중 적립·회수 정책 = **"무변동"** (현 코드 설계). 테스트가 이 계약을 고정.

## 직접 실행 로그
```
# 로컬 pg (storeport_ci_<id>)
bash scripts/it.sh cd-pos-sync-v4
  PASS cd-pos-sync-v4.spec.ts (14.253 s)
    ✓ V4-8 · 결제 중 Ask → 입력 → OK → Re-enter → 다른 번호 확정 (기존 번호는 새 submit 전까지 보존) (949 ms)
    ✓ V4-8 · Skipped → Ask again (start_entry from skipped allowed) (760 ms)
    ✓ V4-7 · 결제 완료 주문 Phone entry = eligible · 새 장바구니 시작 후에는 new_cart_started (469 ms)
    ✓ V4-8 · confirmed(번호 A · 포인트 적립) → Re-enter → cancel_entry → 번호 A · 고객 연결 · 포인트 잔액 그대로 (556 ms)
    ✓ V4-8 · confirmed(번호 A · 포인트 적립) → Re-enter → skip → 번호 A · 고객 연결 · 포인트 잔액 그대로 (534 ms)
    ✓ V4-8 · confirmed(번호 A · 포인트 적립) → Re-enter → 번호 B 확정 → 고객 B 연결 · A 포인트 idempotent 보존 (재적립·회수 없음) (632 ms)
    ✓ V4-7 · 원자화 — 판정 후 새 장바구니가 끼어들면 new_cart_started 로 거절 (694 ms)
    ✓ V4-8 · lock — 다른 손님 번호 입력 중이면 start_entry 거절 (phone_entry_busy) (440 ms)
  Tests: 8 passed, 8 total

bash scripts/it.sh cd-pos-sync-v3    → 3/3 passed (10.667s)
bash scripts/it.sh cd-parallel-pay   → 15/15 passed (16.28s)
bash scripts/it.sh cd-full-flow      → 8/8 passed (11.809s)
bash scripts/it.sh cd-snapshot-skip  → 7/7 passed (11.289s)

pnpm test (apps/commerce-core unit):
  Test Suites: 75 passed, 75 total
  Tests:       877 passed, 877 total
  Snapshots:   18 passed, 18 total

pnpm typecheck (apps/commerce-core):
  > tsc --noEmit
  (error 0)
```

## 보존 (unchanged)
- 계약 v1.4 — actions · locked · `cancel_entry` · phone-entry 7종 사유 코드.
- #454 `isPostSettlementStale` V3-1 가드 (phone_entry_open 중 active 유지).
- 포인트 주문당 1회 적립 (`earnForOrder` 의 `pg_advisory_xact_lock('loyalty-earn:...')` + `metadata.loyalty_earn` idempotent).

## 범위 (건드리지 않은 것)
- POS fork 코드 (서버 계약 + CD 반응만 검증).
- `startSnapshotForRegister` 는 lock 밖 그대로 — 전이 직전 재검증이 race 차단.
- v3/parallel-pay/full-flow/snapshot-skip 로직 무변경 (회귀 green).

## /loop · 시간
- /loop 사용 안 함.
- 세션 총 시간: 약 25분 (claim→push).
- 40분 상한 내.

processes: [commerce-core.customer-display-snapshot, commerce-core.customer-display-customer-flow]
