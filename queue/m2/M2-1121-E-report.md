M2-1121-E-report
원인 (a+d 복합): `GET /admin/pos/registers/:id/snapshot` 가 `stock_location_id`(`sloc_01…`)로 `getActiveSnapshotForRegister()` 직접 호출 → `register_session_id = 'sloc_01…'` 로 쿼리 → 항상 null 반환 · 손님화면 없이도 따라가기 가능 O · 수정 PR fork#226

---

## 1. 원인 — 서버 route ID 불일치

### 증거: route.ts 코드

```ts
// apps/commerce-core/src/api/admin/pos/registers/[id]/snapshot/route.ts (현재)
const registerId = req.params.id as string;  // POS 가 stock_location_id 로 호출
const snapshot = await svc.getActiveSnapshotForRegister(registerId, now); // ← BUG
```

`getActiveSnapshotForRegister(id)` 는 `WHERE register_session_id = id` 로 쿼리.
실제 snapshot 행의 `register_session_id` 는 `rss_01…` 형식인데,
route 에 들어오는 `id` 는 `sloc_01…`(stock_location_id) → 항상 null 반환.

올바른 호출:
```ts
const snapshot = await svc.getActiveSnapshotByStockLocation(registerId, now); // 1줄 수정
```

`getActiveSnapshotByStockLocation` 은 stock_location_id → open session → snapshot 순서로 올바르게 조회함.

### 증거: service.ts 두 메서드 비교

```ts
// getActiveSnapshotForRegister: register_session_id 로 직접 쿼리
async getActiveSnapshotForRegister(register_session_id, now) {
  const rows = await this.listOrderSnapshots({ register_session_id });
  ...
}

// getActiveSnapshotByStockLocation: stock_location_id → open session → snapshot
async getActiveSnapshotByStockLocation(stock_location_id, now) {
  const sessions = await this.listRegisterSessions({ stock_location_id, status: "open" });
  const session = sessions[0] ?? null;
  if (!session) return null;
  return this.getActiveSnapshotForRegister(session.id, now); // session.id = rss_01…
}
```

### 클라이언트 연쇄 오류

서버 null → `useCustomerDisplaySnapshot` null → `CdPreviewOverlay` 가 `snapshot=null` 전달
→ `CdPreviewWindow` 의 `React.useEffect([snapshot])` 미실행 → WebView 에 `pos-mirror` 미주입
→ mirror.tsx 이벤트 없음 → 항상 MainScreen(노란 대기 화면) 고정

배지 "Offline": polled_at 없거나 30초 초과 → `classifyCustomerDisplay` → `{ kind: 'offline' }`

---

## 2. 손님 화면 연결 없이도 따라가기: O(가능)

`usePosScreenHint()` 는 POS 로컬 모듈 레벨 상태.
각 POS 화면(CartReview / QrisPayment / PaidScreen 등)이 `setPosScreenHint({ pos_screen: '...' })` 을 마운트 시 호출.
서버 snapshot / 손님 화면 기기 연결 여부와 완전히 독립.

---

## 3. 수정 (fork#226 — CdPreviewOverlay.tsx · 11줄)

`components/cd-preview/CdPreviewOverlay.tsx` 에 `usePosScreenHint()` 추가,
서버 snapshot 위에 로컬 `pos_screen` + extras(`qr_string`, `amount`) 덮어씌움.

```ts
const hint = usePosScreenHint();

const liveSnapshot = React.useMemo(() => {
  const ps = hint?.pos_screen ?? null;
  if (!ps) return snapshot ?? null;
  return { ...(snapshot ?? {}), pos_screen: ps, ...(hint?.extras ?? {}) };
}, [snapshot, hint?.pos_screen, hint?.extras]);
```

- hint 없으면 기존 서버 snapshot 그대로 → 하위 호환 O
- hint 있으면 `pos_screen` 덮어씌움 → WebView 에 올바른 snapshot 주입 → 화면 전환 작동

서버 쪽 1줄 수정(route.ts `getActiveSnapshotByStockLocation`)은 BUILD 범위 밖(#409 담당).
적용 시 배지 Offline → Connected 전환 등 추가 개선 가능.

---

## 4. 자기 검증 — Playwright 스크린샷

파일: `apps/customer-display/e2e/mirror-M2-1121-E.spec.ts` (storeport M3-1120-D-wt)

테스트 결과 4/4 통과 (`?mock=1` — SplashAnimation overlay 억제):

| # | 주입 pos_screen | 기대 화면 | 결과 |
|---|---|---|---|
| 1 | `cart_review` | CartScreen | PASS ✓ |
| 2 | `payment_qris` | QrisScreen | PASS ✓ |
| 3 | `paid` | ReceiptScreen | PASS ✓ |
| 4 | 순서 연속 (1→2→3) | 각 화면 순서 전환 | PASS ✓ |

스크린샷 위치: `apps/customer-display/screenshots/`

**mirror-1-cart.png**: CartScreen — "Your order" · Croissant 2× Rp40.000 · Latte 1× Rp35.000 · Grand Total Rp83.250  
**mirror-2-qris.png**: QrisScreen — QR 코드 · "Please pay with QRIS" · "AMOUNT TO PAY Rp 83.250"  
**mirror-3-paid.png**: ReceiptScreen — "Payment complete" · QRIS 배지

---

## 5. 미해결 / 별도 조치 필요

| 항목 | 위치 | 조치 |
|---|---|---|
| route.ts 1줄 수정 | commerce-core (BUILD 범위 밖) | #409 또는 별도 티켓 |
| 배지 Offline → Connected | 서버 fix 선행 필요 | 위 수정 후 자동 해결 |
