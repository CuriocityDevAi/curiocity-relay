판정: ✅ 완료 — 번호만 있는 손님 추가 가능, 이메일 선택 적용, PR #173

## 서버 확인 결과

storeport PR #322 (`gh pr diff 322 --repo CuriocityDevAi/storeport`) 확인:
- 계약: `Body: { phone: string, email?: string, first_name?: string, last_name?: string }`
- email은 이미 optional → **서버 보강 불필요(M0 없음)**

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `app/customer-lookup.tsx` | email optional(형식 검사 유지) · phone required · 목록 오른쪽 열 `email \|\| phone_display` |
| `api/hooks/customers.ts` | PosCustomer.email: `string \| null` · email 빈 문자열 → 서버 전송 안 함 · CreateCustomerInput 타입 추가 |
| `app/checkout/[draftOrderId].tsx` | isPosDefaultCustomer: `!customer` 기준 · E-Mail 행 조건 렌더링 |
| `app/orders/[orderId].tsx` | isPosDefaultCustomer: `!order.customer` 기준 |
| `app/(tabs)/orders.tsx` | customerName fallback: `email \|\| phone \|\| 'Unknown Customer'` |
| `__tests__/m3-1117-a-phone.test.ts` | email optional + phone required 계약 테스트 추가 |
| `e2e/flows/10-customer-phone-only.spec.ts` | 신규 E2E: 번호만 추가·기존손님·목록표시 3케이스 |

## 검증 로그

```
vitest run: 41 files · 504 passed | 6 expected fail | 2 todo
playwright: 3 passed (10-customer-phone-only.spec.ts)
TypeScript (변경 파일): 오류 없음
```

## Kyu 확인 항목

- 손님 추가에서 이메일 비우고 번호만 → 추가됨 (E2E: 번호만 입력 → 추가됨 · 선택됨 ✅)
- 같은 번호 다시 추가 → 'Existing customer found' 토스트 (E2E ✅)
- 이름 없는 손님은 번호로 표시 (E2E: phone_display DOM 확인 ✅)

## 이연 순증감

+1 E2E spec file · +20 unit test cases
