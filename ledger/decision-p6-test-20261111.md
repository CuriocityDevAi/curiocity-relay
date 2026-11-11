# Kyu P6 실기 B 피드백 (11-11 15:17 WIB)

마감 때 open-requirements.md 에 합침.

## Kyu 원문
- "Today's manager PIN 위치가 너무 이상해. 현재는 Orders 화면의 맨 밑인데 … 화면 우측 상단에 보면, 버튼이 2개 있거든. Customize Layout 이랑, notification 버튼. 버튼을 하나 더 만들자. 이 버튼은 Customize Layout 왼쪽에 4개의 숫자로 된 작은 버튼이야. 버튼 안의 숫자는 정해진 주기에 따라 실제로 바뀌어. 그 버튼을 누르면 작은 모달이 뜨면서, 현재 화면 하단에 나온 Today's manager PIN 이라고 되어있는 영역의 정보가 나오게 하면되. 그리고 다시 그 버튼을 누르거나, 화면 다른곳을 클릭하면 이 정보는 사라지게 하면되는거고."
- [버그] "현금으로 처리된 원거래를 void 할려고 했는데, Void 버튼을 누르니 … (Void order 시트 · Original payment: Cash · Method ✓Cash · 'Manager PIN required. Tap Void to enter the PIN.') 이 화면 하단에 void 버튼을 눌렀는데, 아무런 반응을 안해. 그래서 그 다음 테스트케이스를 처리할수가 없음." (iPad 정식 개발 빌드 · Order #58)

## 발부
- 버그 → M3-1105-AJ · PIN 버튼 → M1-1105-AQ (11-11 15:20).

## PIN 위치 변경 (16:28)
- 원문: "왼쪽 메뉴 방식으로 변경."
- 결정: 상단바 버튼(storeport #211 · M1-1105-AQ · DOM 주입)을 폐기하고 Medusa 공식 Admin UI route(`src/admin/routes/manager-pin/page.tsx` + `defineRouteConfig` label·icon)로 왼쪽 사이드바에 "Manager PIN" 메뉴를 둔다. 페이지: 오늘 PIN 크게 · 다음 변경 시각(WIB 자정) · 매장 · 날짜 · 자정에 자동 갱신. 하단 카드 위젯 제거. #211 은 머지하지 않고 닫음. → M1-1105-AR.
- 이유: Medusa 에 상단바 공식 확장 지점이 없어 DOM 주입은 Medusa 업그레이드 때 깨질 위험 · 보너스로 PIN 이 화면에 상시 노출되지 않아 보안상 유리.

## P6 실기 B 결과 (17:12)
- Kyu 원문: "void 시험에서 Manger PIN 을 입력하는 부분이 있는데, 비번 4자리를 입력하는 박스가 나오고 입력할수 있는 키보드가 나오는데, 문제는 키보드가 너무 큰게 나와. 즉, 숫자 키패드만 나오면 되는데, 알파벳까지 입력할수 있는 전체 키보드가 나오면서 화면을 다 잡아먹어. > 그냥 숫자 키패드만 나오도록변경. 그리고 숫자를 입력해보니, 숫자를 입력하는 칸이 4개가 있는데, 첫째 칸에 숫자를 입력하니 2번째 칸으로 커서가 넘어가는게 아니라 3번째 칸으로 넘어감. 내가 다시 포커스를 2번째 칸으로 옮겨서 숫자를 입력하니 4번째 칸으로 커서가 움직임. 이거 문제야. 원인파악해서 고쳐줘."
- 발부: → M3-1105-AL (앱 내 숫자 키패드 컴포넌트 + 칸 건너뜀 원인 확정·수정). 선행: fork #86(M3-1105-AJ)의 인라인 PIN 단계(components/orders/VoidRefundSheet.tsx).

## P6 실기 B 결과 2 (17:15)
- Kyu 원문: "앱 안에서 숫자 키패드가 따로 있었어. 같은 키패드를 쓰면될듯. 재활용필요! Void 도 실패야. order has active fulfillment ... 라는 검은 알약 toast 메세지가 나옴."
- 요구 1 (키패드 재활용) → 소유 M3 · M3-1105-AL 진행 중 — 답 받은 뒤 기존 키패드 재활용 반영.
- 요구 2 (Void 실패 · 서버 void route `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` 가 active fulfillment 있으면 400 "order has active fulfillments · cancel fulfillment first or use refund") → 소유 M1 · 단 storeport #212(M0-1105-AJ)가 같은 파일을 건드리고 있어 발부 보류(충돌 확인 필요).

## P6 실기 B 결과 3 (17:57)
- Kyu 원문: "숫자 키패드는 card last 4 digit 을 입력하는 부분에서야. 즉, Card Tendor 화면에서 Card last 4 digits 에야."
- 오케 확인(11-11): 해당 입력 = fork master `components/payment/CardTenderPanel.tsx` 의 `card-last4-input` (RN `TextInput` · `keyboardType="numeric"` · `maxLength={4}`). 커스텀 키패드 컴포넌트가 아니라 시스템 숫자 키패드(iPad 숫자 전용 키보드). → M3-1105-AN 은 PIN 입력을 이 방식과 동일하게 맞춤.
