DIAG Q1 QRIS탭 선택 즉시 payment_qris emit → CD 준비 중 조기 표시 · Q2 SecureStore 조기 삭제로 qr_string emit 전부 drop → CD QR 미표시 · Q3 pending tender 재진입 UX 없음 + regenerate payment_collection_id 미전달 · Q4 tenders upsert items `line_total` 필드명이 CD가 읽는 `total`과 불일치 → Rp NaN

---

## Q1 — CD "QRIS 결제 준비 중" 조기 노출

### 원인 (파일:줄)
`app/checkout/tender-cash/[draftOrderId].tsx` **line 121**

```tsx
React.useEffect(() => {
  const screen: PosScreen =
    method === 'cash' ? 'payment_cash'
    : method === 'qris' ? 'payment_qris'   // ← QRIS 탭 선택 즉시
    : 'payment_card';
  setPosScreenHint({
    pos_screen: screen,
    extras: { amount: total },             // ← qr_string 없음
    freezeCart: true,
  });
  ...
}, [method, total]);
```

사용자가 QRIS 탭을 선택하는 순간 `method='qris'` → effect 즉시 실행 → `payment_qris` hint emit. `qr_string`은 없으므로 `extras = { amount }` 만 전달된다.

서버 snapshot에 `pos_screen='payment_qris'`, `qr_string=null` 저장.
CD `display-machine.ts` line 329 `posScreenToDisplay('payment_qris') = 'qris'` → CD qris 화면 전환.
`QrisScreen.tsx` line 124 `const qrString = snapshot.qr_string ?? null` → null → "준비 중" placeholder 렌더.

### 근거 코드
```tsx
// display-machine.ts:329
if (target === "qris") return stay("qris");

// QrisScreen.tsx:181
{qrString ? <QrSvg … /> : (
  <Text>{qris.preparing}</Text>  // "QRIS 결제 준비 중..."
)}
```

### 수정 설계 (Kyu 결정 반영: Generate QR 후에만 준비 중)
**POS fork — `app/checkout/tender-cash/[draftOrderId].tsx`** (small)

QRIS 탭이 선택됐을 때는 `checkout_review`를 유지하고 `payment_qris`는 emit하지 않는다.

```tsx
// 변경 전 (line 121)
method === 'qris' ? 'payment_qris' : 'payment_card'

// 변경 후
method === 'qris' ? 'checkout_review' : 'payment_card'
```

`tender-qris` 화면으로 navigate될 때 해당 화면의 useEffect가 `payment_qris + qr_string`을 emit — 이것이 올바른 CD 전환 시점.

### 위험
낮음. 화면 전환 시점 조정만. 단, CD가 `checkout_review`에서 `cart` 화면을 유지하므로 고객에게는 Checkout 요약이 그대로 보임 (Kyu 권장 "직전 checkout 요약 유지" 와 일치).

---

## Q2 — Generate QR 후 CD QR 미표시

### 원인 (파일:줄)
`api/hooks/pos-payments.ts` **line 190** — `SecureStore.deleteItemAsync` 무조건 호출

```ts
onSuccess: async (tender) => {
  await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY);  // ← QRIS도 여기 통과
  qc.invalidateQueries({ queryKey: ['orders'], exact: false });
  qc.invalidateQueries({ queryKey: ['draft-order'], exact: false });
  ...
  const isSplitIncomplete = tender?.is_complete === false;
  // is_complete=false(QRIS/split 1차) 여도 SecureStore는 이미 삭제됨!
```

QRIS tender 응답은 `is_complete: false`(tenders/route.ts line 1108). 그러나 SecureStore 삭제는 `isSplitIncomplete` 체크 **이전** line 190에서 무조건 실행.

**연쇄 버그 경로:**

```
createTender(QRIS) 성공
→ onSuccess: SecureStore.deleteItem("draft_order_id")
→ useCurrentDraftOrder refetch: SecureStore.getItem → null → return null
→ usePosScreenAutoEmit: draftOrderId = null
→ orderId = null (hint.order_id도 undefined)
→ postEmit: if (!item.order_id) return  ← SILENT DROP
→ tender-qris의 setPosScreenHint({ payment_qris, qr_string }) 도 DROP
→ 서버 snapshot qr_string 업데이트 안 됨
→ CD 10s 폴링 → qr_string=null → "준비 중" 그대로
```

