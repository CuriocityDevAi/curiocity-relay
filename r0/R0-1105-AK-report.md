---
name: R0-1105-AK · storeport#203 긴급 리뷰 (M0-1105-X · repair 링크 직조회)
description: storeport PR#203 head 78df78f · 1커밋 · base main 0f4b87b · 판정 APPROVE · 정상 링크 삭제 가능성 0 확인 · 38/38 pass
author: R0
dated: 2026-11-09
---

# R0-1105-AK · storeport#203 긴급 리뷰 (M0-1105-X)

**스코프**: storeport PR#203 (`fix/m0-1105-x-repair-dangling-links` HEAD `78df78f` · base `main @ 0f4b87b`)  
**커밋**: 1건 — `fix(pos): repair-dangling-payment-links · 링크 엔티티 직접 조회로 'missing' 후보 탐지 (M0-1105-X · R0-1105-AI §C)`  
**변경 파일**: 2건
- `apps/commerce-core/integration-tests/pos/tenders.spec.ts` (+169)
- `apps/commerce-core/src/api/admin/pos/maintenance/repair-dangling-payment-links/route.ts` (+74/-71)

---

## 판정

| PR | head | 판정 |
|---|---|---|
| **storeport #203** | `78df78f` | **APPROVE** — 정상 링크 삭제 가능성 0 · missing/soft_deleted 모두 탐지 · 38/38 · 금지 영역 0 |

non-blocker 1건 하단 §E 참조.

---

## §A · repair 후보 판정 로직 (file:line)

### A.1 — 핵심 전환: `order` → `order_payment_collection` 직조회

**배경 (R0-1105-AI §C 지적 → M0-1105-X 근거)**:
- W A 라운드 repair: `query.graph(entity:"order", fields:["payment_collections.*"])` 로 조회
- Medusa remoteQuery join 이 FK 가 가리키는 `payment_collection` 이 **하드 삭제**된 경우 배열에서 아예 제외
- → `deleted_at` 기반 후보 수집으로는 missing 케이스 탐지 불가 → 운영 `dry_run candidates=0` 이지만 `/admin/orders` 500 지속

**수정 (route.ts ~L74-87)**:
```ts
const { data } = await query.graph({
  entity: "order_payment_collection",   // ← 변경 핵심
  fields: [
    "order_id",
    "payment_collection_id",
    "deleted_at",
    "payment_collection.id",            // 하드 삭제 → null
    "payment_collection.deleted_at",    // 소프트 삭제 → non-null
    "payment_collection.status",
  ],
  ...(specific_order_id ? { filters: { order_id: specific_order_id } } : {}),
  pagination: { take: limit, order: { created_at: "DESC" } },
} as any);
```

링크 엔티티를 직접 조회하므로 missing join(`payment_collection` 필드 null)도 행으로 돌아옴 ✓

### A.2 — 후보 판정 분기 (route.ts ~L105-120)

```ts
const pc = r.payment_collection ?? null;
const pcId: string | null = pc?.id ?? null;
const pcDeletedAt: string | null = pc?.deleted_at ?? null;

if (!pc || !pcId) {
  rows.push({ ..., reason: "missing" });      // 하드 삭제 / FK orphan
  continue;
}
if (pcDeletedAt) {
  rows.push({ ..., reason: "soft_deleted" }); // 소프트 삭제
}
// 위 두 조건 모두 아님 → 정상 링크 → rows 미추가
```

**정상 링크 보호 조건**: `pc` 존재 + `pcId` 존재 + `pcDeletedAt === null` → `rows.push` 도달 불가 ✓

| 조건 | 처리 |
|---|---|
| `payment_collection` 필드 없음 (하드 삭제) | `reason:"missing"` → 후보 |
| `payment_collection.deleted_at` non-null (소프트 삭제) | `reason:"soft_deleted"` → 후보 |
| pc 존재 + deleted_at null (정상) | rows 미추가 → **후보 아님** |

### A.3 — false-positive 가드 (#38 · route.ts ~L38-43 테스트 side)

