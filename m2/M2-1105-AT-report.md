# M2-1105-AT 리포트 — 배달·선주문 Fulfill 시트 현황

진단 완료: 2026-11-12 · 담당: M2 (Sonnet)

---

## 결론 한 줄

**REQ Q1~Q3 + 전달 교통정리 전 항목이 서버·앱 양쪽에 구현 완료 · 실기 통과 기록 있음. 단, work-queue/open-requirements "대기" 절에 이미 머지된 항목 2건(반품 품목 선택 화면 #101 · Fulfill 시트 #67)이 갱신 안 된 채 남아 있어 오독 가능.**

---

## 현황표

| REQ 항목 | 서버 구현 (file:line · PR) | 앱 구현 (file:line · PR) |
|---|---|---|
| Q1: 배송지·연락처 = 결제할 때 | `tenders/route.ts` (delivery 블록 L570~) · #206 ✅ | `checkout/delivery/[draftOrderId].tsx` · #75 ✅ |
| Q2: Delivery Fulfill 필수 = 택배사만 | `fulfill/route.ts:307-316` · #209 ✅ | `FulfillSheet.tsx:69,213` · #67 ✅ |
| Q3: Delivery = 1단계(Fulfill = 차감+Completed) | `fulfill/route.ts:421-838` (#205+) ✅ | `FulfillSheet.tsx:85` · `[orderId].tsx:663` ✅ |
| Takeaway = 즉시 Hand over | `fulfill/route.ts` takeaway 경로 ✅ | `[orderId].tsx:660-661` showHandOverImmediate ✅ |
| Pre-order DP → 잔금 → Fulfill 경로 | `tenders/route.ts:577-584` paid_full 전이 ✅ | `[orderId].tsx:720-731` Collect balance 버튼 ✅ |
| Fulfill 시트 (Pickup/Delivery 탭) | — | `FulfillSheet.tsx` M3-1105-X · #67 ✅ |
| Delivery 칩 활성 | — | `OrderTypePicker.tsx` M3-1105-AC (disabled 없음) ✅ |
| 결제 완료 화면 Hand over 없음(Delivery/Pre-order) | — | `SuccessReceiptAnim.tsx:96-108` · #79 ✅ |
| 서버 계약 `fulfill {stage, method, courier, driver, contact, tracking_ref, note}` | `fulfill/route.ts:372-400` ✅ | `api/hooks/pos-payments.ts:202-228` FulfillInput ✅ |

---

## Pre-order 잔금 → Fulfill 경로 연속성

경로가 끊김 없이 이어짐:

1. DP tender → server: `preorder.stage='dp_paid'`, `balance_due > 0` (`tenders/route.ts:577-603`)
2. Orders 상세 `showCollectBalance=true` → `/checkout/tender-cash?isBalance=1&balanceDue=N` (`[orderId].tsx:720-731`)
3. 잔금 tender → server: `preorder.stage='paid_full'`, `balance_due=0` (`tenders/route.ts:580-585`)
4. Orders 상세 reload: `isPreorderReady=true` → `showFulfillSheet=true` (`[orderId].tsx:656,663`)
5. FulfillSheet(mode='preorder') → Pickup/Delivery 탭 → submit
6. 서버 fulfill: preorder + paid_full 가드 통과 (`fulfill/route.ts:405-419`) → 재고 차감 + `completeOrderWorkflow` ✅

---

## Void(restock 필수) · #219(차감 1회) 충돌 여부

- **Void + fulfillment 충돌**: storeport #215 (`M1-1105-AS · fix: fulfillment 있어도 cancel 후 void`) 머지 완료 → "order has active fulfillment" 오류 해소. `void/route.ts` 는 fulfill/route.ts 와 완전히 별도 경로.
- **#219 차감 1회 가드** (`stockAlreadyDeducted` + `inventory_decremented_at` · `fulfill/route.ts:445-449`): fulfill 내부 가드이며 void는 별개 경로 → 이중 차감·충돌 없음.
- **restock 선택 가드** (M0-1105-AR · `void/route.ts`): fulfill 경로와 무관 → 충돌 없음.

---

## 빠진 것 · 보정

**빠진 기능: 없음.** 모든 REQ 항목 구현됨.

**work-queue/open-requirements 갱신 필요 (코드 아님 · 문서 보정):**

| 항목 | 현재 상태 (두 원장) | 실제 상태 (git) |
|---|---|---|
| 앱 반품 품목 선택 화면 | "대기 (발부 안 함)" | #101 머지됨 (`b37d128 · M3-1105-AX`) |
| Fulfill 시트(M3) | "대기 (발부 안 함)" | #67 머지됨 (`79419d0 · M3-1105-X`) |

→ 두 원장 갱신 시 위 2건을 ✅ 완료로 이동할 것.

---

## Kyu 실기 절차 (처음 하는 사람 · 쉬운 말)

### Delivery 주문 Fulfill

1. 카트 담기 → Checkout → "Order type" 에서 **Delivery** 선택 → Pay 버튼
2. Delivery 화면: 받는 사람 이름·연락처·주소 입력 → Continue
3. 현금/카드 결제 완료 → 영수증 화면에 "Awaiting dispatch" 안내 표시 (Hand over 버튼 없음) → Done
4. Orders 탭 → 해당 주문 (상태 칩: Awaiting dispatch) → **Fulfill** 버튼 탭
5. Fulfill 시트 열림:
   - Method: Delivery (자동 선택)
   - **Courier**: 반드시 입력 (예: "Grab Express") — 비우면 Fulfill 버튼 비활성
   - Driver, Driver contact, Tracking number, Note: 선택 입력
   - → **Fulfill** 버튼
6. Toast "Dispatched" → 주문 Completed 전환

### Pre-order Fulfill (전액 납부 후)

1. 카트 담기 → Checkout → "Order type" 에서 **Pre-order** 선택 → 픽업 날짜·시간 고르기 → Pay (계약금 DP만 결제)
2. 영수증 화면에 "Awaiting pickup" 안내 → Done
3. 고객이 잔금 내러 오면: Orders → 해당 주문 → **Collect balance** 버튼 → 현금 결제
4. 잔금 결제 완료 → Orders → 주문 → **Fulfill** 버튼 탭
5. Fulfill 시트 열림:
   - Method: Pickup(기본) 또는 Delivery 중 선택
   - Delivery 선택 시 Courier 필수, 나머지 선택
   - → **Fulfill** 버튼
6. Toast "Handed over" → 주문 Completed 전환

---

## 이연 순증감

이연 항목 없음 (진단 과제 · 코드 0).  
단, work-queue/open-requirements "대기" 절 2건 보정 권장 (반품 품목 선택 + Fulfill 시트).

---

## 착지 명령

```sh
cp /tmp/M2-1105-AT-report.md ~/projects/curiocity-relay/m2/ && cd ~/projects/curiocity-relay && git add m2/M2-1105-AT-report.md && git commit -m "m2: M2-1105-AT" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M2-1105-AT done "Q1~Q3·전달 교통정리 전 항목 구현 완료 · work-queue 반품+Fulfill 시트 2건 갱신 필요"
```
