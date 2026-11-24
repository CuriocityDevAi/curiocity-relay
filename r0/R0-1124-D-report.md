R0-1124-D-report
판정: **CHANGES** — 2건 필수 수정 (CI pos-integration 실패 확인)

## CI 통합 테스트 실행 여부

**실행됨** — CI `heavy-mac` 잡이 실 Postgres(`storeport_ci_45328902647`)에서 `pnpm test:integration:pos` 전체를 돌림.
결과: `order-number` FAIL + `orders-list` FAIL. 나머지 pos-integration 스펙(결제·환불·refund·void·fulfill 등)은 모두 초록.

---

## 발견 1 · SQL 바인딩 버그 (Critical — Block)

**파일**: `apps/commerce-core/src/modules/order_number/lib/reserve.ts`

`generateCustomDisplayIdImpl` 내부의 모든 raw SQL이 PostgreSQL-style `$1/$2/$3` 바인딩을 쓴다.
실행 경로는 `EntityManager.execute(sql, params)` → `knex.raw(sql, params)`.
knex `raw()`는 `?` 스타일만 params 치환하며 `$N`은 그대로 Postgres로 전달한다.
Postgres는 `$1`이 있지만 바인딩 값이 없으면 `there is no parameter $1` 에러를 발생시킨다.

CI 로그 증거:
```
[order_number] generateCustomDisplayId failed: select "nickname" from "order_number_store"
       where "stock_location_id" = $1 and "deleted_at" is null
       limit 1 - there is no parameter $1
```

에러는 `try/catch`에서 흡수돼 주문 생성 자체는 성공하지만 `custom_display_id`는 항상 `null`.
즉 번호 발급 로직이 프로덕션에서도 동작하지 않는다.

**영향 범위**: `runSql` 호출 3곳 모두 — nickname 조회, override 조회, counter UPSERT, lock UPDATE.
**수정 방향**: SQL 내 `$1 → ?`, `$2 → ?`, `$3 → ?` (knex positional binding 스타일).

---

## 발견 2 · orders-list 응답 shape 회귀 (Critical — Block)

**파일**: `apps/commerce-core/integration-tests/pos/orders-list.spec.ts:291`

이 PR이 orders-list 응답에 `custom_display_id` 필드를 추가했는데, 기존 shape-guard 단언이 갱신되지 않았다.

```
- Expected  - 0
+ Received  + 1

@@ -1,8 +1,9 @@
  Array [
    "created_at",
    "currency_code",
+   "custom_display_id",   ← 테스트가 모르는 신규 키
    "customer_has_phone",
```

테스트 실패: `M0-1117-B · 손님 칸 마스킹은 저장 모양과 무관하게 0813-****-2480 통일 · 응답 shape 불변`.
iPad POS shape 보호 테스트가 깨진 상태로는 머지 불가.

**수정 방향**: `orders-list.spec.ts:291~` 의 expected keys 배열에 `"custom_display_id"` 추가.

---

## 항목별 체크

| # | 항목 | 판정 | 근거 |
|---|------|------|------|
| ① | 통합 테스트 6건 CI 실행 | 실행됨, 6건 FAIL | SQL 바인딩 버그로 전부 null fallback · 위 발견 1 |
| ② | 번호 발급 실패 시 주문 생성 보호 | 통과 | try/catch 완전 wrap · CI에서도 주문 자체는 성공 확인 |
| ③ | order 모듈 재등록 기존 흐름 무결 | 통과 | 기존 pos-integration 전 스펙 초록(결제·환불·void·fulfill) |
| ④ | stock_location_id 추출 경로 | 미검증 | SQL 바인딩 버그로 CI에서 실제 번호 발급 경로 미도달 |
| ⑤ | 닉네임 잠금·중복 / 시작번호 다음달 | 서비스 로직 OK | service.ts 직접 테스트(⑥)는 통과, 단 lock UPDATE도 $1 버그 동반 |
| ⑥ | 마이그레이션 rollback 안전 | 통과 | down()이 DROP TABLE cascade 3개, core 테이블과 FK 없음 |

---

## 필수 수정 2건 요약

**A. `reserve.ts`**: `$1/$2/$3` → `?` 로 모두 교체

```ts
// 변경 전
`where "stock_location_id" = $1 and ...`, [stockLocationId]
// 변경 후
`where "stock_location_id" = ? and ...`, [stockLocationId]
```

동일하게 counter UPSERT의 `$1, $2, $3` 및 lock UPDATE의 `$1`도 교체.

**B. `orders-list.spec.ts`**: expected shape 배열에 `"custom_display_id"` 추가 (알파벳 순서 위치 삽입).

---

## 기타 메모 (머지 비차단)

- `ON CONFLICT ("stock_location_id", "yyyymm") WHERE "deleted_at" is null` — 마이그레이션 partial index 조건과 일치, 구문 자체는 정상.
- 동시 20건 UPSERT 설계(행 잠금 → 순차 +1)는 올바름 — SQL 바인딩 수정 후 ② 테스트가 실제 동작 검증할 것.
- `secondLocationId = \`${seed.stock_location_id}_alt\`` 접근법 — real stock_location 미생성이지만 order_number 모듈은 stock_location_id를 외래키로 쓰지 않으므로 ⑥ 테스트는 유효.
