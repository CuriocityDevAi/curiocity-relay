# Void·재고 실기 결과 — 2026-11-12 09:17 WIB (Kyu 원문 · iPad · #219 9e133d2 · #218 f106450 머지 뒤)

스샷 3장: Order #66 (Coffee Latte Hot · 현금 33,000 받음 · 거스름 3,000) Void 후 주문 상세 · VOID 영수증 · Hand over 실패 toast(`fulfillment create failed: Order with id order_01M76QZRMQEE3478B8J96R6JGZ has been canceled.`).

## Kyu 원문

1. 성공
2. ~ 4번까지 : 여기서부터는 이상한것들이 많아. 내가 알려줄게.  먼저 내가 테스트할려고 하는것은 SOOPSOK-COFFEE-LATTE-HOT 이야. admin Inventory 기준, Reserved 11, In stock 100, Available 89 상태임.  SOOPSOK-COFFEE-LATTE-ICED 는 Reserved 0, In stock 100, Available 100 이야, 내가 아이패드 앱으로 Coffee Latte 를 선택하고, Hot 을 선택하면 In stock 이 189 left 라고 나와있어. 즉, inventory 와 맞지않아. 아이패드 앱에서 Iced 를 눌러봐도 In stock 이 189 left 로 되어있음. 즉, 아이패드앱에서는 Hot 과 Iced 를 합쳐서 189로 계산한것같아. 근데 그러면 안되고, Hot 메뉴를 눌렀을때의 in stock 과 Iced 를 눌렀을때는 Iced 의 재고 (in stock) 이 각각 admin에서 조회되는 inventory 항목에 맞게 나와야하거든. 내 생각에는, In stock 을 보여주는게 아니라, In stock 에서 Reserved 카운트를 뺀, Available  수치를 아이패드에서  보여주는게 맞아보여. 일단, Hot 1개를 아이패트에세ㅓ Add to cart 해보면, Cart 화면으로 넘어가는데, > Checkout > Pay > Process Payment > Hand Over 을 눌러보면 Admin Inventory 에서  SOOPSOK-COFFEE-LATTE-HOT 을 조회하면, Reserved 11, In stock 99, Available 88로 나와.  일단, 여기까진 맞는것 같고,,

5. Void 버튼을 누르고, 4자리 PIN 을 넣으면 (성공)
6. Receipt 에 숲속의 과자점 로고 위에 붉은색으로 VOID 라고 찍혀(일단 색깔이 안예뻐. 그냥 검은색으로 바꿔줘)  Order Details 에 보면, 일단 Order Status Canceled, Payment Status Captured, Fulfillment Status Canceled 라고 나오는데 이게 맞아? 그리고 그 밑에 금액계산도 뭔가 이상해.  그 밑에 Payments 라고 나오는 부분(박스처럼)은 Payments에 관련된 history 라고 한다면, 원거래 33,000 rp 에 대해서 거래한 기록과, 33,000 에 대해서 void 처리한 기록이 둘다 나와야하는거 아닐까? Hand over 을 하면 오류가 나.  그리고 지금 상태에서 admin  inventory를 보면, Reserved 가 12, instock 100, available 88 로 되어있어. 이 숫자도 이상해.  내 생각에 Hand over 이라는 버튼 보다는, 물건을 다시 돌려받았다 라는 의미의 버튼이 맞지않을까? 즉, 5번단계에서 4자리 PIN 을 넣고 성공해서 VOID Receipt가 나왔다는것은, 실제 이 시점에 돈을 다시 돌려받아야 하는거고, Hand over 대신에 Product Return 같은 버튼을 누르면 다시 재고가 원복되는 그런 흐름이 맞아보여. 너는 어떻게 생각해?

## 오케 정리 (요구 목록 · 원문 대응)
- R1 앱 품목 재고 = 옵션(variant)별 + Available(In stock − Reserved) 표시 — 현재 Hot·Iced 합산 189 (Kyu 결정).
- R2 VOID 영수증 글자 = 검정 (Kyu 결정).
- R3 Void 뒤 Reserved +1 (11→12) · Available 그대로 88 = 버그 (기대 89).
- R4 Reserved 11 찌꺼기 예약 정체 확인·정리.
- R5 Void 뒤 Payment Status Captured → Refunded 가 맞음 (오케 판단).
- R6 Paid Total 33,000 · Outstanding −3,000 = 받은 돈(거스름 포함)을 결제액으로 기록 — 결제액 30,000 + 받은 돈/거스름 별도가 맞음 (오케 판단).
- R7 Payments 표 = 원결제 줄 + Void 환불 줄 둘 다 (Kyu 제안 · 오케 동의).
- R8 Void 된 주문에 Hand over 버튼 노출 → 누르면 오류. Void 뒤 버튼 흐름은 Kyu 결정 대기 (Product Return 제안 vs Void 순간 재고 처리).

## 발부
- M1-1105-AZ (진단 · 코드 0) — R1 R3 R4 R5 R6 R7 R8 원인 file:line. 수정 발부는 진단 착지 + Kyu R8 결정 뒤.
