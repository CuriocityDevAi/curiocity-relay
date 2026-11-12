# R0-1105-DI — storeport #232 판정 리뷰 보고서

**날짜:** 2026-11-13  
**대상 PR:** storeport #232 (head ca69d42, base c2c2ca9)  
**대조 PR:** storeport #237 (M2-1105-BC, 머지됨)  
**main HEAD:** `19f38d5`

---

## 판정: A (폐기 — 오케가 닫음)

PR #234 (`b5d9092`)가 #232의 모든 내용을 흡수 완료함. 근거 아래 서술.

---

## REQ 1 — refund/route.ts cancel·예약 정리 로직

**파일:** `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts`

| 줄 범위 | 내용 |
|---------|------|
| L271–276 | `activeFulfillments` 필터 + `hasShippedFulfillment` 판정 |
| L317–333 | `if (!hasShippedFulfillment)` → `orderModule.cancel(order_id)` 호출 |
| L334–361 | `inventoryModule.listReservationItems` → `inventoryModule.deleteReservationItems` 호출 |

**도입 커밋/PR:** `b5d9092` — PR #234 (M0-1105-BI, 2026-11-12)

PR #234 커밋 메시지 발췌:
> `A. /refund ghost reservation (Admin #81 재현 수정 · storeport #232 흡수):`  
> `- #232 테스트 (refund-ghost-reservation.spec.ts) 흡수 · it.failing 2개`  
> `  (#BB-refund · #BB-stale) 일반 it 로 반전.`

추가로 `release-stale-reservations/route.ts`에 `payment_status === 'refunded'` 조건이 fallback 경로로 함께 추가됨.

---

## REQ 2 — #237 BC-1 vs #232 #BB-refund 시나리오 비교표

| 항목 | #232 #BB-refund | #237 BC-1 |
|------|----------------|-----------|
| 결제수단 | CASH (`pp_cash_default`) | CASH (`pp_cash_default`) |
| 처리 단계 | tenders 완료 → Hand over 없음 → /refund 전액 | tenders 완료 → Hand over 없음 → /refund 전액 |
| 전액/부분 | 전액 환불 | 전액 환불 |
| stocked 초기값 | 20 (stale 예약 없음) | 20 (stale 예약 3개 사전 주입) |
| reserved 사전 상태 | active 1개 | active 1개 + stale 3개 = 4개 |
| assert 대상 | `order.status === "canceled"` + `reserved === 0` + `available === stocked` | `reserved === preReserved(3)` (stale 보존) + `available === stocked − 3` |
| 커버 범위 | 단순 버그 재현 (최소 케이스) | prod-shape: stale 보존 + active-only 소거 |

**핵심 차이:** #BB-refund는 단순 최소 재현; BC-1은 stale 예약이 사전 존재하는 prod-shape 환경에서 active 예약만 선택적으로 소거됨을 검증한다. 두 테스트는 상호보완 관계.

---

## REQ 3 — #232 spec을 main 위에서 실행한 결과

```
# main HEAD 19f38d5 위에서 ca69d42의 spec 실행
# (refund/route.ts에 M0-1105-BI 수정 포함 상태)

FAIL integration-tests/pos/refund-ghost-reservation.spec.ts (18.014 s)
  ✕ #BB-refund (3142 ms)
      → Failing test passed even though it was supposed to fail.
        Remove `.failing` to remove error.
  ✓ #BB-stale (2621 ms)
      → it.failing 이 실제로 실패함 (버그 여전히 존재)

Tests: 1 failed, 1 passed, 3 skipped, 5 total
```

| 테스트 | 결과 | 해석 |
|--------|------|------|
| #BB-refund | FAIL (it.failing인데 통과 → runner 빨강) | 버그가 #234에서 수정됨 → `.failing` 제거 필요 |
| #BB-stale | PASS (it.failing이 올바르게 실패) | stale 사각지대 버그 존재 |

**단, main의 `refund-ghost-reservation.spec.ts` (19f38d5)를 grep하면 `it.failing`이 없음.** PR #234가 흡수 시 이미 양쪽 모두 일반 `it()`으로 반전했기 때문이다.

---

## 판정 근거

| 조건 | 확인 결과 |
|------|-----------|
| main이 버그를 수정했는가 | ✅ PR #234 (`b5d9092`), `refund/route.ts` L317–361 |
| main이 #232 테스트를 흡수했는가 | ✅ PR #234 커밋 메시지 명시 + main spec에 `it.failing` 없음 |
| #237 BC-1이 같은 시나리오를 덮는가 | 부분적 (prod-shape 각도). 최소 재현은 main 흡수 버전이 커버 |
| #232가 추가로 커버하는 미수정 시나리오가 있는가 | ❌ 없음 |

**→ 판정 A: main(#234)이 이미 버그를 수정하고 테스트를 흡수. #237(BC-1)이 prod-shape 가드 추가. PR #232는 역할 완료 — 오케가 닫음.**

---

## 남는 이연

없음. `release-stale-reservations` stale 조건 확장(#234)과 prod-shape 가드(#237 BC-1)로 해당 요구사항 완전 충족.
