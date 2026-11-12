# M3-1105-BB · Void·환불 완료 토스트 — AY 복구

## AY 작업물 복구 여부

AY 작업물이 `feat/m3-1105-ba-refund-receipt-share` 브랜치 working tree에 미커밋 상태로 존재 →
`fix/m3-1105-ay-void-toast` 브랜치에는 커밋 없음(origin/master 그대로). BB에서 BA 브랜치 위에 커밋.

## 근본 원인

**`components/ui/BottomSheet.tsx:235`** — `<Toast>`가 슬라이딩 `Animated.View` 내부에 있어 최우선 등록 인스턴스가 됨.

```
showToast.success()   // → in-Modal Toast 가 받음
onClose()             // → Modal 닫힘 → in-Modal Toast unmount → 토스트 소멸
```

`react-native-toast-message`는 refs 배열을 역순 탐색 — 마지막 등록 Toast 가 최우선.

## 수정 내용

### 1. `BottomSheet.tsx:237-240`
Toast를 sliding `Animated.View` 밖 `zIndex:9999` absolute 래퍼로 이동.

### 2. `VoidRefundSheet.tsx` — 모든 성공/실패 경로
```ts
onSuccess?.({...});
onClose();                        // 먼저 시트 닫기
setTimeout(toastFn, 100);         // 100ms 뒤 전역 Toast 가 받음
```
- `submitPartial` (부분 환불): `"Refunded IDR N (Cash) · N items"`
- `submitFull` void: `"Order voided · IDR N refunded (Method)"`
- `submitFull` refund: `"Refunded"`
- 에러 경로 partial failure: `onClose() → setTimeout(() => showToast.error('Refund incomplete'), 100)`

### 3. `RefundRetrySheet.tsx` — 세 경로 동일 패턴
- `already_complete`: `onClose() → setTimeout(() => showToast.info('Already refunded'), 100)`
- `completed`: `onClose() → setTimeout(toastFn, 100)`
- `partial`: `onClose() → setTimeout(() => showToast.info('Partially refunded'), 100)`

## PR 번호

**PR #108** — feat(m3-1105-ba): 부분 환불 영수증 · BB 수정 포함
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/108

## git ls-tree

```
100644 blob ecc3e085223badd8ef5ab9f25570b3a36a946072	__tests__/void-toast-order.test.ts
100644 blob 6e87cc6d71cbc2f8bcd67946b94106d39616dac4	components/orders/RefundRetrySheet.tsx
100644 blob 1625373b968143b734ea289e0330374a9f8cf8d4	components/orders/VoidRefundSheet.tsx
100644 blob 65ee4e6bd46aa711a64f2d542bddcadf1575d485	components/ui/BottomSheet.tsx
```

## 이연 순증감

0 (신규 이연 없음)

## 검증

- Vitest 4개 통과 (`__tests__/void-toast-order.test.ts`)
- `screenshots-m3-1105-ay/` 증거 스샷 3장 커밋
- 커밋: `2a03576` → `origin/feat/m3-1105-ba-refund-receipt-share` push 완료
