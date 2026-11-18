#356 +draft-orders.spec 6케이스(+1 todo) · tsc O · 실행 미검증(로컬 Postgres 없음 · CI 빌링 블록)

## 작업 내역

### 신규: `integration-tests/pos/draft-orders.spec.ts` (6케이스 + 1 todo)
- #1 is_draft_order=false 주문 제외
- #2 응답 shape `Object.keys().sort()` 고정 (11 필드)
- #3 tenders/paid_so_far/remaining 계산 (captured 1 · pending 1)
- #4 stock_location_id 필터 — 다른 위치 주문 제외
- #5 register_session_id 필터 — 다른 세션 주문 제외
- #6 created_at DESC 정렬 (#356 신규)
- #7.todo 7일 초과 draft 제외 (created_at DB 직접 패치 필요)

### 변경: `integration-tests/pos/orders-list.spec.ts`
- `#OL-P` limit=1 offset=0/1 케이스 추가 · `count >= 2` · `limit/offset` 필드 단언

### PR #356 본문
- 확인 항목에 `- [ ] draft-orders IT 추가(실행 대기: CI 빌링/로컬 DB)` 추가

## 검증 결과
- tsc: `draft-orders.spec.ts` · `orders-list.spec.ts` 에러 0 (--skipLibCheck 플래그)
- jest --listTests: 두 파일 모두 `integration:pos` testMatch 에서 발견
- unit 45 suites 528 tests PASS (pre-push hook · 소스 무변경 확인)
- 미실행: 로컬 Postgres 없음 · CI pos-integration 빌링 블록 (M2-1118-D 사유)

## 커밋
- 23ba22b test(pos): M2-1118-D — draft-orders IT 추가 · orders-list count 단언
- 브랜치: refactor/M2-1118-B-list-pos-orders (pushed)
