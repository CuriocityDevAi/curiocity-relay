# R0-1105-CX Report — PR #114 리뷰 (M3-1105-BH)

**판정: CONDITIONAL APPROVE** — `VoidRefundSheet.tsx:142` 버그 1건 수정 후 머지 가능.  
CI 실패는 GitHub Actions billing 문제(코드 오류 없음).

---

## 검증 표

| REQ | 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | paid 주문 → Void + Refund 항상 둘 다 | ✅ | `voidRefund.kind==='show'` 시 두 버튼 렌더 |
| 1 | voided/canceled 주문 → 숨김 | ✅ | `!isVoidedOrCanceled` 가드 (line 687: `order.status==='canceled' \|\| voidRefund.kind==='voided'`) |
| 1 | Admin #81 "Refunded + Not fulfilled" → 숨김 | ✅ | `payment_status='refunded'` → `paid=false` → `kind:'hidden'` → 버튼 없음 |
| 2 | 미출고 "Not handed over · will be cancelled" 라벨 | ✅ | `ReturnItemsPicker.tsx:72–82` |
| 2 | 미출고 품목 Return to stock/Wasted 질문 안 뜸 | ✅ | restock step은 `plan.action==='void' && order.handedOver` 조건만 — 미출고 주문은 `handedOver=false` |
| 2 | disposition 토스트 분기 | ✅ | `allCancelled` → `"Items cancelled · IDR X refunded"` |
| 2 | **서버 `fulfilled_quantity` 없을 때 기존 동작** | ⚠️ **BUG** | `fulfilled: Number(it.fulfilled_quantity ?? 0) > 0` — 필드 없으면 `false` 고정 → 모든 품목 "Not handed over" 오표시 |
| 3 | 매니저 PIN (CASH 포함) | ✅ | `needsPin = selectedOption?.requiresPin ?? false` 로직 그대로 |
| 3 | 나눠 결제 환불 | ✅ | `submitPartial` 로직 변경 없음 |
| 3 | 토스트·스크롤 회귀 없음 | ✅ | `onClose → setTimeout` 패턴 그대로 |
| 3 | 새 패키지 0 | ✅ | package.json 변경 없음 |
| 3 | CI | ✅ (인프라) | 실패 원인: GitHub Actions billing — 코드 오류 아님 |
| 4 | BI 후 rebase 충돌 예상 파일 | ✅ 없음 | #113이 건드리는 파일(`_layout.tsx`, `checkout/success/[orderId].tsx`, `e2e/flows/03-*.spec.ts`)이 BH와 겹치지 않음 |

---

## 버그 상세

**파일**: `components/orders/VoidRefundSheet.tsx:142`

```ts
// 현재 (버그)
fulfilled: Number(it.fulfilled_quantity ?? 0) > 0,

// 수정
fulfilled: it.fulfilled_quantity != null ? Number(it.fulfilled_quantity) > 0 : undefined,
```

**이유**: `fulfilled_quantity` 미포함 서버 응답 시 `0 > 0 = false` → `ReturnItemsPicker` 에서 `isFulfilled = false !== false = false` → 모든 품목에 "Not handed over · will be cancelled" 오표시.  
수정하면 `undefined !== false = true` → 기존 `formatMoney × available` 표시 유지.
