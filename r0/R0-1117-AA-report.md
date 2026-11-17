#335 APPROVE · 문제 0건

## 리뷰 결과: APPROVE

PR: feat(loyalty): M2-1117-O — earnForOrder S3 earn offset (빚 먼저 상계)
파일: earn.ts (+62/-18) · earn-offset.unit.spec.ts (+257/0)
테스트: 2 suites 13 tests PASS (earn-offset.unit.spec.ts + snapshot-earn.unit.spec.ts)

---

## [REQ 1] 상계 → credit 순서 · 상계액 · skip · metadata 3값 ✅

**순서**: earn.ts:286 `loyaltyNeg.offset()` → earn.ts:302 `storeCredit.creditAccounts()` — 상계 먼저, credit 나중. ✅

**상계액 = min(적립, 빚)**:
- earn.ts:290 `max_amount: earnAmount` 로 offset 호출
- service.ts:234 `applied = Math.max(0, Math.min(max_amount, current))` → min(earnAmount, debtBalance) ✅

**credit 0 이면 skip**:
- earn.ts:299 `if (creditedAmount > 0) { await storeCredit.creditAccounts(...) }` ✅

**metadata.loyalty_earn 3값**:
- 정상 경로 earn.ts:328-330: `earned: earnAmount, offset: offsetAmount, credited: creditedAmount` ✅
- zero_earn 경로 earn.ts:262-264: `earned: 0, offset: 0, credited: 0` ✅
- 멱등 복원 earn.ts:195-197: `earned ?? amount, offset ?? 0, credited ?? amount` (구버전 metadata 호환) ✅

---

## [REQ 2] 멱등 · 손님 없는 주문 영향 0 · 동시성 위험 ✅

**earn 멱등**:
- earn.ts:192-200: `freshMeta.loyalty_earn.applied === true` → `idempotent: true` 조기 반환, offset/credit 미호출 ✅
- offset 멱등: service.ts:221-231 `_findEventByRef(ref)` 중복 ref 체크 → `duplicate: true` 반환 ✅
- ref 형식: `offset:earn:<order_id>` — 계획서 §3.9 "Earn offset: `offset:${earn_ref}`" 일치 ✅

**손님 없는 주문 영향 0**:
- earn.ts:162-168: `customer_id` 없으면 `skipped_reason: "no_customer"` 반환, offset 미호출 ✅
- 테스트 "손님 없는 주문" 케이스 커버 (earn-offset.unit.spec.ts:224) ✅

**동시성 위험 분석**:
- 같은 order 직렬화: earn.ts `withOrderEarnLock` → `pg_advisory_xact_lock` ✅
- 같은 customer S2(addDebt)↔S3(offset) 직렬화: service.ts `withCustomerLock` (in-process FIFO mutex) ✅
- **주의**: `withCustomerLock`은 단일 프로세스 보장. service.ts:19-21 주석에 명시 — "Production can additionally wrap in a SELECT … FOR UPDATE transaction once multi-worker write contention is observed." 멀티-워커 배포 시 DB-level row lock 추가 필요. 단, 현재 storeport는 단일 프로세스이므로 운영 위험 없음.

---

## [REQ 3] 기존 테스트 회귀 0 · 금지 파일 미변경 · 테스트 실행 ✅

```
PASS src/lib/loyalty/__tests__/earn-offset.unit.spec.ts   (5 tests — 신규)
PASS src/lib/loyalty/__tests__/snapshot-earn.unit.spec.ts (8 tests — M1-1116-V 900단위)
Tests: 13 passed, 0 failed
```

PR 변경 파일 2개 (`earn.ts`, `earn-offset.unit.spec.ts`) 외 금지 파일 미변경 ✅

---

## 추가 관찰 (문제 아님)

- `newBalance` 초기값 (creditedAmount=0 경로): `account.balance` 그대로 반환 — credit 없으면 잔액 불변이므로 올바름.
- `loyalty_negative` 모듈 미설치 non-fatal: earn.ts:283-291 try/catch → offset=0 fallback, 전액 credit 진행 ✅
- zero_earn 경로에서 offset 미호출: 적립 0이면 상계 불가 — 계획서 §3.5 의도와 일치 ✅
