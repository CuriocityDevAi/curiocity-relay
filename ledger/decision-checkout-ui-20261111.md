# Kyu 실기 A 피드백 — 결제 완료·현금 결제 화면 (11-11 10:17 WIB)

근거: #79 실기 성공(배달 Order #56 · Takeaway Order #58). 마감 때 open-requirements.md 에 합침.

## Kyu 원문
- "가장 상단에 orderID 가 [orderID] 로 남아있음. checkout/success/Order #56 으로 나오는게 맞을듯. 아니면 다른 best practice 가 있으면 알려줘. 그냥 삭제해도 되고.." / "checkout/tender-cash/[draftOrderId] 이것도 정리가 안된듯. Order #58 이렇게 하던, 아니면 삭제를 하던 해야할듯."
- "이 영수증의 폭이 아직도 작아. 내가 Order 상세에서 보이는 폭으로 만들어달라고 했는데, 아직도 그대로야. 원인을 알려줘." 🔴 (11-10 10:33 에 이어 2회째)
- "cash 옵션을 선택했을때 같이 보이는 cash 버튼 2개의 금액이 항상 고정이야. 상품 결제 금액이 68,200인데 IDR 50,000 이 옵션으로 있어 … 버튼을 IDR +50,000 · IDR +100,000 으로 … IDR +50,000 을 두번 누르면 100,000 으로 custom amount 가 변하는거지. 버튼을 누를때마다 custom amount 가 추가되도록 … 상품금액보다 받는 Custom amount 가 작으면 Process payment 는 안되는것은 계속 유지."

## 오케 진단
- 폭: `components/payment/SuccessReceiptAnim.tsx` — 영수증을 감싼 `<View className="relative items-center">` 의 items-center 때문에 영수증이 글자 폭만큼 줄어듦(체크 아이콘 위치용 래퍼). 공용 ReceiptSection 은 썼지만 안쪽에서 다시 좁힘. M3-AA · R0-AR 검사는 "같은 래퍼를 쓰는가"만 보고 실제 폭을 재지 않아 통과.
- 상단 글자: 화면에 제목 설정이 없어 Expo Router 가 파일 경로를 제목으로 표시. 본문 큰 제목(Payment successful · Cash tender)은 반투명 헤더에 가려 잘림.

## 결정 대기
- 현금 버튼 시작값·Exact·초기화 — Kyu 답 대기.
