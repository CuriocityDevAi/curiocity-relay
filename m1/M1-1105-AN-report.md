# M1-1105-AN Report

## 변경 요약

- `app/orders/[orderId].tsx`: Order Status 행을 `orderStatusLabel()` 기반 `OrderStatusLabel` 컴포넌트로 교체. 색 토큰은 목록 칩(`orders.tsx`)과 동일 — `bg-warning-soft/text-warning`(Awaiting dispatch/pickup/Deposit paid), `bg-success-soft/text-success`(Completed), `bg-surface-muted/text-ink-muted`(기타).
- Payment Status / Fulfillment Status 행 유지.
- `lib/order-status-label.ts` 규칙 미변경.

## 스크린샷 경로

`screenshots-m1-1105-an/`
- `01-awaiting-dispatch.png` — delivery · captured · not_fulfilled → "Awaiting dispatch"
- `02-awaiting-pickup.png`   — preorder · captured · not_fulfilled → "Awaiting pickup"
- `03-deposit-paid.png`      — preorder · partially_captured · not_fulfilled → "Deposit paid"
- `04-completed.png`         — status=completed → "Completed"

## PR 번호

#83 · https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/83

## 이연 순증감

0 (기존 미검증 항목 없음 · 신규 이연 없음)

## 검증 결과

- assertions 17/17 · vitest 13/13 · Playwright 8/8
- run-all assertions: 3개 기존 실패(ad/d/x) 이번 변경 무관
