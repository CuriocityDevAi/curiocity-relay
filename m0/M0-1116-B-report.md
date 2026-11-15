# M0-1116-B — Report

**PR #289 · 카드 위치 order.details.after · 타임라인 6 단계 · 회수 비례+0 바닥+멱등 · CI typecheck/test/naming/feature-map 전 PASS**

## 변경 파일
- `src/lib/loyalty/recover.ts` 신규 (멱등 회수 · 165 lines)
- `src/api/admin/pos/orders/[id]/refund/route.ts` + `.../return/route.ts` : recoverForOrder 호출 wire-up
- `src/lib/link-customer-order.ts` : `order.metadata.customer_identified = {at, source, phone_masked}` 기록
- `src/api/admin/pos/orders/[id]/loyalty-info/route.ts` : phone_e164 + earn + recover + customer_identified 응답 추가
- `src/admin/widgets/order-loyalty.tsx` (신규) · `src/admin/widgets/order-pos-timeline.tsx` (신규)
- `integration-tests/loyalty/refund-recover.spec.ts` (신규 · 4 case)
- `docs/feature-map.yaml` : `commerce-core.order-detail-widgets` L1 신설

## CI 결과 (로컬 실측)
- typecheck: **0 err**
- test (commerce-core unit): **22 suites · 310 tests · all pass · 7.2s**
- naming-check: **PASS** (meros=0 · 모듈명 · [...x] 없음 · migration 중복 없음)
- feature-map coverage: **989/989 matched · 0 unmatched**

## Kyu 실기 (local admin 미검증 · 배포 후 필요)
- [ ] Admin 주문 상세 진입 → Loyalty 카드 + POS Timeline 두 위젯 노출 (zone=order.details.after · 본문 하단).
- [ ] Customer 링크 클릭 → Customer 상세로 이동 · 전체 phone_e164 표시.
- [ ] 실 거래 (33,000 IDR cash 결제 → 번호 연결 → +330 적립) → 전액 환불 → Customer 잔액 0 복원 + `metadata.loyalty_recover.entries[0].recovered=330`.
- [ ] 부분 환불 11,000 IDR → `recovered=110` (floor(1000×11000/33000)=333? 실 값에 유의 — 테스트 #2 에서 100000×1%=1000, 33000 환불 → 330 확인됨).
- [ ] 같은 refund_ref 재주사 (스모크) → `idempotent: true` · 잔액 변화 없음.

## 이연 (별건)
- Medusa 코어 `order.details.sections` 직접 확장 (Payments/Fulfillment "사이" 정밀 삽입) = 코어 fork 금지 규약으로 금번 범위 밖.
- integration-tests/loyalty 러너에서 earn/recover 동시 호출 race = earn.spec.ts C1 패턴으로 후속 추가.
- POS 앱(모바일) 쪽 recover 알림 UI = M3 소관.
- 과거 주문 중 customer_identified 가 비어 있는 것들 · 백필 X (지시 "과거 주문은 있는 것만 표시").

## 비고
- 선행 PR #287 (M0-1116-A · 운영 적립 0 수정) 위에 분기. 머지는 #287 선행 필요.
- 손님 화면 (M1-1116-B 소관 Orders 목록·메뉴) 건드리지 않음.
- 운영 Kyu 실기용 `~/projects/agilo-fork-test` 미접근.
