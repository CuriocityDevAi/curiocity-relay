# Kyu 실기 — QRIS · View order · 제목 겹침 (2026-11-13 21:11 WIB · 스샷 4장)

## Kyu 원문
"실기 테스트결과야.

1. 1번 첨부는 simulate payment (test) 를 누르고 나서의 상황. 내가 이 오류 만나고 나서 check payment 를 눌렀을때도 1번화면과 동일.
2. 2번 첨부는, hand over 안누르고 view order 눌렀을때의 오류화면
3. 3번 첨부, 4번 첨부는, 내가 뒤로가기 버튼과 화면 제목이 겹치지 않게 해달라고 요청했는데, 왠걸, 아직도 겹침이 존재하는데, 더우기 이상한 문자가 더 생겨버렸음."

## 판정
- ❌ QRIS: Simulate 뒤 "Can't check payment status"(qris-status 4xx 3회) · Check payment 도 동일 → M0-1105-BR 진단(서버면 수정 · 앱이면 M3)
- ❌ View order(Hand over 안 누름): Console Error "action 'RESET' … was not handled by any navigator"(#127 CommonActions.reset) → M3-1105-BW
- ❌🔴 제목 겹침 3번째: #127 headerLargeTitle 이 네이티브 큰 제목을 추가 → 화면 안 제목과 이중 · 콘텐츠가 투명 헤더 아래로 올라가 덮임("Cart items"+"Checkout" · "Cash tender"+"Order #93"+부제) → M3-1105-BW(결정적 방식 · iOS 검증 필수)
- 오케 반성: 지난 2번 모두 웹 Playwright 스샷만으로 착지 접수 — iOS 네이티브 헤더는 웹에서 재현 안 됨. 이번부터 헤더/네비 변경은 iOS 시뮬레이터 스샷 또는 "iOS 미검증" 명시 없으면 머지 보류.
