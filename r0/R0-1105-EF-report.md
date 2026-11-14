APPROVE — 추출 함수 동작 동일 · 픽스처 400 정정 확인 · 단위 테스트 직접 호출 완비

## R0-1105-EF 리뷰 결과 (agilo-medusa-pos-fork#138)

### REQ 1 — `buildRetryBody` / `qrisErrorMessage` / `extractRetryError` 추출 동작 동일 여부

**결론: ✅ 동작 동일**

`lib/refund-retry-body.ts` 세 함수와 `RefundRetrySheet.tsx` 사용 지점 대조.

**`buildRetryBody`**  
- `return_id` 필수, `mode` conditional spread (`input.mode ? ...`), `manager_pin` ← `needsPin`, `terminal_approval_code` ← `needsCard`, `register_session_id` ← `registerSessionId`(truthy-check → null 제외) 모두 조건 동일.  
- `onSubmit(mode?)` 에서 `buildRetryBody({ returnId, mode, needsPin, pinValue, needsCard, approvalCode, registerSessionId })` 그대로 호출.

**`qrisErrorMessage`**  
- `xendit_refund_still_pending` → "QRIS refund is still being processed — please wait a moment"  
- `cash_fallback_blocked_by_succeeded_xendit` → "QRIS refund succeeded — do not give cash"  
- `cash_fallback_no_failed_qris` → "No failed QRIS refund to override"  
- 미등록 타입 → "" (빈 문자열) — RefundRetrySheet catch 블록의 `if (qrisMsg)` 가드와 정합.

**`extractRetryError`**  
- `body.type` → `errorType`, `body.remaining_attempts` → `remaining`, `body.locked_until` → `retryAt`, `body.message`/top-level `message` → `message` — catch 블록 분기 순서(errorType → retryAt → remaining → message) 완전 보존.

### REQ 2 — 픽스처 HTTP 상태 storeport #251 계약표 전수 대사

| 에러 코드 | 픽스처 status | #251 계약 | 판정 |
|---|---|---|---|
| `xendit_refund_still_pending` | 409 | 409 | ✅ |
| `cash_fallback_blocked_by_succeeded_xendit` | 409 | 409 | ✅ |
| `cash_fallback_no_failed_qris` | **400** | **400** | ✅ 정정 완료 |
| `cash_fallback_requires_pin` | 401 | 400 | ⚠️ 아래 주석 참조 |

**`cash_fallback_requires_pin` 주석 (블로킹 아님)**  
픽스처 항목 body가 `{ok: false, reason: 'mismatch', remaining_attempts: 2}` — #251 400 오류코드 body가 아니라 PIN mismatch(401) 응답 형식. 이름과 실제 body가 다른 케이스. R0-EE 에서 "PIN mismatch · R0-EE 호환 확인"으로 명시적 수용, 앱 UI는 `needsPin=true` 일 때 PIN 입력 완료 전 submit 비활성화이므로 HTTP 400 `cash_fallback_requires_pin` 경로는 정상 플로우에서 도달 불가. 테스트 파일에도 이 항목의 status 단정(`toBe(400)`)이 없으므로 테스트 오탐 없음. 차기 클린업 시 픽스처 key명 변경(`pin_mismatch`) 권장.

### REQ 3 — 테스트가 추출 함수를 직접 호출해 단정

**결론: ✅ 직접 호출 완비**

- `describe '(3) refund-retry mode=retry'`: `buildRetryBody({returnId, mode:'retry', needsPin:true, ...})` 직접 호출 → `return_id`, `mode`, `manager_pin`, `terminal_approval_code undefined` 단정.
- `describe '(4) cash_fallback body'`: `buildRetryBody({mode:'cash_fallback', registerSessionId:'sess_01'})` → `register_session_id`, `mode` 단정; `registerSessionId: null` → `register_session_id undefined` 단정.
- `describe '(5) 에러 코드별 메시지'`: `qrisErrorMessage('xendit_refund_still_pending')` / `qrisErrorMessage('cash_fallback_blocked_by_succeeded_xendit')` / `qrisErrorMessage('cash_fallback_no_failed_qris')` / `qrisErrorMessage('unknown_error_type')` 각각 반환값 직접 단정.  
  `extractRetryError({body:{type:...}})` → `errorType`, `extractRetryError({body:{remaining_attempts:2}})` → `remaining`, `extractRetryError({body:{locked_until:'...'}})` → `retryAt` 직접 단정.
- 소스 체크(`toContain`)는 연결 확인 보조 — 순수 함수 단정이 주 커버리지.

### CI 결과

| job | 결과 |
|---|---|
| Lint | ✅ success |
| CI | ✅ success |
