# M0-1105-BM report — storeport QRIS simulate(#236) pos-integration real-DB 테스트

**작업자**: Opus 4.7 · 허브 폴더 (`~/curiocity-live/storeport-wts/M0-1105-BM-wt`)
**브랜치**: `test/m0-1105-bm-qris-simulate-integration` → PR #239
**head SHA**: `af2095b750ad0f8fb3ca109cad4b86a7610db63e`
**base**: `origin/main` (19f38d5 · #236 포함)
**CI run**: https://github.com/CuriocityDevAi/storeport/actions/runs/43334449040 · conclusion=success

## 결과

5 필수 케이스 전부 작성 · 3 pass (route-level) · 2 는 webhook 제품 버그로 `it.failing`:

| # | 케이스 | 결과 | 비고 |
|---|---|---|---|
| BM-a | QRIS 결제 세션 → simulate 200 PENDING | ✓ pass | DB `data->>'payment_request_id'` JSONB 조회 + Xendit `/v3/payment_requests/{id}/simulate` 1 회 호출 (body `{amount:50000}`) · 세션 미캡처 상태 유지 |
| BM-a2 | simulate → webhook paid → captured + receipt_id + draft→order | **it.failing** | 제품 버그 (아래) · TODO(M0-1105-BM) |
| BM-b | 다른 주문의 `payment_request_id` → 400 `payment_request_mismatch` | ✓ pass | Xendit 호출 전에 가드 거절 |
| BM-c | non-QRIS 세션 (`provider_id` 다름) → 400 "not a QRIS session" | ✓ pass | QRIS 세션 생성 후 pg raw `UPDATE provider_id='pp_cash_default'` 로 재현 |
| BM-d | live 키 (`xnd_production_`) → 403 `simulate_live_forbidden` | ✓ pass | `process.env.XENDIT_API_KEY` 를 테스트 내 swap · finally 로 복원 |
| BM-e | 같은 pr_id simulate 2 회 → 둘 다 200 · 세션 미캡처 유지 (라우트 레벨 멱등) | ✓ pass | Xendit `/simulate` 2 회 호출 · 각 body `{amount:15000}` 동일 · 세션 payment 없음 · captures 없음 |
| BM-e2 | webhook paid 2 회 → 멱등 (captures=1 · receipt 1건) | **it.failing** | 동일 제품 버그 (아래) · TODO(M0-1105-BM) |

## 자기 검증 — 직접 실행 요약

### `pnpm test:integration:pos` (CI 와 같은 명령)

```
PASS integration-tests/pos/tenders.spec.ts         — Tests: 89 passed, 89 total
PASS integration-tests/pos/pos-tax-lines.spec.ts   — Tests:  7 passed,  7 total
PASS integration-tests/pos/p6-e2e.spec.ts          — Tests: 10 passed, 10 total
PASS integration-tests/pos/refund-ghost-reservation.spec.ts — Tests: 5 passed, 5 total
PASS integration-tests/pos/pos-qris-simulate.spec.ts        — Tests: 7 passed, 7 total (2 it.failing · documented)
```

실행 로그 실측: 전체 5 spec 통과, 전체 0 failed. 새 spec 이 `test:integration:pos` 패턴에 편입돼 실제로 CI 와 로컬 양쪽에서 실행된 것을 CI 로그로 확증:

```
pos-integration  2026-11-13T00:10:55Z  PASS integration-tests/pos/pos-qris-simulate.spec.ts (15.015 s)
pos-integration                          ✓ #BM-a …
pos-integration                          ✓ #BM-a2 …
pos-integration                          ✓ #BM-b …
pos-integration                          ✓ #BM-c …
pos-integration                          ✓ #BM-d …
pos-integration                          ✓ #BM-e …
pos-integration                          ✓ #BM-e2 …
pos-integration                          Tests: 7 passed, 7 total
```

### `pnpm test` (unit)

```
Test Suites: 11 passed, 11 total
Tests:       132 passed, 132 total
```

### `pnpm typecheck`

에러 0.

### 제품 코드 diff

```
$ git diff origin/main -- apps/commerce-core/src/
(empty)
```

변경 파일 2 건 (테스트 + package.json 만):

```
 apps/commerce-core/integration-tests/pos/pos-qris-simulate.spec.ts | +531 (new)
 apps/commerce-core/package.json                                    | +1 -1
```

## 발견 제품 버그

**파일**: `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts`
- `claimWebhookCapture` 함수 `L268-L277`
- `releaseWebhookClaim` 함수 `L283-L292`

**재현**: `POST /hooks/payment/xendit` 로 `payment.capture` 이벤트를 수신 → 서버가 500 반환. 로그:

```
[M0-1105-BE] claimWebhookCapture failed: Expected 2 bindings, saw 3
   at src/api/hooks/payment/xendit/route.ts:253 (console.warn)
```

**원인**: `claimWebhookCapture` SQL 이 JSONB containment 연산자 `?` 를 포함하지만, Knex 3.2.10 의 `rawFormatter` (`/\\?\?\??/g`) 는 `?` 를 바인딩 placeholder 로 간주한다. `claim` 쿼리는 2 바인딩 + 1 JSONB `?` → 총 3 `?` → Knex 가 `Expected 2 bindings, saw 3` 로 throw. `release` 쿼리는 1 바인딩 + 3 JSONB `?` 로 동일 패턴.

```sql
-- claim (webhook.ts:268)
UPDATE payment_session
SET data = jsonb_set(coalesce(data, '{}'::jsonb), '{webhook_claim}', ?::jsonb, true)
WHERE id = ?
  AND NOT (coalesce(data, '{}'::jsonb) ? 'webhook_claim')   -- ← JSONB `?` 연산자
RETURNING id
```

**어긋나는 요구**: `apps/commerce-core/src/api/hooks/payment/xendit/route.ts:244-325` · "paid → authorize + capture (claim 획득 상태에서만 1회 실행)" (M0-1105-BE REQ1 "동시 paid 이중 처리 차단"). 현재는 claim 자체가 500 으로 실패해 capture 로직 (라인 268 이후) 에 도달하지 못한다 → **production QRIS 결제가 webhook 으로 captured 상태 전이 불가 · receipt 미발행 · draft→order 미전환**.

webhook unit test (`src/api/hooks/payment/xendit/__tests__/webhook-route.unit.spec.ts`) 는 `pg.raw` 를 mock 하기 때문에 이 버그가 전혀 잡히지 않았다. **real-DB 통합 테스트가 없었던 것이 근본 원인** — BM 라운드가 그 공백을 채웠다.

**수정 방향 (후속 라운드 후보)**:
1. JSONB `?` 리터럴은 `\?` 로 이스케이프 (Knex rawFormatter 가 `\?` 를 그대로 둠).
2. 또는 Knex `.raw()` 대신 `pg` 드라이버 직접 사용 (`$1 $2` 바인딩 스타일 — Knex 와 간섭 없음).

BM 범위는 "제품 코드 수정 금지 — 테스트만" 이라 해당 2 케이스 (`#BM-a2`, `#BM-e2`) 를 `it.failing` + `TODO(M0-1105-BM)` 로 고정. 수정 후 `it.failing` → `it` 로 전환하면 downstream 검증 (captured + receipt + 멱등) 자동 활성.

## 기술 선택지 (PR 본문 요약)

- **Xendit 호출 mock**: `globalThis.fetch` 를 wrapper 로 감싸 `api.xendit.co` 만 가로채고 다른 호스트는 passthrough (옵션 1, 채택). `nock` 추가 (옵션 2) 는 불필요한 의존성 + 버전 충돌 리스크로 미채택. `createXenditClient(apiKey, fetchImpl = globalThis.fetch)` 의 default 파라미터가 **호출 시점**에 fetch 를 구함 (ES6 default param 평가 시점) 덕에 테스트에서 fetch 를 교체하면 그대로 적용.
- **(c) non-QRIS 세션 재현**: tenders QRIS 플로우로 세션 생성 후 pg raw `UPDATE payment_session SET provider_id='pp_cash_default'` (옵션 A, 채택) · payment_collection + session 직접 pg insert (옵션 B) 는 FK/NOT NULL 컬럼 수가 많아 flaky 리스크 · 옵션 A 가 세션 체인 유효성을 유지하고 provider_id 가드만 집중 검증.
- **(d) live 키 전환**: `process.env.XENDIT_API_KEY` 를 테스트 내 swap (옵션 A, 채택) · `resolveXenditCreds` 가 매 호출 env 를 fresh read 하므로 안전. 테스트 격리는 `try/finally` 로 복원.

## 45 분 시점 체크

| 항목 | 진행 |
|---|---|
| 제품 코드 diff 0 | ✓ |
| 5 필수 케이스 (a-e) | ✓ 7 작성 (5 pass + 2 it.failing + TODO 기재) |
| `test:integration:pos` 편입 | ✓ `pos-qris-simulate\.spec` 패턴 등록 |
| 자기 검증 로그 | ✓ unit 132 pass · pos-integration 전체 pass |
| CI run 통과 | ✓ run 43334449040 success |
| PR | ✓ #239 open |
| 제품 버그 리포트 | ✓ webhook.ts:268-277, 283-292 (claim/release) · TODO 로 it.failing 고정 |

미완 항목: **없음**.

## PR

https://github.com/CuriocityDevAi/storeport/pull/239
