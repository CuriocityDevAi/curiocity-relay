PR #286 · 라운드 4개(A1~A4) · Kyu 질문 원문: "내 생각에는 Customer 에도 구매이력과 쌓인 포인트가 보여야하고, (이것은 customer view) Store Credit 에 쌓여야 할것같은데,(이것은 상점 view) 그 연결고리도 없어보여. 이거 어떤의도로 store credit 이라는 메뉴를 만든거지 ? 상점관점에서는 orders 라는게 있기때문에, 생각해보면, orders 메뉴에서 쌓인 포인트를 보면서, 사람별로 보고 싶으면 orders 에서 사람의 identifier 인 전화번호를 클릭하면, 그 사람의 매출및 포인트를 한번에 볼수있는 Customer 로 이동하면 될것같거든."

## 완료 항목

- `docs/plans/loyalty-admin-views-plan.md` 신설 (storeport · docs-only · PR #286 ready)

## (a) 대사표 요약

| 영역 | 플러그인·코어 이미 줌 | 우리가 덧붙일 것 | 신규 |
|---|---|---|---|
| Order 상세 사이드 | Refund to store credit 버튼 | ② `order.details.side.after` 위젯: 전화(마스킹) + 적립/사용 + Customer 링크 | — |
| Customer 상세 | Store Credit Accounts 카드 (IDR 잔액) | ③ `customer.details.after` 위젯: 매출합계·주문목록·포인트 내역 | — |
| Orders 목록 열 | ❌ 열 추가 불가 (widget zone 제약) | — | A4 별도 메뉴 (선택) |

## (c) Store Credits N/A 원인

`loyalty-plugin@2.17.2 .medusa/server/src/admin/index.js:5847` — `customer?.email ?? "N/A"` / POS loyalty 고객은 이메일 없이 생성(`decision-loyalty-20261114`).

## (d) 라운드 분할

- A1 (40분): `src/admin/widgets/order-loyalty-side.tsx` — Order 상세 loyalty 위젯
- A2 (45분): `src/admin/widgets/customer-loyalty-detail.tsx` — Customer 상세 loyalty 위젯
- A3 (20분): `docs/runbooks/store-credits-guide.md` — Store Credits 운영 안내
- A4 (45분, 선택): `src/admin/routes/loyalty-orders/page.tsx` — Orders 목록 loyalty 뷰 (Q1 결정 후)

## (e) Kyu 질문 3개

**Q1.** Orders 목록에서 loyalty 열을 바로 보려면 별도 "로열티 주문" 메뉴 페이지(A4)가 필요합니다. 먼저 Order 상세 위젯(A1)으로 시작할까요, 아니면 목록 페이지도 같이 만들까요?

**Q2.** Customer 상세에서 주문 내역 범위 — 로열티 연결 주문만(customer_id 있는 POS 주문, 권장) vs 전체 주문 중 어떻게 할까요?

**Q3.** Store Credits 메뉴 이름이 "Store Credits"로 고정돼 변경이 어렵습니다. 그대로 쓰면서 "전체 포인트 장부"로 운영자에게 설명하는 방식이 괜찮을까요, 아니면 숨길까요?
