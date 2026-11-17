#173 APPROVE

## R0-1117-M 재리뷰 — APPROVE

### 이전 블로커(Cart CustomerBadge blank) 해소 확인

R0-1117-I 에서 지적한 `cart.tsx:283` blank 는 **storeport PR#322 M3-1116-K** 로 해소됨.

```
// M3-1116-K · first_name 미입력 시 마스킹 번호 세팅해 Admin 목록에 N/A 안 보이게.
const defaultFirstName = first_name ?? maskE164(e164);
```

phone-only 손님 생성 시 서버가 `first_name = '0813-****-2048'` 저장
→ cart.tsx `customerName = '0813-****-2048'` (non-empty)
→ `customerName.length > 0` 분기 진입 → 마스킹 번호 큰 텍스트 표시 ✅
→ 이메일 부제목 blank(경미) 는 phone-only 손님에 email 없는 것이 정상이므로 허용

### 검증 항목

| 항목 | 결과 |
|------|------|
| Cart CustomerBadge blank (블로커) | ✅ storeport M3-1116-K 로 해소 · cart.tsx 수정 불필요 |
| isPosDefaultCustomer 오분류 | ✅ `checkout/[draftOrderId].tsx`, `orders/[orderId].tsx` 모두 `!order.customer` 판별로 수정 |
| customer-lookup.tsx email fallback | ✅ `item.email \|\| item.phone_display` |
| lib/format-order-customer.ts | ✅ orders 카드용 포맷 유틸 + 11개 단위 테스트 |
| pos-order-adapter.ts | ✅ `customer_phone_masked → customer.phone` 매핑 |
| MERGEABLE | ✅ master(#172·#174·#162 머지됨)와 충돌 없음 |
| 테스트 | ✅ 41 files · 504 passed (PR body 자가 검증) |
| TypeScript | ✅ 신규 오류 없음 |
