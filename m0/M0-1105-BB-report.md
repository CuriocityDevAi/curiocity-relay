# M0-1105-BB · 결과 보고

- 범위: storeport #224 · #225 를 origin/main (a8d76a6 · #226·#227 머지 후) 위로 rebase + CI 재검.
- 상태: **#224 = 초록 (착지 가능)** · **#225 = CI 적 (rebase 무관 · 별건 티켓 회부)**.

---

## PR #224 (feat/m0-1105-ax-pos-tax-lines)

### rebase
- 베이스: `ac81ae9 → a8d76a6` (fetch 시점 main HEAD).
- **충돌**: `apps/commerce-core/integration-tests/pos/tenders.spec.ts` — 4 블록 (#61·#82 가드).
- 채택: 모두 **main (HEAD) 쪽** — AY 수정과 main (#226) 수정이 **같은 뜻** (restock: true + inventory_item_id 정합 가드), AY 는 설명 주석만 추가. BB 지침 "두 수정이 같은 뜻이면 main 채택" 그대로.
- `apps/commerce-core/package.json` 의 pos-tax-lines CI 편입 (test:integration:pos 3패스 체인) 은 clean 적용.
- **최종 5 커밋**:
  1. `8219ae1` fix(pos) Medusa order.total 에 PB1·SC 반영 (M0-1105-AX · Path D 서버)
  2. `b98a15f` test(pos) pos-tax-lines.spec 7 시나리오 (R11 뿌리 가드)
  3. `1ca1bb2` test(pos) spec 재작성 (관계 필드 중심 · 7 시나리오)
  4. `98ef307` test(pos) #AX-7 drift 가드 보정
  5. `4a94aa6` test(pos) AY · tenders 교정 + pos-tax-lines CI 편입

### 로컬 pos-integration (spec 별 별도 프로세스)
- tenders.spec: **88 / 88 pass**
- pos-tax-lines.spec: **7 / 7 pass**
- p6-e2e.spec: **10 / 10 pass**

### CI pos-integration
- Run **43188388594** (sha 4a94aa6 · force-push 후 신규 run) → **SUCCESS** ✅
- https://github.com/CuriocityDevAi/storeport/actions/runs/43188388594
- 옛 run (43181416871) 으로 판정 아님 — 확인됨.

### 코멘트
- https://github.com/CuriocityDevAi/storeport/pull/224#issuecomment-6819514286

---

## PR #225 (feat/m2-1105-aw-open-order-reservations)

### rebase
- 베이스: `ac81ae9 → a8d76a6`.
- **충돌 없음** (clean 3-way).
- **최종 3 커밋**:
  1. `6b1e45c` feat(stock-cleanup) Open orders holding stock 구역 (M2-1105-AW)
  2. `193363d` fix(stock-cleanup) R0-1105-CM 3건 반영 (prod-shape-seed main 버전 · no_fulfillment 가드 · #2 테스트)
  3. `dd2e187` fix(open-order-reservations) backdateReservation dbConnection 사용 · try/catch Axios 400

### 로컬 pos-integration (spec 별 별도 프로세스 · 로컬 Postgres · DB_HOST/PORT/USER/PW)
- tenders.spec: **88 / 88 pass**
- p6-e2e.spec: **10 / 10 pass**
- stock-cleanup.spec: **1 / 1 pass**
- open-order-reservations.spec: **4 / 4 pass**

### CI pos-integration
- Run **43188390780** (sha dd2e187 · force-push 후 신규 run) → **FAILURE** ❌
- https://github.com/CuriocityDevAi/storeport/actions/runs/43188390780
- 옛 run (43180727105) 으로 판정 아님 — 확인됨.

### 실패 뿌리 — rebase 무관 · AW 자체 버그
```
apps/commerce-core/src/api/admin/pos/maintenance/release-stale-reservations/route.ts:455:16
error TS2561: Object literal may only specify known properties, but 'orderId' does not
exist in type 'CompleteOrdersWorkflowInput'. Did you mean to write 'orderIds'?

455       input: { orderId: order_id },
```
- **rebase 이전** sha ddc2b26 CI (43180727105) 에도 **같은 에러** 존재. `git diff ddc2b26 dd2e187 -- .../route.ts` = empty.
- 자매 파일 `.../pos/orders/[id]/fulfill/route.ts` 정식 패턴: `input: { orderIds: [order_id] } as any`.
- 로컬 jest 는 `@swc/jest` 변환 → tsc strict 우회 → 테스트 통과. CI 는 `medusa build` 로 tsc → TS2561 에서 exit 1 → build 단계 실패로 테스트 미실행.

### 조치
- BB 티켓 지침 "구현 로직 변경 금지 — 필요하면 멈추고 리포트" 에 따라 **수정 없이 리포트**.
- 1줄 fix (`{ orderIds: [order_id] } as any`) 면 자매 패턴 일치. 별건 티켓 회부 요청.

### 코멘트
- https://github.com/CuriocityDevAi/storeport/pull/225#issuecomment-6819557711

---

## 산출물 요약

| PR | rebase | 충돌 | 로컬 spec | CI run | CI 결과 |
|----|--------|------|-----------|--------|---------|
| #224 | a8d76a6 위 5 커밋 | tenders.spec 4 블록 (main 채택) | tenders 88 · pos-tax-lines 7 · p6-e2e 10 | 43188388594 | SUCCESS ✅ |
| #225 | a8d76a6 위 3 커밋 | 없음 | tenders 88 · p6-e2e 10 · stock-cleanup 1 · open-order-reservations 4 | 43188390780 | FAILURE (별건 · TS2561) ❌ |

## 운영 유의
- 로컬 Postgres role `postgres` 생성 (`createuser -s postgres` + password `postgres`) 로 통합 테스트 환경 CI 와 동치화.
- AW 워크트리 (`/private/tmp/AW-work`) 신규 생성 후 `pnpm install --frozen-lockfile` 실행.
- 두 force-push 모두 `--force-with-lease` 사용. push 완료 시각:
  - #224: 4a94aa6 (local 16:05 KST 경)
  - #225: dd2e187 (local 16:05 KST 경)
