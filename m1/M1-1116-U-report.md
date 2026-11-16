#315 discount 반영 · 테스트 ✅

## 변경 내용

### `apps/commerce-core/src/api/admin/pos/loyalty/settings/simulate/route.ts`
- `computeImpact30d` for 루프: `subtotal = item_subtotal ?? subtotal` 순서 수정 (earn.ts 와 동일)
- `discount = discount_total ?? 0` 추가
- `previewReceipt` 호출 양쪽(before/after)에 `discount` 전달

### `apps/commerce-core/src/api/admin/pos/loyalty/settings/simulate/__tests__/route.unit.spec.ts`
- 신규 단위 테스트 2건:
  1. 할인 주문 포함 30일 임팩트 = 실제 적립 합(1300) 검증
  2. `item_subtotal` 이 `subtotal` 보다 우선 적용 검증

## 결과
- 단위 테스트 330/330 ✅ (신규 2건 포함)
- `feat/m1-1116-t` push 완료
