# M2-1126-H — QRIS QR 미표시 진단 리포트

원인 (d) · 위치 `apps/customer-display/src/lib/cd-screen-selector.ts:84-91` · 수정 허브 M0

---

## 1. 증상 재확인

Order #203, 15:28 WIB:
- POS: `tender-qris/[draftOrderId]` → Generate QR → QR 표시 정상
- CD (`admin.meros.id` 손님 화면): 주문내역 + "Enter phone number →" 버튼 활성, **QR 없음**
- Simulate 후 결제 완료 화면: 정상 전환

---

## 2. 체인 추적 결과

### 2-A. POS → 서버 (정상)

**경로**: `pos-m1/app/checkout/tender-qris/[draftOrderId].tsx:276-280`

```ts
const screen = isSplitFirstStep ? 'payment_split_1' : ... : 'payment_qris';
setPosScreenHint({
  pos_screen: screen,
  extras: { amount: total, qr_string: currentQrString },  // qr_string 포함
});
```

`usePosScreenAutoEmit` → `usePosScreen.emit()` → `POST /admin/pos/orders/:id/checkout-snapshot`  
body: `{ pos_screen: 'payment_qris', qr_string: '<EMVCo 문자열>', amount, register_session_id }` ✓  
(M3-1126-G 테스트 #273 확인)

### 2-B. 서버 저장 (정상)

**`apps/commerce-core/src/api/admin/pos/orders/[id]/checkout-snapshot/route.ts:116-142`**

```ts
const qr_string = typeof body.qr_string === 'string' ? body.qr_string : undefined;
snapshot = await regSvc.upsertSnapshotForRegister({
  ...
  pos_screen,       // 'payment_qris'
  qr_string,        // EMVCo 문자열
  ...
});
```

`service.ts:277-278` — `upsertSnapshotForRegister` 도 `qr_string` 를 `updateOrderSnapshots` 에 그대로 전달. ✓

### 2-C. `GET /customer-display/snapshots/active` 직렬화 (정상)

**`apps/commerce-core/src/modules/register_session/lifecycle.ts:225-251`**

`deriveTender(snapshot)` — `pos_screen === 'payment_qris'` 조건 충족 시:

```ts
return {
  method: 'qris',
  paid_so_far: ...,
  remaining: ...,
  qr_string: snapshot.qr_string ?? null,  // ✓ 응답에 포함
};
```

`serializeSnapshot` → `payment_phase: 'tendering'`, `tender.qr_string: '<EMVCo>'`, `customer_flow.state: 'none'` ← 응답 JSON에 모두 실림. ✓

### 2-D. CD 화면 선택기 ← **여기서 끊김**

**`apps/customer-display/app/index.tsx:282-302`** — `cdSnapshot` 조건:

```ts
const cdSnapshot = useMemo<CdSnapshot | null>(() => {
  if (!snapshot?.payment_phase || !snapshot?.customer_flow) return null;
  ...
}, [snapshot, localCustomerFlow]);
```

`serializeSnapshot` 는 항상 `payment_phase` 와 `customer_flow` 를 포함하므로 **`cdSnapshot` 는 항상 non-null**.

**`apps/customer-display/app/index.tsx:457-534`** — CD sync 블록:

```ts
if (cdSnapshot) {
  const tenderInfo = cdSnapshot.tender
    ? { method: cdSnapshot.tender.method, remaining: cdSnapshot.tender.remaining }
    : undefined;
  const cdView = selectCdView(
    cdSnapshot.payment_phase,  // 'tendering'
    cdSnapshot.customer_flow.state,  // 'none' (전화번호 미입력 상태)
    tenderInfo,  // { method: 'qris', remaining: 150000 }
  );
  // cdView → { kind: 'order-list', enterPhoneEnabled: true }
  ...
  if (cdView.kind === 'order-list') {
    screenNode = <OrderListScreen ... enterPhoneEnabled={true} />;  // ← QR 없음
  }
}
```

**`apps/customer-display/src/lib/cd-screen-selector.ts:80-98`** — `selectCdView`:

```ts
export function selectCdView(phase, flow, tender) {
  if (flow === 'none') {
    if (phase === 'paid') return { kind: 'receipt-full' };
    const enterPhoneEnabled = phase === 'tendering';
    return { kind: 'order-list', enterPhoneEnabled };  // ← tender.method 체크 없음!
  }
  // phone-flow: resolveLeftPanel 에서 tender.method==='qris' → 'qris' 처리됨
  // 하지만 flow==='none' 이면 이 분기에 도달하지 않는다.
  ...
}
```

`flow === 'none'` 분기에서 `tender.method` 를 확인하지 않아, QRIS 결제 중에도 `order-list` 를 반환.

### 2-E. 기존 `QrisScreen` 경로는 도달 불가 (dead code)

**`apps/customer-display/app/index.tsx:536-553`**:

```ts
} else if (screen === 'qris' && snapshot) {   // ← else if !
  screenNode = <QrisScreen ... />;
}
```

이 분기는 `cdSnapshot === null` 일 때만 실행. `cdSnapshot` 가 항상 non-null 이므로 **절대 실행되지 않음**.

---

## 3. 증상 일치 확인

| 항목 | 실제 증상 | 코드 경로 |
|---|---|---|
| "주문내역" (order items) | `OrderListScreen` 좌 2/3 — items 렌더 | `selectCdView('tendering','none')` → `order-list` |
| "Enter phone number" 버튼 활성 | `enterPhoneEnabled=true` | `phase === 'tendering'` 조건 |
| QR 없음 | `OrderListScreen` 에 QR 렌더 없음 | `QrisScreen` 도달 불가 |
| Simulate 후 완료 화면 정상 | `payment_phase: 'paid'` → `receipt-full` | `selectCdView('paid','none')` → `receipt-full` ✓ |

---

## 4. 후보 검토 결과

| 후보 | 상태 | 근거 |
|---|---|---|
| (a) POS → `payment_cash` 로 보냄 | **기각** | `tender-qris/[draftOrderId].tsx:276` → `payment_qris` 명시. M3-1126-G #273 확인 |
| (b) register_session_id 누락으로 다른 행 기록 | **기각** | route.ts:45-50 — `register_session_id` 필수 체크, 없으면 400 반환 |
| (c) 서버가 `qr_string` 응답에 안 실음 | **기각** | `serializeSnapshot:390`, `deriveTender:249` — `qr_string` 직렬화 ✓ |
| **(d) CD 선택기가 QRIS 경로에서 QR 미렌더** | **확정** | `selectCdView('tendering','none')` → `order-list` 반환, `QrisScreen` 도달 불가 |
| (e) 그 외 | 해당 없음 | |

---

## 5. 로컬 재현 로직 (단위 수준)

```bash
# 현재 동작 (버그)
selectCdView('tendering', 'none', { method: 'qris', remaining: 150000 })
→ { kind: 'order-list', enterPhoneEnabled: true }  # QR 없음

# 기대 동작 (수정 후)
selectCdView('tendering', 'none', { method: 'qris', remaining: 150000 })
→ { kind: 'qris' }  # QrisScreen 렌더
```

기존 테스트 `cd-screen-selector.test.ts:31-35` 는 `tender` 인자 없이 `tendering × none` 만 커버. `tender.method='qris'` 케이스 테스트 없음.

---

## 6. 수정 제안

### 파일 1: `apps/customer-display/src/lib/cd-screen-selector.ts` (M0 소유)

**위치**: 라인 20-27 `CdView` 타입에 `qris` kind 추가 + 라인 84-91 분기 추가

```ts
// CdView 타입에 추가
export type CdView =
  | { kind: 'order-list'; enterPhoneEnabled: boolean }
  | { kind: 'qris' }                                    // ← 추가
  | { kind: 'receipt-full' }
  | { kind: 'receipt-then-keypad' }
  | { kind: 'phone-flow'; rightPanel: RightPanel; leftPanel: LeftPanel };

// selectCdView flow==='none' 분기 수정
if (flow === 'none') {
  if (phase === 'paid') return { kind: 'receipt-full' };
  if (phase === 'tendering' && tender?.method === 'qris') return { kind: 'qris' }; // ← 추가
  const enterPhoneEnabled = phase === 'tendering';
  return { kind: 'order-list', enterPhoneEnabled };
}
```

### 파일 2: `apps/customer-display/app/index.tsx` (M0 소유)

**위치**: 라인 470 — `cdSnapshot` 블록 내 `cdView.kind === 'order-list'` 앞에 추가

```ts
if (cdSnapshot) {
  ...
  const cdView = selectCdView(...);

  if (cdView.kind === 'qris' && snapshot) {   // ← 추가 (3줄)
    screenNode = <QrisScreen storeConfig={storeConfig} snapshot={snapshot} eventKey={eventKey} />;
  } else if (cdView.kind === 'order-list') {
    ...
  }
}
```

**예상 크기**: 소 (2개 파일, 약 8줄 순증)

### 회귀 테스트 (신규 1건)

`apps/customer-display/src/lib/__tests__/cd-screen-selector.test.ts` 에 추가:

```ts
it("tendering+qris × none → qris screen (M2-1126-H 회귀)", () => {
  const tender: TenderInfo = { method: 'qris', remaining: 150000 };
  const v = selectCdView('tendering', 'none', tender);
  expect(v.kind).toBe('qris');
});
```

---

## 7. 2-C 선행 문제 (V4-4 원장 항목)

원장 decision-cd-pos-sync-v4-20261126 V4-4 에서 "2-C 선행 문제"로 분류된 이유 확인:

- 서버 직렬화(2-C)는 정상 — `qr_string` 응답에 실림
- 실제 선행 문제는 CD 선택기(2-D)
- "2-C 선행" 분류는 오진 — 본 버그는 CD-only, 서버 수정 불필요

---

## 8. 요약

```
끊기는 고리: CD selectCdView
파일:줄: apps/customer-display/src/lib/cd-screen-selector.ts:84-91
원인: flow==='none' 분기에서 tender.method 미체크 → QRIS도 order-list 반환
수정 허브: M0 (storeport CD)
크기: 소 (2파일, ~8줄)
POS 수정 불필요
```
