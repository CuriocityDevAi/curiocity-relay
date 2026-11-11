# R0-1105-BL 리포트 — storeport #215 (M1-1105-AS) void/fulfillment 수정 리뷰

**판정: CHANGES**

---

## (a)~(f) 검증 표

| 항목 | 결과 | 근거 |
|------|------|------|
| (a) cancelOrderFulfillmentWorkflow → cancelOrderWorkflow 2단계 void | ✅ 구현 확인 | `void/route.ts` +45L: `for (const f of pendingFulfills)` → `cancelOrderFulfillmentWorkflow` → `cancelOrderWorkflow`. 순서 정확. |
| (b) S2 매니저 PIN 규칙(CASH 포함 시 PIN 필수) · Cash Movement 유지 | ✅ 유지 | route.ts PIN 검증 블록 미변경. 기존 테스트 #44~#53 모두 ✓ 통과. |
| (c) 중간 실패 all-or-nothing 대신 "출고만 취소 → /void 재호출 수렴" 문서화 · 안전성 | ✅ 문서화 · 안전 | PR 본문 "반쪽 상태 방지 방식" 절에 명시. 각 workflow가 재고·예약 복구를 독립 수행하므로 중간 상태도 재고 측면에서 유효. |
| (d) #61/#62 통합 테스트 실행 · 초록 | ❌ **#61 FAIL** | #62 ✓ (shipped 400 가드 성공). **#61 ✕** — `AxiosError: 400` at `tenders.spec.ts:3113`. `cancelOrderFulfillmentWorkflow`가 CI 환경에서 실패해 void 가 여전히 400 반환. |
| (e) shipped/delivered fulfillment 여전히 막힘 · 명확한 메시지 | ✅ | `shippedFulfills.length > 0` → 400 `"order has shipped fulfillments · void not allowed · use refund instead"`. #62 ✓. |
| (f) CI 초록 · base=main · return/route.ts 미변경 | ❌ **CI FAIL** | pos-integration **3 failed / 76 passed**. base=main ✓. return/route.ts 미변경 ✓. |

---

## 실패 상세

### ❌ #61 — cancelOrderFulfillmentWorkflow 400

```
AxiosError: Request failed with status code 400
at tenders.spec.ts:3113
```

`void/route.ts` 는 `cancelOrderFulfillmentWorkflow` 실패 시 즉시 400을 반환한다. CI 로그상 에러 body가 잘리지 않아 정확한 원인은 workflow 내부에 있으나, 가능성:
- `seedReservationForLineItem`이 `order.inventory_item_id`/`order.stock_location_id` 없어 실행 skip → fulfillment 취소 workflow가 예약 해제 대상을 못 찾아 throw.
- `setOrderMetadataLocal`의 `stock_location_id`(`${stockLocationId}-void-fulfilled`)가 fulfill route에서 쓰는 위치와 다른 scope이어서 workflow에 전달되는 location 불일치.

핵심 수정 지점: **`cancelOrderFulfillmentWorkflow` 가 실제로 성공하는 조건을 확인하고, 테스트 fixture(reservation seed 조건문 or scopedStoreId)를 수정하거나 route에서 workflow에 넘기는 `input`에 누락 필드가 있는지 점검.**

### ❌ #68 / #68b — `it.skip` → `it` 해제했지만 return/route.ts 미수정

```
#68  Expected: 50000  Received: 40000   (refunded_amount)
#68b expect(caught).toBeTruthy()  Received: null   (500 기대 → 200 받음)
```

이 두 테스트는 M0-1105-AL(return/route.ts `refundableCap` 수정 + `__test_fail_refund_after` 훅) 구현이 완료된 뒤에야 초록이 될 수 있다. 이 PR의 변경 파일은 `void/route.ts` + `tenders.spec.ts` 뿐이고 return/route.ts 는 미수정이므로, `it.skip` 해제는 CI를 불필요하게 빨갛게 만든다.

**선택: A) #68/#68b를 다시 `it.skip`으로 복구(이 PR 범위 외 이연 명시) · B) return/route.ts M0-1105-AL 수정 함께 포함.**  
권장: **A** — 이 PR 범위는 void/fulfillment이므로 return 이연은 별도 PR로 분리.

---

## 실행 로그 요약

```
Tests:  3 failed, 76 passed, 79 total  (pos-integration CI)
✕ #61 (M1-1105-AS) POST /fulfill 뒤 void → 400 AxiosError
✕ #68 [M0-1105-AL] refunded_amount 50000 expected, 40000 received
✕ #68b [M0-1105-AL] caught null (500 expected)
✓ #62 (M1-1105-AS) shipped → 400 "void not allowed · use refund instead"
✓ 나머지 76개 모두 통과
```

---

## 이연 순증감

| | 내용 |
|-|------|
| 신규 이연 | 없음 |
| 해소 의도 | M0-1105-AL(#68 un-skip) — 미완: return/route.ts 미수정으로 미해소 |
| 현 CI 부채 | #61 void 400 버그(이 PR 핵심 기능), #68/#68b 미구현 un-skip |

---

## CHANGES 필요 사항

1. **[Blocker] #61 수정**: `cancelOrderFulfillmentWorkflow` 가 CI에서 실패하는 원인 확인 후 route 또는 테스트 fixture 수정.
2. **[Blocker] #68/#68b**: `it.skip` 으로 되돌려 CI를 초록으로 복구. (M0-1105-AL 은 별도 PR에서 처리)
