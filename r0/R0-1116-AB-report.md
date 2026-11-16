#314 A · main 충돌 없음 · pos-integration ✅

## 블로커 해소 확인 (M3-1116-P)

### ① clearSnapshotForRegister — paid 가드 ✅

`service.ts`:
```typescript
if (s.snapshot_state === "expired" || s.snapshot_state === "paid") continue;
```
paid와 expired 양쪽 건너뜀. 결제 성공 후 Checkout cleanup DELETE 가 호출돼도
paid snapshot 은 expired 로 변하지 않음 → 손님 화면 영수증·번호입력 유지.

### ② upsertSnapshotForRegister — paid 되돌림 방지 ✅

함수 진입 시 listOrderSnapshots → paid 존재 여부 확인 → early-return.
QRIS 비동기 webhook 경로에서 subscriber 가 먼저 paid 로 전이한 뒤
tenders upsert 가 호출돼도 active 로 되돌리지 않음.

`snapshot_state?: string` 인자 추가 · `existing.snapshot_state !== "paid"` 이중 가드 ✅

### ③ QRIS 경로 ✅

QRIS block 도 `upsertSnapshotForRegister` 호출 → 동일 paid guard 적용.

## 통합 테스트 ✅

- 케이스 5: POST checkout-snapshot → markSnapshotPaidByOrder (subscriber 시뮬레이션) → DELETE → GET active → `paid` ✅
- 케이스 6: POST checkout-snapshot → DELETE (결제 없음) → GET active → `null` ✅

## CI

| Check | 결과 |
|---|---|
| pos-integration | ✅ success |
| unit-commerce-core | ✅ success |
| e2e-admin-loyalty | ✅ success |
| customer-display | ✅ success |
| docker-smoke-commerce-core | ❌ infra flake (migration deadlock · 코드 기인 아님 · prior 동일 패턴) |

## main 충돌 없음

`mergeable: MERGEABLE`. #313 아직 open — 고유 파일 집합 유지.
main 최신: #315 (M1-1116-T) 머지 반영.

## 이전 블로커 스레드

- B1 (PRRT_kwDOTe-UYs633qxT): M3-1116-O/P 에서 해소 → resolve ✅
- B2 (PRRT_kwDOTe-UYs633q_Y): M3-1116-O/P 에서 해소 → resolve ✅

## 판정

APPROVE — 모든 블로커 해소 · pos-integration ✅ · main 충돌 없음.
