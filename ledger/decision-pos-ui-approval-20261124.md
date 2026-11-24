# 승인 — POS 손님 번호 상태 칸 · 화면 이름 · 번호 표시 (Kyu 11-24 11:03)

원문: "다 승인. 딱하나, 긴 Order 번호 말이야. 이 Order 번호는 어떻게 채번되지? 그냥 계속 증가하게만 둘수는 없잖아. 다른 POS에서는 order 번호 체계를 어떻게 가져가는지 조사해보자. 그리고나서 채택할지 고민해보자."

승인된 것 (오케 제안 = decision-pos-phone-status-20261124 의 후속):
- 우측 상단 손님 번호 상태 칸 6상태(① Ask phone · ② Waiting · ③ 입력 중 실시간 파랑+점 3개 · ④ Done 초록+체크+Re-enter · ⑤ Skipped+Ask again · ⑥ 다른 손님 사용 중 노랑+자물쇠) — Cart · Checkout · Cash/Card/QRIS payment · 나눠결제 · Payment successful 공통
- 영수증 아래 Ask phone on display 버튼 삭제
- Cart 버튼 Pay → Checkout · Checkout = **B안**(아래에 Cash/Card/QRIS 버튼 바로 · Pay in parts 작은 링크)
- 화면 제목 tender → Cash payment / Card payment / QRIS payment
- 모든 POS 화면 · 손님 화면 구석 · 영수증 맨 위 = 칩 번호 #N 하나 · 긴 Order 번호는 영수증 아래·주문 상세에만 작게
- View Cart X 버튼 44pt 원형 · 눌림 피드백
- 손님 번호 입력은 POS 화면 이동·결제 완료와 분리(손님이 OK/건너뛸 때까지 유지) · POS 영수증 = 손님 화면 영수증

미결: **긴 Order 번호 채번 체계** — 오케 조사 후 Kyu 결정.
구현 발부: M1-1124-A(진단) 리포트 수신 후 파일 분할해 발부.
