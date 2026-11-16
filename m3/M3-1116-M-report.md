# M3-1116-M 리포트

## 결과
earn 필드 undefined→null 직렬화 누락이 원인 · 로컬 post-pay-link-balance ✅ 2 passed · push b1d5b7e

## 원인
`pre-pay 회귀 없음` 테스트(line 157)가 `expect(res.data.earn).toBeNull()` 실패.  
route.ts 가 `result.earn` truthy 일 때만 `response.earn` 세팅 → falsy(undefined) 시 필드 자체가 응답에 없음.

## 수정
`apps/commerce-core/src/api/admin/pos/orders/[id]/customer/route.ts`  
`if (result.earn) { response.earn = ... }` → `response.earn = result.earn ? { ... } : null`

## 로컬 결과
```
PASS integration-tests/loyalty/post-pay-link-balance.spec.ts (10.164 s)
  ✓ post-pay: store_credit_balance = earn 후 잔액 · orders-list 전화번호 · summary 잔액 · first_name (857 ms)
  ✓ pre-pay 회귀 없음: 결제 전 연결 → earn=null · customer 생성됨 (891 ms)
Tests: 2 passed, 2 total
```

## push
commit: b1d5b7e feat/m3-1116-k
