#177 APPROVE

## 리뷰 대상

PR #177 `fix/M1-1117-G` — split 영수증 오디널·PIN 초기화·QRIS void Go to Refund  
Base: `master` (merge-base: `d4aeee6` docs/plan R0-1117-J)

---

## REQ 1 — 4개 결함 수정 확인

### ① Payment 1 of 2 슬립이 나오지 않아(현금)
- **이미 수정됨 (M1-1117-E / #172)** — 커밋 `15a941e`가 master에 반영돼 있음.
- 이번 PR은 E2E 픽스처 `e2e-receipt-split-qris.json`의 `tenders[0]`을 `qris→cash`로 교체해 Cash+QRIS 시나리오를 올바르게 명시. ①은 선행 PR로 해결된 것을 본 PR이 확인·픽스처만 정정.

### ② CASH (1st Slip) / QRIS (2nd Slip) 오디널 레이블
- `ReceiptCard.tsx`: `ordinal(n)` 순수 함수 추가 (11·12·13 예외 포함).  
- `TenderBlock`에 `slipIndex?: number` prop 추가. `slipIndex != null`일 때만 `CASH (1st Slip)` 형태로 출력.  
- 호출부: `snap.tenders.length > 1 ? i + 1 : undefined` — 단일 결제는 `undefined` → 레이블 없음. ✓  
- `ReceiptCard`는 화면 렌더·공유 이미지·재출력에서 동일하게 사용되는 단일 컴포넌트 → 세 경로 동일 보장. ✓

### ③ Manager PIN이 이미 입력되어 있는 화면 → 아무 동작 없음
- `VoidRefundSheet.tsx` `onPressConfirm()`: `setStep('pin')` 진입 직전 `setPin('')` · `setPinError(null)` · `setPinLocked(null)` 세 가지 모두 초기화. ✓  
- QRIS rejected → Cash 경로(`qris-refund-in-cash-btn` onPress)에도 동일한 3-state 초기화 추가. ✓  
- E2E 테스트 `③ Refund 실패 후 Confirm 재클릭 → PIN 칸 비워짐`이 첫 번째 칸 `expect(digit0).toHaveText('')`로 검증.

### ④ QRIS refund + Cash 버튼을 눌러도 아무 동작하지 않아
- 이전: `isQrisVoidBlocked` 시 method 선택 UI가 그대로 렌더되어 버튼이 보이지만 Confirm 로직이 막혀 무반응.  
- 수정: `isQrisVoidBlocked` 조건에서 method 선택 `<View>` 전체 + PIN 안내 텍스트를 조건부로 숨김(`!isQrisVoidBlocked`). 대신 "Go to Refund" `<Button>` 단독 표시. ✓  
- `onSwitchToRefund?.()` → 부모 `setVoidRefundAction('refund')` → `sameShift=false` → `plan.action='refund'` → `isQrisVoidBlocked=false` → Refund 모드 완전 전환. ✓  
- E2E `④ QRIS Void 버튼 → 차단 안내 + Go to Refund → Refund 모드` 가 `qris-void-blocked-block`, `qris-void-go-to-refund`, `void-refund-confirm` 순서로 검증.

### 금액 계산·Xendit 호출 로직 변경 0
- `submitVoidRefund` 내 `voidOrder`/`refundOrder` 호출 경로 무변경.  
- 에러 핸들러에 `extractErrorCode()` 추가는 toast 메시지 개선 전용. 로직 불변. ✓

---

## REQ 2 — 충돌·빌드·범위

### 충돌 여부
- merge-base `d4aeee6`에서 master는 `2a06246 M3-1117-C` 1개 커밋 추가.  
- M3-1117-C 변경 파일: `api/hooks/customers.ts`, `api/hooks/draft-orders.tsx`, `app/(tabs)/cart.tsx`, `app/product-details.tsx`, `components/payment/CustomerLinkSheet.tsx`, `e2e/flows/09-...`, `lib/phone-id.ts`.  
- PR 변경 파일: `app/orders/[orderId].tsx`, `components/orders/VoidRefundSheet.tsx`, `components/receipt/ReceiptCard.tsx`, `e2e/fixtures/e2e-receipt-split-qris.json`, `e2e/flows/10-m1-1117-g.spec.ts`, 스크린샷 4개.  
- **겹치는 파일 없음 → 충돌 없음.** ✓

### 테스트
```
Test Files  43 passed (43)
      Tests  526 passed | 6 expected fail | 2 todo (534)
   Duration  866ms
```
PR 변경 파일에서 신규 실패 0. ✓

### 타입 체크
PR 변경 3개 파일(`app/orders/[orderId].tsx`, `components/orders/VoidRefundSheet.tsx`, `components/receipt/ReceiptCard.tsx`)에 대한 TS 오류 0.  
기존 오류(`__tests__/split-pending-orders.test.ts`, `app/(tabs)/cart.tsx`, 등)는 모두 PR 미변경 파일의 pre-existing 오류. ✓

### 웹 빌드
`expo export --platform web` → `dist/` 정상 생성. 오류 없음. ✓

### 변경 파일 범위
9개 파일 모두 목적 범위 내.  
- 프로덕션 코드 3개 (orderId, VoidRefundSheet, ReceiptCard)  
- E2E 픽스처 1개 (Cash+QRIS 시나리오 정정)  
- 신규 E2E 스펙 1개 (3개 그룹 / 326줄)  
- 증거 스크린샷 4개  
범위 외 파일 없음. ✓

---

## REQ 3 — PR 리뷰 코멘트

```
APPROVE

4개 결함 모두 수정 확인:

① Cash 1st Slip — M1-1117-E(#172)에서 선행 수정, 본 PR이 픽스처를 Cash+QRIS로 정정 완료.
② 오디널 레이블 — ordinal() 함수 + slipIndex prop으로 단일 결제는 레이블 없음, 복수는 (1st Slip)/(2nd Slip). ReceiptCard 단일 컴포넌트 → 화면·공유·재출력 동일.
③ PIN 초기화 — onPressConfirm 진입 시 setPin/setPinError/setPinLocked 세 state 모두 초기화. QRIS→Cash 경로에도 동일 적용.
④ QRIS void 무반응 버튼 → Go to Refund — isQrisVoidBlocked 시 method 선택 UI 완전 숨김, [Go to Refund] 단독 표시 → onSwitchToRefund → plan.action='refund'로 전환.

금액 계산/Xendit 호출 로직 변경 없음. master(M3-1117-C) 충돌 없음. 테스트 526/526 통과. TS 신규 오류 없음. 웹 빌드 정상.
```
