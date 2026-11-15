# M3-1105-CH report

완료: `IDX_customer_phone_uniq`(phone 컬럼) → `IDX_customer_phone_e164_uniq`((metadata->>'phone_e164')) expression partial unique index · 위치 임시 주석 · 옛 customer 2명(phone 중복, metadata 없음) 시나리오 통합 테스트 2건 추가 · PR #258 rebase + push · CI 완전 초록.

## 변경 요약

### REQ 1 — expression partial unique index (Option B 채택)

`Migration20261115000001.ts` 변경:

| | 이전 | 이후 |
|--|------|------|
| 인덱스 대상 | `(phone)` | `((metadata->>'phone_e164'))` |
| WHERE 절 | `phone IS NOT NULL AND deleted_at IS NULL` | `metadata->>'phone_e164' IS NOT NULL AND deleted_at IS NULL` |
| 인덱스명 | `IDX_customer_phone_uniq` | `IDX_customer_phone_e164_uniq` |

기존 운영 customer(metadata.phone_e164 없음)는 WHERE IS NOT NULL 조건에서 제외 → 중복 phone 행이 있어도 migrate 실패 위험 0.

### REQ 2 — 위치 임시성 주석

```
// 임시 위치: register_session 모듈에 loyalty DDL을 두는 것은 모듈 경계상 임시 조치.
// 로열티 전용 모듈 생성 시 이 migration 을 이전 예정 (R4 이후 후보).
```

### REQ 3 — 통합 테스트 추가

`integration-tests/loyalty/customer-link.spec.ts`에 2건 추가:
- 옛 customer 2명(같은 phone, metadata.phone_e164 없음) 존재해도 연결 정상
- 동시 2 요청(옛 customer 2명 공존) → customer 1명만

기존 "동시 2 요청 → 1명" 케이스와 합쳐 운영 환경 중복 phone 시나리오까지 검증.

### REQ 4 — CI 결과

| job | 결과 | 시간 |
|-----|------|------|
| pos-integration | **pass** | 5m35s |
| unit-commerce-core | **pass** | 1m4s |
| check | **pass** | 12s |
| markers-and-forbidden | **pass** | 9s |
| changes-filter | **pass** | 6s |
| docker-smoke-* / wrangler-check-* | skipping | — |

전체 초록.

## 커밋

`f0605cd fix(loyalty): M3-1105-CH — phone unique index → metadata.phone_e164 expression partial index · 위치 임시 주석 · 옛 customer 중복 phone 시나리오 테스트`

PR: https://github.com/CuriocityDevAi/storeport/pull/258
