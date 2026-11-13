# R0-1105-DR 리뷰 보고서
head SHA: 63b0f031e054b26eab602834c3126d20315b7210
mergeable_state: MERGEABLE / mergeStateStatus: UNSTABLE (playwright pending)

## 판정
**APPROVE** (CI lint·assertions·flow-tests 통과, playwright 미완료이나 QRIS 화면과 무관한 E2E임을 감안)

---

## REQ 항목별 근거

### 1. fetchQrisStatus · payment_request_id

**정확히 붙음.** 변경 위치:

- `api/hooks/pos-qris.ts` 의 `fetchQrisStatus` 함수 (diff +38~+42):
  ```
  const qs = `?payment_request_id=${encodeURIComponent(paymentRequestId)}`;
  return sdk.client.fetch(`/admin/pos/orders/${orderId}/qris-status${qs}`, ...)
  ```
  쿼리 파라미터 이름이 서버 route(`q.payment_request_id`)와 완전히 일치한다.

- **QR 재발행 후 최신 ID 사용 여부**: `app/checkout/tender-qris/[draftOrderId].tsx` 의
  `checkStatus` 콜백은 `currentPaymentRequestId` 를 의존성 배열에 포함하고 있으며,
  폴링 응답(`res.payment_request_id`)이 오면 `setCurrentPaymentRequestId`로 업데이트된다.
  `onNewQr`(재발행)은 regenerate 응답에서 새 QR만 갱신하고 `payment_request_id`는
  다음 폴링 응답에서 업데이트된다.

  **잠재적 타이밍 이슈 (미미)**: `onNewQr` 완료 직후 ~ 다음 폴링 응답 전 10초 사이에
  수동 "Check payment"를 누르면 구 `currentPaymentRequestId`로 요청이 갈 수 있다.
  실제로 재발행 직후 서버가 새 `payment_request_id`를 첫 폴링 응답에 포함시키므로
  실용적으로는 허용 범위이지만, `onNewQr` 에서 `setCurrentPaymentRequestId(res.payment_request_id)`를
  직접 호출하면 더 안전하다 (optional 개선사항, 머지 블로커 아님).

### 2. 상태 처리 · captured → 완료 · 중복 방지

**서버 반환 상태값** (storeport `qris-status/route.ts` 실제 코드):
- `captured` — DB 이미 captured (또는 원격 authorized)
- `expired` — xendit_status = EXPIRED
- `failed` — xendit_status = FAILED/CANCELED
- `pending` — 그 외 (기본)
- `paid` 는 **서버가 직접 반환하지 않음** — 클라이언트 측 `QrisStatus` 타입에만 존재

**클라이언트 처리**:
- `paid` 또는 `captured` → `setQrisStatus('paid')` + `navigateToSuccess()` ✅
- `expired` → `setQrisStatus('expired')` + 카운트다운 0 ✅
- `failed` → `setCheckError('Payment failed — please try another method')` ✅
- `pending` → 계속 폴링 ✅

**서버가 `paid`를 반환하지 않음에도 클라이언트가 `paid` 처리를 유지한 것**은 하위 호환
(기존 코드/테스트 호환)을 위한 방어 코드이므로 무방.

**완료 전환 중복 방지**: `navigateToSuccess`는 `paidRef.current` 플래그로 가드됨:
```ts
const paidRef = React.useRef(false);
const navigateToSuccess = React.useCallback(...) => {
  if (paidRef.current) return;
  paidRef.current = true;
  router.replace(...)
}
```
폴링이 겹쳐도 두 번 전환하지 않는다. ✅

### 3. 오류 처리 · 폴링 누수

**연속 400/404 안내**: `isClientHttpError`가 400~499를 감지하고 `pollingErrCount.current`를
증가시켜 3회 이상 시 `setCheckError("Can't check payment status")` + `Sentry.captureException` 호출.
단, 연속 오류 시에도 폴링이 완전히 멈추지 않는다는 점에 유의 — `setQrisStatus` 변경이 없으므로
`pending` 상태가 유지되고 10초 인터벌이 계속 호출된다. 이는 의도적 설계(다음 폴링에서 성공할
경우 복구 가능)이지만, 400이 영구 오류(잘못된 ID)인 경우에는 Sentry 기록 후에도 계속 폴링하는
낭비가 발생할 수 있다. 머지 블로커는 아니나 개선 가능.

**일시 네트워크 오류 재시도**: `isClientHttpError`가 `false`를 반환하는 경우(500, 네트워크
타임아웃 등) `pollingErrCount`를 증가시키지 않고 10초 뒤 재시도 — 올바른 동작. ✅

