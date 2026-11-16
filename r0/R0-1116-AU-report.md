#164 CHANGES · 서버 qris 환불 계약 없음

## 판정: CHANGES — 서버 필요 사항 있음 (이 PR 단독으로 Cash+QRIS 환불 실패)

---

## 항목 1: `pickOriginalTender()` 판별

**파일**: `lib/refund-rules.ts:295-298`

| 조합 | 결과 | 판정 |
|------|------|------|
| cash+qris | `'cash_qris'` | ✅ 신규 분기 (`return 'mixed'` 전에 체크) |
| qris only | `'qris'` | ✅ size===1 경로 |
| qris+qris (같은 타입 2개) | `'qris'` | ✅ Set dedup → size===1 |
| cash+card | `'mixed'` | ✅ 회귀 없음 |
| **card+qris** | **`'mixed'` (오분류)** | ⚠️ **누락 — 지적 필요** |

**card+qris 문제**: `tenderTypes.has('cash')` = false → `cash_qris` 분기 미진입 → `return 'mixed'` → `MIXED_TERMINAL_OPTION`("Card terminal + Cash", `requiresTerminalApprovalCode: true`) 선택됨. 실제 card+qris 주문이 환불 시 카드 승인번호를 요구하는 오분류 발생. 현재 이 조합을 허용하는지 불명이나 처리 없음을 명시해야 함.

---

## 항목 2: 서버 계약 대조 (핵심 블로커)

**앱이 보내는 body** (`buildCashQrisRefundBody()`, `lib/refund-rules.ts:202-219`):
```json
{
  "tenders": [{"method": "cash"}, {"method": "qris"}],
  "manager_pin": "..."
}
```

**서버 실제 처리** (`storeport/apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts:107-115`):
```typescript
for (const t of tenderEntries) {
  if (t.method !== "card_terminal" && t.method !== "cash") {
    res.status(400).json({
      type: "invalid_data",
      message: `tender.method must be 'card_terminal' or 'cash' (got ${t.method})`
    });
    return;
  }
}
```

**`RefundTenderEntry` 타입** (route.ts:41-46):
```typescript
type RefundTenderEntry = {
  method: "card_terminal" | "cash";  // ← 'qris' 없음
  ...
};
```

**결론**: 서버가 `method:'qris'` tender를 **400으로 거부**. Cash+QRIS 환불 요청은 `{method:'cash'}`는 통과하지만 `{method:'qris'}` 엔트리에서 즉시 400 반환. QRIS 포션 Xendit 환불 처리 로직 없음.

**서버 필요 사항** (이 PR로 처리 불가):
1. `RefundTenderEntry.method`에 `'qris'` 추가
2. 유효성 검사에서 `'qris'` 허용
3. `tenders[].method === 'qris'`인 경우 `tryXenditRefund` (또는 `refundPaymentWorkflow` via QRIS payment) 처리 분기
4. QRIS 포션은 Xendit 자동 환불이므로 Cash Movement 에서 제외 (현재 `hasCashTender` 로직은 OK — cash 엔트리 존재 시 작동)

---

## 항목 3: QRIS Void 차단 (`isQrisVoidBlocked`)

**서버 void 엔드포인트** (`storeport/.../void/route.ts:116-124`):
```typescript
for (const t of tenderEntries) {
  if (t.method !== "card_terminal" && t.method !== "cash") {
    res.status(400).json({...`tender.method must be 'card_terminal' or 'cash' (got ${t.method})`})
  }
}
```

서버 void는 QRIS captured payment에 대해 Xendit refund를 별도로 호출하는 로직 없음 (M0-1105-BD는 미결제 payment_session 취소만 처리). 따라서 클라이언트가 `method:'cash'`로 보내면 주문은 취소되지만 Xendit 환불이 없고, `method:'qris'`로 보내면 400 거부.

**판정**: **클라이언트 차단 유지 맞음.** 서버가 QRIS captured payment에 대한 Xendit 환불을 지원하지 않으므로 차단 해제 불가.

---

## 항목 4: 선택 버튼 높이

- `SHEET_CHIP_CLS = 'rounded-xl py-4 px-3'` (VoidRefundSheet.tsx:88)
- Button 기본 클래스: `'items-center justify-center gap-x-2 rounded-xl p-4'` (components/ui/Button.tsx:32)

**높이 비교**: `py-4` = `p-4`의 수직 성분 (16px) → **높이 동일** ✅

**공유 상수 여부**: 동일 상수 아님. `SHEET_CHIP_CLS`는 VoidRefundSheet 로컬 상수이고 Button은 자체 클래스 문자열을 사용 — **숫자만 맞춘 것**. 공유 상수화 권고 (코멘트, 블로커 아님).

---

## 항목 5: 테스트 실행 로그

```
RUN  v5.1.0 /Users/kyu.lee/projects/agilo-medusa-pos-fork

 Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  23:15:27 (cash-qris-refund-method.test.ts)

 Test Files  10 passed (10)
      Tests  148 passed | 6 expected fail (154)
   Start at  23:15:31 (tests/flows/ 전체)
```

✅ 18/18 cash-qris 전용 테스트 통과  
✅ 148/148 flows 전체 통과, 6 expected fail 회귀 없음

---

## 종합

| 항목 | 판정 |
|------|------|
| pickOriginalTender 주요 4종 | ✅ 정상 |
| card+qris 조합 처리 | ⚠️ 누락 (→ mixed 오분류) |
| 서버 qris 환불 계약 | ❌ **없음 — 400 거부. 서버 수정 필요** |
| QRIS void 차단 유지 | ✅ 맞음 |
| 버튼 높이 일치 | ✅ 일치 (공유 상수화 코멘트 권고) |
| 테스트 | ✅ 전통과 |

**최종**: CHANGES — `storeport /refund` 에 `method:'qris'` tender 허용 + Xendit 환불 처리 추가 전까지 Cash+QRIS 주문 환불이 서버에서 400으로 실패함. 클라이언트 PR은 올바르게 구현됐으나 서버 계약이 선행되어야 한다.
