PASS

## M2-1125-G — stale test expectations 3건 갱신 (M1-1124-B 이관 반영)

**작업 경로**: `~/projects/curiocity-relay-wts/M2-1125-G`  
**브랜치**: `test/M2-1125-G-stale-expectations`  
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/256

---

## 수정 내용

### 실패 원인
M1-1124-B 이관으로 `app/checkout/success/[orderId].tsx` 가 변경됨:
- `headerRight` → `CustomerPhoneStatus` 로 교체 (Next customer 버튼 제거)
- `revertDisplayToPaid` 함수 삭제 → `useAskPhoneOnDisplay(orderId)` 훅으로 대체
- Next customer 버튼 위치: headerRight(M2-1120-B) → SuccessReceiptAnim 하단 고정 바(M0-1123-E)

### 수정한 테스트 (3건)

#### `__tests__/m2-1119-s-pos-slip-fixes.test.ts` REQ 2 블록

**Test 1**: `success screen headerRight 에 next-customer testID + Next customer 텍스트 존재`
- 기존 실패 이유: `testID="next-customer"`, `Next customer` 가 success/[orderId].tsx 에 없음
- 새 기대값: `CustomerPhoneStatus` + `headerRight` + `onNextCustomer=` (prop 전달 확인)
- 의도 보존: Next customer 버튼이 success 화면 흐름에 연결됨을 계속 검사

**Test 2**: `SuccessReceiptAnim 에서 Next customer 버튼 제거됨 (헤더로 이동)`
- 기존 실패 이유: `onNextCustomer?` 가 SuccessReceiptAnim 에 여전히 존재
- 새 기대값: `onNextCustomer?` · `testID="next-customer"` · `testID="next-customer-footer"` 존재 확인
- 의도 보존: Next customer 버튼 위치(하단 고정 바)를 명확히 검사

#### `__tests__/m3-1119-o-cd-emit.test.ts` ③ 블록

**Test 3**: `success/[orderId].tsx revertDisplayToPaid 도 order_id 포함`
- 기존 실패 이유: `revertDisplayToPaid` 함수가 삭제됨
- 새 기대값: `useAskPhoneOnDisplay(orderId)` 사용 + `useAskPhoneOnDisplay.ts` 에 `order_id` 존재 확인
- 의도 보존: ask phone 흐름에도 order_id 가 보존됨을 계속 검사

---

## vitest 전체 결과

```
Test Files  76 passed (76)
Tests  990 passed | 6 expected fail | 3 todo (999)
Duration  2.35s
```

**0 failed** (수정 전 3 failed → 수정 후 0 failed)

---

## 변경 파일
- `__tests__/m2-1119-s-pos-slip-fixes.test.ts` (+14 / -8)
- `__tests__/m3-1119-o-cd-emit.test.ts` (+7 / -3)
- 앱 코드 수정 없음
