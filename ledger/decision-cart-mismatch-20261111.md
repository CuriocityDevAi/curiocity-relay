# Cart ↔ Checkout 품목 불일치 (Kyu 11-11 21:24 WIB · iPad)

마감 때 open-requirements.md 에 합침. 소유 = M3 (진단·수정 M3-1105-AP).

## Kyu 원문
"여러 아이템을 복합적으로 넣는 테스트를 하다가 알게된건데, 기존에 거래가 완료가 안된 거래가 있었었기 때문에 그런것같은데(이건 내 추정) cart 에서 3개의 아이템을 넘겼는데, checkout 시에는 4개의 아이템이 되면서 ,금액조차 달라지는 경우를 발견했어. 내 생각에는, checkout 에 데이터는 cart 의 데이터를 받지 않고, 이미 처음부터 정해져있던것같아. 이것도 중요한 개선사항이라, 원인을 찾아서 고쳐야해야해."

## 스샷 관찰 (오케 · 21:19)
- Cart 화면: 품목 3줄 표시(Coffee Latte Hot 30,000 · Coffee Latte Hot 30,000 · Iced Tea Lemon 18,000 = 78,000) 인데 **Total = IDR 110,000** · 탭 바 Cart 배지 = **4**.
- Checkout 화면: 4줄 (위 3줄 + Coffee Latte Iced 32,000) = 110,000.
- → 서버 장바구니(draft order)에는 이미 4줄이 있고, Cart 화면 목록이 1줄을 안 보여주는 것으로 보임. Total·배지·Checkout 은 서버 기준으로 일치.
- 부수 관찰: 같은 품목·같은 옵션(Coffee Latte Hot)이 수량 2 한 줄이 아니라 두 줄로 들어감.

## Kyu 확인 (21:26)
- 원문: "아이스라떼는 cart 에서 없어. 그러니 b 혹은 c 야." → 가설 (a) 스크롤 잘림 **배제**. 원인 = (b) Cart 목록 데이터 오래됨 또는 (c) 이전 미완 draft order 섞임. M3-1105-AP 착지 판정 시 (a) 결론이면 반려.
