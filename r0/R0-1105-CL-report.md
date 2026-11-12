# R0-1105-CL · 리뷰 리포트 — fork #108

**판정: APPROVE**  
부분 환불 영수증 · Share PNG · Void/환불 토스트 · AY 혼입 — 4개 REQ 모두 충족.  
단, `react-native-view-shot` 추가로 **EAS dev-client 재빌드 필수**.

---

## 검증 표

### REQ 1 — 부분/전액 환불 영수증

| 항목 | 파일:줄 | 커밋 | 상태 |
|---|---|---|---|
| `kind='partial_refund'` 타입 추가 | `types/receipt.ts:130` | b96926e | ✅ |
| PARTIAL REFUND 배너(검정) ReceiptCard | `components/receipt/ReceiptCard.tsx:153-162,181` | b96926e | ✅ |
| REFUND 배너(danger 빨강) 유지 | `ReceiptCard.tsx:181` 조건 `refundBanner==='REFUND'` | b96926e | ✅ |
| PARTIAL REFUND · ESC/POS `*** PARTIAL REFUND ***` bold | `lib/printer/receipt-escpos.ts:122-128` | b96926e | ✅ |
| `isVoidOrRefund` 플래그 — ESC/POS 경로 포함 | `receipt-escpos.ts:168` | b96926e | ✅ |
| `receiptId` 체인 → `md.returns[].receipt_id` 추가 | `app/orders/[orderId].tsx:629-650` | 9598b5f | ✅ |
| 영수증 탭 선택 UI (OptionChip · 기본=최신) | `orderId.tsx:797-820` | 9598b5f | ✅ |
| Reprint/Share 가 선택된 영수증 기준 (`resolvedReceiptId`) | `orderId.tsx:644-648, 701-717` | 9598b5f | ✅ |
| 서버 `kind='partial_refund'` 미배포 → 배너 미노출(이연) | — | — | ⏳ |
| 세금 배분·QR 서버 pending | — | — | ⏳ |

### REQ 2 — Share PNG

| 항목 | 파일:줄 | 커밋 | 상태 |
|---|---|---|---|
| `captureAndShareReceipt` 유틸 | `lib/receipt-share.ts:1-28` | bee2826 | ✅ |
| ViewShot ref + onShare PNG | `orderId.tsx:701,815-817` | 9598b5f | ✅ |
| 텍스트 메모 공유 제거 | `orderId.tsx:711-717` diff 기준 | 9598b5f | ✅ |
| 웹 대체: `<a download>` PNG | `lib/receipt-share.ts:16-20` | bee2826 | ✅ |
| `expo-sharing ~58.0.2` 추가 | `package.json:54` | 9598b5f | ✅ |
| `react-native-view-shot ^3.8.0` 추가 | `package.json:65` | 9598b5f | ✅ |
| TS 오류 임시 억제 (`types/native-modules.d.ts`) | `types/native-modules.d.ts` | 8ba81ac | ✅ |

### REQ 3 — 토스트

| 항목 | 파일:줄 | 커밋 | 상태 |
|---|---|---|---|
| BottomSheet Toast → sliding Animated.View 밖 zIndex:9999 absolute 이동 | `components/ui/BottomSheet.tsx:235-240` | 2a03576 | ✅ |
| `VoidRefundSheet.submitPartial` — `onClose() → setTimeout(toastFn,100)` | `VoidRefundSheet.tsx:196-202` | 2a03576 | ✅ |
| `VoidRefundSheet.submitFull` void — 동일 패턴 | `VoidRefundSheet.tsx:230-245` | 2a03576 | ✅ |
| `VoidRefundSheet.submitFull` refund — 동일 패턴 | `VoidRefundSheet.tsx:248-252` | 2a03576 | ✅ |
| `VoidRefundSheet.submit` partial failure — `onClose()→setTimeout(error,100)` | `VoidRefundSheet.tsx:267-270` | 2a03576 | ✅ |
| `RefundRetrySheet.already_complete` | `RefundRetrySheet.tsx:94-97` | 2a03576 | ✅ |
| `RefundRetrySheet.completed` | `RefundRetrySheet.tsx:99-109` | 2a03576 | ✅ |
| `RefundRetrySheet.partial` | `RefundRetrySheet.tsx:110-116` | 2a03576 | ✅ |
| 중복 토스트 없음 — 기존 직접 호출 완전 교체 | 위 모든 경로 diff 확인 | 2a03576 | ✅ |
| 결제·Fulfill 등 다른 시트 영향 없음 — sheet-open 중 직접 toastFn 호출 경로 미변경 | BottomSheet.tsx diff | 2a03576 | ✅ |
| 순서 불변식 테스트 4개 | `__tests__/void-toast-order.test.ts:1-83` | 2a03576 | ✅ |

