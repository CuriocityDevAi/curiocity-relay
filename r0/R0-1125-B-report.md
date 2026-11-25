APPROVE — R0-1125-B · PR #425 (M0-1125-B) earn.ts refresh 폴백 · idempotent self-heal 위험 분석

PR: https://github.com/CuriocityDevAi/storeport/pull/425
Commit: fcdaf21

## 통합 테스트 3건 직접 실행 결과

```
PASS integration-tests/loyalty/cd-done-new-balance.spec.ts (12.4 s)
  ✓ 신규 고객 (balance=0) + Rp15k 결제 → snapshot.receipt.new_balance=150 (1400 ms)
  ✓ 기존 잔액 300 고객 + Rp15k 결제 → snapshot.receipt.new_balance=450 (891 ms)
  ✓ 소급 연결(late link · 창 안) → snapshot.receipt.new_balance 적립 반영 (488 ms)
Tests: 3 passed, 3 total
```

## CI

heavy-cloud PASS · check PASS · route PASS · markers-and-forbidden PASS · heavy-mac skipping (무관)

## 위험 분석

### 1) 동시 두 경로 → 이중 적립 불가 ✓

`withOrderEarnLock` 의 `pg_advisory_xact_lock('loyalty-earn:<order_id>')` 로 동일 주문 직렬화. 2번째 경로가 락을 획득하면 `freshMeta.loyalty_earn.applied === true` 를 보고 조기 idempotent 반환 — `creditAccounts()` 는 최대 1회만 호출된다. 테스트 `link-earn.spec.ts earnForOrder×2 동시` 7/7 회귀 PASS.

### 2) 차감/마이너스 잔액 불가 ✓

refresh 폴백:
- `preEarnBalance = Number(account.balance ?? 0)` ≥ 0
- `creditedAmount = earnAmount − offsetAmount`, offsetAmount ≤ earnAmount (loyalty_negative.offset 보장) → creditedAmount ≥ 0
- `computedBalance = preEarnBalance + creditedAmount` ≥ 0 항상 성립

idempotent self-heal:
- `Math.max(newBalance, earned)`: newBalance=0, earned>0 → earned 하한선 → 항상 양수

### 3) 소멸(expiry) 후 ✓ (알려진 트레이드오프)

이론상 엣지: expiry-runner 가 `listStoreCreditAccounts({customer_id})` 조회와 `creditAccounts()` 호출 사이에 소멸을 처리하면:
- `preEarnBalance` = 소멸 전 값 (예: 100)
- `computedBalance` = 250 (preEarn 100 + credited 150)
- 실제 DB = 200 (소멸 50 + 적립 150)
- `refreshedBalance`(200) < `computedBalance`(250) → computedBalance 채택 → Done 화면 과다 표시(250 vs 실제 200)

허용 근거:
- snapshot.receipt 표시 전용 — 실제 계좌 잔액은 DB에 정확히 기록됨
- 발생 창이 수 ms 이내, 발생 빈도 극히 낮음
- `>= computedBalance` 역방향 조건을 쓰면 refresh 빈 배열·stale 케이스에서 원래 Rp 0 버그 재현
- 현재 접근이 최선의 트레이드오프

### 4) Idempotent self-heal 추가 관찰

self-heal 성공 시 `metadata.loyalty_earn.new_balance` 를 갱신하지 않아 세 번째 idempotent 호출에서도 live 조회를 한 번 더 한다. 성능 impact 미미하고 정확성 무관 — 허용 범위.

## 범위 준수 ✓

`earn.ts` 두 지점만 수정. `register_session/lifecycle.ts` · `order-snapshot.ts` · `ReceiptScreen.tsx` · POS fork 모두 미건드림.

## PR 리뷰

자체 PR 승인 불가 사유로 APPROVE 대신 COMMENT 로 리뷰 제출 완료 (PR #425).
