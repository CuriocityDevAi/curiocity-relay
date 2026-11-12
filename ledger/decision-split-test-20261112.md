# 실기 — 2026-11-12 10:06 WIB (Kyu 원문 · iPad)

스샷: Split payment · Order #69 · IDR 489,500 · 1st payment completed Cash 89,500 · 2nd Card 400,000(MANDIRI · 123456 · 0890) → Confirm payment → toast `Payment failed · amount must equal grand_total (expected 489500, got 400000)`. 화면 경로 제목에 `checkout/split-tender/[draftOrderId]` 가 그대로 보임.

## Kyu 원문
실기.

2. 빌드표시 : 아무 주문 Void → PIN 시트 제목 줄 오른쪽에 작은 회색 'build …' 글씨가 보이면 최신 앱 : 성공
3. 잘 되는듯.
4. 나눠 결제 : 총액 489,500 짜리 거래를, 현금 89,500 + card 400,000 으로 나누어 결제할려고 했는데, 카드쪽을 confirm payment 를 누르면 총액이 거래금액보다 작다는 토스트메세지가 나옴. 아마도 현금 + card 금액을 더하지 않고, 즉 1st payment 를 제외하고 2nd payment 금액만 거래금액과 비교한듯함. (버그) , 또한, Issuing bank 는 직접 타이핑하기에 필요하니까, 키보드가 나와도 되는데, Approval code 랑 card last 4 digit 는 숫자 키패드로만 나왔으면해. 그런데, 어쩔때는 키보드로 나옴. 랜덤하게 어쩔때는 키보드, 어쩔때는 키패드로 나와.  즉, 숫자만 입력이 필요한것은 키패드로 나오게 해줘. (첨부파일 확인)

## 오케 정리
- ✅ 빌드 표시(#91) · ✅ Cart 4~6개(#92 — "잘 되는듯").
- S1 🔴 나눠 결제 2차 Card 가 grand_total 전체와 비교되어 거절 — 운영 기능 장애(현금+카드 나눠 결제 불가). Order #69 은 1차 현금만 받은 채 남아 있음(정리 필요).
- S2 Approval code · Card last 4 = 항상 숫자 키패드(간헐적으로 전체 키보드) · Issuing bank 는 일반 키보드. 앱 전체 숫자 전용 칸 같은 규칙.
- S3(오케 발견) 화면 상단에 route 이름 `checkout/split-tender/[draftOrderId]` 이 제목으로 노출 — "Split payment" 로.
