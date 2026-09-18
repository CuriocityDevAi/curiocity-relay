# POS 코어 갭 설계 보고서 (M0-0918-I · Kyu 09-18 R042)

**정본 원문 (Kyu 09-18)**: "굵직한 것 먼저 · 있는 기능 다 쓰기".

**성격**: 설계 · 결정 요청 문서 (코드 변경 zero). 매장 하루 흐름 기준으로 코어에 있는 기능 중 앱에 없는 것을 나열 · 판단 · 화면 스케치 · 라운드 계획.

**Kyu 결정 필요 항목** (§7 요약):

1. 아래 §4 "화면 설계" 중 라운드 1 착수 순서 · 프로모션+재고 배지 를 먼저 vs 이행 코어화 를 먼저.
2. **결제 total=0 결함 (Kyu 09-18)** 뿌리 해소 시점 = 라운드 1 동반 fix or 별건 hot?
3. 반품(RMA) 도입 시점 = 라운드 2 or 라운드 3.

---

## 0. 매장 하루 흐름 (판단 기준)

```
[개점] → [상품 진열] → [손님 문의] → [장바구니] → [결제(현금·카드·QRIS)] →
[이행: 즉시 인도 or 예약 인도] → [수금] → [환불·교환(간헐)] → [마감·Z 리포트] → [정산·WA 복사]
```

- **빈도 높음**: 개점 · 상품 조회 · 결제 · 이행 · 마감 (매일).
- **빈도 중**: 프로모션 (주간) · 재고 재확인 (일간) · 수금 (일 1-2회).
- **빈도 낮음**: 반품/교환 (주 1-2회) · 고객 등록 (단골만).

---

## 1. 갭 목록 (Medusa v2 코어 기능 · POS 화면)

**범례**: 상태 = `없음` · `부분` · `우회` · `있음`.

### 1.1 결제 (Payment)

| 코어 API/워크플로                                                                            | 앱 상태                                                       | 매장 의미                                             |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| `createOrderPaymentCollectionWorkflow` + `markPaymentCollectionAsPaid` (`pp_system_default`) | 있음 (POS 소비)                                               | 매 결제마다 컬렉션 생성 + 캡처 = Paid                 |
| Payment provider 등록 (Midtrans/Xendit)                                                      | **없음** (스캐폴드만)                                         | 실 결제사 연동 없이 "가짜 캡처" · 정산·환불 근거 불명 |
| 환불 (`refundPaymentCollectionWorkflow`)                                                     | **없음**                                                      | 매장 환불 손으로 · 서랍/원장 불일치 위험              |
| Payment methods 목록 UI                                                                      | 부분 (Cash/Card/QRIS 3택 UI만 · Medusa payment_provider 무관) | 앱 라벨 ↔ 코어 provider 매핑 부재                     |
| **[결함] order.total=0 뿌리**                                                                | 우회                                                          | pos-complete 400 "total must be > 0" · 결제 자체 막힘 |

### 1.2 이행 (Fulfillment · Shipping · Pickup)

| 코어 API/워크플로                                  | 앱 상태                                      | 매장 의미                                              |
| -------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `createOrderFulfillmentWorkflow` (manual provider) | 있음 (POS 소비)                              | 이행 생성 = 인도 완료 표시                             |
| `pickup_slot` 모듈 · 픽업 시간 예약                | **없음** (모듈 스캐폴드)                     | 케이크 등 예약 픽업 = 손 관리 · 시간 실수 시 손님 불만 |
| 배송 provider · 주소 검증                          | **없음**                                     | POS 인도만 · 배송 요구 시 대응 없음                    |
| Fulfillment 상세 (수량·이유·담당)                  | 부분 ([Mark fulfilled] deferred UI · 메모만) | 부분 이행·수량 조정 안 됨                              |

### 1.3 반품 · 교환 · 클레임 · 취소 (RMA)

