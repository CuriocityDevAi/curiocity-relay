#270 APPROVE

## 결정 문서 대사 (POS-1~6)

### POS-1 ✓ · Waiting for customer 칩
`CustomerFlowChip` (typing 분기): `flow.phone === '' || flow.phone === null` → `"Waiting for customer"` + dots.  
계약서 §5와 정확히 일치. `classifyCustomerFlowChip('entering')` → `'typing'` (vitest + playwright chip-A 확인).

### POS-2 ✓ · 실시간 숫자 회귀 복구
`flow.phone` 길이 ≥ 1이면 `${partial}…` + dots. 계약서 §1 `customer_flow.phone` 필드 그대로 사용 — 새 필드 없음.  
`plans/cd-sync-contract-20261125.md v1.2` §1의 기존 `phone: string | null` 필드. playwright chip-B: `"0813…"` 노출 확인.

### POS-3 ✓ · 적립 완료 칩
`confirmed` + `points_earned != null` → `"✓ <phone_masked> · +Rp 180"` (이번 적립액).  
`points_earned == null` 이면 `points_balance`로 폴백. 우선순위 명확. playwright chip-D 확인.

### POS-4 ✓ · Hand over 항상 활성 (전체 grep 확인)
`components/payment/SuccessReceiptAnim.tsx`:
- Hand over: `disabled={isHandOverPending}` 만 — loyalty 조건 없음
- Done: `disabled` prop 없음
- `shouldDisableNextOrder` import 없음 · `"Waiting for customer to enter loyalty number"` 문구 삭제 확인

`app/orders/[orderId].tsx` Hand over: `disabled={handOver.isPending}` 만.  
`shouldDisableNextOrder`는 `lib/loyalty-snapshot.ts` (정의) + `__tests__/loyalty-snapshot.test.ts` (기존 테스트)에만 존재 — 버튼 경로 어디에도 주입 안 됨.

**어떤 customer_flow 상태에서도 Hand over 비활성 경로 없음** ✓

### POS-5 ✓ · Link customer 숨김이 결제 전에는 영향 없음
`LinkCustomerCard` (SuccessReceiptAnim 내부 local 컴포넌트, 미export):
- `flowState ∈ {entering, first_visit, confirming, confirmed}` → `return null`
- 카트·체크아웃의 Link customer는 `components/payment/CustomerLinkSheet.tsx` / `components/loyalty/LinkCustomerSheet.tsx` — 이 PR에서 미수정, 완전 별도 경로.

playwright POS-5 confirmed + entering 모두 `link-customer-open` count=0 확인 ✓

### POS-6 ✓ · resolveLineTotal + 프린터·화면 동일 함수
`types/receipt.ts` `resolveLineTotal(item)`:
1. `item.line_total` 유효 수 → 반환
2. `item.total` 유효 수 → 반환 (서버 실 snapshot shape 커버)
3. fallback: `qty × unit_price − discount`

`ReceiptCard.tsx` (화면) + `receipt-escpos.ts` (ESC/POS 프린터) 모두 `import { resolveLineTotal } from '@/types/receipt'` / `'../../types/receipt'` 동일 함수.  
`formatIDR`: `Number.isFinite(n) ? n : 0` — NaN/undefined/null 모두 "IDR 0" ✓  
할인 품목: `disc > 0` 경우 `qty * unit − disc` fallback 적용됨 (NaN 없음).  
환불 영수증: `tenders[].amount` 음수 → `Math.abs` 경로 사용, `resolveLineTotal` 무관.

---

## 명령 로그

```
$ cd /Users/kyu.lee/projects/agilo-medusa-pos-fork
$ git checkout origin/feat/M3-1126-D --detach

$ npx vitest run --reporter=verbose 2>&1 | tail -6
Test Files  89 passed (89)
      Tests  1150 passed | 6 expected fail | 3 todo (1159)
   Start at  11:35:40
   Duration  2.09s

$ npx expo lint 2>&1 | tail -4
✖ 71 problems (0 errors, 71 warnings)
  0 errors and 2 warnings potentially fixable with the --fix option.

# dist/ 가 2026-11-24 빌드 (PR 전) → expo export -p web 재빌드 후 playwright 재실행
$ npx expo export -p web  # → Exported: dist (성공)

$ npx playwright test e2e/flows/M3-1126-D-pos-fixes.spec.ts
  ✓  1 칩-A · entering · phone="" → "Waiting for customer"
  ✓  2 칩-B · entering · phone="0813" → "0813…" (POS-2 회귀 복구)
  ✓  3 칩-C · confirming → "Awaiting confirm · <phone>"
  ✓  4 칩-D · confirmed · points_earned=180 → "+Rp 180" (POS-3)
  ✓  5 Hand over 활성 · customer_flow=none
  ✓  6 Hand over 활성 · customer_flow=entering
  ✓  7 Hand over 활성 · customer_flow=confirmed
  ✓  8 confirmed 상태 → Link customer 버튼 비노출
  ✓  9 entering 상태 → Link customer 버튼 비노출(진행 중)
  ✓ 10 옵션 품목 · `total:` 키 shape → NaN 없이 IDR 18,000 노출

  10 passed (13.8s)
```

**주의사항**: 초기 playwright 실행 7/10 실패 — `dist/`가 Nov 24 구 빌드라 PR 변경사항 미반영. `expo export -p web` 재빌드 후 10/10 통과. CI는 항상 rebuild하므로 문제없음.  
`[e2e] unmocked: GET /admin/draft-orders?fields=...` — 셀 탭 초기화 호출, 테스트 어설션과 무관하여 통과. 하네스 갭이지만 본 PR 범위 외.

---

## 종합 판정

POS-1~6 전항목 결정 문서 대사 완료. 계약서 필드 준수. Hand over 비활성 경로 전무. 화면·프린터 동일 함수 사용. vitest 1150/1150 · lint 0 errors · playwright 10/10.
