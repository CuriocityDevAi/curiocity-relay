PR #184 · 원인=Void→Refund 시트 전환 중 오버레이가 BoxesDigitsInput 터치를 가로채 TextInput.focus() 실패 · PIN 숫자패드 · 문구 교체

## 원인 (실측)
`BoxesDigitsInput`은 Pressable → 숨은 TextInput `.focus()` 체인 의존.
Void 시트 닫힘 + Refund 시트 열림 애니메이션 중 잔여 오버레이가 터치를 가로채 포커스 실패.
직접 환불 경로(시트 전환 없음)에서는 성공 — 경로 비교로 원인 특정.

## 변경 (components/orders/VoidRefundSheet.tsx)
1. PIN step: DigitsInput 제거 → 4칸 View(표시 전용) + NumericKeypad 항상 표시.
   TextInput/포커스 의존성 완전 제거. testID manager-pin-digit-0..3 호환 유지.
2. QRIS void 문구:
   - 시트 제목: "This order can't be voided"
   - 본문: 순수 QRIS / 혼합 QRIS 분기
   - 버튼: "Refund this order"

## 테스트
- __tests__/m1-1117-m-pin-numpad.test.ts: 12 passed, 1 todo
- tsc 신규 오류 0

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/184
