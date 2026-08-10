# M0-0729-AN · 심문 · POS 현금 판매 fulfillment 정책

**일자**: 2026-08-10 · **허브**: M0 storeport · **관련**: AN-3

---

## 배경

Medusa Admin Orders 목록 화면에 각 Order 옆 "Not fulfilled" 배지가 붙는다.

- **fulfillment 상태 ≠ payment 상태**
  - `payment_status`: 결제 상태 (예: `paid`, `awaiting`)
  - `fulfillment_status`: 배송/픽업 준비 상태 (예: `not_fulfilled`, `fulfilled`, `shipped`)
- Medusa 기본: 관리자가 별도로 "Create Fulfillment" 를 눌러야 fulfilled 로 전환됨 (배송 상품 워크플로우 전제)

POS 매장 현금 판매의 실제 맥락:

- 손님이 현금 지불 · 상품 즉시 인도 (매장 픽업 완결)
- 사장 화면에서 fulfillment 를 별도로 눌러야 하는 이유가 사실상 없음
- 그러나 "재고 감소", "회계 마감", "환불 정책" 등에서 fulfillment 시점이 의미를 가질 수 있음

---

## 심문 (3옵션 회부)

**Q1. POS 현금 판매 완료 시 fulfillment 자동화 정책?**

- **(a) 즉시 자동 fulfilled** · POS Checkout Complete = 상품 즉시 인도 = 완결로 간주 · Orders 화면에서 "Fulfilled" 로 즉시 노출 · 재고도 즉시 confirmed_deducted
- **(b) 수동 유지 (Medusa 기본)** · 사장 화면에서 별도 "Fulfillment 처리" 필요 · 재고는 판매 시점 reserved 만
- **(c) 옵션화** · 매장별 설정 (stock_location.metadata 또는 register_session 설정) · 기본값은 (a)

**Q2. 만약 (a) 채택 시 · 반품/환불 처리 시 재고 복원은?**

- **(가)** 자동 reverse (환불 처리 시 재고 자동 복구)
- **(나)** 수동 처리 유지 (사장이 별도 재고 조정)
- **(다)** 반품 사유 코드에 따라 분기 (파손=반영 X · 단순변심=복구)

**Q3. Q1=(a) 채택 시 · fulfillment 자동화 구현 위치?**

- **(A)** 백엔드 subscriber (order.placed 이벤트 훅 · POS-only 조건 판단은 metadata.register_session_id 유무로)
- **(B)** 앱 (fork) Checkout Complete 후 명시적 POST /admin/orders/:id/fulfillments (AN 우회 방식과 동일 패턴)
- **(C)** 둘 다 (subscriber 백본 + 앱 fallback)

---

## 관련 이연 (참고)

- Subscriber `order.placed` 미발화 뿌리 규명은 별건 유지 · 위 Q3=(A) 채택 시 이 이연 함께 해소 필요
- payment_collection 자동 생성 (draft-order convert 경로) 도 별건 · fulfillment 와 병행 정리 가능

---

*M0-0729-AN-inquiry · 2026-08-10*
