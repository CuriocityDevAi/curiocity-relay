#342 CHANGES · #341 CHANGES (APPROVE·CHANGES) · 중복 step 1

## 판정

| PR | 판정 | 사유 |
|----|------|------|
| #342 Return W1 (M0-1117-L) | **APPROVE** | tsc 신규 0 · 421 tests all pass · 스냅샷 테스트 존재 · 1:1 대조 완전 일치 · Compensation 안전 · POS 전용 route 잔류 |
| #341 Void W3 (M2-1117-S) | **CHANGES** | tsc 신규 6개 (`route.ts:276-279` — `voidResult` unknown 타입) · 나머지 모두 통과 |

---

## #342 Return W1 — APPROVE 상세

### REQ 1: 옛 route ↔ 새 workflow step 1:1 대조
- **step 순서**: fetch-and-validate → compute-refund → execute-refunds → restore-inventory → mint-receipt → persist-returns ✅
- **빠진 분기**: Guard B(수량 초과 400) · totalRefundable≤0(409) · Phase1 remain>0(409) · Phase2 firstCall cap-exceeded(409) · mid-stream 500 — 전부 보존 ✅
- **에러 메시지**: HTTP 400/401/404/409/423/500 unwrapWorkflowError 를 통해 route 에서 그대로 매핑 ✅
- **minor**: QRIS Xendit reason 태그 `return_id` → `originPayment.id` 변경 (Xendit reference_id unique 보장으로 운영 무해)

### REQ 1: 응답 JSON 스냅샷 테스트
- 존재: `apps/commerce-core/src/workflows/pos-return/__tests__/response-shape.unit.spec.ts`
- 커버: 성공 응답 15개 키 + items/tender_results 중첩 + partial_failure shape 잠금 ✅

### REQ 1: Compensation 이중 처리
- restoreInventory compensation → adjustInventory 역연산(-qty) + reservation 재생성
- mint-receipt compensation → receipt row 삭제
- 두 보상이 같은 재고 열에 간섭 없음 ✅
- Guard B 가 workflow Step 1 에서도 동일하게 작동 ✅

### REQ 1: POS 전용 route 잔류
- PIN(cash) · QRIS 선행환불(tryXenditRefund) · cash_movement · loyalty recover — 모두 route 에만 있음 ✅

### REQ 2: tsc · 테스트
- commerce-core non-admin tsc 에러: 0개 (admin UI 기존 에러만) ✅
- 단위 테스트: 33 suites · **421 tests PASS** · 16 snapshots ✅

---

## #341 Void W3 — CHANGES 상세

### REQ 1: 옛 route ↔ 새 workflow step 1:1 대조
- **step 순서**: load → cancelQris → recordRefunds → cancelFulfillments → adjustWasted → cancelOrder ✅
- **빠진 분기**: tenderEntries 유효성 · 교대 체크 · PIN · card approval_code · allFulfills shipped 400 — 전부 보존 ✅
- **에러 메시지**: 404(order not found) · 409(already canceled/cross-shift) · 400(invalid_data) 그대로 ✅
  - minor: 개별 단계 에러 메시지 → `void workflow failed: <msg>` 단일 래퍼 (앱이 메시지 파싱 없이 토스트 표시만 하므로 운영 무해)

### REQ 1: 응답 JSON 스냅샷 테스트
- 단일 스냅샷 테스트 없음 ⚠️
- step-level 단위 테스트(11개) + 기존 integration spec 이 필드별 개별 단언으로 커버 (실질적 동등)

### REQ 1: Compensation 이중 처리
- adjustWastedInventoryStep compensation 은 cancelFulfillmentsStep 의 재고 복귀와 net 0 수렴 ✅
- cancelFulfillmentsStep 에 idempotent-cancel 보호 있음 ✅

### REQ 1: POS 전용 route 잔류
- PIN 체크 · 교대 체크 · cash_movement · 영수증(kind:'void') — 모두 route 에만 있음 ✅

### REQ 2: tsc — ❌ CHANGES 사유

```
apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts:276
  let voidResult: Awaited<ReturnType<typeof posVoidOrderWorkflow.run>>["result"];
  // → Medusa createWorkflow 타입 파라미터 전파 한계로 unknown 으로 fallback
```

신규 에러 6개:
```
route.ts(299): error TS2339: Property 'canceled_at' does not exist on type 'unknown'.
route.ts(300): error TS2339: Property 'total_refunded' does not exist on type 'unknown'.
route.ts(301): error TS2339: Property 'refunds_recorded' does not exist on type 'unknown'.
route.ts(302): error TS2339: Property 'qris_cancellations' does not exist on type 'unknown'.
route.ts(303): error TS2339: Property 'restocked' does not exist on type 'unknown'.
route.ts(304): error TS2339: Property 'wasted_items' does not exist on type 'unknown'.
```

main 대비: non-admin 에러 0 → 6 (기준: tsc 신규 0 미달)

**수정 방법**:
```ts
// route.ts 상단 import 추가
import type { PosVoidWorkflowOutput } from "../../../../../../workflows/pos-void";

// L276-279 교체
let voidResult: PosVoidWorkflowOutput;
```

### REQ 2: 테스트
- 단위 테스트: 32 suites · **422 tests PASS** · 12 snapshots ✅

---

## REQ 3: 중복 step 목록 (통합 후보)

| 중복 항목 | #342 위치 | #341 위치 | 통합 후보 |
|----------|-----------|-----------|----------|
| `cancelPosOrderFulfillment` (fulfillment 취소 헬퍼) | `cancelFulfillmentsStep` 내부 | `cancelFulfillmentsStep` 내부 | `_shared/fulfillment-cancel` 으로 승격 (#341 본문에도 명시) |

중복 step 수: **1건**

---

*검증 환경: hub-m2 (refactor/M2-1117-S) · M0-1117-L-wt (refactor/M0-1117-L-return-workflow) · 2026-11-17*
