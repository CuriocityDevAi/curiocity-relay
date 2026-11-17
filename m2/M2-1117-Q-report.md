PR #337 · 수리 4 · stage=cart 계약 · 테스트 404(commerce-core)+150(customer-display)

## 수리 4곳 완료
1. CartScreen CTA View→Pressable + onKeypad prop
2. display-machine KEYPAD_OPEN 이벤트 + cart→keypad 전이
3. index.tsx CartScreen onKeypad 콜백 연결
4. order-snapshot-paid subscriber payment.captured path 버그 수정 (resolveOrderIdFromPaymentId 공용 lib)

## CD-15 stage=cart 계약
- checkout-snapshot route: stage="cart"|"checkout" 파싱 → upsertSnapshotForRegister status 전달
- status='cart' enum: DB 모델 + SnapshotStatus 타입 + 마이그레이션(Migration20261117000001) + 손님앱 타입
- display-machine: status=cart → cart 화면 라우팅 · P-2 rule E status=cart 포함
- CartScreen: status=cart 시 CTA 미표시 · 신규 아이템 1.2초 강조

## 테스트 결과
- customer-display vitest: 150 passed (9 files)
- commerce-core jest unit: 404 passed (30 suites, 신규 subscriber 4건)
- 신규 테스트: display-machine KEYPAD_OPEN/cart routing/P-2 · subscriber payment.captured→paid
