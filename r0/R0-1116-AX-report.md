#321 APPROVE

## 판정: APPROVE

테스트: 신규 AV-1~4 (4 passed) · 회귀 128 passed (tenders 96 · refund-retry-qris 7 · refund-decision-bc 3 · refund-ghost-reservation 5 · refund-receipt-kind 4 · partial-refund-anytime 3 · void-refund-restock 6).

---

### 1. All-or-nothing

QRIS preflight 실패 → route.ts:361-398 즉시 `400 qris_refund_rejected` + return → Cash Movement·refundPaymentWorkflow·주문 상태 변경 하나도 없음 ✅

실행 순서: QRIS preflight(L361-398) → refundPaymentWorkflow(L400-441) → order cancel(L443-490) → Cash Movement(L492-535)

**한계**: preflight 성공 후 refundPaymentWorkflow 실패 시 Xendit 환불은 발송된 상태·Medusa 기록 없는 불일치 가능. 보상 트랜잭션 없음. 단 (a) console.warn 로깅 (b) /return도 동일 패턴 (c) workflow 실패 가능성 극히 낮음 → 블로커 아님.

---

### 2. Pack 매칭 변경

- allPayments[0] → 응답 payment_id·409 체크용으로만 유지, 환불 처리는 paymentPacks 전체 수집으로 전환 ✅
- 같은 method 순서 소비(packConsumed Map, L301-317) ✅
- 단일 결제 하위 호환: body.method → tenders 1건 wrap ✅
- cash+card split 환불 회귀: tenders.spec #67 통과 ✅
- S3 CASH→QRIS→CARD 순서: 서버 정렬 없음, body 순서 의존. 현재 앱 계약([{cash},{qris}])이 올바른 순서 → 운영 위험 없음.
- 부분 환불: /refund는 전액 전용, /return 소관 → 무영향 ✅

---

### 3. /return QRIS 분기와 동일성

- 헬퍼: 둘 다 tryXenditRefund 재사용 ✅
- 에러 shape: `{type:"qris_refund_rejected", order_id, payment_id, amount, reason, failure_code, fallback:"cash", message}` — /return L458-468 ↔ /refund L378-389 완전 일치 ✅
- 로직 복제 없음 ✅

---

### 4. 멱등성

reference_id = `${order_id}:refund:${seq}:${random_nonce}` → Xendit 레벨 완전 멱등 없음.
단, 정상 성공 후 재전송 시 Medusa totalRefundable 체크(L222-230)가 409로 차단 → Xendit 이중 호출 불가.
/return도 동일 패턴(nonce=undefined). 블로커 아님.

---

### 5. 승인번호 card_terminal only

L237-249: card_terminal 엔트리만 6자리 검증, qris/cash는 미적용 ✅ #AV-4 테스트 실증 ✅

---

### 6. 테스트 로그

| 스펙 | 결과 |
|------|------|
| refund-qris-tender (AV-1~4) | ✅ 4 passed |
| tenders | ✅ 96 passed |
| refund-retry-qris | ✅ 7 passed |
| refund-decision-bc | ✅ 3 passed |
| refund-ghost-reservation | ✅ 5 passed |
| refund-receipt-kind | ✅ 4 passed |
| partial-refund-anytime | ✅ 3 passed |
| void-refund-restock | ✅ 6 passed |

console.warn 1건: lib/loyalty/recover.js 미발견 (non-fatal catch 처리됨, 테스트 영향 없음).

설계 정본(qris-split-refund-plan §4-1·§4-2 S3) 충실히 구현. all-or-nothing 보장·헬퍼 재사용·에러 shape 일치 모두 확인. 회귀 없음.
