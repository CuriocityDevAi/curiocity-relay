# 판정: useAddToDraftOrder에 onMutate 없어 첫 탭 시 customer.create + draftOrder.create 왕복(1~2.5s) 동안 "Your cart is empty" 표시

## 진단

### 경로 단계별

```
T=0ms   사용자 "Add to cart" 탭
        → useAddToDraftOrder.mutate() 호출
        → onMutate 없음 (기존) → 캐시 즉시 반영 없음

T=0~2.5s  mutationFn 실행 (서버 왕복)
  1. getOrSetDraftOrderId() → SecureStore에 ID 없음
  2. resetAndCreate():
     a. customer.list() 호출 (100~500ms)
     b. customer.create() — 고객 없을 때 (500~1000ms)
     c. draftOrder.create() (500~1000ms)
     d. SecureStore.setItem(newId)
  3. beginEdit(draftOrderId) (100~200ms)
  4. addItems(draftOrderId, [variant]) (200~300ms)
  5. confirmEdit(draftOrderId) (100~200ms)

T=0~완료  UI 상태:
  - draftOrder.data?.draft_order = null
  - cart.tsx:538 조건: !null = true → "Your cart is empty" 계속 표시
```

### 왜 #158의 __temp_ 가 이 경로에서 그려지지 않는가

#158(M2-1116-V)의 낙관적 업데이트 코드는 현재 마스터에 머지되지 않았음. `useAddToDraftOrder`에 `onMutate` 자체가 없는 상태. `useUpdateDraftOrderItem`은 이미 `onMutate` 있음 → 두 번째 상품부터는 즉시 반영됨.

### 두 번째 상품부터 즉시 뜨는 이유

두 번째부터는 `draft order`가 이미 존재 → `useAddToDraftOrder`의 `mutationFn`은 `beginEdit → updateItem/addItems → confirmEdit` 경로(빠름). 하지만 여전히 `onMutate` 없어 서버 응답 완료까지 UI 반영 없음. 체감상 더 빠른 것은 서버 왕복 1회 vs 3~4회 차이.

## 수정 내용

### 선택지
- A: `onMutate`에서 temp item으로 캐시 즉시 반영 ← **채택**
- B: 별도 로컬 상태(useState)로 pending items 관리

**채택 이유**: React Query 캐시를 직접 쓰면 기존 `useCurrentDraftOrder` 구독자들이 자동 리렌더. 별도 상태 관리 없이도 "Your cart is empty" 조건이 자연히 false가 됨.

### 변경 파일

| 파일 | 내용 |
|------|------|
| `lib/optimistic-cart.ts` | 새 파일 · `buildOptimisticCartUpdate` 순수 함수 (temp item 목록 계산 · 테스트 가능) |
| `api/hooks/draft-orders.tsx` | `onMutate` 추가 · `_draftOrderCreationPromise` 모듈 레벨 중복 방지 · `PosAddToDraftOrderInput` 타입 · 롤백 `onError` |
| `app/(tabs)/cart.tsx` | `DraftOrderItem`에서 temp item(`__temp_` 접두사) 조작 비활성 (QuantityPicker disabled, 스와이프 비활성) · `isUpdatingDraftOrder===0` 조건 추가 |
| `app/product-details.tsx` | `addToDraftOrder.mutate` 호출 시 `_display` 메타데이터 전달 |
| `__tests__/m1-1116-y.test.ts` | 단위 테스트 6건 |

### 연타 중복 방지 (`_draftOrderCreationPromise`)

```
빈 카트 3연타:
  Tap1 → getOrSetDraftOrderId() → no ID → _draftOrderCreationPromise = resetAndCreate() 시작
  Tap2 → getOrSetDraftOrderId() → no ID → _draftOrderCreationPromise 이미 있음 → 같은 Promise await
  Tap3 → 동일
  → resetAndCreate() 1회만 실행 (draftOrder.create API 1회)
```

## 단위 테스트 결과

```
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

- (a) 빈 카트 첫 탭 → temp 항목 1개 즉시 생성 ✓
- (b) 3연타 → 줄 1개·수량 누산(1→2→3) ✓
- (c) rollback: null snapshot = empty cart 복귀 ✓
- _display 없어도 temp 생성 ✓
- 기존 항목 있을 때 새 상품 추가 ✓
- 기존 항목과 같은 variant → 수량 합산 ✓

## Playwright 미검증

Expo native 환경에서 web 빌드 Playwright 미실행 (미검증 명시).
