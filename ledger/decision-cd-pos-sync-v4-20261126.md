# CD↔POS — QRIS 실기 (Kyu 11-26 15:40 WIB) · Phone entry 버튼 제안

환경: POS web fork master(#270~#273) · CD 운영 admin.meros.id (storeport main #452 · #454 미머지)

## Kyu 원문 (요지 그대로)
- "POS에서 Payment successful 화면이 그대로 남아있었고, Next customer 을 눌렀어. > 고객쪽화면이 초기화면으로 돌아옴. (정상) 그런데, 잠시 시간이 흐르니, 첨부1처럼 기존매출 Order 상세내역이 고객화면에 떴어(불량)"
- "POS 화면 하단에 Sell 이 선택되어있을때, Sell 글자가 까맣게 되어서 전혀 안보여.(불량), 선택되어있을때에도 최소한 Sell 글자는 보여야한다고 봐."
- "Sell 화면에서 물건을 하나 클릭하면 … 아래에서 시트가 올라오는데, 사진이 좀 이상한 부분이 확대되어 보여 … 전체 사진이 sheet 의 상품 사진 영역에 맞게 fit 하게 줄어들어야 한다고 봐. (불량)"
- "첨부 3: POS쪽에서 QRIS 를 선택한 화면이야. 그때에도 오른쪽 고객화면은 그냥 동일해. 첨부 4 : Generate QR 버튼을 누르니까, 차이가 Enter phone number 버튼만 활성화 되었어."
- "첨부 5 : Payment Simulate 버튼을 누르니 첨부 5처럼 되었음. 첨부 6 : 약 20초인가? 아니면 30초인가 후에 첨부 6처럼 되었음."
- "첨부 7 : Hand over 버튼을 눌렀더니, 아직도 고객화면은 phone entry skipped 로 되어있음."
- 제안: "아직 새로운 고객이 카트에 물건을 넣은게 아니므로 … '마지막 고객 번호 입력 화면 제공' 버튼이 있어야 할듯 … Link customer 는 고객이 직접 입력을 못할때 캐시어가 입력하는 버튼 … 매니저 4자리 코드가 필요한데, 만약에 방금 결제를 했는데, 딴짓하다가 전화번호 입력을 못한사람의 경우, Phone entry 화면을 고객화면에서 보여주면서 번호입력기회를 줄수 있도록 하는 버튼 … Link Customer 오른쪽에 Phone Entry 라는 버튼을 넣는거야. 그러면 아직 새로운 주문이 들어오기전이라면 phone entry 의 버튼이 생기는거고, 새로운 주문이 들어와버리면 phone entry 버튼은 사라저벼리는거지. 그런경우에는 캐시어가 Link Customer 버튼을 눌러서 매니저의 비번을받아서 고객번호를 입력해야해."

## 관찰 (첨부 · 오케)
- 첨부1: Next customer → 대기화면(정상) → 잠시 뒤 CD 에 지난 **Order #202 주문내역(YOUR ORDER · Enter phone 비활성)** 재등장.
- 첨부3·4: QRIS 선택·Generate QR 후에도 CD 에 **QR 이 전혀 안 나옴**(주문내역 + Enter phone 활성만). → 2-C 이전 "손님 화면 QR 안 나옴" 문제 **여전히 존재**. CD 줄 금액이 세금 포함(Rp 16.500) · 소계 15.000 과 불일치.
- 첨부5: QRIS 결제 완료 후 CD 영수증 왼쪽 1/3 + 키패드 슬라이드(CD-4 동작) · 단 CD 영수증 결제수단 **"Cash"(실제 QRIS)** · 머리 "Store".
- 첨부6: 무입력 ~20초 → CD "Phone entry skipped" 에 머묾(결정: 20초 무입력 → 처음화면) · POS "Not confirmed · Link customer".
- 첨부7: Hand over 후에도 CD "Phone entry skipped" · CD 영수증 QRIS·PIM-26B1016 로 바뀌었으나 **PB1 Rp 0**(TOTAL 16.500) 불일치.

## 항목
| # | 내용 | 소유 | 상태 |
|---|---|---|---|
| V4-1 | Next customer 후 지난 주문(#202 cart/draft) 스냅샷이 다시 CD 에 뜸 | M0 | M0-1126-G(#454) 결과 후 |
| V4-2 | POS 하단 탭 선택 상태 Sell 글자 안 보임(검정 위 검정) | M3 | M3-1126-H |
| V4-3 | 상품 시트 사진 = 영역에 맞춰 전체 보이기(contain) · 잘림·확대 금지 | M3 | M3-1126-H |
| V4-4 🔴 | QRIS 결제 중 CD 에 QR 미표시(2-C 선행 문제 재확인) | M2 진단 → 수정 허브 | M2-1126-H 진단 |
| V4-5 | CD 영수증 결제수단 QRIS 인데 "Cash" · PB1 Rp 0 / 줄 금액 세금 포함 불일치 · 머리 "Store" | M0 | #454 결과 후 |
| V4-6 | 무입력 20초 → "Phone entry skipped" 에 머묾 → 결정대로 처음화면 | M0 | #454 결과 후 |
| V4-7 | **Phone entry 버튼**(Kyu 제안) — 오케 의견 회신 후 Kyu 확정 | M3(+M0 서버 행동) | 결정 대기 |
