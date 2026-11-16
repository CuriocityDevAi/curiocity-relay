# M1-1116-T 착지 보고

PR #315 · 시뮬 버그 원인: receipt-preview.ts earn_on_balance_tender_only=false 분기에서 earn_base 무시 · 실제 적립 영향 있음(earn.ts 동일 함수 사용 → 수정 자동 반영) · 30일 Rp 0 원인: listOrders raw column(item_subtotal=0) → query.graph 로 교체

---

## 1. 시뮬 버그 원인 (파일:줄)

**파일**: `apps/commerce-core/src/lib/loyalty/receipt-preview.ts:121`

```typescript
// 버그 — before
if (!settings.earn_on_balance_tender_only) {
  earnBase = total;  // earn_base 무시 → 항상 세후 total
}

// 수정 — after
if (!settings.earn_on_balance_tender_only) {
  earnBase =
    settings.earn_base === "paid_non_credit_pre_tax"
      ? subtotalAfterDiscount   // 세전
      : total;                  // 세후
}
```

**검증 (unit test)**:
- `earn_on_balance_tender_only=false` + `earn_base=paid_non_credit_pre_tax` + subtotal=100,000 + pb1=10%
  - 수정 전(버그): `credit_earned = 1,100` (110,000 × 1%)
  - 수정 후(기대): `credit_earned = 1,000` (100,000 × 1%) ✅ 테스트 통과

---

## 2. 실제 적립 영향

**있음**. `earn.ts` 의 `earnForOrder` 는 동일 `previewReceipt` 함수를 호출하므로 (line 212) `receipt-preview.ts` 수정으로 자동 반영됨. `earn_on_balance_tender_only=false` 에서 `earn_base=paid_non_credit_pre_tax` 설정 시 실제 적립도 세전 기준으로 계산됨.

---

## 3. Past 30일 impact Rp 0 원인

**파일**: `apps/commerce-core/src/api/admin/pos/loyalty/settings/simulate/route.ts:102`

`orderSvc.listOrders` 는 raw DB column만 반환 → `item_subtotal` 등 computed totals 가 0. (earn.ts 의 M0-1116-A 주석과 동일 패턴)

**수정**: `query.graph` 로 `item_subtotal · subtotal · discount_total` 명시 요청:
```typescript
const { data } = await query.graph({
  entity: "order",
  fields: ["id", "item_subtotal", "subtotal", "discount_total", "metadata"],
  filters: { status: "completed", created_at: { $gte: windowStart } },
  pagination: { take: 2000 },
});
```

---

## 4. 숫자칸 UX

`NumericInput` 컴포넌트 추가 (`page.tsx`):
- `type="text" inputMode="decimal"` → 브라우저 화살표 제거
- 단위(%/Rp) 오른쪽에 표시
- 편집 중 빈 값 허용, `onBlur` 에서 정규화(앞자리 0 제거)
- 유효 숫자일 때만 `update()` 호출 → 시뮬은 마지막 유효값 기준
- 결과 영역 `min-h-[480px]` 고정 → 로딩/결과 전환 시 레이아웃 흔들림 방지

---

## Playwright 검증

서버 미기동 환경 — Playwright 시뮬 페이지 테스트 **미실행**. 단 unit 328개 / TS 에러 0 확인.

---

## PR 본문 Kyu 실기 항목

| Kyu 실기 증상 | 원인 | 수정 |
|---|---|---|
| earn_base 바꿔도 AFTER 변화 없음 | toggle=false → earn_base 무시 | receipt-preview.ts:121 분기 추가 |
| Earn rate 0이 안 지워짐 / 01로 | type=number 한계 | NumericInput 문자열 state |
| 화살표 작고 위치 흔들림 | type=number browser spinner | type=text inputMode=decimal |
| 30일 적립 전부 Rp 0 | listOrders raw column | query.graph computed totals |
