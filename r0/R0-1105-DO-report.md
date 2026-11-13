# R0-1105-DO 리뷰 리포트

**검토일**: 2026-11-13 · 담당: R0

---

## A. storeport #240 — 판정: **APPROVE**

head: `a55c8b2` · mergeable_state: **clean**

### A.1 테스트 1파일 · 제품 코드 diff 0

`apps/commerce-core/integration-tests/pos/pos-tax-lines.spec.ts` 1파일만 변경. 제품 코드(라우트·DTO·서비스) 변경 0. ✅

### A.2 새 단언 의미 있음 — 동어반복 아님

`taxLineSum = Σ round(item_subtotal × rate / 100)` 를 `3001` 과 비교.

- `rate` 는 `setOrderLineItemTaxLines` 가 `(allocated × 100) / itemSub` 로 저장한 소수점 값.
- `item_subtotal` 은 `items.*` 와일드카드로 가져온 `total ?? subtotal` (computed 필드).
- **독립 오류 탐지 가능**: rate 가 DB 에서 정수로 잘리면(`10 → 10.00` truncation) 세 항목 모두 `round(10001×10/100)=1000`, 합=3000 ≠ 3001 로 **실패**. 배분 알고리즘이 균등 rate 를 쓰는 버그도 같은 경로로 탐지.
- 한계: 항목별 개별 배분 정확도는 검증하지 않음 (합산만). 현 요구사항(CJ-4 "합 = allocated") 범위 내에서는 충분.
- 동어반복 여부: rate = allocated×100/itemSub (소수) 저장 후 역산이면 완전 역연산처럼 보이나, DB 정수 반올림이 개입하면 round-trip 이 보장되지 않으므로 **동어반복 아님**.

### A.3 CI

| 체크 | 결과 |
|---|---|
| pos-integration | ✅ pass (4m5s) |
| unit-commerce-core | ✅ pass (57s) |
| check | ✅ pass |
| markers-and-forbidden | ✅ pass |
| docker-smoke-* | skipping (변경 없음) |

mergeable_state: **clean**

---

## B. fork #127 (M3-1105-BR) — 판정: **APPROVE** (playwright 완료 후 머지 권장)

head: `bed007d` · mergeable_state: **unstable** (playwright pending)

### B.1 C1 — 캐시 비었거나 낡았을 때

`api/hooks/draft-orders.tsx:316`

```ts
const cached = queryClient.getQueryData<AdminDraftOrderResponse>(['draft-order']);
const { toAdd, toUpdate } = mergeCartItems(
  items.items as ...,
  cached?.draft_order?.items ?? [],   // ← 빈 캐시 → []
);
```

- **빈 캐시 (앱 재시작 직후)**: `existing = []` → `mergeCartItems` 반환 `{ toAdd: 모두, toUpdate: [] }` → 모두 `addItems`. 중복 줄 없음. ✅
- **낡은 캐시 (다른 기기 추가)**: 캐시가 서버 상태와 다르면 수량이 틀어질 수 있음. 단, POS 단일 기기 전제이므로 허용 범위. 명시적 위험 없음.
- **연속 빠른 탭**: `useAddToDraftOrder`는 `useMutation` 으로 직렬화되어 있지 않아 더블 탭 시 경쟁 가능. 기존 `addItems` 직접 호출과 동일한 위험 — 신규 도입 없음.

### B.2 C1 — 옵션이 variant_id 로 구분되는지

`lib/cart-merge.ts:11` → `existing.find((i) => i.variant_id === item.variant_id)`.

테스트 `__tests__/cart-merge.test.ts:21` — `var_hot` / `var_iced` 가 별개 ID로 각각 `toAdd` 처리됨. 같은 variant + metadata 옵션 조합을 쓰는 상품이 카탈로그에 있다면 잘못 합산될 수 있으나, Medusa v2 기본 구조에서 옵션은 variant_id 에 인코딩되므로 현 사용 범위에서 안전. ✅

### B.3 N-a / N-b — 뒤로가기 버튼 모양 불변 여부

`app/_layout.tsx:78-93`

