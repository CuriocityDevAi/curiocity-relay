PR #332 · 모델 2 · 마이그레이션 1 · 테스트 15 통과

# M0-1117-I — 포인트 빚 S1: `loyalty_negative_balance` · `loyalty_negative_event` 모델 + 마이그레이션

- PR: https://github.com/CuriocityDevAi/storeport/pull/332
- 브랜치: `feat/M0-1117-I-loyalty-negative-ledger`
- 커밋: `3961dd4`
- 워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1117-I-wt`

## 범위 (실행된 것)
- 신규 Medusa 모듈 `apps/commerce-core/src/modules/loyalty_negative/`:
  - `models/loyalty-negative-balance.ts` (1 row per customer · customer_id unique · balance signed int · last_reason)
  - `models/loyalty-negative-event.ts` (append-only · kind · amount signed · source_order_id? · source_refund_ref? · ref unique · meta jsonb)
  - `service.ts` — `addDebt` · `offset` · `getBalance`
  - `migrations/Migration20261117120000.ts`
  - `__tests__/service.unit.spec.ts` (15 tests)
  - `index.ts` + `medusa-config.ts` 등록 1줄
- `docs/feature-map.yaml` 신규 엔트리 `loyalty.loyalty-negative-ledger` (src 범위 커버)

## 범위 밖 (후속 라운드 몫 · 티켓 금지 조항 준수)
- `recover.ts` / `earn.ts` / refund·void·customer route 수정 없음 (S2~S8 몫).
- `@medusajs/loyalty-plugin` 수정/fork 없음 (Q4 코어 규약).

## 서비스 계약 (3 메서드)
- `addDebt({customer_id, amount, kind, ref, source_order_id?, source_refund_ref?, meta?, last_reason?})` → `{ applied, balance_after, duplicate, event }`. `amount ≥ 0` · kind ∈ {refund_shortfall · unlink_debt · patch_debt · void_shortfall · block_redeem} (earn_offset 금지).
- `offset({customer_id, max_amount, ref, source_order_id?, source_refund_ref?, meta?})` → `{ applied, balance_after, duplicate, event }`. `applied = min(max_amount, current_balance)` · 이벤트 amount 는 `-applied`.
- `getBalance(customer_id)` → signed int (balance 음수 가능하되 서비스 가드로 `>= 0` 유지).

## 멱등 · 동시성
- 모든 쓰기는 `ref` unique · 중복 호출 no-op (duplicate=true 반환).
- Same-customer 동시 쓰기는 in-process per-customer async mutex 로 직렬화 (§3.10 DB row-lock 은 multi-worker 로드 시 보강).

## 자기 검증 로그
- `pnpm exec jest src/modules/loyalty_negative/__tests__/service.unit.spec.ts` → `Test Suites: 1 passed · Tests: 15 passed · Time: 2.025 s`.
- `TEST_TYPE=unit pnpm exec jest` (전체) → `28 suites · 394/394 PASS`.
- `pnpm typecheck` → `tsc --noEmit` 0 에러.
- `medusa db:migrate` → `✔ Migrated Migration20261117120000`.
- `psql \dt loyalty_negative*` → 2 tables 생성 확인 · 인덱스 7개 (unique customer_id · unique ref · kind · customer+created · deleted_at 파셜).
- `medusa db:rollback --modules loyalty_negative` → `✔ Reverted Migration20261117120000` · `\dt` 로 drop 확인 · 재마이그레이션 OK.
- `bash scripts/naming-check.sh` → PASS.

## Kyu 선택지 (오케 권장안 재확인)
- Q1 = A (side-car ledger · plugin store_credit 불변) → 본 PR 채택.
- Q2 = B (2-phase preview → confirm NET 환불) · Q3 = 현금→QRIS→카드 기본 + POS override → 후속 S4 라운드 소관.

## 실기 (사용자)
**서버 내부 레저 · 사용자-노출 UI 변경 없음 · Kyu 실기 불필요.** 후속 S4 (환불 route NET 계약) · S7 (사용 차단 UI) · Admin 위젯 라운드에서 실기 회부.
