---
round: M0-1105-K
pr:
  storeport: storeport#193
base_pr: null
outcome: receipt-meta-persisted + tab-title-permanent · order.metadata.receipt_{id,no} 저장 (재tender 최신화) · Object.defineProperty 로 "Meros Admin" 영구 고정 · 통합 9/9 · unit 24/24 · Playwright 4/4 · CI 전부 그린
kyu_checks: 1 (Kyu 11-07 결정 2건 수용)
ci_links:
  markers-and-forbidden: https://github.com/CuriocityDevAi/storeport/actions/runs/42305864392/job/128194874121
  check: https://github.com/CuriocityDevAi/storeport/actions/runs/42305864334/job/128194873636
  changes-filter: https://github.com/CuriocityDevAi/storeport/actions/runs/42305864392/job/128194874077
  pos-integration: https://github.com/CuriocityDevAi/storeport/actions/runs/42305864392/job/128194953344
---

# M0-1105-K · 영수증 메타 저장 + 탭 제목 영구 고정

**일자**: 2026-11-07 · **허브**: M0 · **대상**: `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` + `integration-tests/pos/tenders.spec.ts` + `src/admin/widgets/{meros-title.tsx(신규),meros-brand.tsx}`.

**base**: `origin/main @ 9e8f2ba` (M0-1105-H 머지 직후).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | tenders 라우트 · 영수증 mint 후 `order.metadata.receipt_id/receipt_no` 저장 | ✓ |
| 2 | 재tender(2건) 시 **최신 영수증** 으로 갱신 | ✓ (통합 #6 어설션) |
| 3 | 통합 #1 어설션 (metadata persist 확인) | ✓ |
| 4 | admin.meros.id 탭 제목 영구 "Meros Admin" · 4경우 | ✓ (Playwright 4/4) |
| 5 | Medusa 2.17 영구 방법 1개 · 핵심 3줄 | ✓ (`Object.defineProperty` · get/set/configurable) |
| 6 | medusa-config 수정 0 · readFileSync 0 | ✓ |
| 7 | 산출물 기동 BOOT OK + /health 200 | ✓ |
| 8 | CI 그린 (markers-and-forbidden · check · pos-integration · changes-filter) | ✓ (4/4) |

---

## 1. 뿌리 (R0-1105-L Mismatch #5 · R0-1105-C title 덮어쓰기)

### ① receipt 메타 저장
앱(`agilo-medusa-pos-fork`) 주문 상세의 영수증 섹션은 `order.metadata.receipt_id` 를 읽어 `GET /admin/pos/receipts/:id` 를 호출. 하지만 J-b(#191) 단계에서 tenders 라우트는 영수증 mint 후 `metadata` 에 포인터를 **저장하지 않았음**. 결과: 앱 영수증 섹션 공란.

R0-1105-L Mismatch #5 : "서버 수정 권장" · 메타 저장을 서버에서 처리하는 것이 올바른 책임 경계.

### ② 탭 제목
Medusa 2.17 는 라우트 전환 때마다 `document.title = "<Page Name> - Medusa"` 로 덮어씀. Kyu 11-07 요건: admin.meros.id 탭 제목이 **모든 화면·시점**에 "Meros Admin". 한 번 세팅으로는 불가 → `Object.defineProperty` 로 setter 를 no-op · getter 를 상수화 → 영구.

---

## 2. 변경 ↔ file:line

### `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts`
영수증 mint 성공 경로 (section 5) 바로 뒤에 **section 6 · metadata persist** 추가:
```ts
if (receipt?.id) {
  try {
    const orderModule = container.resolve(Modules.ORDER);
    const { data: freshRows } = await query.graph({
      entity: "order", fields: ["id", "metadata"], filters: { id: order_id },
    });
    const currentMd = (freshRows?.[0]?.metadata ?? {}) as Record<string, unknown>;
    const nextReceiptMd = {
      ...currentMd,
      receipt_id: receipt.id,
      receipt_no: receipt.receipt_no ?? null,
    };
    await (orderModule as any).updateOrders([
      { id: order_id, metadata: nextReceiptMd },
    ]);
    const { data: verifyRows } = await query.graph({ ... });
    const persisted = (verifyRows?.[0]?.metadata as any)?.receipt_id;
    if (persisted !== receipt.id) console.warn(...);
  } catch (e) { console.warn(...); }
}
```
- Medusa v2 `updateOrders` 단일 객체 입력 silent-success 결함을 피해 **배열 형식** 사용 (M0-1105-C FIX #3 패턴).
- `query.graph` 재조회로 persist 검증 · 불일치 시 `console.warn` (관측 가능하지만 non-fatal · 결제는 이미 capture).

### `apps/commerce-core/integration-tests/pos/tenders.spec.ts`
- **#1 어설션 추가**: `receipt_id/receipt_no` 응답 존재 + `retrieveOrder.metadata.receipt_{id,no}` 일치.
- **#6 어설션 추가**: `t1.receipt_id !== t2.receipt_id` + `metadata.receipt_{id,no} === t2.data.receipt_{id,no}` (최신 갱신).

### `apps/commerce-core/src/admin/widgets/meros-title.tsx` (신규)
```tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { useLayoutEffect } from "react";

const TITLE = "Meros Admin";

const MerosTitleWidget = () => {
  useLayoutEffect(() => {
    document.title = TITLE;
    try {
      Object.defineProperty(document, "title", {
        get: () => TITLE,
        set: () => {},
        configurable: true,
      });
    } catch { /* 이미 적용됨 */ }
  }, []);
  return null;
};

export const config = defineWidgetConfig({
  zone: ["topbar", "login.before"],
});
export default MerosTitleWidget;
```
- `topbar` = Medusa 2.17 의 **대시보드 전역** 상단 zone (`/app/**` 모든 페이지).
- `login.before` = 미인증 로그인 화면.
- **핵심 3줄** = `Object.defineProperty({ get, set: noop, configurable })` · 이후의 모든 `document.title = "X"` 할당은 조용히 무시 → 한 번 설치로 끝.

### `apps/commerce-core/src/admin/widgets/meros-brand.tsx`
`document.title` 책임 위임 (`prevTitle` 변수 + cleanup line 삭제). 로그인 화면의 로고 배치 · AvatarBox 숨김 CSS 책임만 유지.

---

## 3. 검증

### Build
- Backend **4.42s** · Frontend **16.50s** · **PASS**

### Unit (24/24 PASS)
`receipt-snapshot(6) + preorder-dp-math(10) + cash-provider(3) + edc-manual-provider(5)` = 24.

### Integration (9/9 PASS)
```
✓ #1 cash tender captures a payment_collection · [M0-1105-K] order.metadata.receipt_id/receipt_no 저장 (683 ms)
✓ #2 edc tender missing approval_code returns 400 · [M0-1105-F] 400 뒤 collection 0건 (711 ms)
✓ #3 preorder with dp_percent=50 computes amount = total * 50/100 (751 ms)
✓ #4 takeaway fulfill decrements inventory stocked_quantity (861 ms)
✓ #5 preorder fulfill transitions stage without inventory decrement (548 ms)
✓ #6 two tenders on one order create two payment_collections and aggregate expected_by_method (649 ms)
✓ #7~#9 [M0-1105-E] settings wiring (3건)
Tests: 9 passed, 9 total
```

### 산출물 기동
```
BOOT OK unknown :9997
✔ Server is ready on port: 9997 – 7110ms
$ curl -sI /health → HTTP/1.1 200 OK
```

### Playwright 4 경우 (탭 제목)
```json
{
  "results": [
    { "name": "login-before", "title": "Meros Admin", "ok": true },
    { "name": "dashboard-after-login + route-nav", "title": "Meros Admin", "ok": true },
    { "name": "new-tab-direct-app", "title": "Meros Admin", "ok": true },
    { "name": "refresh", "title": "Meros Admin", "ok": true }
  ],
  "allPassed": true
}
```

### CI (PR #193) · **전부 그린**
- ✅ `markers-and-forbidden` 7s — [log](https://github.com/CuriocityDevAi/storeport/actions/runs/42305864392/job/128194874121)
- ✅ `check` (feature-map) 13s — [log](https://github.com/CuriocityDevAi/storeport/actions/runs/42305864334/job/128194873636)
- ✅ `changes-filter` 9s
- ✅ `pos-integration` 1m48s — [log](https://github.com/CuriocityDevAi/storeport/actions/runs/42305864392/job/128194953344)
- ⏭️ docker-smoke-{anchor,commerce-core,wing} · wrangler-check-care-agent (skipping · 변경 범위 밖)

금지 영역 변경 **0** (`medusa-config.ts` · `readFileSync` 0).

---

## 4. 산출물

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/193
- **브랜치**: `feat/m0-1105-k-receipt-meta-tab-title` (base = `main @ 9e8f2ba`)
- **커밋**: `97a6a1f` — `feat(pos/admin): receipt 메타 저장 + 탭 제목 영구 "Meros Admin" (M0-1105-K)` · 4 파일 · +118/-6

---

## 5. 다음 후보

- 머지 후 앱 (agilo-medusa-pos-fork) 쪽 M1-1105-? 라운드: 주문 상세의 영수증 섹션을 서버 응답 (`metadata.receipt_id`) 으로 복원. Mismatch #5 전체 종결.
- Admin "Receipt configuration" sub-page (tax label PBJT/PPN 선택 · footer · logo_mode) — Kyu 결정 대기.
- stubs/*.ts 주석을 "API 명세 (stubbed)" 로 리프레이즈 (M0-1105-H 다음 후보).
