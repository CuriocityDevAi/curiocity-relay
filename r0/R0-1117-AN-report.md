#350 APPROVE · #347 CHANGES · 문제 2건

---

## #350 · refactor(pos-fulfill): M2-1117-Z — W4b 출고 나머지 (영수증 mint · handed_over_at step)

**결정: APPROVE**

### 1. Route ↔ Workflow step 1:1 대사표

| Route 단계             | Workflow step                    |
|------------------------|----------------------------------|
| 요청 파싱 · 가드        | (route 전용 — workflow 외부)      |
| workflow 호출           | ①`fetchOrderStep`                |
|                        | ②`executeFulfillmentStep`        |
|                        | ③`updateMetadataStep`            |
|                        | ④`completeOrderStep`             |
|                        | ⑤`recordHandoverAtStep` (**신규**) |
|                        | ⑥`mintSaleReceiptStep` (**신규**) |
| 응답 조립               | (route 전용)                     |

route.ts 주석도 "handed_over_at 기록 · 영수증 발행 는 workflow 내부"로 갱신 ✓

### 2. handed_over_at / receipt_no 시점·값

- **이전**: `updateMetadataStep`(Step 3)에서 `hand_over + fulfilled` 조건 시 `new Date().toISOString()` 쓰기 (덮어쓰기 보호 없음)
- **이후**: `recordHandoverAtStep`(Step 5)에서 동일 조건 · **no-overwrite 보호** 추가 (`handed_over_at` 이미 있으면 기존 값 반환 · DB 쓰기 없음)
- 타이밍이 Step 3 → Step 5 로 이동하지만 의미는 동일 (hand_over + fulfilled 성공 직후)
- `mintSaleReceiptStep`은 `metadata.tenders` 집계 사용, `kind: 'sale'`으로 발행 ✓

### 3. 보상(compensation)

| Step                    | compensation                                       |
|-------------------------|----------------------------------------------------|
| `recordHandoverAtStep`  | `prevMetadata` 스냅샷으로 `updateOrders` 복원 (best-effort) |
| `mintSaleReceiptStep`   | `deleteReceipts([receiptId])` (best-effort)        |

두 step 모두 `StepResponse<out, comp>` 타입 파라미터 명시 ✓

### 4. 테스트 로그

PR 명세: `pnpm test — 483 passed, 41 suites (신규 fail 0)` · `pnpm typecheck — 에러 0`  
신설 단위 테스트 6건: `recordHandoverAtHandler` 3 + `mintSaleReceiptHandler` 3 (eligible=false no-op · 성공 · 비치명 실패) ✓

---

## #347 · feat(loyalty): M0-1117-O — S5 Void NET 미리보기·확인 2단계 + recover 빈틈 메움

**결정: CHANGES**

### 문제 1 — M2-1117-W 커밋 중복 (#345 충돌)

브랜치 `feat/M0-1117-O-void-net` 에는 커밋이 2개 있다:

```
4aa3bde feat(loyalty): M2-1117-W — S4 NET 환불 미리보기·확인 2단계 (posRefundWorkflow)
d57eee7 feat(loyalty): M0-1117-O — S5 void NET 미리보기·확인 2단계 + recover 빈틈 메움
```

`4aa3bde`(M2-1117-W) 는 이미 **#345 로 merged** 된 작업과 동일하다.  
현재 main 의 파일과 충돌하는 범위:

| 파일 | 충돌 양상 |
|------|-----------|
| `src/lib/loyalty/preview-recover.ts` | main(#345)에 이미 존재 · **#347 버전이 덮어씌움** (아래 문제 2 참조) |
| `src/lib/loyalty/__tests__/preview-recover.unit.spec.ts` | 같은 경로 · 중복 생성 |
| `src/api/admin/pos/orders/[id]/refund/route.ts` | main(#345)의 `preview_ref`/`validatePreviewRef` 적용분과 충돌 |
| `src/workflows/pos-refund/steps/recover-loyalty.ts` | `original_refund_amount` 추가분 중복 |
| `src/workflows/pos-refund/types.ts` | 같은 필드 중복 |
| `src/workflows/pos-refund/workflow.ts` | 같은 패스스루 중복 |

**요청**: `4aa3bde` 커밋을 drop 한 뒤 `d57eee7`(M0-1117-O) 만 main 위로 rebase.

### 문제 2 — void confirmed 경로: `validatePreviewRef` / `preview_stale` 409 미구현

main(#345) 의 refund route confirmed 경로:
```
refund/route.ts:338-354
  validatePreviewRef(previewResult, body.preview_ref, body.expected_net_refund_amount)
  → 누락 시 400 "confirmed=true requires preview_ref and expected_net_refund_amount"
  → 불일치 시 409 { code: "preview_stale", new_preview: ... }
```

#347 의 void route confirmed 경로에는 이 검증이 없다:
- `body.preview_ref` / `body.expected_net_refund_amount` 미수신
- `validatePreviewRef` 미호출 → 계산원이 확인한 금액이 바뀌어도 그대로 진행 가능
- #347 의 `preview-recover.ts` 에는 `preview_ref` 필드 자체가 없음 (main 버전과 다름)

Rebase 후 `void/route.ts` confirmed 경로에 아래를 추가해야 한다:
- `body.preview_ref?: string` / `body.expected_net_refund_amount?: number` 수신
- `validatePreviewRef` import (main의 `lib/loyalty/preview-recover.ts` 에 이미 있음)
- 누락 → 400 / 불일치 → 409 `preview_stale` (refund route 패턴 그대로)

### 통과 항목 (d57eee7 M0-1117-O 부분 한정)

- §1.6 recover 빈틈 메움: `recoverLoyaltyVoidStep` workflow 끝에 추가 ✓
- 하위 호환: `preview`/`confirmed` 없으면 기존 동작 그대로 ✓
- 멱등: `refund_ref = void:${order_id}` 고정 ✓
- `doRecoverLoyaltyVoid` 비치명 (non-fatal) ✓
- `doRecordPaymentRefunds` payment_adjustments 클램핑 ✓
- `pos-void-net.unit.spec.ts` 신설 — 시나리오 8 포함 ✓
- PR 명세: `488/488 pass · tsc clean` ✓

---

## 요약

| PR  | 결정    | 주요 근거 |
|-----|---------|-----------|
| #350 | **APPROVE** | 동작 불변 · 보상 구현 · tsc/test 통과 |
| #347 | **CHANGES** | ① 4aa3bde(M2-1117-W) 커밋 #345 충돌 → rebase 필요 ② void confirmed 경로 validatePreviewRef / preview_stale 미구현 |
