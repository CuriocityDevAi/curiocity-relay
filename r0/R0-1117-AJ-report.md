#345 CHANGES · 문제 2건

## 리뷰 결과 요약

| 항목 | 결과 |
|------|------|
| §3.2 식 (floor · IDR 정수) | ✅ |
| 시나리오 §6-1·2·3 | ✅ |
| 환불 < 부족분 → net=0 | ✅ |
| Tender 순서 현금→QRIS→카드 + override | ✅ |
| preview=true DB 변경 0 | ✅ |
| confirmed=true 금액 불일치 거절 | ❌ CHANGES |
| 재시도 멱등(기존 recoverForOrder ref) | ✅ |
| QRIS 금액 0 축소 시 Xendit 호출 skip | ✅ |
| 하위 호환 (둘 다 없으면 현행) | ✅ |
| 테스트 (15 + 13 = 28개) | ✅ 전부 통과 |
| tsc 신규 에러 | ✅ 0 (admin/.tsx 기존 에러 무관) |

---

## 테스트 실행 로그

```
pnpm --filter commerce-core test -- --testPathPattern="preview-recover" --no-coverage
  PASS src/lib/loyalty/__tests__/preview-recover.unit.spec.ts
  Tests: 15 passed, 15 total  (Time: 1.086 s)

pnpm --filter commerce-core test -- --testPathPattern="pos-refund" --no-coverage
  PASS src/workflows/pos-refund/__tests__/pos-refund-workflow.unit.spec.ts
  Tests: 13 passed, 13 total  (Snapshots: 2 passed, Time: 2.064 s)
```

tsc --noEmit 에러: PR 파일 범위 내 신규 0건. 기존 에러는 `src/admin/components/customer-display/EventForm.tsx` 외 3개 파일 — 이번 PR 변경과 무관한 pre-existing.

---

## CHANGES 항목

### 문제 1 — confirmed=true 금액 불일치 거절 미구현

**파일**: `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts`  
**위치**: `confirmed` 분기 블록 (diff @@ -283,6 +289,62 @@)

REQ [2]: "`confirmed=true` 금액 불일치 시 거절"  
계획서 §4: "`body.confirmed=true + preview_ref=<idempotency_key>` → 실제 진행"

현재 코드는 `confirmed=true` 수신 시 fresh re-compute만 하고 reject 없음.

```ts
// RefundBody 에 preview_ref 필드 없음
type RefundBody = {
  ...
  preview?: boolean;
  confirmed?: boolean;
  tender_priority?: ...;
  // ❌ preview_ref?: string; 없음
  // ❌ expected_net_refund_amount?: number; 없음
};
```

문제:
1. `preview_ref` 없어 POS가 preview→confirm 사이 같은 요청임을 보장할 수 없음
2. confirm 재호출 시 balance가 변했을 경우(다른 적립/환불 사이 끼어들면) cashier가 확인한 금액과 실제 처리 금액이 조용히 달라짐 — 계산원 확인 step의 의미가 반감
3. 이중 confirm 방어 없음

최소 수정안: `RefundBody`에 `expected_net_refund_amount?: number` 추가 → confirmed 시 `previewResult.net_refund_amount !== body.expected_net_refund_amount` 이면 400 반환. 혹은 계획서대로 `preview_ref` 추가.

---

### 문제 2 — §6.1 테스트 첫 케이스 description-assertion 불일치

**파일**: `apps/commerce-core/src/lib/loyalty/__tests__/preview-recover.unit.spec.ts`  
**위치**: `describe("previewRecoverForOrder — 시나리오 §6.1 현금 전액환불")` 첫 번째 `it()`

```ts
it("earned 10k, used 10k (balance 0), refund 10k → shortfall 10k, net 0", async () => {
  const order = makeOrder({ earned: 10000, total: 50000 }); // ← total이 10k 아닌 50k
  // ...
  expect(result.requested_debit).toBe(2000); // floor(10000 × 10000 / 50000)
  expect(result.shortfall).toBe(2000);       // ← 10k 아님
  expect(result.net_refund_amount).toBe(8000); // ← 0 아님
```

description은 §6.1 시나리오(shortfall 10k, net 0)를 명시하지만 실제 테스트는 `total=50k` 비례 계산(shortfall 2k, net 8k). 테스트 로직(formula)은 올바르나 description이 완전히 틀림. 이미 같은 describe 블록 두 번째 it()이 §6.1 시나리오를 올바르게 테스트함.

수정: `it("earned 10k, total 50k, refund 10k (비례 2/10) → requested 2k, shortfall 2k, net 8k")`으로 description 수정.

---

## 긍정 사항

- `previewRecoverForOrder` 순수 read-only 설계 명확 (DB 호출 없음 증명됨)
- `applyShortfallToTenders` 순수 함수 분리 → 단위 테스트 용이
- `effectiveHasQris` + `m.amount > 0` 필터로 QRIS 금액 0 시 Xendit 호출 정확히 skip
- `original_refund_amount` → workflow → `recoverLoyaltyStep` 연결: NET 감소된 matched 아닌 gross 기준 비례 회수 올바름
- `effectiveMatched = matched` 기본값으로 하위 호환 유지
- store_credit 조회 실패 시 보수적 처리(balance=0 가정) 적절
- 테스트 커버리지: §6.1·2·3 + 환불<부족분 + 적립없음 + 조회실패 fallback + 멱등·override = 15개
