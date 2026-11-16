# 판정: `lib/refund-rules.ts:264` — `pickOriginalTender()`가 Cash+QRIS를 'mixed'(card+cash)로 오분류 → 서버 측 별도 수정 불필요 (클라이언트 단독 수정 완료)

## 버그 원인

**파일:줄**: `lib/refund-rules.ts:264`

```typescript
// 수정 전: 2개 이상 다른 tender → 무조건 'mixed' 반환
return 'mixed';
```

`pickOriginalTender()` 함수에서 주문의 tender 종류가 2개 이상이면 무조건 `'mixed'` 를 반환했음.
Cash(pp_cash_default) + QRIS(pp_xendit_qris_default) 주문도 `'mixed'` → `MIXED_TERMINAL_OPTION`
(label: "Card terminal + Cash", `requiresTerminalApprovalCode: true`) 으로 떨어짐.

## 수정 내용

### lib/refund-rules.ts
- `OriginalTender` 타입에 `'cash_qris'` 추가
- `RefundMethod` 타입에 `'cash_qris'` 추가  
- `CASH_QRIS_OPTION` 추가: label "QRIS refund + Cash", requiresPin: true, requiresTerminalApprovalCode: false
  - hint: "QRIS portion is refunded to the customer's QRIS app automatically."
- `pickOriginalTender()` 수정 (`refund-rules.ts:272-275`):
  ```typescript
  if (tenderTypes.has('cash') && tenderTypes.has('qris') && tenderTypes.size === 2) {
    return 'cash_qris';
  }
  ```
- `getRefundPlan()` 에 `'cash_qris'` 분기 추가
- `RefundRequestBody` tenders 배열 타입 확장: `'cash' | 'card_terminal'` → `'cash' | 'card_terminal' | 'qris'`
- `buildCashQrisRefundBody()` 추가: `tenders: [{method:'cash'}, {method:'qris'}]` + manager_pin

### components/orders/VoidRefundSheet.tsx
- `describeOriginalTender()`: `'cash_qris'` → "Cash + QRIS"
- `submitFull()`: `order.originalTender === 'cash_qris'` → `buildCashQrisRefundBody()` 사용
- Void 차단 로직 추가 (`isQrisVoidBlocked`): QRIS/Cash+QRIS 주문에서 Void 시 "QRIS orders: use Refund" 안내, Confirm 버튼 숨김
- `SHEET_CHIP_CLS = 'rounded-xl py-4 px-3'` 공유 상수 → 모든 선택 버튼에 적용

### components/ui/OptionChip.tsx
- `labelClassName?: string` prop 추가

## 테스트 결과

```
tests/flows/cash-qris-refund-method.test.ts — 18 passed (신규)
tests/flows/ 전체 — 148 passed | 6 expected fail (회귀 없음)
TypeScript (수정 파일) — 에러 없음
```

테스트 케이스:
- Cash+QRIS → originalTender: cash_qris ✓
- QRIS only → originalTender: qris ✓
- QRIS+QRIS (같은 타입) → originalTender: qris (mixed 아님) ✓
- Cash+Card → originalTender: mixed (회귀 없음) ✓
- cash_qris plan → requiresTerminalApprovalCode: false ✓
- cash_qris plan → requiresPin: true ✓
- cash_qris plan → label: "QRIS refund + Cash" ✓
- mixed plan → label: "Card terminal + Cash" (회귀 없음) ✓
- buildCashQrisRefundBody → tenders/manager_pin 계약 ✓

실기기 UI 테스트: 미실행 (에뮬레이터 없음) — 미검증

## 서버 측 필요 사항

**QRIS Void 서버 경로 미확인** (서버 수정 금지 원칙상 확인 불가):
- 클라이언트는 QRIS 포함 주문의 Void를 차단하고 "use Refund" 안내.
- storeport에서 QRIS tender가 포함된 `/void` 요청을 Xendit refund로 라우팅하는 경우,
  클라이언트 차단 조건(`isQrisVoidBlocked`) 제거 가능.
- 확인 경로: storeport void 엔드포인트의 QRIS tender 처리 분기.

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/164
