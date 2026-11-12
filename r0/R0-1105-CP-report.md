# R0-1105-CP 리포트 — storeport #225 재리뷰 (M2-1105-AX 반영)

**날짜**: 2026-11-12  
**판정**: ✅ **APPROVE**  
**근거**: R0-1105-CM CHANGES 3건 전부 코드·테스트 수준에서 해소 확인. main 충돌 없음. #224 파일 겹침 없음.

---

## 판정

```
#225  APPROVE — CM 3건(prod-shape-seed 충돌·no_fulfillment guard·#2 테스트 묵살) 완료. main 충돌 없음. #224 겹침 없음.
```

---

## 검증 표

| 항목 | 파일:줄 | 결과 |
|---|---|---|
| **[1] prod-shape-seed.ts 충돌** | `_helpers/prod-shape-seed.ts` (main #223 버전 채택) | ✅ |
| spec 필드 호환 (order_id / active_reservation_id / stock_location_id) | `open-order-reservations.spec.ts:12` import 확인 | ✅ |
| **[2] handleCompleteOrder no_fulfillment guard** | `release-stale-reservations/route.ts` `handleCompleteOrder` 함수 — `packed_at != null && canceled_at == null` 없으면 `400 { type: "no_fulfillment" }` | ✅ |
| UI no_fulfillment 토스트 | `stock-cleanup/page.tsx` `handleCompleteOrder` catch — `msg.includes("no_fulfillment")` → "No valid fulfillment" 토스트 | ✅ |
| **[3] #2 테스트 추가** | `open-order-reservations.spec.ts` `#2` — order_id 누락 → 400 `invalid_data` / no_fulfillment 400 양쪽 가드 | ✅ |
| backdateReservation 묵살 → throw | `open-order-reservations.spec.ts:28-35` — `dbConnection.raw()` 직접 사용, try-catch 없음 | ✅ |
| CI pos-integration | M2-1105-AX-report.md 로컬 4/4 통과 (GitHub check API 403) | ✅ |
| main 충돌 | base.sha = `7a7ad02` = 현재 main HEAD, M2-1105-AX rebase 확인 | ✅ |
| #224 파일 겹침 | #225: spec/page/route · #224: pos-tax-lines/tenders/package.json — 중복 없음 | ✅ |

---

## Kyu 실기 항목 — Admin Stock cleanup 화면

Admin > Stock cleanup 하단에 새로 생긴 "Open orders holding stock" 섹션 사용법:

1. **목록 보기**: 24시간 넘어 재고를 잡고 있는 pending 주문이 표 형태로 표시됩니다.
2. **선주문/배달 주문 숨김**: 선주문(preorder) · 배달 대기 주문은 기본으로 숨겨집니다. "Show expected pending" 버튼으로 볼 수 있습니다.
3. **Complete order** 버튼: fulfillment(출고 기록)가 있는 주문에만 표시됩니다. 클릭하면 Medusa `completeOrderWorkflow`를 실행합니다. fulfillment가 없으면 "No valid fulfillment — fulfill it first." 토스트를 띄우고 중단합니다.
4. **Release reservation** 버튼: fulfillment 없는 비정상 pending 주문에 표시됩니다. 클릭하면 경고 다이얼로그("Order is still open…")가 뜨고, 확인해야만 재고 예약을 소멸합니다.
5. **빈 상태**: 조건에 맞는 주문이 없으면 "No sale reservations" 문구만 표시됩니다.

> Kyu 실기 시 확인 포인트: 로케이션 선택 후 "Open orders holding stock" 섹션에 24h 이상 고착된 주문이 있으면 목록에 나타납니다. 선주문/배달 주문은 "Show expected pending" 없이는 보이지 않습니다.

---

## 이연 순증감

| 항목 | 변화 |
|---|---|
| **#225 CM 3건** | ✅ 완료 |
| void-refund-restock 이관, tenders 이관 (M2-1105-AV) | 무변화 |
