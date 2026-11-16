원인 (a) earn_base 미저장("paid_non_credit" 세후 기본값 그대로) · PR #316 (테스트 전용, 돈 로직 변경 없음) · 각 경로 900 ✅ (pre_tax 설정 시)

## 사실 확인 (REQ 1)

### (a) earn_base 실제 저장·적용 여부
❌ **미저장**. 운영 DB: `earn_base = "paid_non_credit"` (세후, 기본값). `pending = null`.
audit trail 2건: ① enabled false→true · ② earn_on_balance_tender_only true→false.
`earn_base`는 한 번도 변경된 기록 없음.

Kyu가 `earn_on_balance_tender_only` 토글(ungated, 즉시 저장)은 성공했으나,
`earn_base`(GATED, SimulateView → 시뮬 완료 → Save 필요)는 저장 플로우 미완료.

### (b) Kyu 테스트 주문이 설정 변경 후인지
운영 주문 3건 (11-16):

| 시각 (UTC) | total | item_subtotal | earn | earn 계산 |
|---|---|---|---|---|
| 12:59 | 33,000 | 30,000 | 330 | total×1% (세후) |
| 09:42 | 66,000 | 60,000 | 660 | total×1% (세후) |
| 06:31 | 99,000 | 90,000 | 990 | total×1% (세후) |

설정 변경(11-15 14:50) + #315 머지(11-16 10:55) **이후** 주문.
earn = total×1% 로 세후 계산 중 → earn_base="paid_non_credit" 현행 설정과 일치.

### (c) 운영 서버 #315 포함 여부
✅ 운영 커밋 `ffc2c14` = #315(8af5728) 이후. receipt-preview.ts 수정 반영됨.

---

## 경로 전수 확인 (REQ 2)

| 경로 | 함수 체인 | earn_base 반영 |
|---|---|---|
| 결제 시 subscriber (`loyalty-earn-on-paid`) | `earnForOrder → previewReceipt` | ✅ |
| 결제 후 번호 연결 (`linkCustomerToOrder → earnForOrder`) | `earnForOrder → previewReceipt` | ✅ |
| POS 화면 (LinkCustomerSheet · 영수증) | 서버 결과 표시, 자체 계산 없음 | ✅ |
| 손님 화면 earn_preview (#313) | `snapshot-earn.ts → previewReceipt` | ✅ |

4개 경로 모두 동일한 `previewReceipt` 함수 경유.
earn_base 반영 버그(#315 fix) 이후 각 경로에서 earn_base 설정이 올바르게 적용됨.

---

## 단위 테스트 결과 (REQ 3)

`previewReceipt` 에 직접 90,000 + pb1=10% + toggle=OFF + pre_tax 주입:

| 경로 | 설정 | total | earn | 결과 |
|---|---|---|---|---|
| subscriber (payment.captured) | earn_base=pre_tax, toggle=OFF | 99,000 | 900 | ✅ |
| post-pay link (linkCustomerToOrder) | earn_base=pre_tax, toggle=OFF | 99,000 | 900 | ✅ |
| (현 운영 — 비교) | earn_base=post_tax, toggle=OFF | 99,000 | 990 | 세후 |

**346/346 unit tests ✅**

---

## 운영 조치 필요

Kyu: Admin → Loyalty Settings → **Simulate →** → "Earn base" 드롭다운에서
`"Paid pre-tax (excl. store credit)"` 선택 → 시뮬 완료 대기 → **Save changes** → 이유 입력 → Confirm.

저장 완료 후 earn_base = "paid_non_credit_pre_tax" 로 변경됨.
90,000 + pb1=10% 주문 기준: earn = 900 (item_sub×1%, 세전).
