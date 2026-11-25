# POS My Orders · 결제하다 만 주문 처리 (Kyu 11-25 14:21 · 14:25)

원문 (14:21):
- "My orders에 들어가봤더니, 우연찮게 Order #188 이 split payment 를 하다가 말은상태로 남아있더라구. … POS 가(왼편) Payment in progress 가 예쁘게 디자인되어서 my orders에 들어갔어. 디자인 자체는 만족스러움. 근데, 문제1. 해당 거래를 지우는 방법이 없음. 이 My Orders 화면에 Continue Payment 버튼만 있고, Cancel & Refund 는 비활성화야. … 원거래가 승인이 안났는데, Cancel & Refund 버튼이 있는게 이상하거든. 그러니, Continue payment 옆에는 Discontinue 이 있어서, 그걸 누르면 해당 매출을 지우겠냐고 컨펌하는 팝업이 뜨거나 하면될것같아. 만약 Refund 를 진행하다가 중간에 멈췄으면 왼쪽은 Continue Refund 이겠지, 마찬가지로 오른쪽은 Discontinue 버튼. … 한번 Continue Payment 를 눌러서 들어가봤더니 Checkout 버튼(뒤로가기가 있어) 그걸 눌르면, 1번 첨부화면인 My Order로 가버려. 즉, Checkout 으로 갈수 있으면 취소라도 가능할텐데, Checkout 화면이 없고, 그냥 Orders로 나가버리는것도 문제야."
원문 (14:25, 오케 제안에 대해): "'< Checkout'은 이름이 틀렸어 … 라고 했는데, 현재 순서는 Sell -> Cart > Checkout > 결제 수단 선택 > Payment 야. 그러니, 결제 화면에서 뒤로가면 Checkout 이 맞거든. 나머지는 ㅇㅋ"

확정:
- P1 받은 돈 0 (모든 tender 미결제 · QRIS 대기만): [Continue payment] [Discontinue] → 확인 팝업 → 대기 QRIS 세션 취소(qris-cancel · 이미 paid 면 중단하고 성공 처리) → 주문 취소/삭제 → In progress 에서 사라짐.
- P2 일부 받음: [Continue payment] [Cancel & refund](매니저 PIN · 받은 돈 환불).
- P3 환불 중 멈춤: [Continue refund] [Close as partial refund](돌려준 금액까지만 기록 후 마감) — Discontinue(없던 일로) 대신.
- P4 뒤로가기: 정상 흐름(Sell → Cart → Checkout → 결제 수단 → Payment)에서는 "< Checkout" → Checkout 이 맞음(Kyu 14:25). 문제는 My Orders 의 Continue payment 로 들어왔을 때 "< Checkout" 인데 Orders 로 가는 것 → **들어온 곳 기준**: My Orders 에서 들어왔으면 그 주문의 Checkout 화면으로 이동(라벨 "< Checkout" 유지 · 실제로 Checkout 으로 감) — Checkout 에서 결제 수단 재선택 가능.
- P5 이어서 결제 화면 하단 Total IDR 0 / Amount received 0 (상단 33,000 과 불일치) 버그.
- P6 카드의 "1st payment (Qris) IDR 0.00" → QRIS 대기면 "QRIS 대기 중".
의존: P1 의 QRIS 취소 = M0-1125-K qris-cancel 엔드포인트.
상태: M3-1125-N 발부(M3-1125-M 뒤).
