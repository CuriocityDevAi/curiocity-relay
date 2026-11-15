# R0-1105-EQ report

#258 판정 APPROVE · CI 초록

## REQ 1: expression partial unique index vs 운영 customer 충돌 · 23505 경로

**Index SQL (Migration20261115000001.ts):**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_customer_phone_e164_uniq"
ON "customer" ((metadata->>'phone_e164'))
WHERE metadata->>'phone_e164' IS NOT NULL AND deleted_at IS NULL;
```

**충돌 여부:**
- 기존 운영 customer: `phone` 중복 보유, `metadata` 없거나 `phone_e164` 미설정
- `WHERE metadata->>'phone_e164' IS NOT NULL` 조건 → 기존 행들은 인덱스 대상 외
- **충돌 0 · migrate 실패 위험 없음 ✅**

**23505 재조회 경로 (`upsertCustomerAndAccount` route.ts):**
```
1. listCustomers({ metadata: { phone_e164 } })  → 없으면
2. createCustomers([{ metadata: { phone_e164 } }])  시도
3. err.code === "23505" catch
   → listCustomers({ metadata: { phone_e164 } })  재조회
   → retried[0] 반환 (is_new: false)
```
race condition에서 1명 보장. 경로 완전 정상 ✅

**통합 테스트 2건 (REQ-CH ③):**
| 테스트 | 결과 |
|--------|------|
| "옛 customer 2명(같은 phone, metadata.phone_e164 없음) 존재해도 연결 정상" | pos-integration pass ✅ |
| "동시 2 요청(옛 customer 2명 공존) → customer 1명만" | pos-integration pass ✅ |

두 테스트 모두 `createCustomers([{ phone, metadata: {} }, { phone, metadata: {} }])` 로
metadata.phone_e164 없는 행 2개를 선 생성한 뒤 POST customer → 200/is_new=true,
`listCustomers({ metadata: { phone_e164 } })` → 1명만 확인.

## REQ 2: 앱 코드 metadata.phone_e164 항상 채움

`upsertCustomerAndAccount` 흐름:

| 단계 | 코드 | phone_e164 |
|------|------|-----------|
| 조회 | `listCustomers({ metadata: { phone_e164: phoneE164 } })` | 인덱스 key와 동일 |
| 생성 | `createCustomers([{ phone: phoneE164, metadata: { phone_e164: phoneE164, ... } }])` | 항상 채움 ✅ |
| 23505 재조회 | `listCustomers({ metadata: { phone_e164: phoneE164 } })` | 인덱스 key와 동일 |

**생성·조회 모두 `metadata.phone_e164` = 인덱스 key 완전 일치 ✅**

## REQ 3: CI checks

| job | 결과 | 시간 |
|-----|------|------|
| pos-integration | **pass** | 5m35s |
| unit-commerce-core | **pass** | 1m4s |
| check | **pass** | 12s |
| markers-and-forbidden | **pass** | 9s |
| changes-filter | **pass** | 6s |
| docker-smoke-anchor | skipping | — |
| docker-smoke-commerce-core | skipping | — |
| docker-smoke-wing | skipping | — |
| wrangler-check-care-agent | skipping | — |

CI 완전 초록. skipping 4건은 변경 없는 docker 빌드로 정상.

## EO CHANGES 해소 확인

| # | EO 지적 | M3-1105-CH 조치 | 해소 |
|---|---------|-----------------|------|
| ① | customer.phone 전체 unique → 운영 중복 migrate 실패 위험 | expression partial index (metadata->>'phone_e164' IS NOT NULL) | ✅ |
| ② | migration 위치 임시성 미명시 | 파일 상단 주석 — register_session 임시 위치, R4 이후 loyalty 모듈 이전 예정 | ✅ |
| ③ | 옛 customer 중복 phone 시나리오 미검증 | 통합 테스트 2건 추가 · CI pass | ✅ |

**판정: APPROVE**
