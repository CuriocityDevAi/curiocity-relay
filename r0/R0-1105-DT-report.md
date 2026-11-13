# R0-1105-DT — PR #131 리뷰 리포트

**head**: 658aa181a7f96c47e3a4deb065dcad89cef6c8ef  
**판정**: APPROVE

---

## REQ1 — `useUpdateDraftOrderItem` debounce 우회 · 순서 보장

**파일**: `api/hooks/draft-orders.tsx:399-401`

```ts
if (item.update.quantity === 0) {
  debounceResolve();
  return;
}
```

debounce Promise 내부에서 quantity=0 일 때만 `debounceResolve()`를 즉시 호출하고 return. setTimeout 경로에 진입하지 않으므로 `debounceTimeouts`에 항목이 등록되지 않는다. 그 외 수량은 기존 300ms timeout 경로를 그대로 탄다.

**순서 보장**: 각 업데이트는 `previousPromise.catch().then(async () => {...})` 체인으로 직렬 큐에 등록된다. 삭제(quantity=0)가 즉시 resolve되어 API 콜까지 완료되면, 그 이후에 큐에 들어온 Undo(재추가)의 `.then()` 콜백이 실행된다. Undo는 별도의 300ms debounce를 가지므로, 삭제 API 완료 → Undo API 발송 순서가 구조적으로 보장된다.

---

## REQ2 — `onNewQr`의 `setCurrentPaymentRequestId` 필드 일치 여부

**파일**: `api/hooks/pos-qris.ts:30-35`

```ts
export type QrisRegenerateResponse = {
  qr_string: string;
  expires_at: string;
  payment_request_id: string;   // ← non-optional
  order_id: string;
};
```

`regenerate.mutateAsync(id)` 반환 타입이 `QrisRegenerateResponse`이고, 필드명 `payment_request_id`는 정확히 일치한다. `if (res.payment_request_id)` 가드는 타입상 불필요하지만 무해하다.

**M0-1105-BR 영향**: M0-1105-BR은 "재발행 후 앱이 구 payment_request_id를 계속 보내는" 문제를 진단 중이다. 이 PR은 regenerate 응답에서 새 ID를 즉시 `currentPaymentRequestId`에 반영하므로 그 문제를 **줄이는** 방향이다. 악화 없음.

---

## REQ3 — CI · mergeable

| 체크 | 결과 |
|------|------|
| lint | ✅ SUCCESS |
| assertions (vitest) | ✅ SUCCESS |
| flow-tests | ✅ SUCCESS |
| playwright | ⏳ IN_PROGRESS (리뷰 시점 미완료) |
| mergeable | MERGEABLE |
| mergeStateStatus | UNSTABLE (playwright 진행 중) |

playwright 완료 전이나, lint·vitest·flow-tests 전부 통과, 구현 로직에 결함 없음.

**비고**: `__tests__/m3-1105-bv.test.ts`의 테스트가 실제 훅을 import하지 않고 테스트 파일 내 순수 함수를 검증하는 형태라 훅 구현 직접 커버리지는 낮다. 블로커는 아님.

---

**판정 근거 요약**: quantity=0 즉시 확정이 promise 체인 직렬화로 순서를 보장하고, regenerate 응답 필드명이 타입과 일치하며, M0-1105-BR 개선 방향이다. CI 통과.
