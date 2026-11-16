# R0-1116-AG Report

Y PR #161 CHANGES REQUIRED · #160 APPROVE · #158 master 반영 여부 있음(null-cache 버그 잔존)

---

## 1) PR #161 (M1-1116-Y) — fix(cart): 빈 장바구니 첫 탭 즉시 표시

### (a) M1 base vs #158 merge-base

PR #161 `baseRefOid = 77153f7d86` 는 GitHub가 현재 master HEAD 를 가리키는 것이며,  
실제 M1 브랜치의 diverge point 는 `9532dc6838` (M2-1105-BK) — #158 merge (`86124612a7`) 보다 이전.  

| 항목 | 값 |
|---|---|
| master HEAD | `77153f7d86` (M2-1116-W) |
| #158 commit | `86124612a7` (M2-1116-U) |
| M1 diverge point | `9532dc6838` (M2-1105-BK, #158 이전) |
| PR mergeable | CONFLICTING (DIRTY) |

**결론**: M1 은 #158 이전 master 에서 분기했음. #158·M2-1116-W 이후 master 와 충돌.

---

### (b) 최신 master `api/hooks/draft-orders.tsx` — onMutate/`__temp_` 사실 확정

**master 에 onMutate + `__temp_` 있음** (M2-1116-U / #158 도입).

그러나 **null-cache 버그 잔존**:

```typescript
// master useAddToDraftOrder onMutate (api/hooks/draft-orders.tsx:~360)
if (cached?.draft_order?.items !== undefined) {  // ← 빈 카트(cached=null) 시 조건 불충족 → 스킵
  // temp 항목 추가 로직
}
```

빈 카트(draft 없음) → `useCurrentDraftOrder` 반환 `null` → `cached = null`  
→ `cached?.draft_order?.items` = `undefined` → **if 블록 스킵 → 낙관적 업데이트 없음**  
→ 서버 응답까지 Cart 탭에 "Your cart is empty" 약 2초 표시 ← **Kyu 체감 현상 그대로 재현**

cart.tsx 에서:
- `app/(tabs)/cart.tsx:548`(master): `!draftOrder.data?.draft_order` = true(cached null) → 항상 empty 표시
- `isUpdatingDraftOrder > 0` guard는 `draftOrder.data?.draft_order` 가 있을 때만 작동

**두 번째 상품도 느린 이유**: 첫 아이템이 서버 확정 후 `invalidateQueries` → 재조회 중(isFetching=true)이면  
새 탭 시 cached 는 stale 데이터 → onMutate 는 정상 동작해야 하나,  
Cart 로 navigating 하는 타이밍에 따라 isFetching+stale 상태가 겹치면 짧은 지연 가능.  
주원인은 null-cache(첫 상품), 2차 원인은 이 stale+fetch 겹침.

---

### (c) M1 수정과 #158 충돌·중복 여부

| 항목 | master(#158) | M1-1116-Y | 판정 |
|---|---|---|---|
| `onMutate` null-cache 처리 | ❌ `items !== undefined` guard | ✅ `cached ?? { id: '__temp__' }` | **M1 수정 필요** |
| `findVariantInfo` inline helper | ✅ 있음 | ❌ 제거 → `PosAddItem._display` 로 대체 | 방식 충돌 |
| `snapshotQueue` (pre-optimistic) | ✅ 있음 | ❌ 제거 | 제거 가능(M1 mutationFn이 `__temp_` 필터로 대응) |
| `pendingVariantAdds` Map (M2-1116-V) | ✅ 있음 | ❌ **제거** | **회귀 — 복원 필요** |
| `_draftOrderCreationPromise` | ❌ 없음 | ✅ 있음 | M1 추가값 |
| `lib/optimistic-cart.ts` | ❌ 없음 | ✅ 있음 | M1 추가값 |

**`pendingVariantAdds` 제거가 가장 큰 문제**: 같은 variant 연타 시 두 `mutationFn` 이 각각  
`beginEdit`→`addItems`→`confirmEdit` 를 호출 → 서버 edit 충돌 가능 (M2-1116-V 가 막은 케이스).  
M1의 optimistic side (`buildOptimisticCartUpdate`) 는 temp 아이템 중복을 방지하지만  
server call 중복은 막지 못함.

**결론: 최신 master 기준 rebase + `pendingVariantAdds` 복원 + onMutate null-safe 통합 요구.**

---

### (d) 두 번째 상품 탭(draft 있음) 응답 전 줄 표시 여부

M1-1116-Y `onMutate`:
```typescript
const cached = queryClient.getQueryData<AdminDraftOrderResponse | null>(['draft-order']);
const currentItems = (cached?.draft_order?.items ?? []) as OptimisticItem[];
const nextItems = buildOptimisticCartUpdate(input.items, currentItems);
// cached null 이든 items 존재하든 항상 setQueryData 호출
```

두 번째 상품 추가 시 `currentItems` = [서버 확정 아이템1] → `buildOptimisticCartUpdate` →  
[item1, `__temp_var_x2`] → 즉시 setQueryData → ✅ 두 번째 상품도 응답 전 표시됨.

cart.tsx 도 M1에서 개선:
```
// master: !draftOrder.data?.draft_order → empty 표시 (cached null이면 mutation 무시)
// M1:     !draftOrder.data?.draft_order.items.length && isUpdatingDraftOrder === 0 → mutation 중엔 유지
```

---

### 테스트 로그 (M1 브랜치, git worktree)

```
$ npx vitest run __tests__/m1-1116-y.test.ts
 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  209ms

$ npx vitest run
 Test Files  26 passed (26)
      Tests  293 passed | 6 expected fail | 2 todo (301)
   Duration  799ms
```

전체 통과. `__tests__/m1-1116-y.test.ts` 6케이스 (빈 카트 첫 탭 · `_display` 없는 경우 · 3연타 수량 누산 · 롤백 · 두 번째 상품 추가 · 같은 variant 수량 합산) 모두 통과.

---

### 판정: **CHANGES REQUIRED**

```
1. latest master(M2-1116-W) 기준 rebase (CONFLICTING 해소)
2. pendingVariantAdds Map (M2-1116-V) 복원 — mutationFn 에 재통합
3. onMutate null-cache 처리(M1 핵심 수정)는 유지
4. lib/optimistic-cart.ts · _draftOrderCreationPromise · _display 타입은 유지
```

---

## 2) PR #160 (M2-1116-AF) — fix(payment): Cash tender 버튼 레이블 영어 통일

`components/payment/CashTenderPanel.tsx` 확인:
- `"딱 맞게"` → `"Exact"` ✓ (`testID="cash-quick-exact"` 버튼 레이블)
- `"다른 금액"` → `"Other amount"` ✓ (`testID="cash-other-amount"` 버튼 레이블)
- 나머지 사용자 노출 문자열: "Total", "Amount received", "Change", "Short by", "Process payment" — 전부 영어 ✓
- 한국어 코멘트(비사용자 노출): 정상
- `formatIDR` 함수명 등 코드 내 영어 ✓
- Tests: PR body "384 passed, 6 expected fail" (전체 통과)

### 판정: **APPROVE**

---

## #158 master 반영 여부

**있음** — `86124612a7` (M2-1116-U, 14:42 UTC) 으로 squash merge 완료.  
`useAddToDraftOrder` onMutate + `__temp_` + `pendingVariantAdds` + `findVariantInfo` + `snapshotQueue` 모두 master 에 반영됨.  
단, null-cache 버그 (`if (cached?.draft_order?.items !== undefined)` guard) 는 #158 에서 도입된 채로 잔존.  
M1-1116-Y 의 핵심 가치는 이 버그 수정 — master rebase 후 통합 가능.
