PASS

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/263

## P1~P6 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| P1 paid_so_far=0 → Discontinue | ✅ 구현 | 기능 플래그 `QRIS_CANCEL_ENABLED=false` — M0-1125-K 배포 뒤 `true` 로 변경 |
| P2 paid_so_far>0 → Cancel & refund | ✅ 버튼 노출 | 비활성(disabled) 유지 — 서버 void 미지원 |
| P3 환불 중 멈춤 → Continue refund / Close | ⛔ 미구현 | 서버 API 미제공 (아래 명세) |
| P4 Continue payment → Back = Checkout | ✅ 구현 | fromOrders=1 플래그 + headerLeft override + gestureEnabled:false |
| P5 Split 화면 Total/Amount received 0 버그 | ✅ 수정 | fromOrders=1 & paidSoFar>0 → step=second 자동 초기화 |
| P6 QRIS IDR 0.00 → QRIS 대기 중 | ✅ 구현 | paid_so_far=0 & method=qris 조건 |

## 돈 안전 경로

Discontinue 흐름에서 ① qris-cancel 호출 시 `409 already_paid` 응답이면 취소를 중단하고 "이미 결제 완료" toast 를 표시한다. 이중 결제 방지.

## 필요 서버 API 명세

### ① POST /admin/pos/orders/:id/qris-cancel (M0-1125-K · 진행 중)
P1 Discontinue ② 단계. QRIS 결제 요청 세션을 취소.

**요청**: body 없음 (또는 `{}`)

**응답 (200)**:
```json
{ "ok": true, "order_id": "ord_xxx" }
```

**응답 (409 · already_paid)**:
```json
{ "ok": false, "type": "already_paid", "order_id": "ord_xxx" }
```
→ 앱이 이 경우 취소를 중단하고 성공 안내

### ② P2 Cancel & refund 활성화 — draft order void 지원
기존 `POST /admin/pos/orders/:id/void` 가 `is_draft_order=true` 인 주문을 처리할 수 있도록 확장.
또는 별도 `DELETE /admin/pos/draft-orders/:id` (SDK `sdk.admin.draftOrder.delete` 재사용 가능).

동작: 1차 결제 환불(payment collection refund) + draft order 삭제.

### ③ P3 환불 중 멈춤 — 서버 상태 + 엔드포인트 2개

**A. GET /admin/pos/draft-orders (기존) 응답 확장**
`SplitPendingDraftOrder` 에 `refund_in_progress: boolean` 추가.
`true` 면 카드에 [Continue refund] [Close as partial refund] 표시.

**B. POST /admin/pos/orders/:id/close-partial-refund (신규)**
환불 중 멈춘 주문을 "돌려준 금액까지만 기록 후 마감".

```json
// 요청
{ "confirmed_refunded_amount": 15000 }
// 응답 200
{ "ok": true, "order_id": "ord_xxx", "receipt_id": "...", "closed_at": "..." }
```

## CI
vitest 82 files · 1042 passed | 6 expected fail | 3 todo — 전부 green (로컬 확인 2026-11-25)

## 변경 파일
- `lib/feature-flags.ts` (신규) — QRIS_CANCEL_ENABLED 플래그
- `api/hooks/split-pending-orders.ts` — useDiscontinueSplitPendingOrder 뮤테이션 추가
- `app/(tabs)/orders.tsx` — PaymentInProgressCard P1/P2/P6 로직
- `app/checkout/split-tender/[draftOrderId].tsx` — P4 back nav + P5 amount fix
- `__tests__/m3-1125-n-inprogress-orders.test.ts` (신규) — 12개 assertions
