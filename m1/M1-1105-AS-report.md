# M1-1105-AS · POS 주문 Void · fulfillment 가 있어도 통과

## 대사표
- P6 실기 B · Kyu 11-11 17:15 "Void 도 실패야 · order has active fulfillments ... 라는 검은 알약 toast 메세지가 나옴." → **해소**.
- decision-p6-20261110.md (PIN) · decision-p6-split-20261111.md (S2) 기준은 그대로 유지 — CASH 포함 시 매니저 PIN 필수 · 현금 환불 Cash Movement adjustment 동작 변경 없음.

## PR
- storeport#215 · branch `fix/m1-1105-as-void-fulfillment` · base `origin/main` (c1148df 포함).
- 커밋 1건: `fix(pos): POS void · fulfillment 가 있는 주문도 cancel 후 void (M1-1105-AS)`.
- 수정 파일 2:
  - `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` — fulfillment pre-cancel 로직 추가 + shipped 가드 재정의.
  - `apps/commerce-core/integration-tests/pos/tenders.spec.ts` — 기존 "M0-1105-AB" describe 안에 #61/#62 추가 (새 spec 파일 없음).

## 반쪽 상태 방지 방식
1. `cancelOrderFulfillmentWorkflow` 를 pending fulfillment 마다 순차 실행 (각 호출이 재고 복구 + 예약 해제까지 수행).
2. 어느 하나라도 실패하면 즉시 400 반환 · 뒤의 `cancelOrderWorkflow` 는 시도하지 않음. 이미 성공한 선행 fulfillment 는 "취소됨 · 재고 복구됨" 유효 상태로 남는다 — 사용자는 /void 를 재호출하면 canceled 된 것은 건너뛰고 미취소분만 다시 처리.
3. fulfillment 전부 취소 후 `cancelOrderWorkflow` 가 실패해도 fulfillment-만-취소 상태는 유효 (물류 되돌리기 + 주문 활성). admin 이 /void 재시도로 수렴.
4. 보상 트랜잭션은 도입하지 않는다 (코어 워크플로 자체가 idempotent · 재시도만으로 수렴).

## P6 테스트 (#207 등) 가 이 경우를 놓친 이유
기존 void 통합 테스트 (#44, #45) 는 `createTestOrder({ isDraft: true })` + 1회 tender 로 "draft → order 자동 전환" 만 쓰고, `/admin/pos/orders/:id/fulfill` 은 호출하지 않았다. 그래서 void 시점에 주문에 fulfillment 가 1건도 없었고, 기존 void 가드 `activeFulfills.length > 0` 분기에 걸릴 일이 없었다. 실 운영 (iPad) 은 결제 완료 뒤 `/fulfill` 을 쳐 fulfillment 를 만들기 때문에 테스트와 운영의 흐름이 어긋났다. #61/#62 가 그 순서(`/tenders` → `/fulfill` → `/void`) 를 명시적으로 돌린다.

## 검증
- `pnpm --filter commerce-core typecheck` · PASS.
- `pnpm --filter commerce-core test` · 39 unit tests PASS.
- `pos-integration` CI job (GitHub Actions run 43005640394) 는 PR 올린 직후 pending — 로컬에 real Postgres 없어 cross-check 불가, 서버 검증은 CI 결과에 의존.
- `pnpm lint` (commerce-core) 는 pre-existing env 결함 (`Cannot find module '@medusajs/eslint-plugin'`) 로 실행 불가 · 이 PR 과 무관.

## 이연 순증감
- 이연 생성 없음.
- 이연 해소 없음.
- 열려 있는 후속 과제 없음 (P6 실기 B 종결).
