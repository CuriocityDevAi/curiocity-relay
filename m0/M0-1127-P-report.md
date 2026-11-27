PASS · #480 head=45813a05 · cd-pos-sync-v4.spec 15 pass (기존 11 + 신설 4) · commerce-core unit 886 pass · customer-display 352 pass

# M0-1127-P — 환불/void 주문 Re-enter 로 적립 생성되는 구멍 차단

## 1. 상태 요약

| 항목 | 값 |
|------|-----|
| PR | #480 https://github.com/CuriocityDevAi/storeport/pull/480 |
| branch | feat/M0-1127-N-cd-correct-welcome |
| base | main (rebased · #479 머지 20b824c 반영) |
| head | 45813a05 (M0-1127-P) |
| prior head | 6f2cc0f1 (M0-1127-N) — force-push 로 교체 |
| 결과 | **PASS** — typecheck ok · 신설 테스트 4건 전원 PASS · 회귀 0 |

## 2. REQ 커버

### REQ#1 — base=main · rebase
- `#479` 머지 20b824c 뒤로 로컬 rebase.
- duplicate commit 2건(`5c127534` M0-1127-M · `99a55bd2` snapshots test)은 `git rebase` 가 "patch contents already upstream" 으로 자동 drop.
- `apps/commerce-core/src/modules/register_session/service.ts` 에 충돌 1건 발생 — M0-1127-L 의 `expired → paid` 되살림 로직(HEAD) 과 M0-1127-N 의 `customer_phone null reset`(branch) 이 둘 다 필요하므로 두 로직을 `patch` 변수로 통합해 수동 resolve.
- force-push `+6f2cc0f1...45813a05 feat/M0-1127-N-cd-correct-welcome -> ... (forced update)` · GitHub 자동으로 base=main 유지.

### REQ#2 — 환불/void 재적립 가드

**service.ts · openPostSettlementPhoneEntry**
- 세 번째 인자 `orderPaymentStatus?: string | null` 추가 (후방 호환 — 미지정 시 가드 off).
- `target.paid_at` 통과 직후 refund 분기:
  ```ts
  if (orderPaymentStatus) {
    const ps = String(orderPaymentStatus).toLowerCase();
    if (ps === "refunded" || ps === "canceled" || ps === "voided") {
      return { ok:true, eligible:false, reason:"order_refunded", snapshot:target };
    }
  }
  ```
- `reason` union 에 `"order_refunded"` 추가.
- **partial_refunded 는 제외** (REQ#2 "R0 권고 따라 판단") — 남은 paid 부분에 대한 적립을 막으면 손해. 환불된 금액 포인트 회수는 `refundPaymentWorkflow → recoverForOrder` (M0-1116-B) 가 이미 비례 회수 수행. 즉 전액 환불만 적립 자체를 차단, 부분 환불은 recover 상계로 처리.

**phone-entry 라우트 (`/admin/pos/orders/:id/phone-entry`)**
- `ContainerRegistrationKeys.QUERY` 로 `query.graph` 호출.
- `fields: ["id", "status", "payment_status", "payment_collections.payments.refunds.id"]`
- 유도 규칙 (R0-1105-DA 패턴 재사용):
  - refunds 존재 → `"refunded"`
  - status === `"canceled"` → `"canceled"`
  - 그 외 → `payment_status` 원값 pass-through
- 조회 실패는 non-fatal · `null` 로 fallback (서비스는 기존 가드만).

### REQ#3 — fork 문구 필요
- POS 가 phone-entry 응답에서 `reason === "order_refunded"` 를 받으면 보일 영어 토스트 문구가 **fork 에 아직 없음**. PR 본문에 한 줄 기록 ("fork 문구 필요 · 예: *Order already refunded — can't link customer.*"). storeport 코드는 손대지 않음 (지시).

### REQ#4 — 테스트 + 검증의 검증

파일: `apps/commerce-core/integration-tests/pos/cd-pos-sync-v4.spec.ts` `M0-1127-P` describe 블록.

| 테스트 | 검증 |
|--------|------|
| `refunded 상태로 호출하면 order_refunded 로 거절 · 적립 열림 X` | eligible=false · reason='order_refunded' · snapshot 미변경 (entering/waiting 전이 X) — 즉 linkCustomerToOrder 경로 자체 안 열림 |
| `canceled · voided 도 order_refunded 로 거절` | 대소문자 4가지 (`canceled`/`CANCELED`/`voided`/`Voided`) 전부 거절 — `String().toLowerCase()` 정규화 검증 |
| `정상 결제 / partially_refunded / captured 는 통과 (eligible:true)` | **검증의 검증** — 같은 snapshot 에 대해 파라미터만 바꿔도 결과가 갈림. 가드가 "무조건 차단" 이 아니라 payment_status 값에 반응함을 증명. `null`/`captured`/`partially_refunded`/`paid` 전부 eligible:true. |
| `Re-enter (customer_phone 있음) 에서도 refunded 는 차단` | customer_phone 세팅된 (confirmed) 주문에도 가드 적용 · customer_phone 유지 (거절 경로는 reset 하지 않음) |

**실행 결과** (TEST_TYPE=integration:pos · 15.874s):
```
M0-1126-I · CD ↔ POS v4 (Kyu 11-26 15:53+ WIB)
  ✓ V4-8 · 결제 중 Ask → 입력 → OK → Re-enter → 다른 번호 확정 (947 ms)
  ✓ V4-8 · Skipped → Ask again (786 ms)
  ✓ V4-7 · 결제 완료 주문 Phone entry = eligible · 새 장바구니 뒤 new_cart_started (422 ms)
  ✓ M0-1127-L · QRIS → Next customer → Re-enter 소급 (448 ms)
  ✓ M0-1127-L · 결제된 적 없는 주문에는 not_paid (412 ms)
  ✓ V4-8 · Re-enter → cancel_entry → 번호 A · 잔액 보존 (529 ms)
  ✓ V4-8 · Re-enter → skip → 번호 A · 잔액 보존 (530 ms)
  ✓ V4-8 · M0-1126-P · Re-enter → 번호 B 확정 → A 회수 + B 적립 (639 ms)
  ✓ V4-8 · M0-1126-P · 전송 멱등 — A 이중 회수·B 이중 적립 없음 (895 ms)
  ✓ V4-7 · 원자화 — new_cart_started 로 거절 (395 ms)
  ✓ V4-8 · lock — phone_entry_busy (409 ms)
  M0-1127-P · 환불/void 주문 재진입 가드
    ✓ refunded → order_refunded · 적립 열림 X (488 ms)
    ✓ canceled · voided 도 order_refunded (320 ms)
    ✓ 정상 결제 / partially_refunded / captured 는 eligible:true (303 ms)
    ✓ Re-enter(customer_phone 있음) 에서도 refunded 차단 (350 ms)

Tests: 15 passed, 15 total
```

## 3. 보존 확인

- #480 의 A3 · Re-enter · B · A2 수정 전부 그대로 (rebase 충돌 resolve 때 양쪽 로직 다 살림).
- `cd-pos-sync-v4.spec.ts` 기존 11건 전부 PASS (Re-enter 서브셋 6/6 포함).
- pre-push hook: commerce-core 전체 jest unit 886/886 · customer-display vitest 352/352 PASS (75 test suites). 회귀 0.

## 4. 범위 밖 (명시적 보고)

- POS `start_entry` (customer-flow route · V4-8) 는 `orchestrator.ts` 가 소관 · `openPostSettlementPhoneEntry` 를 거치지 않음. R0 와 Kyu 지시 scope 가 service.ts 의 openPostSettlementPhoneEntry Re-enter 분기 한정이라 orchestrator 는 건드리지 않았다. 만약 POS fork 가 Re-enter 를 `start_entry` 로 라우팅한다면 추가 가드 PR 필요 — 별건 티켓 제안 대상.
- 환불 라우트 · 손님 화면 (⛔ 지시) 건드리지 않음.

## 5. 다음 단계

- CI 결과는 기다리지 않음 (지시).
- POS fork 토스트 문구 추가 PR 은 별개 작업.
