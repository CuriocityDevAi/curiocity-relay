# R0-1105-BO — storeport #216 (M1-1105-AU) 리뷰 리포트

**판정: CHANGES**
이유: lockout 단위 테스트 3건(4건 요구 중 1건 미달) · CI에 단위 테스트 미편입 · storeId 해석 로직 4× 중복(공용 헬퍼 권고)

---

## 라우트별 store_id 대조표

| 라우트 | 파일:줄 | storeId 소스 | Admin GET 일치 |
|---|---|---|---|
| `GET /admin/pos/manager-pin` (기준) | `src/api/admin/pos/manager-pin/route.ts:49` | `query param → stock_location[0].id` | — |
| `POST .../manager-pin/verify` | `src/api/admin/pos/manager-pin/verify/route.ts:51` | `body.store_id → stock_location[0].id` | ✓ |
| `POST .../void` *(이번 수정)* | `src/api/admin/pos/orders/[id]/void/route.ts:232–249` | `order.metadata.stock_location_id → stock_location[0].id` | ✓ |
| `POST .../refund` *(이번 수정)* | `src/api/admin/pos/orders/[id]/refund/route.ts:197–213` | `order.metadata.stock_location_id → stock_location[0].id` | ✓ |
| `POST .../return` *(M0-1105-AE 기수정)* | `src/api/admin/pos/orders/[id]/return/route.ts:333–350` | `order.metadata.stock_location_id → stock_location[0].id` | ✓ |
| `POST .../refund-retry` | `src/api/admin/pos/orders/[id]/refund-retry/route.ts:173–207` | `order.metadata.stock_location_id → stock_location[0].id` | ✓ |
| tenders CASH | `src/api/admin/pos/orders/[id]/tenders/route.ts` | (manager_pin 검증 없음 — 해당 없음) | N/A |

lockout 키: `_shared/manager-pin.ts:112` → `const key = input.storeId \|\| "__default__"` — storeId 단위 메모리 잠금, 모든 라우트 일관됨.

---

## 실행 로그

### CI (GitHub Actions run 43038180821)

| 잡 | 결과 | 시간 |
|---|---|---|
| markers-and-forbidden | ✅ PASS | 8s |
| changes-filter | ✅ PASS | 7s |
| pos-integration | ✅ PASS | 3m22s |
| docker-smoke-* | SKIPPED | — |

**pos-integration 테스트 결과**: 87/87 PASS (tenders.spec.ts, 85.0s)

```
✓ #80 [M1-1105-AU] void · Admin PIN으로 성공 · metadata.stock_location_id 없는 주문 (845ms)
✓ #81 [M1-1105-AU] refund · Admin PIN으로 성공 · metadata.stock_location_id 없는 주문 (788ms)
✓ #47 wrong PIN → 401 with remaining_attempts count · 5th consecutive → 423 locked (883ms)
```

### 로컬 단위 테스트 (TEST_TYPE=unit · manager-pin.unit.spec.ts)

```
PASS src/admin/routes/manager-pin/__tests__/manager-pin.unit.spec.ts
Tests: 9 passed, 9 total
Time: 0.183s
```

lockout describe 블록 결과:
```
✓ 4 wrong + correct → ok:true (not locked yet)
✓ 5 wrong → locked · correct PIN after lock → reason:locked (가설 ①)
✓ 5th wrong attempt response has remaining_attempts:0 · locked:true
```

---

## CHANGES 항목

### C1 · lockout 단위 테스트 3건(요구 4건 중 1건 미달)

`manager-pin.unit.spec.ts` lockout describe 블록에 3개 it()이 존재. 누락된 케이스는 **store isolation**: 서로 다른 storeId는 별도 카운터를 가지는지 확인하는 테스트가 없음.

제안 추가 테스트:
```typescript
it("two stores have independent lockout counters", () => {
  const STORE_A = "sl_test_a";
  const STORE_B = "sl_test_b";
  for (let i = 0; i < 5; i++) {
    verifyManagerPin({ storeId: STORE_A, pin: "0000" });
  }
  // STORE_A는 잠겼지만 STORE_B는 독립 — 올바른 PIN으로 성공해야 함
  const correctB = computeDailyPin(STORE_B);
  const r = verifyManagerPin({ storeId: STORE_B, pin: correctB });
  expect(r.ok).toBe(true);
});
```

### C2 · 단위 테스트 CI 미편입

`.github/workflows/ci.yml`의 `pos-integration` 잡은 `pnpm test:integration:pos` (TEST_TYPE=integration:pos)만 실행. `TEST_TYPE=unit` (manager-pin.unit.spec.ts 포함) 미실행 → PR merge 후 lockout 로직 회귀를 CI가 잡지 못함.

해결 방안: CI에 unit 테스트 단계 추가
```yaml
- name: Run unit tests
  working-directory: apps/commerce-core
  run: pnpm test
```
또는 별도 `unit-test` 잡으로 분리.

---

## 권고 (not blocking)

### R1 · storeId 해석 로직 4× 중복

void · refund · return · refund-retry 모두 동일한 10줄 블록 복사:
```ts
let stockLocationId: string = ((order.metadata as any)?.stock_location_id as string) ?? "";
if (!stockLocationId) {
  const { data: locRows } = await query.graph({ entity: "stock_location", fields: ["id"], filters: {} });
  stockLocationId = (locRows?.[0]?.id as string) ?? "default";
}
```
`_shared/manager-pin.ts` 또는 별도 헬퍼(`resolveStoreId(order, query)`)로 추출하면 향후 로직 변경 시 단일 지점만 수정.

---

## 패스 항목 요약

- 전체 PIN 검증 라우트 storeId 소스 Admin GET과 일치: ✅ 6/6
- 잠금 키 storeId 단위 일관성: ✅
- 회귀 테스트 #80 · #81 CI 초록: ✅
- pos-integration CI 87/87 초록: ✅
- 버그 수정 로직(register_session_id 폴백 제거): ✅ 양쪽 라우트 동일 패턴 적용

---

착지: `cp /tmp/R0-1105-BO-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BO-report.md && git commit -m "r0: R0-1105-BO" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BO done "CHANGES — lockout 단위 테스트 3건(4건 요구 중 1건 미달) · CI 단위 테스트 미편입 · storeId 해석 헬퍼 권고"`