관련 코드:
```ts
// usePosScreen.ts:53-56
async function postEmit(sdk, item): Promise<void> {
  if (!item.order_id) {
    return;  // silent drop — qr_string emit이 여기서 사라짐
  }
```

```ts
// usePosScreenAutoEmit.ts:60-61
const orderId = hint?.order_id !== undefined
  ? (hint.order_id ?? null)
  : draftOrderId;  // ← null (SecureStore 삭제 후)
```

### 수정 설계 (파일 2개)

**POS fork — `api/hooks/pos-payments.ts`** (1줄 조건 추가, small)

QRIS pending(is_complete=false) 또는 split 1차는 SecureStore를 아직 삭제하지 않는다:

```ts
onSuccess: async (tender) => {
  const isSplitIncomplete = tender?.is_complete === false;
  const isPreorderDpOnly = tender?.preorder_stage === 'dp_paid';
  if (!isSplitIncomplete && !isPreorderDpOnly) {
    await SecureStore.deleteItemAsync(DRAFT_ORDER_ID_STORAGE_KEY);
  }
  qc.invalidateQueries({ queryKey: ['orders'], exact: false });
  qc.invalidateQueries({ queryKey: ['draft-order'], exact: false });
  qc.invalidateQueries({ queryKey: ['pos-receipt'], exact: false });
  if (!isSplitIncomplete && !isPreorderDpOnly && tender?.order_id) {
    removeDraftOrderFromList(tender.order_id);
  }
},
```

QRIS 결제 완료(webhook paid → navigateToSuccess)에서 SecureStore 삭제를 처리하거나, 기존 `useCurrentDraftOrder`의 non-draft guard가 처리 (webhook 후 order status 변경 시 자동).

**보조 fix — `app/checkout/tender-qris/[draftOrderId].tsx`** (small)

SecureStore 버그가 있는 환경에서도 emit이 끊기지 않도록 hint에 `order_id` 명시:

```tsx
setPosScreenHint({
  pos_screen: screen,
  extras: { amount: total, qr_string: currentQrString },
  freezeCart: true,
  order_id: orderId ?? draftOrderId,  // 추가 — null fallback 차단
});
```

### 위험
중간. SecureStore 삭제 시점 변경 — QRIS 결제 완료 후 카트가 자동으로 비워지지 않을 수 있음. `navigateToSuccess`에서 명시적 SecureStore 삭제 호출 추가 필요. 단, webhook paid → 카트 비움 흐름은 기존 `useCurrentDraftOrder` non-draft guard(line 535)가 담당하므로 대부분 자동 처리됨.

---

## Q3 — Pending QRIS 재진입 시 막힘 + 버튼 없음

### 원인 1 — 409 에러에 복구 UX 없음
`app/checkout/tender-cash/[draftOrderId].tsx` `extractQrisError` / `onGenerateQris`:

```ts
// line 229
const extractQrisError = (e: unknown): string => {
  if (any.body?.type === 'xendit_not_configured') return '...';
  if (any.body?.message) return any.body.message;  // "previous QRIS tender is still pending"
  ...
};
// line 239: setQrisError(msg) → QrisTenderPanel에 에러 메시지만 표시, 복구 버튼 없음
```

서버 응답: `{ type: "conflict", code: "qris_pending_cannot_split_next", message: "..." }` (tenders/route.ts line 405-411).

### 원인 2 — `useQrisRegenerate` payment_collection_id 미전달
`api/hooks/pos-qris.ts` line 54-57:

```ts
mutationFn: async (orderId: string) => {
  return sdk.client.fetch(`/admin/pos/orders/${orderId}/qris-regenerate`, {
    method: 'POST',
    // ← body 없음! payment_collection_id 미전달
  });
}
```

`qris-regenerate/route.ts` line 33: `if (!payment_collection_id) → 400 required`. 따라서 **만료된 QR에서 "New QR" 버튼도 항상 실패**.

### 원인 3 — `tender-qris` route params에 payment_collection_id 없음
`onGenerateQris` (tender-cash line 260-271):

