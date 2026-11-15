PR #292 · earn_on_balance_tender_only=TRUE 시 현금/QRIS 금액에만 적립(적립금 사용분 제외) · "Don't earn points on the store-credit part"

## 플래그 실제 동작

| Flag | 현금 33,000 결제 | 적립금 10,000 + 현금 23,000 결제 |
|------|----------------|-------------------------------|
| FALSE (OFF) | 적립 기준: 33,000 (전액) | 적립 기준: 33,000 (전액) |
| TRUE (ON)   | 적립 기준: 33,000 (현금 전액) | 적립 기준: 23,000 (현금만) |

## 변경 문구 전/후

### 토글 제목
- 전: `Earn only when paying with store credit`
- 후: `Don't earn points on the store-credit part`

### 토글 부제
- 전: `When on, points are earned only on the store-credit portion of payment.`
- 후: `When on, only the cash/card portion earns points — store credit used is excluded.`

### 확인 모달 라벨
- 전: `Earn on store credit tender only`
- 후: `Don't earn points on store-credit used`

## TypeCheck
PASS (tsc --noEmit 에러 없음)

## Unit Tests
326 passed (23 suites)
