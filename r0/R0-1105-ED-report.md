# R0-1105-ED — storeport #248 / #251 재리뷰 리포트

**A: APPROVE · B: APPROVE**

---

## A — PR #248 (head b76eb0f) · REQ3 수정 확인

### A1 · paid 블록 — expired/failed 소생 금지 · 영수증 재발행 금지 · late_paid_alerts 멱등 ✅

**수정 접근 방식**: DZ REQ3 에서 제시한 `matchIdx` 조건 필터 대신, 더 완전한 two-layer 방어를 채택.

| 조건 | 처리 | 코드 위치 |
|------|------|-----------|
| `!sessionRow` (세션 삭제됨) + paid | `findOrderByTenderPaymentRequestId` → 주문 조회 → `isExpiredOrFailed \|\| hasReceipt` → `appendLatePaidAlert` → 200 | `xendit/route.ts` `!sessionRow` 분기 (신규 BV 블록) |
| 세션 존재 + paid + `webhook_completed_at` 세팅됨 | `idempotent=true` → 즉시 200 (재전송 차단) | 같은 파일, `webhook_completed_at` 가드 |
| 세션 존재 + paid + 첫 수신 | `detectLatePaidTarget` → `isExpiredOrFailed \|\| hasReceipt` → `appendLatePaidAlert` → `markWebhookCompleted` → 200 | 같은 파일, `detectLatePaidTarget` 블록 |
| 정상 (pending tender · 영수증 없음) | `detectLatePaidTarget` 비발동 → 기존 capture 흐름 | — |

**expired/failed → captured 소생 금지**: `detectLatePaidTarget` 가 `isExpiredOrFailed=true` 로 조기 반환 → capture/is_order_complete/createReceiptForOrder/convertDraftOrderWorkflow 호출 전에 차단. ✅

**이미 receipt_id 있는 주문**: `hasReceipt = typeof md.receipt_id === "string" && ...length > 0` → 어떤 paid 가 오든 차단. ✅

**late_paid_alerts 1건 멱등**:
- `appendLatePaidAlert`: `existing.some(a => a?.payment_request_id === paymentRequestId)` 로 기존 여부 확인 → 이미 있으면 `return false` (추가 안 함). ✅
- 같은 웹훅 재전송(2회차): 1회차에서 `markWebhookCompleted` 가 세팅한 `webhook_completed_at` → `idempotent=true` 즉시 반환 → `appendLatePaidAlert` 에 도달 불가 → alerts 1건 유지. ✅

**자동 환불 없음**: late-paid 경로 어디에도 환불 호출 없음. 운영자 수동 처리 대기. ✅

**웹훅 200 유지**: `res.status(200).json({ ok: true, late_paid: true, reason, alert_added, ... })` ✅

**파일:줄**: `apps/commerce-core/src/api/hooks/payment/xendit/route.ts`
- `!sessionRow` 분기 BV 블록 (diff +140~+205 근방)
- `webhook_completed_at` 가드 (diff +323~+334)
- `detectLatePaidTarget` 블록 (diff +336~+420)
- `appendLatePaidAlert` 함수 (diff `async function appendLatePaidAlert` 블록)
- `detectLatePaidTarget` 함수 (diff `async function detectLatePaidTarget` 블록, `webhook.ts` 에서 export)

---

### A2 · CI 결과 · 신규 테스트(BV-a/BV-b) 단정 강도 ✅

**CI run 결과 (head b76eb0f)**

| job | 결과 |
|-----|------|
| pos-integration | **PASS** ✓ (4m16s) |
| unit-commerce-core | **PASS** ✓ (52s) |
| markers-and-forbidden | **PASS** ✓ (7s) |
| check | **PASS** ✓ (11s) |
| changes-filter | **PASS** ✓ (11s) |
| docker-smoke-* | SKIPPING (무관) |

pos-integration 통과 = BV-a/BV-b 를 포함한 전체 tenders.spec.ts 통과 확인.

**BV-a 단정 강도 (재현 시나리오)**

전체 시나리오:
1. 1차 QRIS 50k split → expired webhook → `tenders[0].status=expired`
2. 2차 CASH 100k → `is_complete=true` · `receipt_id=originalReceiptId`
3. 뒤늦은 paid webhook 발송

