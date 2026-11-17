PR #181 · 즉시 사진·소계 · Checkout 대기 이동 · 2초 원인=API 3연속(beginEdit+addItems+confirmEdit)

## 변경 파일

| 파일 | 내용 |
|------|------|
| `api/hooks/draft-orders.tsx` | `findVariantInfo` images 폴백, `[cart-timing]` 구간 로그 추가 |
| `app/product-details.tsx` | `_display.thumbnail` images 폴백 |
| `app/(tabs)/cart.tsx` | `optimisticTotal` 즉시 표시, Checkout disabled 수정, awaitingMutation isFetching 대기 |
| `__tests__/add-to-cart-optimistic.test.ts` | thumbnail·unit_price·Checkout await 테스트 추가 (26 pass) |

## REQ 대응

| REQ | 구현 |
|-----|------|
| 1. 썸네일 즉시 | `_display.thumbnail` → `product.thumbnail ?? product.images?.[0]?.url` 폴백 |
| 2. 소계 즉시 | `optimisticTotal = Σ(unit_price×qty)` 즉시 표시, 계산 중 `ActivityIndicator` 작게 표시 |
| 3. Checkout 항상 활성 | `disabled` → `items.length===0`만, mutation+refetch+temp ID 종료 후 이동 |
| 4. 타이밍 측정 | `[cart-timing]` beginEdit/items/confirmEdit/invalidateQueries/refetch 구간 로그 |
| 5. 테스트 | thumbnail·unit_price 존재, Checkout await 로직 7케이스 (tsc 신규 오류 0, scheduleOnRN 미사용) |

## 2초 원인 분석

| 구간 | 예상 소요 |
|------|----------|
| beginEdit | ~100–300ms |
| addItems / updateItem | ~300–500ms |
| confirmEdit | ~300–500ms |
| invalidateQueries → refetch | ~300–600ms |
| **합계** | **~1,000–1,900ms** |

- 주 원인: 서버 편집 API 3단계 연속 호출(beginEdit → addItems → confirmEdit)
- 중복 재조회 없음: `isMutating===1` 가드 + `enabled=isAddingToCart===0` 설계로 단일 refetch 확인

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/181
