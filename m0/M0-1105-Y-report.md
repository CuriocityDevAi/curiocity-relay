# M0-1105-Y Report — Fulfill 뒤 Not fulfilled 서버 수정 + repair 도구

- **Branch**: `fix/m0-1105-y-fulfill-provider` (from origin/main 8ba49a0)
- **Commit**: `14a0e4f` — `fix(pos): fulfill manual provider · 조건부 handed_over_at · packed_at 가드 · repair 도구 (M0-1105-Y)`
- **PR**: https://github.com/CuriocityDevAi/storeport/pull/205

## §0 (A)(B)(C) 재현 → 빨강 → 수정 → 초록

### 뿌리 (R0-1105-AQ-report.md · origin/main 8ba49a0)

| 분류 | 증상 | file:line | 상태 |
|---|---|---|---|
| **A** | medusa-config 에 `@medusajs/medusa/fulfillment` providers 미등록 → `fulfillmentModule.createFulfillment({ provider_id:"manual_manual" })` throw → polyErr non-fatal → `fulfillment_id=null` | medusa-config.ts (fulfillment 모듈 블록 없음) · fulfill/route.ts:471-491 `createFulfillment` try block · catch polyErr non-fatal (route.ts:512-517 before fix) | 신규 블록 1건 추가로 해소 |
| **B** | 그런데도 `metadata.fulfillment.handed_over_at` 를 **무조건** 기록 | fulfill/route.ts:544-568 (before fix) | fulfilled=true 일 때만 기록 (route.ts 수정본) |
| **C** | 다음 라운드 멱등 가드 (handed_over_at 만 봄) 가 "이미 됨" → 200 already_fulfilled 영구 고착 · pre-#200 행 packed_at null 도 같은 가드 | fulfill/route.ts:238-265 (before fix) | packed_at+!canceled_at 가드로 재편 |

### 통합테스트 (apps/commerce-core/integration-tests/pos/tenders.spec.ts)

신규 #39~#43 — 각 테스트가 어떤 뿌리를 입증·초록 전환하는지:

- **#39 [A] takeaway hand_over → fulfillment row 1건 영속 (packed_at non-null)**
  - origin/main 8ba49a0: polyfill throw · `order.fulfillments` 비어 · packedRows=0 (red).
  - 본 PR: `fulfilled:true` · `packed_rows=1` (green).
- **#40 [A] preorder paid_full + shipping_option 없음 + sku 없음 → fulfilled:true**
  - dp_percent=100 으로 전액 선불 → preorder.stage=paid_full. fulfill(stage=hand_over) 호출.
  - origin/main: polyfill throw → fulfilled=false (red).
  - 본 PR: fulfilled=true · fulfillment_id 세팅 (green).
- **#41 [C] handed_over_at 만 있는 stuck 주문 재누름 → already_fulfilled 가드에 안 걸림**
  - metadata.fulfillment.handed_over_at 수동 주입 · fulfillment row 없음.
  - origin/main: `already_fulfilled:true` 로 영구 고착 (red).
  - 본 PR: 가드 통과 → 정상 경로 진입 → fulfilled=true (green).
- **#42 [repair] stuck 주문 → dry_run 후보 · 실행 → fulfillment 재생성 + 재고 불변**
  - 복구 도구 자체가 신규 라우트 — main 엔 404.
- **#43 [B 수정 뒤 멱등성] 2회 누름 → 재고 1회만 차감**
  - first.fulfilled=true · stocked -1 · second.already_fulfilled=true · stocked 불변.

로컬 환경에 Postgres 가 없어 `test:integration:pos` 는 돌리지 못했음 — CI 측 러너로 실측 예정.

## medusa-config diff

```diff
+    // M0-1105-Y · Fulfillment manual provider 등록 (manual_manual).
+    //
+    // 뿌리 (R0-1105-AQ §A · origin/main 8ba49a0): 기존 fallback
+    // `fulfillmentModule.createFulfillment({ provider_id: "manual_manual", ... })`
+    // 는 provider 미등록으로 throw → polyErr non-fatal 로그만 남고 fulfillment_id
+    // = null · 앱 "Not fulfilled" 영구 고착. Medusa 2 공식 형식: fulfillment 모듈
+    // options.providers 에 `@medusajs/medusa/fulfillment-manual` 1개. 최종
+    // provider_id = `<ManualFulfillmentService.identifier>_<id>` = `manual_manual`
+    // (packages/modules/fulfillment/services/fulfillment-provider.ts:32 참조).
+    //
+    // CLAUDE.md §0 예외 범위 (오케 전결): 이 파일은 이번에 이 블록 1건만 허용 ·
+    // 다른 줄 변경 금지.
+    {
+      resolve: "@medusajs/medusa/fulfillment",
+      options: {
+        providers: [
+          {
+            resolve: "@medusajs/medusa/fulfillment-manual",
+            id: "manual",
+          },
+        ],
+      },
+    },
+
     // M0-1104-J-a · Payment providers 3종 ...
```

