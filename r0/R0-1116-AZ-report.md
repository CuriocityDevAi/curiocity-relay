#164 CHANGES · card_qris Void 위험

## 판정: CHANGES (card_qris Void 차단 필요)

셀프 approve 불가로 PR comment로 제출함.

---

## ① Rebase ✅
- `git merge-base origin/feat/m2-1116-aq origin/master` = `f04c8b5` (#165)
- #163 + #165 모두 ancestor chain에 포함. MERGEABLE.
- OptionChip: `sublabel ? BUTTON_PY : 'py-6'` = `sublabel ? 'py-4' : 'py-6'` → #165 동작 유지.

## ② 분류 ✅
| 조합 | originalTender | 승인번호 | PIN |
|---|---|---|---|
| cash+qris | cash_qris | ✗ | ✅ |
| card+qris | card_qris | ✅ | ✗ |
| qris / qris+qris | qris | ✗ | ✗ |
| cash+card | mixed | ✅ | ✅ (기존 회귀 없음) |

## ③ body ↔ storeport #321 계약 ✅
- buildCashQrisRefundBody → `{tenders:[{method:'cash'},{method:'qris'}], manager_pin}` ✅
- buildCardQrisRefundBody → `{tenders:[{method:'card_terminal',terminal_approval_code},{method:'qris'}]}` ✅
- 서버 S2: hasCashTender → PIN 필수. card_qris는 cash 없음 → PIN 불요. ✅

## ④ card_qris Void 미차단 ⚠️
현재 `isQrisVoidBlocked`에 `card_qris` 누락:
```ts
// 현재
(order.originalTender === 'qris' || order.originalTender === 'cash_qris')
// 필요
(order.originalTender === 'qris' || order.originalTender === 'cash_qris' || order.originalTender === 'card_qris')
```

void 경로 추적:
- buildCardQrisRefundBody → `tenders:[{card_terminal},{qris}]` → voidMut 호출
- `/void` route: `method !== 'card_terminal' && method !== 'cash'` → **즉시 400**
- 시나리오 (a) 확인: 400 실패. 시나리오 (b) 불가 (validation에서 전체 거절).
- 금전 손실 없음. 그러나 UX 위험: 사용자 승인번호 입력 후 의미없는 400, "use Refund" 안내 없음.

**판정: 위험** → CHANGES 필요

## ⑤ BUTTON_PY 공유 ✅
- `export const BUTTON_PY = 'py-4'` (Button.tsx)
- Button p-4 → py-4 px-4 (외관 동일) ✅
- OptionChip, SHEET_CHIP_CLS 모두 사용 ✅

## ⑥ 테스트
```
cash-qris-refund-method.test.ts: 25/25 passed
전체: 79 passed | 2 failed | 2 todo
  (2 failed = void-refund-nav-bc 선행 이슈 · pr-62 머지충돌 기인 · PR #164 무관)
```
