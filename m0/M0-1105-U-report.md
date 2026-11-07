---
round: M0-1105-U
pr: storeport#200 (같은 PR 재사용 · R0-AE §C.1 반영 · HEAD 7100653)
base: storeport@feat/m0-1105-t-reservations · 4f9e9a3 (M0-1105-T)
outcome: fulfill hand_over 재누름 멱등 가드 (R0-AE §C.1) + Kyu 7차 500 가드 통합 테스트 (pb1_pct=10 + logo_url 설정 뒤 POS 주문 상세·quote·목록 3경로 200) · 통합 32/32 · CI green
kyu_checks: 2 (① Admin 에서 설정 PB1=10 + logo_url 유지 상태로 신규 takeaway 주문 → 결제 → 영수증/주문 상세 화면 200 OK · ② 동일 주문에 Hand over 를 2회 눌러도 재고 변화 0 + fulfillments 증가 0 + 응답 `already_fulfilled:true`)
---

# M0-1105-U · fulfill hand_over 멱등 가드 + Kyu 7차 500 가드 (R0-AE §C.1 반영)

**일자**: 2026-11-07 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts · apps/commerce-core/integration-tests/pos/tenders.spec.ts · docs/feature-map.yaml`
**base**: `storeport@feat/m0-1105-t-reservations` HEAD `4f9e9a3` (M0-1105-T) → 커밋 `c49c87e` 로 이어붙임 (같은 PR #200).

---

## §A · R0-1105-AE 리뷰 CHANGES 반영

### §A.1 · §C.1 — fulfill hand_over 재누름 멱등 가드 **(채택 · 옵션 A)**

**좌표**: `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts:168, 193-230`

**변경 1 — query.graph 에 fulfillments.id 추가** (`:168`):
```ts
fields: ["id", "metadata", "items.*", "fulfillments.id"],  // was: 끝 3 필드
```
이유: 재누름 감지에 `order.fulfillments` 존재 여부가 필요. production 에서는 `metadata.fulfillment.handed_over_at` 이 세팅되지만 중간 실패로 metadata 가 빠졌을 때 fulfillment 행이라도 감지하려는 이중 가드.

**변경 2 — 멱등 가드 블록 추가** (`:193-230`, order 조회 뒤 + body 검증 전):
- 조건: `stage === 'hand_over'` **AND** (
  - (a) `metadata.fulfillment.handed_over_at` 이 truthy · 또는
  - (b) `order.fulfillments.length > 0`
  )
- 효과: **workflow · fallback · metadata 업데이트 · completeOrderWorkflow 모두 skip**.
- 응답: `200 · { ok, order_id, order_type, stage: "hand_over", method, fulfillment_id, inventory_decremented: false, reservations_released: 0, completed: true, already_fulfilled: true }`.

### §A.2 · §C.3 — maintenance `info == null` 분기 가드 (follow-up)

채택 유보 (본 라운드 blocker 아님 · 리뷰 지적대로 dry_run 기본 + rows 수동 확인으로 완화됨). 다음 라운드(M0-1105-V 또는 1106 시리즈) 에서 `strict` 옵션 또는 query.graph 재시도 1회로 처리.

### §A.3 · §C.4 — #25 "운영 재현" 지문 vs 실제 경로 (follow-up)

채택 유보. `inventory_warning` 유무 토글 어설션은 `ensurePosFulfillmentInfra` seed 라운드(shipping_option 운영 DB 생성 시) 에서 workflow 성공/fallback 경로를 명시적으로 토글하는 테스트와 함께 추가.

---

## §B · Kyu 실기 7차 500 진단 (요구 §2)

### §B.1 · 재현 조건

- 서버: `storeport@main` `4f3cd43` (M0-1105-R/S 머지 직후 · PR #200 **머지 전** 상태)
- POS settings: `pb1_pct=10 · logo_url` (https URL) 설정
- 주문 #44 (신규 takeaway) 결제 직후 영수증/주문 상세 화면 진입 → "Server Error — An unexpected error occurred on the server" 띠.
- 부수 증상: 앱 Orders 탭에 신규 주문 미표시 (Hand over 누르기 전).

### §B.2 · 3 suspect 라우트 코드 trace (실측)

| # | 라우트 | pos_settings 접근 | 500 가능성 (코드 정적 분석) | file:line |
|---|--------|-------------------|---------------------------|-----------|
| 1 | `GET /admin/pos/orders/:id` | **없음** · 오로지 `order.metadata.register_session_id` 로 register_session 만 재조회 (try/catch 로 non-fatal) | **낮음** — pb1/logo 와 무관한 경로 | `apps/commerce-core/src/api/admin/pos/orders/[id]/route.ts:50-102` |
| 2 | `GET /admin/pos/orders/:id/quote` | `getForLocation(stock_location_id)` → 기본 scope="store" → `getOrCreateStoreSettings()` · 숫자 필드 `Number(s.pb1_pct ?? 0)` · 로고 `(s.logo_url as string) ?? null` | **낮음** — 숫자/문자열 전부 `??` 가드 통과 · 설정값이 0/null 이든 http(s) URL 이든 안전 | `apps/commerce-core/src/api/admin/pos/orders/[id]/quote/route.ts:84-120` |
| 3 | `GET /admin/orders?fields=…` | **없음** · Medusa 내장 라우트 (pos_settings 모듈 접근 0) | **낮음** — pb1/logo 와 무관 · 다만 `is_draft_order=false` 하드필터로 변환 전 주문은 숨김 (Kyu 증상 "Orders 탭 미표시" 의 설명) | Medusa core |

**결론 (정적 분석)**: pb1_pct=10 + logo_url 설정만으로 3 경로 중 어느 것도 500 을 내는 코드 경로 **발견 못함**. 잘못된 가설이거나 다른 경로.

### §B.3 · 가능성 재구성 — 실제로 500 을 낼 다른 경로

Kyu 7차 증상의 뿌리를 다시 트리아지:

**가설 X (가장 유력)**: `/admin/orders/:id` (Medusa 내장 · **POS 주문 상세가 아님**) 에 앱이 `*items.variant,*fulfillments.*,*fulfillments.shipping_option.*` 같은 heavy fields 로 fetch (`apps/anchor/src/hooks/queries/useQueryOrder.ts:19-23`). 결제 직후 shortly before hand_over 시점에는 fulfillment 가 없어 `shipping_option.*` join 경로가 비정상 상태를 만나거나, auto-convert 가 실패하여 draft 상태인 주문을 Medusa 가 400/500 로 반환할 가능성.

**가설 Y**: `register-session-order-attribution` subscriber 가 `order.updated` 이벤트에서 `orderModule.updateOrders({...single-object})` 를 호출 — Medusa v2 silent-fail 결함. 500 을 내진 않지만 "주문 생성 중 어느 단계에서 metadata 꼬임" 을 유발 가능 (M0-1105-C FIX #3 에서 배열로 교체한 패턴). 다만 catch 가 있어 500 는 안 냄.

**가설 Z**: 4f3cd43 (M0-1105-S) 코드 베이스에는 `/admin/pos/orders/:id/quote` 가 **존재하지 않을 수도** 있다 (M0-1105-Q 는 4f3cd43 직전 머지). 머지 이력:
- `5742460 feat(pos): 매장별 세금(SC+PB1 compound) + 영수증 로고 + quote API (M0-1105-Q)`
- `fe07858 feat(pos): auto-convert draft→order (M0-1105-P)`
- `32ab911 feat(pos): preorder balance tender (M0-1105-L)`
- `4f3cd43 feat(pos): collection 재사용 · hand_over completed 전이 (M0-1105-R/S)`

4f3cd43 에는 Q · P · L · R · S **모두** 포함 (`git log --oneline 4f3cd43 -- apps/commerce-core/src/api/admin/pos/orders/\[id\]/quote` 로 확인). 따라서 가설 Z 는 기각.

### §B.4 · 회귀 가드 (통합 테스트 #32 · 신규)

본 PR 커밋에 테스트 추가. 3 경로 전부 200 을 어설트:
```ts
await api.put(`/admin/pos/settings`, { pb1_pct: 10, service_charge_pct: 0,
  logo_url: "https://files.example.com/logos/kyu7.png", logo_file_id: "file_01KYU7LOGO" });
