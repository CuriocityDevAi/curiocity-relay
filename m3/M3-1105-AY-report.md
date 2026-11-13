# M3-1105-AY · Void/Return 완료 토스트 — 시트 닫힘 뒤 표시 수정

## 근본 원인

**`components/ui/BottomSheet.tsx:235`** — `<Toast>` 가 슬라이딩 `Animated.View` 내부에 존재 →
Modal 이 열려 있는 동안 in-Modal Toast 가 `react-native-toast-message` refs 배열의 최우선 인스턴스.

```
showToast.success()   // → in-Modal Toast 가 받음
onClose()             // → Modal 닫힘 → in-Modal Toast unmount → 토스트 소멸
```

## 수정 내용

### 1. `BottomSheet.tsx` — Toast 를 sliding Animated.View 밖으로 이동
Toast 를 sheet panel Animated.View 의 sibling 으로 이동, 추가로 `zIndex: 9999` 래퍼로 content panel transform stacking-context 위에 렌더.

### 2. `VoidRefundSheet.tsx` — onClose → setTimeout(toastFn, 100) 순서
Void·Refund·PartialRefund 모든 성공/실패 경로:
```ts
onSuccess?.({...});
onClose();                        // 먼저 시트 닫기
setTimeout(toastFn, 100);         // 100ms 뒤 토스트
```
토스트 메시지: `"Order voided · IDR 95,000 refunded (Card)"`

### 3. `RefundRetrySheet.tsx` — 동일 패턴 적용
already_complete · completed · partial 세 경로 모두 `onClose() → setTimeout(toastFn, 100)`.

## 영향 받는 토스트

| 시트 | 토스트 |
|---|---|
| VoidRefundSheet — void | "Order voided · IDR {amount} refunded ({Method})" |
| VoidRefundSheet — refund | "Refunded" (+ open_drawer sub-line) |
| VoidRefundSheet — partial failure | "Refund incomplete" (error) |
| RefundRetrySheet — completed | "Refunded" |
| RefundRetrySheet — already_complete | "Already refunded" |
| RefundRetrySheet — partial | "Partially refunded" |

## 검증

- **Vitest 4개 통과** (`__tests__/void-toast-order.test.ts`): onClose→showToast 순서, 99ms 경계값, 에러 즉시 호출, onSuccess→onClose→showToast 순서
- **iPad 웹 스샷 2장** (`screenshots-m3-1105-ay/`):
  - `01-void-toast-card-after-sheet-close.png` — Card void, toast "Order voided · IDR 95,000 refunded (Card)"
  - `02-void-toast-open-drawer.png` — Cash void, toast + "Open the cash drawer" sub-line

## 변경 파일

```
components/ui/BottomSheet.tsx
components/orders/VoidRefundSheet.tsx
components/orders/RefundRetrySheet.tsx
__tests__/void-toast-order.test.ts        (신규)
scripts/m3-1105-ay-screenshots.mjs        (신규)
screenshots-m3-1105-ay/                   (신규)
```
