# R0-1105-DU · storeport #247 리뷰 리포트

판정: **APPROVE**

head: ea09b6031d92f70458a31691e92e0dec3a0bc8c6 · mergeable_state: CLEAN · pos-integration: SUCCESS

---

## REQ 1 · findSessionByXenditRefs JSONB 조회 · ? 바인딩

`webhook.ts:233-247`

```sql
SELECT id, amount, status, data, payment_collection_id, provider_id
FROM payment_session
WHERE (data->>'payment_request_id' = ?)
   OR (?::text <> '' AND data->>'reference_id' = ?)
LIMIT 1
```

bindings: `[paymentRequestId, referenceId, referenceId]` = 3 `?` × 3 바인딩 — 완전 일치, 충돌 없음.

- `->>` 연산자를 사용하므로 BN 에서 `?` 연산자가 Knex 플레이스홀더로 오인되던 문제와 무관.  
- `route.ts`에서 `findSessionByXenditRefs(pg, payment_request_id, "")` 로 호출 (`referenceId=""`) → `?::text <> ''` 조건이 false → reference_id OR 절 비활성 · 오탐 없음. `route.ts:56`  
- 이후 `query.graph filters: { id: rawSession.id }` (`route.ts:110`) 로 Medusa 내부 `payses_...` ID로 정확히 조회 — 이전 `filters: { id: payment_request_id }` (Xendit `pr_...` 를 Medusa ID 로 오인) 버그 수정 확인.  
- simulate(`qris-simulate/route.ts`) · webhook(`hooks/payment/xendit/route.ts`) 경로와 동일 함수 재사용 → JSONB 조회 통일.

**이상 없음** ✅

---

## REQ 2 · order_id 불일치 가드 · 응답 shape 무변경

**400 payment_request_mismatch 가드** (`route.ts:67-75`)

```ts
const sessionOrderId = typeof rawData.order_id === 'string' ? rawData.order_id : null;
if (sessionOrderId && sessionOrderId !== order_id) {
  res.status(400).json({ type: 'invalid_data', code: 'payment_request_mismatch', ... });
  return;
}
```

다른 주문의 `pr_id`로 접근 → 400 · BR-4 가 이 경로를 직접 커버.

**응답 shape 무변경** (4 경로 모두):

| 경로 | shape |
|------|-------|
| captured | `{ ok, status:"captured", payment_request_id, test_mode, data }` |
| expired/failed | `{ ok, status:"expired"\|"failed", payment_request_id, test_mode, data }` |
| pending | `{ ok, status:"pending", payment_request_id, test_mode, data }` |

`sessionRow` → `effective` 치환 외 필드 추가·제거 없음 (`route.ts:110-184`). 앱 fork(pos-r0)는 현재 tender-qris 화면이 미구현 상태(`app/checkout/[draftOrderId].tsx:392` "Card/QRIS P3/P4 별도 화면에서 복원 예정") — 계약 필드(`ok · status · payment_request_id · test_mode · data`)는 기존 BC 계약 그대로이므로 호환성 무문제.

**이상 없음** ✅

---

## REQ 3 · 통합 테스트 BR-1~4 · CI

| 테스트 | 흐름 | 결과 |
|--------|------|------|
| BR-1 | tender → qris-status(pr_...) → 200 pending | ✅ |
| BR-2 | tender → simulate → webhook paid → qris-status captured (전체 왕복) | ✅ |
| BR-3 | 없는 pr_id → 404 not_found | ✅ |
| BR-4 | 다른 주문 pr_id → 400 payment_request_mismatch | ✅ |

실기 흐름 K3 (tender → simulate → webhook → qris-status captured) = BR-2 가 그대로 재현.

CI:
- `pos-integration`: **SUCCESS** (2026-11-13T14:28:36Z)  
- 나머지 체크(`unit-commerce-core`, `markers-and-forbidden`, `feature-map-check`): 모두 SUCCESS  
- `mergeable_state`: **CLEAN** · head: **ea09b6031d92f70458a31691e92e0dec3a0bc8c6**

**이상 없음** ✅

---

## 종합

버그 근본 원인(`filters: { id: payment_request_id }` → Xendit `pr_...` ID를 Medusa `payses_...` ID로 오인 → 항상 404) 수정 정확. JSONB 직조회 통일, 바인딩 충돌 없음, order_id 가드 추가, 응답 shape 무변경, CI green, mergeable. 머지 가능.
