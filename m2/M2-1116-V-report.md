#158 연타 직렬화 · 3연타 = 줄 1 qty 3 ✅

## 수정 내용

**버그**: 새 상품 연타 시 두 `mutationFn`이 모두 snapshot에서 temp item 필터링 후 `serverItems=[]` → 둘 다 `toAdd` 경로 → `addItems` 2회 → Medusa v2가 같은 variant라도 별도 줄 생성.

**픽스**: `pendingVariantAdds = Map<variantId, { accQty }>` 모듈 레벨 추적 맵 도입.

- `mutationFn` 진입 시 `toAdd` 분류:
  - 맵에 없으면 → `freshAdds` 등록, `addItems` 실행
  - 맵에 있으면 → `accQty += qty`, early return (서버 호출 없음)
- `confirmEdit` 후 `accQty > originalQty` 이면 `beginEdit → updateItem(lineId, accQty) → confirmEdit` 1회
- 결과: 연타 N번 = 서버 줄 1개 · 수량 N

## 파일 변경

- `api/hooks/draft-orders.tsx`: `pendingVariantAdds` 맵 + `mutationFn` 직렬화 로직
- `__tests__/add-to-cart-optimistic.test.ts`: `M2-1116-V` describe 4케이스 추가

## 테스트

```
Tests  16 passed (16)
```

- `[REQ 1]` 3연타 → freshAdd 1회 / deferred 2회 / accQty=3
- `[REQ 2]` 다른 variant 교차 연타 → 각각 독립 freshAdd
- `[REQ 3]` 첫 add 실패 후 map 정리 → retry fresh
- `[REQ updateItem qty]` accQty > originalQty 판정

## 커밋

`f7a74e1` — `fix(cart): M2-1116-V — 새 상품 연타 시 중복 줄 생성 방지 (pendingVariantAdds 직렬화)`
