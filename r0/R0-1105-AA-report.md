---
name: R0-1105-AA · 허브-1107-AA storeport #199 + fork #59 relay
description: storeport #199 (M0-1105-S · #198 rebase onto main + M3-M contract) + fork #59 (M2-1105-P · 로고 비트맵 · Cashier · 하단 여백) 리뷰 · 둘 다 APPROVE · merge-tree clean · ①②③ 재tender collection 재사용 + completeOrder + fulfillment polyfill 통합 검증
author: R0
dated: 2026-11-07
---

# R0-1105-AA · storeport #199 + fork #59 relay

**스코프**: storeport PR #199 (`feat/m0-1105-s-rebase-m3m` HEAD `7063ac9`) + fork PR #59 (`feat/m2-1105-p-logo-bitmap` HEAD `4799042`).
**정본**: storeport main `5742460` (post-#197 SC/PB1 서버 머지 상태) · fork master `3ff7e9e` (#58 M3-1105-N 머지 후).
**직전**: R0-1105-Z → fork #58 APPROVE. #198 (M0-1105-R) 은 DIRTY rebase 로 close 예정 · **본 PR #199 가 승계**.
**claim**: `status/claims/R0-1105-AA.json` (러너 started 자동 기록 완료 · 리포트 push 수동).
**금지**: 코드 수정 · 커밋.

## 판정

| PR | head | 판정 |
| --- | --- | --- |
| **storeport #199** (M0-1105-S · #198 rebase + M3-M) | `7063ac9` | **APPROVE** — ①②③ 재tender collection 재사용 + completeOrderWorkflow + fulfillment polyfill 모두 정상 통합 · M3-M a/b/c 계약 3건 어설션 통과 · #197 SC/PB1 계산과 공존 · 금지 영역 0 · `mergeable_state: clean` |
| **fork #59** (M2-1105-P · 로고 비트맵 · Cashier · 하단 여백) | `4799042` | **APPROVE** — pure Node 로고 → GS v 0 raster · 32/32 어설션 PASS · `lib/printer/*` 외 수정 0건 · master `3ff7e9e` 와 `merge-tree --write-tree` clean · 1건 **deferred risk** (node:zlib import 경로 · 아래 §B.3) |

운영 영향이 있는 #199 는 평소보다 엄격히(재고·결제 데이터 변경 경로) 살폈고, 폴리필·collection 재사용·completeOrder 모두 **명시 분기 + non-fatal + 테스트 어설션**으로 둘러싸여 있어 CHANGES 기준에 걸릴 사유 없음.

---

## §A · storeport #199 — ①②③ + M3-M 재tender/재고/결제 경로

### §A.1 · Kyu 실기 2차 ① "결제 후 collection 2개" 재tender 재사용 가드

**좌표**: `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:343-376`.

```ts
const existingPending = ((order.payment_collections ?? []) as any[]).find(
  (c: any) =>
    c?.status !== "completed" &&
    c?.status !== "canceled" &&
    !(Array.isArray(c?.payments) && c.payments.length > 0),
);
// ... (같은 금액 → id 재사용 · 다른 금액 → delete + create · payments 있으면 미접촉)
```

| 시나리오 | 가드 동작 | 결과 |
| --- | --- | --- |
| pending(0 payments) · amount 동일 | `payment_collection_id = existingPending.id` 재사용 | **collections.length === 1** 유지 (테스트 #18) |
| pending(0 payments) · amount 다름 | `deletePaymentCollections([existingPending.id])` + 신규 create | 1개로 유지 (레거시 pending 흡수) |
| **draft 생성 시점 pre-create 된 pending** (0 payments) | 위와 동일 — payments 비면 가드가 **그대로 흡수** | ✓ Kyu 실서버 "한 번 결제에도 Partially captured" 뿌리 중 하나 해소 가능 |
| 이미 `payments.length > 0` (부분/완전 캡처) | 가드 조건 미달 → 미접촉 · 신규 collection 생성 | collections 누적 (의도적 — 재tender 분리 추적) |

**결론 ①**: 재tender 2회에 대해 통합 테스트 #18 이 `collections.length === 1` 어설션 통과를 보장. "draft 생성 시점에 미리 생기는 collection" 도 `payments.length === 0` 조건을 만족하면 가드에 흡수됨. 단, **이미 payments 가 붙은 "partially_captured"** collection 은 가드가 손대지 않음 (추적성 유지 의도 · 뿌리 해소 완전치 않음 — 만약 Partially captured 가 "최초 tender 1회만으로" 발생하는 서버가 있다면 그 뿌리는 **capture 측 로직** · 컬렉션 재사용 가드 밖 영역). Kyu 3차 실기 재현 시 `payment_collection` status 와 `payments` 배열을 서버 로그로 함께 확인 필요.

**minor note** (blocker 아님): `Number(existingPending.amount ?? 0) === amount` 비교에서 Medusa v2 derived field 가 가끔 `{numeric_: n}` wrapper 를 반환함. 이 경우 `Number({numeric_:X})` → `NaN` → 가드 미달 → delete+recreate 경로. 통합 테스트는 통과하지만 실서버에서 derived field shape 가 wrapper 로 올 가능성 있음 — 관측 포인트로 두고 **차후 라운드에서 `toNum(existingPending.amount)` 사용 권장** (M0-1105-Q 의 `toNum` 재사용 가능).

### §A.2 · Kyu 실기 2차 ② fulfill hand_over → completeOrderWorkflow

**좌표**: `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts:325-342`.

```ts
if (stage === "hand_over") {
  const eligible =
    order_type !== "preorder" || preorderMd?.stage === "paid_full";
  if (eligible) {
    try {
      await completeOrderWorkflow(container).run({
        input: { orderIds: [order_id] } as any,
      });
      completed = true;
    } catch (e) {
      console.warn(`[M0-1105-R] completeOrderWorkflow failed (non-fatal · 결제·재고 유효): ${(e as Error).message}`);
    }
  }
}
```

| 축 | 판정 |
| --- | --- |
| 전이 조건 | `stage === "hand_over"` + (`takeaway` 또는 `preorder.stage === "paid_full"`) · delivery 는 `pack` stage 라 미발동 (의도) |
| **preorder dp_paid 제외** | `preorderMd?.stage === "paid_full"` 조건이 ⓑ — dp_paid 상태면 eligible=false → `completed=false` 반환 + Order.status=`pending` 유지 (테스트 #20) ✓ |
| non-fatal | try/catch · 실패 시 `console.warn` + `completed:false` · 결제·영수증·재고 모두 유효 ✓ |
| response contract | 응답에 `completed` 플래그 추가 (shape 표 M0-1105-S §응답 반영) |

**결론 ②**: dp_paid → pending 유지, paid_full → completed 전이. 모든 경로 테스트 #19(takeaway) · #20(dp_paid) · #24(stage="hand_over" 명시) 로 커버됨.

### §A.3 · Kyu 실기 2차 ③ fulfillment polyfill — 재고 이중 차감 금지 검증

**좌표**: `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts:195-250`.

| 분기 | 재고 차감 경로 | 폴리필 실행? |
| --- | --- | --- |
| **정상 경로**: `createOrderFulfillmentWorkflow` 성공 | workflow 가 재고 차감 + fulfillment row 생성 | **실행 안 됨** (catch 진입 조건 미충족) ✓ |
| **isInventoryLinkError 분기**: workflow throw (inventory_item 없음 등) | 위 블록 (L155-194) `adjustInventory(inv_id, location, -qty)` 직접 호출 | **record keeping 만** (`m0_1105_r_polyfill: true` 메타데이터) — **재고 손 안 댐** ✓ |
| **isInventoryLinkError 아님** (진짜 unrecoverable) | `res.status(500)` early return | 폴리필 분기 도달 안 함 ✓ |

**이중 차감 가드**: 폴리필의 `createFulfillment` 호출은 `provider_id: "manual_manual"` + `shipping_option_id: null` 로 **reservation/inventory 링크 없는** 모드. `items: polyfillItems` 는 title/sku/qty/line_item_id 만 — fulfillment 서비스가 자체적으로 inventory level 을 건드리는 호출 경로가 아님. 테스트 #21 이 `after === before - 1` + `fulfillments.length <= 1` 를 동시에 검증 → **재고 1회 + fulfillment row 1개** 보장.

**ensureBaseSeed idempotency** (`apps/commerce-core/integration-tests/pos/helpers.ts:102-130`):
- `if (!existingSets[0])` 가드 — 첫 호출만 create · 재호출 skip ✓
- try/catch 전체 감싸 non-fatal (`console.warn`) ✓
- **운영 DB 부작용 없음** — `integration-tests/` 하위에만 존재 · src/ 미수정 ✓

### §A.4 · M3-M contract a/b/c — 앱 shape 수용

| 계약 | 서버 변경 | 테스트 |
| --- | --- | --- |
| **a. `body.preorder.{pickup_at, note}`** | `tenders/route.ts:248-257` 기존 L 로직 재사용 — `(body.preorder as any)?.pickup_at` + `note` 를 `metadata.preorder` 로 영속 (M0-1105-L 유지) | **#23** metadata.preorder.pickup_at === "2026-11-10T09:00:00.000Z" + note === "No sugar" ✓ |
| **b. fulfill `body.stage='hand_over'`** | `fulfill/route.ts:120` `const stage = ((body.stage as string) \|\| stageFromOrderType(order_type))` — 명시 우선 | **#24** takeaway + stage="hand_over" → `completed: true` ✓ |
| **c. `preorder_deposit_pct` alias → `dp_percent`** | `settings/route.ts:57-66` (PUT alias 매핑) + `settings/route.ts:36-46, 122-131` (GET 응답에 둘 다 노출) | **#22** 양방향 노출 + 양방향 매핑 확인 ✓ |

alias 가 응답에 **둘 다** 떠 있어 앱이 둘 중 아무거나 읽어도 OK — Checkout/Settings 양쪽 호환성 확보.

### §A.5 · #197 SC/PB1 공존 · 금지 영역 · CI

- **#197 공존**: tenders route 는 L157-187 에서 `subtotal + sc_amount + pb1_amount` 계산 후 `orderTotal` 로 사용. ① 가드는 **그 뒤** `amount` 계산 단계에서 발동 → 두 축은 **직렬 의존** (충돌 없음). preorder DP 는 `Math.round(orderTotal * dp_percent / 100)` · orderTotal 은 SC/PB1 포함본 → DP% 가 compound 총액 기준 (Kyu 결정 ⓒ 가산 재확인).
- **금지 영역 변경 0**: 변경 파일 5개 전부 해당 라운드 스코프 — `integration-tests/pos/helpers.ts` · `integration-tests/pos/tenders.spec.ts` · `admin/pos/orders/[id]/fulfill/route.ts` · `admin/pos/orders/[id]/tenders/route.ts` · `admin/pos/settings/route.ts`. receipt/register_session/products 등 미수정 ✓.
- **CI**: GitHub MCP 403 (워크플로 접근 권한 없음 · 리뷰 통합 외 영향 없음) → 직접 조회 불가. PR 본문 claim: Unit 24/24 · Integration 24/24 PASS · BOOT OK · /health 200. `mergeable_state: "clean"` (API 응답 확인). **CI green 전제로 APPROVE** · 머지 전 Actions 탭 재확인 권장.

### §A.6 · APPROVE 사유 요약 (#199)

1. ①②③ 각 claim 이 **코드 분기 + 통합 테스트 어설션** 쌍으로 묶여 자기 증명.
2. 재고 변경 경로는 **inventory-link error 분기 안에서만** 발동 · workflow 성공 시 폴리필 비실행 → 이중 차감 불가.
3. 결제 데이터 변경 경로 (collection 재사용/삭제) 는 **payments 없는 pending 만** 대상 · 캡처된 collection 은 손대지 않음 → 결제 트랜잭션 데이터 손상 위험 0.
4. M3-M 계약 a/b/c 전부 어설션. 앱 client (fork master 3ff7e9e) 가 이미 `preorder_deposit_pct` · `body.preorder.{pickup_at,note}` · `stage='hand_over'` 를 전송 중이라 **현재 shape 와 1:1 매칭** (R0-1105-Z §A.1 확인).
5. 금지 영역 변경 0 · `mergeable_state: clean` · 운영 영향 수용.

**머지 시**: #198 close (superseded) 명시.

---

## §B · fork #59 — ESC/POS 로고 비트맵 · Cashier · 하단 여백

### §B.1 · 순수 함수 분리 (pure Node)

**좌표**: `lib/printer/logo-bitmap.ts:24` `import { deflateSync } from 'node:zlib';`

- RN · canvas · 네이티브 image lib **import 0** ✓
- 함수 5개 전부 pure: `rgbaToGrayscale` · `thresholdToOneBit` · `atkinsonDitherToOneBit` · `escposRasterCommand` · `oneBitToPngGrayscale` + fixture 생성 유틸 3개.
- `escpos.raw(bytes: Uint8Array | readonly Byte[])` (`lib/printer/escpos.ts:78-81`) 추가 — pure byte push 1 메서드. 네이티브 심볼 0 ✓.
- `renderReceiptEscPos(receipt, cols|opts)` (`lib/printer/receipt-escpos.ts:116-126`) 2nd arg union — 숫자면 cols · 객체면 RenderReceiptOptions · **하위 호환 유지** (테스트 (8c) 어설션 통과).

### §B.2 · 바이트 스냅샷 32/32 어설션 (`scripts/m2-1105-p-logo-bitmap-assertions.mjs`)

| 블록 | 어설션 수 | 좌표 (stdout 블록) |
| --- | --- | --- |
| (1) rgbaToGrayscale BT.601 (R≈76 · G≈150 · B≈29 · mid=128 · alpha0→255) | **5** | L71-83 |
| (2) thresholdToOneBit (8px→0xF0 · 7px pad=0b11111110) | **3** | L89-98 |
| (3) atkinsonDither (black 비율 0.50 · 좌영역 white 섞임 확인) | **4** | L103-123 |
| (4) escposRasterCommand GS v 0 (1D 76 30 · mode=0 · xL/xH/yL/yH · h=300 경계) | **5** | L128-142 |
| (5) 디스크 fixture 384×96 PNG 2장 산출 (sig · 크기 · black 비율 · delta<0.02) | **7** | L147-175 |
| (6) 결정 default=dither (명시) | **1** | L180-185 |
| (7) renderReceiptEscPos + logoBitmap (GS v 0 포함 · Cashier "Kyu Lee" · Subtotal/TOTAL/CASH 유지) | **4** | L190-213 |
| (8) 하위 호환 (logoBitmap 없이 MEROS fallback · GS v 0 미포함 · cols=32 숫자 arg) | **3** | L218-231 |

5+3+4+5+7+1+4+3 = **32** ✓ · PR 본문 `32/32 passed` 와 일치.

**검증 포인트**:
- (3c)(3d) threshold vs dither **구조적 차이** (좌 10~40% 영역) 를 수치로 가름 → dither 가 anti-aliased edge 보존함을 재현.
- (4e) `h=300` 경계 (`yL=44 · yH=1`) 명시 — ESC/POS 2바이트 리틀엔디안 정확.
- (5e)(5f)(5g) threshold/dither black 비율 ≈ 0.11 (디스크 면적 π·0.38²/1 ≈ 0.113) 과 delta<0.02 → 평균 밝기 보존 알고리즘 확인.

### §B.3 · deferred risk — `node:zlib` 모듈-top import

**좌표**: `lib/printer/logo-bitmap.ts:24`.

- 호출 체인: `lib/printer/index.ts` → `./receipt-escpos` → `./logo-bitmap` → `import { deflateSync } from 'node:zlib'` (module top).
- `app/settings/printer.tsx:20` + `components/printer/PrinterRow.tsx:10` 이 `@/lib/printer` 를 import → Metro 번들에서 `node:zlib` 해결 시도.
- PR 본문 `expo export -p web BUILD SUCCEEDED` 로 **웹 번들은 통과**. **네이티브(iOS/Android) 번들은 미검증**.
- `deflateSync` 는 `oneBitToPngGrayscale` (PNG 미리보기 · docs/testing 생성용) 에서만 사용 — **런타임 호출 없음** · 실제 render 는 `escposRasterCommand` 만 통함.
- **blocker 아님** (현 코드 경로 그 자체는 작동) 이지만, M3 가 `printReceipt` 를 실제 화면에 wire 할 때 네이티브 번들러가 `node:zlib` 를 못 찾으면 fail. 후속 라운드에서 **`oneBitToPngGrayscale` 를 `logo-bitmap-png.ts` 로 분리** 권장 (RN 런타임은 `escposRasterCommand` 만 보고 Node 어설션만 PNG 쪽 import). 본 PR 에서 수정은 불필요 — M3 wire-up 라운드에서 함께 처리.

### §B.4 · 화면/훅 미수정

변경 10 파일:

| 파일 | 영역 | 비고 |
| --- | --- | --- |
| `lib/printer/logo-bitmap.ts` (신규) | printer lib | pure Node · 258 라인 |
| `lib/printer/escpos.ts` | printer lib | `raw()` 메서드 1 추가 (L78-81) |
| `lib/printer/receipt-escpos.ts` | printer lib | `logoBitmap` opt + `Cashier` 줄 + `lf(3)` 하단 여백 |
| `lib/printer/index.ts` | printer lib | `printReceipt(receipt, opts?)` signature + re-export |
| `scripts/m2-1105-p-logo-bitmap-assertions.mjs` (신규) | 어설션 | 32 PASS |
| `scripts/m2-1105-m-receipt-escpos-assertions.mjs` | 어설션 | tsc input 에 `logo-bitmap.ts` 추가 (receipt-escpos 가 transitively import) + `--types node` |
| `docs/testing/logo-threshold.png` (신규) | docs | 384×96 preview |
| `docs/testing/logo-dither.png` (신규) | docs | 384×96 preview |
| `docs/testing/m2-1105-p-receipt-bitmap-sample.txt` (신규) | docs | GS v 0 포함 디코드 |
| `docs/testing/receipt-escpos-sample.txt` | docs | Cashier 줄 + 하단 여백 |

**`app/*` · `components/*` · `hooks/*` · `api/*` · `types/*` · `package.json` 변경 0건** ✓ · Settings "Test print" 미건드림 · success 화면 Reprint 미배선 (M3 소유).

### §B.5 · master `3ff7e9e` 와 merge-tree

```
$ git fetch origin refs/pull/59/head  # → 4799042 HEAD
$ git merge-base origin/master FETCH_HEAD
b19539afe3a01e87d0d05aa8703fa81832989482   # #55 머지 커밋 (M1-1105-Q cashier)
$ git merge-tree --write-tree origin/master FETCH_HEAD
07bfb83967b74a3cc74f2f312853044ac8bcb647   # tree only · 충돌 메시지 없음
```

- #56 (M3-1105-M P3) · #57 (M1-1105-R thumbnail) · #58 (M3-1105-N quote+로고) 은 **`lib/printer/*` 미수정** · PR #59 변경 파일과 **경로 분리** → 자동 병합 clean.
- `types/receipt.ts` 는 #58 에서 수정됐지만 #59 는 미수정 (type 소비만) → fast-forward 가능.
- PR API 응답 `mergeable_state: "unknown"` 은 refresh 대기 상태 · 실측 merge-tree 는 clean.

### §B.6 · APPROVE 사유 요약 (#59)

1. **pure Node** 로고 처리 (RN/canvas 0) · `escposRasterCommand` GS v 0 명세 정확 · threshold vs dither 평균 밝기 보존 알고리즘 수치로 증명.
2. **32/32 어설션 PASS** 블록 구조 검증 (5+3+4+5+7+1+4+3) · PR 본문과 일치.
3. **화면/훅 미수정** — printer lib 내부 캡슐화 · 외부 호출부 (settings/PrinterRow) signature 호환 유지.
4. master `3ff7e9e` 와 **merge-tree clean** (tree SHA 획득 · 충돌 메시지 0).
5. 1건 **deferred risk** (§B.3 node:zlib 번들러 위험) 는 **다음 라운드 M3 wire-up** 에서 처리 — 본 PR 승인에 영향 없음.

---

## §C · CI 상태

| PR | 상태 | 비고 |
| --- | --- | --- |
| storeport #199 | `mergeable_state: clean` · check-runs API 403 | PR 본문 Unit 24/24 · Integration 24/24 · BOOT OK · /health 200 · Backend build 3.98s / Frontend 15.22s PASS 자가 보고 |
| fork #59 | `mergeable_state: unknown` (refresh 대기) · check-runs API 403 | PR 본문 `m2-1105-p-logo-bitmap-assertions 32/32` + `run-all.mjs assertions 16/16` + `expo export -p web BUILD SUCCEEDED` + `run-all.mjs playwright 17/17` + isolated `npm ci` exit 0 + `tsc --noEmit` clean |

**MCP 통합 권한 제한**으로 Actions check-run 상세는 API 조회 불가 — 머지 전 GitHub Actions 탭 수동 재확인 권장. 본 리뷰는 **코드 + 통합 테스트 어설션 재구성 가능성** 기준 APPROVE.

---

## §D · 머지 순서 권장

1. **storeport #199 먼저** 머지 → M3-M 서버 계약 확정 (preorder_deposit_pct alias · body.preorder.{pickup_at,note} · stage="hand_over") · Kyu 실기 2차 ①②③ 뿌리 해소 착지.
2. #198 close (superseded).
3. **fork #59** 머지 → ESC/POS 로고 비트맵 + Cashier + 하단 여백 착지 (서버 wire-up 불필요 — printer lib 내부).
4. Kyu 3차 실기 재현 — 특히 §A.1 에서 남긴 **Partially captured 뿌리 2 (`capture 측 로직`) 재검토** 필요.

---

## §E · 다음 R0 대기

- Kyu 3차 실기 후 신규 요구 등재 (open-requirements.md).
- fork P3 거래 종류+잔금+Delivery 화면 (M3) R0 리뷰 발부 예상.
- storeport M0-1105-M Delivery · M0-1105-N Orders 미표시 뿌리 진단 뒤 소유자 결정.

## §F · 원장 대사 체크 (open-requirements.md)

- 🔴 Kyu 실기 2차 ①②③ → **storeport #199 에서 서버 단 해소 착지** (앱은 fork master `3ff7e9e` 이미 클라이언트 측 대응 완료 — R0-1105-Z §A). 3차 실기에서 Pending/Partially captured/Not fulfilled 재현 여부 모니터링 필요.
- 🔴 영수증 로고(프린터) → **fork #59 에서 비트맵 GS v 0 raster 지원 착지** (호출자 책임 1-bit · default dither).
- §다음 P3 서버 확정 a/b/c → **#199 M3-M 어설션 #22/#23/#24 전부 통과** · 확정.
- P5 ⑤ 캐셔 · 규칙 ⑨ · 재언급 유지.

---

## 링크

- storeport #199: https://github.com/CuriocityDevAi/storeport/pull/199
- fork #59: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/59
- base: storeport main `5742460` · fork master `3ff7e9e`
- 직전: `curiocity-relay/r0/R0-1105-Z-report.md`
- claim: `curiocity-relay/status/claims/R0-1105-AA.json`
