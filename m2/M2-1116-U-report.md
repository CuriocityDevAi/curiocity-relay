fork PR #158 · 빈 화면 깜빡임 제거 · 연타/실패 테스트 ✅

## 구현 내용

### 변경 파일
- `api/hooks/draft-orders.tsx` — `onMutate` + `mutationFn`
- `app/(tabs)/cart.tsx` — 빈 상태 조건 + DraftOrderItem temp 비활성
- `__tests__/add-to-cart-optimistic.test.ts` (신규)

### 핵심 변경
1. **`onMutate` 확장**: `toAdd`(새 variant) → `__temp_<variantId>` ID로 즉시 캐시 삽입.
   제품 쿼리 캐시(`['products', ...]`)를 순회해 제목·가격·썸네일 best-effort 조회.
2. **`mutationFn` 수정**: 스냅샷에서 `__temp_` ID 필터링 후 `mergeCartItems` 적용.
   → 서버에 없는 temp ID로 `updateItem` 호출하는 크래시/오류 방지.
3. **빈 상태 조건** (`cart.tsx:571`): `isUpdatingDraftOrder === 0` 추가.
   mutation 진행 중 temp item 미캐시 edge case → `CartSkeleton` 대체.
4. **`DraftOrderItem`**: `isTempItem` 플래그 → QuantityPicker `disabled` + 스와이프 삭제 숨김.
5. **단위 테스트 12개** — 전체 363개 통과.

### 설계 결정
- **연타(새 상품)**: 스냅샷 temp 필터링으로 양쪽 모두 `addItems` 전송. Medusa 서버 동작에 따라 최종 qty 결정 후 `onSettled` invalidation으로 정합.
- **연타(기존 상품)**: 기존 snapshot 큐 동작 완전 유지 (테스트 검증).
- **실패 롤백**: `onError`가 `previousDraftOrder`(pre-optimistic 스냅샷) 복원 → temp item 제거.
- **Checkout 버튼**: `#154` spinner 대기 동작 완전 유지 (`isUpdatingDraftOrder` 그대로).

## 미검증 항목
- 실제 시뮬레이터/디바이스 스크린샷 없음 (UI 렌더 환경 미구성).
- Medusa 서버 side-effect: 연타 새 상품 2회 → `addItems` 2회 호출 시 Medusa가 별도 줄 2개 생성 vs 합산 여부 미확인. `onSettled` 후 서버 정합 확인 필요.
