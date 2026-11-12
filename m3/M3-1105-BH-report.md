# M3-1105-BH Report

## 바뀐 조건 파일:줄

| 변경 내용 | 파일:줄 |
|---|---|
| `VoidRefundExposure.show` — `action` 제거 → `sameShift: boolean` 반환 | `lib/refund-rules.ts:181` |
| Void + Refund 버튼 항상 둘 다 렌더 (기존 단일 버튼 조건 제거) | `app/orders/[orderId].tsx:879–895` |
| `voidRefundAction` state — 누른 버튼으로 `sameShift` 결정 | `app/orders/[orderId].tsx:657` |
| `ReturnLineItem.fulfilled` 필드 추가 | `components/orders/ReturnItemsPicker.tsx:18` |
| 미출고 품목 "Not handed over · will be cancelled" 라벨 | `components/orders/ReturnItemsPicker.tsx:72–82` |
| `fulfilled_quantity` 기반 `fulfilled` 주입 | `components/orders/VoidRefundSheet.tsx:142` |
| `disposition` 체크 → 토스트 텍스트 분기 | `components/orders/VoidRefundSheet.tsx:188–192` |

## 테스트

- `tests/flows/void-refund-exposure.test.ts` (신규): 14 tests 통과
  - 같은 교대·선주문 dp_paid(hidden)·paid_full(show)·출고 후(show)·voided·refunded 조건
  - disposition 토스트 계약 (all_cancelled / mixed / returned / legacy)
- `e2e/flows/04-order-void-refund.spec.ts` (신규): Playwright 스크린샷 `04-order-detail-void-refund.png`
- vitest 119 passed | 6 expected fail ✅
- lint 0 errors ✅

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/114
base: feat/m3-1105-bg-nav-cleanup

## CI

브랜치 푸시 완료 — GitHub Actions CI 자동 실행 예정.
