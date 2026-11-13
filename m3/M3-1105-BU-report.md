# M3-1105-BU Report

## A — #129 안 쓰는 Card 화면 제거

**브랜치**: `feat/m3-1105-bt-cart-trash-card-header`
**HEAD SHA**: `53bf1be`

수정 파일:
- `app/checkout/tender-card/[draftOrderId].tsx` **삭제**
- `app/_layout.tsx` — `checkout/tender-card/[draftOrderId]` Stack.Screen 항목 제거
- `__tests__/cart-trash.test.ts` — `TENDER_CARD_SCREEN_OPTIONS` 상수 + "Card 결제 화면 헤더 옵션 (M3-1105-BT REQ 5)" describe 블록 제거

자기 검증:
- lint errors: 0
- vitest: 14 files · 135 tests passed (all passing before and after change)
- 웹 번들 가드: 미검증 (Expo 번들러 미실행)

---

## B — QRIS 상태 확인 수정

**브랜치**: `feat/m3-1105-bu-qris-fix` (base: master)
**HEAD SHA**: `63b0f03`
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/130

수정 파일:
- `api/hooks/pos-qris.ts` — `QrisStatus` 에 `'captured'` 추가; `fetchQrisStatus(sdk, orderId, paymentRequestId)` 에 `?payment_request_id=…` 쿼리 파라미터 추가
- `app/checkout/tender-qris/[draftOrderId].tsx` — `checkStatus` 에서 `currentPaymentRequestId` 전달; `captured` → 완료 처리; 400/404 연속 3회 → `"Can't check payment status"` 안내 + Sentry 기록; `failed` 상태 메시지 추가; `isClientHttpError` 헬퍼 함수 추출
- `__tests__/qris-state-machine.test.ts` — `captured` → `paid` 전이 테스트 추가
- `__tests__/qris-bu.test.ts` (**신규**) — URL payment_request_id 포함 · encodeURIComponent · 오류 분류 · 연속 오류 임계값

서버 status 값 → 앱 처리 대응표:

| 서버 status  | 앱 처리                                      |
|-------------|---------------------------------------------|
| `pending`   | 계속 대기 (다음 10s 폴링)                   |
| `paid`      | 완료 → 영수증/success 화면                  |
| `captured`  | 완료 → 영수증/success 화면 (버그 수정)      |
| `expired`   | QR 만료 → "QR expired" + New QR 버튼        |
| `failed`    | "Payment failed — please try another method" |
| (400/404 ×3) | "Can't check payment status" + Sentry 기록  |
| (5xx/네트워크) | 조용히 재시도                               |

자기 검증:
- lint errors: 0 (warnings 2개는 기존 파일에 있던 pre-existing)
- vitest: 14 files · 139 tests passed
- 웹 번들 가드: 미검증 (Expo 번들러 미실행)

**확인 항목 (Kyu 실기용)**: iPad QRIS → QR 화면 → Simulate payment (test) → 몇 초 안에 영수증 화면
