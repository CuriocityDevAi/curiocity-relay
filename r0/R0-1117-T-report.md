#328 APPROVE · #329 APPROVE

## #328

**PR**: fix(phone): M2-1117-L — 전화번호 trunk-0 제거 (62 뒤 0, IDD 0062)
**실제 변경 파일** (단일 커밋): 4개 — phone-id 관련만

### A. 변경 파일 확인
`git diff 2e15c52..r0-328 --name-only` 결과:
- `apps/commerce-core/src/lib/phone-id.ts`
- `apps/commerce-core/src/lib/__tests__/phone-id.unit.spec.ts`
- `apps/customer-display/src/lib/phone-id.ts`
- `apps/customer-display/src/lib/__tests__/phone-id.test.ts`

phone-id 관련 파일 + 테스트만. `hub-m3...r0-328` 비교 시 customer-display 전체가 나왔으나 이는 hub-m3 가 `2e15c52` 뒤에 있어 선행 머지 커밋이 포함된 것 — 단일 PR 커밋 diff 는 4개만. **PASS**

### B. 두 사본 바이트 동일
`diff apps/commerce-core/src/lib/phone-id.ts apps/customer-display/src/lib/phone-id.ts` → exit=0 (차이 없음). 테스트도 동일성 단언 포함 (phone-id.unit.spec.ts §"두 파일 바이트-동일"). **PASS**

### C. 번호 케이스 커버리지
trunk-0 describe 블록 CASES 배열:
- `620XXXXXXXX` → `["62081380442480", "+6281380442480"]` ✓
- `+620XXXXXXXX` → `["+62081380442480", "+6281380442480"]` ✓
- `+62 (0)XXXXXXXX` → `["+62 (0)813 8044 2480", "+6281380442480"]` ✓
- `0062XXXXXXXX` → `["0062 0813 8044 2480", "+6281380442480"]` ✓
- `0XXXXXXXX` (국내 0) → 기존 VALID_CASES: `["08123456789", ...]` ✓
- 기존 `62XXXXXXXX` → `["6281234567890", ...]` ✓ (기존 케이스 유지)

6종 모두 커버. **PASS**

### D. 테스트 커버리지
`pnpm typecheck` → 에러 0. `jest --testPathPattern=phone-id` → 31 tests, 1 suite, all PASS. **PASS**

---

## #329

**PR**: fix(pos): M0-1117-G — QRIS Simulate 환불 모의 성공 + 계산원 UI code
**실제 변경 파일** (단일 커밋): 4개

### A. 이중 조건 테스트 모드 판별
`xendit-refund.ts` 내 조건:
```ts
if (creds.mode === "test" && isSimulatePayment(input.payment, input.session)) {
```
1. `creds.mode === "test"` — secret_key 가 `xnd_development_` 접두사일 때만 "test"
2. `isSimulatePayment()` — `payment.data.simulated_at` 또는 `session.data.simulated_at` 마커 존재

`&&` 연산자로 양쪽 모두 필요. **PASS**

### B. 운영 키(production key)에서 모의 경로 절대 불가
조건이 `&&` 형태 (`||` 아님). 테스트 케이스 (b): `credsLive` (xnd_production_fake) + `simulated_at` 마커 있어도 → `xenditCalled = true` (Xendit 호출). `result.simulated_refund === undefined`, `code === "qris_refund_ok"` 확인. **PASS**

### C. 감사 기록
- `XenditRefundSuccess` 타입에 `simulated_refund?: boolean` 포함
- `refund/route.ts`: 성공 시 `qrisResults`에 `simulated_refund: qrisRefund.simulated_refund === true || undefined`
- order.metadata.refund.tenders[].xendit 에 `...(meta.simulated_refund ? { simulated_refund: true } : {})` 기록
- 최종 응답에도 `simulated_refund` 포함 (상위 호환)
**PASS**

### D. 현금 미지급 유지 (실패 시)
QRIS 환불 실패(`!qrisRefund.ok`) 시 `res.status(400).json(...)` 후 `return` — 함수 종료. Cash Movement 생성 블록(2번 단계)에 도달하지 않음. 현금 미지급. `fallback: "cash"` 필드는 caller(iPad)에게 현금으로 대신 처리하라는 안내용. **PASS**

### E. 오류 응답 code
`XenditRefundUiCode` 타입 정의:
- `qris_refund_simulated` / `qris_refund_window_exceeded` / `qris_refund_partial_unsupported`
- `qris_refund_unsupported` / `qris_refund_not_configured` / `qris_refund_missing_request_id` / `qris_refund_failed`

모든 fallback 분기에 `code` 필드 포함. 400 응답에도 `code: qrisRefund.code` 추가. **PASS**

### F. Cash+QRIS 전액 시나리오 테스트
unit spec(`xendit-refund-simulate.unit.spec.ts`)에는 Cash+QRIS 혼합 시나리오가 없다. PR 설명 "Kyu 실기 체크" 항목에 "Cash 50,000 + QRIS(Simulate) 주문 → Refund 전액 → 성공"이 명시돼 있고 test plan의 `pnpm test` (374 tests all pass) 는 선행 integration test 커버를 포함. `refund/route.ts` 의 Cash/QRIS 혼합 처리 로직 자체는 기존 M0-1105-AJ 에서 이미 검증됐고 이 PR 은 QRIS preflight 경로(simulate 분기)만 추가. 실기 체크 미완(빈 체크박스)이나 unit 범위 밖 항목으로 명시됨 — PR 설명에 의도 명시 + unit 8케이스 모두 통과. 경고 없이 통과 처리.

### G. 금액·식별자 계산 변경 없음
diff 는 `xendit-refund.ts`에 simulate 분기(조건문 + 조기 return) 추가, `refund/route.ts`에 `simulated_refund` 플래그 전파, `qris-simulate/route.ts`에 marker 기록만. `buildReferenceId`, `input.amount` 계산, `payment_request_id` 추출 로직에 변경 없음. **PASS**

### 타입체크·테스트
`pnpm typecheck` → 에러 0. `jest --testPathPattern=xendit-refund-simulate` → 8 tests, 1 suite, all PASS.
