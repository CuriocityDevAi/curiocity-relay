# R0-1105-EY 리포트

#271 CHANGES · #270 APPROVE · #269 재판정 CHANGES

---

## PR #271 — M0-1105-CI: S1b+R4 번호 연결 단일화 + 적립 훅

### 판정: CHANGES

### 실행 로그

- CI run #43688984315 (branch `feat/m0-1105-ci-s1b-r4`, head `9699d63`) → pos-integration ✅ success
- 로컬 통합 테스트: Postgres 미기동 → CI 결과로 대체 (명시)
- `store_credit_account_transaction` 마이그레이션 직접 확인 (`M3-1105-CM-wt` node_modules 경유)

### CHANGES 항목

**[C1] 동시성 갭 — reference_id unique 제약 없음, 23505 가드 불발 (필수)**

`earn.ts:185–199`

```ts
try {
  await storeCredit.creditAccounts([{ ..., reference_id: `earn:${order.id}` }]);
} catch (err: any) {
  if (err?.code !== "23505") throw err;   // ← 이 분기 절대 안 탐
}
```

마이그레이션 확인:

```sql
-- Migration20250130220640.js
"reference_id" text not null
-- unique 제약 없음 (PK = "id"만)
```

→ 23505 는 실제로 발생하지 않는다. 1차 가드인 `metadata.loyalty_earn` 플래그만 남는데, 이것도 TOCTOU: subscriber + linkCustomerToOrder 두 경로가 모두 플래그 미세팅 상태에서 `creditAccounts` 를 호출하면 이중 적립.

필요 조치: #261 과 동일한 advisory lock 으로 창을 닫거나, reference_id 에 unique constraint 를 직접 추가해 23505 가드를 실제 작동시킬 것.

**[C2] subscriber `order.updated` 과다 구독**

`loyalty-earn-on-paid.ts:76`

```ts
event: ["order.updated", "payment.captured"],
```

earnForOrder 가 updateOrders(loyalty_earn 메타데이터)를 마치면 → `order.updated` 재발화 → subscriber 재진입. earn 1회당 invocation 2회(무한 루프는 없지만 불필요한 DB 읽기).

권고: `event: ["payment.captured"]` 단독 검토.

### OK 항목

| 항목 | 결과 | 근거 |
|------|------|------|
| 적립 금액 = receipt-preview | ✅ | earn.ts:130–143 · previewReceipt 동일 입력(subtotal·discount·SC·PB1·credit_used·dp) |
| enabled=false → earn=0, skipped_reason=loyalty_disabled | ✅ | earn.ts:111 |
| link_open_until 창 밖 → 409 link_window_closed | ✅ | link-customer-order.ts 창 판정 + link-earn.spec.ts 케이스 4 |
| 임시 admin 경로 TODO | ✅ | route.ts 명시 + "TODO(S1c·M3-1105-CK): 손님 앱 미들웨어 경로로 이관" |
| CI pos-integration | ✅ | run #43688984315 |
| 멱등 1차 가드 logic | ✅ | metadata.loyalty_earn.applied=true → idempotent 반환 |
| credit_balance_before=10^9 처리 | ✅ | 적립 금액 산정 전용으로 큰 값 사용 · 주석 명시 |

---

## PR #270 — M1-1105-CG: ci-summary.yml

### 판정: APPROVE

### 실행 로그

- CI run #43688451570 (branch `feat/M1-1105-CG-ci-summary`, head `b2f8ad4`) → pos-integration ✅ success

### APPROVE 근거

| 항목 | 결과 | 근거 |
|------|------|------|
| permissions 최소 | ✅ | pull-requests: write · actions: read 만 |
| fork PR skip | ✅ | `head_repository.full_name == github.repository` 가드 (.yml:21) |
| PR 찾기 정확성 | ✅ | `/commits/$HEAD_SHA/pulls` SHA 기반 정확 조회 |
| 코멘트 upsert | ✅ | `<!-- ci-summary -->` 마커로 기존 코멘트 찾아 PATCH |
| body JSON 주입 방어 | ✅ | `jq --rawfile` 경유 → 이스케이프 안전 |

### 인라인 코멘트 (non-blocking)

`.github/workflows/ci-summary.yml:36`

```yaml
RUN_ID="${{ inputs.run_id }}"  # ← 사용자 입력 직접 보간
```

write-access 한정이라 현실적 위험 낮음. env 경유로 개선 가능:

```yaml
env:
  RUN_ID: ${{ inputs.run_id }}
```

---

## #269 재판정

**APPROVE → CHANGES**

EX 의 "main CI 초록" 주장 오류:

- `29ea759` (main 최신) → pos-integration: **skipped** (통과가 아님)
- `551f014` (#269 head) → pos-integration: **failure** (run #43685848067 직접 확인)

실패 근본 원인: PR #269 가 추가한 `/customer-display-web/[...path]` 경로가 Medusa `path-to-regexp` 에서 오류 발생:

```
Error: Unexpected [ at index 22: /customer-display-web/[...path]
```

Medusa 는 Express 기반으로 Next.js 스타일 `[...path]` catch-all 을 지원하지 않음 → 앱 부트스트랩 실패 → 모든 POS 통합 테스트 fail.

수정 방법: `[...path]` → `*` 또는 Express 호환 패턴 (예: `customer-display-web/*`).

**#269 APPROVE 유지 불가** — 경로 패턴 수정 없이 머지 시 main pos-integration 전체 파손.

---

## 착지 명령 실행 결과

GitHub 리뷰 코멘트 게시:
- #271: `gh pr review 271 --comment` (자신 PR → --request-changes 불가, comment 로 대체)
- #270: `gh pr review 270 --comment` (자신 PR → --approve 불가, comment 로 대체)
