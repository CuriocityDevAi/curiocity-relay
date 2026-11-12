# 실기 — 2026-11-12 14:08 WIB (Kyu 원문 · Stock cleanup · 반품 #101 · Share)

스샷: Admin `https://admin.meros.id/app/stock-cleanup` → "No stale reservations" · Share 결과 txt(`No. R-261107-0006 / Total: IDR 30,000 / Thank you`).

## Kyu 원문
화면 좌측에서 stock cleanup 을 눌렀더니 No sale reservations 라고 뜨. 

2번 테스트는, 
내가 원거래를 만들어보니까, VOid 만 나오고 Refund 가 안나와. (오래된 매출을 해보니까 Refund 메뉴가 나왔음)

반품을 해보았더니, 
부분취소는 되는데, toast 메세지가 없어. > 있으면 좋겠어. Refund 가 실제로 처리되고 나서. 
그리고 중요한건 Receipt 가 나올때, 그냥 원거래의 Receipt 가 나오고 있어.
부분취소(Partial Refund) 라는 말이 붙은 영수증이 만들어져야하거든.

그리고 가장 하단에 버튼이 3개 있는데, Reprint, Share, Refund 인데,
Share 같은 경우, 영수증을 Share 하는 거라고 기대했는데, 첨부 2같은 아주 간략한 메모 text 만 share 되. 내가 원하는것은 영수증을 그림파일로 만들거나 pdf 로 만들어서 share 하는거야. 무엇이 더 좋은방법인지 제안해줘. 
여튼 대부분 다른것들은 잘되는듯.

## 오케 정리
- ✅ 반품 품목 선택(부분 환불) 자체는 동작.
- X1 🔴 Stock cleanup 이 빈 목록 — 그런데 Hot Reserved 13 존재(13:08 실기). 도구가 이 예약을 못 찾거나 "진행 중 주문"(예: 버려진 결제 대기 draft 주문)로 제외. 진단 필요.
- X2 같은 교대(새) 주문은 Void 만 · Refund 없음(오래된 주문은 Refund) — P6 규칙(같은 교대 = Void) 때문. 같은 교대에서도 품목 일부 환불을 허용할지 = Kyu 결정 대기.
- X3 환불 완료 토스트(요구) — M3-1105-AY 범위에 포함(반품 토스트 같은 원인이면 같이).
- X4 🔴 부분 환불 뒤 영수증이 원거래 영수증 → "PARTIAL REFUND" 영수증(환불 품목·금액·수단) 생성·표시 필요.
- X5 Share = 영수증 그림(또는 PDF). 오케 권장 = **PNG 이미지**(WhatsApp 미리보기에 바로 보임 · 화면 영수증 그대로) — Kyu 확인 대기 · PDF 는 필요 시 추가.
