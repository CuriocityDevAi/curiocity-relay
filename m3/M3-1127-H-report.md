PASS · PR #289 · head cd45f9c

## 버그 원인 (파일:줄)

```
product-details.tsx:314  router.dismissTo('/(tabs)/cart')
  → cart.tsx:9           <Redirect href='/(tabs)/sell' />
    → sell.tsx:90-96     useFocusEffect → reconcileDraftOrderList (매 포커스마다)
      → draft-orders.tsx:369-379  restoreWaitingDraftOrders가 서버에서 실제 draft 발견
        → addDraftOrderToList(draftA.id)  ← _draftOrderList에 추가
```

이 시점에 `onMutate`의 `activeId = '__temp__'`가 아직 살아있으면,
`OrderChips.tsx` inputs useMemo가 `'__temp__'` + 실제ID 를 모두 merged에 추가 →
칩 2개(#1·#1) 출현 후 setQueryData로 activeId가 실제ID로 바뀌면 `'__temp__'` 제거.

동시에 두 개의 draft가 서버에 생성되는 경우는 아님 (시각적 중복).

## 수정

| 파일 | 변경 |
|------|------|
| `components/order-chips/types.ts` | `mergeActiveId()` 추가: `activeId === '__temp__'` 이면 merged에 추가하지 않음 |
| `components/order-chips/OrderChips.tsx` | inputs useMemo → `mergeActiveId()` 사용 |
| `__tests__/m3-1127-h-draft-duplicate.test.ts` | 신규 테스트 8개 |

## CI-summary (로컬 vitest)

| 항목 | 결과 |
|------|------|
| 전체 테스트 파일 | 91 passed |
| 전체 테스트 케이스 | 1194 passed, 6 expected fail, 3 todo |
| 신규 테스트 | 8 passed (m3-1127-h-draft-duplicate) |
| 기존 order-chips 테스트 | 26 passed 회귀 없음 |

GitHub Actions 없는 리포 — 로컬 테스트로 대체.

## 두 번째 draft 서버 잔존 여부 (M0-1127-G 참고)

이번 버그는 시각적 중복. 단, `useWithStaleDraftRecovery` stale 에러 경로에서:
`getOrSetDraftOrderId` → draftA 생성 → `run(draftA)` → stale 에러 →
`resetAndCreate` → draftB 생성 시 draftA 는 서버에 고아로 남음.
`restoreWaitingDraftOrders`가 draftA를 목록에 추가하고 손님 화면 snapshot이
draftA를 활성 스냅샷으로 잡을 가능성 있음 → M0-1127-G 별도 추적 필요.
