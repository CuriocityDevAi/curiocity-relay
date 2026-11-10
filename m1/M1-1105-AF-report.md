# M1-1105-AF 계획서 — P6 환불·보이드·분할 결제 대사표

작성일: 2026-11-10  
Medusa 버전: 2.17.2  
레포: pos-m1 (fork) · storeport (origin)

---

## §1 현재 구조 요약 (file:line)

### 1-A. 앱 결제 Tenders (Cash / Card EDC / QRIS)

| 파일 | 위치 | 역할 |
|------|------|------|
| `api/hooks/pos-payments.ts` | :19-24 | PROVIDER_CASH / PROVIDER_EDC_MANUAL / PROVIDER_QRIS_XENDIT 상수 및 ProviderId 타입 |
| `types/receipt.ts` | :10-36 | ReceiptTenderCash / ReceiptTenderCard / ReceiptTenderQris 유니온 타입 |
| `components/payment/CashTenderPanel.tsx` | :1-150 | 현금 입력, 50k·100k 프리셋, 거스름돈 계산, 선불(DP) allowPartial |
| `components/payment/CardTenderPanel.tsx` | :1-150 | EDC 수동 입력 — 은행명 / 승인번호(6자리) / 카드 끝 4자리 |
| `components/payment/PaymentMethodTabs.tsx` | — | Cash·Card·QRIS 탭 (QRIS="Coming soon") |
| `app/checkout/tender-cash/[draftOrderId].tsx` | :30-180 | 결제 화면 메인 — 탭 선택·금액 표시·제출 |
| `api/hooks/pos-payments.ts` | :106-151 | `useCreateTender()` → POST `/admin/pos/orders/{id}/tenders` |
| `api/hooks/pos-payments.ts` | :27-45 | PosTenderInput 타입 (order_id, provider_id, amount, is_balance, preorder…) |
| `api/hooks/pos-payments.ts` | :48-66 | PosTenderResponse 타입 (receipt_id, receipt_kind, preorder_stage, balance_due_after…) |

### 1-B. 서버 Tenders Route

| 파일 | 위치 | 역할 |
|------|------|------|
| `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` | :1-500+ | POST `/admin/pos/orders/:id/tenders` 핵심 — PaymentCollection 생성·재사용, PaymentSession, capturePaymentWorkflow 실행 |
| 위 파일 | :362-405 | 다중 tender 처리 — pending collection 재사용 or updatePaymentCollections or 신규 |
| 위 파일 | :194-254 | Pre-order DP: `amount = round(total * dp_percent / 100)`, balance_due 계산 |

### 1-C. 영수증 Snapshot (kind: sale / reprint / refund / void)

| 파일 | 위치 | 역할 |
|------|------|------|
| `types/receipt.ts` | :110 | `kind: 'sale' \| 'reprint' \| 'refund' \| 'void'` |
| `types/receipt.ts` | :78-119 | ReceiptSnapshot 전체 구조 (store, items, tenders[], preorder, tax/SC) |
| `components/receipt/ReceiptCard.tsx` | :111-116 | kind에 따른 워터마크 (reprint→copy_watermark, refund→refund_watermark) |
| `api/hooks/pos-payments.ts` | :64 | tender 응답의 `receipt_kind` 필드 |

### 1-D. 교대 / Z Report

| 파일 | 위치 | 역할 |
|------|------|------|
| `api/hooks/register-session.ts` | :26-45 | RegisterSession 타입 (status: open/closed/voided, z_snapshot) |
| `api/hooks/register-session.ts` | :97-117 | `useOpenRegisterSession()` → POST `/admin/register-sessions` |
| `api/hooks/register-session.ts` | :146-159 | `useXReport()` → GET `/admin/register-sessions/{id}/x-report` (실시간 금고 예상액) |
| `api/hooks/register-session.ts` | :49-72 | ReportSnapshot — totals, by_payment_method, cash_reconciliation |
| `api/hooks/register-session.ts` | :170-189 | `useCloseRegisterSession()` → POST `…/close` (counted_cash + note) → z_report inline 반환 |
| `app/register/close.tsx` | :1-122 | 교대 마감 화면 — 현금 카운트 입력, 차이 실시간 표시 |
| `app/register/z-result.tsx` | :15-62 | Z 리포트 결과 — 텍스트 복사·WhatsApp 공유 |
| `storeport/apps/commerce-core/src/api/admin/register-sessions/_helpers.ts` | :23-26 | `canceled_count / canceled_amount / refund_count / refund_amount` 집계 (read-only) |

