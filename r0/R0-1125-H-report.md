APPROVE

## PR #256 · M2-1125-G — stale test expectations 3건 갱신

### 의도 보존 여부 (핵심 검토)

| # | 원래 의도 | 구 기대값 | 신 기대값 | 판정 |
|---|-----------|-----------|-----------|------|
| ① | Next customer 버튼이 success 화면에 연결돼 있음 | `testID="next-customer"` + `Next customer` 텍스트 in headerRight | `CustomerPhoneStatus` + `headerRight` + `onNextCustomer=` prop 확인 | ✅ 보존 |
| ② | SuccessReceiptAnim 에 Next customer 버튼 위치 | `expect(src).not.toMatch(/onNextCustomer\?/)` (headerRight 이동) | `onNextCustomer\?` + `testID="next-customer"` + `testID="next-customer-footer"` 존재 확인 | ✅ 보존 (위치 반영) |
| ③ | 결제 완료 흐름에서 order_id 가 display emit 에 포함 | `revertDisplayToPaid[^}]*order_id` | `useAskPhoneOnDisplay(orderId)` 호출 확인 + hook 소스의 `order_id` 존재 확인 | ✅ 보존 (2파일 교차 검증으로 오히려 강화) |

### 소스 대조

- `app/checkout/success/[orderId].tsx` L85: `useAskPhoneOnDisplay(orderId)` ✓, L274–276: `headerRight` → `CustomerPhoneStatus` ✓, L301: `onNextCustomer={onNextCustomer}` ✓
- `components/payment/SuccessReceiptAnim.tsx` L41: `onNextCustomer?: () => void` ✓, L350: `testID="next-customer-footer"` ✓, L352: `testID="next-customer"` ✓
- `components/customer-display/useAskPhoneOnDisplay.ts` L18: `order_id: orderId` ✓

### 테스트 약화 여부

약화 없음. ② 는 "not.toMatch" (부재 확인) → "toMatch" (새 위치 존재 확인)으로 뒤집힘 — M0-1123-E 가 버튼을 하단 바로 복귀시켰고 현재 코드에 맞는 올바른 전환. ③ 은 단일 파일 regex → 호출부+hook 2파일 교차 검증으로 커버리지 증가.

### CI Summary

| 체크 | 결과 |
|------|------|
| assertions (vitest) | ✅ pass (1m21s) |
| flow-tests | ✅ pass (44s) |
| lint | ✅ pass (59s) |
| playwright | ⏳ pending |
| route × 2 | ✅ pass |

vitest 76 files · 990 passed · 0 failed (PR description 기재).

### 앱 코드 변경 없음

M2-1125-G 커밋은 `__tests__/m2-1119-s-pos-slip-fixes.test.ts` · `__tests__/m3-1119-o-cd-emit.test.ts` 2파일만 수정 (git show bc14de9 --stat 확인).
