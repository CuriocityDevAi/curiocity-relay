PASS

## PR
https://github.com/CuriocityDevAi/storeport/pull/444

## 커밋
- `a8bcd94` feat(cd): M1-1125-T — CD sync flow 新設計 (OrderList/PhoneFlow/selector 35조합)
- `b876ef8` fix(cd): M1-1125-T — feature-map 등록 (cd-sync-flow 5파일 unmatched 수정)

## CI 결과 (heavy-cloud run 45605358493)
| 체크 | 결과 |
|---|---|
| check (feature-map) | ✅ pass |
| markers-and-forbidden | ✅ pass |
| changes-filter | ✅ pass |
| route | ✅ pass |
| docker-build-commerce-core | ✅ pass |
| customer-display·typecheck | ✅ pass |
| customer-display·unit | ✅ pass |
| customer-display·build | ✅ pass |
| customer-display·e2e | ✅ pass |
| e2e-admin-loyalty | ❌ fail (pre-existing · admin-smoke.spec.ts, commerce-core 관리자 UI 무관) |

## 화면 선택 조합 테스트 (47 passed)

### selectCdView 35조합 (PaymentPhase × CustomerFlowState)

| payment_phase | customer_flow | 결과 |
|---|---|---|
| building | none | order-list (enterPhoneEnabled=false) |
| tendering | none | order-list (enterPhoneEnabled=true) |
| paid | none | receipt-full |
| failed | none | order-list (enterPhoneEnabled=false) |
| cancelled | none | order-list (enterPhoneEnabled=false) |
| building | entering | phone-flow · keypad · screen-name |
| tendering/cash | entering | phone-flow · keypad · screen-name |
| tendering/qris | entering | phone-flow · keypad · qris |
| tendering/split | entering | phone-flow · keypad · remaining |
| paid | entering | phone-flow · keypad · receipt-mini |
| failed | entering | phone-flow · keypad · screen-name |
| cancelled | entering | phone-flow · keypad · screen-name |
| building | first_visit | phone-flow · first-visit · empty |
| tendering | first_visit | phone-flow · first-visit · screen-name |
| paid | first_visit | phone-flow · first-visit · receipt-mini |
| failed | first_visit | phone-flow · first-visit · screen-name |
| building | confirming | phone-flow · confirm · empty |
| tendering | confirming | phone-flow · confirm · screen-name |
| paid | confirming | phone-flow · confirm · receipt-mini |
| failed | confirming | phone-flow · confirm · screen-name |
| building | confirmed | phone-flow · waiting · empty |
| tendering | confirmed | phone-flow · waiting · screen-name |
| paid | confirmed | phone-flow · earned · receipt-mini |
| failed | confirmed | phone-flow · failed · screen-name |
| cancelled | confirmed | phone-flow · failed · screen-name |
| building | skipped | order-list (enterPhoneEnabled=false) |
| tendering | skipped | order-list (enterPhoneEnabled=true) |
| paid | skipped | receipt-full |
| failed | skipped | order-list (enterPhoneEnabled=false) |
| building | unconfirmed | order-list (enterPhoneEnabled=false) |
| tendering | unconfirmed | order-list (enterPhoneEnabled=true) |
| paid | unconfirmed | receipt-full |
| failed | unconfirmed | order-list (enterPhoneEnabled=false) |

### 타이머 테스트
- entering 20초 무입력 → skip 액션 발동 ✅
- confirming 20초 무응답 → confirm_timeout 액션 발동 ✅

### 경우 1 전환 타이밍
- customer_flow=none, paid: receipt-full → 3초 후 receipt-then-keypad ✅

## 구현 파일 목록 (apps/customer-display/)

**타입**
- `src/types/cd-sync-contract.ts` — PaymentPhase · CustomerFlowState · CustomerFlow · CdSnapshot · CdAction

**화면 선택 함수**
- `src/lib/cd-screen-selector.ts` — selectCdView(phase, flow, tender?) → CdView
- `src/lib/__tests__/cd-screen-selector.test.ts` — 47 테스트

**스크린**
- `src/screens/OrderListScreen.tsx` — 품목 32px · 합계 64px · 좌 2/3 + 우 1/3
- `src/screens/PhoneFlowScreen.tsx` — 좌 1/3 + 우 2/3 래퍼 · 영수증→키패드 슬라이드

**우측 패널 컴포넌트 (src/components/cd-sync/)**
- `KeypadPanel.tsx` — 번호 입력 · 20초 타이머
- `FirstVisitPanel.tsx` — 첫 방문 안내
- `ConfirmPanel.tsx` — 번호 확인 · [Yes, that's me] · [Change number] · 20초 타이머
- `WaitingPanel.tsx` — 결제 대기
- `EarnedPanel.tsx` — 포인트 적립 완료
- `FailedPanel.tsx` — 결제 실패
- `SkippedPanel.tsx` — skipped/unconfirmed
- `LeftPaymentPanel.tsx` — 5종 (screen-name · qris · remaining · receipt-mini · empty)

**라우트**
- `app/cd-sync.tsx` — 목 상태 머신 + selectCdView 렌더

**목 어댑터 확장**
- `src/mocks/adapter.ts` — ?flow=cd-sync&payment_phase=...&customer_flow=... 파라미터

**e2e**
- `e2e/cd-sync-flow.spec.ts` — 11개 상태 스크린샷 · screenshots/cd-sync/

## 스크린샷 목록 (Playwright)
1. `order-list-building-none.png`
2. `order-list-tendering-none.png` (Enter phone number 버튼 활성)
3. `keypad-tendering-entering.png`
4. `first-visit-tendering-first_visit.png`
5. `confirm-tendering-confirming.png`
6. `waiting-tendering-confirmed.png`
7. `earned-paid-confirmed.png`
8. `failed-failed-confirmed.png`
9. `qris-tendering-entering.png`
10. `receipt-full-paid-none.png`
11. `remaining-tendering-entering.png`