### 1-E. Pre-order DP / 잔금

| 파일 | 위치 | 역할 |
|------|------|------|
| `types/receipt.ts` | :96-101 | snapshot.preorder: pickup_at, deposit_pct, deposit_amount, balance_due |
| `app/orders/[orderId].tsx` | :475-479 | PreorderMeta: stage('dp_paid'|'paid_full'), balance_due, deposit_amount |
| `app/checkout/tender-cash/[draftOrderId].tsx` | :38-100 | DP 흐름 — amount 생략(서버가 dp_percent로 계산), allowPartial=true |
| `app/checkout/tender-cash/[draftOrderId].tsx` | :44-67 | 잔금 흐름 — isBalance='1' params, balanceDue 금액 미리 세팅 |
| `api/hooks/pos-payments.ts` | :44 | `is_balance` 플래그 |

### 1-F. Fulfill / 재고 차감

| 파일 | 위치 | 역할 |
|------|------|------|
| `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts` | :1-250+ | POST `/admin/pos/orders/:id/fulfill` — 예약 해제, 재고 차감, createOrderFulfillmentWorkflow |
| 위 파일 | :11-40 | 3단계 재고 흐름 주석: draft→reserve→fulfill→deduct |
| 위 파일 | :38 | 잔금 미납 시 fulfill 차단 |
| `api/hooks/pos-payments.ts` | :184-210 | `useFulfillOrder()` → POST `/admin/pos/orders/{id}/fulfill` |
| `components/orders/FulfillSheet.tsx` | :1-150 | Fulfill 모달 (Pickup/Delivery 탭, 택배 필드) |
| `lib/inventory.ts` | :10-30 | `computeInventoryStatus()` — unknown/sold-out/low/in-stock 집계 |
| `lib/inventory.ts` | :33 | `LOW_STOCK_THRESHOLD = 5` |

---

## §2 Medusa 2.17 코어 대사표

> 판단 기준: 코어에 있음 = core-flows에 워크플로우 존재 · 우회 = 현재 POS가 커스텀 로직 사용 · **신규 필요** = 코어/우회 모두 없어 POS route 신규 작성 필요

| 기능 | 상태 | 코어 API / 워크플로 이름 | 근거 (node_modules 경로) | POS 현황 |
|------|------|--------------------------|--------------------------|----------|
| **결제 환불** (전체) | 코어에 있음 | `refundPaymentWorkflow` | `node_modules/@medusajs/core-flows/dist/payment/workflows/refund-payment.js` | 미구현 — 콜 필요 |
| **결제 환불** (부분) | 코어에 있음 | `refundPaymentWorkflow` (amount 파라미터 선택) | 위 동일 — `amount?: BigNumberInput` | 미구현 |
| **결제 취소/보이드** (미캡처) | 코어에 있음 | `cancelPaymentCollectionWorkflow` | `node_modules/@medusajs/core-flows/dist/payment-collection/workflows/cancel-payment-collection.js` | 미구현 |
| **주문 취소** (order cancel) | 코어에 있음 | `cancelOrderWorkflow` | `node_modules/@medusajs/core-flows/dist/order/workflows/cancel-order.js` | 미구현 — POS route 없음; Z-report는 canceled_count 집계만 존재 |
| **반품 (RMA) 시작** | 코어에 있음 | `beginReturnOrderWorkflow` | `node_modules/@medusajs/core-flows/dist/order/workflows/return/begin-return.js` | 미구현 |
| **반품 완료 (재고 복귀)** | 코어에 있음 | `createAndCompleteReturnOrderWorkflow` | `node_modules/@medusajs/core-flows/dist/order/workflows/return/create-complete-return.js` | 미구현 |
| **분할 결제** (1주문 여러 tender) | **우회** | 커스텀 — tenders route 내 pending collection 재사용 패턴 | `src/api/admin/pos/orders/[id]/tenders/route.ts:362-405` | **이미 구현됨** (pre-order DP+잔금 형태로) |
| **현금+카드 혼합 tender** | **신규 필요** | 없음 — 단일 주문에 provider 다른 2개 tender 동시 허용 UI/로직 필요 | 현재 tender route는 1회 1 provider | UI + route 검증 필요 |
| **Fulfillment 취소** | 코어에 있음 | `cancelOrderFulfillmentWorkflow` | `node_modules/@medusajs/core-flows/dist/order/workflows/cancel-order-fulfillment.js` | 미구현 |
| **환불 사유 관리** | 코어에 있음 | `createRefundReasonsWorkflow` / `deleteRefundReasonsWorkflow` | `node_modules/@medusajs/core-flows/dist/payment-collection/workflows/create-refund-reasons.js` | 미구현 |

