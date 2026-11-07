---
name: R0-1105-AE · 허브-1107-AE storeport #200 리뷰 (M0-1105-T · reservation 전수 소진 + fulfill 교통정리)
description: storeport PR#200 (feat/m0-1105-t-reservations @ 4f9e9a3 · base main @ 4f3cd43) · Kyu 실기 5차 뿌리(reservation 미삭제 · fulfillments 0 · In stock 불변) 수렴 · fulfill fallback 에 reservation 전수 삭제 + order↔fulfillment link · body 계약 · delivery awaiting_dispatch→dispatched · maintenance 라우트 · 통합 30/30 · CHANGES (경미) — hand_over 재누름 멱등 가드 부재
author: R0
dated: 2026-11-07
---

# R0-1105-AE · storeport#200 리뷰 (M0-1105-T)

**스코프**: storeport PR#200 (`feat/m0-1105-t-reservations` HEAD `4f9e9a3` · base `main @ 4f3cd43` = #199 머지 직후 · M0-1105-R/S).
**원장 대사**: `ledger/open-requirements.md` 🔴 Kyu 실기 5차(재고 예약만 · Not fulfilled · Completed 없음) · Kyu 결정 전달 교통정리(Takeaway 즉시 · Pre-order/Delivery 는 Fulfill 시트 시점 · pickup/delivery 정보) · 규칙 ⑨ · `m0/M0-1105-T-report.md`.
**claim**: `status/claims/R0-1105-AE.json` (runner-v2 started 기록).
**금지**: 코드 수정 · 커밋.

## 판정

| PR | head | 판정 |
| --- | --- | --- |
| **storeport #200** (M0-1105-T · reservation 전수 소진 + fulfill 교통정리 + delivery + maintenance) | `4f9e9a3` | **CHANGES (경미)** — §A/§B 검증 통과 · §C.1 **hand_over 재누름 멱등 가드 부재** 1건 수정 또는 다음 라운드 확약 필요 · 그 외 §C 는 follow-up |

**이유 요약**: §0 대사표 · fulfill fallback 수렴(reservation 전수 삭제 + registerFulfillment + Link) · delivery awaiting_dispatch→dispatched · dp_paid 400 · maintenance dry_run · 통합 30/30 · CI green · 금지 영역 0 — 전부 **정합**. 다만 Kyu 가 리뷰 질문 §2 에서 명시한 **"기존 주문 #35 #36 에 Hand over 를 다시 누르면 안전한지"** 에 대해 route 진입부에 `fulfillment_stage === 'hand_over'` 가드가 없어, 재누름 시 production 경로에서는 **중복 polyfill fulfillment row 1건 + metadata 타임스탬프 덮어쓰기 + completeOrderWorkflow 재호출(non-fatal)** 이 발생(§C.1). 재고(stocked) 이중 차감은 production 에서는 발생 않음(metadata.inventory_item_id 힌트 부재로 (a) skip) — 그러나 테스트 환경(힌트 존재)에서는 이중 감소. 운영 영향 큰 경로는 "평소보다 엄격" 이 요구사항 꼬리 — 플래그.

---

## §A · 실측 검증

파일 범위 (`git diff HEAD~1 HEAD --name-only`):
```
apps/commerce-core/integration-tests/pos/helpers.ts
apps/commerce-core/integration-tests/pos/tenders.spec.ts
apps/commerce-core/src/api/admin/pos/maintenance/release-stale-reservations/route.ts   (신규)
apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts
apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts
docs/feature-map.yaml
```
= **6 파일** · +789 / −77. medusa-config / providers / #197 세금 파일 전부 **미변경** ✓. feature-map 1항목 확장 + maintenance glob 추가(expected).

### §A.1 · §0 대사표의 운영 재현 통합 커버(요구사항 §1)

**fulfill/route.ts:8-40** — `node_modules/@medusajs/core-flows/dist/...` 파일:라인을 그대로 인용 (reserveInventoryStep · updateReservationsStep · deleteReservationsStep · shipping_option undefined throw) · 끊어지는 지점(Reserved +2 누적 8 · fulfillments 0 · In stock 15 불변)을 재현 조건으로 설명 ✓.

