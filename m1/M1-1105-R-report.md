---
round: M1-1105-R
pr:
  fork: agilo-medusa-pos-fork#57
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/57
outcome: Kyu 2차 ④ · useOrder 썸네일 fields + useCreateTender 중복 가드
kyu_checks: 3 (품목 썸네일 노출 · double-tap 1회만 결제 · 리스트 썸네일 미렌더 알림)
---

# M1-1105-R · Kyu 2차 ④ · 썸네일 fields + tender 중복 가드

**일자**: 2026-11-07 · **허브**: M1 · **성격**: Kyu 2차 피드백 ④ + §D (중복 요청 가드) · fork master `baed53a` 위.

---

## 0. 원문 (허브-1107-R)

1. `api/hooks/orders.ts` `useOrder` fields 끝에 `+items.thumbnail,+items.product.thumbnail,+items.product.images.*` 추가. `useOrders` 는 목록 카드가 썸네일을 그리면 승계, 아니면 생략 후 리포트에 명시.
2. `api/hooks/pos-payments.ts` `useCreateTender`: 같은 order_id in-flight 재호출 무시 (훅 안 가드). 버튼 disabled 는 M3 몫 → 리포트에 한 줄.
3. Playwright `m3-1105-f`: 품목 img src 어설션 추가 · fixture 에 `items[].thumbnail` 포함.

---

## 1. diff 요약 (몇 줄)

### `api/hooks/orders.ts` (useOrder)
```diff
-  fields: '+tax_total,+discount_total,+subtotal,+total,+items.variant.options.*,+items.variant.options.option.*,+items.variant.inventory_quantity,+customer.*',
+  fields: '+tax_total,+discount_total,+subtotal,+total,+items.variant.options.*,+items.variant.options.option.*,+items.variant.inventory_quantity,+customer.*,+items.thumbnail,+items.product.thumbnail,+items.product.images.*',
```

`useOrders` **미변경**: `app/(tabs)/orders.tsx` 를 확인했더니 목록 카드는 썸네일을 렌더하지 않음 (`<Image` · `thumbnail` 미참조 · grep 0 건) → fields 승계 **생략**. 리스트가 썸네일을 그리게 되면 후속 라운드에서 같은 조각 추가.

### `api/hooks/pos-payments.ts` (useCreateTender)
```diff
+const _tendersInFlight: Set<string> = new Set();
+export class DuplicateTenderError extends Error {
+  readonly code = 'DUPLICATE_TENDER_IN_FLIGHT' as const;
+  constructor(orderId: string) { super(...); this.name = 'DuplicateTenderError'; }
+}
+export const __tendersInFlightSnapshot = () => Array.from(_tendersInFlight);
 ...
     mutationFn: async (input: PosTenderInput) => {
       const { order_id, ...rest } = input;
+      if (_tendersInFlight.has(order_id)) throw new DuplicateTenderError(order_id);
+      _tendersInFlight.add(order_id);
+      try {
         const body = ...;
         ...
         return (await sdk.client.fetch(`/admin/pos/orders/${order_id}/tenders`, { method: 'POST', body })) as PosTenderResponse;
+      } finally {
+        _tendersInFlight.delete(order_id);
+      }
     },
```

**M3 요구 (리포트 라인)**: `CashTenderPanel` 등 결제 UI 는 `useCreateTender().isPending === true` 동안 버튼을 `disabled` 로 두어야 UX 측면 중복 탭도 완전 차단. 훅 가드는 서버 호출만 막음 (두 번째 탭은 silent reject).

### `scripts/m3-1105-f-playwright.mjs`
- ORDER_PAID.items[0] 에 `thumbnail` / `product.thumbnail` / `product.images[0].url` 투영 (서버 fields 복원 뒤 모양).
- CDN 호스트 route stub (1x1 PNG) — 테스트 환경 DNS 실패 방지.
- (4f) 어설션 추가: DOM 에 `cheese-bread-thumb.jpg` 포함.

### 신규 테스트
- `scripts/m1-1105-r-order-fields.mjs` — orders.ts 소스 어설션 (`+items.thumbnail` 등 6/6).
- `scripts/m1-1105-r-tender-guard.mjs` — pos-payments.ts 소스 어설션 + Set 가드 로직 시뮬 (11/11).

