# Void 실기 2차 — 2026-11-12 09:33 WIB (Kyu 원문 · 7번 옛 주문 Void = 통과)

관련: [decision-void-test-20261112](decision-void-test-20261112.md) · [decision-void-after-20261112](decision-void-after-20261112.md)

## Kyu 원문
예 주문 void 를 처리를 하면 VOID 영수증화면까지 잘 처리되.
다만, 4자리 비밀번호를 입력하면,
순간적으로 비밀번호 바로 아래에 Verify 라는 버튼이 활성화 되는데,
활성화 된 버튼을 눌러야할것같이 보이지만, 바로 넘어가버려.
즉, 4자리 비밀번호를 입력하면 Verify 라는 버튼이 활성화 되고 > 사람이 한번더 버튼을 누르게 하거나,
아니면 지금처럼 비밀번호 4자리만 입력하면 verify 라는 버튼을 안눌러도 되게 할려면,
아예 verify 라는 버튼을 없에는게 맞아보여.
이것은 너의 추천에 따를게.

둘째로, 그렇게 하면 Order 화면으로 넘어가는데,
VOID 로 표기된 영수증이 보여서 취소가 된것같긴하는데,
사용자에게 명시적으로 void 가 완료되었다는 toast 메세지가 있는게 좋을것같아.

그리고 이상한게,
원거래는 세금까지 추가해서 결제를 했는데,
취소할떄는 세금뻺 금액에 대해서 취소한것처럼 나와.
고객입장에서는 자기가 낸 세금까지 돌려받는게 맞아.

그리고 지금Order 상세에는 Captured 라는 표현을 쓰는데,
이게 일반적인 용어야?
내 생각에는 Paid 가 더 이해가 쉬울것같고, Captured 는 뭔가 데이터를 확보했다 라는 의미로 보이긴하거든. 일반적용어라면 할말은 없다만.

여튼, Payments 밑에 보면,
박스가 있고,
Method, Amount, Reference, Status, Time 이런 컬럼이 있는데,
원거래 row 하나랑,
그 밑에 취소거래(void) row 하나가 보였으면 좋겠고,

원거래Status가 captured 로 되어있는데, 이것보다는 Paid,
그리고 취소거래 Status 는 Refunded 라고 나오는게 깔끔하지 않을까?

이부분은 너의 의견을 듣고싶다.

## 오케 정리
- ✅ 7번 옛 주문 Void (#218) 실기 통과.
- R9 PIN 4자리 입력 즉시 자동 확인 · **Verify 버튼 제거** (Kyu "너의 추천" → 오케 권장 = 제거). 틀리면 칸 흔들림+비움+남은 횟수.
- R10 Void 완료 toast (예: "Order voided · IDR 33,000 refunded (Cash)").
- R11 환불액 = 고객이 낸 총액(세금·SC 포함). 현재 세금 빠진 금액 환불 = 버그. 오케 가설: 세금(PB1·SC)이 Medusa 주문 총액에 안 들어가 있어 Total 30,000 · Paid 33,000 · Outstanding −3,000 이 같은 뿌리(R6 과 통합 검증).
- R12 앱 표시 용어: Captured → **Paid** · 환불 → **Refunded** · 일부 → **Partially refunded** (내부 값은 Medusa 그대로 · 앱 표시만).
- R13 Payments 표 = 원거래 줄(Paid · +금액) + Void 줄(Refunded · −금액 · Reference = "Void").
