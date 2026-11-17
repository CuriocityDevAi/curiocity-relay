DONE

## M1-1117-E · 나눠결제 Slip 2 표시 + 슬립 합치기 애니메이션

### 구현 내용

- **SlipMergeAnim** (`components/payment/SlipMergeAnim.tsx`): 0.42s 슬라이드 + 0.3s 페이드 오버레이. 탭으로 즉시 건너뜀. `AccessibilityInfo.isReduceMotionEnabled()` = 페이드만.
- **SplitStep 확장** (`app/checkout/split-tender/[draftOrderId].tsx`): `first-confirmed` / `second-confirmed` 스텝 추가. 모든 2차 결제(Cash·Card·QRIS) → Slip 2 → Done → SlipMergeAnim → 최종 영수증.
- **split-qris-state** (`lib/split-qris-state.ts`): `signalSplitQrisSecondDone` / `consumeSplitQrisSecondDone` 추가.
- **tender-qris** (`app/checkout/tender-qris/[draftOrderId].tsx`): `isSplitSecond='1'` 완료 시 `signalSplitQrisSecondDone` + `router.back()`.
- **fixture 버그**: `e2e-receipt-split-qris.json` snapshot `labels` 누락 → `ReceiptCard` crash 수정.

### 테스트 결과

- 단위: 11/11 pass
- E2E: 1/1 pass (Cash→Slip1→QRIS→Slip2→anim→영수증)
- 스크린샷: slip1 ✓ · slip2 ✓ · merge-anim ✓ · final-receipt ✓

### PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/172