| 코어 API/워크플로                    | 앱 상태  | 매장 의미                                     |
| ------------------------------------ | -------- | --------------------------------------------- |
| `createReturnWorkflow` (수량 · 이유) | **없음** | 상한 케이크 손 반환 · 원장 미기록 · 재고 왜곡 |
| `createExchangeWorkflow`             | **없음** | 같은 금액 다른 상품 = 손 처리                 |
| `createClaimWorkflow` (파손 등)      | **없음** | 미기록                                        |
| `cancelOrderWorkflow`                | **없음** | 이미 결제 완료된 주문 취소 = 손 refund        |

### 1.4 재고 · 예약 · 위치 (Inventory · Reservation · Stock Location)

| 코어 API/워크플로                         | 앱 상태                                  | 매장 의미                            |
| ----------------------------------------- | ---------------------------------------- | ------------------------------------ |
| Stock Location CRUD                       | 있음 (Setup Wizard · Settings)           | 매장 1개 = OK · 다매장 대응 zero     |
| Inventory level · reservation             | **없음** (상품 조회 시 재고 숫자 미노출) | 재고 없는 상품 판매 가능 · 손님 실망 |
| `bulkAdjustInventoryWorkflow` (재고 조정) | **없음**                                 | 실 재고 손 조정 = 매장 직원 수기     |

### 1.5 프로모션 · 캠페인 (Promotion)

| 코어 API/워크플로                                  | 앱 상태                                | 매장 의미                                   |
| -------------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| Promotion CRUD (Admin) + `applyPromotionsWorkflow` | **없음** (앱에 promotion 적용 UI 없음) | 아침 세일 · 단골 할인 = 손 계산 · 누락 위험 |
| Campaign (기간 프로모션)                           | **없음**                               | 주간 세일 캠페인 관리 zero                  |

### 1.6 고객 · 그룹 (Customer)

| 코어 API/워크플로              | 앱 상태                                       | 매장 의미                     |
| ------------------------------ | --------------------------------------------- | ----------------------------- |
| Customer CRUD                  | 우회 (POS 기본 `noreply+pos-guest@agilo.com`) | 단골 이력 · 개인 할인 zero    |
| Customer group · 등급          | **없음**                                      | VIP · 단골 그룹 분리 zero     |
| Customer 주소 · 전화 · WA 링크 | **없음**                                      | WA 발송 링크 · 픽업 전화 zero |

### 1.7 가격 목록 (Price List)

| 코어 API/워크플로               | 앱 상태  | 매장 의미                           |
| ------------------------------- | -------- | ----------------------------------- |
| Price List (기간 · 고객 그룹별) | **없음** | 요일별 가격 · 이벤트 가격 관리 zero |

### 1.8 판매 채널 (Sales Channel)

| 코어 API/워크플로  | 앱 상태                        | 매장 의미                               |
| ------------------ | ------------------------------ | --------------------------------------- |
| Sales Channel CRUD | 있음 (Setup Wizard · Settings) | POS 단일 채널만 · 온라인/도매 대응 zero |

### 1.9 드래프트 주문 (Draft Order)

| 코어 API/워크플로                      | 앱 상태                    | 매장 의미                     |
| -------------------------------------- | -------------------------- | ----------------------------- |
| Draft Order CRUD · convert to Order    | 있음 (Cart 흐름)           | Cart = 드래프트 · 확정 = 주문 |
| Draft Order 저장·복원 (다중 손님 대응) | **없음** (단일 draft only) | 손님 2 그룹 동시 접수 불가    |

### 1.10 알림 (Notification)

| 코어 API/워크플로                        | 앱 상태                    | 매장 의미                       |
| ---------------------------------------- | -------------------------- | ------------------------------- |
| Notification provider (email · SMS · WA) | 부분 (WA 텍스트 수동 복사) | 자동 발송 zero · 픽업 안내 수동 |

### 1.11 세금 (Tax)

| 코어 API/워크플로 | 앱 상태            | 매장 의미           |
| ----------------- | ------------------ | ------------------- |
| Tax rate · region | 있음 (region 세팅) | 세금 자동 계산 = OK |

### 1.12 스토어 크레딧 · 기프트카드 (Store Credit · Gift Card)

