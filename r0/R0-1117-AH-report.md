#343 APPROVE · 문제 1건

Reviewer: R0-1117-AH · 2026-11-17  
Branch: `refactor/M2-1117-U-refund-workflow` → `main` (base `c8df655`)  
Scope: 758줄 → 441줄 · `posRefundWorkflow` 6-step 추출 · 동작 불변 검증

---

## REQ 1 · 옛 라우트 ↔ 새 step 1:1 대조표

| 옛 라우트 블록 | 새 위치 | 동작 동일? |
|---|---|---|
| 0) QRIS preflight (Xendit /v3/refunds, all-or-nothing) | route (그대로 잔류) | ✅ 동일 — Map→Record 변경만, `payment.id`→`payment_id` 동일 key |
| 1) `refundPaymentWorkflow` × matched 순차 | `executeRefundsStep` (Step 2) | ✅ 동일 — 동일 에러 regex, 동일 `created_by`/`note`/`amount` |
| 1b) `cancelIfUnshipped` (order cancel + reservation 소거) | `cancelIfUnshippedStep` (Step 3) | ✅ 코드 1:1 이식 — idempotent cancel · non-fatal warn 동일 |
| 2) Cash Movement (register_session) | route (POS 전용, 그대로 잔류) | ✅ 동일 |
| 3) 영수증 스냅샷 (kind: refund\|partial_refund) | `mintRefundReceiptStep` (Step 4) | ✅ 동일 — tender 금액 계산 경로 `m.amount` 사용 (old 대비 mixed tender amount=0 버그 수정도 포함), `resolveRefundReceiptKind` 동일 |
| 4) `order.metadata.refund` persist | `persistRefundMetadataStep` (Step 5) | ⚠️ 1건 차이 (아래 상세) |
| 5) `recoverForOrder` (loyalty) | `recoverLoyaltyStep` (Step 6) | ✅ 동일 — 호출 위치/인자 동일 (`order_id, refund_amount, refund_ref`) |

**빠진 분기: 없음**

**에러 코드·메시지 동일 여부:**
- `type:"invalid_data"` 400 — ✅ 보존
- `type:"conflict"` 409 (double refund) — ✅ 보존 (`RefundAlreadyRefundedError` regex 동일)
- `type:"not_found"` 404 — ✅ 보존
- `type:"qris_refund_rejected"` 400 — ✅ 보존 (route에 그대로)
- PIN mismatch 401, PIN locked 423 — ✅ 보존 (route POS-only)
- `RefundWorkflowError` 메시지 prefix `refundPaymentWorkflow failed: ${msg}` — ✅ 동일

**⚠️ 발견된 차이 (Step 5):**  
`order.metadata.refund.cash_movement_id` = 구 코드에서는 실제 ID(또는 null) 저장.  
신 코드에서는 `persistRefundMetadataStep`이 workflow 내부에서 실행되어 cash movement 생성 전이라 항상 `null` 저장. 주석 명시: `// POS route handles cash_movement separately`.  
**영향 범위**: HTTP 응답에는 여전히 올바른 `cash_movement_id` 반환. 현재 codebase 전수 검색 결과 `metadata.refund.cash_movement_id`를 읽는 소비자 없음(`refund-retry/route.ts`는 자체 cash movement 생성, metadata에서 읽지 않음). 허용 가능한 known trade-off.

---

## REQ 2 · Compensation 분석

**QRIS 환불 성공 → 뒤 단계 실패 시:**

| 외부 호출 | 보상 가능? | 처리 |
|---|---|---|
| Xendit `/v3/refunds` (route preflight) | ❌ 비가역 외부 API | 되돌릴 수 없는 외부 호출 → 보상 대상 아님 (명시) |
| `refundPaymentWorkflow` (Step 2) | ❌ 비가역 금융 | "비가역 단계 (financial operation). 보상 없음." 주석 명시 |

