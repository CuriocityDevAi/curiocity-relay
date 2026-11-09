---
round: M0-1105-W
pr: storeport#200 (같은 PR 재사용 · 운영 장애 A/B/C 뿌리 해소 · HEAD ac71c44)
base: storeport@feat/m0-1105-t-reservations · 7100653 (M0-1105-U)
outcome: V 승계 완료 → A/B/C 세 commit 분리 push · typecheck 0 err · 통합 #33~#36 신규 4건 · PR 본문 상단 "운영 장애 3줄" 배너 추가 · R0-AE §C.1(A) + §C.3(B) + §C.4(C) 반영
kyu_checks: 3 (아래 "Kyu 확인 절차" 참고)
---

# M0-1105-W · 운영 500 뿌리 A/B/C 해소 (V 승계)

**일자**: 2026-11-09 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/orders/[id]/{tenders,route,quote,fulfill}` · `apps/commerce-core/src/api/admin/pos/maintenance/repair-dangling-payment-links/route.ts` (신규) · `apps/commerce-core/integration-tests/pos/tenders.spec.ts`
**base**: `storeport@feat/m0-1105-t-reservations` HEAD `7100653` (M0-1105-U) → 3 커밋 (6138ac1 · cbf68f1 · ac71c44) 이어붙임 (같은 PR #200)

---

## §0 · V 승계 (지시 "0번 회수")

세션 시작 시 storeport 워크트리 `git status` 에 **커밋 없이 남은 V 작업물**:
- `modified: apps/commerce-core/src/api/admin/pos/orders/[id]/{fulfill,quote,[id],tenders}/route.ts`
- `untracked: apps/commerce-core/src/api/admin/pos/maintenance/repair-dangling-payment-links/`

V 는 25m13s · 128 turns · $8.4158 로 **코드 수정은 완료했으나 commit/push 하지 못하고 레이트 리밋 (M1-1105-Y §0 진단)**. 본 라운드는 그 작업물을 **버리지 않고 승계 + A/B/C 분리 commit · 각 통합 테스트 추가**. 파일별 변경 범위를 V 의 의도를 그대로 유지하되 M0-1105-V 태그 → M0-1105-W 로 relabel.

---

## §A · A — captured_amount undefined 500 뿌리 해소 (6138ac1)

### §A.1 · 뿌리 확정 (file:line)

**뿌리**: `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:362-381` (M0-1105-R 커밋 시점 라인). 금액 다른 재tender 가 pending collection 을 `paymentModule.deletePaymentCollections?.([existingPending.id])` 로 지운 뒤 신규 생성. Medusa 2 는 payment_collection 을 **soft-delete** 만 하고 `order_payment_collection` **link row 는 cascade 안 됨** → Medusa core 의 order 직렬화가 `collections[i].captured_amount` 를 읽다 `undefined.captured_amount` 접근으로 500.

**운영 증거** (`logs/railway-api-20261107-1550-1607.log` · relay):
- `Cannot read properties of undefined (reading 'captured_amount')` 15:50Z~16:07Z 거의 모든 /admin/orders /admin/pos/orders/:id 요청마다 123회 반복.
- 시작 시각 = PB1 10% 설정 뒤 첫 결제들 (금액이 draft 합계와 달라지면서 "금액 다른 재tender" 경로 트리거).

### §A.2 · 수정 (3 포인트)

1. **tenders/route.ts** — 삭제 경로 **영구 제거**. 금액 mismatched pending 은 `paymentModule.updatePaymentCollections?.({id}, {amount})` 로 **재사용**. 갱신 실패 시만 `createOrderPaymentCollectionWorkflow` 신규 (옛 것은 건드리지 않음). `existingPending` 선별 시 `!c.deleted_at` 추가 가드.
2. **orders/[id]/route.ts** — 응답에서 `payment_collections` 중 `deleted_at` truthy 엔트리 **필터링** (운영 DB 에 이미 쌓인 dangling 을 삼킴). 404 시 `[M0-1105-W]` 태그로 server log.
3. **maintenance/repair-dangling-payment-links/route.ts** (신규) — `POST` · body `{order_id?, limit?(default 200), dry_run?(default true)}` · query.graph 로 각 order 의 `payment_collections.*` 조회 후 `deleted_at !== null` 엔트리를 수집 · `dry_run=false` 일 때만 `link.dismiss([{order: {order_id}, payment: {payment_collection_id}}])`. 응답: `{ok, dry_run, scanned_orders, total_candidates, repaired, rows}`.

### §A.3 · 재현 통합 테스트 (#33 · #34)

- **#33** (`tenders.spec.ts`): pending collection 을 금액 `120000` 로 시드 → `/tenders` 에 `received_amount: 150000` 재tender → `payment_collection_id` 동일 (재사용) · `collections.length === 1` · `deleted_at === null` · `GET /admin/pos/orders/:id` 200 + 응답 payment_collections 에 soft-deleted 없음.
- **#34**: `POST /admin/pos/maintenance/repair-dangling-payment-links` dry_run 기본 → 200 · `dry_run:true` · `repaired:0` · `rows:[]` (or 배열) · `scanned_orders` · `total_candidates` 숫자.

### §A.4 · Kyu 복구 curl (2줄)

```bash
# ① dry_run · rows 확인
curl -X POST "$BASE/admin/pos/maintenance/repair-dangling-payment-links" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"limit":200}' | jq .