> ⚠️ **미세 race 주의**: Toast 이동 후에도 Modal 내부에 위치. Modal 완전 unmount(~250ms) 시 in-Modal Toast 소멸. setTimeout 100ms 로 발화하면 이론상 modal 애니메이션(~250ms) 중 토스트가 뜨고, modal 닫힘 후 소멸 가능. iPad 웹 스샷(`screenshots-m3-1105-ay/` 3장)으로 웹 동작 확인됨. **iOS 네이티브 실기는 Kyu 필수 확인 항목.**

### REQ 4 — AY 미커밋 혼입 · master 충돌

| 항목 | 확인 | 상태 |
|---|---|---|
| AY 변경(BottomSheet·VoidRefundSheet·RefundRetrySheet) → BB commit `2a03576` 에 단일 명시 커밋 | 커밋 메시지 + diff 대조 | ✅ |
| AZ 커밋 4개 (ManagerPinSheet 삭제·handedOver fix·스샷·prettier) — 의도된 선행 작업 | 커밋 메시지 `chore/fix(m3-1105-az)` | ✅ |
| assertion 스크립트 수정 — ManagerPinSheet 삭제로 `pinSrc` 제거·`exists()` 헬퍼 추가 | `scripts/m3-1105-ad/ae` diff | ✅ |
| master(bbf1287) 대비 merge conflict 없음 | PR `mergeable_state: "unstable"` = CI 불안정, conflict 아님 | ✅ |
| screenshots-m3-1105-ay/ 3장 · screenshots-20261112/ 5장 — 실제 커밋 확인 | PR files 확인 | ✅ |
| 의도 외 파일 없음 | 34개 changed files 전체 확인 | ✅ |

---

## 네이티브 재빌드 필요 여부

**EAS Build (dev client) 재설치 필수.**  
`react-native-view-shot ^3.8.0` 은 비 Expo SDK 네이티브 모듈(iOS/Android native image capture). OTA(Metro JS 번들)로는 절대 동작하지 않음. `expo-sharing ~58.0.2` 도 신규 추가로 함께 빌드 필요. 기존 dev client 로 Share 버튼 누르면 crash 또는 무반응.

---

## Kyu 실기 확인 항목 (쉬운 말)

1. **EAS Build 먼저**: `npm install` 후 `eas build --profile development --platform ios` (또는 android). 기존 TestFlight/dev client 앱 삭제 후 재설치.
2. **부분 환불 → 영수증 탭**: 주문 상세에서 Return 완료 후 "Sale / Return" 탭이 나타나는지 확인. Return 탭 선택 시 환불 영수증으로 바뀌는지.
3. **Share → PNG**: Share 버튼 → 화면의 영수증 카드가 그림 파일로 iOS 공유 시트에 뜨는지. WhatsApp 등으로 전송 시 이미지 미리보기 확인.
4. **서버 배포 후**: 서버가 `kind='partial_refund'` 로 응답할 때 "PARTIAL REFUND" (검정 굵은 글씨) 배너 확인.
5. **토스트 (iOS 실기)**: Void/Refund 완료 후 시트가 닫히고 1-2초 뒤 토스트가 보이는지 확인. (웹은 스샷으로 확인됨, iOS native 추가 확인)

---

## 이연 순증감

| 종류 | 항목 |
|---|---|
| 신규 이연 없음 | — |
| 기존 이연 유지 | 서버 `kind='partial_refund'` · 세금 배분 · QR 코드 (서버 배포 대기) |