단정 항목:
- `whLate.status === 200` ✓
- `whLate.data.late_paid === true` ✓
- `whLate.data.reason === "tender_expired"` ✓
- `whLate.data.alert_added === true` ✓
- `whLate.data.captured` (필드 없음) ✓ — capture 미실행 명시 가드
- `tendersAfter[0].status === "expired"` ✓ — 소생 없음
- `tendersAfter[1].status === "captured"` / `method === "cash"` ✓
- `mdAfter.receipt_id === originalReceiptId` ✓ — 중복 발행 없음
- `alerts.length === 1` / `alerts[0].payment_request_id === prId` / `alerts[0].amount === 50000` / `alerts[0].tender_idx === 0` ✓

**BV-b 단정 강도 (재전송 멱등)**

단정 항목:
- 1회차: `first.data.alert_added === true` ✓
- 2회차: `second.data.idempotent === true` ✓
- 최종: `alerts.length === 1` / `alerts[0].payment_request_id === prId` ✓

두 테스트 모두 금전 흐름 핵심(금액·receipt_id·tender_status·alerts 건수)을 직접 단정. 강 ✓

---

## B — PR #251 (head 46e3f2d · stacked on b76eb0f) · CHANGES 수정 확인

### B1 · test:integration:pos → refund-retry-qris.spec 실제 포함 ✅

**수정 방식**: 명시 `&&`-체인 → 자동 탐색 쉘 스크립트로 교체.

`apps/commerce-core/package.json`:
```
"test:integration:pos": "bash scripts/test-integration-pos.sh"
```

`apps/commerce-core/scripts/test-integration-pos.sh`:
```bash
SPECS=(integration-tests/pos/*.spec.ts)
for spec in "${SPECS[@]}"; do
  name=$(basename "$spec" .spec.ts)
  TEST_TYPE=integration:pos npx jest --runInBand --forceExit \
    --testPathPattern="${name}\.spec"
done
```

- `integration-tests/pos/*.spec.ts` 글로브 → `refund-retry-qris.spec.ts` 자동 편입 ✅
- 패턴: `name=refund-retry-qris` → `--testPathPattern='refund-retry-qris\.spec'` → 매칭 ✅
- spec 없으면 `exit 1` 로 CI 실패 보호 ✅
- 신규 spec 추가 시 자동 편입(EB CHANGES [1] 재발 차단) ✅

**7건 확인**: PR 자기 검증 "7 건 모두 PASS (로컬 · 14.8s)" + EB 리포트 BT-a..g 로그 일치. ✅

**다른 누락 spec 없음**: 글로브로 기존 6개(tenders / pos-tax-lines / p6-e2e / refund-ghost-reservation / pos-qris-simulate / refund-receipt-kind) + 신규 1개(refund-retry-qris) 전부 포함. ✅

---

### B2 · #248 rebase 후 R2 로직 무결 ✅

**rebase 여부**: #251 base = `feat/m0-1105-bs-qris-split-tender-status` @ `b76eb0fa` = #248 최신 head. PR updated_at(04:54) > #248 updated_at(04:43). 이미 반영 ✅

**hooks/payment/xendit/route.ts 충돌 없음**:
- #248 추가: paid 이벤트 핸들러에 `detectLatePaidTarget` / `appendLatePaidAlert` / `findOrderByTenderPaymentRequestId` 블록
- #251 추가: `handleRefundWebhook` 함수에 `withOrderLock` 감싸기 + Guard 2 (dup_refund_alerts)
- 두 변경은 완전히 별개 이벤트 핸들러(paid vs. refund) → 충돌 없음 ✅

**REQ1~4 재확인 (짧게)**

| REQ | 항목 | 상태 |
|-----|------|------|
| REQ1 (이중 환불 가드) | Guard 1 신선 재로드 + SUCCEEDED→409 · `withOrderLock` 같은 Map · Guard 2 dup_refund_alerts + x.status 멱등(`x.status===newStatus` 선행 체크) | ✅ |
| REQ2 (mode=retry) | 새 reference_id `retry${N}` · PENDING→409 · 즉시 FAILED · CASH/CARD 불변 | ✅ |
| REQ3 (Cash Movement) | `signed_delta=-fallback_amount` · register_session 없으면 400 · PIN 검증 | ✅ |
| REQ4 (단일 QRIS) | BT-a(retry) · BT-b(cash_fallback) | ✅ |

#248 BV 블록 추가 이후에도 R2 로직은 완전히 독립적으로 동작. ✅

---

## 종합

| PR | REQ | 판정 |
|----|-----|------|
| #248 | A1 (paid 블록 방어) | PASS |
| #248 | A2 (CI + BV-a/BV-b 강도) | PASS |
| #251 | B1 (spec 자동 편입) | PASS |
| #251 | B2 (rebase 후 R2 무결) | PASS |

**A: APPROVE · B: APPROVE**