| 코어 API/워크플로        | 앱 상태  | 매장 의미                 |
| ------------------------ | -------- | ------------------------- |
| Gift Card CRUD · 적용    | **없음** | 생일 상품권 · 사은품 zero |
| Store Credit (환불 대체) | **없음** | 반품 시 크레딧 적립 zero  |

---

## 2. 판단 (지금 · 다음 · 안 넣음)

### 2.1 분류표

| 항목                                   | 판단                                         | 근거 (매장 하루 흐름)                                               |
| -------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| 결제 total=0 결함 fix                  | **지금**                                     | **결제 자체 막힘 · 매출 zero** (Kyu 09-18 실측)                     |
| 결제 provider 정식화 (Midtrans/Xendit) | **다음**                                     | 정산·환불 근거 필요 · K13 EDC 실물 도입 시                          |
| 환불 (RMA)                             | **지금 (라운드 2)**                          | 주 1-2회 · 원장 왜곡 방지 필수                                      |
| 이행 코어 활용 (pickup_slot 실체)      | **지금**                                     | 케이크 예약 = Soopsok 핵심 흐름 · 이미 fulfillment_policy 관례 있음 |
| 프로모션 배지 (앱)                     | **지금**                                     | 주간 세일 · 손님 인지 필수                                          |
| 재고 배지 (품절 표시)                  | **지금**                                     | 매일 · 손님 실망 방지                                               |
| 고객 검색·연결                         | **다음**                                     | 단골 관리 요구 있음 · 그러나 우선순위 낮음                          |
| 가격 목록 (요일별)                     | **안 넣음 (Admin)**                          | 빈도 낮음 · Admin UI 로 충분                                        |
| Gift Card                              | **안 넣음 (Admin · Phase 2)**                | Soopsok 현 수요 zero                                                |
| 배송 provider                          | **안 넣음 (Wing 담당)**                      | POS = 픽업 전용 · 배송은 Wing (온라인 몰)                           |
| 다중 draft order (여러 손님)           | **다음**                                     | 붐빌 때만 · 빈도 중                                                 |
| 알림 자동화 (WA 발송)                  | **다음**                                     | 픽업 리마인더 (케이크 · 단골) · 유용                                |
| 클레임 (파손)                          | **다음** (RMA 와 함께)                       | 반품과 흐름 유사                                                    |
| 취소 (완료 주문)                       | **지금 (라운드 2 with RMA)**                 | 잘못 결제 시 필요                                                   |
| Scan (바코드)                          | **부분 있음** (앱 tab 존재 · 실 기능 미실측) | 라운드 3 실측 · 개선                                                |
| 다중 Stock Location                    | **안 넣음 (다매장 Phase 3)**                 | Soopsok 단매장 · 미래                                               |

### 2.2 "지금 넣어야" 목록 (라운드별 분배)

**라운드 1 (M0-0919-A · 굵직한 것 · 결제·이행·상품)**:

1. 결제 total=0 결함 fix (뿌리 §4.1)
2. Payment provider 매핑 (Cash → pp_system · Card/QRIS → 실 provider slot · 기본은 pp_system 유지)
3. 프로모션 자동 적용 + 앱 배지
4. 재고 배지 (품절 표시)

**라운드 2 (M0-0919-B · 반품·픽업·주문 편의)**: 5. RMA (반품·교환·취소) UI + cash_movement(refund) 신설 6. Pickup slot 모듈 실체화 + 앱 예약 픽업 시간 UI 7. 다중 draft order (여러 손님 동시)

**라운드 3 (M0-0919-C · 고객·알림·Scan)**: 8. 고객 검색·연결 UI 9. WA 자동 알림 (픽업 리마인더 · 결제 확인) 10. Scan 바코드 흐름 실측·개선

**라운드 4 (M0-0919-D · 소소한 마감)**: 11. 결제수단 chip 연동 완결 (result 응답 · Orders 목록 반영) 12. 영어 잔여 (Login · Products · Setup Wizard · Settings) 13. Text 컴포넌트 typography 토큰 강제 (하드코딩 0) 14. 결제 완료 화면 재설계 (영수증 요약 · [New sale])

