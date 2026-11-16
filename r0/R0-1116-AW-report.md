#163 APPROVE · #165 APPROVE · #317 APPROVE(조건부) · OptionChip 충돌 있음

---

## 1) fork #163 (M1-1116-AO) — APPROVE

### 슬립 구조
- 합계·세금·품목 없음 ✓ — `PaymentSlipCard` Order/Time/결제수단/거래번호만 표시
- "This is not a receipt. Final receipt is issued after full payment." ✓ (`components/receipt/PaymentSlipCard.tsx:120`)
- "Payment N of 2" ✓ (`PaymentSlipCard.tsx:66`)
- CASH 거스름돈(received_amount/change) ✓
- CARD 승인번호(approval_code) ✓
- QRIS `qris_receipt_id → Xendit ID → reference_no` 우선순위 ✓ (`PaymentSlipCard.tsx:54–56` / `lib/payment-slip.ts`)

### Print 버튼 — 기존과 동일 판정
슬립 Print는 `showToast.info('Printed', ...)` 토스트만. 기존 Reprint도 동일:
- `app/checkout/success/[orderId].tsx:58` — `showToast.info('Reprinted', ...)` 토스트뿐
- `app/orders/[orderId].tsx:650` — `showToast.info('Reprinted', ...)` 토스트뿐

BLE/ESC-POS 실인쇄 경로(`lib/printer/`)가 Reprint에도 연결되지 않은 상태 → 슬립도 "기존과 동일" 판정.

### ReceiptCard Ref
- `slice(-8)` 완전 제거 ✓ (`ReceiptCard.tsx` diff)
- `qris_receipt_id` → Xendit ID → `reference_no` 체인 ✓
- 긴 값 줄바꿈: `Row` 컴포넌트 `flex-row justify-between` — 양쪽 텍스트 고정 배치. 초장 Ref가 오른쪽 Text를 밀 수 있으나 스크롤 가능한 ReceiptCard 내부이므로 블로커 아님.

### `isSplitReceipt = tenders.length === 2` 오작동 여부
`SuccessReceiptAnim`은 checkout success 화면(`app/checkout/success/`)에서만 사용. refund/void 영수증은 `app/orders/[orderId].tsx`에서 ReceiptCard를 직접 렌더. SuccessReceiptAnim이 refund Receipt를 받을 경로 없음 → 오작동 없음.

### 1차 슬립 시각
`setFirstSlipAt(new Date().toISOString())` — 클라이언트 근사값. 서버 confirmed_at 없어 불가피. **허용(블로커 아님)**.

---

## 2) fork #165 (M3-1116-AM) — APPROVE

### Order type 버튼 높이
`OptionChip.tsx`: `isTab && sublabel ? 'py-4' : 'py-6'` → sublabel 있는 Takeaway/Pre-order/Delivery 버튼이 `py-4` (Button의 `p-4`와 동일 토큰) ✓. sublabel 없는 Cash/Card/QRIS 탭은 `py-6` 유지 ✓.

### sublabel 인라인
`isTab && sublabel ? <Text>· sublabel</Text> : null` 추가 ✓. 기존 별도 줄 렌더 `{sublabel ? (` → `{!isTab && sublabel ? (` 변경 ✓.

### 선택 상태 유지
`selected ? 'border-selected bg-selected' : 'border-line bg-surface'` 로직 미변경 ✓.

### 뱃지/톱니 겹침
`CustomerDisplayStatus` 내부 `mr-2` 제거 → 외부 컨테이너 `gap-3` 담당. "Customer Display Offline" 긴 텍스트도 `mr-3 flex-row items-center gap-3` 컨테이너 내에서 톱니와 분리 ✓.

---

## OptionChip 충돌 — 있음

**원인**: #164(M2-1116-AQ)와 #165(M3-1116-AM) 모두 `OptionChip.tsx` base `f67579b` 에서 분기.

- **#164** 변경: label `<Text>` 한 줄에 `labelClassName` 추가 (line 77 영역)
- **#165** 변경: 같은 label `<Text>` 줄은 그대로 두고 뒤에 isTab sublabel 인라인 블록 삽입 + `{sublabel ?` → `{!isTab && sublabel ?` 변경

머지 순서와 무관하게 충돌 발생:
- #164 선머지 → #165 적용 시: #165 패치의 `-` context(`...labelColor)}`)가 현재 파일과 불일치
- #165 선머지 → #164 적용 시: `{sublabel ?` context가 `{!isTab && sublabel ?`로 바뀌어 불일치

**권고**: #164 먼저 머지 후 #165 에서 `OptionChip.tsx` 수동 3-way 머지:
1. label `<Text>`에 `labelClassName` 유지 (from #164)
2. isTab inline sublabel 블록 추가 (from #165)
3. `{!isTab && sublabel ?` (from #165)

---

## 3) storeport #317 추가 커밋 (M3-1116-Z) — APPROVE(조건부)

### diff 내용
`Migration20261116000001.ts`에 `"deleted_at" timestamptz null` 한 줄 추가만. 삭제·변경 없음 ✓.

### 멱등성
`create table if not exists` → 이미 테이블이 생성된 환경(스테이징 등)에서 M3-1116-S(첫 커밋)가 먼저 적용됐다면 `deleted_at` 컬럼이 생성되지 않아 `verifyDeviceToken`이 "column does not exist"로 throw. 운영은 아직 미머지이므로 블로커 없음. **스테이징 이미 적용 시 `alter table customer_display_device add column if not exists "deleted_at" timestamptz null;` 별도 적용 필요** (보강 커밋 권고사항, 블로커 아님).

### 직전 APPROVE 유지
M3-1116-Z 커밋은 `deleted_at` 추가 한 줄 버그픽스뿐. 기존 로직 무변경. 직전 APPROVE **유지 가능**.
