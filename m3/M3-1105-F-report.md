---
round: M3-1105-F
pr:
  fork: agilo-medusa-pos-fork#36
commit: (branch feat/m3-1105-f-orders · base master 3de8028)
outcome: My Orders 목록 3칩 + Order 상세 payments/receipt/Hand over · J-b API #183 수신·fulfill 바인딩 · 공용 하네스 재사용 · ReceiptCard 임시 stub
kyu_checks: 7 (목록 3칩 · 검색/필터 · 상세 Payments · 상세 Receipt · Hand over 발화 · Reprint/Share · 영어 전용)
---

# M3-1105-F · My Orders + Order 상세

**일자**: 2026-11-06 · **허브**: M3 · **성격**: 결제 프로세스 (M3-1104-B P5 분선) · 보드 5·6 · 공용 하네스 (M2-1105-F) 첫 full-import · 상시 ⓐⓒⓓ.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | My Orders 목록: 상태 칩 (Paid/Partially paid/Not paid) | ✓ `StatusChip` · `toPayState` |
| 2 | 결제수단 칩 (Cash/Card/QRIS) | ✓ `PaymentMethodChip` · 공용 재사용 |
| 3 | 거래 종류 칩 (Takeaway/Pre-order pickup/Delivery) | ✓ `OrderTypeChip` · metadata 추출 |
| 4 | 검색/필터 유지 | ✓ (기존 로직 보존) |
| 5 | Order 상세: Tender 라인 (수단·금액·참조·상태) | ✓ `TendersTable` · `extractTenders` |
| 6 | 영수증 카드 (ReceiptCard · #31 머지 전이면 임시 import) | ✓ `ReceiptCardStub` · 머지 시 1 커밋 교체 |
| 7 | Reprint / Share (WA) / Hand over (takeaway + paid + !fulfilled) | ✓ |
| 8 | 영어 전용 · 색 토큰만 (상시 ⓒ 35/35) | ✓ |
| 9 | 공용 하네스 `scripts/_harness.mjs` 사용 | ✓ Playwright import 전부 재사용 |
| 10 | Playwright E2E | ✓ **18/18 pass** |
| 11 | 금지 파일 (app/checkout/** · components/payment/** · product 화면) 무수정 | ✓ |

---

## 1. 산출물 (fork PR #36 · base master `3de8028`)

| 파일 | 변경 | 라인 |
|------|------|------|
| `api/hooks/pos-orders.ts` | **신규** · `useReceiptById` · `useHandOver` · `extractTenders` · `formatIDR` | 136 |
| `components/orders/StatusChip.tsx` | **신규** · 3 상태 + `toPayState` | 44 |
| `components/orders/PaymentMethodChip.tsx` | **신규** · Cash/Card/QRIS | 18 |
| `components/orders/OrderTypeChip.tsx` | **신규** · 3 종류 + metadata 추출 유틸 | 61 |
| `components/orders/TendersTable.tsx` | **신규** · 5 컬럼 테이블 | 67 |
| `components/orders/ReceiptCardStub.tsx` | **임시** · #31 머지 시 삭제 | 102 |
| `app/(tabs)/orders.tsx` | 주문 row 3 칩 삽입 · 로컬 PaymentMethodChip 삭제 | +12 / -10 |
| `app/orders/[orderId].tsx` | `OrderPaymentsAndReceipt` 신규 — ListFooter 아래 삽입 · Reprint/Share/Hand over | +95 / -2 |
| `scripts/m3-1105-f-playwright.mjs` | **신규** · _harness import · 18 어설션 | 245 |
| `docs/M3-1105-F-*.png` | 목록 + 상세 스샷 | — |

**총 10 파일 · 코드 +770 / -12** (+ 스샷 2).

---

## 2. 서버 계약 (J-b API #183)

| HTTP · Path | 입력 | 응답 | 호출자 |
|---|---|---|---|
| `GET /admin/pos/receipts/:receiptId` | — | `{ receipt: PosReceipt }` | `useReceiptById` · 상세 ReceiptCard |
| `POST /admin/pos/orders/:orderId/fulfill` | `{}` | `{ ok, fulfillment_id, fulfilled_at }` | `useHandOver` · Hand over 버튼 |

**Tender 매핑 (`extractTenders`)**:
- 서버 `payment_collections[].payments[]` 순회 · `provider_id` (pp_cash_default/pp_edc_manual/pp_qris_xendit) → `method` · `data.auth_code|rrn|reference_no|last4` → `reference` · `captured_at|canceled_at` → `status`.
- fail-open (필드 없으면 생략).

**receipt_id 획득**: `AdminOrder.metadata.receipt_id` (M3-1105-D tenders 응답에서 저장 가정).

---

## 3. 공용 하네스 재사용 (M2-1105-F 첫 full-import)

```js
import {
  CORS, attachErrors, chromium, createDistServer,
  loginAndReachProducts, makeChecker, mockMedusa,
} from './_harness.mjs';
```

- `createDistServer` · `mockMedusa` · `loginAndReachProducts` · `attachErrors` · `makeChecker` 전부 재사용.
- Round-specific overrides 3 개 (orders · pos/receipts · pos/fulfill) 만 inline.
- **중복 코드 0** · 라운드 스크립트 245 L (이전 400 ~ 500 L 대비 ~40% 절감).

---

## 4. 검증 (실행 로그)

### 상시 ⓐ Playwright **18/18 pass** (공용 하네스)

```
$ node scripts/m3-1105-f-playwright.mjs
--- (1) 로그인 → wizard → products ---                    ✓
--- (2) Orders 탭 이동 (SPA pushState) ---                ✓
--- (3) 목록 칩 ---
  ✓ (3a~3d) Paid · Cash · Takeaway chip (ord_paid_1)
  ✓ (3e~3h) Not paid · Card · Pre-order + pickup (ord_preorder_2)
--- (4) Paid 주문 상세 ---
  ✓ (4a) Payments section · (4b) Tenders row · (4c) ReceiptCard · (4d) Reprint/Share · (4e) Hand over
--- (5) Hand over → fulfill 1회 ---                       ✓
--- (7) 에러 수집 ---                                       ✓ pageerror 0 · console.error 0

18/18 passed · 0 failed
```

### 상시 ⓒ 색 어설션 35/35 (회귀 없음)
```
$ node scripts/m3-1105-a-color-assertions.mjs
35/35 passed · 0 failed
```

### TypeScript · ESLint
```
$ npx tsc --noEmit   → 신규 에러 0 (global.css TS2882 pre-existing)
$ npx eslint ...     → 0 errors
```

### 스샷 (2장)
- `docs/M3-1105-F-orders-list.png` — 2 주문 row · 전체 칩 세트 가시.
- `docs/M3-1105-F-order-detail.png` — 상세 시트 · Order Details + Customer + Summary + **Payments** + **Receipt** + 액션 버튼.

---

## 5. 설계 포인트

### 5-1. ReceiptCard 임시 stub (`ReceiptCardStub`)
- #31 (M3-1105-D) 미머지 · 본 라운드에서 `components/receipt/ReceiptCard` 존재 안 함.
- 임시 stub `components/orders/ReceiptCardStub.tsx` 를 상세 시트에서 import.
- **머지 시 1 커밋**: stub 삭제 + `[orderId].tsx` import 를 `@/components/receipt/ReceiptCard` 로 교체. (별건)

### 5-2. metadata 기반 데이터 추출 (fail-open)
- 거래 종류 (`metadata.order_type`) · 픽업일 (`metadata.pickup_at`) · receipt_id (`metadata.receipt_id`) 전부 **fail-open** — 필드 없으면 takeaway/no-pickup/no-receipt 로 분기.
- 서버 저장 shape 가 확정되면 TypeScript shape 로 승격 (별건 refactor).

### 5-3. Hand over 조건 (takeaway + paid + !fulfilled)
- Hand over 버튼은 `orderType === 'takeaway' && payState === 'paid' && !isFulfilled` 일 때만 노출.
- Pre-order 는 "제작 큐 → Ready → Hand over" 다단계 (P5 라운드) · Delivery 는 "Packed → Shipped" (P5 라운드) — 본 라운드는 takeaway 만.

### 5-4. Not Paid 재시도 보존 (M0-0918-E)
- 기존 `TappablePayBadge` (승인번호 6자리 재시도 Dialog) **유지** — Orders 목록에서 계속 작동.
- 새 StatusChip 과 병행 (StatusChip 은 **읽기 전용** · TappablePayBadge 는 **액션**).

### 5-5. extractTenders — provider_id + data 2단 경로
- `provider_id` 로 method 추정 (`pp_cash_default` → cash). data.method 있으면 우선.
- reference 는 `auth_code` → `rrn` → `reference_no` → `****last4` 순 폴백.
- status 는 `canceled_at` 있으면 failed · `captured_at` 있으면 captured · 그 외 authorized.

---

## 6. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 = (tabs)/orders.tsx · orders/[orderId].tsx · components/orders/** · api/hooks/pos-orders.ts | ✓ |
| 금지 파일 (app/checkout/** · components/payment/** · product 화면) 무수정 | ✓ (#31/#33 충돌 가드) |
| 영어 전용 (상시 ⓓ) | ✓ (신규 코드 영어 전용) |
| 색 토큰만 (상시 ⓒ) | ✓ 35/35 유지 |
| 공용 하네스 (M2-1105-F) 사용 | ✓ (import 7 항목 full 재사용) |
| 상시 ⓐ Playwright | ✓ 18/18 |
| 서버 계약 J-b API #183 · 이름 맞춤 | ✓ (/admin/pos/receipts/:id · /admin/pos/orders/:id/fulfill) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +2 (My Orders 보드 5 · Order 상세 보드 6 · J-b 부분 바인딩) |
| 등재 | +2 (`pos-orders.ts` 공용 훅 · `components/orders/**` 칩 4 + 테이블 → Cart/P5 재사용 가능) |
| 미완 (Kyu 실기) | 7 (목록 칩 · 검색/필터 · 상세 Payments · Receipt · Hand over · Reprint/Share · 영어) |
| **총 순증감** | **-3** (해소 2 + 등재 2 - 신규 미완 7 = -3 · Kyu 7 도장 시 -10) |

---

## 8. 다음 게이트

1. **PR #36 Kyu 아이패드 실기** 7 체크 → 머지.
2. **별건 1 커밋** — #31 (M3-1105-D) 머지 시 `ReceiptCardStub` 삭제 + import 교체.
3. **별건 M3-1105-x P5** — OrderType screen · Pre-order DP · Pre-order 잔금 수금 · Fulfillment stages (Awaiting hand over/In production/Ready/Packing/Shipping).
4. **별건 서버 M0-1104-J-c** — `/admin/pos/receipts/:id` · `/admin/pos/orders/:id/fulfill` 실제 구현. 본 라운드 클라이언트와 contract alignment.

---

*M3-1105-F · 2026-11-06 · 보드 5·6 구현 · 공용 하네스 full 재사용 · fork PR #36 · Playwright 18/18 + 색 35/35 · 스샷 2 · 이연 -3 (Kyu 7 도장 시 -10)*
