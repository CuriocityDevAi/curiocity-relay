# Kyu 실기 피드백 + 결정 — 배달 주문 (11-10 16:39~16:41 WIB)

근거: #206 + #75 실기(Order #55). 마감 때 open-requirements.md 에 합침.

## Kyu 원문
- 16:39 "3번 배달 주문 만들기 완벽하게 진행됨. 4번 결제완료 화면 영수증: 영수증에 delivery 내용이 잘 들어감. 그런데 문제는 그 영수증 아래에 Hand over 버튼이 있어. 이게 맞는 건가? 배송 요청을 했다는 것은, 나중에 배달기사가 와서 물건 보내준단 말인데... 그래서 여기에는 Hand Over 버튼이 나오면 안 될 것 같아. 그냥 Complete 버튼(?) 같은 게 있어야 하지 않을까?"
- 16:39 "View Order → Order #55 상세: Order Status: Pending · Payment Status: Captured · Fulfillment Status: Not fulfilled. 내가 좀 이상한 것은, Order Status: Pending 이 맞아? 고객은 돈을 낸 거고 물건은 못 받은 것이거든."
- 16:39 "내가 Hand over 버튼을 눌러보니까, 바로 고객에게 Fulfilled 된 것으로 처리됨 Order #55"
- 16:41 오케 제안(상태 표시 이름 표)에 "그대로." = 승인

## 확정
| # | 항목 | 결정 | 담당 |
|---|---|---|---|
| 1 | 결제 완료 화면 버튼 | Takeaway = Hand over(그대로) · **Delivery = Hand over 없음 · "Awaiting dispatch — dispatch it from Orders when the courier picks up" + Done** · **Pre-order = Hand over 없음 · "Awaiting pickup" + Done** | 앱(M1/M3) |
| 2 | 배달 주문 Hand over | **서버가 거절**: delivery 주문은 courier 없는 fulfill(stage hand_over 포함) 400 · 11-09 Q2 "Delivery Fulfill 필수 = 택배사만" | 서버(M0) |
| 3 | 주문 상태 표시 이름(앱 화면만 · Medusa 값 유지) | 배달·결제 완료·미발송 = **Awaiting dispatch** · 선주문·전액·미수령 = **Awaiting pickup** · 선주문·계약금만 = **Deposit paid** · 완료 = Completed | 앱(M1/M3) |

- Order #55(시험 주문)는 이미 Fulfilled — 그대로 둠.
