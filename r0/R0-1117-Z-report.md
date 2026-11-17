#184 CHANGES · 문제 1건

## R0-1117-Z — PR #184 리뷰: 매니저 PIN 숫자패드 · QRIS void 문구

### REQ 1 — PIN 입력 경로 grep

PR branch(fix/M1-1117-M-pin-numpad) 기준 매니저 PIN 경로 2개:

| 파일 | 경로 | PIN 입력 방식 | 상태 |
|------|------|-------------|------|
| `components/orders/VoidRefundSheet.tsx` (step=pin) | Void/Refund → PIN 단계 | **NumericKeypad** | ✅ 이번 PR 에서 교체 |
| `components/orders/RefundRetrySheet.tsx:191` | 환불 재시도 (cash/qris) | **DigitsInput** | ❌ 미교체 |

`ManagerPinSheet.tsx` 는 PR branch tree 에 없음 (`git ls-tree` 확인) — 로컬 작업 브랜치 전용 파일, PR 범위 밖.

**빠진 경로**: `RefundRetrySheet.tsx:191` — cash/qris 환불 재시도 PIN 이 여전히 `DigitsInput` (TextInput `.focus()` 체인).  
이 시트도 BottomSheet 로 열리므로, 선행 BottomSheet 잔여 오버레이가 존재하는 경우 동일한 포커스 실패 발생 가능.  
→ **CHANGES: `components/orders/RefundRetrySheet.tsx:188–204` — DigitsInput(PIN) → NumericKeypad 마이그레이션 권장**

---

### REQ 2 — pointerEvents · 오류 처리 · 잠금 · 보안

**수정 방식 정확성**: `DigitsInput`(TextInput + `.focus()` 체인)을 완전 제거하고 TextInput-free `NumericKeypad` 로 교체 → 포커스 실패의 근본 원인 제거. `pointerEvents` 직접 조작보다 더 안전한 접근. ✅

**틀린 PIN → 오류 + 비움**:  
- `onSubmitPin` catch 에서 `setPin('')` + `setPinError(메시지)` + `triggerPinShake()` 호출 ✅  
- `pinShakeStyle` shake 애니메이션 유지 ✅

**pinLocked 동작**:  
- `pinLockActive = !!pinLocked` → NumericKeypad `onPress`/`onDelete`/`onClear` 가드에서 early return ✅  
- 서버 423/401 응답 → `setPinLocked(res.locked_until)` 설정 → `'Locked until HH:MM'` 표시 ✅  
- 주의: `onPressConfirm` 에서 PIN step 재진입 시 `setPinLocked(null)` 리셋. 클라이언트 lock 초기화이지만 서버 재검증 시 다시 lock 반환 → 허용 가능한 trade-off.

**PIN 값 로그 출력**: `VoidRefundSheet.tsx` 에 `console.log` 없음 ✅

---

### REQ 3 — 문구 · tsc · 테스트

**QRIS void 차단 문구**:
- 순수 QRIS: `'It was paid with QRIS, so the money has already been transferred. Refund it instead to return the payment.'` ✅
- 혼합(cash_qris/card_qris): `'Part of it was paid with QRIS, so some of the money has already been transferred. Refund it instead to return the payment.'` ✅
- 시트 제목: `"This order can't be voided"` ✅
- 버튼: `'Refund this order'` (이전 `'Go to Refund'` 아님) ✅

**tsc 신규 오류**: 0 ✅  
(PR branch 체크아웃 후 `npx tsc --noEmit` — PR 변경 파일에서 신규 오류 없음.  
기존 오류: split-pending-orders, FlashList estimatedItemSize, e2e playwright types 등 모두 사전 존재.)

**테스트**:
- `__tests__/m1-1117-l-cart-customer.test.ts` → 7/7 pass ✅
- `__tests__/m3-1117-g.test.ts` → 9/9 pass ✅
- `__tests__/m1-1117-m-pin-numpad.test.ts` → 12 passed + 1 todo (PR branch 기준, pure-fn) ✅

**부가 사항**: `SplashScreenController.tsx` 에서 `SplashScreen.preventAutoHideAsync()` 제거 — Expo Router 58(v4+)에서 프레임워크가 자동 처리하므로 올바름. PR 설명에 미언급.

---

### REQ 4 — 판정

**CHANGES** (`RefundRetrySheet.tsx:191`)

```
components/orders/RefundRetrySheet.tsx:191
  DigitsInput(displayBoxes, PIN) → NumericKeypad 미교체.
  동일 BottomSheet 포커스 위험 경로.
  VoidRefundSheet.tsx PIN step 과 동일하게 교체 권장.
```

나머지 변경사항 (VoidRefundSheet NumericKeypad 교체, QRIS void 문구, slip ordinal, PIN 초기화 버그, draft-order customer 직접 update, SplashReceiptAnim runOnJS) 모두 올바르고 안전함.