→ **돈이 두 번 나가지 않음**: Xendit 1회(preflight), Medusa refund 1회(executeRefunds). 이중 호출 없음.

| 가역 작업 | 보상 처리 |
|---|---|
| `mintRefundReceiptStep` (Step 4) | ✅ compensation 함수 구현 → 생성된 receipt 삭제. Step 5 이후 실패 시 dangling receipt 없음 |
| `persistRefundMetadataStep` (Step 5) | non-fatal (error 삼킴) → 실패 시 메타데이터 미기록, 하지만 환불 금전 처리는 완료 |
| `recoverLoyaltyStep` (Step 6) | non-fatal (error 삼킴) → 동일 |

**결론**: QRIS 성공 후 뒤 단계 실패해도 돈 이중 출금 없음. 기록 소실 가능성은 non-fatal 처리로 구 코드와 동일 수준.

---

## REQ 3 · 응답 JSON 스냅샷 · 테스트 · tsc · POS 전용 잔류

### 응답 JSON 스냅샷 (2개 잠금)

**표준 환불 (non-QRIS):**
```
["cash_movement_id","method","ok","open_drawer","order_id","payment_id",
 "pin_required","receipt_id","receipt_no","refunded_amount","tenders"]
```

**QRIS 환불:**
```
["cash_movement_id","method","ok","open_drawer","order_id","payment_id",
 "pin_required","receipt_id","receipt_no","refunded_amount","tenders","xendit_refund"]
```

구 응답 shape와 동일. `xendit_refund` 필드는 M0-1116-AV(base)부터 존재.

### 전체 테스트

```
Test Suites: 35 passed, 35 total
Tests:       441 passed, 441 total  (신규 13 포함)
Snapshots:   18 passed, 18 total
```

e2e/integration-tests는 Jest 환경에서 실행 불가 (Playwright `test.describe` 충돌) — base와 동일한 pre-existing 조건.

### tsc 신규 오류

PR 변경 파일(`api/admin/pos/…/refund/route.ts`, `workflows/pos-refund/**`) 에서 **신규 오류 0**.  
기존 오류는 `src/admin/**` UI 파일들(TS2786 React bigint 타입 충돌) — base에서도 동일하게 존재, 이 PR과 무관.

### POS 전용 로직 route 잔류 여부

| 항목 | 위치 |
|---|---|
| 매니저 PIN 검증 (`verifyManagerPin`) | ✅ route 잔류 |
| Cash Movement (`createCashMovements`) | ✅ route 잔류 |
| 응답 조립 (`res.json(...)`) | ✅ route 잔류 |

---

## REQ 4 · 공용 step(`_shared`) 재사용 적절성

현재 `workflows/` 하위에 `_shared` 디렉토리 미존재. `pos-refund`, `pos-return`, `pos-void` 3개 워크플로우가 병렬 구조.

**`toNum`/`providerToMethod`**: `pos-refund/utils.ts`에 복사 존재, 주석에 `// (정본 소스: pos-return/utils.ts)` 명시. 향후 `_shared/utils.ts` 통합 위치로 적합하나 현재 scope 밖.

채널 중립 설계(PIN·cash_movement 분리)는 R0-1117-AC §4 W2 아키텍처 목표에 부합. Wing/CareAgent 재사용 경로 준비됨.

---

## 종합

**APPROVE**. 동작 불변 검증 통과:

- QRIS 선행 환불 all-or-nothing 구조 유지
- executeRefunds → cancelIfUnshipped → mintReceipt → persistMetadata → recoverLoyalty 순서 및 에러 처리 동일
- `recoverForOrder` 호출 위치(Step 6): receipt_id 생성 후 → old 코드와 동일 순서
- 441 tests pass, 0 new tsc errors
- 응답 JSON shape locked (snapshot 2개)
- POS 전용 PIN·cash_movement route 잔류

발견 1건: `metadata.refund.cash_movement_id` 항상 null — HTTP 응답 무관, 현재 소비자 없음, 허용.
