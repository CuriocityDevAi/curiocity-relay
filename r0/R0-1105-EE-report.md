# PR 134 리뷰 보고서 — M3-1105-CA (split QRIS + 환불 실패 버튼 2개)

판정: APPROVE

---

## REQ 1 — API 계약 대사표

### POST /admin/pos/orders/:id/refund-retry body 필드

| 항목 | 앱 코드(파일:줄) | #251 계약 | 일치 |
|------|-----------------|-----------|------|
| `return_id` | `components/orders/RefundRetrySheet.tsx:106` | 필수 | ✅ |
| `mode` (optional spread) | `RefundRetrySheet.tsx:107` `...(mode ? { mode } : {})` | `"retry" \| "cash_fallback"` optional | ✅ |
| `manager_pin` | `RefundRetrySheet.tsx:108` `...(needsPin ? { manager_pin: pinValue } : {})` | CASH/QRIS 있으면 필수 | ✅ |
| `terminal_approval_code` | `RefundRetrySheet.tsx:109` | CARD 있으면 필수 | ✅ |
| `register_session_id` | `RefundRetrySheet.tsx:110` | cash_fallback 에서 필수 | ✅ (조건부 spread) |

### type 정의 (api/hooks/pos-refunds.ts)

| 항목 | 파일:줄 | #251 계약 | 일치 |
|------|---------|-----------|------|
| `mode?: 'retry' \| 'cash_fallback'` | `pos-refunds.ts:221` | 동일 | ✅ |
| `tender_results[].status` += `'succeeded_via_cash'` | `pos-refunds.ts:245` | 동일 | ✅ |
| `succeeded_via_cash?: boolean` | `pos-refunds.ts:254` | 동일 | ✅ |

### 응답/에러 코드 이름

| 항목 | 앱 코드(파일:줄) | #251 계약 HTTP | 픽스처 HTTP | 일치 |
|------|-----------------|----------------|-------------|------|
| `xendit_refund_still_pending` | `RefundRetrySheet.tsx:57` | 409 | 409 | ✅ |
| `cash_fallback_blocked_by_succeeded_xendit` | `RefundRetrySheet.tsx:58` | 409 | 409 | ✅ |
| `cash_fallback_requires_pin` | `RefundRetrySheet.tsx:59` (언급), `extractRetryError` 로 PIN 오류 처리 | 400 | 401 body | ✅ (PIN 오류 경로로 fallthrough · 계약과 충분히 호환) |
| `cash_fallback_no_failed_qris` | `RefundRetrySheet.tsx:59` | **400** | **422** (`fixtures/m3-1105-ca.refund-retry-qris-errors.json`) | ⚠️ 픽스처 HTTP 상태 불일치 |

**주의**: `cash_fallback_no_failed_qris` 픽스처가 `422`로 되어 있으나 #251 계약은 `400`. 앱 쪽 에러 처리는 HTTP 상태보다 `body.type`을 보므로 **런타임 동작은 정상**이지만, 픽스처 문서 오류로 혼란 소지 있음. 차기 PR에서 수정 권장.

---

## REQ 2 — Split QRIS 흐름

### 2차 금액 = remaining (1차 차감 후 나머지)

- `app/checkout/split-tender/[draftOrderId].tsx:132` — `const remaining = firstResponse?.remaining ?? 0;`
- 2차 QRIS 에 `remaining` 사용: `onProcessSecondQris`:324 — `buildSplitBody(draftOrderId, PROVIDER_QRIS_XENDIT, remaining, {}, commonExtras)`
- **서버 authoritative 값 사용**: 로컬 계산(`grandTotal - firstAmount`)이 아닌 서버 응답 `firstResponse.remaining` 사용 ✅

### 1차 QRIS 대기 중 다음 결제 비활성

- `firstQrisPending` 플래그: `split-tender:116–117` 에서 state 선언
- 1차 완료 POST 후 `setFirstQrisPending(true)` → step 가 `'second'` 로 넘어가지 않음
- step 전환은 오직 `useFocusEffect` + `consumeSplitQrisFirstDone()` 로만 발생: `split-tender:143–151`
- `firstQrisPending=true` 일 때 FirstStep 에서 "QRIS payment is pending" 배너 + Return/Cancel 버튼만 표시(`split-tender:547–578`) ✅

### 409 `qris_pending_cannot_split_next` 수신 시 안내

- `split-tender:167–176`:
  ```
  if (body.type === 'qris_pending_cannot_split_next') {
    showToast.error('1st QRIS payment pending', { text2: '...' });
  }
  ```
  토스트 안내 ✅

### 만료/실패 후 재선택

- `onCancelFirstQris`:276–280 — `setFirstQrisPending(false)` + `setFirstQrisRouteParams(null)` + `setFirstResponse(null)` 로 상태 초기화 → QRIS 패널 다시 표시 ✅

### 양쪽 QRIS 모두 처리

- 1차: `onProcessFirstQris` → `isSplitFirst='1'` 파라미터 → tender-qris 화면 → `signalSplitQrisFirstDone()` + `router.back()` → split-tender `useFocusEffect` → step=second 전환 ✅
- 2차: `onProcessSecondQris` → tender-qris 화면(isSplitFirst 없음) → `navigateToSuccess` ✅

### 금액 반올림(IDR 정수) 오류 가능성

