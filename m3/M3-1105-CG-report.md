# M3-1105-CG 결과

**R0-EL 수정 ①②③④ 전부 완료. PR #258 추가 커밋 5건 push.**

## REQ 수행 결과

| REQ | 항목 | 조치 |
|-----|------|------|
| ① | inFlight Map 제거 → DB unique guard | `Migration20261115000001` (register_session 모듈): `CREATE UNIQUE INDEX IDX_customer_phone_uniq ON customer(phone) WHERE phone IS NOT NULL AND deleted_at IS NULL` + route.ts catch 23505 → retry listCustomers |
| ② | take:50 전체 조회 제거 | `listOrders({ metadata: { register_session_id } }, { take:2, DESC })` · 통합 테스트 55건 섞임 케이스 추가 |
| ③ | 14자리 경계 단위 테스트 | `08123456789012` 거부 + `0812345678901` 허용 명시 (20 passed) |
| ④ | feature-map 봇 경고 0 | loyalty-store-credit `planned → live` 승격 · summary 갱신 |

## 자기 검증

**단위 테스트 (로컬)**:
```
PASS src/lib/__tests__/phone-id.unit.spec.ts
  normalizePhone — 정규화 표 (10 형식): 10 passed
  normalizePhone — 경계 허용: 1 passed  ← 신규 (13자리 허용)
  normalizePhone — 유효성 오류: 7 passed  ← 신규 (14자리 경계 추가)
  maskE164: 2 passed
Tests: 20 passed, 20 total
```

**전체 unit (push hook)**:
```
Test Suites: 13 passed, 13 total
Tests: 180 passed, 180 total
```

**통합 테스트**: 로컬 Postgres 없음 · CI 대기 (push 완료 361511f)

**CI check runs**: API 403 (접근 불가)

**push 결과**: `4c15dc4..361511f feat/m3-1105-cf-loyalty-r3-phone-customer` (5 commits)

## 커밋 목록
- `974ffee` fix(loyalty): M3-1105-CG ① migration — IDX_customer_phone_uniq
- `1567585` fix(loyalty): M3-1105-CG ① ② route.ts — inFlight 제거 · catch+retry · P-3 직접 쿼리
- `b77252e` test(loyalty): M3-1105-CG ③ 14자리 경계 단위 테스트 + 13자리 허용
- `5558633` test(loyalty): M3-1105-CG ② 통합 테스트 — P-3 55건+ 섞임 케이스
- `361511f` fix(feature-map): M3-1105-CG ④ loyalty-store-credit planned → live

## 기술 선택지 근거 (PR #258 본문 반영)
1. **unique 제약 위치**: `customer.phone` 컬럼 partial index (deleted_at IS NULL 포함) — Medusa 2.17.2 phone 필드에 unique 없음 확인 후 채택. advisory lock 대비 migration으로 선언적이고 Medusa 재배포 후도 보장.
2. **P-3 쿼리**: `listOrders` metadata 필터 — 이미 `listCustomers({ metadata: { phone_e164 } })` 패턴이 codebase에 있어 동일하게 적용.
3. **통합 테스트 범위**: 단일 프로세스 내 "동시 2 요청" 테스트는 기존 test 유지 (인프라 한계상 멀티 프로세스 증명 불가) · unique index가 실 DB 수준 증명.