---

## 3. 화면 설계 · 라운드 1 상세

### 3.1 결제 total=0 결함 fix

**뿌리** (§4.1 이관):

- `pos-complete/route.ts:175` `const total = toNum(order.total ?? order.raw_total);` 에서 `order.total = 0`.
- `orderModule.retrieveOrder(order_id, { select: ["total", "raw_total", ...] })` = 모듈 서비스 직접 호출 · Medusa v2 는 derived field (total) 를 remote query 로만 계산 · 모듈 서비스는 raw column 만 반환.
- 결과: `total=0` → `400 order total must be > 0` → 결제 막힘.

**수정 위치** (다음 라운드 코드):

- `apps/commerce-core/src/api/admin/register-sessions/[id]/pos-complete/route.ts:113~135` retrieveOrder 를 remote query 로 대체:
  ```
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: [order] } = await query.graph({
    entity: "order",
    fields: ["id", "total", "raw_total", "metadata", "items.*", "payment_collections.*"],
    filters: { id: order_id },
  });
  ```
- OR items 합산 fallback (subtotal + tax_total - discount_total) · toNum 강화.

**공수**: **S** (1일 이내). **리스크**: query graph 필드 오탈자 · 기존 `orderModule.updateOrders` 호출 계약 변경.

**착지 조건**: 실 결제 성공 · Orders 목록에 Paid 배지 · Z 리포트 합계 정합.

### 3.2 Payment provider 매핑 (Cash · Card · QRIS)

**현재**: 앱 라벨 (Cash/Card/QRIS) ↔ 코어 provider 매핑 없음. 모두 `pp_system_default` 로 캡처.

**설계**:

- 코어에 provider 3 개 등록: `pp_system_cash` · `pp_system_card` · `pp_system_qris` (모두 `pp_system` 기반 · id 만 다름).
- `pos-complete` 에서 payment_method 에 따라 provider id 매핑:
  - cash → `pp_system_cash`
  - card → `pp_system_card`
  - qris → `pp_system_qris`
- 이후 실 Midtrans/Xendit 도입 시 provider 만 교체.

**화면**: 변경 없음 (앱 UI 는 동일 · 코어 매핑만 정본화).

**공수**: **S** (반나절). **리스크**: 기존 결제 완료 주문 재처리 = 필요 없음 (신 결제부터).

### 3.3 프로모션 배지 (앱)

**설계**:

- Products 목록 카드 상단 우측 = 프로모션 배지 (예: `-10%` · `2 for 1`).
- Product Details 화면 = 프로모션 조건 · 종료 시각 표시.
- Cart · Checkout = 자동 적용 (`applyPromotionsWorkflow`).
- 소스: `sdk.admin.promotion.list()` + product-level campaign 매칭.

**와이어프레임 (Products 카드)**:

```
┌──────────────────┐
│ [사진]     [-10%] │  ← 프로모션 배지 (빨강)
│ Chocolate Cake   │
│ Rp 350,000       │
└──────────────────┘
```

**공수**: **M** (2-3일). **리스크**: 프로모션 종료 timezone · 캐시 stale.

### 3.4 재고 배지 (품절 표시)

**설계**:

- Products 카드 = 재고 0 상품 회색 처리 + "Out of stock" 배지.
- Product Details = "N in stock" 표시 (5 이하 노랑 · 0 빨강).
- 소스: `sdk.admin.inventoryItem.list()` + reservation.

**와이어프레임**:

```
┌──────────────────┐
│ [사진]  [품절]     │  ← 회색 카드
│ Chocolate Cake   │
│ (터치 시 안내)   │
└──────────────────┘
```

**공수**: **S** (1-2일). **리스크**: 재고 캐시 stale · 실 재고 변동 시 UI 지연.

### 3.5 라운드 1 API 매핑

