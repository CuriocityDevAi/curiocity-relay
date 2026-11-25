PASS · M0-1125-O · R0-1125-AB CHANGES 반영 + master rebase + push.

## 결과

- 브랜치: `feat/M0-1125-L-bottomsheet-worklet-crash` (PR #264)
- 최종 SHA: `20fdfe5` (force-with-lease push 완료)
- 커밋: `fix(pos): M0-1125-O — restoreWaitingDraftOrders 행동 테스트 (R0-1125-AB CHANGES)`
- PR 코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/264#issuecomment-7157443392

## 변경

**`api/hooks/draft-orders.tsx`** (+1/-1)
- `restoreWaitingDraftOrders` 를 `async function` → `export async function` 으로 변경.
- 시그니처 `(sdk, stockLocationId)` · 본문 그대로. 선례 #263 `discontinueOrderMutationFn` 과 동일 패턴.
- 기존 호출부 (`reconcileDraftOrderList`, `AuthedBootstrap`) 영향 없음.

**`__tests__/m0-1125-l-bottomsheet-worklet.test.ts`** (+64/-17)
- 기존 #3·#4 (소스 문자열 regex 로 draft-orders URL 검사) → `sdk.client.fetch` mock 행동 테스트로 교체.
- `vi.mock` 로 React Native 의존성 차단 (`@/contexts/auth` · `@/contexts/settings` · `@/utils/errors` · `@/lib/secure-storage` · `@tanstack/react-query`).
- `makeSdk()` = `fetch` 를 `.mockResolvedValueOnce({ register_sessions: [] })` + `.mockResolvedValueOnce({ draft_orders: [] })` 로 2개 호출 모두 안전 응답.
- `findDraftOrdersUrl` = `fetch.mock.calls` 에서 `/admin/draft-orders` 로 시작하는 호출 추출 (첫 호출 `/admin/register-sessions?status=open` 과 분리).
- 검증: `url` 에 `[?&]status(?:\[\])?=` 없음 · `[?&]fields=` 존재 · `[?&]limit=\d+` 존재.
- #1·#2 BottomSheet worklet 정적 검사 그대로 유지 (R0 동의 — 웹/vitest 로 worklet 런타임 재현 불가).

## master rebase

- 원격 `master` 가 #262 (`171be70` M3-1125-M) · #263 (`6412809` M3-1125-N) 반영됨.
- `git rebase origin/master` → 충돌 없음. `isNonDraftOrderResponse` re-export (#262, line ~320) 와 `restoreWaitingDraftOrders` 수정 (line ~330) 독립.

## 테스트 로그

```
$ npx vitest run __tests__/m0-1125-l-bottomsheet-worklet.test.ts
 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  212ms

$ npm test
 Test Files  85 passed (85)
      Tests  1086 passed | 6 expected fail | 3 todo (1095)
   Duration  2.89s

$ npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
      14
```

- 전체 test suite 85/85 pass.
- 대상 테스트 4/4 pass (worklet 정적 2건 + draft-orders URL 행동 2건).
- typecheck 14 error = pre-existing baseline (master 단독에서도 14 · 신규 0건 · 변경 파일에서 발생 0건).

## CI 상태

push 직후 `gh pr view 264 --json statusCheckRollup` → `[]` (아직 체크 미시작). 지시대로 반복 확인 없이 1회 확인 후 리포트.

## 범위 밖

- `node_modules` 는 untracked 로 남겨둠 (gitignore).
- 셀프 머지 없음 · PR 상태 OPEN 유지.
