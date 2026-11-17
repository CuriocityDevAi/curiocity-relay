#176 APPROVE

## 체크 결과

### REQ 1 — `git diff origin/master --stat`
- 변경 파일: `api/hooks/customers.ts` 1개 (허용 파일)
- 1개만 변경된 이유: CustomerLinkSheet · pos-orders · phone-id · `__tests__/m3-1117-j.test.ts` 는 #169 squash에서 이미 master 포함 → diff 0
- 컴파일 확인: `git show origin/master:components/payment/CustomerLinkSheet.tsx` → 파일 존재 · 테스트 존재 · 허용 파일만 변경으로 훅/테스트 누락 없음

### REQ 2 — TS · 테스트
- TS 오류: master 14 = branch 14 (신규 0) — M3-1117-L 보고서 + 이전 R0-1117-P CHANGES 사항 모두 해소
- 테스트: 589 passed | 6 expected fail | 2 todo

### REQ 3 — 기능 항목
| 항목 | 결과 |
|------|------|
| `formatPhoneDisplay62` 표시 정규화 | ✅ |
| 300ms 디바운스 (line 52-55) | ✅ |
| `loyalty_consent_at` null 시 동의 체크박스 (line 78) | ✅ |
| `useLinkOrderCustomer` POST 계약 | ✅ |
| `useChangeOrderCustomer` PATCH + 404 → "아직 지원 안 됨" | ✅ |
| `useUnlinkOrderCustomer` DELETE + 404 → "아직 지원 안 됨" | ✅ |

### R0-1117-P CHANGES 해소 확인
1. `app/(tabs)/cart.tsx`, `app/customer-lookup.tsx` 제거 ✅ (diff에 없음)
2. TS 신규 오류 +5 → 0 ✅
3. customers.ts 변경: `email: string | null` → `email: string` · `|| undefined` 제거 (body 간소화) — 타입 적합

### customers.ts 변경 요약
- `PosCustomer.email`: `string | null` → `string` (필드 타입 엄격화)
- `useCreateCustomer` body: `email: data.email || undefined` → `email: data.email` (불필요한 short-circuit 제거)
- CreateCustomerInput 유지 (AdminCreateCustomer 변경 시 customer-lookup.tsx TS2345 발생 방지)
