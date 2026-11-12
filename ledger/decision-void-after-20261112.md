# Void 뒤 처리 — A안 채택 (Kyu 2026-11-12 09:22 WIB)

관련: [decision-void-test-20261112](decision-void-test-20261112.md) R8.

Kyu 원문: "A (권장)안대로 처리함."

A안 (오케 제안 원문 요지):
- PIN 입력 바로 다음 한 번 묻는다: "돌려받은 상품을 재고로 되돌릴까요?" → **Return to stock**(재고 +1) / **Not returned / Wasted**(재고 그대로 · 폐기 기록).
- 아직 건네기 전 Void 는 재고가 빠진 적 없으므로 묻지 않는다.
- Void 끝난 화면 = **Reprint · Share · Done** 만 · Hand over 제거.
- (Kyu 원안 B "Product Return 별도 버튼" 은 미채택.)

수정 발부 = M1-1105-AZ 진단 착지 뒤 R1~R8 합쳐서.
