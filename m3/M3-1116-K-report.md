# M3-1116-K 착지 보고

**PR #307 · 근본 수정 방식: 우회(이미 적용됨 — orders-list 직접 모듈 조회) · post-pay 통합 테스트 ✅ · 보정 대상 N건: 로컬 dry-run 0건(운영 DB 미실행)**

---

## 수정 내용

### ① 근본 — 주문↔손님 연결 `query.graph customer.*` 가시성

| 접근 | 조사 결과 | 채택 |
|------|-----------|------|
| **코어** | Medusa v2 Order 모듈은 `customer_id`를 `model.text().nullable()` 직접 컬럼으로 보유. `updateOrderWorkflow`도 raw column만 세팅, link pivot table 없음. | ✗ |
| **우회** | `orders-list/route.ts`는 이미 `query.graph customer.*` 대신 `customerModule.listCustomers({ id: customerIds })` 직접 호출. `customer_id` 컬럼 → 정상 조회됨. | ✅ 이미 적용 |
| **신규** | `src/links/order-customer.ts` + `remoteLink.create` → DB 마이그레이션·backfill 필요. 모든 소비자(orders-list·loyalty-info·customers/summary)가 직접 모듈 조회 중 → 불필요. | ✗ |

**결론**: 가장 작은 방법 = 우회(이미 적용됨). Medusa v2 환경에서 `query.graph customer.*` 없이 직접 모듈 조회 패턴이 올바른 접근.

### ② customer.first_name = 마스킹 번호

`upsertCustomerAndAccount` 신규 customer 생성 시 `first_name: phoneMasked` ("0813-****-2480" 형식) 추가.
Admin Store Credit Accounts 목록이 N/A → 전화번호 표시.

### ③ store_credit_balance = POST-earn 잔액

```ts
// Before (기존)
store_credit_balance: upsert.balance        // PRE-earn = 신규 고객 → 0
// After (수정)
store_credit_balance: earn?.new_balance ?? upsert.balance  // POST-earn
```

POS iPad 화면 경로 확인: `linkCustomerToOrder` 응답의 `store_credit_balance` 값으로 DoneScreen·번호 연결 완료 화면 모두 잔액 렌더링 (fork 코드 `apps/customer-display` 확인).

---

## 테스트 결과

### 단위 테스트
- 23 suites · 332 tests ✅ (push hook 통과)

### 통합 테스트 (`integration-tests/loyalty/post-pay-link-balance.spec.ts`)
- post-pay `store_credit_balance === earn.new_balance` ✅
- orders-list 전화번호·적립액 표시 ✅
- `customers/:id/summary` 잔액 일치 ✅
- 신규 customer `first_name` = 마스킹 번호 ✅
- pre-pay 회귀 없음 ✅
- **실행**: 로컬 DB 없음 / CI 에서 검증 예정

### Admin Orders 목록 스크린샷
- **미실행(로컬 서버 = 다른 워크트리 코드, feat/m3-1116-k 아님) → 미검증**

---

## 보정 스크립트

```
# dry-run (기본)
pnpm --filter commerce-core exec medusa exec ./src/scripts/backfill-phone-customer-name.ts
# 적용 (Kyu 승인 후)
pnpm --filter commerce-core exec medusa exec ./src/scripts/backfill-phone-customer-name.ts -- --apply
```

로컬 dry-run 결과: 보정 대상 **0건** (로컬 DB에 phone-only 손님 없음).
운영 DB는 Kyu 승인 후 오케가 실행.