**test #25** (`tenders.spec.ts:1138-1198`):
- `seedReservationForLineItem` (helpers.ts:170-190) 로 **reservation 2** 수동 심기 → `reserved_quantity === 2` 사전 확인(:1166).
- tender → fulfill → 재조회:
  - `levelsAfter[0].reserved_quantity === 0` (:1190) · `stocked_quantity === 13` (:1191) = 15−2 정확히 1회 차감.
  - `listReservationItems({id:[reservationId]})` = **빈 배열** (:1197) — 레코드 소멸.

통합 테스트 `createTestOrder` 가 raw order 를 만드므로 createOrderFulfillmentWorkflow 가 `isInventoryLinkError` 로 throw → **fallback 경로를 테스트가 통과한다는 사실** 이 "운영 재현" 의미. 리포트 §0 설명과 코드 §0 주석과 테스트가 일치 ✓.

### §A.2 · hand_over 완결 경로(요구사항 §2)

| 조건 | file:line | 효과 |
| --- | --- | --- |
| fulfill entry body 계약 (method/courier/driver/contact/tracking_ref/note/location_id) | `fulfill/route.ts:193-221` | 자유 필드 + `method∈{pickup,delivery}` 검증 (아니면 400 line 209-215) |
| **preorder dp_paid + hand_over → 400** | `fulfill/route.ts:226-236` | `preorder hand_over requires paid_full · current preorder.stage=...` · test #27(:1255-1301) assert |
| workflow 통로 (성공 경로) | `fulfill/route.ts:267-288` | `createOrderFulfillmentWorkflow` 가 adjust + reservation 소진을 자체 수행 · 그 뒤 `safetyNet = releaseReservationsForLineItems(...)` 호출(:284-287) — **빈 리스트면 0** · `deleteReservationItems` 는 reserved_quantity 만 되돌리므로 stocked 와 overlap 없음 ✓ |
| fallback (운영 재현 경로) `isInventoryLinkError` | `fulfill/route.ts:289-408` | (a) `inv_id = metadata.inventory_item_id` 힌트가 있을 때만 `adjustInventory(-qty)` (:306-322) — **stocked −qty 1회** · (b) `releaseReservationsForLineItems` (:331-340) — reserved 만 복원 · (c) `fulfillmentModule.createFulfillment(...)` + `registerFulfillmentOnOrder` (`link.create([ORDER↔FULFILLMENT])` + `orderModule.registerFulfillment`) 로 `/admin/orders/:id/fulfillments` 노출 |
| reservations_released 카운팅 | `fulfill/route.ts:249, 288, 335` | 안전망(workflow 성공 뒤)과 fallback 어느 쪽이든 1회만 반영 — 둘 다 거치는 분기 없음(try/catch 상호배타) ✓ |
| metadata 전이 (hand_over 전용) | `fulfill/route.ts:435-456` | `fulfillment.{method,courier,driver,contact,tracking_ref,note,handed_over_at}` · delivery 면 `delivery.{stage:'dispatched',dispatched_at}` |
| `completeOrderWorkflow` | `fulfill/route.ts:512-529` | `eligible = order_type !== 'preorder' \|\| preorderMd?.stage === 'paid_full'` · hand_over 전용 · preorder dp_paid 완결 제외 ✓ |
| In-store pickup 배송옵션 / fulfillment_set seed | **없음** | 본 라운드는 polyfill fulfillment 행만 생성(`shipping_option_id: null` · `provider_id: 'manual_manual'`) — fulfillment_set/service_zone/shipping_option 운영 DB 신규 생성 **0** ✓. 리포트 §10 에서 `ensurePosFulfillmentInfra` 는 명시적으로 **다음 라운드 유예** 확인. |

**"stocked −qty 정확히 1회" 교차 검증**:
- Path 1(workflow 성공): workflow 자체가 `adjustInventoryLevelsStep` 1회 수행 · safetyNet 은 reserved 만 복원(stocked 무관) → 1회.
- Path 2(fallback): `adjustInventory` 1회(힌트 있을 때) · `releaseReservationsForLineItems` 는 stocked 무관 → 1회.
- Path 1 → Path 2 중첩 불가(try/catch 상호배타) ✓.
- 다만 workflow 가 inventory step 실행 뒤 다른 step 에서 throw 하면 saga 보상이 안 돌고 fallback 이 추가 감소할 수 있음 — 원본 core-flows 코드(create-fulfillment.js:283-324) 는 shipping_option 조회가 adjust 보다 **앞** 에 오므로 운영 재현 경로에서는 이 위험 없음. 리포트 §0 주석과 일치 ✓.

