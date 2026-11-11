# M3-1105-AO 착지 보고

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/91

브랜치: `feat/m3-1105-ao-refund-retry` (86bf9f7 베이스 — #90 DigitsInput 포함)

---

## 구현 내역

### 1. 훅 (`api/hooks/pos-refunds.ts`)
- `useRefundStatus(orderId)` — GET `/admin/pos/orders/:id/refund-status`
- `useRefundRetry()` — POST `/admin/pos/orders/:id/refund-retry` (성공·실패 모두 orders + refund-status invalidate)
- 기존 `useVoidOrder` / `useRefundOrder` / `useReturnOrder` `onSettled` → `refund-status` invalidate 추가

### 2. `RefundRetrySheet.tsx` (신규)
- CASH/QRIS 실패 몫 → DigitsInput 4자리 PIN (#90 방식 · 새 키패드 없음)
- CARD 실패 몫 → TextInput 6자리 승인번호 (기존 카드 환불 규칙 재사용)
- 둘 다 → 둘 다 표시
- completed → "Refunded" 토스트 + open_drawer 면 서랍 안내 + 시트 닫기
- partial → "Partially refunded" 토스트 + 쿼리 무효화로 배너 갱신
- already_complete → "Already refunded" 토스트 + 닫기
- 401 → "N attempts left" / 423 → "Locked until HH:MM" (기존 PIN 오류와 동일)
- isPending 동안 버튼 disabled (이중 제출 차단)

### 3. `VoidRefundSheet.tsx` 수정
- `submit()` catch 블록: 500 `refund_partial_failure` 감지 → 일반 에러 토스트 대신 "Refund incomplete — IDR X not refunded" 표시 후 시트 닫힘

### 4. `app/orders/[orderId].tsx` 수정
- `useRefundStatus(order.id)` 호출
- `partial_returns.length > 0` → warning 배너: "Refund incomplete · IDR X remaining" + 수단별 금액 목록
- "Retry remaining refund" 버튼 (solid/검정) → `RetrySheetOpen=true`
- `RefundRetrySheet` 마운트

### 5. Fixtures (7파일 · 서버 #214 계약 그대로)
- `pos-refund-status-200-partial.json` — partial_returns 1건
- `pos-refund-status-200-complete.json` — partial_returns 비어 있음
- `pos-refund-retry-200-completed.json` — status=completed · open_drawer=true
- `pos-refund-retry-200-partial.json` — status=partial · remaining_failed_amount>0
- `pos-refund-retry-200-already-complete.json` — already_complete=true
- `pos-refund-retry-401.json` — 401 mismatch · remaining_attempts
- `pos-refund-retry-500.json` — 500 refund_partial_failure

---

## 기계 판정 결과

### 어설션 (`scripts/m3-1105-ao-assertions.mjs`)
```
33/33 passed · 0 failed
```
fixture 7건 × 계약 필드 전수 검증.

### Playwright iPad 1180×820 (`scripts/m3-1105-ao-screenshots.mjs`)
```
8/8 passed · 0 failed · pageErrors: 0
```
- ① 주문 상세 배너 (`refund-incomplete-banner`) + 버튼 (`order-retry-refund`) 노출 확인
- ② 재시도 시트 (`refund-retry-sheet`) + PIN 입력 + 승인번호 입력 노출 확인
- ③ retry POST 호출 후 배너 사라짐 확인

### TypeScript
신규 에러 0건 (기존 pre-existing 2건 불변).

### 스크린샷
- `/tmp/m3-1105-ao-screenshots/01-order-detail-banner.png` — 배너 + "Retry remaining refund" 버튼
- `/tmp/m3-1105-ao-screenshots/02-retry-sheet.png` — 시트 (PIN + 승인번호 둘 다)
- `/tmp/m3-1105-ao-screenshots/03-after-retry-success.png` — 성공 후 배너 사라진 화면

---

## 미검증 항목
- 실 서버 연동 (서버 #214 머지 후 실기): 실기 테스트 미수행
- 423 `locked` 경로 실기 (fixture 기반 단위 검증만)
- 500 retry 중 재실패 경로 실기

---

## Deferred 순증감
- 소진: 결정 A "남은 금액 다시 환불" (M3-1105-AO)
- 신규 이연: 0건
