fork#190 CHANGES · 문제 4건

## 리뷰 대상
PR#190 feat(refund): M3-1117-V — 환불 NET 미리보기 표 · 계산원 확인 · 409 재미리보기
테스트: 13/13 pass · tsc 신규 에러 0 (PR 수정 파일 한정)

---

## 문제 1 — `RefundPreviewData` 필드명 3개 불일치 (서버 #345 계약 위반)
**파일**: `api/hooks/pos-refunds.ts:50-57`

서버 #345 preview response:
```json
{ "original_refund_amount": 100000, "points_shortfall": 20000, "net_refund_amount": 80000,
  "tender_adjustments": [{ "method": "cash", "adjusted": 80000, "original": 100000, "shortfall_applied": 20000 }],
  "preview_ref": "..." }
```

POS 타입:
```ts
export type RefundPreviewData = {
  original_amount: number;       // ← 서버: original_refund_amount
  unrecovered_points: number;    // ← 서버: points_shortfall
  tenders: RefundPreviewTender[]; // ← 서버: tender_adjustments
  ...
};
```

**영향**: `previewData.unrecovered_points`가 항상 `undefined` → `> 0` 조건 false → preview step 진입 불가. 표 전체 undefined 표시.

**수정**: `RefundPreviewData` 필드명 → `original_refund_amount`, `points_shortfall`, `tender_adjustments`; `VoidRefundSheet.tsx` 참조 전체 반영.

---

## 문제 2 — `RefundPreviewTender` 필드명/값 불일치
**파일**: `api/hooks/pos-refunds.ts:44-47`

서버 `tender_adjustments` 항목: `{ method: "cash"|"qris"|"card", adjusted: number, original: number, shortfall_applied: number }`

POS:
```ts
export type RefundPreviewTender = {
  method: 'cash' | 'qris' | 'card_terminal';  // ← 서버: 'card' (card_terminal → "card" 변환 후 반환)
  amount: number;                               // ← 서버: 'adjusted'
};
```

**영향**: 카드 결제 차감 행에서 `tenderMethodLabel("card")` → else 분기로 `"card"` 그대로 표시.

**수정**: `method` union을 `'cash' | 'qris' | 'card'`로, `amount` → `adjusted`. `tenderMethodLabel`에서 `'card_terminal'` → `'card'` 체크.

---

## 문제 3 — `extractPreviewStale` 409 필드명 불일치
**파일**: `components/orders/VoidRefundSheet.tsx:899-908` · `__tests__/m3-1117-v-refund-net-preview.test.ts:63-70`

서버 409 응답:
```json
{ "code": "preview_stale", "new_preview": {...} }
```

POS:
```ts
if (body.type === 'preview_stale' ...) // ← 서버는 "code" 필드 사용
```

테스트도 동일하게 `type: 'preview_stale'` mock 사용 → 내부 일관성은 있으나 서버 계약 불일치.

**영향**: 409 stale 발생 시 `extractPreviewStale` → 항상 null 반환 → 일반 error 경로로 빠짐 (toast "Refund failed").

**수정**: `body.type` → `body.code` (또는 `type`+`code` 모두 체크). 테스트 mock도 동일 수정.

---

## 문제 4 — `tenderMethodLabel` card 분기 누락 (문제 2 연동)
**파일**: `components/orders/VoidRefundSheet.tsx:82-87`

```ts
const tenderMethodLabel = (method: string): string => {
  if (method === 'cash') return 'Cash';
  if (method === 'qris') return 'QRIS';
  if (method === 'card_terminal') return 'Card';  // ← 서버는 'card' 전송
  return method;
};
```

문제 2의 타입 수정과 함께 `'card_terminal'` → `'card'`로 수정 필요.

---

## 정상 구현 항목
- `unrecovered_points === 0` 하위 호환 흐름 (필드명만 고치면 동작) ✅
- `confirmed: true + preview_ref + expected_net_refund_amount` 전송 로직 ✅
- 연타 방지 `previewConfirming` guard ✅
- `buildFullRefundBody` 추출로 재사용 개선 ✅
- 표 UI 구조 (행 순서 · 수단별 서버 순서) ✅
- 400 처리 (기존 extractError) ✅
- reset 경로 완결 (visible·goBack·reset 3곳 모두) ✅
- tsc 신규 에러 0 · 테스트 13/13 pass ✅
