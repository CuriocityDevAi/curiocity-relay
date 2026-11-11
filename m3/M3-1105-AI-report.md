# M3-1105-AI 리포트

## 서버 계약 대조표 (storeport #208 · `POST /admin/pos/orders/:id/return`)

| 항목 | 서버 route.ts | 앱 구현 |
|---|---|---|
| 요청 body | `{items[{line_item_id,quantity}], method, manager_pin?, terminal_approval_code?, reason?, register_session_id?}` | `ReturnOrderInput.body` 그대로 |
| 200 응답 | `{ok, order_id, return_id, items[{line_item_id,quantity,amount}], refunded_amount, method, receipt_id, receipt_no, cash_movement_id, open_drawer, inventory_restored, inventory_warning?}` | `ReturnOrderResponse` 타입 |
| 400 | `{type:'invalid_data', message}` — body 포맷 / 수단 / 수량 초과 | toast error 처리 |
| 401 | `{ok:false, reason:'mismatch', remaining_attempts}` — PIN #207과 동일 | ManagerPinSheet 재사용 |
| 423 | `{ok:false, reason:'locked', locked_until}` | ManagerPinSheet 재사용 |
| 409 | `{type:'conflict', message, order_id, payment_id}` | toast error 처리 |

## 변경 요약

### 신규 파일
- `components/orders/ReturnItemsPicker.tsx` — 품목 목록 + 수량 스테퍼(0~max_returnable) + 예상 환불액 미리보기
- `fixtures/pos-return-200-cash.json` — 200 성공(현금)
- `fixtures/pos-return-200-card.json` — 200 성공(카드 단말기)
- `fixtures/pos-return-400-qty-exceeded.json` — 400 수량 초과
- `fixtures/pos-return-401-pin-mismatch.json` — 401 PIN 불일치
- `fixtures/pos-return-423-pin-locked.json` — 423 PIN 잠금
- `fixtures/pos-return-409-conflict.json` — 409 이미 전액 환불
- `scripts/m3-1105-ai-assertions.mjs` — 52/52 PASS
- `scripts/m3-1105-ai-screenshots.mjs` — 스샷 3장

### 수정 파일
- `api/hooks/pos-refunds.ts` — `useReturnOrder` + `ReturnOrderInput` / `ReturnOrderResponse` 추가
- `components/orders/VoidRefundSheet.tsx` — Refund 시트에 "Full order / Select items" 토글 추가 · `ReturnItemsPicker` 연결 · `useReturnOrder` 호출

### app/orders/[orderId].tsx 미수정
품목 데이터는 시트 내부 `useOrder(order.id)` (TanStack Query 캐시 재사용)로 처리해 미수정.

## 스크린샷 경로

- `screenshots-m3-1105-ai/01-select-items-stepper.png` — 품목 선택 모드(Select items 토글·스테퍼·예상액)
- `screenshots-m3-1105-ai/02-cash-pin-sheet.png` — 현금 PIN 시트
- `screenshots-m3-1105-ai/03-qty-exceeded-error-toast.png` — 수량 초과 오류 토스트

## PR 번호

**#84** — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/84

## 이연 순증감

없음.

## 착지 명령

```
cp /tmp/M3-1105-AI-report.md ~/projects/curiocity-relay/m3/ && cd ~/projects/curiocity-relay && git add m3/M3-1105-AI-report.md && git commit -m "m3: M3-1105-AI" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M3-1105-AI done "부분 환불 Select items 모드 · ReturnItemsPicker · useReturnOrder(#208) · 어설션 52/52 · 스샷 3장 · PR #84"
```
