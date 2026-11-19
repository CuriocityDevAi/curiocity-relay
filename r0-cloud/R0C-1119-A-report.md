#385 CHANGES · #386 APPROVE || install X(불가) 0분 · unit X(불가) 0분 · build X(불가) 0분 · 통합(Postgres) 불가 0분 (PG16 기동 자체는 O · 5초) · 총 2분

# R0C-1119-A — R0 클라우드 시험 · storeport #385 · #386 독립 리뷰

- 실행: 2026-11-19 (UTC 02:12–02:15) · 클라우드 스케줄 세션 · Mac R0 리뷰는 보지 않음 · PR 코멘트 0건
- 리뷰 대상 head: #385 `db622f5d` (base main `7db62960`) · #386 `fecd19a7`

## 0. 환경 제약 (가장 중요한 결과)

- `add_repo` 도구가 이 세션에 **없음**. git proxy 가 이 세션의 "authorized repository set" 에 storeport · curiocity-relay 둘 다 없다고 거절:
  - `git clone storeport` → `could not read Username` (자격 미주입)
  - `git clone curiocity-relay` → 성공(읽기) · `git push` → `403 … not in this session's authorized repository set … a run cannot add repositories`
- 그래서 **storeport 소스를 로컬에 받지 못함** → install · unit · build · 통합 테스트 모두 "불가".
- 리뷰는 GitHub MCP 커넥터(`pull_request_read` · `get_file_contents` · `search_code`)로 수행. 이 리포트 커밋도 MCP `create_or_update_file` 로 함 (git push 아님).
- 해결: claude.ai 새 채팅에서 storeport(read) + curiocity-relay(push) **둘 다** 세션 리포에 추가한 뒤, 그 채팅에서 이 스케줄 작업을 다시 만들어야 함 (기존 스케줄 run 은 리포 추가 불가).

## 1. #385 — CHANGES

### 이동·재수출 (OK)
- `src/lib/fulfillment-cancel.ts`(+227) · `src/lib/fulfillment-polyfill-items.ts`(+143) 는 옛 `_shared/*` 본문과 코드 동일. 차이는 머리 주석 2줄(`// R-B3 (M2-1118-V): api/admin/pos/_shared/ 에서 src/lib/ 로 승격.`) + 주석 안 파일명 1곳(`fulfillment-items.ts:91-98` → `fulfillment-polyfill-items.ts:91-98`).
- `_shared/fulfillment-cancel.ts` · `_shared/fulfillment-items.ts` → 얇은 재수출만 (`export { cancelPosOrderFulfillment } from "../../../../lib/fulfillment-cancel";` 등). 타입·상수·함수 3개 모두 재수출됨.
- `execute-fulfillment.ts` 는 import 경로 1줄 + prettier 줄바꿈 정리만 (`listStockLocations({})` · `releaseReservationsForLineItems(container, line_item_ids)` 한 줄화) → 로직 변경 0.
- `pos-void/steps.ts:7` import 경로만 변경.
- 옛 경로 잔존 import: `api/admin/pos/maintenance/repair-stuck-fulfillments/route.ts`(→ `_shared/fulfillment-items`) · `integration-tests/pos/tenders.spec.ts`(→ `_shared/fulfillment-cancel`). 둘 다 재수출로 동작은 유지 — 블로커 아님.
- nit: 새 파일 주석의 `fulfillment-polyfill-items.ts:91-98` 은 머리 주석 3줄 추가로 실제 줄 번호가 밀림.

### ESLint warn → error (블로커)
PR 본문 "ESLint (SHARED_FILES): 위반 0 → error 승격 안전" 이 사실과 다름. `SHARED_FILES` 에 `"src/lib/**/*.{ts,tsx}"` · `"src/modules/payment_*/**/*.{ts,tsx}"` 가 있고 패턴에 `"|api/admin/pos"` 가 있는데, base(=PR head 에서도 미수정) 에 이 패턴을 import 하는 공용 파일이 3개 있음:

1. `src/lib/link-customer-order.ts` (PR head `db622f5d` 에서 확인)
   ```ts
   import {
     verifyManagerPin,
     resolveStoreId,
     recordPinAudit,
     wibDateKey,
   } from "../api/admin/pos/_shared/manager-pin";
   ```
