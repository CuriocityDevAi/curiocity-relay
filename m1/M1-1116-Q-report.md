# M1-1116-Q 리포트

세전 1% 조합 = `earn_base="paid_non_credit_pre_tax"` · Admin 에서 설정 가능 (UI PR 불필요) · 환불·미리보기 연동 OK · 손님 화면 earn_preview 미연동 (R2 TODO X)

---

## REQ 1 — 세전 × 1% 가 되는 조합

### earn_base 선택지 (`service.ts:9-23`)

| 값 | 설명 | 90,000 주문(PB1 10%) 결과 |
|---|---|---|
| `"paid_non_credit"` (기본) | 세후 실결제액 기준 | 99,000 × 1% = **990** |
| `"paid_non_credit_pre_tax"` | **세전 비credit 금액 기준** | 90,000 × 1% = **900** ✓ |

### tax_mode 선택지 (`service.ts:9-23`)

| 값 | 설명 |
|---|---|
| `"payment"` (기본) | credit = 결제수단 · 세금은 세전 기준 부과 |
| `"discount"` | credit = 세전 공제 · 세금은 (세전 - credit) 기준 부과 |

**세전 × 1% 조합**: `earn_base = "paid_non_credit_pre_tax"` + `tax_mode = "payment"` (현행 유지)  
`tax_mode` 는 세금 계산에만 영향, earn_base 변경만으로 목적 달성.

### 계산 경로 (`receipt-preview.ts:118-135`)

```typescript
// receipt-preview.ts:124-126
} else if (settings.earn_base === "paid_non_credit_pre_tax") {
  earnBase = Math.max(0, subtotalAfterDiscount - creditUsed);
  // 90,000 - 0 = 90,000  →  floor(90,000 × 1%) = 900
}
```

- `earn.ts:212` → `previewReceipt(…, loyalty)` 호출 — 동일 로직 적용.
- `GATED_KEYS`(`service.ts:25-39`) 에 `earn_base` 포함 → Simulate 통과 필수.

---

## REQ 2 — Admin UI 선택 가능 여부

**선택 가능 · UI PR 불필요.**  
`page.tsx:666-690` 에 드롭다운 이미 존재:

```tsx
<option value="paid_non_credit_pre_tax">
  Paid pre-tax (excl. store credit)   ← 이 항목 선택
</option>
```

`gatedHash()`(`page.tsx:42`) 가 `earn_base` 를 감시 → 변경 즉시 Simulate 재실행(400ms debounce)  
`saveEnabled = !!(simResult && lastSimHash === currentHash)` — 시뮬 완료 후에만 Save 활성.

---

## REQ 3 — 환불·미리보기·손님 화면 연동

| 항목 | 연동 | 근거 |
|---|---|---|
| 미리보기 (Simulate) | **OK** | `simulate/route.ts:49-50` — `previewReceipt()` 동일 함수, earn_base 그대로 반영 |
| 환불 포인트 회수 | **OK** | `recover.ts:193-200` — `metadata.loyalty_earn.amount`(실적립액) 비례 회수. earn_base 변경 후 주문은 900 기준 비례 차감 |
| 손님 화면 적립 예고 | **X (R2 TODO)** | `loyalty-info/route.ts:126` → `earn_preview: null`. POS 앱에서 snapshot.loyalty.earn_preview 미세팅 · 현재 고객 화면 `0` 표시 |

환불 회수는 기변경 설정이 아닌 "주문 시 실제 적립된 금액" 기준이므로, 설정 변경 전 주문은 990 기준·이후 주문은 900 기준으로 각각 비례 회수됨 (정상 동작).

---

## REQ 4 — Kyu 클릭 절차 (처음 하는 사람 기준)

### 1단계 — Simulate 뷰 열기
Admin → **POS Settings** → **Loyalty** 메뉴 클릭  
우측 상단 **"Simulate"** 버튼 클릭 → Simulate 뷰로 전환

### 2단계 — Earn base 변경
"Earn base" 드롭다운 (`sim-earn-base-select`) 클릭  
→ **"Paid pre-tax (excl. store credit)"** 선택

### 3단계 — 시뮬레이션 결과 확인 (400ms 후 자동 갱신)
"Normal purchase (Rp 100,000)" 행에서 확인:
- **Before**: Credit earned = 1,100 (세후 110,000 × 1%)  
- **After**: Credit earned = **1,000** (세전 100,000 × 1%)

> 90,000 주문이면: 세전 90,000 × 1% = **900** (동일 비율 적용)

다른 시나리오(Partial credit use, Partial refund 등)도 Before/After 비교 확인.

### 4단계 — Save changes
결과 확인 후 **"Save changes"** 버튼 클릭 (Save 버튼 비활성이면 시뮬 아직 미완 — 기다릴 것)

사유 칸 예시:
```
세전 기준 적립으로 전환 — PB1 제외 subtotal × 1% (90,000 주문 → 900, 세무사 확인 완료)
```

### 5단계 — 적용
"Apply now" 선택 → **"Apply"** 버튼 클릭  
(Schedule 는 예약 적용 · 즉시 반영은 Apply now)

적용 완료 후 Admin > Loyalty 감사 로그에서 `earn_base` 변경 이력 확인.

---

## 파일 경로 요약

| 역할 | 경로 |
|---|---|
| 적립 계산 | `storeport/apps/commerce-core/src/lib/loyalty/receipt-preview.ts:118-135` |
| 적립 실행 | `storeport/apps/commerce-core/src/lib/loyalty/earn.ts:212` |
| 설정 타입/기본값 | `storeport/apps/commerce-core/src/modules/loyalty_settings/service.ts:9-39` |
| Admin UI 드롭다운 | `storeport/apps/commerce-core/src/admin/routes/pos-settings/loyalty/page.tsx:666-690` |
| 환불 회수 | `storeport/apps/commerce-core/src/lib/loyalty/recover.ts:193-200` |
| Simulate API | `storeport/apps/commerce-core/src/api/admin/pos/loyalty/settings/simulate/route.ts:49-50` |
| 손님 화면 earn_preview | `storeport/apps/commerce-core/src/api/admin/pos/orders/[id]/loyalty-info/route.ts:126` (R2 TODO) |