- 1차 금액: `onFirstAmountChange` — `parseInt(digits, 10)` 사용, 항상 정수 ✅
- 2차 금액: 서버 응답 `firstResponse.remaining` 사용 (서버가 정수 보장)
- `formatMoney`:`38–41` — `Math.round(amount).toLocaleString(...)` 으로 표시 보정도 있음
- **반올림 오류 없음** ✅

---

## REQ 3 — Give cash instead 흐름

### PIN 입력

- `hasQrisFailed = failedMethods.some((m) => m === 'qris')` → `needsPin = failedMethods.some((m) => m === 'cash' || m === 'qris')` 로 QRIS 실패 시 PIN 필수 적용: `RefundRetrySheet.tsx:63,79,81`
- PIN UI: `DigitsInput displayBoxes 4자리`: `RefundRetrySheet.tsx:195–207` ✅

### 성공 후 서랍/금액 안내

- `RefundRetrySheet.tsx:119–134`:
  ```
  res.succeeded_via_cash → showToast.success('Refunded in cash (QRIS failed)', {
    text2: res.open_drawer ? 'Open the cash drawer and give IDR ...' : undefined
  })
  ```
  서랍 열림 여부에 따라 `text2` 조건부 표시 ✅

### `cash_fallback_blocked_by_succeeded_xendit` 수신 시 안내

- `qrisErrorMessage` 함수: `RefundRetrySheet.tsx:56–61`
  - `'cash_fallback_blocked_by_succeeded_xendit'` → `'QRIS refund succeeded — do not give cash'`
- 이 메시지는 `setPinError(qrisMsg)` 로 PIN 에러 영역에 표시됨 (`RefundRetrySheet.tsx:146–151`)
- 현금을 주지 말라는 안내로 명확 ✅

### 버튼 중복 탭 방지

- 두 버튼 모두 `isPending={retry.isPending}` + `disabled={submitDisabled}` 적용:
  - Retry QRIS refund: `RefundRetrySheet.tsx:238–239`
  - Give cash instead: `RefundRetrySheet.tsx:247–248`
- `submitDisabled = retry.isPending || pinLockActive || (needsPin && !isValidManagerPin(pinValue)) || ...`: `RefundRetrySheet.tsx:93–97`
- mutate 중엔 두 버튼 모두 disabled ✅

---

## REQ 4 — CI / 테스트

### CI job 이름별 결과

| Job | 결과 | 시간 |
|-----|------|------|
| `assertions` | ✅ pass | 1m 59s |
| `flow-tests` | ✅ pass | 48s |
| `playwright` | ✅ pass | 15m 5s |

### `tests/flows/m3-1105-ca.test.ts` 단정 강도 평가

| 케이스 | 테스트 방식 | 강도 |
|--------|------------|------|
| (1) split QRIS body — `buildSplitBody` 함수 직접 호출 | 실제 함수 실행 | ✅ 강 |
| (2) 409 에러 타입 — fixture `body.type` 확인 | fixture 검증 | ✅ 충분 |
| (3) retry body 조합 | **인라인 객체 조립 (컴포넌트 코드 미호출)** | ⚠️ 약함 (코드와 직접 연결 안 됨) |
| (4) cash_fallback body 조합 | 위와 동일 | ⚠️ 약함 |
| (5) 에러 코드별 UI 메시지 | `readFileSync` 소스 string 포함 확인 | ✅ 충분 (회귀 방지용) |
| (6) `succeeded_via_cash` 표기 | `readFileSync` 소스 string 포함 확인 | ✅ 충분 |
| (7) split-tender testID 존재 | `readFileSync` 소스 포함 확인 | ✅ 충분 |
| (8) tender-qris isSplitFirst 처리 | `readFileSync` 소스 포함 확인 | ✅ 충분 |

**지적**: 케이스 (3)/(4) 의 body 조합 테스트는 `const body = { return_id: ..., mode: ..., manager_pin: ... }` 를 테스트 내부에서 직접 조립한 뒤 `expect(body.mode).toBe('retry')` 를 검증하는 형태로, 실제 `RefundRetrySheet.onSubmit()` 의 body 조립 코드가 아님. 소스 string 포함 확인(`expect(refundSheetSrc).toContain("'retry'")`)으로 보완되어 있어 회귀는 잡을 수 있지만, 실제 body 조립 로직 단정으로서는 약함. 차기 PR에서 `extractRetryError`/body 조립 유닛 테스트 강화 권장.

---

## 종합 의견

**APPROVE**

핵심 계약 항목(mode/manager_pin/return_id body · 409/400 에러 코드 처리 · split QRIS 2단계 흐름 · give-cash 중복 탭 방지)이 모두 #251 계약과 일치하고, CI 3 job 전부 통과. 두 가지 경미한 이슈가 있으나 런타임 동작에 영향 없음:

1. **픽스처 HTTP 상태 불일치**: `m3-1105-ca.refund-retry-qris-errors.json` 의 `cash_fallback_no_failed_qris` 가 `422` 로 되어 있으나 #251 계약은 `400`. 앱이 `body.type` 기반으로 처리하므로 동작은 정상이나 문서 오류.
2. **테스트 (3)/(4) 단정 약함**: retry/cash_fallback body 조합 테스트가 컴포넌트 실제 코드를 호출하지 않고 인라인 조립 검증. 소스 string 포함 테스트로 부분 보완됨.

Kyu 실기 7종 체크리스트는 아직 미완료(DRAFT 상태)이나 코드 품질 기준에서 APPROVE 가능.