```ts
router.push({
  pathname: '/checkout/tender-qris/[draftOrderId]',
  params: {
    draftOrderId,
    orderId: tender.order_id,
    qrString: tender.qr_string,
    expiresAt: tender.expires_at,
    paymentRequestId: tender.payment_request_id ?? '',
    // ← tender.payment_collection_id 미전달
  },
});
```

`payment_collection_id`가 tender-qris 화면에 없어 regenerate 호출 불가.

### 수정 설계

**POS fork — `app/checkout/tender-cash/[draftOrderId].tsx`** (medium)

409 `qris_pending_cannot_split_next` 감지 → 기존 pending tender의 `qr_string`/`payment_collection_id` 조회 → tender-qris로 이동:

```ts
const onGenerateQris = async () => {
  ...
  try {
    const tender = await createTender.mutateAsync({...});
    router.push({ params: { ..., paymentCollectionId: tender.payment_collection_id } });
  } catch (e) {
    const body = (e as any)?.body;
    if (body?.code === 'qris_pending_cannot_split_next') {
      // 기존 pending tender 조회 (order metadata.tenders)
      const existing = await fetchExistingPendingQris(sdk, draftOrderId);
      if (existing) {
        router.push({ pathname: '/checkout/tender-qris/[draftOrderId]',
          params: { ..., qrString: existing.qr_string, paymentCollectionId: existing.payment_collection_id } });
        return;
      }
    }
    setQrisError(extractQrisError(e));
  }
};
```

**POS fork — `app/checkout/tender-qris/[draftOrderId].tsx`** (small)
- `paymentCollectionId` route param 추가
- `useQrisRegenerate` 호출 시 `payment_collection_id` 전달

**POS fork — `api/hooks/pos-qris.ts`** (small)
```ts
mutationFn: async (input: { orderId: string; paymentCollectionId: string; prevPaymentRequestId?: string }) => {
  return sdk.client.fetch(`/admin/pos/orders/${input.orderId}/qris-regenerate`, {
    method: 'POST',
    body: {
      payment_collection_id: input.paymentCollectionId,
      previous_payment_request_id: input.prevPaymentRequestId,
    },
  });
}
```

**storeport 서버 — 선택적 신규 엔드포인트** (medium)
`POST /admin/pos/orders/:id/qris-cancel` — 기존 pending QRIS session만 expired 처리 (새 session 미생성). 이를 통해 POS "Cancel QR" 버튼 구현.

### 뒤로 가기 자동 취소 권장안
**자동 취소 비권장**. 이유:
- 고객이 이미 QR을 스캔하고 금융앱에서 결제를 승인 중일 수 있음
- Xendit webhook이 "Cancel" 직후 도달하면 이중 결제 위험
- pending → expired/canceled → webhook captured 순서 충돌 → 환불 필요

권장 흐름: 뒤로 가기 시 pending 그대로 유지, 재진입 시 existing QR 보여주기 + [스캔 계속] [새 QR 생성] [QR 취소] 세 가지 선택 제공.

### 위험
높음(돈 관련). QRIS pending 상태에서 regenerate/cancel 호출 순서가 잘못되면 Xendit에서 결제가 완료됐음에도 POS가 취소로 판단할 수 있음. webhook 도달 후 상태를 항상 우선으로 처리해야 함.

---

## Q4 — CD 주문 내역 "Rp NaN"

### 원인 (파일:줄)
`storeport/apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` **lines 1054, 1190, 1369**

```ts
// QRIS short-circuit upsert (line 1047-1064)
const _snapItems = ((order.items ?? []) as any[]).map((it: any) => ({
  id: it.id,
  title: it.title ?? it.product_title ?? "",
  variant_title: it.variant_title ?? null,
  quantity: Number(it.quantity ?? 0),
  unit_price: toNum(it.unit_price),
  line_total: toNum(it.total ?? it.subtotal),  // ← "line_total" 필드명 오류
}));
```

CD `QrisScreen.tsx` line 290:
```tsx
<Text>{formatRp(item.total)}</Text>  // ← "total" 읽음
```

