DONE — CashTenderPanel 버튼 레이블 영어 통일 (Exact / Other amount), PR #160 머지 대기

## 변경 내용
- `components/payment/CashTenderPanel.tsx`
  - `"딱 맞게"` → `"Exact"` (testID=cash-quick-exact 버튼 레이블)
  - `"다른 금액"` → `"Other amount"` (testID=cash-other-amount 버튼 레이블)

## 테스트 결과
```
Test Files  33 passed (33)
      Tests  384 passed | 6 expected fail | 2 todo (392)
   Duration  760ms
```
전체 통과.

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/160