### 보완 메모
- `cancelOrderWorkflow` 주석: "fulfillment가 취소되지 않았으면 order 취소 불가" → 보이드 플로우는 fulfill 없는 상태에서만 호출 가능
- `refundPaymentWorkflow` 입력: `{ payment_id, amount?, note?, refund_reason_id?, created_by? }` — payment_id가 필요하므로 POS 측에서 order → payment_collection → payment 체인 조회 필요
- `createAndCompleteReturnOrderWorkflow` 입력: `{ order_id, items[{ id, quantity }], … }` — 항목 단위 반품 가능, refund_amount 별도 지정 가능

---

## §3 용어 정의 제안 — POS 업계 통상 규칙 기준

| 구분 | 보이드 (Void) | 환불 (Refund) | 반품 (Return / RMA) |
|------|--------------|--------------|---------------------|
| **발생 시점** | 같은 교대(shift) 내, 결제 직후 · 고객이 아직 가게 있는 상태 | 결제 완료 후 (다음 교대 포함) | 고객이 상품을 가져와 반납 |
| **금액 범위** | 전체 취소만 | 전체 또는 부분 | 반품 수량에 따른 부분/전체 |
| **재고 복귀** | 복귀 (주문 자체 취소) | 없음 (상품 보유) | 복귀 (상품 수령 확인 후) |
| **현금 처리** | 현금 받은 경우 금고에서 환급 | 현금 환급 or 계좌이체 | 동일 |
| **영수증 kind** | `void` | `refund` | `refund` (반품 항목 명시) |
| **Z-report 반영** | canceled_count / canceled_amount | refund_count / refund_amount | refund_count / refund_amount |
| **권한 수준** | 현 캐셔 허용 (같은 교대 보증) | 매니저 PIN 권장 | 매니저 PIN 필수 |
| **Medusa 워크플로** | `cancelOrderWorkflow` | `refundPaymentWorkflow` | `createAndCompleteReturnOrderWorkflow` |
| **Fulfill 선행 조건** | Fulfill 없어야 함 | Fulfill 완료 후 가능 | Fulfill 완료 + 상품 수령 후 |

---

## §4 화면 흐름 스케치

### 4-A. 결제 화면 — 분할 결제 (현금+카드)

```
[결제 화면]
  ├── 금액 표시: 총액 150,000 / 남은 금액: 150,000
  ├── 탭: [현금] [카드] [QRIS]
  │
  ├── 첫 번째 tender (예: 카드 100,000)
  │     └── → POST /tenders { provider_id: 'pp_edc_manual_default', amount: 100000 }
  │           ← { receipt_kind: 'balance', balance_due_after: 50000 }
  │
  ├── [+ 결제 추가] 버튼 노출 (balance_due_after > 0)
  │
  └── 두 번째 tender (예: 현금 50,000)
        └── → POST /tenders { provider_id: 'pp_cash_default', amount: 50000 }
              ← { receipt_kind: 'sale', balance_due_after: 0 }
                 → 성공 화면으로 이동
```

> 현재: DP(보증금) + 잔금은 구현됨. 현금+카드 혼합은 route는 가능하나 UI에 "첫 tender 후 추가" 버튼 미구현.

### 4-B. 주문 상세 — Void / Refund 버튼 노출 규칙

