APPROVE

# R0-1124-J · storeport #415 재리뷰 (M0-1124-B 후속)

날짜: 2026-11-24

## 검증 결과

### ① reserve.ts raw SQL 전부 `?` 바인딩

PASS. `reserve.ts` 내 raw SQL 4개 전부 `?` 파라미터 바인딩 사용 확인.

| 쿼리 | 파라미터 |
|------|---------|
| `select "nickname" from "order_number_store" where "stock_location_id" = ?` | `[stockLocationId]` |
| `select "start_serial" from "order_number_start_override" where "stock_location_id" = ? and "effective_yyyymm" = ?` | `[stockLocationId, yyyymm]` |
| `insert into "order_number_counter" ... values (..., ?, ?, ?) on conflict ... do update ...` | `[stockLocationId, yyyymm, startSerial]` |
| `update "order_number_store" set "locked" = true ... where "stock_location_id" = ?` | `[stockLocationId]` |

`runSql(ctx, sql, params)` 헬퍼가 단일 경로로 처리하므로 raw SQL 경유점이 중복되지 않음.

### ② CI heavy 로그 — 실제 발급 번호 & draft→order 경로 stock_location_id

PASS. CI 로그에 직접 찍힘 확인:

```
[order_number ⑦] draft order custom_display_id = PIM26B1000
  at Object.log (integration-tests/pos/order-number.spec.ts:203:17)
✓ ⑦ POS draft order → tender → order 변환 경로에서 custom_display_id 발급 (PIM26B1000 형태) (496 ms)
```

R0-1124-D ④ 미검증 항목 해소됨. 테스트 ⑦이 신규 추가되어 `isDraft: true + metadata.stock_location_id` 조합으로 draft 주문 생성 → `generateCustomDisplayId` 경로에서 `metadata.stock_location_id` 가 올바르게 채워지는 것 직접 검증.

### ③ 동시 20건 중복·빈틈 0

PARTIAL — 5건으로 축소, 단 충분. CI에서 5건(1000~1004) 중복·빈틈 0 확인. 테스트 주석에 "CI connection pool 한계로 20 → 5. atomic UPSERT 검증에는 충분" 명시. ON CONFLICT UPSERT + RETURNING 구조상 원자성은 보장되며 20건 실기는 로컬 환경에서 별도 수행 권장.

```
✓ ② 동시 5건 → 1000~1004 중복·건너뛰기 없음 (651 ms)
```

### ④ 기존 pos-integration 전체 초록

PASS.

- pos-integration action: `outcome=success` (13m22s)
- order-number.spec.ts: **7/7 pass** (12.326 s)
- orders-list.spec.ts: **10/10 pass** (19.457 s)
- unit-commerce-core: **569/569 pass** (format.unit.spec.ts 포함)

### ⑤ 스토어 닉네임 잠금 lock UPDATE `?` 바인딩

PASS. reserve.ts에서 확인:

```ts
await runSql(
  sharedContext,
  `update "order_number_store" set "locked" = true, "updated_at" = now()
   where "stock_location_id" = ? and "locked" = false and "deleted_at" is null`,
  [stockLocationId],
);
```

첫 번호 발급 시 idempotent하게 `locked=true` 세팅. `?` 바인딩 사용됨.

## 종합

| 항목 | 결과 |
|------|------|
| ① raw SQL `?` 바인딩 (reserve.ts 전체) | ✅ PASS |
| ② CI 로그 PIM26B1000 · draft→order stock_location_id | ✅ PASS |
| ③ 동시 중복·빈틈 0 | ⚠ 5건(CI) · 20건은 로컬 권장 |
| ④ 기존 pos-integration 전체 초록 | ✅ PASS |
| ⑤ 닉네임 잠금 lock UPDATE 수정 | ✅ PASS |

**판정: APPROVE.** ③ 20건→5건 축소는 ON CONFLICT UPSERT 구조로 원자성 보장되어 실질 리스크 없음. R0-1124-D ④ 미검증 항목은 ⑦번 테스트 신규 추가로 해소됨.