| 화면·기능             | 코어 API/워크플로                                      | 데이터 흐름                                                          |
| --------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| 결제 total=0 fix      | `query.graph({ entity: "order", fields: [...] })`      | 앱 → pos-complete → query graph → derived total → payment_collection |
| Payment provider 매핑 | provider 3 등록 · `pos-complete` 라우팅                | 앱 payment_method → route.ts → provider id 선택 → mark-paid          |
| 프로모션 배지         | `sdk.admin.promotion.list` · `applyPromotionsWorkflow` | 앱 → promotion.list → product 매칭 → 배지 렌더                       |
| 재고 배지             | `sdk.admin.inventoryItem.list` + reservation           | 앱 → inventoryItem.list → product 매칭 → 배지 렌더                   |

---

## 4. 결제 total=0 결함 뿌리 (Kyu 09-18)

### 4.1 뿌리 진단

`apps/commerce-core/src/api/admin/register-sessions/[id]/pos-complete/route.ts:113~181`:

```typescript
order = await orderModule.retrieveOrder(order_id, {
  select: ["id", "total", "raw_total", "metadata", "items.id", ...],
  relations: ["items", "payment_collections"],
});
...
const total = toNum(order.total ?? order.raw_total);
if (total <= 0) {
  res.status(400).json({ type: "invalid_data", message: "order total must be > 0" });
  return;
}
```

**문제**: Medusa v2 의 **module service** (`orderModule.retrieveOrder`) 는 raw DB column 만 반환. `total` 은 **derived field** (line item total 합 · tax · discount) 로 remote query 시점에만 계산.

**증상**: 실 주문 (items 있음 · 정상 결제) 에서 `order.total = 0` (혹은 undefined) → `total <= 0` → 400.

### 4.2 수정 (다음 라운드 · 라운드 1 동반)

**옵션 A** (권장): remote query 사용.

```typescript
const query = container.resolve(ContainerRegistrationKeys.QUERY);
const { data: orders } = await query.graph({
  entity: "order",
  fields: [
    "id",
    "total",
    "raw_total",
    "item_total",
    "tax_total",
    "discount_total",
    "metadata",
    "items.*",
    "items.product_id",
    "payment_collections.*",
  ],
  filters: { id: order_id },
});
const order = orders[0];
```

**옵션 B** (폴백): items 수동 합산.

```typescript
const itemsTotal = (order.items ?? []).reduce(
  (sum, it) => sum + toNum(it.subtotal ?? it.total ?? 0),
  0,
);
const total =
  itemsTotal + toNum(order.tax_total ?? 0) - toNum(order.discount_total ?? 0);
```

**권장**: A + B 병용 (A 실패 시 B 폴백).

### 4.3 회귀 방지

- 통합 테스트 (별건 · Postgres 시딩 필요) · 실 주문 1건 결제 → total 정본 확진.
- 앱 Not Paid 배지 재시도 액션 (M0-0918-E 착지본) 은 이 fix 이후에도 유용 (다른 실패 케이스 대응).

---

## 5. 단계 계획 (라운드 4 개)

### 5.1 개요

| 라운드        | 성격                  | 무엇                                                                                   | Kyu 실기 항목                                                                                                         |
| ------------- | --------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **M0-0919-A** | 굵직 · 결제·상품      | 결제 total=0 fix · payment provider 매핑 · 프로모션 배지 · 재고 배지                   | K1~K4 (Login · Open · Cash · Card 결제 정상) + K9 (프로모션 상품 결제 · 할인 반영) + K10 (품절 상품 회색 · 담기 불가) |
| **M0-0919-B** | 굵직 · 반품·픽업      | RMA (반품/교환/취소) + cash_movement(refund) · Pickup slot 실체 + 예약 UI · 다중 draft | K11 (반품 · 서랍 -X) + K12 (케이크 예약 픽업 시간 15:00 지정) + K13 (다중 손님 draft)                                 |
| **M0-0919-C** | 굵직 · 고객·알림·Scan | 고객 검색·연결 · WA 자동 알림 · Scan 바코드 실측                                       | K14 (단골 검색 후 결제 · 이력 반영) + K15 (WA 픽업 리마인더 자동 발송) + K16 (Scan 상품 담기)                         |
| **M0-0919-D** | 소소 마감             | 결제수단 chip 완결 · 영어 잔여 · typography 강제 · 결제 완료 재설계                    | K17 (Orders chip 정본) + K18 (모든 화면 영어) + K19 (폰트 통일 확진) + K20 (결제 완료 receipt)                        |

