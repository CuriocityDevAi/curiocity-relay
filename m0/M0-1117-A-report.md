PR #322 · 계약 변경 없음 · 테스트 29 pass

# M0-1117-A — 전화번호 R1·R2 (서버) 완료 리포트

## 착지

- 리포지토리: `CuriocityDevAi/storeport`
- 브랜치: `feat/m0-1117-a-phone-r1-r2` (origin/main 최신 `eeda3c3` 기준)
- 커밋:
  - `5b85e48` feat(loyalty): M0-1117-A — 전화번호 R1·R2(서버) POS 손님 만들기/찾기 서버 입구 (9 files · +1326 / −14)
  - `6c8d61f` test(customer-display): M0-1117-A — phone-id country/local_display 필드 테스트 업데이트 (1 file · +16)
- PR: https://github.com/CuriocityDevAi/storeport/pull/322
- 머지 여부: 미머지 (PR 머지 금지 지시 준수)

## 계약 변경

**없음** — 프롬프트 §[REQ] 1~5 의 계약을 그대로 구현.

## 변경 파일 (이 프롬프트가 주인 범위 내)

### phone-id.ts 확장 (R1)
- `apps/commerce-core/src/lib/phone-id.ts` — `normalizePhone` 성공 응답에 `country: "62"` + `local_display` 추가 (기존 필드 불변)
- `apps/customer-display/src/lib/phone-id.ts` — 바이트-동일 복사본 유지
- `apps/commerce-core/src/lib/__tests__/phone-id.unit.spec.ts` — 신 필드 테스트 + fs 비교 바이트-동일 단언
- `apps/customer-display/src/lib/__tests__/phone-id.test.ts` — vitest 기대값 신 필드 반영

### 번호로 손님 찾기 헬퍼 (R2)
- `apps/commerce-core/src/lib/find-customers-by-phone.ts` (NEW)
  - `canonicalSortCustomers` 순수 함수
  - `findCustomersByPhone(container, e164)` — pg raw SQL (`regexp_replace` + trunk-LIKE) · 모듈 fallback · 재-정규화 검증 · canonical 정렬
- `apps/commerce-core/src/lib/__tests__/find-customers-by-phone.unit.spec.ts` (NEW)

### 새 API 2 개 (R2)
- `apps/commerce-core/src/api/admin/pos/customers/route.ts` (NEW) — POST `/admin/pos/customers`
- `apps/commerce-core/src/api/admin/pos/customers/search/route.ts` (NEW) — GET `/admin/pos/customers/search`

### 통합 테스트
- `apps/commerce-core/integration-tests/pos/customers-pos-api.spec.ts` (NEW)

### 문서
- `docs/feature-map.yaml` — `loyalty-store-credit` process 에 신규 파일 등록 + M0-1117-A 요약 (계획서 `docs/plans/phone-identity-plan.md` 은 수정 금지 준수 · PR #320 소유)

## 기술 선택 (권장안 채택 · PR 본문 3줄)

1. **raw SQL `regexp_replace` + LIKE trunk**: `e164.slice(3)` 를 phone 숫자-only 와 LIKE 매칭해 DB 측에서 후보군 축소. 세 레거시 모양("0812…" · "6281…" · "+62 813…") 공통 substring 이 trunk 라서 선택.
2. **JS 재-정규화 검증**: 뽑힌 후보를 `normalizePhone` 돌려 오탐 제거. 테스트 환경(pg 커넥션 없음) 은 customer module fallback.
3. **updateCustomers 시그니처**: Medusa v2 customer module 은 `(customerId, data)` 사용 — array-of-{id,…} 로 넘기면 내부 undefined access 로 500 (통합 테스트에서 실증 후 교정).

## 테스트 실행 로그 (로컬)

| 스위트 | 결과 | 비고 |
|---|---|---|
| `pnpm --filter commerce-core test -- phone-id` | **26 pass** | country/local_display · 바이트-동일 fs 비교 포함 |
| `pnpm --filter commerce-core test -- find-customers-by-phone` | **9 pass** | canonical 6종 · 매칭 2종 · 방어 1종 |
| `pnpm --filter commerce-core test` (전체 unit) | **366 pass / 26 suites** | 레거시 전부 통과 유지 |
| `pnpm --filter customer-display test` (vitest) | **133 pass / 8 suites** | phone-id 신 필드 반영 후 green |
| `TEST_TYPE=integration:pos npx jest integration-tests/pos/customers-pos-api.spec.ts` | **10 pass** | search 3입력 같은 집합 · POST 빈칸 채움 · 23505 · 409 email · 레거시 조회 등 |
| `pnpm --filter commerce-core typecheck` | **clean** | `tsc --noEmit` |
| `bash scripts/naming-check.sh` | **PASS** | meros 매치 0 · 모듈명 정합 · [...x] 없음 · 동명 migration 없음 |

**미검증**:
- `pnpm --filter commerce-core lint` — `@medusajs/eslint-plugin` 모듈을 pnpm 설치 후 찾지 못해 사전부터 실패. 내 코드 변경과 무관(main 에도 같은 실패 재현).
- E2E / Playwright — 이 라운드 범위 밖.

## 확인 (실기) — 앱 M3-1117-A 머지 뒤

- iPad "새 손님 추가" 에 `081380442480` 입력 → 기존 손님으로 연결되고 손님 수가 늘지 않음
- "손님 찾기" 에 `081…` / `6281…` / `+62 813…` 어느 것으로 쳐도 같은 손님 결과
- 레거시 phone 저장분(metadata.phone_e164 없는 행) 도 search 에서 찾힘

## 기계 판정 가능 어설션 파일

- `apps/commerce-core/src/lib/__tests__/phone-id.unit.spec.ts` — 26 case
- `apps/commerce-core/src/lib/__tests__/find-customers-by-phone.unit.spec.ts` — 9 case
- `apps/commerce-core/integration-tests/pos/customers-pos-api.spec.ts` — 10 case

## 금지 준수

- `link-customer-order.ts` · `orders-list` · `backfill-phone-customer-name.ts` · `apps/anchor/*` 무수정
- 레거시 phone / metadata.phone_e164 는 **읽기만** (중복 병합 R4 소관)
- 운영 DB · SSH · railway CLI 미접촉 · PR 머지 · 앱(fork) 수정 · CI 대기 · /loop · 예약 깨우기 미사용
- 네이밍 3층 규약(§0) 준수 — meros 문자열 소스 코드 등장 0

## 이연 (라운드 기준)

- 이번에 새로 미룬 것: **+0**
- 해소: **−0** (R4·R5 는 애초 보류로 계획된 라운드)
- 보류 목록: R4 중복 병합(Kyu Q1 운영 DB 조회 선행) · R5 레거시 phone → metadata.phone_e164 백필 스크립트

## 멈춤 사유

없음. 모든 [REQ] 항목을 승인 없이 완료 · 커밋 · push · PR 발의.
