#169 APPROVE · 원인 타당 예

## PR 개요

- 커밋 2개: `824475a` (M3-1117-C) + `35d1e17` (M3-1117-I)
- 브랜치: `fix/M3-1117-C` → `master` (worktree: `/Users/kyu.lee/projects/pos-m3`)

---

## REQ 1 · 원인 타당성 (`api/hooks/draft-orders.tsx`)

### staleTime=0 여부
`useCurrentDraftOrder` (line 242~292)에 `staleTime` 설정 없음 → TanStack Query 기본값 `0` 적용. 명시적으로 설정되지 않았지만 사실상 `staleTime=0`이 적용된 상태.

### `enabled: isAddingToCart === 0` 가드
line 240~244에 정확히 구현됨:
```ts
const isAddingToCart = useIsMutating({ mutationKey: ['draft-order', 'items', 'add'] });
return useQuery({
  queryKey: ['draft-order'],
  enabled: isAddingToCart === 0,
  ...
```
mutationKey가 `['draft-order', 'items', 'add']`로 `useAddToDraftOrder`의 key와 정확히 일치.

### background refetch → null 덮어씀 경로 성립 여부
경로: `setQueryData` → cart 마운트 → active observer 등록 → `staleTime=0`이므로 즉시 stale → background refetch 발화 → `queryFn`이 `SecureStore.getItemAsync(DRAFT_ORDER_ID_STORAGE_KEY)` 호출 → 빈 카트 첫 탭이면 아직 `setItemAsync`가 완료 안 된 상태이므로 `null` 반환 → 낙관적 캐시 덮어씀.

이 경로는 코드상 실제로 가능하다. `useCurrentDraftOrder.queryFn` (line 246~248)이 SecureStore에 ID 없으면 `return null`을 하고, 이 null이 캐시에 쓰인다.

### ~3초 타이밍 설명
`queryFn` 내 `sdk.admin.draftOrder.retrieve()`의 왕복 RTT(API 서버)가 약 2~3초라면, background refetch 완료 → cache=null 덮어씀 → `isAddingToCart`가 0으로 떨어지는 순간(= onSettled 직전) 동시에 `empty` 렌더 → 약 3초 플래시. 타이밍 설명 성립.

**판정: 원인 타당 예**

---

## REQ 2 · 회귀 안전성

### 정상 케이스 (서버 갱신 반영)
`onSettled`에서 `invalidateQueries` 실행 (line 483~489). 뮤테이션 완료 시 `isAddingToCart`가 0이 되어 `enabled=true`로 복귀 → TanStack Query가 stale 쿼리 즉시 refetch → 서버 최신 데이터 반영. 회귀 없음.

### 멀티 디바이스 (다른 디바이스 변경 반영)
`enabled` 차단은 `mutationKey=['draft-order', 'items', 'add']` in-flight 중에만 적용. 뮤테이션 없는 idle 상태에서는 `enabled=true`이므로 포커스 복귀 / window focus refetch 등 TanStack 기본 메커니즘이 정상 동작. 회귀 없음.

### 카트 취소 (empty 복구)
`useCancelDraftOrder` (line 294~321)는 별도 mutationKey(`['draft-order', 'cancel']`)를 사용. `useIsMutating({ mutationKey: ['draft-order', 'items', 'add'] })`은 add mutation만 카운트하므로 cancel 후 `enabled=true`가 유지됨 → `invalidateQueries` → queryFn → SecureStore ID 없음 → `null` 반환 → empty 정상 표시. 회귀 없음.

### #166 캐시 모양 가드 (`isDraftOrderCacheCorrupted`)
`isDraftOrderCacheCorrupted` 함수 및 `AuthedBootstrap` validator (line 131~172)는 이번 PR에서 미변경. `enabled` 가드가 추가되어도 app 기동 시 `AuthedBootstrap`이 먼저 오염 캐시를 제거하는 순서는 그대로. 회귀 없음.

### #158 `pendingVariantAdds`
`pendingVariantAdds` Map (line 324~)은 `mutationFn` 내부 로직이며, `onMutate`의 순서 변경(`enabled` 추가)과 독립적. `snapshotQueue` → `mutationFn`의 snapshot 소비 흐름도 그대로. 회귀 없음.

### `_draftOrderCreationPromise`
`_draftOrderCreationPromise` (line 85)는 `useGetOrSetDraftOrderId` 내 모듈 수준 singleton으로 `mutationFn` 내 `withStaleRecovery` 경로에서만 사용. `onMutate`의 순서 변경·`enabled` 가드와 무관. 회귀 없음.

---

## REQ 3 · `[cart-timing]` 로그 DEV 가드

| 파일 | 라인 | 가드 여부 |
|------|------|-----------|
| `api/hooks/draft-orders.tsx` | 449 | `if (__DEV__)` ✓ |
| `api/hooks/draft-orders.tsx` | 473 | `if (__DEV__)` ✓ |
| `app/product-details.tsx` | 299 | `if (__DEV__)` ✓ |
| `app/product-details.tsx` | 322 | `if (__DEV__)` ✓ |
| `app/(tabs)/cart.tsx` | 449 | `if (__DEV__)` ✓ (useEffect 첫 줄) |
| `app/(tabs)/cart.tsx` | 453~457 | `if (!__DEV__) return;` ✓ (effect 전체 guard) |

**전체 `[cart-timing]` 로그가 `__DEV__` 가드 내부에 있음. 프로덕션 빌드에 로그 노출 없음.**

---

## REQ 4 · 자동화 검증

### 테스트 결과
```
npx vitest run __tests__/m3-1117-c.test.ts __tests__/m3-1117-i.test.ts
Test Files  2 passed (2)
Tests       18 passed (18)   Duration 137ms
```
(jest로는 vitest import CommonJS 오류 발생 → vitest CLI로 실행. 프로젝트 test runner는 vitest.)

**주의**: `vitest.config.ts`에 `define` 키가 중복 (line 10, 14) → TS error `TS1117` + vitest 경고. 기능 영향은 없지만 lint warning 존재.

### 타입 체크 (`npx tsc --noEmit`)
이번 PR과 직접 관련된 에러 없음. 기존 베이스라인 에러들(cart.tsx FlashList, e2e spec, split-pending-orders 등)이 포함되어 있으며, 모두 이번 PR 이전부터 존재하는 것들임. 새로 도입된 TS 에러 없음.

### master 대비 diff
```
git diff origin/master...fix/M3-1117-C --name-only
```
변경 파일 목록에 `api/hooks/draft-orders.tsx`, `app/(tabs)/cart.tsx`, `app/product-details.tsx` 등 의도된 파일만 포함. 충돌 없음.

### PR 리뷰 코멘트
`gh pr view 169 --comments` → 출력 없음(코멘트 없음).

---

## 종합 판정

| 항목 | 결과 |
|------|------|
| 원인 타당성 | 타당 예 — staleTime=0 + background refetch → null 덮어씀 경로 코드상 성립 |
| `enabled` 가드 구현 | 올바름 — mutationKey 정확 일치 |
| M3-1117-C (`setQueryData` 순서) | 올바름 — cancelQueries await 이전에 동기 실행 |
| 회귀 | 없음 |
| DEV 가드 | 완비 |
| 테스트 | 18/18 pass |

**→ APPROVE**

### 비고 (non-blocking)
- `vitest.config.ts` 중복 `define` 키 → 경고만. 별도 clean-up 권장.
- `cart.tsx` data-change effect 내 `console.log`는 `if (!__DEV__) return` 가드로 보호되어 있으나, 가독성을 위해 `if (__DEV__) console.log(...)` 패턴으로 통일하는 것 고려.
