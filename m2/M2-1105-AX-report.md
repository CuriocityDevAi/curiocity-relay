# M2-1105-AX 리포트 — #225 R0-1105-CM CHANGES 3건 반영

**날짜**: 2026-11-12  
**브랜치**: feat/m2-1105-aw-open-order-reservations  
**커밋**: ddc2b26 (최종)

---

## 항목 표

| 항목 | 파일:줄 | 커밋 | 판정 |
|---|---|---|---|
| origin/main(7a7ad02) rebase | feat/m2-1105-aw-open-order-reservations | 444b401 | ✅ |
| prod-shape-seed.ts 충돌 → main(#223) 버전 채택 | `_helpers/prod-shape-seed.ts` | d7ac9e9 | ✅ |
| spec 필드 호환 확인 (order_id/active_reservation_id/stock_location_id) | `open-order-reservations.spec.ts` | d7ac9e9 | ✅ |
| handleCompleteOrder 서버 guard (packed_at!=null && canceled_at==null) | `release-stale-reservations/route.ts:402-454` | d7ac9e9 | ✅ |
| no_fulfillment → 400 { type: "no_fulfillment" } | `route.ts:437-440` | d7ac9e9 | ✅ |
| UI no_fulfillment 토스트 ("No valid fulfillment") | `stock-cleanup/page.tsx:284-294` | d7ac9e9 | ✅ |
| #2 order_id 누락 → 400 invalid_data 테스트 | `open-order-reservations.spec.ts:89-100` | d7ac9e9 | ✅ |
| #2 no_fulfillment 400 테스트 | `open-order-reservations.spec.ts:102-128` | d7ac9e9 | ✅ |
| backdateReservation catch 묵살 → throw / dbConnection.raw() 사용 | `spec.ts:33-49` | ddc2b26 | ✅ |

---

## CI pos-integration 결과

### 로컬 실행 로그

```
PASS integration-tests/pos/open-order-reservations.spec.ts (10.168 s)
  M2-1105-AW · Open orders holding stock
    ✓ #1 pending 오래된 주문이 query_open에 표시됨 (905 ms)
    ✓ #2 order_id 누락 → 400 / fulfillment 없는 주문 → no_fulfillment 400 (890 ms)
    ✓ #3 안 건넌 pending → release_one → 예약 소멸 (539 ms)
    ✓ #4 최근(24h 이내) 주문은 query_open에 표시 안 됨 (523 ms)

Tests: 4 passed, 4 total
```

---

## PR #225 본문 확인 항목

- [x] prod-shape-seed.ts 충돌 해소 (AW 버전 제거, main #223 버전 사용)
- [x] spec 필드 호환 (order_id / active_reservation_id / stock_location_id)
- [x] handleCompleteOrder 서버 guard (no_fulfillment 400)
- [x] UI no_fulfillment 토스트
- [x] #2 테스트 추가 (order_id 누락 400 + no_fulfillment 400)
- [x] backdateReservation 묵살 → throw + dbConnection.raw 사용

---

## git ls-tree

```
100644 blob 881633786581da842928aea7c49ac8d22f48bef2  open-order-reservations.spec.ts
100644 blob 00793ae5858f60b356ac545ff98297810524b76a  release-stale-reservations/route.ts
100644 blob 23f7a88b00097b49e0d04d5c586ffde1ca37ea4a  stock-cleanup/page.tsx
_helpers/prod-shape-seed.ts → origin/main(#223) 버전
```

---

## 이연 순증감

| 항목 | 변화 | 비고 |
|---|---|---|
| "pending 고착 주문 cleanup" UI 구현 | ✅ 소멸 | #225 수정 완료 → 머지 대기 |
| completeOrderWorkflow 재시도 보조 도구 | ✅ 소멸 | guard 추가 완료 |
| void-refund-restock 이관 (M2-1105-AV 이연) | 무변화 | AX 이후 |
| tenders 이관 (M2-1105-AV 이연) | 무변화 | AX 이후 |
| **#225 Kyu 수정 3건** | ✅ 완료 | prod-shape-seed·guard·#2 테스트 |
