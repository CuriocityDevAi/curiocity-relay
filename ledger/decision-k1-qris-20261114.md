# Kyu 실기 K1 결과 — QRIS 기본 결제 재실기 (2026-11-14 09:23 WIB)

## Kyu 원문
"k1 테스트해봤어.
1. 성공
2. 성공
3. 성공
4. 성공 > 그런데, 성공하고나서 영수증화면으로 (즉,Payment successful) 가는게 아니라, Orders 화면으로 가. 그래서 전체 order 리스트만 보여줘.
5. Handover 을 누르려면, Order 화면에서 해당 Order 을 눌러서 상세화면으로 들어가서 hand over 을 누를수 있음.
6. 웹 Admin 에서는 정상이야. 다만, Paid 가 아니라 Captured 라고 표기됨. Paid 로 고치는게 좋을듯."

## 판정
- QRIS 기본 결제(storeport #247) **실기 통과** ✅ → 나눠결제 QRIS R1(M0-1105-BS) 발부.
- 신규 요구 N1 (앱 · M3 소유): QRIS 결제 성공 뒤 결제 완료(Payment successful/영수증) 화면이 아니라 Orders 목록으로 이동 — 현금 결제처럼 결제 완료 화면으로 가야 함. #131(M3 헤더/View order) 과 같은 파일군이라 R0-1105-DX 결과 뒤 M3 다음 프롬프트에 포함.
- 신규 요구 N2 (Admin · 소소): 주문 결제 상태 "Captured" → "Paid" 표기. Medusa 코어 Admin 기본 용어라 Admin 리브랜딩 잔여 작업과 묶어 처리(굵직한 것 먼저 원칙 · 큐 후순위).
