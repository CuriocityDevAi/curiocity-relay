# M3-1116-N 리포트

**원인 (a) · PR #314 (storeport) · 통합 테스트 ✅**

---

## 원인 판정

**(a) POS 가 Checkout 시 snapshot 을 아예 안 보냄**

`startSnapshotForRegister()` 가 프로덕션 코드에서 한 번도 호출되지 않음.
- `order-snapshot-paid` subscriber 의 `markSnapshotPaidByOrder()` 는 snapshot row 를
  `order_id` 로 조회 → rows 가 비어 있으면 line 247 에서 `return null` 로 조용히 종료
- 결과: 손님 화면 `GET /customer-display/snapshots/active` → 항상 null → 대기화면 고착

후보 (b)(c)(d) 판정:
- **(b) register 불일치**: 짝짓기는 성공(`polled_at` 갱신 확인)하므로 device_token ↔ register_session 매핑은 정상. 제외.
- **(c) active 필터 204**: snapshot 자체가 없으므로 필터 문제가 아님. 제외.
- **(d) 폴링 401**: 대기화면은 정상 표시되었으므로 device_token 유효. 제외.

---

## 수정 내용 (storeport PR #314)

### `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts`

cash/card 경로: `capturePaymentWorkflow` 직전에 `startSnapshotForRegister()` 호출
- capture 보다 먼저 실행해야 `payment.captured` subscriber 가 snapshot 을 찾을 수 있음

QRIS 경로: short-circuit return 직전에 동일 호출
- QRIS 는 결제가 비동기(webhook)이므로 snapshot 을 미리 생성해 CartScreen 을 표시

두 경로 모두:
- `register_session_id` = `body.register_session_id` ?? `order.metadata.register_session_id` 폴백
- 실패 시 non-fatal (console.warn) — 결제 흐름 차단 없음
- items / subtotal / discount_total / tax_total / grand_total 포함

### `apps/commerce-core/integration-tests/loyalty/checkout-snapshot.spec.ts` (신규)

통합 테스트 3케이스:
1. 현금 결제 후 `GET /customer-display/snapshots/active` → snapshot(items/grand_total) 반환 ✅
2. body 에 register_session_id 없이도 order.metadata 폴백으로 snapshot 생성 ✅
3. X-Device-Token 헤더 없음 → 401 ✅

### `apps/customer-display/src/hooks/useDisplayMachine.ts`

`UseDisplayMachineResult` 에 `pollErrorCount: number` 추가 (REQ 4)

### `apps/customer-display/app/index.tsx`

연결 상태 dot 추가 (REQ 4):
- 화면 우하단 8×8px 원
- `pollErrorCount === 0` → 초록 (#22c55e)
- `pollErrorCount > 0` → 주황 (#f59e0b)
- 모든 화면(cart/receipt/done/keypad/main)에 공통 표시

---

## 검증

단위 테스트: `apps/commerce-core` 339개, `apps/customer-display` 132개 모두 통과

통합 테스트 (로컬 서버 필요):
```
cd apps/commerce-core && pnpm test:integration -- --testPathPattern checkout-snapshot
```

---

PR: https://github.com/CuriocityDevAi/storeport/pull/314
