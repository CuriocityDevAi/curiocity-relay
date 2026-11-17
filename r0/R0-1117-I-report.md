#172 APPROVE · #173 CHANGES

---

## PR #172 — feat(split): M1-1117-E 나눠결제 Slip 2 + 슬립 합치기 애니

**판정: APPROVE**

### 테스트
- Vitest: 42 files, 505 passed | 6 expected fail | 2 todo (master 대비 +1 file, +11 tests) ✅
- 신규 테스트: `m1-1117-e-slip-flow.test.ts` — split-qris-state 2nd done signal 단방향 전달·독립성 등 11개

### 타입체크
- 기존 오류 9개와 동일 (PR 변경 파일에 신규 TS 오류 없음). `app/_layout.tsx(8,8)` +1은 fresh worktree 환경 차이이며 PR 변경과 무관 ✅

### 웹 빌드
- `npx expo export --platform web` → Exported: dist ✅

### 금액 계산·Xendit 호출 로직 변경 0 확인
- `buildSplitBody` 호출 시그니처 무변경. 1차·2차 tender POST body 동일.
- 2차 QRIS(`onProcessSecondQris`)에서 router.navigate → `isSplitSecond='1'` 플래그 전달만 추가; Xendit 호출 경로 미변경 ✅

### Cash/Card/QRIS 2차 모두 Slip 2 → Done → 애니 → 최종
- Cash: `onProcessSecond` → `setStep('second-confirmed')` ✅
- Card: `onConfirmSecondCard` → `setStep('second-confirmed')` ✅
- QRIS: `isSplitSecond='1'` → tender-qris 완료 후 `signalSplitQrisSecondDone` → `useFocusEffect` → `setStep('second-confirmed')` ✅

### 애니 탭 건너뜀
- `SlipMergeAnim`이 `<Pressable onPress={finish}>` 로 감싸짐 — 탭 즉시 `finish()` 호출 ✅

### 동작 줄이기
- `AccessibilityInfo.isReduceMotionEnabled()` 체크 → 페이드만 ✅

### 자동 타이머 없음
- Done 버튼은 사용자가 직접 탭해야 활성화 됨. `SlipMergeAnim` 내부 `setTimeout(finish, 740ms)`은 애니 재생 완료 타이머이지, Done 버튼을 자동으로 누르는 타이머가 아님 ✅

### 앱 재시작 복구 흐름
- `pendingSuccess` state은 메모리에만 존재 → 재시작 시 초기화. `navigateSuccess(ps)` 에서 `ps.receiptId === null` 이면 `router.navigate('/(tabs)/orders')` 로 fallback ✅

### ReceiptCard fixture labels 가리기 여부
- `types/receipt.ts`에서 `ReceiptSnapshot.labels: ReceiptLabels` — required (optional 아님). TypeScript가 계약을 강제하므로 서버 정상 경로에서 labels 누락 불가. ReceiptCard 는 `snap.labels.subtotal` 등을 null-guard 없이 접근하므로 구버전 영수증에서 크래시 가능성은 pre-existing risk이며 이 PR이 도입하거나 가리는 것이 아님. fixture 수정은 타당 ✅

---

## PR #173 — feat(customer): M3-1117-E 번호만 있는 손님 허용

**판정: CHANGES REQUESTED**

### 테스트
- Vitest: 41 files, 504 passed | 6 expected fail | 2 todo (master 대비 +10 tests) ✅

### 타입체크
- 기존 오류 9개와 동일 (PR 변경 파일에 신규 TS 오류 없음) ✅

### 웹 빌드
- `npx expo export --platform web` → Exported: dist ✅

### 서버 email optional 확인
- storeport PR#322 diff 직접 확인:
  ```
  Body: { phone: string, email?: string, first_name?: string, last_name?: string }
  PosCustomer { email: string | null, ... }
  ```
  서버 핸들러: `const email = toStr(body.email)` — email 없는 요청 정상 처리, 추가 검증 없음 ✅
- `api/hooks/customers.ts`의 `PosCustomer.email: string | null` 타입 변경과 일치 ✅

### isPosDefaultCustomer 오분류 수정
- `app/checkout/[draftOrderId].tsx`: `!customerEmail` → `!draftOrder.data.customer` ✅
- `app/orders/[orderId].tsx`: `!customerEmail` → `!order.customer` ✅
- email 없는 손님 → `customerEmail = undefined` → 기존 로직은 `!customerEmail = true` → 기본 손님으로 오인. 수정 후 customer 객체 존재 여부로 판별 ✅

### Cart CustomerBadge 기본 손님 오인 여부
- `cart.tsx:248` 체크: `customer.email === DRAFT_ORDER_DEFAULT_CUSTOMER_EMAIL`
  → email=null 이면 `null === 'noreply+pos-guest@agilo.com'` = false → 오인 없음 ✅

### ⛔ Cart CustomerBadge 표시 미수정 (CHANGES REQUIRED)
- **요청 범위에 명시된 "Cart 뱃지" 항목이 코드에 반영되지 않음.**
- `cart.tsx:283`: `<Text className="text-lg">{customer.email}</Text>` — 이름 없는 손님에서 email=null 이면 텍스트 blank (crash는 아니나 `Customer / [빈칸]` 표시).
- `customer-lookup.tsx`에서는 `item.email || item.phone_display` 로 대체했으나 CartBadge는 같은 처리 없음.
- 수정: `customer.email || customer.phone || '—'` 로 대체 필요.

### 목록·검색·checkout·orders 상세 표시 보호
- `customer-lookup.tsx:225`: `{item.email || item.phone_display}` ✅
- `orders.tsx:338`: `item.customer?.email || item.customer?.phone || 'Unknown Customer'` ✅
- `checkout/[draftOrderId].tsx:255`: email 필드 조건부 렌더링 (`{customerEmail ? ...}`) ✅
- `orders/[orderId].tsx`: `isPosDefaultCustomer` 판별 수정 ✅
