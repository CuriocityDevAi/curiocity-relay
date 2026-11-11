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
