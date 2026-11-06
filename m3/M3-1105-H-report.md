---
round: M3-1105-H
pr:
  fork: agilo-medusa-pos-fork#31 (M3-1105-D 수정) · #36 (M3-1105-F 수정)
commit: (branches feat/m3-1105-d-p2-cash e76c9a0 · feat/m3-1105-f-orders 38a52c7 · rebased on master 9e99354)
outcome: R0-1105-L 지적 contract 불일치 4건 교정 + 공용 types/receipt.ts + fixtures/pos-*.json · 어설션/Playwright 재PASS
kyu_checks: 0 (서버 contract 정합 · Kyu 실기는 R0 승인 뒤 머지 시점)
---

# M3-1105-H · #31/#36 서버 contract 정렬

**일자**: 2026-11-07 · **허브**: M3 · **성격**: R0-1105-L REQUEST 수렴 · 신규 규약 "mock 은 서버 실응답 fixture 로" 정립 · 상시 ⓐⓒⓓ.

---

## 0. 안건 ↔ 상태

| # | R0-1105-L 지적 / 요구 | 상태 |
|---|---|---|
| 1 | 영수증 경로 `GET /admin/pos/orders/:id/receipts/:rid` → **`GET /admin/pos/receipts/:id`** | ✓ (#31 · `useReceipt(receiptId)` · #36 `useReceiptById`) |
| 2 | tenders body/response → **서버 shape** (`{provider_id, input: {received_amount}, amount?, order_type?}` / `{ok, order_id, provider_id, amount, order_type, payment_collection_id, payment_session_id, payment_id, receipt_id, receipt_no, method}`) · 거스름돈 = 앱 계산 | ✓ (#31 · `useCreateTender` · `computeChange`) |
| 3 | 공용 `types/receipt.ts` · 서버 snapshot shape 그대로 (store/header/footer/cashier/items/subtotal/discount_total/tax/grand_total/tenders/order_type/preorder/labels) · ReceiptCard 소비 · stub 삭제 | ✓ (#31 신규 · #36 import 교체 · stub 삭제) |
| 4 | provider 상수 **`pp_edc_manual_default`** · **`pp_xendit_qris_default`** (이전 `pp_edc_manual` · `pp_qris_xendit`) | ✓ (#31 `PROVIDER_EDC_MANUAL` · `PROVIDER_QRIS_XENDIT` · #36 `extractTenders` prefix 매칭 교정) |
| 5 | #36 은 `order.metadata.receipt_id` (M0-1105-K 저장) 유지 | ✓ (useReceiptById 호출 입력 — 기존 로직 보존) |
| 6 | **mock 은 서버 실응답 fixture 로** · 앱 기대값 발명 금지 | ✓ (`fixtures/pos-tender-cash-response.json` · `pos-receipt-response.json` · `pos-tender-400-response.json`) |

---

## 1. 산출물 (2 PR 수정 · base master `9e99354`)

### 1-1. PR #31 (feat/m3-1105-d-p2-cash · amended)
| 파일 | 역할 |
|------|------|
| **`types/receipt.ts`** | **신규** · 서버 실 snapshot shape 단일 진실 (#31+#36 공유) |
| `api/hooks/pos-payments.ts` | body/response · provider 상수 · `useReceipt(receiptId)` · `computeChange` |
| `components/receipt/ReceiptCard.tsx` | `Receipt` 소비 · snapshot 렌더 · reprint watermark |
| `components/payment/SuccessReceiptAnim.tsx` | `receipt: Receipt` 타입 수용 |
| `app/checkout/tender-cash/[draftOrderId].tsx` | `{provider_id, input: {received_amount}}` 전송 · 거스름돈 앱 계산 |
| `app/checkout/success/[orderId].tsx` | `useReceipt(receiptId)` · snapshot.store.name/grand_total/footer 참조 |
| `fixtures/pos-tender-cash-response.json` | **신규** · 서버 tenders 응답 |
| `fixtures/pos-receipt-response.json` | **신규** · 서버 receipt + snapshot |
| `fixtures/pos-tender-400-response.json` | **신규** · 400 에러 응답 (edc/cash) |
| `scripts/m3-1105-d-playwright.mjs` | `_harness.mjs` + fixtures 로 재작성 |

### 1-2. PR #36 (feat/m3-1105-f-orders · rebased on #31 · amended)
| 파일 | 역할 |
|------|------|
| `api/hooks/pos-orders.ts` | `useReceiptById` → `Receipt` 반환 · `extractTenders` prefix 매칭 교정 · 로컬 PosReceipt 삭제 |
| `components/orders/ReceiptCardStub.tsx` | **삭제** |
| `app/orders/[orderId].tsx` | 공용 `components/receipt/ReceiptCard` import · onShare snapshot 소비 |
| `scripts/m3-1105-f-playwright.mjs` | `fixtures/pos-receipt-response.json` 로드 · `order.metadata.receipt_id` 동기화 |

**금지 파일 무수정** (양 PR): app/(tabs)/products.tsx · app/product-details.tsx · setup-wizard · lib/printer · 공용 scripts (`_harness.mjs` · `m3-1105-a-color-assertions.mjs`).

---

## 2. 서버 contract 대조표 (단일 소스 · 양 PR 공통)

출처: `storeport/apps/commerce-core/src/api/admin/pos/` + `src/modules/receipt/service.ts (buildSnapshot)` + `integration-tests/pos/tenders.spec.ts`.

### 2-1. POST `/admin/pos/orders/:id/tenders`

| 필드 | 이전 (앱) | **지금 (서버)** | ✓ |
|---|---|---|---|
| body.provider_id | `pp_cash_default` | 동일 (+ `pp_edc_manual_default` · `pp_xendit_qris_default`) | ✓ |
| body.received_amount | **top-level** | **`body.input.received_amount`** (nested) | ✓ |
| body.amount | 없음 | optional (생략 시 서버가 order.total 산정 · preorder=DP%) | ✓ |
| body.order_type | 없음 | optional (`takeaway\|preorder\|delivery`) · 지정 시 order.metadata 저장 | ✓ |
| res.ok | 없음 | `true` | ✓ |
| res.tender_id | 가정 | **없음** (대신 payment_id · payment_collection_id · receipt_id) | ✓ |
| res.change | **가정** (서버 필드로) | **없음** · 앱이 `received − amount` 계산 (`computeChange`) | ✓ |
| res.status | 가정 (`captured\|authorized\|failed`) | 없음 · 성공/400 분기만 | ✓ |
| res.payment_collection_id | 없음 | `pay_coll_...` | ✓ |
| res.payment_session_id | 없음 | `pay_sess_...` | ✓ |
| res.payment_id | 없음 | `pay_...` | ✓ |
| res.receipt_no | 없음 | `R-YYMMDD-NNNN` | ✓ |
| res.method | 없음 | `cash\|card\|qris` (provider 로부터 derive) | ✓ |

### 2-2. GET 영수증 단건

| 항목 | 이전 (앱) | **지금 (서버)** | ✓ |
|---|---|---|---|
| 경로 | `/admin/pos/orders/:id/receipts/:rid` | **`/admin/pos/receipts/:id`** | ✓ |
| 응답 wrapper | `{ receipt: {...} }` 평면 | `{ receipt: Receipt }` · Receipt = 전체 row | ✓ |

### 2-3. Receipt row shape (types/receipt.ts)

```ts
Receipt = {
  id, order_id, receipt_no, kind, 
  snapshot: {
    store: {name?, address?, phone?, npwp?},
    header, footer, logo_mode,
    cashier: {id?, name?} | null,
    register_session_id, order_display_id,
    items: [{title, variant_title, quantity, unit_price, line_total, discount}],
    subtotal, discount_total,
    tax: {show: false} | {show: true, label, rate_pct, amount},
    grand_total,
    tenders: ReceiptTender[],   // method 별 optional 필드
    order_type, preorder: {...} | null,
    labels: {subtotal, discount, total, received, change, approval, copy_watermark, refund_watermark},
  },
  delivered_via, reprint_count, parent_receipt_id,
  issued_at, cashier_user_id, register_session_id, public_token,
}
```

**모든 필드 ✓ 서버 정본 (buildSnapshot) 과 동일**. 서버 shape 변경 시 `types/receipt.ts` 1 파일만 갱신 → #31 + #36 자동 적용.

### 2-4. Provider 상수

| 용도 | 상수 | 리터럴 |
|------|------|--------|
| Cash | `PROVIDER_CASH` | `pp_cash_default` |
| EDC (manual approval) | **`PROVIDER_EDC_MANUAL`** | **`pp_edc_manual_default`** (이전 잘못된 `pp_edc_manual` 교정) |
| QRIS (Xendit) | **`PROVIDER_QRIS_XENDIT`** | **`pp_xendit_qris_default`** (이전 잘못된 `pp_qris_xendit` 교정) |

서버 `ALLOWED_PROVIDERS` Set 리터럴과 **문자 단위 일치**.

---

## 3. 신규 규약 — "mock 은 서버 실응답 fixture 로"

### 3-1. Fixture 출처
- `fixtures/pos-tender-cash-response.json` ← storeport `integration-tests/pos/tenders.spec.ts #1` (cash tender happy path) 응답 shape.
- `fixtures/pos-receipt-response.json` ← storeport `#8·#9` (GET receipt after cash tender) 응답 + `receiptSvc.buildSnapshot` 출력.
- `fixtures/pos-tender-400-response.json` ← storeport `#2·#4` (400 validation errors) 응답 shape + 영어 메시지.

각 fixture 는 `_source` · `_note` · `_generated` metadata 필드 보유 (Playwright 가 `stripMeta` 로 제거 후 응답).

### 3-2. 규약 효과
- 앱 기대 shape 발명 불가 — 서버 변경이 fixture 로 들어오지 않으면 테스트가 깨짐.
- 서버 integration test 와 **같은 응답** 으로 E2E — 서버·클라 contract drift 자동 감지.
- 신규 round 에선 M0 에 fixture 복사 요청 or 통합 테스트 로그 copy — 앱 쪽에서 임의 shape 생성 금지.

---

## 4. 검증 (실행 로그)

### PR #31 — Playwright 22/22 pass
```
$ node scripts/m3-1105-d-playwright.mjs
=== RUN · happy ===            ✓ 17/17 (fixture 응답 소비 · Change 앱 계산 · ReceiptCard snapshot 렌더)
=== RUN · 400 fail ===         ✓  2/2  (fixture 400 응답 · Payment failed 토스트)
+ 신규 console.error 0 · pageerror 0

22/22 passed · 0 failed
```

### PR #36 — Playwright 18/18 pass
```
$ node scripts/m3-1105-f-playwright.mjs
--- (1~3) 로그인/wizard/products/orders/칩 × 2 주문 ---   ✓ 10
--- (4) Paid 상세 (Payments · ReceiptCard snapshot · Hand over) ---  ✓ 5
--- (5) Hand over → fulfill 1회 ---                       ✓ 1
--- (7) 에러 수집 ---                                      ✓ 2

18/18 passed · 0 failed
```

### 공통
```
$ node scripts/m3-1105-a-color-assertions.mjs      → 35/35 passed
$ npx tsc --noEmit                                 → 신규 에러 0 (global.css TS2882 pre-existing)
$ npx eslint ...                                   → 0 errors
```

---

## 5. 설계 포인트

### 5-1. 공용 타입 1 파일 · 2 PR 공유
- `types/receipt.ts` 는 #31 에서 신설 · #36 은 #31 branch 위에 rebase 해 import.
- 서버 snapshot 변경 시 이 1 파일만 갱신 → 양 PR 자동 수용.
- #31 머지 뒤 #36 은 master 로 rebase · 그대로 shared type 소비.

### 5-2. Change 는 앱 계산 (서버 응답 없음)
- 서버 `/tenders` 응답에 `change` 필드 **없음** (snapshot.tenders[].change 는 서버 build 결과로 있음).
- 앱 `computeChange(received, amount)` 유틸: 사용자 받은 돈 − 서버가 정한 amount (이게 draft total 과 다를 수 있음 — preorder DP%).
- UI 는 이 둘 다 노출: tender-cash 패널의 "Change" (실시간 계산) + success/상세의 ReceiptCard 안 snapshot.tenders[].change (서버 저장값).

### 5-3. Playwright `_harness.mjs` + fixture 2-step
- M2-1105-F `_harness.mjs` 의 `mockMedusa.overrides` 로 라운드 별 응답만 주입.
- 각 override 는 fixture JSON 1개 읽고 `stripMeta` 후 응답 — 테스트 코드 안에 shape 하드코딩 없음.
- 신규 라운드엔 `fixtures/pos-<new-op>.json` 추가 + override 1 등록만.

### 5-4. ReceiptCardStub 삭제 (#36)
- 임시 stub 역할은 "#31 머지 전까지의 다리" 였음.
- 본 라운드에서 #36 을 #31 위에 rebase → 공용 `components/receipt/ReceiptCard` 즉시 사용 가능 → stub 삭제.
- #31 머지 뒤 #36 을 master 로 rebase 해도 그대로 유지.

---

## 6. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 = 각 PR 의 수정 범위 (contract 정렬) | ✓ |
| 금지 파일 (products/setup-wizard/공용 scripts) 무수정 | ✓ |
| 영어 전용 (ADDENDUM §2) | ✓ (신규 label/문구 영어 유지) |
| 색 토큰만 (상시 ⓒ) | ✓ 35/35 |
| 공용 하네스 (M2-1105-F) · 상시 ⓐ | ✓ (양 PR import) |
| 서버 contract 이름 맞춤 (M0-1104-J-b · M0-1105-K) | ✓ (대조표 2-1 ~ 2-4) |
| 신규 규약 "fixture 로 mock" | ✓ (fixtures/pos-*.json · 통합 테스트 복제) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +4 (R0-1105-L 지적 불일치 4건) |
| 등재 | +2 (공용 `types/receipt.ts` · fixture 규약 정립) |
| 미완 (Kyu 실기) | 0 (R0 재승인 뒤 머지 시점에 Kyu 체크) |
| **총 순증감** | **+6** (해소 4 + 등재 2 · Kyu 미완 0) |

---

## 8. 다음 게이트

1. **R0-1105-L 재리뷰** — 2 PR 의 "서버 contract 대조표" 섹션으로 field-by-field 승인.
2. 승인 뒤 **#31 머지** → 주인 파일들 master 반영.
3. **#36 자동 rebase** (base = master) · 재검증 → 머지.
4. **Kyu 아이패드 실기** 후속 라운드에서 (fixture 로는 shape 만 보장 · 실 서버 연결은 M0-1105-K + staging 필요).
5. **별건 fixture 유지보수** — storeport integration test 변경 시 `fixtures/pos-*.json` 동기화 (M0 라운드 의무).

---

*M3-1105-H · 2026-11-07 · R0-1105-L contract 불일치 4건 교정 · 공용 types/receipt.ts · fixture 규약 정립 · fork PR #31·#36 amended · Playwright 22/22 + 18/18 · 색 35/35 · 이연 +6 (해소 4 · 등재 2)*