### 5.2 굵직 3 라운드 (M0-0919-A/B/C) · Kyu 실기 요약

- **A**: 결제가 되어야 하는 것 · 상품이 정확히 보여야 하는 것 (품절·프로모션).
- **B**: 매장 운영이 안전해야 하는 것 (반품·픽업·복수 손님).
- **C**: 손님 서비스가 좋아지는 것 (단골·알림·바코드).

### 5.3 마지막 D 라운드 = 소소한 마감

- 굵직한 것 이후 · UI·문자열·폰트 마감. Kyu 실기 부담 낮음.

---

## 6. 오케 제안 5순위 재정렬 (근거 명기)

| 오케 순위               | 본 문서 순위 (M0 판단)                                         | 근거                                            |
| ----------------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| 1. 결제 provider 정식화 | **다음 (M0-0919-A 매핑 스텁 + 실 provider 는 Phase 2 K13 후)** | 실 EDC 없음 · pp_system 매핑 정본화만 지금      |
| 2. 이행 코어 활용       | **라운드 2 (M0-0919-B)**                                       | 케이크 픽업 슬롯 = 매장 핵심 · 반품과 같이 처리 |
| 3. 프로모션 + 재고 배지 | **지금 (M0-0919-A)**                                           | 매일 · 손님 인지 필수                           |
| 4. RMA                  | **라운드 2 (M0-0919-B)**                                       | 원장 왜곡 방지 · 반품 없이 신뢰 X               |
| 5. 고객 연결            | **라운드 3 (M0-0919-C)**                                       | 단골 유용하나 결제·재고보다 후순위              |
| (+) Scan                | **라운드 3 (M0-0919-C)**                                       | 이미 앱 탭 존재 · 실측 후 개선                  |

**M0 재정렬 이유**: 매장 하루 흐름의 **결제 → 상품 → 이행 → 반품 → 고객** 순서를 따름. Kyu 09-18 total=0 결함이 blocker 이므로 라운드 1 시작점.

---

## 7. Kyu 결정 필요 항목 (3 개 이내)

1. **라운드 1 착수 순서**: 결제 total fix (blocker) 는 확정 · 그 다음 프로모션 배지 먼저 vs 재고 배지 먼저 · 페어링 가능? (**M0 제안: 병렬 착지 · S 공수 둘 다**)
2. **결제 total=0 결함 hotfix vs 라운드 1 동반**: 지금 즉시 별건 핫픽스 (하루) vs M0-0919-A 안에서 함께 (다른 3 항목과 같이). (**M0 제안: 별건 hotfix M0-0919-Z 로 오늘 착지 · 나머지는 다음 주**)
3. **RMA 도입 시점**: 라운드 2 확정 · 그러나 cash_movement(refund) 스키마 변경 = migration 필요 · Kyu 매장 실 반품 발생 빈도에 따라 라운드 1 로 앞당길지. (**M0 제안: 라운드 2 유지 · 단 라운드 1 fix 릴리즈 후 1주 관측 후 재판정**)

---

## 8. 참조

- `docs/plans/upstream-vs-ours.md` (M0-0918-E · M0-0918-G · 3 칸 대사표)
- `docs/decisions/ADR-0013-fulfillment-policy.md` (M0-0918-C · fulfillment policy)
- `apps/commerce-core/src/api/admin/register-sessions/[id]/pos-complete/route.ts:113~181` (결제 total=0 뿌리)
- Medusa v2 Docs (payment · fulfillment · promotion · inventory · rma)

---

_M0-0918-I · 2026-09-18 · POS 코어 갭 설계 · 4 라운드 계획 · Kyu 결정 3항 · 코드 변경 zero_