**unmount 시 폴링 중단**:
```ts
React.useEffect(() => {
  if (qrisStatus !== 'pending') return;
  const id = setInterval(checkStatus, 10_000);
  return () => clearInterval(id);
}, [qrisStatus, checkStatus]);
```
cleanup 함수 `return () => clearInterval(id)` 존재 → unmount 시 폴링 정지. 메모리 누수 없음. ✅

단, `checkStatus` 자체는 async이므로 이미 진행 중인 fetch는 unmount 후에도 완료될 수 있다.
`navigateToSuccess` 내부의 `paidRef` 가드가 중복 전환을 막아주므로 실용적으로는 안전.

### 4. #129 충돌 여부 · 머지 순서

**PR #129 (M3-1105-BT: 카트 줄 삭제)** 변경 파일:
- `__tests__/cart-trash.test.ts` (신규)
- `app/(tabs)/cart.tsx`
- `components/ui/QuantityPicker.tsx`
- `components/ui/toast/CapsuleToastRemoved.tsx` (신규)
- `components/ui/toast/index.ts`
- `config/toast.tsx`

**PR #130 (M3-1105-BU: QRIS)** 변경 파일:
- `__tests__/qris-bu.test.ts` (신규)
- `__tests__/qris-state-machine.test.ts`
- `api/hooks/pos-qris.ts`
- `app/checkout/tender-qris/[draftOrderId].tsx`

**파일 겹침 없음.** 두 PR은 완전히 독립적이므로 머지 순서 제약 없다.
#129 → #130 또는 #130 → #129 어느 순서로도 충돌 없이 머지 가능.

### 5. CI 상태

| 체크 | 상태 | 시간 |
|------|------|------|
| lint | **pass** | 1m6s |
| flow-tests | **pass** | 44s |
| assertions (vitest) | **pass** | 1m52s |
| playwright | **pending** | — |

- `mergeable`: MERGEABLE
- `mergeStateStatus`: UNSTABLE (playwright 미완료 때문)
- lint 오류 0, vitest 오류 0 (PR body: "14 files · 139 tests passed")
- playwright 체크가 pending이지만 QRIS 폴링 로직은 E2E 대상이 아니므로 실질적 위험 없음

---

## 주의사항

1. **QR 재발행 후 `payment_request_id` 갱신 타이밍**: `onNewQr`이 `setCurrentPaymentRequestId`를
   직접 호출하지 않아 재발행 직후 수동 체크 시 구 ID로 요청될 수 있다. 치명적이지 않으나
   `regenerate.mutateAsync` 응답에 `payment_request_id`가 있다면 즉시 반영 권장.
   파일: `app/checkout/tender-qris/[draftOrderId].tsx` `onNewQr` 함수.

2. **연속 오류 후 폴링 미중단**: 400 연속 3회 후 사용자에게 안내는 하지만 폴링을 멈추지
   않는다. 400이 영구 오류인 경우 불필요한 요청이 계속된다. 가능하면 `pollingErrCount >= 3`
   시 `setQrisStatus('failed')`로 폴링을 완전히 중단하는 것을 고려.
   파일: `app/checkout/tender-qris/[draftOrderId].tsx` `checkStatus` catch 블록.

3. **`QrisStatus` 타입에 `captured` 추가** (`api/hooks/pos-qris.ts`): 서버가 반환하는
   실제 상태이므로 올바르다. 그러나 클라이언트 `setQrisStatus('paid')`로 매핑하므로
   내부 상태값 `captured`는 실제로 set되지 않음 — 타입 정의와 런타임 불일치.
   허용 범위이나 혼란 방지를 위해 추후 타입 정리 가능.

---

## Kyu 실기 항목

- [ ] iPad QRIS 화면 → 첫 로드 시 Network 탭(Proxyman)에서 `qris-status?payment_request_id=xxx` 가 붙는지 확인
- [ ] Simulate payment (test) → 10초 이내에 success 화면으로 전환되는지 확인
- [ ] success 화면이 두 번 나타나지 않는지 확인 (폴링과 수동 Check payment 동시 완료 시)
- [ ] QR 만료 → "New QR" → Simulate payment: 새 QR의 payment_request_id로 폴링하는지 확인
- [ ] Airplane mode → "Check payment" → 에러 없이 조용히 넘어가는지, 3회 연속 400 시 "Can't check payment status" 표시되는지 확인
- [ ] 화면 나가기(Cancel) 후 Proxyman에서 폴링 요청이 멈추는지 확인
