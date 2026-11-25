PASS

## Q1 — QRIS 탭 선택 시 CD checkout_review 유지

**변경**: `app/checkout/tender-cash/[draftOrderId].tsx` line 137
```ts
// 변경 전
method === 'qris' ? 'payment_qris' : 'payment_card'
// 변경 후
method === 'qris' ? 'checkout_review' : 'payment_card'
```
QRIS 탭 선택 시 CD는 checkout_review(결제 요약)를 그대로 유지한다.
`payment_qris + qr_string` emit은 tender-qris 화면 `useEffect`에서만 발생 (기존 코드 그대로).

**테스트**: `m3-1125-m-qris-cd-flow.test.ts` → "tender-cash effect에서 method=qris → checkout_review" ✅

---

## Q2 — Generate QR 후 CD QR 미표시 수정

### 본 fix: `api/hooks/pos-payments.ts` line 189
```ts
// 변경 전: onSuccess 첫 줄에서 무조건 삭제
await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY);

// 변경 후: is_complete=false(QRIS pending/split 1차) · dp_paid 는 삭제 보류
const isSplitIncomplete = tender?.is_complete === false;
const isPreorderDpOnly = tender?.preorder_stage === 'dp_paid';
if (!isSplitIncomplete && !isPreorderDpOnly) {
  await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY);
}
```
QRIS webhook paid → navigateToSuccess 이동 시, `useCurrentDraftOrder` non-draft guard(기존 line 535)가 order status 변경 감지 후 SecureStore를 처리. 경로 확인 결과 별도 명시 삭제 불필요.

### 보조 fix 1: `app/checkout/tender-qris/[draftOrderId].tsx`
```ts
setPosScreenHint({
  ...
  order_id: orderId ?? draftOrderId,  // 추가
});
```
SecureStore 삭제 환경에서도 `usePosScreenAutoEmit`의 `orderId` fallback 보장.

### 보조 fix 2: `hooks/usePosScreen.ts`
```ts
// 변경 전: return; (silent drop)
// 변경 후:
if (__DEV__) {
  console.warn('[pos-screen] drop: order_id null', { screen: item.pos_screen, seq: item.seq });
}
return;
```
개발 중 emit drop 즉시 추적 가능.

**테스트**: isSplitIncomplete 판정이 deleteItemAsync 보다 먼저 / 조건 블록 내 삭제 / order_id 명시 / console.warn 존재 → 4개 assertion ✅

---

## Q3 — 재진입 막힘 · New QR 실패 수정

### (a) `api/hooks/pos-qris.ts` — useQrisRegenerate body 전송
```ts
// QrisRegenerateInput 타입 추가
mutationFn: async (input: QrisRegenerateInput) => {
  return sdk.client.fetch(`/admin/pos/orders/${input.orderId}/qris-regenerate`, {
    method: 'POST',
    body: {
      payment_collection_id: input.paymentCollectionId,
      ...(input.prevPaymentRequestId
        ? { previous_payment_request_id: input.prevPaymentRequestId }
        : {}),
    },
  });
}
```
기존에 body 없이 호출 → 서버 400 `payment_collection_id required` 항상 실패. 수정 후 정상 동작.

`useQrisCancel` 훅 추가: 서버 엔드포인트 `/admin/pos/orders/:id/qris-cancel` (M0 storeport 구현 중). 준비 전까지 버튼 UI 숨김 (tender-qris 주석 처리).

### (b) `tender-cash` → `tender-qris` route params에 `paymentCollectionId` 추가
```ts
router.push({ params: { ..., paymentCollectionId: tender.payment_collection_id } });
```

### (c) 409 `qris_pending_cannot_split_next` → 이어하기
흐름:
1. `sdk.admin.order.retrieve(draftOrderId, { fields: '+metadata' })` → `metadata.tenders` 에서 method=qris, payment_collection_id 보유 항목 탐색
2. `payment_request_id` 있으면 `fetchQrisStatus` 호출 → **paid/captured 시 즉시 success 화면** (이중 결제 방지)
3. pending 시 기존 QR 정보(qr_string, expires_at, payment_collection_id)로 tender-qris navigate → 이어하기
4. metadata 조회 실패 또는 payment_request_id 없으면 에러 메시지 fallback

### (d) `tender-qris` onNewQr 전 paid 확인 (이중 결제 방지)
```ts
const statusCheck = await fetchQrisStatus(sdk, id, currentPaymentRequestId);
if (statusCheck.status === 'paid' || statusCheck.status === 'captured') {
  navigateToSuccess(statusCheck.receipt_id ?? null, ...);
  return;
}
// paid 아니면 regenerate 진행
```
webhook이 항상 우선: regenerate 직전 상태 재확인으로 이미 결제된 주문 중복 결제 차단.

### 필요한 서버 API (현재 없음)
- `GET /admin/pos/orders/:id/qris-current` 또는 `GET /admin/pos/orders/:id/qris-pending`  
  반환: `{ payment_collection_id, payment_request_id, qr_string, expires_at, status }`  
  이유: 현재 409 resume 시 order metadata 조회로 우회하는데, 메타데이터 shape이 불안정함. 전용 엔드포인트가 있으면 resume 흐름이 훨씬 안정적.

**테스트**: 409 타입 감지 / metadata.tenders 조회 / paid 시 success navigate / paymentCollectionId route param / regenerate body / onNewQr paid 확인 → 10개 assertion ✅

---

## 이중 결제 방지 경로 요약

| 시점 | 방지 방법 |
|------|-----------|
| 409 resume 진입 시 | fetchQrisStatus → paid 이면 success 화면으로 |
| New QR 클릭 전 | fetchQrisStatus → paid 이면 success 화면으로 (regenerate 차단) |
| 뒤로 가기 | pending 자동 취소 금지 (R0 권장) — webhook 도달 후 paid 로 처리됨 |
| webhook paid 도달 | 10s 폴링이 paid 감지 → navigateToSuccess (기존 로직) |

---

## CI

- vitest 82 files · 1051 passed · 6 expected fail · 3 todo — **전부 green**
- 신규 테스트: `__tests__/m3-1125-m-qris-cd-flow.test.ts` 21 assertions

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/262
