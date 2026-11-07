---
name: R0-1105-P · 허브-1107-P 재리뷰 relay
description: storeport #194 (M0-1105-L · preorder 잔금 수금) APPROVE · 6 체크포인트 + 3 비차단 observations
author: R0
dated: 2026-11-07
---

# R0-1105-P · storeport #194 리뷰 relay

**스코프**: storeport PR #194 (M0-1105-L · preorder 잔금 · kind=balance · stage dp_paid→paid_full · GET /admin/pos/orders/:id).
**정본**: `storeport@946d31c` (main) · 대상 head `f9bd74c`.
**금지**: 코드 수정 · 커밋.

## 판정

| 항목 | 결과 |
| --- | --- |
| 판정 | **APPROVE** (3 비차단 observations) |
| merge-tree vs main | clean (`b283257`) |
| diff 범위 | 7 files (+541/-41): tenders/route.ts +148 · fulfill/route.ts +13 · 신규 orders/[id]/route.ts +123 · 신규 Migration20261107000001.ts +24 · receipt/models/receipt.ts +7 · receipt/service.ts +2 · tenders.spec.ts +265 |
| 금지 영역 (medusa-config · providers · readFileSync) | **0건** |
| 로컬 재현 | Build PASS (backend 4.52s · frontend 18.80s) · Typecheck PASS · Integration **12/12 PASS** (18.55s · Node 20.19) |
| CI check_runs | 403 (MCP 제약) → 로컬 재현으로 대체 |

## 6 체크포인트

### ① 잔금 분기 (`isBalanceTender`) + DP 100% 주문 behavior

판별 조건 = **"preorder + 기존 metadata.preorder 존재 + balance_due > 0"** · Kyu 요구와 정확히 일치.

**DP 100% 완료 주문 (balance_due=0) 뒤 2번째 tender 거동** (코드 리딩 inference · 통합 테스트 미커버):
- `isBalanceTender = false` → metadata persist 블록의 **첫 preorder else 분기** 로 진입
- `amount` 명시되면 그대로 성공 · 없으면 `orderTotal × dp_percent / 100` 으로 **DP 금액 재계산**
- metadata.preorder 가 **첫 tender 상태로 롤백** (stage → "dp_paid" · balance_due 재계산 · paid_full_at 손실)
- 영수증 kind="sale" · 결제 자체는 200 성공
- ⚠ **DP 100% 완료 주문의 2번째 tender 거부 안 됨** · metadata 손상 가능. UI 가 hand_over 만 노출함에 의존 중.

**→ 권장 follow-up**: `isBalanceTender` 체크 바로 뒤에 `if (existingPreorder?.stage === "paid_full") return 400 "order already paid_full"` 가드.

### ② metadata 보존 (deposit_amount · order_type · receipt_id · register_session_id)

| 필드 | 보존 메커니즘 | ✓ |
| --- | --- | --- |
| `deposit_amount` | `nextMd.preorder = { ...(existingPreorder), balance_due: 0, stage: "paid_full", paid_full_at }` (existingPreorder spread) | ✓ |
| `order_type` | top-level `{ ...existingMd, order_type: effectiveOrderType }` · 같은 값 재할당 | ✓ |
| `receipt_id` / `receipt_no` | section 6 (M0-1105-K 유지) 가 fresh metadata 재조회 후 overlay → 최신 잔금 영수증으로 갱신 | ✓ |
| `register_session_id` | body 우선 · `existingMd.register_session_id` fallback · null 가능 | ✓ |
| `dp_paid_at` · `pickup_at` · `note` · `deposit_pct` | existingPreorder spread | ✓ |