2. `src/modules/payment_xendit/__tests__/qris-xendit-bd.unit.spec.ts`
   `import { tryXenditRefund } from "../../../api/admin/pos/_shared/xendit-refund";`
3. `src/modules/payment_xendit/__tests__/qris-simulate-bk.unit.spec.ts`
   `import { handleQrisSimulate } from "../../../api/admin/pos/orders/[id]/qris-simulate/route";`

재현: PR 의 `eslint.config.ts` 를 그대로 + 위 import 줄만 담은 파일로 eslint 9.39.5 실행 → `✖ 3 problems (3 errors)` · exit 1. (eslint-disable 주석 없음 · config 에 ignores 없음.)
→ `eslint` 를 돌리는 순간 commerce-core lint 가 깨짐. 요구: (a) `manager-pin` 을 `src/lib` 로 승격하거나 경계 예외 처리, (b) payment_xendit 테스트 2개를 POS 쪽으로 옮기거나 `__tests__` 를 SHARED_FILES 에서 제외, (c) 그 후 error 승격. 또는 이번 PR 은 warn 유지.

## 2. #386 — APPROVE

- 변경 파일 1개: `apps/commerce-core/integration-tests/pos/pin-audit.spec.ts` (+10/−4). 안 쓰던 `import { Modules }` 제거 포함.
- `/tenders` 가 실제 POS 결제 경로인지: `register-sessions/[id]/pos-complete/route.ts` 주석 "pos-complete 는 이제 payment 성공 응답까지만 책임 (shim 유지) … J-b 신 라우트 (POST /admin/pos/orders/:id/tenders · /fulfill) 로 신규 흐름 이동". `docs/runbooks/payment-core.md` 계약 `{ provider_id ("pp_cash_default"|…), amount?, input{received_amount?…}, register_session_id? }` 와 spec body 일치.
- `pp_cash_default` → `providerToMethod`: `provider_id.startsWith("pp_cash_") → "cash"` → refund route 의 `method: "cash"` 매칭 성립.
- `isDraft: true`: helpers `...(opts.isDraft ? { is_draft_order: true, status: "draft" } : {})` — "P2 흐름 재현: draft 로 생성 (서버가 tender 뒤 자동 convert)". tenders.spec · pos-tax-lines.spec 등 기존 spec 과 같은 패턴.
- nit: tender POST 가 `validateStatus: () => true` 로 결과 미검사 → 실패 시 뒤 refund 단계에서 간접적으로만 드러남. `expect(res.status).toBe(200)` 한 줄 권장 (블로커 아님).

## 3. 실행 로그 요약

| 항목 | 결과 | 시간 | 비고 |
|---|---|---|---|
| clone storeport | X | 2초 | git proxy 자격 미주입 (세션 리포 미등록) |
| `pnpm install --frozen-lockfile` | 불가 | – | 소스 없음 (pnpm·node22 는 설치돼 있음) |
| commerce-core unit | 불가 | – | 소스 없음 |
| `pnpm --filter commerce-core build` | 불가 | – | 소스 없음 |
| Postgres | **O** | 5초 | 이미지에 PostgreSQL 16.15 사전 설치 · `service postgresql start` 로 즉시 online (apt 불필요) |
| 통합 `pin-audit` | 불가 | – | 소스 없음 (DB 쪽은 준비 가능) |
| ESLint 재현(대체) | O | 11초 설치 + 1초 | eslint 9.39.5 · #385 블로커 확인 |

## 4. 클라우드 R0 상시 운영에 필요한 것
1. 스케줄 작업을 storeport·curiocity-relay 두 리포를 세션에 붙인 채팅에서 생성 (스케줄 run 은 리포 추가 불가 · push 는 proxy 자격 필요).
2. Postgres 는 이미 있음 → `service postgresql start` + `createuser/createdb` 2줄 셋업 스크립트만 있으면 통합 테스트 가능.
3. pnpm store 캐시가 세션마다 비므로 install 시간 실측은 리포 연결 후 재시험 필요.
