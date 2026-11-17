판정: ✅ DONE — onSettled preview 캐시 오염 제거 · 뱃지 optional chaining · PR #166

## 근거 (파일:줄)

- `api/hooks/draft-orders.tsx:450-453` (구) — `setQueryData(['draft-order'], data as unknown as AdminDraftOrderResponse)`
  - `data` = `confirmEdit` 반환값 = `AdminDraftOrderPreviewResponse = { draft_order_preview }`
  - 캐시에 `{ draft_order_preview }` 를 써서 `draft_order` 키 소멸
  - `_layout.tsx:61` 의 `draftOrder.data.draft_order.items` → `TypeError: Cannot read properties of undefined`
- `api/hooks/draft-orders.tsx:450` (신) — `setQueryData` 블록 제거, `invalidateQueries` 단독 유지
- `app/(tabs)/_layout.tsx:61-62` (신) — `draftOrder.data?.draft_order?.items?.length ?? 0` optional chaining

## 테스트 결과

```
Test Files  38 passed (38)
     Tests  445 passed | 6 expected fail | 2 todo (453)
  Duration  1.04s
```

- `__tests__/m1-1117-a.test.ts` 신규 12개 케이스 추가 · 전부 통과
- `__tests__/m1-1116-y.test.ts` 기존 7개 통과 유지
- 전체 테스트 회귀 없음

## 웹 빌드 UI 확인

미검증 (CI/로컬 Expo 서버 미구동)

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/166

## 이연 순증감

0 (이연 없음)
