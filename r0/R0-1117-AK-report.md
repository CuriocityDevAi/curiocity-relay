#346 APPROVE · 문제 0건

## 검증 범위 (REQ 1·2·3)

### REQ 1 — 옛 라우트 ↔ 새 step 1:1 대조

| 옛 route | 새 step/workflow | 결과 |
|---|---|---|
| `POST /admin/pos/customers` (206줄) | `customerIdentityWorkflow` → `findCustomerByPhoneStep` + `upsertCustomerByPhoneStep` | ✅ 동작 불변 |
| `GET /admin/pos/customers/search` (226줄) | `doSearchCustomers(req.scope, {q,limit,offset})` → `searchCustomersStep` | ✅ 동작 불변 |
| `GET /admin/pos/customers/:id/summary` (239줄) | `doGetCustomerSummary(req.scope, {customer_id})` → `getCustomerSummaryStep` | ✅ 동작 불변 |

**전화번호 정규화 (`phone-id.ts`)**: `find-by-phone.ts`에서 `normalizePhone(input.phone_raw)` 그대로 호출. 400 "invalid_phone" 응답 경로 보존.

**62/620/0062 0 검색**: `search-customers.ts` `doSearchCustomers`가 옛 search route의 4분기 분기 로직 (빈q→최근손님 / 정규화성공→findCustomersByPhone / digits≥3→partialPhoneMatch / 나머지→nameEmailSearch) 1:1 이식. 함수 body 동일.

**이메일 없는 생성**: `upsert-customer.ts` `createCustomers([{email: email ?? undefined, ...}])` - undefined 처리 그대로.

**중복 번호 처리**:
- 기존 존재 → canonical[0] 반환 (200, created:false)
- race condition(PG 23505 / "already exists") → `findCustomersByPhone` 재조회 후 승자 반환 (200, created:false)
- EmailConflictError → 409 "email_taken"

**응답 JSON 스냅샷**: 세 endpoint 모두 키 구조 동일
- POST: `{ customer: PosCustomer, created: boolean, filled?: string[] }`
- search: `{ customers: PosCustomer[], count: number, phone_normalized: string|null }`
- summary: `{ phone, balance, account_id, total_revenue, visit_count, last_visit_at, orders[], transactions[] }`

### REQ 2 — 테스트 · tsc · 권한

**단위 테스트 (11개)**: 전부 PASS
```
PASS src/workflows/customer-identity/__tests__/customer-identity-workflow.unit.spec.ts
Tests: 11 passed, 11 total  Time: 0.898 s
```

**tsc (`pnpm typecheck`)**: 출력 없음 → 에러 0건

**POS 인증**: `/admin/pos/customers/**` 라우트 경로 변경 없음 → Medusa framework 레벨 admin 인증 그대로 적용. `middlewares.ts`는 customer-display 전용 미들웨어만 포함하며 POS customer routes는 미영향.

### REQ 3 — 최종 판정

**APPROVE**

이슈 없음. 로직 추출 품질 양호:
- `do*` inner handler 패턴으로 workflow runner 없이 단위 테스트 가능
- 에러를 typed error class (PhoneValidationError, EmailConflictError)로 명시화
- `docs/feature-map.yaml`에 summary + workflow 경로 추가 (기존 누락 수정)

---
Reviewed-by: R0-1117-AK · 2026-11-17
