# R0-1105-EO report

#257 CI: 초록 · #258 판정: CHANGES

## CI 결과 (gh pr checks)

| job | #257 | #258 |
|-----|------|------|
| pos-integration | pass (5m4s) | pass (5m51s) |
| unit-commerce-core | pass (58s) | pass (56s) |
| check | pass (13s) | pass (14s) |
| markers-and-forbidden | pass (7s) | pass (8s) |
| changes-filter | pass (8s) | pass (6s) |
| docker-smoke-* / wrangler-check-* | skipping | skipping |

두 PR 모두 CI 완전 초록.

## #258 리뷰

### ① 유일 인덱스 migration — CHANGES

**[중요] 운영 데이터 중복 → migrate 실패 가능**

`Migration20261115000001`이 `customer(phone) WHERE phone IS NOT NULL AND deleted_at IS NULL` partial unique index를 생성한다.  
기존 운영 DB에 phone이 같은 행이 2개 이상 존재하면 `CREATE UNIQUE INDEX`가 실패한다.  
머지 전 아래 쿼리로 중복 확인 필수:

```sql
SELECT phone, COUNT(*)
FROM customer
WHERE phone IS NOT NULL AND deleted_at IS NULL
GROUP BY phone
HAVING COUNT(*) > 1;
```

권장안:
- A) 사전 정리 — 중복 phone 행 NULL 처리 또는 soft-delete 후 migration
- B) metadata 경로 전환 — `customer.metadata->>'phone_e164'` expression index로 대체

**[경미] Migration 위치**

`register_session/migrations`에 `customer` 테이블 DDL이 있는 것은 모듈 경계 위반 우려.  
`loyalty` 전용 모듈 생성 시 이전하거나 임시 위치임을 주석으로 명시 권장.

**23505 catch+retry 경로 자체는 정상**: createCustomers 실패 → 23505 감지 → `metadata.phone_e164`로 재조회 → 반환. 멀티 인스턴스 동시 생성 방어 로직 맞음.

### ② register_session_id 직접 필터 + take 2 · 55건 테스트 — 통과

```ts
listOrders(
  { metadata: { register_session_id: registerSessionId } },
  { take: 2, fields: ["id","created_at"], order: { created_at: "DESC" } }
)
```

55건 다른 세션 주문이 있어도 세션 필터로 격리되므로 false negative 없음.  
통합 테스트 `P-3 허용: 다른 계산대 주문 55건 이상 섞여도 같은 세션 최신 주문 판정 정확` → `pos-integration: pass`로 CI 확인됨.

### ③ 14자리 경계 · feature-map 경고 0 — 통과

phone-id.unit.spec.ts:
- `0812345678901` (13자리 local) → 허용 ✓
- `08123456789012` (14자리 local) → 거부 (error 포함 "10") ✓
- 단위 테스트 20개 passed (CI `unit-commerce-core: pass`)

feature-map.yaml: `loyalty-store-credit` status `planned` → `live` + files 항목 추가.  
`markers-and-forbidden: pass` → 경고 0 확인됨.

### ④ main 기준 mergeable · #257 파일 충돌 — 통과

- `mergeable: MERGEABLE` / `mergeStateStatus: CLEAN`
- #257 변경 파일: `loyalty_settings/**`, `medusa-config.ts`, `docs/feature-map.yaml`
- #258 변경 파일: `orders/[id]/customer/**`, `orders/[id]/loyalty-info/**`, `lib/phone-id.ts`, `register_session/migrations/**`, `docs/feature-map.yaml`
- 현재 main 기준 충돌 없음. 단, #257 먼저 머지되면 `docs/feature-map.yaml` 충돌 발생 가능 → 머지 순서 주의.

## PR 코멘트

https://github.com/CuriocityDevAi/storeport/pull/258#issuecomment-6887831152