```ts
// #38 테스트 핵심 흐름
createOrderPaymentCollectionWorkflow → pc 생성(healthy)
→ POST /repair dry_run:true limit:500 → scan
→ expect: scan.data.rows 에 해당 pc_id 없음
```

정상 collection 1건만 있는 order 를 전체 스캔해도 후보에 안 잡힘 ✓  
**정상 링크를 지울 가능성 = 0** 확증.

---

## §B · dry_run 기본 · dismiss 대상 · 응답 rows

### B.1 — dry_run 기본값

해당 행은 이번 diff 에 미포함(변경 없음). W A 라운드에서 확립된 `body.dry_run == null ? true : Boolean(body.dry_run)` (route.ts ~L52) 그대로 유지.  
테스트 #37: body `{ order_id, dry_run: true }` 명시 호출 → dry_run 응답 `true` ✓  
테스트 #38: body `{ order_id, dry_run: true, limit: 500 }` → dry_run 응답 `ok:true` ✓

### B.2 — dismiss 대상 = 후보 행과 정확 일치

dismiss 루프 (route.ts ~L156-170):
```ts
if (!dry_run && rows.length > 0) {
  for (const r of rows) {       // ← §A.2 에서 수집된 rows 그대로
    await link.dismiss(...)
  }
}
```

`rows` 는 §A.2 에서 missing/soft_deleted 후보만 담긴 배열. dismiss 는 이 배열을 그대로 순회 → **후보 = dismiss 대상** 1:1 일치 ✓

### B.3 — 응답 rows 필드

`Row` 타입: `{ order_id, payment_collection_id, reason:"missing"|"soft_deleted", collection_deleted_at, collection_status }`

**minor**: `display_id` 미포함 (§E 비-블로커 항목).  
`order_id`, `payment_collection_id`, `reason` 3개 핵심 필드는 모두 존재 — dry_run 단계에서 Kyu 가 rows 를 보고 판단하기 충분 ✓

---

## §C · #37 재현 stack vs 운영 stack · 200 어설션

### C.1 — 재현 조건

테스트 #37 (tenders.spec.ts ~L1779 이후):
1. order 1건 + payment_collection **A, B 2개** 생성
2. `paymentModule.deletePaymentCollections([pc_B_id])` → B 하드 삭제 (링크 pivot 잔존)
3. `query.graph("order_payment_collection")` → 2행 · B 쪽 `payment_collection` 필드 없음 확인
4. `GET /admin/orders?fields=id,display_id,payment_status&limit=50` → **500** 어설션

### C.2 — 운영 stack 1:1 일치 (M0 §B.3 실행 로그)

```
getLastPaymentStatus @ aggregate-status.ts:35          ← captured_amount 접근
  ← (anonymous) @ get-orders-list.ts:161
  ← Proxy.returnFn @ transform.ts:205
  ← resolveProperty @ resolve-value.ts:26
  ← resolveValue @ resolve-value.ts:201
  ← LocalWorkflow.newRun @ workflow-export.ts:226
  ← GET @ medusa/.../admin/orders/route.ts:21
```

운영 11-07 22:50 로그 stack 과 `getLastPaymentStatus · captured_amount · get-orders-list · LocalWorkflow.newRun` 경로 1:1 일치. 재현 증명 완결 ✓

### C.3 — repair 뒤 200 어설션

```ts
// #37 step 5
const good = await api.get(
  `/admin/orders?fields=id,display_id,payment_status&...`,
  { headers: authHeader },
);
expect(good.status).toBe(200);
// 같은 order 가 목록에 여전히 존재
const found = orders.find(o => o.id === order.id);
expect(found).toBeTruthy();
```

repair 뒤 `GET /admin/orders?fields=...,payment_status` **200** · 해당 order 목록 잔존 ✓  
링크만 dismiss 되고 order 자체는 유지됨 ✓

### C.4 — 멱등 재스캔

```ts
// #37 step 6
const reRun = await api.post('/repair', { order_id, dry_run: true });
expect(reRun.data.rows.find(r => r.payment_collection_id === pc_B_id)).toBeFalsy();
```