- `headerBackTitle: 'Cart'` — 뒤로가기 버튼의 **레이블 텍스트만** 변경. 컴포넌트 교체·chevron 모양·색 변경 없음. Kyu "형태, 디자인등을 바꾸지 않았으면해" 위반 없음. ✅
- `headerLargeTitle: true` 적용 화면: `checkout/[draftOrderId]`, `checkout/tender-cash`, `checkout/delivery`, `checkout/split-tender`, `checkout/tender-qris`.
- **Card tender 화면 (`checkout/tender-card`) 미수정**: 이번 PR에 포함되지 않음 — 겹침 미해소 가능성. → **Kyu 실기 항목 참조**.
- 다른 화면(success: `headerBackVisible: false`, product-details 등) 영향 없음. ✅

### B.4 N-c — View order 직행 · 뒤로가기 스택

`app/checkout/success/[orderId].tsx:92-114`

```ts
navigation.dispatch(
  CommonActions.reset({
    index: 1,
    routes: [
      { name: '(tabs)', state: { routes: [{ name: 'orders' }], index: 0 } },
      { name: 'orders/[orderId]', params: { ... } },
    ],
  }),
);
```

- 한 번에 최종 스택 구성 → "My Orders 플래시" 없음. ✅
- 주문 상세 닫으면 `(tabs)/orders` 목록만 남음. Checkout/Cart 뒤로가기 경로 없음. ✅
- 카트 비움: 별도 `useDraftOrder` reset 흐름 유지 (이번 PR 미변경). ✅

### B.5 lint / vitest / 웹 번들 / mergeable_state

| 체크 | 결과 |
|---|---|
| assertions | ✅ pass (3m8s) |
| flow-tests | ✅ pass (47s) |
| lint | ✅ pass (1m6s) |
| playwright | ⏳ **pending** |

mergeable_state: **unstable** (playwright 완료 대기). playwright 완료 후 머지 권장.

---

## C. fork #128 (M2-1105-BG) — 판정: **수정 요청**

head: `6270442` · mergeable_state: **unstable** (assertions fail)

### C.1 resolveRefundKind() 기준 — 최초 결제 총액 대비

`lib/refund-rules.ts:299-312`

```ts
export function resolveRefundKind(kind, refundGrandTotal, orderGrandTotal?) {
  if (kind === 'refund' && orderGrandTotal != null && refundGrandTotal < orderGrandTotal) {
    return 'partial_refund';
  }
  return kind;
}
```

`orderGrandTotal = deriveGrandTotal(order.total, metadata)` → `lib/order-totals.ts:1-7`:

```ts
export function deriveGrandTotal(orderTotal, metadata) {
  const posTotals = (metadata.pos_totals ?? null);
  return posTotals?.grand_total ?? orderTotal;
}
```

`pos_totals.grand_total` 는 원거래 완료 시 서버가 세팅한 최초 결제 총액. `order.total` 도 Medusa v2 에서 부분 환불 후에도 원래 값 불변. → **기준이 최초 결제 총액 대비임 확인**. ✅

두 번째 부분 환불(나머지 전부 33,000)도 `33000 < 66000 → partial_refund`. Kyu 08:55 결정("잔액 대비 아님") 반영. ✅

**단위 / 반올림**: IDR 정수 `<` 비교 · BigNumber 연산 없음. 안전. ✅

**테스트 케이스 2·3 동일 입력**: `resolveRefundKind('refund', 33000, 66000)` 중복. 커버리지는 충족하나 테스트 명칭 개선 여지 있음(cosmetic).

### C.2 머리글 색

`components/receipt/ReceiptCard.tsx:185`

```ts
className="text-3xl font-bold tracking-widest text-ink"
```

- VOID 와 같은 토큰 `text-ink` 사용. ✅
- raw hex 없음. ✅
- SALE 영수증: `refundBanner` = null → 배너 자체 미렌더 → 영향 없음. ✅

### C.3 세 경로 모두 effectiveReceipt 사용

| 경로 | 파일:줄 | 결과 |
|---|---|---|
| 화면 | `app/orders/[orderId].tsx:834,838,841` | `<ReceiptCard receipt={effectiveReceipt} />` ✅ |
| Share PNG | `app/orders/[orderId].tsx:737` | `captureAndShareReceipt(ref, effectiveReceipt)` ✅ |
| ESC/POS reprint | `app/orders/[orderId].tsx:725` | reprint stub P5+ 명시 · `voidRefundHeader`는 `partial_refund` 완비 ✅ |

