# M3-1117-G Report

master: empty 1회/첫 줄 100ms · #169: empty 0회/첫 줄 0ms

## 시각별 표

| ms   | master  | #169   |
|------|---------|--------|
| 0    | empty   | items  |
| 100  | items   | items  |
| 200  | items   | items  |
| 500  | items   | items  |
| 1000 | items   | items  |
| 2000 | items   | items  |
| 3100 | items   | items  |

## 방법론

React Native 컴포넌트 풀 마운트 대신 실제 `QueryClient` (@tanstack/react-query) + `buildOptimisticCartUpdate` 로 타이밍 재현.  
cart.tsx lines 589-594 조건을 직접 적용해 각 시점의 표시 상태를 계산.

## 버그 원인 (master)

- master skeleton guard: `draftOrder.data?.draft_order && !items.length && isMutating > 0`
- `draft_order = null` 인 경우를 잡지 못함 → 빈 카트 첫 탭 시 null 캐시 + isMutating=1 → **empty** 표시

## 수정 (#169)

1. `setQueryData` 가 `await cancelQueries` 보다 먼저(동기) 실행 → 첫 렌더 시점에 temp items 존재
2. skeleton guard 확장: `(!draft_order || !items.length) && isMutating > 0` → null 캐시도 skeleton

## 테스트 결과

- `__tests__/m3-1117-g.test.ts` — 9/9 통과
- Kyu 증상 재현: master t=0 → empty ✓
- 수정 검증: #169 t=0 → items ✓  
- 회귀 방지: #169 empty 0회 ✓, 첫 items ≤ 200ms ✓

## 이연 순증감

0 (신규 발부 없음)