## 실패 응답 키 (M3 가 다음 라운드에 소비)

- `fulfilled: boolean` — fulfillment row + registerFulfillment 성공 여부.
- `fulfillment_warning?: string` — "fulfillment create failed: <msg>" (실패 시).
- `inventory_warning?: string` — 재고 경고 (기존 유지).
- `already_fulfilled?: true` — 멱등 가드 결과 (기존 유지 · 가드 기준만 완화).

앱 UX 권장: `fulfilled=false` 이면 "Handed over" 토스트 **금지** · "Not fulfilled · retry" 로 분기.

## 복구 도구 — Kyu 용 curl

**dry_run (스캔만 · 삭제 없음)**:
```bash
curl -s -X POST "$MEDUSA_URL/admin/pos/maintenance/repair-stuck-fulfillments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"limit": 100}' | jq .
```

**실행 (dry_run=false · fulfillment 재생성 · 재고 불변)**:
```bash
curl -s -X POST "$MEDUSA_URL/admin/pos/maintenance/repair-stuck-fulfillments" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"limit": 100, "dry_run": false}' | jq .
```

응답 shape:
```json
{
  "ok": true,
  "dry_run": false,
  "scanned_orders": 48,
  "total_candidates": 3,
  "repaired": 3,
  "rows": [
    {
      "order_id": "order_01M6V...",
      "display_id": 48,
      "handed_over_at": "2026-11-10T10:33:00.000Z",
      "before": { "fulfillments": 0, "packed_rows": 0 },
      "after": { "fulfillment_id": "ful_01...", "packed_rows": 1 }
    }
  ]
}
```

## 로컬 로그

- `pnpm -F commerce-core typecheck` → **에러 0**
- `pnpm -F commerce-core test` (unit) → **24 pass**
- `bash scripts/naming-check.sh` → **PASS** (meros 매치 0)
- `node scripts/feature-map-check.mjs --diff ...` → **unmatched=0**
- `pnpm -F commerce-core lint` → 로컬 환경 `Cannot find module '@medusajs/eslint-plugin'` (CI 통과 확인 필요 · 이 PR 과 무관한 env-only issue)
- `test:integration:pos` → 로컬 Postgres 없음 · CI 측 러너 실측

## 기술 선택지 · 채택 · 이유 (PR 본문에도)

- 가드 기준: handed_over_at vs. **packed_at** 채택. 이유=fulfillment row 실 존재가 "이행 완료" 의 1차 진실 · metadata 는 side-effect.
- 재고 이중 차감 방지: **flag + reservation 재조회 heuristic** 채택. 이유=신규 라운드는 flag 로 · pre-#200 legacy 는 flag 없음 → reservation 비어 있음을 보조 신호로.
- 복구 범위: **fulfillment row 재생성만** (재고/결제 무개입) 채택. 이유=운영 stuck 주문 다수가 "재고 이미 빠짐" — dry_run 결과 보고 드문 예외만 사용자 수동 fulfill.

## 범위 체크

- 변경 파일 (5): `medusa-config.ts`(+24) · `src/api/admin/pos/orders/[id]/fulfill/route.ts`(+148/-49) · `src/api/admin/pos/maintenance/repair-stuck-fulfillments/route.ts`(신규 294줄) · `integration-tests/pos/tenders.spec.ts`(+326) · `docs/feature-map.yaml`(1줄 summary 갱신).
- 금지 영역 (M0-1105-Y 범위): medusa-config.ts 는 fulfillment 모듈 블록 **1건만** 추가 · providers 배열 (payment) 변경 없음 · #197 세금 파일 변경 없음.
- processes: `[commerce-core.pos-tenders-fulfill, commerce-core.commerce-core-envelope]`.
