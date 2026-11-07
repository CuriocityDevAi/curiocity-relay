---
name: R0-1105-W · 허브-1107-W 재리뷰 relay
description: fork #57 (M1-1105-R · thumbnail + tender guard) · fork #56 (M3-1105-M · P3 pre-order DP/balance/hand_over) 둘 다 APPROVE · pos-payments.ts 상호 충돌 0
author: R0
dated: 2026-11-07
---

# R0-1105-W · fork #57 + #56 리뷰 relay

**스코프**: Kyu 실기 2차 ④ (useOrder 썸네일 복원) + P3 보드 7·9·10 (Pre-order DP/balance/hand_over) 쌍.
**정본**: fork master `b19539a` (#55 머지 후) · storeport main `fe07858` (#196).
**금지**: 코드 수정 · 커밋.
**claim**: `status/claims/R0-1105-W.json` · in_progress → completed.

## 판정 요약

| PR | head | 판정 | 핵심 |
| --- | --- | --- | --- |
| **#57** (M1-1105-R) | `d209ce1` | **APPROVE** | `api/hooks/orders.ts:52-56` useOrder fields `+items.thumbnail,+items.product.thumbnail,+items.product.images.*` — draft-orders.tsx:191,197,221 패턴 동일 · `useOrders` list 는 썸네일 미사용 (범위 축소 의도) · useCreateTender 가드 `_tendersInFlight Set` + try/finally → 실패 뒤 재호출 허용 자동검증 · 화면 파일 0 · Playwright 2 신규 + m3-1105-f 확장 |
| **#56** (M3-1105-M) | `d657f7f` | **APPROVE** | 보드 7·9·10 완결 · Takeaway 기본값 (`resolvedType ?? 'takeaway'`) 로 회귀 0 · `allowPartial = resolvedType === 'preorder' && !isBalanceFlow` 엄격 체크 → takeaway 누출 0 · stage=dp_paid 에서 Hand over 숨김 + Collect balance 노출 · fulfill body.stage='hand_over' 명시 · OrderTypePicker/CashTenderPanel 전수 D1 + 영어 · components/receipt/** 미수정 · fixtures 4개가 M0-1105-L §4 shape 일치 (`_source` 명시) |

## §A · #57 M1-1105-R

### §A-1 useOrder fields #30 패턴

`api/hooks/orders.ts:52-56`:
```
'+tax_total,+discount_total,+subtotal,+total,+items.variant.options.*,+items.variant.options.option.*,+items.variant.inventory_quantity,+customer.*,+items.thumbnail,+items.product.thumbnail,+items.product.images.*'
```

- 끝 3조각 (`+items.thumbnail,+items.product.thumbnail,+items.product.images.*`) = `api/hooks/draft-orders.tsx:191,197,221` 와 **동일** ✓
- `scripts/m1-1105-r-order-fields.mjs:24-26` 어설션이 두 파일의 끝 3조각 패턴 자동 검증 ✓
- **R0-1105-U §4 썸네일 회색** 해소 완료

**useOrders (list)**: `api/hooks/orders.ts:7-43` 는 `sdk.admin.order.list({...query})` 로 fields 미명시 · Orders 탭 목록 카드가 품목 썸네일을 노출 안 하므로 (store name + status chip 등만) regression 0 · **범위 축소 의도된 선택** · 지적 아님.

### §A-2 useCreateTender 중복 가드

`api/hooks/pos-payments.ts:59-110`:
```typescript
const _tendersInFlight: Set<string> = new Set();
export class DuplicateTenderError extends Error { readonly code = 'DUPLICATE_TENDER_IN_FLIGHT'; }

// mutationFn
if (_tendersInFlight.has(order_id)) throw new DuplicateTenderError(order_id);
_tendersInFlight.add(order_id);
try {
  // fetch
} finally {
  _tendersInFlight.delete(order_id);   // 성공·실패 공통 clear
}
```

| 시나리오 | 결과 |
| --- | --- |
| 첫 호출 | add → fetch → finally delete | OK |
| 동시 두 번째 호출 (double-tap) | has=true → throw DuplicateTenderError | **서버 호출 차단** |
| 성공 후 재호출 | finally 가 clear → add → fetch | OK |
| **실패 후 재호출** (서버 400/500 throw) | `finally` 가 catch 대신 실행 → delete → 재호출 가능 | **정상 재시도 허용** ✓ |

`scripts/m1-1105-r-tender-guard.mjs` 4 시뮬 cases (sim-1 첫 성공 · sim-2 동시 호출 reject · sim-3 완료 뒤 Set 비워짐 · sim-4 완료 후 재호출 성공) 로 자동 검증.

### §A-3 화면 파일 0

diff: `api/hooks/*` · `scripts/*` · 2 docs PNG · **`app/**` · `components/**` 0 수정** ✓

### §A-4 Playwright

- `scripts/m3-1105-f-playwright.mjs` +40줄: Order 상세 썸네일 Image src 존재 어설션 (R0-1105-U §4 커버)
- `scripts/m1-1105-r-order-fields.mjs` +33 신규: fields 소스 + draft-orders.tsx 정합
- `scripts/m1-1105-r-tender-guard.mjs` +65 신규: 가드 로직 소스 + 4 시뮬

---

## §B · #56 M3-1105-M

### §B-1 §0 대사표

| 보드 | 파일 | 상태 |
| --- | --- | --- |
| 7 (Checkout order type picker) | 신규 `components/payment/OrderTypePicker.tsx` · Takeaway / Pre-order / Delivery (`disabled` "Coming soon") | ✓ |
| 8 (Pre-order inputs) | 신규 `components/payment/PreorderInputs.tsx` · pickup_at + note | ✓ |
| 9 (잔금 수금) | `app/orders/[orderId].tsx:462-475` · stage=dp_paid → "Balance due" 배지 + Collect balance 버튼 노출 + Hand over 숨김 | ✓ |
| 10 (픽업) | stage=paid_full → Hand over 노출 · fulfill body.stage='hand_over' | ✓ |

### §B-2 Takeaway 회귀 0

`app/checkout/tender-cash/[draftOrderId].tsx:38` default:
```typescript
const resolvedType: 'takeaway' | 'preorder' | 'delivery' = orderType ?? 'takeaway';
```

- `orderType` route param 미전달 → `'takeaway'` default · 기존 흐름 identical
- UI "Cash tender" / "Takeaway" 레이블 (기본) 유지
- `allowPartial=false` (takeaway) → insufficient 가드 유지
- `m3-1105-d-playwright.mjs` 수정 없음 · 기존 24/24 PASS 유지 (PR body "Takeaway P2 회귀 0")

### §B-3 allowPartial 누출 가드

`app/checkout/tender-cash/[draftOrderId].tsx:111-115`:
```typescript
<CashTenderPanel ... allowPartial={resolvedType === 'preorder' && !isBalanceFlow} />
```

| resolvedType | isBalanceFlow | allowPartial | insufficient |
| --- | --- | --- | --- |
| `takeaway` | false | **false** | 유지 ✓ |
| `preorder` DP | false | **true** | skip |
| `preorder` balance | true | **false** | 유지 |
| `delivery` | false | **false** | 유지 |

CashTenderPanel 내부 (`components/payment/CashTenderPanel.tsx:52-53`):
```typescript
const insufficient = !allowPartial && received < total;
```

- prop 미전달 (undefined) → `!undefined = true` · insufficient 가드 유지 · **backward-compat 보존** (기존 호출부 safe) ✓
- `=== 'preorder'` 엄격 체크 → takeaway/delivery 로 누출 0 ✓

### §B-4 dp_paid 에서 Hand over 숨김

`app/orders/[orderId].tsx:468-475`:
```typescript
const isPreorderBalancePending = orderType === 'preorder' && preorderStage === 'dp_paid' && balanceDue > 0;
const isPreorderReady = orderType === 'preorder' && preorderStage === 'paid_full';
const showHandOver = !isFulfilled && ((orderType === 'takeaway' && payState === 'paid') || isPreorderReady);
const showCollectBalance = isPreorderBalancePending;
```

- dp_paid → `isPreorderReady` false → Hand over 미렌더 ✓ + Collect balance 노출 ✓
- paid_full → `isPreorderReady` true → Hand over 노출 · Collect balance 숨김 ✓

### §B-5 fulfill body.stage='hand_over'

`api/hooks/pos-orders.ts:40-46` useHandOver: `body: { stage: 'hand_over' }` 명시 ✓
`api/hooks/pos-payments.ts:123-134` useFulfillOrder: `stage = input.stage ?? 'hand_over'` 명시 ✓

→ storeport M0-1105-L fulfill route `preorderPickup = stage === "hand_over" && metadata.preorder.stage === "paid_full"` 가드 통과 · `createOrderFulfillmentWorkflow` 호출 (재고 단일 지점).

### §B-6 D1 · 영어 전수

OrderTypePicker:
- 토큰: `border-ink bg-ink` · `border-line bg-surface` · `text-surface` · `text-ink-disabled` · `text-ink-muted` ✓
- 영어: "Takeaway" · "Pre-order" · "DP today · balance on pickup" · "Delivery" · "Coming soon" ✓

tender-cash 신규 레이블: "Collect balance" · "Pre-order deposit" · "Cash tender" · "Balance" · "Pre-order DP" ✓

### §B-7 components/receipt/** 미수정

diff file list: `api/hooks/pos-*.ts` · `app/checkout/**` · `app/orders/[orderId].tsx` · `components/payment/**` · fixtures · screenshots · scripts. **`components/receipt/**` 0** ✓ (M1-1105-Q claim 영역 분리)

### §B-8 fixtures M0-1105-L §4 일치

4 fixtures 모두 `_source: "curiocity-relay/m0/M0-1105-L-report.md §4.x — storeport/.../integration-tests/pos/tenders.spec.ts ..."` 명시.

`fixtures/pos-tender-preorder-dp-response.json` 16 필드:
```
ok · order_id · provider_id · amount · order_type · is_balance · preorder_stage · balance_due_after
· payment_collection_id · payment_session_id · payment_id · receipt_id · receipt_no · receipt_kind · method · converted
```

M0-1105-L 통합 #3 + M0-1105-P 통합 #13 반환 shape 과 1:1 일치 ✓

---

## §C · 상호 충돌 실측

두 PR 모두 `api/hooks/pos-payments.ts` 수정 → `git merge-tree` 로 3-way auto-merge 시뮬:

| 시나리오 | 결과 tree | 충돌 마커 |
| --- | --- | --- |
| master → `#57` 1st merge | `1ddfe35` | 0 |
| (master+#57) → `#56` merge | `d6870f5` · Auto-merging pos-payments.ts | **0** |
| master → `#56` 1st merge | `b7a11f9` | 0 |
| (master+#56) → `#57` merge | `d6870f5` (같은 tree) | **0** |
| direct `#57 ↔ #56` merge-tree | `391072e` | **0** |

**모든 순서에서 clean auto-merge** · pos-payments.ts 는 **다른 라인** 수정 (`#57`: 59-110 mutationFn 중복 가드 블록 · `#56`: 29-70 PosTenderInput/PosTenderResponse 타입 확장 + 123-134 useFulfillOrder 추가).

→ **#56 rebase 불요** · Kyu 권장 순서 `#57 → #56` 머지 안전 · **둘 다 APPROVE only**, "rebase 필요" 코멘트 **불요**.

### §C-1 권장 머지 순서 (근거)

- **`#57` 먼저** 머지: `useOrder` 썸네일 복원이 작은 범위 (2 파일 소량) · R0-1105-U §4 Kyu 실기 즉시 해소.
- **`#56` 다음**: 큰 범위 (18 파일 · UI + fixtures + scripts) · pos-payments.ts 는 자동 병합.

---

## §D · 환경 보조

- fork master HEAD: `b19539a` (#55 M1-1105-Q 머지 후)
- `#57` head: `d209ce1`
- `#56` head: `d657f7f` (base `5a35e23` pre-#55 · merge-tree clean 확인됨)
- storeport main HEAD: `fe07858` (서버 contract 정본)
- claim: `status/claims/R0-1105-W.json` state=completed

## 참조

- 직전 리뷰: `r0/R0-1105-V-report.md` (storeport #197 · fork #55 둘 다 APPROVE)
- GitHub reviews 제출 (COMMENT · self-authored 제약):
  - [fork #57](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/57) · APPROVE
  - [fork #56](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/56) · APPROVE