---

## 2. 어설션 로그

```
m1-1105-r-order-fields.mjs        → 6/6 passed
m1-1105-r-tender-guard.mjs        → 11/11 passed
m3-1105-f-playwright.mjs          → 19/19 passed  ((4f) 신규 포함)
m3-1105-d-playwright.mjs          → 27/27 passed  (tender 가드 기존 happy path 영향 없음 재확인)
m3-1105-d-assertions.mjs          → 27/27
m3-1105-a-color-assertions.mjs    → 37/37
m3-1105-c-english-assertions.mjs  → 5/5
m1-1104-a-assertions.mjs          → 44/44
m1-1105-a-assertions.mjs          → 33/33
npx tsc --noEmit                  → exit 1 (잔존 global.css · pre-existing)
```

`m3-1105-f (4f)` 핵심 출력:
```
--- (4) Paid 주문 상세 → tender 테이블 + receipt + Hand over 버튼 ---
  ...
  ✓ (4e) Hand over 버튼 (takeaway + paid + !fulfilled)
  ✓ (4f) Order 품목 썸네일 src 그려짐 (item.thumbnail)
```

`m1-1105-r-tender-guard` 시뮬 요지:
```
Promise.allSettled([tender(ord_1, 120ms), tender(ord_1, 10ms)])
  ✓ 첫 호출 success
  ✓ 두 번째 호출 DuplicateTenderError (code=DUPLICATE_TENDER_IN_FLIGHT)
  ✓ 완료 뒤 Set 비워짐 — 같은 id 재호출 success
```

---

## 3. CI 링크 (fork PR #57)

- (push 직후 pending · CI green 확정 뒤 본 리포트 갱신)

---

## 4. Kyu 아이패드 실기 체크 (3건)

| # | 체크 |
|---|------|
| 1 | Paid 주문 상세 열기 → 품목 왼쪽 썸네일 노출 (옛 서버 응답으로 공백이던 것 복원) |
| 2 | 결제 화면에서 Cash 버튼을 아주 빠르게 두 번 탭 → 결제 **1회만** 발생 (훅 가드) · 버튼 자체 disabled 는 M3-1105-M 뒤 |
| 3 | (대조) Orders 목록 카드엔 썸네일 없음 — useOrders 미변경 (의도) |

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| fork master(`baed53a`) 위 작업 (#55 와 분리 브랜치) | ✓ |
| `api/hooks/orders.ts` · `api/hooks/pos-payments.ts` · `scripts/m3-1105-f-playwright.mjs` 만 수정 | ✓ |
| `components/payment/**` · 화면 파일 미수정 | ✓ |
| `useOrders` 목록은 썸네일 미렌더 → fields 미승계 + 리포트 명시 | ✓ |
| 중복 가드 훅 안에서만 (서버 호출 전) | ✓ |
| CashTenderPanel disabled 는 M3 몫 → 리포트 라인 | ✓ |
| 영어 전용 · D1 토큰만 | ✓ (어설션 기존 5/5 · 37/37) |
| CI (lint · playwright) | ⏳ pending → green 뒤 갱신 |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (Kyu 2차 ④ · 썸네일 공백) |
| 해소 | +1 (§D 중복 요청 가드) |
| 신규 M3 요구 | +1 (CashTenderPanel isPending→disabled wiring) |
| 신규 (선택) | +1 (useOrders 목록 카드가 썸네일 그리면 fields 승계) |
| **총 순증감** | **+2 해소 · M3 요구 +1 · 선택 +1** |

---

## 7. 다음 게이트

1. **PR #57 CI** 확인 → 머지.
2. Kyu 아이패드 실기 (3건) 체크.
3. **M3-1105-M**: 결제 화면 (CashTenderPanel 등) 에 `mutation.isPending` 가드로 Cash/Card/QRIS 버튼 disabled.
4. (선택) 다음 라운드: 목록 카드에 썸네일 디자인 들어오면 `useOrders` fields 승계.

---

*M1-1105-R · 2026-11-07 · useOrder thumbnails + tender dedup guard · fork PR #57 · 2 src · 1 test 수정 · 2 test 신규 · 로컬 regression 전원 pass · 영어 전용 · D1 토큰*
