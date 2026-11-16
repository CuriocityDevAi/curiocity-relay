#314 paid 가드 · 결제 후 cleanup 테스트 ✅ · push ca6e60d

## 수정 사항 (3곳)

### ① clearSnapshotForRegister — paid 건너뜀
`service.ts`: skip 조건에 `|| s.snapshot_state === "paid"` 추가.
결제 성공 후 Checkout 닫힘 시 DELETE /checkout-snapshot 이 호출돼도
paid snapshot 은 expired 로 변하지 않음 → 손님 화면 영수증·번호입력 유지.

### ② upsertSnapshotForRegister — snapshot_state? 인자 추가
`service.ts`: 입력 타입에 `snapshot_state?: string` 추가.
업데이트 시 existing.snapshot_state === "paid" 이면 snapshot_state 필드를 무시.

### ③ upsertSnapshotForRegister — paid guard (이중 처리 방지)
`service.ts`: 함수 진입 시 listOrderSnapshots 로 paid snapshot 존재 여부 확인.
paid 가 있으면 early-return → subscriber 가 이미 paid 로 전이한 뒤
upsert 가 active 로 되돌리는 경로 완전 차단.

## 통합 테스트 추가 (checkout-snapshot.spec.ts)

- **케이스 5**: 결제 후 DELETE cleanup → snapshot_state 여전히 `paid` ✅
  - POST checkout-snapshot → markSnapshotPaidByOrder (subscriber 시뮬레이션)
  → DELETE checkout-snapshot → GET active → `paid` (not null/expired)
- **케이스 6**: 결제 없이 DELETE → GET active = null ✅
  (기존 케이스 3 동일 경로 재검증)

## CI

단위 테스트 332개 통과 (push hook 검증).
통합 테스트는 CI 에서 검증 예정.

## 커밋

`ca6e60d` fix(loyalty): M3-1116-P — paid 가드 · clearSnapshotForRegister skip paid · upsertSnapshot paid guard