repair 뒤 재스캔 → 같은 order 의 B 링크 후보 없음 ✓

---

## §D · 통합 38/38 로그 · 금지 영역 · Medusa 패치

### D.1 — 통합 실행 로그

M0 §B.3 실 Postgres 실행 결과 (직접 재실행 불가 · SSH/railway CLI 금지):
```
PASS integration-tests/pos/tenders.spec.ts (26.321 s)
  ✓ #1 ~ #36 (기존 36건 모두 pass)
  ✓ #37 [M0-1105-X] dangling payment-collection link ... 500 재현 · repair · 200  (402 ms)
  ✓ #38 [M0-1105-X] 건강한 payment_collection 링크는 후보로 안 잡힘               (514 ms)
Tests: 38 passed, 38 total  ·  Time: 26.382 s
```

PR 본문에도 동일 수치 명시 · M0-1105-X §E CI 항목 전체 ✓.

### D.2 — 금지 영역 0

| 금지 카테고리 | 확인 |
|---|---|
| `medusa-config.ts` | 미변경 ✓ |
| `providers/**` | 미변경 ✓ |
| #197 세금 파일 (`settings/**` · `receipt/**` · `quote/**`) | 미변경 ✓ |
| `apps/wing/**` / `apps/anchor/**` / `apps/care-agent/**` | 미변경 ✓ |
| Medusa `node_modules` 패치 | **0** ✓ |

변경 파일 2건 모두 `apps/commerce-core` 범위 내 (`integration-tests`, `src/api/admin/pos/maintenance`) — 허용 범위 ✓

---

## §E · 비-블로커 주의

**1건** (다음 라운드 권장):

**`display_id` 미포함**: `Row` 타입에 `display_id` 없음. dry_run rows 를 보고 싶을 때 `order_id` 로 직접 조회 필요. 운영 복구 판단에 치명적이진 않으나 UX 개선 여지 있음. 다음 라운드 `Row` 타입에 `display_id?: string` 추가 권장.

> **블로커 아님** — `order_id` 로 충분히 추적 가능하고 dry_run 단계에서 오작동 없음.

---

## §F · 운영 복구 절차 검증

PR 본문 복구 절차 (§D Kyu 복구 절차 2-curl):

```bash
# 1) dry_run · 후보 확인
curl -X POST "$BASE/admin/pos/maintenance/repair-dangling-payment-links" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"limit":2000}' | jq .
# 응답: dry_run:true · scanned_orders:N · total_candidates:M · rows:[{reason:"missing"|...}]

# 2) 실 삭제
curl -X POST ... -d '{"limit":2000,"dry_run":false}' | jq .
# 응답: repaired:M
```

limit 2000 → 신 limit max 5000 범위 내 ✓ · `dry_run` 기본 `true` 이므로 1번 curl 은 `dry_run` 명시 불필요 (기본으로 safe) ✓

---

## §G · 최종 체크리스트

| 항목 | 결과 |
|---|---|
| `entity:"order_payment_collection"` 직조회로 missing 탐지 | ✓ |
| 정상 링크 후보 미수집 (#38 false-positive 가드) | ✓ |
| dry_run 기본 true | ✓ (변경 없음 · 기존 로직 유지) |
| dismiss 대상 = 후보 rows 1:1 일치 | ✓ |
| #37 운영 stack (`getLastPaymentStatus · captured_amount`) 재현 일치 | ✓ |
| repair 뒤 `GET /admin/orders?fields=...,payment_status` 200 어설션 | ✓ |
| 38/38 integration pass (real Postgres) | ✓ (M0 §B.3 실행 로그) |
| 금지 영역 0 | ✓ |
| Medusa node_modules 패치 0 | ✓ |
| 뒷단 호환 (응답 shape 유지) | ✓ |

---

## 판정: **APPROVE**

정상 링크 삭제 가능성 0 — `§A.2` 로직 + `#38` false-positive 가드로 이중 확증.  
운영 Admin Orders 500 뿌리 완전 재현 (#37) + repair 후 200 복구 경로 확인.  
non-blocker: `display_id` 미포함 1건 (다음 라운드 권장).
