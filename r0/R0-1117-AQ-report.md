fork#190 APPROVE · 문제 0건

## 리뷰 대상
PR#190 feat(refund): M3-1117-V — 환불 NET 미리보기 표 · 계산원 확인 · 409 재미리보기
테스트: 13/13 pass · tsc 신규 에러 0 (PR 수정 파일 한정)

---

## R0-1117-AO 문제 1~4 해결 확인

### 문제 1 — `RefundPreviewData` 필드명 3개 ✅ RESOLVED
`api/hooks/pos-refunds.ts`
```ts
export type RefundPreviewData = {
  preview_ref: string;
  original_refund_amount: number;   // ← 수정 완료
  points_shortfall: number;         // ← 수정 완료
  net_refund_amount: number;
  tender_adjustments: RefundPreviewTender[];  // ← 수정 완료
};
```
VoidRefundSheet.tsx 참조(`previewData.original_refund_amount` · `points_shortfall` · `tender_adjustments`) 전체 반영.

### 문제 2 — `RefundPreviewTender` 필드명/값 ✅ RESOLVED
```ts
export type RefundPreviewTender = {
  method: 'cash' | 'qris' | 'card';  // ← 'card_terminal' → 'card' 수정
  adjusted: number;                   // ← 'amount' → 'adjusted' 수정
};
```
UI에서 `t.adjusted` 사용 확인.

### 문제 3 — `extractPreviewStale` 409 필드명 ✅ RESOLVED
`components/orders/VoidRefundSheet.tsx:899`
```ts
if (body.code === 'preview_stale' && body.new_preview ...)  // ← body.type → body.code
```
테스트 fixture도 `code: 'preview_stale'`으로 동일 수정.

### 문제 4 — `tenderMethodLabel` card 분기 ✅ RESOLVED
`components/orders/VoidRefundSheet.tsx:82-87`
```ts
const tenderMethodLabel = (method: string): string => {
  if (method === 'cash') return 'Cash';
  if (method === 'qris') return 'QRIS';
  if (method === 'card') return 'Card';  // ← 'card_terminal' → 'card' 수정
  return method;
};
```

---

## Fixture 대조 (서버 #345 계약)

서버 응답:
```json
{ "original_refund_amount": 100000, "points_shortfall": 20000, "net_refund_amount": 80000,
  "tender_adjustments": [{ "method": "cash", "adjusted": 80000 }],
  "preview_ref": "pr_1" }
```

테스트 PREVIEW_FIXTURE:
```ts
{ preview_ref: 'pr_1', original_refund_amount: 100_000, points_shortfall: 20_000,
  net_refund_amount: 80_000, tender_adjustments: [{ method: 'cash', adjusted: 80_000 }] }
```
→ 필드명 1:1 일치 ✅

## 409 `preview_stale` → `new_preview` 표 갱신 · `'card'` 라벨

- `extractPreviewStale`: `body.code === 'preview_stale'` → `body.new_preview as RefundPreviewData` 반환
- `setPreviewData(stalePrev)` → 표 갱신 + `previewStaleMsg` 표시 (직접 재시도 아님) ✅
- `tenderMethodLabel('card')` = `'Card'` ✅

## 테스트 로그

```
✓ NET 미리보기 표 표시 조건 > points_shortfall > 0 → 표 표시
✓ NET 미리보기 표 표시 조건 > points_shortfall === 0 → 표 미표시 (하위 호환)
✓ NET 미리보기 표 표시 조건 > tender_adjustments 순서 서버 그대로 (cash → qris → card)
✓ NET 미리보기 표 표시 조건 > net = original_refund_amount − points_shortfall
✓ 확인 버튼 연타 방지 > confirming=true 중 재호출 → 무시
✓ 확인 버튼 연타 방지 > confirming 리셋 후 재호출 → 허용
✓ 409 preview_stale → new_preview 추출 > code=preview_stale → new_preview 반환
✓ 409 preview_stale → new_preview 추출 > type=conflict → null 반환
✓ 409 preview_stale → new_preview 추출 > null/undefined → null 반환
✓ 409 preview_stale → new_preview 추출 > new_preview 없는 preview_stale → null 반환
✓ confirmed 전송 계약 > preview_ref + expected_net_refund_amount 가 body 에 포함
✓ confirmed 전송 계약 > previewConfirmation 없으면 confirmed 없음
✓ 확인 1회 전송 > confirmed submit 는 정확히 1회 호출

Test Files  1 passed (1)
     Tests  13 passed (13)
  Duration  142ms
```

## tsc

PR 수정 파일(`api/hooks/pos-refunds.ts` · `components/orders/VoidRefundSheet.tsx` · `__tests__/m3-1117-v-refund-net-preview.test.ts`) 신규 에러 0.
기존 15행 에러는 pre-existing (base branch 동일).
