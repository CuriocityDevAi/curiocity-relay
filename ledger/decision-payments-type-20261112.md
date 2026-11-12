# Payments 표 Type 컨럼 — Kyu 2026-11-12 09:38 WIB

관련: [decision-void-test2-20261112](decision-void-test2-20261112.md) R13 대체.

Kyu 원문: "Payements 표에는 Reference 라는 컨럼명 대신에, Type 이라고 하는거 어떄? 그리고 원거래는 Sale 이라고 Type 컨럼에 쓰고, 취소거래는 Void 라고 쓰는거지."

확정(오케 동의 + 보완):
- 컨럼 = Method · **Type** · Amount · Status · Time.
- Type: **Sale**(원거래) · **Void**(같은 교대 취소) · **Refund**(나중 환불 · 품목 반품 포함).
- Status: Paid · Refunded · Failed(환불 실패 → "남은 금액 다시 환불" 대상).
- 카드 승인번호 등 기존 Reference 값은 삭제하지 않고 줄을 눌렀을 때 상세(또는 Method 아래 작은 글씨)로 보존.