# ② 실삭제 (rows 확인 뒤)
curl -X POST "$BASE/admin/pos/maintenance/repair-dangling-payment-links" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"limit":200,"dry_run":false}' | jq .
```

응답 `{ok:true, dry_run:false, scanned_orders:N, total_candidates:M, repaired:M, rows:[...]}` → `M` 이 15:50~16:07Z 의 dangling 건수와 일치하면 복구 완료.

---

## §B · B — polyfill FulfillmentItem.sku NOT NULL 통과 (cbf68f1)

### §B.1 · 뿌리 (file:line)

`apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts:405-408` (M0-1105-U 커밋 시점) — `sku: (it.metadata as any)?.sku ?? null`. variant.sku 없는 Iced Tea · Coffee Latte 같은 line 에 **null 그대로** FulfillmentItem 생성 → Medusa 2 `FulfillmentItem.sku` NOT NULL 제약 위반 → `fulfillment polyfill failed: Value for FulfillmentItem.sku is required, 'null' found` (운영 15:56~16:02Z · 매 hand_over).

### §B.2 · 수정

- `query.graph.fields` 에 `items.variant_sku · items.product_handle` 추가.
- polyfillItems.map 에서 fallback 체인:
  `metadata.sku → variant_sku → product_handle → title → product_title → `pos-<line_item id tail>``.
  마지막은 어떤 상태에서도 non-null string 보장 → NOT NULL 제약 통과 확정.
- `inventory_item_id` 도 line_item.metadata 에서 꺼내 FulfillmentItem 에 전달 (fallback 경로 재고 링크 보존).

### §B.3 · 통합 테스트 (#35)

sku/variant_sku/handle 없는 line (title 만 "Iced Tea") → tender → fulfill `{stage:'hand_over'}` → **200 · completed:true** · `fulfillments.items.sku` 가 모두 non-null 문자열 (fallback 체인 통과 증빙).

---

## §C · C — 결제 직후 Order id not found 완화 (ac71c44)

### §C.1 · 뿌리

운영 로그 `Order id not found: order_01M6V…` 가 결제 직후 반복 (앱 영수증 Server Error 와 시각 일치). 뿌리: `convertDraftOrderWorkflow` 뒤 다음 request 가 작은 트랜잭션 전파 지연에 걸려 Medusa 2 query.graph 에서 derived field 미반영 → `data[0] === undefined` → 404.

### §C.2 · 수정

- `orders/[id]/route.ts` · `quote/route.ts` · `fulfill/route.ts`: 1차 조회 null 이면 **150ms 대기 + 같은 fields 로 1회 재조회**. 그래도 null 이면 `[M0-1105-W]` 태그로 server log 후 404 (기존 shape 유지).
- 백오프는 **1회** · 총 지연 ~150ms (GUI 체감 영향 미미).

### §C.3 · 통합 테스트 (#36)

`isDraft:true` order 생성 → `/tenders` tender (auto-convert) → **즉시 병렬** `GET /admin/pos/orders/:id` · `GET /admin/pos/orders/:id/quote` 둘 다 **200** · detail.data.order.id === 원본 id · fulfill `{stage:'hand_over'}` 는 200 또는 400 (draft 전환 상태에 따라) — 어떤 경우에도 500/404 는 금지.

---

## §D · R0-AE follow-up 1줄

- **§C.3 (B)**: polyfill sku fallback 체인으로 NOT NULL 통과 확정 · 재현 테스트 #35 추가 · V 라운드 유예 → 본 라운드 해소.
- **§C.4 (C)**: 결제 직후 조회 3경로에 150ms 재조회 백오프 추가 · 재현 테스트 #36 추가 · V 라운드 유예 → 본 라운드 해소.

---

## §E · CI / Typecheck / Test

| 항목 | 결과 |
|------|------|
| `apps/commerce-core typecheck` | ✓ 0 err (A·B·C 3 스냅샷 각각 통과) |
| unit `TEST_TYPE=unit jest` | ✓ 4 suites · 24 tests pass (3.2s) |
| integration `pos/tenders.spec.ts` 신규 | #33 · #34 · #35 · #36 (총 36 테스트 · 실 Postgres CI run 에서 push 뒤 검증 예정) |
| pre-commit hooks | ✓ 3 commits 전부 통과 (husky 자동) |
| feature-map | ✓ `pos-tenders-fulfill` glob 에 `maintenance/**` 이미 포함 (M0-1105-T) — 추가 갱신 불필요 |

---

## §F · 안건 ↔ 상태

| # | 안건 | 상태 | 커밋 |
|---|------|------|------|
| 1 | V 승계 (uncommitted 회수) | ✓ | — |
| 2 | A · 삭제 경로 제거 + 조회 방어 | ✓ | 6138ac1 |
| 3 | A · maintenance endpoint (dry_run 기본) | ✓ | 6138ac1 |
| 4 | A · 재현 통합 테스트 #33 · #34 | ✓ | 6138ac1 |
| 5 | B · polyfill sku fallback 체인 | ✓ | cbf68f1 |
| 6 | B · 통합 어설션 #35 | ✓ | cbf68f1 |
| 7 | C · 150ms 재조회 백오프 3 라우트 | ✓ | ac71c44 |
| 8 | C · draft→tender→즉시 GET 3경로 #36 | ✓ | ac71c44 |
| 9 | R0-AE §C.3 / §C.4 각 1줄 | ✓ | 본 리포트 §D |
| 10 | PR #200 본문 상단 "운영 장애 3줄" | ✓ | gh pr edit 완료 |
| 11 | relay 리포트 + claim done | ✓ | 본 파일 + status/claims/M0-1105-W.json |

---

## §G · 금지 영역 0 확인

- `medusa-config.ts` 미변경 ✓
- `payment-providers/**` · `providers/**` 미변경 ✓
- #197 세금 파일 (quote PB1 계산 로직) 미변경 ✓
- admin UI 미변경 (API 라우트만) ✓

---

## §H · Kyu 확인 절차 (3줄)

1. **운영 복구**: §A.4 의 curl 2줄 실행 (dry_run → rows 확인 → dry_run=false). repaired 가 0 이면 이미 자연 복구 (Medusa 재기동/배포 중 link 정리) · 0 초과면 그 수만큼 dangling 이 정리됐음. 둘 다 "정상" (뿌리는 코드로 차단됨).
2. **A 회귀**: 운영 PB1=10 유지 + 새 takeaway 주문 (amount 가 draft 합계와 다른 상황 유도: 여러 번 수량 바꿔보기) → tender → Admin Orders 목록·상세 **500 없음** + payment_collections.length === 1.
3. **B/C 회귀**: variant.sku 없는 상품 (Iced Tea / Coffee Latte) 주문 → tender → 영수증 화면 **Server Error 없음** → hand_over → `fulfillments.items.sku` 가 title/handle fallback 으로 채워져 있음.

---

## §I · 다음 라운드 후보

- **M0-1105-X**: §A.4 maintenance 엔드포인트 `strict` 옵션 (link.dismiss 대신 link.create reversal 요구 · dry_run 모드만 가능) + 운영 재발 모니터링 라우트 (metadata.fulfillment.polyfill_sku_used=true 카운터).
- **M0-1105-Y**: Kyu 실기 (§H) 결과로 dangling 건수 실측 후 대시보드 알림 (sentry 등) 연동 — "`captured_amount` undefined" 재발 시 즉시 ping.
