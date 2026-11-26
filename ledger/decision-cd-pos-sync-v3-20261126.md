# CD↔POS 동기화 — Case 1 재실기 (Kyu 11-26 14:19 WIB)

환경: POS web fork master(#270 #271 #272 포함 · 2669fb0) · CD 운영 admin.meros.id (storeport main #452 a6b693c 배포 후)
선행: decision-cd-pos-sync-v2-20261126 (CD-1~5 · POS-1~6)

## Kyu 원문
- "LG-1, 2, 3 : all ok"
- "1. 대기화면 : 첨부1. 처음 접속했는데, 그래서 Sell 화면으로 들어갔는데, 손님화면에 phone entry skipped 라고 과거상태를 보여줘. POS 쪽에 Sell 화면이면서 당장 진행중인 결제건이 없다면, 손님화면에 대기화면을 보여줘야 맞는데, 잘못된 손님화면이야. > 비정상."
- "2. 상품 담기 : 정상" · "3. 정상"
- "4. 손님화면 : 1/3은 영수증, 오른쪽에 phone entry skipped 가 나와(실패), 영수증은 숲속의 과자점의 POS 영수증과 손님 영수증의 형태가 달라. , 숫자랑 상품도 달라(이것은 과거 매출을 보여준듯)"
- "5. 키패드 등장 : 3초뒤 등장(정상)"
- "6. POS 칩 : 첨부2 보면, Not confirmed. Link customer 버튼이 있음. , 손님화면에서 번호를 누를수 없게 되어버림. > 이것으로 인하여 그 다음 테스트를 할수없는 stopper 발생."

## 관찰(첨부)
- 첨부1: POS Sell · 빈 카트 · 진행 결제 없음 → CD = Order #196 영수증(1x Coffee Latte Rp 33.000 · 1x Coffee Latte Rp 35.200 · TOTAL Rp 68.200 · Cash) + 우측 "Phone entry skipped".
- 첨부2: POS Payment successful Order #201(Iced Tea Lemon IDR 18,000 · TOTAL 19,800 · 영수증 정상 · NaN 없음) · 칩 "Not confirmed · Link customer" · CD 는 여전히 Order #196 + "Phone entry skipped".
- CD 영수증 머리 = "Store"(매장 이름·로고·주소·영수증 번호·일시·캐셔 없음) → POS 영수증과 형태 다름.

## 항목
| # | 내용 | 소유 | 상태 |
|---|---|---|---|
| V3-1 🔴 stopper | CD 가 **현재 주문(#201)이 아닌 과거 주문(#196, skipped)** 스냅샷을 계속 보여줌 · Sell 빈 카트에서도 대기화면 아님 (CD-1·CD-5 운영 미동작) · 그 결과 #201 키패드 안 열림 → POS "Not confirmed" | M0 | M0-1126-F |
| V3-2 | CD 영수증 = POS 영수증과 같은 모습(로고·매장 이름·주소·WA·영수증 번호·일시·Order#·캐셔·품목+옵션·세금·결제·Received·QR·Thank you) — 운영에서 "Store" 만 나옴 (CD-3 데이터 누락) | M0 | M0-1126-F |
| LG-1~3 | 로그인 화면 | — | ✅ 14:19 |
| 2·3·5 | 담기 · 결제 · 3초 뒤 키패드 | — | ✅ 14:19 (5 는 #196 위에서 관찰) |
| 6~9 | POS 칩 실시간 숫자 · 적립 칩 · Hand over · Next customer | — | ⏸ V3-1 막힘 |