`SnapshotItem` 인터페이스(order-snapshot.ts line 27):
```ts
export interface SnapshotItem {
  title: string;
  quantity: number;
  unit_price: number;
  total: number;  // ← "total" 필드 기대
}
```

저장된 snapshot items에 `line_total` 필드가 있고 `total`이 없으면: `item.total = undefined` → `formatRp(undefined)` = `"Rp NaN"`.

QRIS tender 생성 시 tenders/route.ts가 snapshot을 `line_total`로 덮어쓰고, Q2 버그로 인해 tender-qris에서 올바른 `total` 필드로 재복원하는 emit이 drop되어 `line_total` 상태가 유지됨.

### Coffee Latte variant 가격 추가 요인
`checkout-snapshot/route.ts` line 20-23의 `toNum`:
```ts
function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;  // BigNumber 객체: Number(obj) = NaN → 0 반환
}
```

Medusa v2가 BigNumber 객체(`{ numeric_: "30000" }`)로 unit_price를 반환할 경우 checkout-snapshot route는 `unit_price=0` 저장. tenders/route.ts의 `toNum`은 `numeric_` 처리 가능. 그러나 **NaN 발생은 field명 불일치(`line_total` vs `total`)가 주원인**이며 unit_price=0은 "Rp 0" (NaN 아님).

### 수정 설계

**storeport 서버 — `tenders/route.ts`** (small, 3줄)

```ts
// line 1054, 1190, 1369 모두 동일하게:
// 변경 전:
line_total: toNum(it.total ?? it.subtotal),
// 변경 후:
total: toNum(it.total ?? it.subtotal),
```

**선택적 추가 fix** — `checkout-snapshot/route.ts` BigNumber toNum (small):
```ts
function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'string') return Number(v) || 0;
  if (typeof v === 'object' && v && 'numeric_' in (v as any)) {
    return Number((v as any).numeric_) || 0;
  }
  return Number(v) || 0;
}
```

### 위험
낮음. field명 오탈자 수정. 단, DB에 이미 `line_total`로 저장된 기존 snapshot이 있으면 재업데이트 전까지 NaN 유지 (다음 POS 이벤트 emit 시 checkout-snapshot이 올바른 `total`로 덮어씀).

---

## 작업 분할 제안

### Hub 1 — POS fork (agilo-medusa-pos-fork)
| 항목 | 파일 | 크기 |
|------|------|------|
| Q1 fix: QRIS 탭 선택 시 checkout_review 유지 | `app/checkout/tender-cash/[draftOrderId].tsx` line 121 | XS (1줄) |
| Q2 fix: QRIS pending은 SecureStore 삭제 보류 | `api/hooks/pos-payments.ts` line 189-200 | S (조건 추가) |
| Q2 보조: tender-qris hint에 order_id 명시 | `app/checkout/tender-qris/[draftOrderId].tsx` | S |
| Q3 fix: payment_collection_id route param 추가 | `app/checkout/tender-cash/[draftOrderId].tsx`, `tender-qris/[draftOrderId].tsx` | S |
| Q3 fix: useQrisRegenerate body 수정 | `api/hooks/pos-qris.ts` | S |
| Q3 fix: 409 pending → resume UX | `app/checkout/tender-cash/[draftOrderId].tsx` | M |

### Hub 2 — storeport 서버 (commerce-core)
| 항목 | 파일 | 크기 |
|------|------|------|
| Q4 fix: line_total → total (3곳) | `src/api/admin/pos/orders/[id]/tenders/route.ts` | XS |
| Q4 보조: checkout-snapshot BigNumber toNum | `src/api/admin/pos/orders/[id]/checkout-snapshot/route.ts` | XS |
| Q3 선택: qris-cancel 엔드포인트 신설 | `src/api/admin/pos/orders/[id]/qris-cancel/route.ts` | M |

### Hub 3 — storeport CD (customer-display) — 필요 시
현재 Q1-Q4 버그는 POS fork / 서버 수정으로 모두 해결 가능. CD 코드 변경 불필요.
단, `formatRp`에 NaN 가드 추가는 방어 목적으로 선택적 적용 가능:
```ts
function formatRp(n: number): string {
  if (!Number.isFinite(n)) return 'Rp —';  // NaN/Infinity guard
  ...
}
```