// 결제 후:
await api.get(`/admin/pos/orders/${order.id}`);              // 200
await api.get(`/admin/pos/orders/${order.id}/quote`);        // 200 · tax.label='PB1' · pct=10 · logo_url present
await api.get(`/admin/orders?fields=%2Bmetadata,%2Btotal&limit=10&order=-created_at`);  // 200
```

### §B.5 · 필요한 Railway 로그 키워드 (Kyu 에게)

재현 불가 상태에서 뿌리 확정을 위해 Railway log 에서 **다음 키워드** 로 필터링해 요청:
- `order lookup failed` · `receipt.createReceiptForOrder failed` · `register-session order attribution failed` · `convertDraftOrderWorkflow failed` · `fulfillment polyfill failed` · `shipping_option` · `cannot read properties` · `logo_url` · `POS /admin/pos` · HTTP `500` (주문 #44 시각 ±2분 윈도우).

이 중 어느 키워드 매치가 있는지 Kyu 가 공유하면 500 뿌리 1line 확정.

---

## §C · 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | §C.1 멱등 가드 (옵션 A 채택) | ✓ `fulfill/route.ts:193-230` |
| 2 | 통합 #31 (재누름 → stocked 1회 · fulfillments 1) | ✓ `tenders.spec.ts:1430+` |
| 3 | §B — Kyu 7차 500 진단 | ✓ 정적 분석 결과 "3경로 500 없음" · 가설 X 유력 |
| 4 | 통합 #32 (pb1_pct=10 + logo_url 뒤 3 경로 200) | ✓ `tenders.spec.ts:1430+` |
| 5 | feature-map.yaml summary 갱신 | ✓ pos-tenders-fulfill 에 "hand_over 재누름 멱등 가드" 명시 |
| 6 | CI green | ✓ `pos-integration PASS 1m51s` · `markers-and-forbidden PASS` · `changes-filter PASS` · `check PASS` (run 42390919134 · HEAD 7100653 · Tests 32/32) |
| 7 | 금지 영역 0 | ✓ medusa-config / providers / #197 세금 파일 전부 미변경 |

---

## §D · 응답 shape 표 (fulfill · 멱등 응답)

| 필드 | 타입 | 재누름 시 값 |
|------|------|------------|
| ok | boolean | true |
| order_id | string | 주문 id |
| order_type | 'takeaway'\|'preorder'\|'delivery' | 보존 |
| stage | 'hand_over' | 'hand_over' |
| method | 'pickup'\|'delivery'\|null | metadata.fulfillment.method 보존 |
| fulfillment_id | string\|null | 기존 첫 fulfillment.id 또는 null |
| inventory_decremented | boolean | **false** |
| reservations_released | number | **0** |
| completed | boolean | **true** |
| already_fulfilled | boolean | **true** (신규) |

**비교 (1차 성공 응답과 차이)**: `inventory_decremented` · `reservations_released` 가 false/0 으로 축소 · `already_fulfilled:true` 추가.

---

## §E · Kyu 실기 (DoD · 2건)

- [ ] 재누름 안전 확인: Admin 에서 주문 #35 또는 #36 (이미 Hand over 완료) 을 선택 · 앱 Hand over 버튼 재누름 → 응답 `already_fulfilled:true` · Admin Fulfillments 섹션의 row 1건 유지 · Inventory 수치 변화 0.
- [ ] 영수증 500 회귀 확인: Admin 설정에서 PB1=10 + logo_url 유지 · 신규 takeaway 결제 · 영수증/주문 상세 화면 진입 → 500 없음.

---

## §F · 다음 라운드 후보

- **M0-1105-V**: 500 뿌리 확정 (가설 X 검증 — `/admin/orders/:id` heavy fields + draft/shipping_option 조합) · `ensurePosFulfillmentInfra` seed (shipping_option "In-store pickup" idempotent 생성 → workflow 성공 경로를 운영 DB 에).
- **M0-1105-W**: §C.3 maintenance `info==null` strict 옵션 + §C.4 workflow 성공/fallback 분기 토글 어설션.
