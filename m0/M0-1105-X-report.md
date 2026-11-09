---
round: M0-1105-X
pr: storeport#203 (신 브랜치 · 새 PR · base=main@0f4b87b · HEAD 78df78f)
base: storeport@main · 0f4b87b (M0-1105-T · #200)
outcome: Admin Orders 500 뿌리 **구조상 완결 해소** · repair 가 링크 엔티티 직조회로 missing/soft_deleted 모두 수집 · 38/38 integration pass (실 Postgres · reproduce+repair 포함) · R0-1105-AI §C 지적 반영
kyu_checks: 2 (아래 "Kyu 복구 절차")
---

# M0-1105-X · Admin Orders 500 뿌리 완전 해소 · repair 링크 직조회

**일자**: 2026-11-09 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/maintenance/repair-dangling-payment-links/route.ts` · `apps/commerce-core/integration-tests/pos/tenders.spec.ts`
**base**: `storeport@main` HEAD `0f4b87b` (M0-1105-T · #200) → 1 커밋 (78df78f) · PR #203 신 브랜치 `fix/m0-1105-x-repair-dangling-links`

---

## §A · 뿌리 (재현 테스트 먼저)

### A.1 — 운영 증상 (R0-1105-AI 지적 · Kyu 11-09 16:49 실측)

배포 `0f4b87b` 뒤 Admin Orders 목록 `An unknown error` 지속.

- `GET /admin/orders?limit=50&fields=id,display_id,payment_status` → **500**
- `GET /admin/orders?limit=5&fields=id` → **200**
- `POST /admin/pos/maintenance/repair-dangling-payment-links` dry_run → `{"scanned_orders":36,"total_candidates":0,"repaired":0}`
- 운영 로그 stack:
  ```
  Cannot read properties of undefined (reading 'captured_amount')
   at getLastPaymentStatus (@medusajs/core-flows/.../aggregate-status.ts:35)
   ← resolveProperty / resolveValue (Proxy · 계산 필드)
   ← LocalWorkflow.newRun
  ```

### A.2 — 뿌리 (file:line)

`@medusajs/core-flows@2.17.2` · `order/utils/aggregate-status.ts:35`:

```ts
for (const paymentCollection of order.payment_collections) {
  if (MathBN.gt(paymentCollection.captured_amount ?? 0, 0) || ...  // ← 여기
```

`payment_collections` 배열에 `undefined` 슬롯이 끼면 `undefined.captured_amount` 접근 TypeError → 500.

**`undefined` 가 끼는 조건** (통합 테스트 #37 재현 증명):

- 같은 order 에 `order_payment_collection` 링크 **≥ 2 개**
- 그 중 일부 FK (`payment_collection_id`) 가 **하드 삭제** 된 `payment_collection` 을 가리킴
- 조건: 나머지 1 개는 **살아 있어야** `.length > 0` 반복 진입 — 모두 하드 삭제 되면 배열 0 길이 (crash 안 남) · 혼재일 때 500

운영 현재 상태 = M0-1105-W A 이전 tenders 삭제 경로가 남긴 혼재 링크. W A 가 신규 생성은 막았지만 **기존 잔재 정리가 필요**.

### A.3 — W A repair 가 0 을 낸 이유

W A `route.ts` 가 `query.graph(entity: "order", fields: ["payment_collections.*"])` 로 조회:

- Medusa remoteQuery 가 `payment_collections.*` join 시 FK 가 가리키는 collection 이 **없으면 배열에서 아예 제외**.
- 응답에 soft-deleted 는 `deleted_at` 과 함께 들어오지만 **하드 삭제된 링크 자체는 스캔 대상에서 사라짐**.
- → `deleted_at` 기반 후보 수집으로는 영원히 0 (R0-1105-AI §C 지적 핵심).

---

## §B · 수정 (file:line + 로직)

### B.1 · `repair-dangling-payment-links/route.ts` (78df78f)

**변경 핵심**: `query.graph` entity 를 `order` → **`order_payment_collection`** 로. 링크 엔티티 직접 조회 후 각 행의 조인된 `payment_collection.id`/`deleted_at` 로 후보 분기.

```ts
const { data } = await query.graph({
  entity: "order_payment_collection",
  fields: [
    "order_id",
    "payment_collection_id",
    "deleted_at",
    "payment_collection.id",         // 하드 삭제면 null
    "payment_collection.deleted_at", // 소프트 삭제면 non-null
    "payment_collection.status",
  ],
  ...(specific_order_id ? { filters: { order_id: specific_order_id } } : {}),
  pagination: { take: limit, order: { created_at: "DESC" } },
});

for (const r of data) {
  if (!r.payment_collection || !r.payment_collection.id) {
    rows.push({ ..., reason: "missing" });        // 하드 삭제 / FK orphan
  } else if (r.payment_collection.deleted_at) {
    rows.push({ ..., reason: "soft_deleted" });   // soft-delete
  }
}
```

**정상 링크**(= pc 존재 + deleted_at null) 는 **후보 미수집** · false-positive 0 (통합 테스트 #38 가드).

**응답 shape** 은 M0-1105-W 뒷단 호환 유지:
`{ ok, dry_run, scanned_orders, total_candidates, repaired, rows[{order_id, payment_collection_id, reason: "missing"|"soft_deleted", collection_deleted_at, collection_status}] }`.
`scanned_orders` = 스캔한 링크의 **distinct order_id 수** (의미 재정의).

`limit` 기본 200 → **1000**, max 1000 → **5000** (링크 단위이므로 상한 완화).

### B.2 · 통합 테스트 (`tenders.spec.ts` · 2 건 신규)

**#37** (`[M0-1105-X] dangling payment-collection link (FK orphan) → /admin/orders?fields=payment_status 500 재현`):

1. order 생성 → `createOrderPaymentCollectionWorkflow` 로 pc **2 개** 시드 (A · B)
2. `paymentModule.deletePaymentCollections([B.id])` 로 B 하드 삭제 → 링크는 pivot 에 남고 pc 는 소멸
3. 상태 검증: `query.graph("order_payment_collection")` 결과 2 행 · 하나는 `payment_collection:{id,...}` · 하나는 `payment_collection` 필드 없음(= missing)
4. `GET /admin/orders?fields=id,display_id,payment_status&limit=50` → **500** (운영과 동일 shape `{code:"unknown_error"}`)
5. `POST /admin/pos/maintenance/repair-dangling-payment-links` dry_run · 단건 → `total_candidates ≥ 1` · `rows[?].payment_collection_id === B.id` · `reason === "missing"`
6. dry_run=false → `repaired ≥ 1`
7. `GET /admin/orders` 다시 **200** · 같은 order 는 여전히 목록에 있음
8. 재스캔 → 같은 order 후보 **0** (멱등)

**#38** (`healthy payment_collection scan 에서 후보로 안 잡힘 · false-positive 가드`):
정상 pc 1 건 시드 → scan dry_run 전체 스캔 → `rows` 에 그 pc_id 없음.

### B.3 · 실 실행 로그 (CI 가 아닌 로컬 real Postgres)

```
PASS integration-tests/pos/tenders.spec.ts (26.321 s)
  M0-1105-B · POS payment API integration
    ✓ #1 … #36 (기존 36건) — 전부 pass
    ✓ #37 [M0-1105-X] dangling payment-collection link (FK orphan) → /admin/orders?fields=payment_status 500 재현 · repair 가 'missing' 후보로 잡고 정리 뒤 200 (402 ms)
    ✓ #38 [M0-1105-X] 건강한 payment_collection 링크는 scan 에서 후보로 잡히지 않음 (false-positive 0 보장) (514 ms)
Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
Time:        26.382 s
```

재현 단계(#37-4) 가 찍은 server 로그 **stack 이 운영 stack 과 1:1 일치**:

```
getLastPaymentStatus @ aggregate-status.ts:35
  ← (anonymous) @ get-orders-list.ts:161
  ← Proxy.returnFn @ transform.ts:205
  ← resolveProperty @ resolve-value.ts:26
  ← resolveValue @ resolve-value.ts:201
  ← originalExecution @ workflow-export.ts:177
  ← LocalWorkflow.newRun @ workflow-export.ts:226
  ← GET @ medusa/.../admin/orders/route.ts:21
```

재현 증명 완결.

---

## §C · 방어(2차 · 권장안 1개 · 미반영 유지 · 이유)

**권장안**: `payment_collection` 하드 삭제 전후에 `link.dismiss` 를 묶는 subscriber (Medusa v2 modules-sdk subscriber 형식).

**본 PR 범위에서 미반영 이유**:

- (a) **Medusa core 가 `deletePaymentCollections` 를 거의 쓰지 않음** — core 는 soft-delete 를 기본.
- (b) 우리 route 중 유일 사용처 = M0-1105-W A **이전** `tenders/route.ts` — 이미 영구 제거.
- (c) 방어막 subscriber 는 edge 관측이 되는 상태(`repair` 가 신규 candidate 를 잡기 시작) 를 보고 설계하는 것이 안전. 지금 추가하면 과잉 대응.
- (d) **Medusa core node_modules 패치는 CLAUDE.md 금지 항목** — 코어 수정 X.

Phase Next 로 별건 분리 추천 (별 round 발부).

---

## §D · Kyu 복구 절차 (2 curl)

본 PR 가 머지 → 운영 배포 뒤:

```bash
# 1) dry_run · 후보 rows 확인 (전체 2000 링크 스캔)
curl -X POST "$BASE/admin/pos/maintenance/repair-dangling-payment-links" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"limit":2000}' | jq .

# 응답: {ok:true, dry_run:true, scanned_orders:N, total_candidates:M, repaired:0,
#        rows:[{order_id, payment_collection_id,
#               reason:"missing"|"soft_deleted", collection_deleted_at, collection_status}]}
# M > 0 이면 운영에 잔재 있음 확정.

# 2) rows 확인 뒤 실행 (link.dismiss 로 끊긴 링크 정리)
curl -X POST "$BASE/admin/pos/maintenance/repair-dangling-payment-links" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"limit":2000,"dry_run":false}' | jq .

# 응답에 repaired === M 이면 완결.
# 그 뒤 Admin UI /app/orders 새로고침 → 목록 정상 표시.
```

---

## §E · CI / Typecheck / Test

| 항목                                        | 결과                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/commerce-core typecheck`              | ✓ 0 err                                                                         |
| unit `TEST_TYPE=unit jest`                  | ✓ 4 suites · 24 tests pass (2.1 s)                                              |
| integration `tenders.spec.ts` 전체          | **✓ 38/38 pass (26.4 s · real Postgres)** · 신규 #37 (재현+복구) · #38 (false-positive 가드) |
| `bash scripts/naming-check.sh`              | ✓ PASS                                                                          |
| `bash scripts/dispatch/validate.sh`         | ✓ 0 violations                                                                  |
| pre-commit (prettier) · pre-push (unit)     | ✓ 통과                                                                          |
| feature-map                                 | ✓ `pos-tenders-fulfill` 가 이미 `maintenance/**` · `integration-tests/pos/**` 전체 커버 — 추가 갱신 불필요 |

---

## §F · 커밋 · PR · SHA

- **브랜치**: `fix/m0-1105-x-repair-dangling-links` (신 브랜치 · M0-1105-W 승계 X)
- **base**: `origin/main@0f4b87b`
- **head**: `78df78f` — `fix(pos): repair-dangling-payment-links · 링크 엔티티 직접 조회로 'missing' 후보 탐지 (M0-1105-X · R0-1105-AI §C)`
- **PR**: [storeport#203](https://github.com/CuriocityDevAi/storeport/pull/203) — 승인 없이 open 완료 (지시 조건).
- **processes**: `[commerce.pos-tenders-fulfill]`
- Medusa core node_modules 패치 **0**.

---

## §G · 영향 범위 요약 · 뒷단 호환

- POS 라우트 (tenders · fulfill · quote · 상세) **미변경**.
- `/admin/pos/maintenance/repair-dangling-payment-links` 응답 shape 그대로 (`scanned_orders` 는 "링크 단위 distinct order_id" 로 **의미 재정의** 됐지만 타입/필드 그대로).
- 테스트 #34 (`dry_run` 기본 호출 shape 검증) 통과 유지.
- `pos-tenders-fulfill` 안쪽에 머무름 (feature-map 변경 없음).

---

## §H · 다음 라운드 후보 (별건 · 미착수)

- subscriber-based `payment_collection` hard-delete 감시 → link auto-dismiss (§C 권장안 · Phase Next).
- W/X round 통합 테스트 `reproduce → repair → verify` 패턴을 다른 dangling-link 유사 상황 (예: order ↔ fulfillment) 에도 템플릿화.