### §A.3 · release-stale-reservations(요구사항 §3)

**route**: `apps/commerce-core/src/api/admin/pos/maintenance/release-stale-reservations/route.ts` (신규 · 184 라인).

| 요구사항 | file:line | 확인 |
| --- | --- | --- |
| dry_run 기본 | `:44` `const dry_run = body.dry_run == null ? true : Boolean(body.dry_run)` | ✓ test #28(:1331-1343) `dry_run=true` 미명시에도 `data.dry_run === true · released === 0` |
| 완결(status ∈ {completed,canceled}) / hand_over 주문의 reservation 만 삭제 | `:134-154` `stale = info==null \|\| status==='completed' \|\| status==='canceled' \|\| fulfillment_stage==='hand_over'` | ✓ |
| 진행 중 주문(dp_paid · awaiting_dispatch) 은 건드리지 않음 | 위 stale 조건의 **보조정의**: `status==='pending'` 이고 `fulfillment_stage !== 'hand_over'` 이면 비-stale → skip | ✓ dp_paid(status=pending · fulfillment_stage 미설정) 비-stale · awaiting_dispatch(status=pending · fulfillment_stage 미설정) 비-stale |
| 응답 표(reservation_id, line_item_id, inventory_item_id, location_id, quantity, order_id, order_status, fulfillment_stage) | `:144-153` + 리포트 §3.2 | ✓ |
| Kyu curl 토큰 외 비밀 없음 | 리포트 §5 — `Authorization: Bearer $ADMIN_TOKEN` 1종 · 다른 비밀 키 없음 | ✓ |
| 실 삭제는 `dry_run=false` 일 때만 | `:158-174` | ✓ test #28(:1346-1359) `dry_run=false` 시 `released >= 1` · 레코드 소멸 |
| `location_id` / `before` 필터 | `:44-79` + inventoryModule listArgs | ✓ · `before` 파싱 실패 시 400(:69-73) |

**세부 주의** (§C.3 에 follow-up): `info == null`(역조회 실패) 를 stale 로 간주하는 분기(:139). 운영 중 query.graph 간헐적 실패 시 활성 reservation 이 "고아" 로 분류될 위험. 다만 maintenance 는 `dry_run=true` 선행 + rows 수동 확인이 전제이므로 1회성 도구로 수용 가능. Kyu 는 location_id 필터로 좁혀 쓰는 것이 안전.

### §A.4 · 전달 계약(요구사항 §4)

