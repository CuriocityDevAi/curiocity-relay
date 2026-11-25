# QRIS 결제 · 손님화면 흐름 실기 (Kyu 11-25 13:47 · 손님화면 통합 테스트 첫 항목)

원문:
- "첫 항목: QRIS 결제 때 POS에도 QR이 나오는지를 테스트할려고 했어. 2번에서 실패야. GENERATE QR 을 누르기 전에 부터 이미 고객화면에는 QRIS 결제 준비중이떠. 내 생각에는 GENERATE QR을 눌르고 나야 오른쪽에 QRIS 결제 준비중이라는 화면이 뜨는게 맞아. (1번화면)"
- "둘째로 눌렀는데도 여전히 QRIS 결제 준비중이였어. (내가 확보를 못했어. 하지만, 왼쪽은 QR이 떴고, 오른쪽 화면은 1번화면의 우측과 똑같았어) > 버그."
- "그래서 내가 <Checkout 버튼을 눌렀고, 다시 Generate QR 을 눌렀는데, 2번 첨부같이 되었음. 즉, 고객 입장에서는, 고객화면에 QR이 안나왔고 기다리는 상황인데, POS 입장에서는 기존 QR을 보여주거나, 새로운 QR을 다시 재생성 시킬수도 없어. (버그)"

스크린샷 관찰(오케):
- POS: QRIS payment · Order #188 · IDR 33,000 · Takeaway · Generate QR 전.
- 손님화면: "QRIS 결제 준비 중..." + 빈 QR 칸 + 결제 금액 Rp 33.000 + 주문 내역 "1x Coffee Latte  Rp NaN".
- 2번: POS 빨간 배너 "previous QRIS tender is still pending · wait for payment capture (webhook) or cancel it before adding the next tender" · Generate QR / Cancel 만 있음.

항목:
- Q1 (UX · Kyu 결정): 손님화면 "QRIS 결제 준비 중"은 Generate QR 을 누른 뒤에만. QRIS 탭 선택만으로는 이전 화면(주문 요약/결제 방법 선택 대기) 유지.
- Q2 (버그): Generate QR 후 POS 에 QR 이 떴는데 손님화면은 "준비 중" 그대로 — QR 이 손님화면에 전달 안 됨.
- Q3 (버그): Checkout 으로 돌아갔다가 다시 QRIS → pending QRIS tender 가 있으면 막힘. 기대: 기존 QR 다시 보기(이어하기) + 새 QR 만들기 + QR 취소 가 가능해야 함.
- Q4 (버그 · 오케 발견): 손님화면 주문 내역 줄 가격 "Rp NaN".
상태: R0-1125-U 진단(읽기 전용) 발부 → 수정 허브는 진단 뒤 결정.