```
[주문 상세 화면]
  │
  ├── 주문 상태 = paid + fulfill_없음 + 같은 교대
  │     → [보이드] 버튼 노출
  │
  ├── 주문 상태 = paid + fulfill_완료
  │     → [환불] 버튼 노출
  │       (부분 환불 가능 시 금액 입력 필드)
  │
  ├── 주문 상태 = paid + fulfill_완료 + 상품_반납
  │     → [반품] 버튼 노출
  │       (반품 수량 선택)
  │
  └── 주문 상태 = canceled / voided / refunded
        → 상태 표시만 (버튼 없음)
```

### 4-C. 영수증 kind 흐름

```
결제 성공      → receipt.kind = 'sale'
잔금 결제 완료  → receipt.kind = 'sale' (최종)
영수증 재출력   → receipt.kind = 'reprint'
보이드 완료     → receipt.kind = 'void'   (워터마크: VOID)
환불 완료      → receipt.kind = 'refund'  (워터마크: REFUND)
```

### 4-D. Z Report 반영

```
Z Report 집계 (register-sessions/_helpers.ts)
  ├── 총매출      = sum(completed orders)
  ├── 취소        = canceled_count / canceled_amount  ← 보이드 포함
  ├── 환불        = refund_count / refund_amount       ← order.refunded_total 합산
  └── 순매출      = 총매출 - 취소 - 환불
```

> 환불/반품 발생 시 `order.refunded_total`이 Medusa 코어가 자동 갱신 → 헬퍼 재집계 불필요.

### 4-E. 재고 흐름

```
보이드: cancelOrderWorkflow → 예약 해제 → 재고 복귀 (order 자체 말소)
환불:   refundPaymentWorkflow → 재고 그대로 (상품 고객 보유)
반품:   createAndCompleteReturnOrderWorkflow (items) → 수령 확인 → 재고 복귀
```

---

## §5 Kyu 질문 (5개)

### Q1. 보이드 허용 범위 — 같은 교대만?

**선택지:**
- A: 같은 교대(shift) 내 & 결제 후 N분 이내만 (예: 15분)
- B: 같은 교대(shift) 내면 언제든 허용
- C: 교대 무관, 같은 날이면 허용

**권장안: B** — 같은 교대 내 허용  
**이유:** 교대 마감(Z 리포트) 전에 보이드가 가능해야 현금 금고와 맞출 수 있음. 시간 제한(A)은 UX 복잡도만 높이고 실질 보호 효과 작음. 교대를 넘기면(C) 금고 집계가 이미 확정돼 환불로 처리하는 게 회계상 올바름.

---

### Q2. 환불 권한 — 캐셔 vs 매니저 PIN

**선택지:**
- A: 캐셔 누구나 환불 가능 (로그만)
- B: 매니저 PIN 필수 (항상)
- C: 금액 임계값 기준 — 소액(예: 50k 이하)은 캐셔, 초과는 매니저 PIN

**권장안: B** — 매니저 PIN 필수  
**이유:** 인도네시아 소매 POS 표준. 현금 환불 시 금고 차감이 발생하므로 감사 추적이 중요함. 임계값(C)은 임계값 조정 요구로 이어져 유지비용이 높음.

---

### Q3. 현금 환불 시 현금 서랍(Cash Drawer) 처리

**선택지:**
- A: 환불 완료 시 서랍 자동 오픈 신호 전송
- B: 서랍 오픈 없음 — 직원이 수동 처리
- C: 환불 금액만큼 Cash Movement `signed_delta = -(amount)` 자동 생성

**권장안: A + C 동시 적용**  
**이유:** A는 UX (캐셔가 금액 꺼낼 수 있도록), C는 회계 집계(X/Z report의 현금 잔액에 환불이 반영됨). C만 없으면 금고 차이가 발생. 현재 `useCreateCashMovement()`가 이미 `signed_delta`를 지원하므로 추가 공수 최소.

---

### Q4. 분할 결제 최대 Tender 수

**선택지:**
- A: 2개로 제한 (현금+카드 조합만)
- B: 3개 이상 허용 (현금+카드+포인트 등)
- C: 무제한

**권장안: A** — 2개로 제한 (MVP)  
**이유:** 인도네시아 소규모 POS 실사용 패턴은 현금+카드 조합이 99%. 3개 이상은 UI 복잡도 증가 대비 수요 미미. QRIS 추가 시 2개 제한 안에 현금+QRIS도 커버됨. 나중에 B로 확장 가능.

