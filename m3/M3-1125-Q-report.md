# M3-1125-Q 완료 보고서

날짜: 2026-11-25

## PRs

| 저장소 | PR | 브랜치 |
|---|---|---|
| CuriocityDevAi/storeport | [#441](https://github.com/CuriocityDevAi/storeport/pull/441) | `feat/M3-1125-Q-storeport` |
| CuriocityDevAi/agilo-medusa-pos-fork | [#265](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/265) | `feat/M3-1125-Q` |

---

## 항목 1 — Server: qris-regenerate pr_... ID 매칭 + 돈 안전

### 문제

`previous_payment_request_id` 가 Xendit `pr_...` 형식으로 전달되나, 서버는 `s.id` (`payses_...`) 와 직접 비교 → 항상 미매칭 → 이전 세션이 EXPIRED 마킹되지 않음.

### 수정 (`route.ts`)

```
// OLD — s.id(payses_...) vs pr_... 는 절대 같지 않음
s.id === previous_payment_request_id

// NEW — pr_... 접두면 session.data.payment_request_id 로 조회
if (previous_payment_request_id.startsWith("pr_")) {
  return (s.data as any)?.payment_request_id === previous_payment_request_id;
}
```

### 돈 안전 guard 추가

이전 세션의 `xendit_status` 가 `PAID | CAPTURED | SUCCEEDED` 이면 409 반환 (새 QR 미생성).

### 테스트 결과 (Jest, 737 / 66 suites)

```
PASS src/api/admin/pos/orders/[id]/qris-regenerate/__tests__/route.unit.spec.ts
  POST /admin/pos/orders/:id/qris-regenerate
    ✓ payment_collection_id 없으면 400
    ✓ payment_collection 없으면 404
    ✓ 이미 captured 이면 409 (payments.captures)
    ✓ M3-1125-Q · pr_... ID → session.data.payment_request_id 로 이전 세션 매칭 후 EXPIRED 마킹
    ✓ M3-1125-Q 돈 안전 · xendit_status=PAID 세션 → 409 거절 (new QR 미생성)
    ✓ M3-1125-Q 돈 안전 · xendit_status=SUCCEEDED 세션 → 409
    ✓ previous_payment_request_id 없으면 첫 번째 QRIS 세션 선택 · 새 QR 생성

Tests: 737 passed, 737 total
```

---

## 항목 2 — POS: 409 이어하기 qris-pending 전환

### 문제

409 `qris_pending_cannot_split_next` resume 경로가 `order.metadata.tenders` 배열 스캔에 의존 — PR #438 이후 `qris-pending` 전용 엔드포인트 사용 가능.

### 수정 (`tender-cash/[draftOrderId].tsx`)

```typescript
// OLD — metadata.tenders 스캔
const orderRes = await sdk.admin.order.retrieve(..., { fields: '+metadata' });
const metaTenders = Array.isArray(meta.tenders) ? ... : [];
const pendingQris = metaTenders.find(t => t.method === 'qris' ...);

// NEW — 전용 엔드포인트
const pendingRes = await fetchQrisPending(sdk, draftOrderId);
if (pendingRes.status === 'pending' && pendingRes.payment_request_id) { ... }
```

### 훅 추가 (`api/hooks/pos-qris.ts`)

- `QrisPendingResponse` 타입 (discriminated union: `status:'pending'` | `status:'none'`)
- `fetchQrisPending(sdk, orderId)` 함수

### 테스트 결과 (Vitest, 41 tests)

```
__tests__/m3-1125-m-qris-cd-flow.test.ts
  ✓ fetchQrisPending 사용 (meta.tenders 미사용) — 소스 검사
  ✓ 409 이어하기: pending → fetchStatus pending → resume (tender-qris)
  ✓ 409 이어하기: pending → fetchStatus paid → success 화면 전환
  ✓ 409 이어하기: status:none → error
  ✓ 409 이어하기: fetchQrisPending throws → error

Tests: 41 passed, 41 total
```

---

## CI

pre-push hooks (storeport: Jest 737 passed) 통과 후 push 완료. GitHub Actions CI 는 PR 머지 후 확인.
