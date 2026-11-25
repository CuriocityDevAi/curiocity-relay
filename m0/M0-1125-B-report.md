PASS — M0-1125-B · CD Done "Current balance Rp 0" 뿌리 수정

PR: https://github.com/CuriocityDevAi/storeport/pull/425
Branch: fix/M0-1125-B-cd-balance
Commit: fcdaf21

## 원장 대사 처리
decision-cd-defer-20261124 CD1 (Kyu 11-24 18:24 Order #185 "+Points earned Rp 150" 인데 "Current balance Rp 0") · 감사 m2/M2-1125-B-report.md #1 · Round CD-D.

## 원인 (한 줄)
`apps/commerce-core/src/lib/loyalty/earn.ts:317-321` — `storeCredit.listStoreCreditAccounts({id: account.id})` 리프레시가 빈 배열/적립 반영 전 값을 돌려주면 `newBalance` 가 pre-earn balance(=신규 계좌 0) 로 떨어진다. `earn.new_balance` 는 **세 snapshot.receipt 작성 경로의 공용 소스** 이므로 여기서 틀리면 세 경로(신규 고객 첫 방문 동의 · 결제 후 소급 연결 · idempotent 재호출) 모두 `snapshot.receipt.new_balance=0` 을 쓴다.

세 경로:
1. `apps/commerce-core/src/lib/link-customer-order.ts:427` — `earn?.new_balance ?? 0` → 소급 연결 경로 (손님이 결제 후 CD 에서 번호 입력)
2. `apps/commerce-core/src/subscribers/loyalty-earn-on-paid.ts:73-75` — `result.new_balance` → 결제 완료 subscriber 경로 (손님이 결제 전 번호 입력 · payment.captured 후 적립)
3. `apps/commerce-core/src/lib/loyalty/earn.ts:200` (수정 전) — idempotent branch `le.new_balance ?? 0` → 재호출 시 이전에 저장된 0 그대로

DoneScreen 렌더 경로 추적: `apps/customer-display/src/screens/DoneScreen.tsx:94-95` `snapshot.receipt?.new_balance ?? snapshot.loyalty?.balance ?? 0` — 서버 snapshot.receipt.new_balance 가 0 이면 그대로 0 그림 (loyalty.balance 는 서버 `attachEarnPreviewToSnapshot` 에서 기본 0 fallback).

## 수정
`apps/commerce-core/src/lib/loyalty/earn.ts` 단일 파일, 두 지점:

- **적립 후 refresh**: `refreshedBalance != null && refreshedBalance >= computedBalance` 조건 통과 시 사용, 아니면 `preEarnBalance + creditedAmount` 결정론적 사용.
- **Idempotent branch**: 저장된 `le.new_balance=0` 인데 `le.earned>0` 이면 현재 계좌 잔액 live 조회로 self-heal, 조회 실패 시 `Math.max(stored, earned)` 하한선.

범위 한정(⛔ 제외): `register_session/lifecycle.ts` · `order-snapshot.ts` · `ReceiptScreen.tsx` · POS fork · `MainScreen/index.tsx` 전부 미건드림.

## 어설션 파일
- 신규 Unit: `apps/commerce-core/src/lib/loyalty/__tests__/earn-newbalance.unit.spec.ts` (6)
- 신규 Integration: `apps/commerce-core/integration-tests/loyalty/cd-done-new-balance.spec.ts` (3)

## 테스트 실행 로그

### 신규 Integration — 3 시나리오 PASS
```
PASS integration-tests/loyalty/cd-done-new-balance.spec.ts (28.227 s)
    M0-1125-B · snapshot.receipt.new_balance = earn.new_balance
      ✓ 신규 고객 (balance=0) + Rp15k 결제 → snapshot.receipt.new_balance=150 (6423 ms)
      ✓ 기존 잔액 300 고객 + Rp15k 결제 → snapshot.receipt.new_balance=450 (1098 ms)
      ✓ 소급 연결(late link · 창 안) → snapshot.receipt.new_balance 적립 반영 (811 ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

### 신규 Unit + 기존 회귀 — 131/131 PASS
```
PASS src/lib/loyalty/__tests__/earn-newbalance.unit.spec.ts (6 테스트)
PASS src/lib/loyalty/__tests__/earn-offset.unit.spec.ts (6 테스트 · 회귀)
PASS src/lib/loyalty/__tests__/preview-recover.unit.spec.ts
PASS src/lib/loyalty/__tests__/snapshot-earn.unit.spec.ts
PASS src/lib/loyalty/__tests__/recover-to-debt.unit.spec.ts
PASS src/lib/loyalty/__tests__/expiry-runner.unit.spec.ts
PASS src/lib/loyalty/__tests__/receipt-preview-negative.unit.spec.ts
PASS src/modules/loyalty_negative/__tests__/service.unit.spec.ts
PASS src/modules/loyalty_settings/__tests__/service.unit.spec.ts
PASS src/modules/loyalty_settings/__tests__/receipt-preview.unit.spec.ts
PASS src/modules/loyalty_settings/__tests__/expiry.unit.spec.ts
PASS src/api/admin/pos/loyalty/settings/simulate/__tests__/route.unit.spec.ts
PASS src/api/admin/pos/loyalty/expire/__tests__/route.unit.spec.ts

Test Suites: 13 passed, 13 total
Tests:       131 passed, 131 total
```

### 관련 기존 Integration — 회귀 없음
```
PASS integration-tests/loyalty/link-earn.spec.ts (12.364 s · 7/7)
    ✓ earnForOrder × 2 동시 → credit tx 1건 · 잔액 1회분 (C1)
    ✓ 동시 두 경로 → 적립 1회 (idempotent on 2nd)
    ✓ link_open_until 경과 → 409 link_window_closed
    ✓ enabled=false → earn.earned=0 · skipped_reason=loyalty_disabled
    ✓ 적립 금액 = receipt-preview (normal · credit_partial)
    ✓ Cash 결제 완료 → 결제 후 번호 연결 → earn = floor(subtotal × 1%) (M0-1116-A)
    ✓ subscriber 경로: customer_id 사전 연결 + retrieveOrder 주입 → earned=330 (M0-1116-B C2)

PASS integration-tests/loyalty/post-pay-link-balance.spec.ts (11.274 s · 2/2)
    ✓ post-pay: store_credit_balance = earn 후 잔액 · orders-list 전화번호 · summary 잔액 · first_name
    ✓ pre-pay 회귀 없음: 결제 전 연결 → earn=null · customer 생성됨
```

### Typecheck
```
$ pnpm typecheck
> commerce-core@0.0.1 typecheck
> tsc --noEmit
(0 errors)
```

## PR 본문 Kyu 실기 (손님 화면 번호 입력 → Done 잔액)
- [ ] 손님 화면 번호 입력 → Done \"Current balance\" = 적립 후 잔액 (Rp 15,000 결제 → 150)
- [ ] 이전 로그인한 번호 재입력 (기존 잔액 있는 경우) → 합산 표시
- [ ] 결제 후 소급 연결 (POS \"Ask phone on display\" 또는 CD 에서 번호 입력) → 적립 반영 표시

(커밋·push·PR 승인 없이 — PR 머지는 Kyu 소관)

## 범위 제외 (의도적)
- `register_session/lifecycle.ts` · `order-snapshot.ts` (M0-1125-C 범위)
- `ReceiptScreen.tsx` (M0-1125-C 범위)
- POS fork 전부
- `MainScreen/index.tsx` (M2 범위)

## 관찰 (후속 필요성)
- `attachEarnPreviewToSnapshot` 의 `loyalty.balance` 기본값이 0 (`existing?.balance ?? 0`) — POS 가 `loyalty.balance` 를 보내지 않으면 손님 화면에서 fallback 으로 0 이 보일 수 있음. 다만 본 수정으로 `snapshot.receipt.new_balance` 가 항상 정확해지므로 DoneScreen 의 `?? snapshot.loyalty?.balance` fallback 은 발동 안 됨 — 결제 완료 경로에 한해 안전.
