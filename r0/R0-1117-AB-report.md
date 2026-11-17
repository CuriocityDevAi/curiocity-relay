#184 APPROVE · #185 APPROVE

## #184 fix(pin): M1-1117-M — Manager PIN 숫자패드

### 변경 범위 (3파일, #184 고유)
- `__tests__/m1-1117-m-pin-numpad.test.ts` (신규)
- `components/orders/RefundRetrySheet.tsx`
- `components/orders/VoidRefundSheet.tsx`

### REQ 체크

**DigitsInput PIN 경로 완전 교체**
- `VoidRefundSheet.tsx`: `import { DigitsInput }` 삭제 확인 (grep 0건). PIN step은 4칸 View(●) + NumericKeypad로 교체.
- `RefundRetrySheet.tsx`: PIN(CASH/QRIS) 경로 → NumericKeypad 교체. CARD 승인번호 경로는 DigitsInput 유지 (설계대로).
- testID `manager-pin-digit-0..3` / `refund-retry-pin-digit-0..3` 호환 유지.

**틀린 PIN 비움·잠금**
- VoidRefundSheet: 4자리 완성 → `isValidManagerPin` 미통과 시 `onSubmitPin` 미호출; 오류 발생 시 `setPin('')` 기존 동작 유지.
- 두 시트 모두 `pinLockActive || isPending` guard → 잠금 중 입력 차단.
- RefundRetrySheet: `onPress`/`onDelete`/`onClear` 모두 lock guard 보유.

**QRIS void 차단 문구 개선**
- 제목: "Void order" → "This order can't be voided" (isQrisVoidBlocked 분기)
- 본문: tender === 'qris' ? "It was paid with QRIS, so the money has already been transferred…" : "Part of it was paid with QRIS, so some of the money has already been transferred…"
- 버튼: "Go to Refund" → "Refund this order"

**NumericKeypad props 타입 적합성**
- `NumericKeypadProps`: `onPress(key: string)`, `onDelete()`, `onClear()`, `disabled?`, `testID?` — 두 시트 모두 완전 일치.

**테스트**: 12 passed | 1 todo (render 테스트 — 명시적 스킵, 허용 범위)
**tsc 신규 오류**: 0 (props 타입 정합, import 추가 적절)

---

## #185 fix(checkout): M1-1117-O — success 화면 register_session_id 패치

### 변경 범위 (1파일)
- `app/checkout/success/[orderId].tsx`: 4 insertions, 2 deletions

### REQ 체크

**`openSession.data?.id` 사용이 snapshot 조회 계약과 맞는지**
- `useCustomerDisplaySnapshot(registerId?: string)` → 경로 `/admin/pos/registers/${registerId}/snapshot` — register_session_id를 파라미터로 받는 계약.
- Before: `settings.data?.stock_location?.id` = stock_location_id → 계약 불일치 → snapshot 항상 null.
- After: `useCurrentOpenSession(stock_location_id).data?.id` = register_session_id → 계약 일치. M3-1116-R 패치(`checkout/[draftOrderId].tsx` 적용 패턴)와 동일.

**세션 없을 때 처리**
- `useCurrentOpenSession`: `enabled: !!stockLocationId` — location 없으면 호출 안 함.
- `openSession.data` nullable: `openSession.data?.id` = undefined → `useCustomerDisplaySnapshot(undefined)` → `enabled: !!registerId` = false → 폴링 없음. 안전.

**다른 화면 영향**
- diff stat: 1 file only. 다른 checkout 화면(split-tender, tender-qris, delivery) 비영향.

**tsc 신규 오류**: 0
- `useCurrentOpenSession(settings.data?.stock_location?.id)`: `stock_location?.id` = `string | undefined` → `stockLocationId?: string` 일치.
- `openSession.data?.id` = `string | undefined` → `registerId?: string` 일치.

**테스트**: 별도 unit 테스트 없음. 변경 1줄(registerId 소스 변경)이고 타입 안전 — 허용 범위.