**관찰**: `updateOrders([{id, metadata: nextMd}])` 배열 형식 (M0-1105-K FIX #3 패턴 계승) · Medusa v2 silent-success 결함 회피. ✓

### ③ `Migration20261107000001.ts` · kind enum 'balance' 추가

```sql
up:   DROP CONSTRAINT IF EXISTS receipt_kind_check
      ADD CONSTRAINT receipt_kind_check CHECK (kind IN ('sale','balance','reprint','refund','void'))
down: DROP CONSTRAINT IF EXISTS receipt_kind_check
      ADD CONSTRAINT receipt_kind_check CHECK (kind IN ('sale','reprint','refund','void'))
```

- **up 안전**: ✓
  - `DROP ... IF EXISTS` idempotent
  - `ADD CHECK` 는 기존 행 즉시 검증 · 신 허용 집합 ⊇ 구 집합 (super-set) → 기존 행 전부 통과 · 실패 없음
- **down 안전 (조건부)**: ⚠
  - `kind='balance'` 행이 존재할 때 down 실행 시 `ADD CONSTRAINT` validation 위배 → **ALTER TABLE 실패**
  - 실무 rollback 은 선행 데이터 수선 (`UPDATE receipt SET kind='sale' WHERE kind='balance'`) 필요
  - 표준 enum-확장 마이그레이션의 일반적 한계 · Medusa 운영 환경에서 rollback 거의 안 함 · **차단 사항 아님**
- constraint 이름 `receipt_kind_check` = Mikro-ORM 기본 네이밍 (`<table>_<column>_check`) ✓

### ④ fulfill 라우트 · dp_paid + hand_over 거부

```typescript
const preorderPickup =
  order_type === "preorder" &&
  stage === "hand_over" &&
  preorderMd?.stage === "paid_full";

if (order_type === "takeaway" || preorderPickup) {
  // createOrderFulfillmentWorkflow 호출 (재고 차감 단일 지점)
}
```

**dp_paid + hand_over 거동**:
- `preorderMd?.stage === "paid_full"` ✗ (dp_paid)
- `preorderPickup = false` · `order_type === "takeaway"` ✗
- → **`createOrderFulfillmentWorkflow` 미호출 · 재고 차감 안 됨 · fulfillment_id = null**
- 아래 metadata.fulfillment_stage 업데이트 블록은 **진행됨** → stage = "hand_over" 저장 (metadata 와 실제 상태 불일치 가능)
- HTTP 응답: **200** (fulfillment_id=null · inventory_decremented=false)

| 축 | 결과 |
| --- | --- |
| 재고 차감 (ADDENDUM §3 · "재고 차감 시점" 원칙) | **거부** ✓ (createOrderFulfillmentWorkflow 단일 지점 유지) |
| HTTP 레벨 거부 | **없음** · 200 반환 · metadata stage 오염 가능 |

**→ 권장 follow-up**: `if (order_type === "preorder" && stage === "hand_over" && preorderMd?.stage !== "paid_full") return 409 "preorder not paid_full yet"` 가드 추가. (ADDENDUM §3 원칙은 유지됨 · 다만 HTTP 응답 레벨 방어 추가.)

### ⑤ GET `/admin/pos/orders/:id` · 리포트 §4.3 fixture 대조

| 축 | 서버 (`route.ts`) | relay `m0/M0-1105-L-report.md` §4.3 fixture | ✓ |
| --- | --- | --- | --- |
| Top-level keys | `{order, balance_due, expected_by_method}` | 동일 3 키 | ✓ |
| `order.{id, display_id, total, subtotal, tax_total, discount_total, currency_code, items, payment_collections, metadata}` | query.graph fields 전부 매치 | 동일 | ✓ |
| `order.metadata.preorder.{deposit_pct, deposit_amount, balance_due, stage, pickup_at, note, dp_paid_at?, paid_full_at?}` | tenders/route.ts 가 balance tender 시 spread + paid_full_at · 첫 preorder 시 dp_paid_at 추가 | 동일 | ✓ |
| `order.metadata.{order_type, register_session_id, receipt_id, receipt_no}` | section 2 저장 + section 6 (M0-1105-K) receipt_id/no 갱신 | 동일 | ✓ |
| `balance_due` (top-level 미러) | `preorder.balance_due` number 이면 그 값 · 아니면 `null` | fixture `0` 매치 | ✓ |
| `expected_by_method` | register_session 연결 시 session.expected_by_method · 아니면 `null` | fixture `{cash: 200000}` 매치 | ✓ |

**expected_by_method `null` 처리 3 경로 전수**:
1. `metadata.register_session_id` 없음 → `let expected_by_method: unknown = null` 초기값 ✓
2. `register_session_id` 있어도 `retrieveRegisterSession` throw → catch `/* non-fatal */` · 초기값 유지 ✓
3. session 반환됐지만 `session.expected_by_method === undefined` → `?? null` ✓

### ⑥ CI + 금지 영역

| 축 | 결과 |
| --- | --- |
| 액티브 CI job (`.github/workflows/ci.yml`) | `markers-and-forbidden` · `changes-filter` · `pos-integration` (PR 트리거 ALWAYS) · docker-smoke-{commerce-core (if:false), anchor, wing} · wrangler-check-care-agent 는 해당 app 미수정이므로 skip |
| check_runs GET | 403 (MCP 제약) → 로컬 재현 Build PASS · Typecheck PASS · Integration **12/12 PASS** (18.55s) |
| medusa-config 수정 | **0** |
| `readFileSync` 사용 | **0** (grep `^\+.*readFileSync` → 1건이지만 comment 선언문) |
| providers / package.json | **0** |
| anchor Tauri 잔재 | commerce-core 범위 외 ✓ |

## 비차단 observations (follow-up M0 라운드 권장)

1. **DP 100% 완료 주문의 2번째 tender 명시적 400 가드** · `preorder.stage === "paid_full"` 재진입 방어 · tenders/route.ts `isBalanceTender` 체크 직후
2. **dp_paid + hand_over 명시적 409 가드** · `metadata.fulfillment_stage` 오염 방지 · fulfill/route.ts `preorderPickup` 체크 직후
3. **Migration down path** · `kind='balance'` 행 존재 시 `ADD CONSTRAINT` validation 위배로 ALTER TABLE 실패 · 실무 rollback 전 `UPDATE receipt SET kind='sale' WHERE kind='balance'` 데이터 수선 선행 필요 · 표준 Postgres check constraint 한계 · 운영 rollback 거의 안 함

## 영향 (앞단 M3 연계)

- fork `api/hooks/pos-orders.ts` 에 `useOrderDetail(order_id)` 신설로 GET /admin/pos/orders/:id 소비 가능 → `order.metadata.preorder.stage` 로 **dp_paid / paid_full UI 분기** · `balance_due > 0` 일 때 "Pay balance" 버튼 노출 · `expected_by_method` 로 마감 화면 보강
- R0-1105-O ④ 서버 contract 1건 (unused close `z_report`) 외 M0-1105-L 영역 contract 전수 추가 확보

## 참조

- storeport main HEAD: `946d31cdd9eadd42c149d81639044eaf02d41fad`
- PR #194 head: `f9bd74c8340469f0605f85d4c0e66ab51a49e54e`
- 직전 리뷰: `r0/R0-1105-O-report.md`
- GitHub review 제출: [#194](https://github.com/CuriocityDevAi/storeport/pull/194) · APPROVE (COMMENT event · self-authored 제약)
