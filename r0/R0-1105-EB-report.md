# R0-1105-EB · storeport #251 리뷰 결과

**CHANGES** — 수정 항목: [1]

---

## 판정 근거

### REQ 1 · 이중 환불 가드 ✅

**Guard 1 (cash_fallback 진입 직전 신선 재로드)**
- `route.ts:260-280` — `cash_fallback` 분기 내에서 `query.graph({entity:"order",...})` 로 최신 metadata를 별도 재조회 후 `freshRet1?.xendit?.status === "SUCCEEDED"` 면 409 `cash_fallback_blocked_by_succeeded_xendit` 반환. 초기 load (`currentMd`)와 분리된 fresh 재조회. ✅

**`withOrderLock` 직렬화 키 동일성**
- `return/route.ts:25-39` — `orderReturnQueue: Map<string, Promise<unknown>>` 가 모듈 레벨에 export.
- `refund-retry/route.ts:7` — `import { withOrderLock } from "../return/route"` → 같은 Map 인스턴스 공유.
- `webhook/route.ts:27` — 동일하게 `import { withOrderLock } from "...return/route"` → 같은 인스턴스.
- 세 경로 모두 `withOrderLock(order_id, fn)` 로 동일 키 사용 → 주문 단위 직렬화 보장. ✅

**Guard 2 (늦은 SUCCEEDED 웹훅)**
- `webhook/route.ts:782-809` — `hasCashSubstituted` (tender_results 내 `succeeded_via_cash` 존재) + `refund_succeeded` 시 `x.status = "SUCCEEDED"` 로 관찰 기록만 하고 `r.status` 는 건드리지 않음. `dup_refund_alerts[]` 에 push. ✅
- 멱등성: `x.status === newStatus` 선행 체크 (line 773-775) 에서 이미 SUCCEEDED 면 `alreadyCount += 1; continue` — Guard 2 블록에 재진입하지 않아 중복 alert 없음. ✅
- 자동 교정 금지: `r.status` 할당 코드 없음. ✅

---

### REQ 2 · mode=retry ✅

**새 reference_id (재사용 금지)**
- `route.ts:492`: `nonce = "retry${attempt}"` (attempt=priorAttempts+1) → `buildReferenceId(`${order_id}:refund`, tender_seq, nonce)`.
- 테스트 `#BT-a`: `lastRef.match(/retry1/)` 단정 통과. ✅

**PENDING 중 409**
- `route.ts:424-437`: `priorX.status === "PENDING"` && 실패 QRIS 있으면 409 `xendit_refund_still_pending`. ✅
- 테스트 `#BT-d` 통과. ✅

**즉시 FAILED 처리**
- `route.ts:504-517`: `refundRes.ok === false` → `tender_results[].status = "failed"`, `skipped[]` 추가. 계속 다음 수단으로 진행 (break 없음). ✅

**CASH/CARD 기존 동작 유지**
- `route.ts:541-564`: CASH/CARD 는 `refundPaymentWorkflow(container).run(...)` 재호출. mode 분기 외부 코드 불변. ✅
- 회귀 `#BT-g` (CARD-only, mode 생략=retry) 통과, tenders.spec #74~#79 모두 통과. ✅

---

### REQ 3 · Cash Movement 금액·부호·reason ✅

**cash_fallback 경로**
- `route.ts:309-318`: `signed_delta: -fallback_amount`, `reason: "return:${order_id}:${return_id}:cash-fallback-qris..."`. ✅
- `register_session_id` 없으면 400 반환 (`route.ts:294-299`). ✅
- 테스트 `#BT-b`: `signed_delta === -30000`, `reason.includes("cash-fallback-qris")` 단정 통과. ✅

**retry 경로 (CASH 포션)**
- `route.ts:574-605`: `signed_delta: -cash_retried`, `reason: "return:...:retry..."`. session 없거나 closed 면 soft skip (console.warn). ✅

**PIN 검증**
- cash_fallback: PIN 없으면 400 `cash_fallback_requires_pin`, 불일치 401, 잠김 423. ✅
- retry (CASH/QRIS 있을 때): 동일 패턴. ✅

**receipt_kind**
- `persistAndRespond`: `resolveRefundReceiptKind(orderForKind, succeeded_total)` 호출. `succeeded_total` = `isTenderDone` (succeeded + succeeded_via_cash) 합계. 전액환불 시 `"refund"`, 부분 시 `"partial_refund"`. ✅
- `isTenderDone`이 `succeeded_via_cash`도 포함하므로 cash_fallback 완결 시 `"refund"` 가 올바르게 산출됨. ✅

---

### REQ 4 · 단일 QRIS 주문 ✅

- `#BT-a` (single QRIS, mode=retry → SUCCEEDED), `#BT-b` (single QRIS, mode=cash_fallback) 모두 통과. ✅

---

### REQ 5 · 테스트 실행 로그

```
PASS integration-tests/pos/refund-retry-qris.spec.ts (12.059 s)
  M0-1105-BT · /refund-retry mode 분기 · 이중 환불 가드
    ✓ #BT-a  QRIS FAILED → retry → SUCCEEDED                        938 ms
    ✓ #BT-b  QRIS FAILED → cash_fallback → Cash Movement −금액       935 ms
    ✓ #BT-c  cash_fallback 뒤 늦은 SUCCEEDED → r.status 불변 + alert  516 ms
    ✓ #BT-d  PENDING 중 retry → 409                                  468 ms
    ✓ #BT-e  PIN 누락 400 · 실패 QRIS 없음 400                        477 ms
    ✓ #BT-f  split CASH+QRIS, QRIS 몫만 재시도 · CASH 불변             584 ms
    ✓ #BT-g  mode 생략=retry, CARD-only 성공                          572 ms
Tests: 7 passed, 7 total

PASS integration-tests/pos/tenders.spec.ts (58.603 s)
Tests: 93 passed, 93 total
```

**BT-a..g 단정 강도 평가**
- BT-a: `xendit.status`, `xendit.attempt`, `reference_id` 내 `retry1`, `xendit_retry_count` 단정. ✅
- BT-b: `signed_delta`, `reason`, `open_drawer`, `cash_movement_id` 단정. ✅
- BT-c: `r.status === "completed"`, `tender_results[0].status === "succeeded_via_cash"`, `x.status === "SUCCEEDED"`, `alerts.length === 1`, `alerts[0].reason` 포함. ✅
- BT-d..g: 상태 코드 + code/mode/method 단정. ✅
- 전반적으로 금전 흐름(금액·부호·이유·상태) 단정이 충분함.

---

## 수정 항목

### [1] `refund-retry-qris.spec` 이 `test:integration:pos` 스크립트에 미포함

**파일**: `apps/commerce-core/package.json`

현재 `test:integration:pos` 스크립트 말미에 아래 패턴이 없음:

```
&& TEST_TYPE=integration:pos NODE_OPTIONS=--experimental-vm-modules jest --silent=false --runInBand --forceExit --testPathPattern='refund-retry-qris\\.spec'
```

PR이 추가한 BT-a..g 7개 케이스(이중 환불 가드 포함 **돈 흐름 테스트**)가 CI/`pnpm test:integration:pos` 에서 자동 실행되지 않아 향후 회귀를 감지할 수 없음.

---

*로컬 실행 환경: storeport-wts/M0-1105-BT-wt worktree · `pnpm test:integration:pos` refund-retry-qris.spec + tenders.spec 직접 실행*
