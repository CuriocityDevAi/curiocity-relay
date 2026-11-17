**판정: PASS — 재시작 즉시 크래시 3경로 차단 · 테스트 15/15 · PR #166 업데이트**

재설치 불필요. `buster: 'v1'` 이 첫 기동 시 AsyncStorage 오염 캐시 자동 소거.

---

## 근거 (파일:줄)

### (a) react-query 영속 캐시가 깨진 `['draft-order']` 복원하는가?
- `app/_layout.tsx:172` — `PersistQueryClientProvider persister=asyncStoragePersister` 로 **전 쿼리 AsyncStorage 영속화** 중. `buster` 미설정이었으므로 오염된 `{ draft_order_preview: ... }` 가 재시작마다 복원됨.
- 수정: `buster: 'v1'` 추가 → 기존 저장값 buster 불일치로 캐시 무효화.

### (b) 저장된 draft order id → 서버 응답 모양 검증
- `api/hooks/draft-orders.tsx:216` — `useCurrentDraftOrder.queryFn` 이 `sdk.admin.draftOrder.retrieve(id, ...)` 호출, `{ draft_order: ... }` 반환 (정상 모양). 서버 응답 자체는 문제없음.
- 오염 경로: M1-1116-AJ `onSettled` 가 `confirmEdit` 반환값 `{ draft_order_preview: ... }` 를 `setQueryData` 로 캐시에 덮어씀 → 영속화.

### (c) 앱 시작 시 `draft_order` 읽는 곳
- `app/(tabs)/cart.tsx:428` — `CartScreen useMemo` 에서 `draftOrder.data?.draft_order.items` → `draft_order` undefined 일 때 **즉시 crash** (detachInactiveScreens:false 로 항상 마운트)
- `app/(tabs)/cart.tsx:460,474` — `useCallback/useEffect` 의존성 배열 `draftOrder.data?.draft_order.id` → 렌더 중 평가, crash
- `app/(tabs)/cart.tsx:494-507` — `cartSummary useMemo` 가 `draftOrder.data ?` guard 후 `.draft_order.tax_total` 접근 → crash
- `app/checkout/[draftOrderId].tsx:55` — `DraftOrderItem` 의 `draftOrder.data?.draft_order.region?.currency_code` → crash

---

## 수정 내용

| 파일 | 수정 |
|---|---|
| `app/_layout.tsx` | `buster: 'v1'` — 기존 오염 캐시 무효화 |
| `api/hooks/draft-orders.tsx` | `isDraftOrderCacheCorrupted` + `AuthedBootstrap` validator (shape guard) |
| `app/(tabs)/cart.tsx` | `draft_order?.items/id/region` optional-chain 보강 6곳 · `cartSummary` guard 강화 |
| `app/checkout/[draftOrderId].tsx` | `draft_order?.region?.` 보강 |
| `__tests__/m1-1117-b.test.ts` | 신규 15 tests: corrupted shape 감지 · validator no-throw · optional-chain |

---

## 테스트 로그

```
✓ __tests__/m1-1117-a.test.ts  11 passed
✓ __tests__/m1-1117-b.test.ts  15 passed
  - M1-1117-B (a) isDraftOrderCacheCorrupted   7 passed
  - M1-1117-B (b) validator — throw 없음        4 passed
  - M1-1117-B (c) optional-chain 수정 후        4 passed
```

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/166

## 이연 순증감

이연 없음. M1-1117-A 와 동일 브랜치/PR 에 커밋 추가.
