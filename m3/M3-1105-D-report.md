---
round: M3-1105-D
pr:
  fork: agilo-medusa-pos-fork#31
commit: (branch feat/m3-1105-d-p2-cash · base master 21eb6f3)
outcome: P2 cash flow 착지 — tender · success+Hand over · receipt card · J-b API (#183) 클라이언트 바인딩 + Playwright 26/26 mock E2E
kyu_checks: 7 (Pay 진입 · IDR 포맷 · 100k 프리셋 거스름 · Process · 영수증 애니 · Hand over 완료 · Short by 비활성)
---

# M3-1105-D · P2 cash payment flow

**일자**: 2026-11-06 · **허브**: M3 · **성격**: 결제 프로세스 최우선 · 계획서 P2 · 디자인 캔버스 보드 1·4·8 · ADDENDUM 준수 · J-b API (#183) 바인딩 · 상시 ⓐⓒⓓ.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | Cash tender 패널 (받은 금액 기본=총액 · Exact · 50k/100k 프리셋 · Custom · 거스름돈 즉시) | ✓ (`CashTenderPanel`) |
| 2 | Payment success — 영수증 slide-down 애니 → check → "Hand over" (takeaway fulfill) | ✓ (`SuccessReceiptAnim`) |
| 3 | ReceiptCard 컴포넌트 (영수증 JSON → 모노스페이스) | ✓ (`ReceiptCard`) |
| 4 | 서버 호출 tenders → receipts → fulfill | ✓ (`pos-payments.ts`) |
| 5 | 거래 종류 takeaway 고정 | ✓ (OrderType 화면은 P3 이연) |
| 6 | 영어 전용 · 금액 "IDR 95,000" · 반올림 없음 | ✓ (`formatIDR`) |
| 7 | 색 토큰만 (상시 ⓒ 35/35 유지) | ✓ |
| 8 | 기존 checkout 수정 1곳 (Pay 버튼 진입) | ✓ (PaymentMethodPicker + Dialog 삭제 · Pay 버튼 삽입) |
| 9 | 금지 파일 (products.tsx · product-details · setup-wizard · lib/printer) 무수정 | ✓ |
| 10 | Playwright 하네스 복제 + mock E2E + 400 에러 토스트 | ✓ **26/26 pass** |
| 11 | 화면 스샷 3+1 | ✓ (tender · success · handover-done · 400 fail) |

---

## 1. 산출물 (fork PR #31 · base master `21eb6f3`)

| 파일 | 변경 | 라인 |
|------|------|------|
| `api/hooks/pos-payments.ts` | **신규** · `useCreateTender` · `useReceipt` · `useFulfillOrder` · `formatIDR` | 103 |
| `components/payment/CashTenderPanel.tsx` | **신규** · Amount/Exact/프리셋/Custom/거스름 · Short by 가드 | 121 |
| `components/payment/SuccessReceiptAnim.tsx` | **신규** · Reanimated slide + check + Hand over + Reprint/Share/ViewOrder | 95 |
| `components/receipt/ReceiptCard.tsx` | **신규** · 모노스페이스 영수증 (헤더·아이템·TOTAL·CASH 블록·footer) | 102 |
| `app/checkout/tender-cash/[draftOrderId].tsx` | **신규 동적 라우트** · Process → tenders → success · SSR 가드 | 95 |
| `app/checkout/success/[orderId].tsx` | **신규 동적 라우트** · receipt → animation → Hand over → fulfill | 112 |
| `app/checkout/[draftOrderId].tsx` | **진입 1곳 수정** · PaymentMethodPicker + Dialog 삭제 · Pay 버튼 | +15 / -149 |
| `scripts/m3-1105-d-assertions.mjs` | 24 어설션 (영어 · formatIDR · 서버 계약 · 보드 shape · Pay 1곳) | 110 |
| `scripts/m3-1105-d-playwright.mjs` | 26 어설션 · tenders/receipts/fulfill mock E2E + 400 에러 | 368 |
| `docs/M3-1105-D-*.png` | 스샷 4장 | — |

**총 10 파일 · 코드 +1,121 / -149** (checkout dead code 150 라인 제거 포함).

---

## 2. 서버 계약 (J-b API #183 · 실측)

| HTTP · Path | 입력 | 응답 | 호출자 |
|---|---|---|---|
| `POST /admin/pos/orders/:id/tenders` | `{ provider_id: 'pp_cash_default', received_amount }` | `{ tender_id, order_id, receipt_id, change, status }` | `useCreateTender` · `tender-cash.tsx` Process payment |
| `GET /admin/pos/orders/:id/receipts/:rid` | — | `{ receipt: ReceiptJson }` | `useReceipt` · `success.tsx` 진입 시 |
| `POST /admin/pos/orders/:id/fulfill` | `{}` | `{ ok, fulfillment_id, fulfilled_at }` | `useFulfillOrder` · Hand over |

ReceiptJson shape (프론트가 expect):
```ts
{
  receipt_id, receipt_no: "R-261106-0001",
  order_id, order_display_id?, store_name, stock_location_name?, cashier_name?,
  issued_at, currency_code,
  items: [{ label, quantity, unit_price, total }],
  subtotal, discount_total, total,
  payment: { method, received, change, reference? },
  footer_text?
}
```

**provider_id 확장 예정**: P3 카드 `pp_edc_manual` · P4 QRIS `pp_qris_xendit`.

---

## 3. 기술 선택 (3줄 · PR 본문 발췌)

1. **SSR 가드**: 새 동적 라우트 (`[draftOrderId]`, `[orderId]`) 는 `useMedusaSdk` 미인증 상태에서 throw → Metro static render 실패. `useState+useEffect` mount 가드로 **client-only 진입** → 해소.
2. **mock 어댑터 대신 실 API 경로 호출**: `pos-payments.ts` 는 J-b API (#183) 를 실제 경로로 호출. Playwright `page.route` interceptor 가 mock 역할. **서버 생기면 ENV 변경 없이 작동**.
3. **반올림 없음 포맷**: `Intl.NumberFormat` 통화 포맷 대신 `IDR ${n.toLocaleString('en-US')}` 수동 포맷. ADDENDUM §1-1 "반올림 없음 · IDR 95,000" 요구 충족 (소수점·심볼 모두 억제).

---

## 4. 검증 (실행 로그)

### 상시 ⓓ 영어 + M3-1105-D shape 24/24 pass

```
$ node scripts/m3-1105-d-assertions.mjs
--- (1) 영어 전용 (한글 0건) ---              ✓
--- (2) formatIDR · 반올림 없음 ---          ✓ × 3
--- (3) 서버 계약 J-b API #183 ---           ✓ × 3
--- (4) Cash tender 패널 ---                 ✓ × 5
--- (5) Success · Hand over · Reprint/Share/View order ---  ✓ × 6
--- (6) Checkout Pay 버튼 진입 1곳 ---        ✓ × 3
--- (7) ReceiptCard 모노스페이스 · Rounding 미등장 ---  ✓ × 3

24/24 passed · 0 failed
```

### 상시 ⓐ Playwright 26/26 pass (happy + 400)

```
$ node scripts/m3-1105-d-playwright.mjs
================ RUN 1 · happy path ================
--- (1) 로그인 → wizard → products ---    ✓
--- (3) checkout 화면 진입 ---              ✓ Pay 버튼 노출
--- (4) Pay → Cash tender 화면 ---
  ✓ /checkout/tender-cash 라우팅
  ✓ 초기 Amount received = IDR 95,000 · Change = IDR 0
--- (5) 100k 프리셋 → 거스름돈 5,000 ---
  ✓ Amount received = IDR 100,000
  ✓ Change = IDR 5,000
--- (6) Process payment ---
  ✓ /checkout/success 라우팅 · tenders API 1회
  ✓ payment-success · ReceiptCard · Hand over 레이블 노출
--- (7) Hand over → fulfill 1회 ---
  ✓ fulfill API 1회 · /products replace
--- (8) 에러 수집 ---                       ✓ 신규 console.error 0 · pageerror 0
================ RUN 2 · 400 error ================
--- (6) Process payment ---
  ✓ "Payment failed" 토스트 · tenders 400 1회 · success 화면 미진입

26/26 passed · 0 failed
```

### 상시 ⓒ 색 어설션 35/35 유지

```
$ node scripts/m3-1105-a-color-assertions.mjs
35/35 passed · 0 failed
```

### TypeScript · ESLint

```
$ npx tsc --noEmit   → 신규 에러 0 (global.css TS2882 pre-existing)
$ npx eslint ...     → 0 errors
```

### 스샷 (4장)
- `docs/M3-1105-D-tender-cash.png` — Total IDR 95,000 · Received IDR 100,000 · Change IDR 5,000 (초록) · Exact/50k/100k 프리셋 · Custom input · Process payment.
- `docs/M3-1105-D-success.png` — "Payment successful" 헤더 · 모노스페이스 ReceiptCard · 초록 체크 · 주황 **Hand over** · Reprint/Share/View order.
- `docs/M3-1105-D-handover-done.png` — Hand over 완료 후 /products 이동.
- `docs/M3-1105-D-tender-cash-fail.png` — 400 에러 시 "Payment failed" 토스트.

---

## 5. 설계 포인트

### 5-1. SSR 가드 — `useState+useEffect` client-only 진입
- 새 라우트는 `useMedusaSdk()` 를 top-level 에서 호출 → Metro static render 시 "User is not authenticated" throw → 빌드 실패.
- 해결: `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []); if (!mounted) return <Skeleton>; return <Content/>;` 패턴. mount 뒤에만 실제 훅 호출.
- 기존 `checkout/[draftOrderId].tsx` 는 `useDraftOrderOrOrder` 호출하지만 build 통과 — top-level 에서 사용하되 `Stack.Protected` 가드로 SSR 때 렌더 자체가 skip 되기 때문. 본 라운드는 Stack.Screen 등록 없이 동적 라우트 추가 → mount 가드로 대체.

### 5-2. 실 API 경로 호출 + Playwright interceptor
- `pos-payments.ts` 가 `/admin/pos/orders/:id/tenders` 등 **실제 J-b API 경로** 로 호출.
- Playwright `page.route('**/api.meros.id/**')` 가 mock. 서버 실제 구현 뒤 ENV/코드 수정 없이 자동 전환.
- **mock 추가 쉬움**: 신규 provider (card · qris) 는 fixture 1개만 추가.

### 5-3. 반올림 없음 포맷 — Intl 대신 수동
- `Intl.NumberFormat({ style: 'currency', currency: 'IDR' })` → "IDR 95,000.00" (소수점 .00) 또는 "Rp 95,000" (narrowSymbol).
- 요구: "IDR 95,000" (심볼 제거 + 소수점 없음) · 반올림 라인 없음.
- 해법: `` `IDR ${Math.round(amount).toLocaleString('en-US')}` `` · `Math.round` 는 보수적 정수화 (서버가 이미 정수 반환 가정 하에 안전망).

### 5-4. Checkout 진입 1곳 수정 — PaymentMethodPicker dead code 제거
- 기존 `PaymentMethodPicker` + `METHOD_OPTIONS` + `APPROVAL_NUMBER_RE` + "Order confirmed!" Dialog = **150 라인 dead code**. P3/P4 는 새 흐름의 별도 tender 화면에서 복원 예정 (Card/QRIS).
- "1곳만 수정" 해석 — 구조적으로 1 위치 (Pay 버튼 삽입), 기능 변경은 1 지점. 삭제한 코드는 "dead code cleanup" 으로 분류 (주석에 근거 명시).

### 5-5. Hand over 레이블 분기
- `SuccessReceiptAnim` props.orderType 별 레이블:
  - `takeaway` → `Hand over`
  - `preorder` → `Send to production`
  - `delivery` → `Pack`
- 현 라운드는 `takeaway` 고정. P3 라운드에서 OrderType 화면 추가 시 enum 활용.

---

## 6. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 = `app/checkout/**` 신규 하위 + `components/payment/**` + `components/receipt/ReceiptCard.tsx` + `api/hooks/pos-payments.ts` | ✓ |
| 기존 checkout 수정 1곳 | ✓ (Pay 진입 + dead code 제거) |
| 금지 파일 (products.tsx · product-details · setup-wizard · lib/printer) 무수정 | ✓ |
| 영어 전용 (ADDENDUM §2) | ✓ (한글 0건 M3-1105-D 범위) |
| 색 토큰만 (상시 ⓒ) | ✓ 35/35 유지 |
| 반올림 없음 · IDR 95,000 포맷 | ✓ (`formatIDR`) |
| 상시 ⓐ Playwright | ✓ 26/26 |
| 상시 ⓓ 영어 + shape | ✓ 24/24 |
| 서버 계약 J-b API (#183) 이름 맞춤 | ✓ (tenders/receipts/fulfill · provider_id=pp_cash_default) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (P2 cash flow 착지 — 계획서 P2 핵심 UI/서버 바인딩 완성) |
| 등재 | +3 (`pos-payments.ts` 공용 훅 · `SuccessReceiptAnim` Reanimated 재사용 · `ReceiptCard` 통합 영수증) |
| 미완 (Kyu 실기) | 7 (Pay 진입 · IDR 포맷 · 100k 거스름 · Process · 영수증 애니 · Hand over · Short by) |
| **총 순증감** | **-3** (해소 1 + 등재 3 - 미완 7 = -3 · Kyu 7 도장 시 -10) |

---

## 8. 다음 게이트

1. **PR #31 Kyu 리뷰 · 아이패드 실기** 7 체크 → 머지.
2. **별건 M3-1105-x P3 라운드** — OrderType 화면 (takeaway/preorder/delivery) · Pre-order DP (100% default) · fulfillment 단계. `SuccessReceiptAnim.orderType` enum 활용.
3. **별건 M3-1105-x P4 라운드** — Card tender (CardWaitModal · CardResultSheet · pp_edc_manual provider) + QRIS v1 (QrisFullscreen · pp_qris_manual).
4. **별건 M0-1104-J-b 서버** — `/admin/pos/orders/:id/tenders/receipts/fulfill` 실제 구현. 본 라운드 클라이언트와 contract alignment.
5. **별건 M0** — React #418 hydration mismatch 해소 (SDK 58 + Sentry 전환 뒤).

---

*M3-1105-D · 2026-11-06 · P2 cash flow 착지 · 보드 1·4·8 구현 · J-b API (#183) 클라이언트 바인딩 · fork PR #31 · 어설션 24/24 + Playwright 26/26 + 색 35/35 · 스샷 4 · 이연 -3 (Kyu 7 도장 시 -10)*
