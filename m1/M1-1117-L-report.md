PR #182 · 원인=beginEdit 활성 편집 세션 중 update() 호출 시 서버 400 + email:null 전송 · 깨진 커밋=c3eb355(초기 패턴)+882529c(email null 추가) · 프리필 OK

## 원인 실측

`useUpdateDraftOrderCustomer`가 `beginEdit → update(customer_id, email) → confirmEdit` 패턴 사용.

- Medusa v2에서 `update()` (customer/email 메타데이터)는 편집 세션과 무관한 직접 엔드포인트
- `beginEdit` 호출 후 활성 편집 세션 중 `update()` 호출 → 서버 400 Invalid Request (모든 손님)
- 추가: `email: null` 전송 — `AdminUpdateDraftOrder.email?: string` (not null) 타입 위반

**static 확인**: `AdminUpdateDraftOrder` 타입 (`@medusajs/types/dist/http/draft-order/admin/payloads.d.ts`):
```
email?: string;       // null 허용 안 됨
customer_id?: string; // null 허용 안 됨
```

**깨진 시점**: edit-session 패턴은 c3eb355(초기 도입)부터. email:null 문제는 882529c(M3-1117-E, phone-only 손님 허용)에서 추가. 두 버그가 겹쳐 "어떤 손님이든" 실패.

## 수정 내용

### api/hooks/draft-orders.tsx
- `beginEdit` / `confirmEdit` 제거, `update()` 직접 호출
- `email: null` 방지: `...(data?.email ? { email: data.email } : {})`
- 반환 타입 `AdminDraftOrderPreviewResponse` → `AdminDraftOrderResponse`

### app/customer-lookup.tsx
- `AddNewCustomerButton`에 `initialPhone?: string` prop 추가
- `Form defaultValues={{ phone: initialPhone }}` 프리필
- `searchQuery.replace(/[^\d]/g, '') || undefined` 추출하여 전달

## 테스트

```
__tests__/m1-1117-l-cart-customer.test.ts — 7 passed
tsc 신규 에러 0
scheduleOnRN 사용 없음
```

## 요청/응답 (정적 검증)

이메일 있는 손님:
```json
{ "customer_id": "cust_123", "email": "test@test.com" }
```

phone-only 손님:
```json
{ "customer_id": "cust_456" }
```
