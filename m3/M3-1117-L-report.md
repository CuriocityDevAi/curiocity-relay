#176 변경 파일 1개(허용만) · TS 신규 0 · 테스트 통과

## 작업 내용
- `git reset --hard origin/master` → M3-1117-J 고유 변경만 적용
- CustomerLinkSheet · pos-orders · phone-id · __tests__/m3-1117-j → #169 squash에서 이미 master 포함 (diff 0)
- 금지 파일 변경 제거: `app/(tabs)/cart.tsx` · `app/customer-lookup.tsx` 사라짐

## customers.ts 변경 내용
- `email: data.email || undefined` → `email: data.email` (body 간소화)
- mutationFn 파라미터: AdminCreateCustomer 변경 시 customer-lookup.tsx TS2345 발생 → CreateCustomerInput 유지

## 결과
- `git diff origin/master --stat`: `api/hooks/customers.ts` 1개 (허용 파일)
- TS 오류: master 14개 = branch 14개 (신규 0)
- 테스트: 589 passed | 6 expected fail | 2 todo
- force-with-lease push: e597bb0
