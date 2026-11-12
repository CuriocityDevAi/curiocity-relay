# Payments 표 Type 컨럼 — Kyu 2026-11-12 09:38 · 09:48 WIB

관련: [decision-void-test2-20261112](decision-void-test2-20261112.md) R13 대체.

Kyu 원문 (09:38): "Payements 표에는 Reference 라는 컨럼명 대신에, Type 이라고 하는거 어떄? 그리고 원거래는 Sale 이라고 Type 컨럼에 쓰고, 취소거래는 Void 라고 쓰는거지."

Kyu 원문 (09:48 · 위를 보완): "아 reference 칸에 카드 승인번호가 들어간다면, reference 칸은 남기고, Type 을 추가하는것도 좋은 아이디어인듯."

확정:
- 컨럼 = Method · **Type** · Amount · **Reference(유지 · 카드 승인번호 등)** · Status · Time.
- Type: **Sale**(원거래) · **Void**(같은 교대 취소) · **Refund**(나중 환불 · 품목 반품 포함).
- Status: Paid · Refunded · Failed(환불 실패 → "남은 금액 다시 환불" 대상).
- Reference: 카드 = 승인번호(Void/Refund 줄은 단말기 취소 승인번호) · 현금 = —.
