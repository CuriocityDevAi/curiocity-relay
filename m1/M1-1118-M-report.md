#383 갱신 · expected_cash O · by_method O · 30건 실제 30 O · it O

# M1-1118-M — Shift-Close BUG-D/BUG-B 수정 보고서

**날짜**: 2026-11-18  
**브랜치**: `test/M1-1118-K-store-day-rehearsal`  
**PR**: #383

---

## 버그 요약

| ID | 증상 | 비중 |
|----|------|------|
| BUG-D | `x_report.expected_cash` = `opening_float` only — 현금매출 미반영 → 575,000 Rp 오차 | 치명 |
| BUG-B | `z_report.by_payment_method = {}` — 수단별 매출 집계 없음 | 치명 |

---

## 근본 원인 분석

### BUG-D 원인 1: Provider ID 불일치
`_helpers.ts` 에 `CASH_PROVIDER = "pp_system_default"` 하드코딩되어 있었으나,  
실제 tenders 라우트는 `"pp_cash_default"` 를 사용 → `by_payment_method["cash"] = 0`.

### BUG-D 원인 2: `listOrders` HTTP route 컨텍스트 0건 반환
`computeReport` 에서 `orderModule.listOrders({})` / `query.graph` 를 통한 주문 조회가  
HTTP route 컨텍스트에서 항상 0건 반환. 주문 데이터는 존재하지만 어떤 접근법도 작동 안 함.

### BUG-B 원인: 동일 (by_payment_method가 order 조회에 의존)

### 통합 테스트 BUG (숨겨진 원인)
`medusaIntegrationTestRunner` 는 `beforeEach` 마다 DB를 template으로 restore.  
각 `it()` 블록에서 `addExpectedByMethod` 가 DB에 커밋해도, 다음 블록 시작 전에 rollback됨.  
→ `expected_by_method` 는 `it("f")` 실행 시 항상 null.

---

## 수정 내용

### 1. `_helpers.ts` 전면 재작성

**by_payment_method 소스 변경**
- Order 조회 (broken) → `session.expected_by_method` (tenders 라우트가 원자적 가산)
- 구조: `{cash: N, card_by_bank: {BCA: N, ...}, qris_by_issuer: {BRI: N, ...}}`
- card/qris: bank/issuer별 합산으로 단일 `card`/`qris` 값 도출

**expected_cash 산식**
```
expected_cash = opening_float + ebm.cash - pickups_total + adjustments_delta
```
- `ebm.cash` = 모든 현금 tender (void/refund 포함 · addExpectedByMethod 가산)
- `adjustments_delta` = void/refund의 adjustment movement 합산 (음수)
- 순효과: `ebm.cash + adjustments_delta = 순현금매출` (대사 정확)

**movements 로딩 개선**
- `retrieveRegisterSession(id, {relations: ["movements"]})` 로 먼저 시도
- 실패시: `listCashMovements({session_id: sessionId}, {take: 500})` 명시적 필터

**providerIdToMethod() 추가**
- `pp_cash_*` → `"cash"`
- `pp_edc_*` → `"card"`
- `pp_xendit_qris_*` → `"qris"`
- `pp_system_default` → `"cash"` (레거시 fallback)

### 2. `store-day-rehearsal.spec.ts` 수정

**핵심: `dbUtils.snapshot()` 추가**
```typescript
// 각 it() 블록 종료 시:
await (dbUtils as any).snapshot();
```
- testSuite 에 `dbUtils` 추가 destructure
- it(a/b+c-cash/b+c-card/b+c-qris/d-void/d-refund/d-return/e-loyalty/e-link) 각각에 추가
- DB 상태가 다음 블록으로 이어지므로 expected_by_method 가 누적됨

**soft → strict assertion**
```typescript
expect(cashDiff).toBeLessThanOrEqual(1);        // BUG-D 완전 검증
expect(typeof xByMethod.cash).toBe("number");   // BUG-B 검증
expect(xByMethod.cash).toBeGreaterThan(0);
```

---

## 테스트 결과

| 테스트 | 결과 | 시간 |
|--------|------|------|
| unit (47 suites, 539 tests) | ✅ 전체 통과 | 5s |
| tsc --noEmit | ✅ 오류 없음 | - |
| REHEARSAL_ORDERS=10 (10건) | ✅ 10/10 | 25s |
| REHEARSAL_ORDERS=30 (30건) | ✅ 10/10 | 27s |
| checkout-handover-smoke | ✅ 2/2 | 10s |

---

## 커밋

```
a4216b6 fix(register-session): M1-1118-M — shift-close BUG-D/BUG-B 수정 (expected_cash·by_payment_method)
```

## 변경 파일

- `apps/commerce-core/src/api/admin/register-sessions/_helpers.ts`
- `apps/commerce-core/integration-tests/pos/store-day-rehearsal.spec.ts`

## PR

https://github.com/CuriocityDevAi/storeport/pull/383
