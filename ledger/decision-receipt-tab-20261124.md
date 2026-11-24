# decision-receipt-tab-20261124 — Admin POS Settings 영수증 탭 (Kyu 11-24 18:13 WIB)

## 실기 결과 (storeport #417 Admin 정리)
1·2·3·4·5단계 모두 정상 (사이드바 정리 · Loyalty 1단 · POS Settings 탭 5개 · ?tab= 새로고침 유지 · Tax 저장 유지) → #417 실기 완료.

## Kyu 원문
> 3단계 : 정상. 그런데, Order numbers 탭에서 지점의 닉네임을 관리하는게 문제가 있어보여.
> 닉네임은 General 로 옮겨줘.
>
> 그리고 Order number 이라는게 너무 지엽적이야.
> 차라리 영수증(receipt) 이라고 탭을 만들자.
>
> 그리고 General 에서 영수증관련된것들을 빼서, 영수증 탭으로 모아줘.
> 그리고 영수증탭에서는 브랜치별로 영수증에 보여지는 항목을 어떻게 세팅할지 정할수있고,
> 그리고 브랜치별로 영수증 샘플이 시뮬레이션 되도록 해줘.
>
> 하나 이상한 거 말하자면, 탭 디자인인데, 눌린 텝이 너무 눈에 안띄어. 더 확연한 구분이 필요해보여

## 요구 분해
| # | 요구 | 상태 |
|---|---|---|
| R1 | 지점 닉네임 관리 → General 탭 | 계획 ✅(M2-1124-P) · Round A |
| R2 | "Order numbers" 탭 → "Receipt(영수증)" 탭 | Round A |
| R3 | General 의 영수증 관련 항목 → Receipt 탭으로 이동 | Round A |
| R4 | Receipt 탭: 브랜치(매장)별 영수증 표시 항목 설정 | Round B (+ C안 표시 토글 → POS 앱·프린터 렌더 반영 라운드) |
| R5 | Receipt 탭: 브랜치별 영수증 샘플 시뮬레이션(미리보기) | Round C |
| R6 | 선택된 탭이 눈에 띄도록 디자인 구분 강화 | Round A |

## 기존 결정과의 관계
- decision-multi-store-20261124 (Kyu 16:07) "매장별 값 = 주소·PB1 적용 여부 뿐" → **R4 로 확장**: 영수증 표시 항목도 매장별. (Kyu 최신 원문 우선)
- 구현은 #420(M0-1124-G/H) 머지 뒤 순차 (같은 page.tsx).

## Kyu 결정 (11-24 18:33 · 계획서 M2-1124-P Q1~Q3)
> q1. c안. q2. 너의 추천을 따름. q3. 추천: 고정 샘플
- **Q1 = C안**: 매장별로 내용 override(로고·머리글·꼬리글·서비스차지 · null=브랜드 상속) **+ 영수증 줄별 표시 켜기/끄기** (새 boolean 키 → 서버 snapshot + POS 앱 ReceiptCard + ESC/POS 프린터 렌더 반영 필요)
- **Q2 = 미리보기 항상 표시**: Receipt 탭 오른쪽 1/3 고정 패널 · 저장 전 변경 즉시 반영(debounce) · 좁은 화면은 접기
- **Q3 = 고정 샘플 주문** (서버 하드코딩)
- (Kyu 18:37 원문) "고정 샘플을 크로아상을 쓰지말고 소금빵을 쓰자. 라떼는 따듯한 라떼로 (Salt Bread ×2, Hot Latte ×1)" → **샘플 = Salt Bread ×2 · Hot Latte ×1** (Croissant 금지)
- 미리보기 = 서버 `buildSnapshot()` 재사용 preview API + Admin 은 snapshot 렌더만 (실제 영수증과 내용 일치)

## 라운드 순서
1. Round A (M0 · storeport) — #420 머지 직후 발부
2. Round B (M0 · storeport) — 매장별 override + 표시 토글 키·snapshot
3. Round B' (M3 · fork) — ReceiptCard·ESC/POS 가 표시 토글 존중 (B 키 확정 후)
4. Round C (M0 · storeport) — preview API + 미리보기 패널 (샘플 Salt Bread ×2 · Hot Latte ×1)
