# M3-1105-CD 완료 — 픽스처 HTTP 400 정정 + body 조립/에러 매핑 순수 함수 추출 · PR #138

## 결과 한 줄
`cash_fallback_no_failed_qris` 픽스처 422→400 정정 · `buildRetryBody`/`qrisErrorMessage`/`extractRetryError` lib 추출 · 테스트 35개 직접 함수 호출 강화 · PR #138 Draft

## CI job 별 결과
로컬 vitest: Tests **35 passed** (m3-1105-ca) · **284 passed** total (24 files) · CI 미완료 (Draft PR · 착지 후 대기)

---

## REQ1 — 픽스처 HTTP 상태 전수 대사

| 에러 코드 | 픽스처 (before) | #251 계약 | 픽스처 (after) | 조치 |
|-----------|-----------------|-----------|----------------|------|
| `xendit_refund_still_pending` | 409 | 409 | 409 | ✅ 일치 |
| `cash_fallback_blocked_by_succeeded_xendit` | 409 | 409 | 409 | ✅ 일치 |
| `cash_fallback_no_failed_qris` | **422** | **400** | **400** | ✅ 정정 |
| `cash_fallback_requires_pin` | 401 | 401 | 401 | ✅ 일치 (PIN mismatch body · R0-EE 호환 확인) |

---

## REQ2 — 순수 함수 추출 + 테스트 강화

### 신규 `lib/refund-retry-body.ts`
- `buildRetryBody(input: RetryBodyInput): RetryBody` — retry/cash_fallback body 조립
- `qrisErrorMessage(type: string): string` — 에러 코드 → 안내 문구 매핑
- `extractRetryError(e: unknown): ParsedRetryError` — 에러 파싱

### `components/orders/RefundRetrySheet.tsx`
- `@/lib/refund-retry-body` 에서 import
- inline `qrisErrorMessage` / `extractRetryError` / `ParsedRetryError` 제거
- `onSubmit` body → `buildRetryBody({ returnId, mode, needsPin, pinValue, needsCard, approvalCode, registerSessionId })` 호출
- 동작 동일 (순수 함수 추출만)

### `tests/flows/m3-1105-ca.test.ts`
- import `buildRetryBody`, `qrisErrorMessage`, `extractRetryError` from lib
- (3) retry body: `buildRetryBody mode=retry` 직접 호출 · `manager_pin` / `terminal_approval_code` 단정
- (4) cash_fallback body: `buildRetryBody mode=cash_fallback` 직접 호출 · `register_session_id` 조건부 / `needsPin=false` 케이스 추가
- (5) 에러 메시지: 소스 string 체크 → `qrisErrorMessage` 직접 호출 · `extractRetryError` body.type / remaining_attempts / locked_until 케이스 3종 추가
- 픽스처 400 정정 확인 단정 (`expect(qrisErrors.cash_fallback_no_failed_qris.status).toBe(400)`)

---

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/138
