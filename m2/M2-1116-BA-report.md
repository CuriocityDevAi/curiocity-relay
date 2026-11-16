# M2-1116-BA — card_qris Void 차단 완료

**판정**: DONE — `isQrisVoidBlocked`에 `card_qris` 추가 · Void 시 "QRIS orders: use Refund" 안내 · Confirm 숨김 (qris/cash_qris 동일 UX).

**void-refund-nav-bc master 실패 여부**: 미재현. origin/master(36파일 407passed) · feat/m2-1116-aq(37파일 434passed) 양쪽 모두 void-refund-nav-bc 포함 전 케이스 통과 — 선행 이슈 없음.

## 변경 내용

- `components/orders/VoidRefundSheet.tsx` — `isQrisVoidBlocked` 조건에 `card_qris` 추가 (commit 3e44cbc)
- `tests/flows/cash-qris-refund-method.test.ts` — card_qris Void 차단 테스트 2건 추가

## 테스트 결과

```
37 Test Files  37 passed (37)
Tests          434 passed | 6 expected fail | 2 todo (442)
```