| 요구사항 | file:line | 확인 |
| --- | --- | --- |
| fulfill body `method/courier/driver/contact/tracking_ref/note → metadata.fulfillment` | `fulfill/route.ts:435-447` | `fulfillment = {method,courier,driver,contact,tracking_ref,note,handed_over_at}` + 미제공 필드는 **null** (test #29:1395 `courier === null`) · 기존 `metadata.fulfillment` 와 머지 ✓ |
| delivery 결제 시 awaiting_dispatch | `tenders/route.ts:283-297` | `effectiveOrderType === 'delivery'` 조건에서 `delivery.stage='awaiting_dispatch' · awaiting_dispatch_at` 세팅 · 기존 값 보존(`existingDelivery.awaiting_dispatch_at ?? ...`) → 멱등 ✓ |
| delivery hand_over → dispatched | `fulfill/route.ts:448-456` | hand_over + `deliveryHandOver` 분기 · `delivery.stage='dispatched' · dispatched_at` (기존 delivery 머지) ✓ test #26(:1200-1253) |
| dp_paid fulfill 400 | `fulfill/route.ts:226-236` | 위 §A.2 참조 ✓ test #27 |
| fixture 3종 (pickup / delivery / dp_paid) | 리포트 §4.1-§4.3 | ✓ |
| 응답 shape 표 | 리포트 §3.1 + 코드 `fulfill/route.ts:531-542` (`ok · order_id · order_type · stage · method · fulfillment_id · inventory_decremented · reservations_released · completed · inventory_warning?`) | ✓ 코드-리포트 일치 |
| #197 세금 파일 미수정 | `apps/commerce-core/src/api/admin/pos/settings/**`, `src/modules/receipt/**`, `src/api/admin/pos/orders/[id]/quote/**`, `preorder-dp-math.unit.spec.ts` | **전부 미변경** ✓ (`git diff HEAD~1 HEAD --name-only` 6개 파일에 포함 안 됨) |
| 금지 영역 0 | `medusa-config.ts` · `providers/**` · `apps/wing/**` · `apps/anchor/**` · `apps/care-agent/**` 변경 0 | ✓ |
| CI | `pos-integration PASS 2m22s` · `check PASS` · `markers-and-forbidden PASS` · `changes-filter PASS` (via `gh pr checks 200`) | ✓ |
| 통합 30/30 | 리포트 §7 + 실행 로그 "Tests: 30 passed, 30 total · Time: 30.474 s" | ✓ |

---

## §B · 코드-리포트 일치(샘플)

- 리포트 §2.1 "fulfill route" — 주장한 `metadata.inventory_item_id` 힌트 경로(존재할 때만 adjust) = `fulfill/route.ts:306-322` ✓.
- 리포트 §2.1 "workflow 성공 경로 뒤 안전망: reservation 이 남으면 전수 삭제(멱등 · 보통 0건)" = `fulfill/route.ts:282-288` · 안전망은 try 블록 **내부** (workflow 성공 이후) ✓.
- 리포트 §2.1 "delivery hand_over 는 재고 차감 경로" — 조건: `order_type==='delivery' && stage==='hand_over'` = `fulfill/route.ts:243` · workflow 분기 조건에 포함 = `:254 (takeaway || preorderPickup || deliveryHandOver)` ✓.
- 리포트 §2.2 "tenders.ts:262-266 effectiveOrderType === 'delivery' 추가" = 실제 **diff 라인:265** ✓.
- 리포트 §3.1 응답 shape — 코드 `fulfill/route.ts:531-542` 와 **키 10 전부 일치** ✓.

---

## §C · 수정 / Follow-up

### §C.1 · **(수정 요청)** hand_over 재누름 멱등 가드 부재

**좌표**: `fulfill/route.ts:150-245` (route 진입부 · body 검증 뒤 workflow 분기 전).

**현상**: 이미 `fulfillment_stage === 'hand_over'` 인 주문(= status=`completed` + delivery.stage=`dispatched`)에 POST /fulfill 을 재호출하면 아래 경로가 다시 돈다.

- **production**(metadata.inventory_item_id 힌트 **없음**):
  1. `createOrderFulfillmentWorkflow` → 재차 throw(order 가 이미 completed 이거나 shipping_option 부재) → `isInventoryLinkError` 매치.
  2. (a) 힌트 없음 → adjustInventory **skip** ✓(stocked 보호).
  3. (b) `releaseReservationsForLineItems` → 1회차에서 이미 소진 → `released = 0` ✓.
  4. (c) **polyfill fulfillment row 1건 추가 생성** · `registerFulfillmentOnOrder` 로 link 중복 시도(soft fail 로그 — `:131-137`).
  5. metadata `handed_over_at` 덮어쓰기 + `completeOrderWorkflow` 재호출(non-fatal 로그 — `:522-527`).
- **integration**(힌트 **있음**): 위 (a) 가 돌아 **stocked 재감소**(−qty 1회 추가). 테스트는 재호출 커버 **0건** (`grep "fulfill.*hand_over" tenders.spec.ts` 상으로 재호출 assert 없음).

**영향**:
- production: 재고는 보호되지만 `/admin/orders/:id/fulfillments` 에 duplicate row 가 쌓임 · `completeOrderWorkflow` 재호출로 로그 soft-noise · `metadata.fulfillment.handed_over_at` / `delivery.dispatched_at` 이 재누름 시각으로 바뀜(감사 로그 혼선).
- integration: stocked 가 더 감소(실 운영 수치와 괴리).

**Kyu 의 리뷰 질문**("기존 주문 #35 #36 에 Hand over 를 다시 누르면 안전한지") 에 대한 정답이 **"재고는 안전 · 그 외 중복"** 이므로 평소보다 엄격한 경로로 간주. 2가지 중 하나:

**옵션 A** (수정): `fulfill/route.ts:191` 부근, `stage = ... as FulfillStage` 직후, 다음 가드 추가 —
```ts
const existingMd = ((order.metadata as object) ?? {}) as Record<string, unknown>;
if (stage === "hand_over" && existingMd.fulfillment_stage === "hand_over") {
  // 재누름 — 멱등 응답(원 상태 반환 · workflow / fallback 비실행).
  const existingFul = (existingMd.fulfillment as any) ?? {};
  return void res.status(200).json({
    ok: true,
    order_id,
    order_type,
    stage: "hand_over",
    method: existingFul.method ?? null,
    fulfillment_id: null,
    inventory_decremented: false,
    reservations_released: 0,
    completed: true,
    idempotent: true,
  });
}
```
+ 테스트 1건 (재호출 시 `data.idempotent === true · fulfillments.length` 변화 0 · stocked 변화 0).

**옵션 B** (다음 라운드 유예 확약): `m0/M0-1105-U` 또는 `M0-1105-V` 티켓으로 **"POS fulfill 멱등 가드 + 테스트 2건"** 명시 등재 + Kyu 가 재실기에서 Hand over 를 두 번 누르는 경우 발생하는 duplicate fulfillment row 와 timestamp 덮어쓰기를 주지. 운영 reservation 뿌리는 본 PR 이 제거하므로 머지 자체는 진행 가능.

### §C.2 · (follow-up · 참고용) safetyNet 과 fallback 의 try/catch 구조 상호배타성

`fulfill/route.ts:267-416` — try 블록 내 safetyNet(:284-288) 과 catch 블록 내 release(:331-335) 가 명백히 상호배타. 이중 호출 없음 확인. 다만 future refactor 시 safetyNet 을 catch 뒤로 끌어내리면 overlap 가능 — 코드 주석으로 "반드시 try 내부" 를 명시해 두는 편이 안전(현재 `// workflow 성공 경로는 reservation 을 자체 소진. 혹시 남으면 아래 fallback 아닌 "안전망" 으로 한 번 더 전수 삭제(멱등).` 가 이미 있음 — OK).

### §C.3 · (follow-up) maintenance `info == null` 분기 가드

`release-stale-reservations/route.ts:139` — `info == null`(역조회 실패 → 고아 reservation) 도 stale. 운영 query 간헐 실패(네트워크 · pool 포화) 시 **활성 주문의 reservation 이 삭제 후보** 에 노출될 가능성. 현재 dry_run 기본 + rows 수동 확인으로 완화되지만, 다음 라운드에서 `strict` 옵션(= `info == null` 은 skip) 또는 재시도 1회를 추가하는 것을 권장. 본 PR 블로커 아님.

### §C.4 · (follow-up) 테스트 #25 의 "운영 재현" 지문 vs 실제 경로

테스트 설명(:1138) 은 "line_item reservation 전수 삭제 · reserved_quantity 복원" 이고 어설션은 fallback 결과를 간접 검증 — OK. 다만 "fallback 경로를 탔다는 증거"(`ful.data.inventory_warning?` 를 명시 어설트하거나 workflow spy) 가 없어, 향후 workflow 성공 경로로 전환될 때(= `ensurePosFulfillmentInfra` seed 라운드) 이 테스트가 fallback 미발동으로도 PASS 될 수 있다. 라운드 M0-1105-U 에서 `inventory_warning` 유무를 토글 어설션으로 넣는 방안 권장.

---

## §D · 결론

**판정**: **CHANGES (경미)** — §C.1 를 수정 커밋 1회 또는 다음 라운드 티켓 등재로 해소 뒤 머지.

- §0 ~ §4 요구사항 모두 **정합**(§A 표 전건 OK · CI green · 통합 30/30 · 금지 0).
- 운영 reservation 뿌리(Kyu 실기 5차) 는 본 PR 이 제거 ✓. Kyu 가 머지 후 `release-stale-reservations` curl 로 11-07 잔존분을 정리하면 "Reserved +2 누적 8" 가 복원 · In stock 정상 수치로.
- §C.1 은 "운영 영향 큼" 요구사항 꼬리에 해당 — 수정 권장. 옵션 B(다음 라운드 확약)도 수용 가능.

**다음 라운드 후보**(Kyu 결정 대기):
- M0-1105-U: POS fulfill 멱등 가드 + 테스트 (옵션 A 미채택 시).
- M0-1105-V: `ensurePosFulfillmentInfra` seed (shipping_option "In-store pickup" idempotent) — workflow 성공 경로 자체를 운영 DB 에.