---

### Q5. 부분 환불 범위 — 항목 단위 vs 금액 단위

**선택지:**
- A: 금액 직접 입력 (예: 50,000 환불)
- B: 항목(Line Item) 단위 선택 — 수량 포함
- C: A와 B 동시 지원

**권장안: B** — 항목 단위  
**이유:** `createAndCompleteReturnOrderWorkflow`가 `items[{ id, quantity }]` 기반이라 B가 코어 연동 자연스러움. A는 금액 임의 입력이므로 회계 불일치(항목 원가 vs 환불액) 발생 가능. 반품(재고 복귀)도 B가 항목 단위로 처리됨. C는 양쪽 UI가 필요해 범위 과다.

---

## §6 구현 분할 제안

### 라운드 순서 및 파일 주인

| 라운드 | 티켓 | 내용 | 파일 주인 (서버/앱) | 선행 조건 |
|--------|------|------|---------------------|-----------|
| **M0 (서버 먼저)** | M0-AF-a | POST `/admin/pos/orders/:id/void` route — `cancelOrderWorkflow` 호출, fulfill 없는 상태 검증 | `storeport: src/api/admin/pos/orders/[id]/void/route.ts` (신규) | — |
| **M0** | M0-AF-b | POST `/admin/pos/orders/:id/refund` route — `refundPaymentWorkflow` 호출, payment_id 조회 포함 | `storeport: src/api/admin/pos/orders/[id]/refund/route.ts` (신규) | — |
| **M0** | M0-AF-c | POST `/admin/pos/orders/:id/return` route — `createAndCompleteReturnOrderWorkflow` 호출, 항목 선택 검증 | `storeport: src/api/admin/pos/orders/[id]/return/route.ts` (신규) | — |
| **M0** | M0-AF-d | 보이드/환불 시 Cash Movement 자동 생성 (`signed_delta` 적용) | `storeport: src/api/admin/pos/orders/[id]/void·refund/route.ts` 내 | M0-AF-a·b |
| **M0** | M0-AF-e | Void/Refund/Return 영수증 snapshot 생성 (kind: void/refund) | `storeport: src/modules/receipt/` or tender route 확장 | M0-AF-a·b·c |
| **M3 (앱)** | M3-AF-a | 주문 상세 화면 — Void/Refund/Return 버튼 노출 규칙 UI | `pos-m1: app/orders/[orderId].tsx` | M0-AF-a·b |
| **M3** | M3-AF-b | 보이드 확인 모달 (매니저 PIN 입력) | `pos-m1: components/orders/VoidSheet.tsx` (신규) | M3-AF-a |
| **M3** | M3-AF-c | 환불 화면 — 항목 선택 + 수량 + 사유 입력 | `pos-m1: components/orders/RefundSheet.tsx` (신규) | M3-AF-a |
| **M3** | M3-AF-d | 분할 결제 UI — 첫 tender 후 "추가 결제" 버튼, 남은 금액 표시 | `pos-m1: app/checkout/tender-cash/[draftOrderId].tsx` 확장 | M0 tender route 현황 유지 |
| **M2 (프린터)** | M2-AF-a | 보이드/환불 영수증 출력 — kind=void/refund 워터마크 처리 | `pos-m2: receipt printer 모듈` | M0-AF-e |

### Fixture 계약 초안

```typescript
// M0 → M3 fixture (void response)
interface PosVoidResponse {
  ok: boolean;
  order_id: string;
  receipt_id: string;       // kind: 'void'
  receipt_no: string;
  canceled_at: string;
  cash_movement_id?: string; // 현금 환급 시
}

// M0 → M3 fixture (refund response)
interface PosRefundResponse {
  ok: boolean;
  order_id: string;
  payment_id: string;
  refunded_amount: number;
  receipt_id: string;        // kind: 'refund'
  receipt_no: string;
  cash_movement_id?: string;
}

// M0 → M3 fixture (return response)
interface PosReturnResponse {
  ok: boolean;
  order_id: string;
  return_id: string;
  items: Array<{ line_item_id: string; quantity: number }>;
  refunded_amount: number;
  receipt_id: string;        // kind: 'refund'
  inventory_restored: boolean;
}
```

---

*계획서 끝 — 코드·PR 없음*
