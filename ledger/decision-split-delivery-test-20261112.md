# 실기 — 나눠 결제 · 배달 · 선주문 (Kyu 2026-11-12 16:21 WIB · 코드 57c2267)

## 결과
- 테스트1 나눠 결제: Payments 표 Cash·Card 2줄 ✅ (#99 해소 확인)
- 테스트2 배달: Done 만 보임 ✅ · Fulfill → 재고 차감 ✅
- 테스트3 선주문: 피커·결제 ✅ · 재고 흐름 정확 ✅
  - 시작 R13/S90/A77 → 결제 R14/S90/A76 → Fulfill(Pickup) R13/S89/A76 → Void(재고 복구) R13/S90/A77

## Kyu 요구 (원문)
- **[F1] 결제수단 아이콘**: "cash 와 card 가 너무 비슷해서 눈으로 봤을때, 차이를 전혀 못느꼈어. 따라서, cash 옆에 현금 아이콘, card 옆에 card 아이콘을 넣자. QRIS 면 바코드 아이콘을 작게 넣음 좋겠어. 즉, 텍스트 오른쪽에 단순한 아이콘을 넣자는 아이디어."
- **[F2] Done 토스트**: "Done 만 눌렀을떄, products 탭으로 이동을 하는데, 이때 toast 메세지가 있으면 좋을것같아. Delivery Order Paid 이런식으로."
- **[F3] 주문 상세 Done**: "Fulfill 누르면 Order 상세화면이 나오는데, 그 밑에 Reprint, Share, Void 가 있거든. Void 오른쪽에 Done 도 있으면 좋을것같아. Done 을 누르면 그냥 이 창이 닫아지는거지." · 선주문 Pickup 뒤에도 "이후 화면에서 Close 버튼이 있었으면함." → 오케 해석: 같은 요구, 버튼 이름 Done 으로 통일.

소유: M3 · 발부 M3-1105-BF
