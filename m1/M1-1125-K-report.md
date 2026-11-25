PASS

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/259  
브랜치: `feat/M1-1125-K` → base `feat/M1-1125-I` (PR #258)

---

## 1. oneshot 의도 확인

`useAddToDraftOrder.mutationFn` 과 `useUpdateDraftOrderItem.mutationFn` 에서 oneshot 성공 시
서버에서 받은 `draft_order` 를 `queryClient.setQueryData(['draft-order'], merged)` 로 직접 캐시에 씀.
따라서 `draft-order` 쿼리 재조회는 불필요(이미 최신 값) → `invalidateDraftAndQuote` 호출을 건너뛴 것은 의도된 최적화.

**문제**: `pos-quote` 는 서버가 별도로 계산하는 세금·합계 미리보기이며, oneshot API 응답에는 포함되지 않음.
따라서 `draft-order` 갱신 뒤에도 `pos-quote` 는 stale 상태 → Cart PB1 합계가 Checkout 과 불일치.

---

## 2. 수정 내용 (`api/hooks/draft-orders.tsx`)

### useAddToDraftOrder.onSettled

```
// 수정 전
if (!oneshotDone && isMutating === 1) {
  await invalidateDraftAndQuote(queryClient);       // oneshot 경로 → 완전 건너뜀
}

// 수정 후
if (isMutating === 1) {
  if (oneshotDone) {
    await queryClient.invalidateQueries({ queryKey: ['pos-quote'], exact: false });  // pos-quote 만
  } else {
    await invalidateDraftAndQuote(queryClient);     // 비oneshot → 둘 다
  }
}
```

### useUpdateDraftOrderItem.onSettled

동일 패턴: `wasOneshot` 분기에서 `pos-quote` 만 무효화하도록 수정.

---

## 3. 테스트 (`__tests__/m1-1125-j-quote-invalidation.test.ts`)

환경: vitest + node · jsdom 미설치 → `renderHook` 대신 `MutationObserver(@tanstack/react-query)` 사용.
`MutationObserver.mutate()` 호출 시 `onSettled` 에서 `isMutating === 1` 이 보장됨 (실측).

| 테스트 | 경로 | 결과 |
|--------|------|------|
| useAddToDraftOrder · oneshot → pos-quote 만 무효화 | `_oneshotUpdated: true` | PASS |
| useAddToDraftOrder · 비oneshot → 두 키 모두 무효화 | `_oneshotUpdated` 없음 | PASS |
| useUpdateDraftOrderItem · oneshot → pos-quote 만 무효화 | `oneshotSucceeded.has(id)` = true | PASS |
| useUpdateDraftOrderItem · 비oneshot → 두 키 모두 무효화 | `oneshotSucceeded` 비어있음 | PASS |
| invalidateDraftAndQuote 헬퍼 3건 | — | PASS |

**7/7 passed**

---

## 4. m3-1124-n-custom-display-id-priority.test.ts

이 워크트리에서 `npx vitest run __tests__/m3-1124-n-custom-display-id-priority.test.ts` → **10/10 통과**.
별도 수정 불필요.

---

## 5. CI 최종 수치

```
Test Files  2 failed | 76 passed (78)
     Tests  3 failed | 1006 passed | 6 expected fail | 3 todo (1018)
```

실패 2파일(3건)은 베이스 브랜치(`feat/M1-1125-I`) 선행 오류:
- `m2-1119-s-pos-slip-fixes.test.ts` — Next customer 버튼 헤더 위치
- `m3-1119-o-cd-emit.test.ts` — revertDisplayToPaid order_id 패턴

본 PR 로 추가된 실패 없음.