### C.4 서버 버그 여부

PR 설명: "서버가 부분 환불에 `receipt.kind='refund'` 를 반환 — #108 이후 M3 환불 경로에서 `partial_refund` 판정 누락된 회귀로 추정."

→ **주의 항목 참조**

### C.5 #127 과 겹치는 파일

| #127 수정 파일 | #128 수정 파일 | 겹침 |
|---|---|---|
| `api/hooks/draft-orders.tsx` | (없음) | — |
| `app/_layout.tsx` | (없음) | — |
| `app/checkout/[draftOrderId].tsx` | (없음) | — |
| `package.json`, `package-lock.json` | `app.json` | 다른 파일 |
| (없음) | `app/orders/[orderId].tsx` | — |
| (없음) | `lib/refund-rules.ts` | — |
| (없음) | `components/receipt/ReceiptCard.tsx` | — |

**겹침 없음** → 머지 순서 무관.

### C.6 lint / vitest / mergeable_state ← **수정 필요**

| 체크 | 결과 |
|---|---|
| flow-tests | ✅ pass (44s) |
| lint | ✅ pass (1m5s) |
| **assertions** | ❌ **FAIL** — `m3-1105-aw: (11) 1개` |
| playwright | skipping |

**실패 원인**: `scripts/m3-1105-aw-assertions.mjs:159`

```js
check('(11) VOID banner text-ink (검정)', rcSrc.includes("'VOID'") && rcSrc.includes("'text-ink'"));
```

- 기존 `ReceiptCard.tsx`: `` `...${refundBanner === 'VOID' || ... ? 'text-ink' : 'text-danger'}` `` → `'text-ink'` (single-quote 포함) → assertion **pass**.
- #128 신규 코드: `className="text-3xl font-bold tracking-widest text-ink"` → `'text-ink'`(single-quote) 없음 → `rcSrc.includes("'text-ink'")` **false** → assertion **fail**.

**수정 방법**: `scripts/m3-1105-aw-assertions.mjs:159` 를 단순화된 패턴으로 갱신.

예시:
```js
check('(11) VOID banner text-ink (검정)', 
  rcSrc.includes('text-ink') && !rcSrc.includes('text-danger'));
```

또는 더 구체적으로:
```js
check('(11) VOID banner text-ink (검정)', 
  rcSrc.includes('tracking-widest text-ink'));
```

---

## 머지 순서 권장

**#127 과 #128 은 겹치는 파일 없음 → 순서 무관**. 단 각각의 CI 조건:
1. **#128 먼저**: assertion 수정 후 CI 통과 확인 → 머지
2. **#127 이후**: playwright 완료 후 → 머지
3. **#240 (storeport)**: 독립 레포 · clean · 언제든 머지 가능

---

## 주의 항목

1. **서버 버그 — partial_refund 후속 필요**: 서버가 부분 환불에 `receipt.kind='refund'` 를 반환하는 것은 서버 회귀 버그로 추정. 현재 클라이언트 보정(`resolveRefundKind`)이 workaround 로 동작하나, 서버에서 `partial_refund` 를 올바르게 반환하도록 storeport 에 후속 티켓 필요. (storeport · 환불 영수증 생성 라우트)

2. **#128 `app.json` expo-camera 추가**: `M2-1105-BG` 환불 영수증 머리글과 무관한 변경 포함. 의도적 포함인지 확인 필요(scan 기능 등 별도 작업과 혼입 여부).

---

## Kyu 실기 항목

| 번호 | PR | 항목 |
|---|---|---|
| K-1 | #127 | iOS에서 Checkout 화면 뒤로가기 `< Cart` 텍스트 표기 확인 |
| K-2 | #127 | iOS iPad Checkout / Cash tender / Split tender / Delivery 화면 제목 겹침 해소 확인 (`headerLargeTitle`) |
| K-3 | #127 | Card tender 화면(`checkout/tender-card`)에 `headerLargeTitle` 미적용 → 겹침 잔존 여부 확인 |
| K-4 | #128 | 부분 환불 주문 → 영수증 머리글 **검정 "PARTIAL REFUND"** 확인 |
| K-5 | #128 | 전체 환불 주문 → 영수증 머리글 **검정 "REFUND"** 확인 |
