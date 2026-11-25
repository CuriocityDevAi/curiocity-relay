#258 CHANGES

## 판정 근거

### 핵심 버그: oneshot 경로 pos-quote 무효화 누락

`useAddToDraftOrder` / `useUpdateDraftOrderItem` 의 oneshot 성공 경로에서 `invalidateDraftAndQuote` 가 조건부로 스킵됨.

- `useAddToDraftOrder.onSettled` (draft-orders.tsx:867–870): `oneshotDone === true` 이면 무효화 없음
- `useUpdateDraftOrderItem.onSettled` (draft-orders.tsx:1085–1088): `wasOneshot === true` 이면 무효화 없음

상품 추가·수량 변경은 대부분 oneshot 경로를 사용 → 가장 빈번한 카트 조작 직후 pos-quote stale. CartPanel 의 `displaySubtotal` / grand_total 이 이전 quote 값을 계속 표시함.

### 테스트 커버리지 부족

`__tests__/m1-1125-j-quote-invalidation.test.ts` 의 mutation 경로 케이스(`it.each(cases)`)가 실제 mutation hook을 거치지 않고 `invalidateDraftAndQuote(qc)` 를 직접 호출. oneshot 조건 분기가 테스트되지 않아 위 버그 통과.

### 나머지 항목

- mutation 목록 완전성: 8개 완전. order type·note·수동 할인은 결제 단계 단일 호출 — 추가 누락 없음.
- `quote.isFetching` 사용: pos-quote 에 refetchInterval 없음. app focus 복귀 시 추가 blur만 발생 — 허용 범위.
- CI: assertions · flow-tests · lint · playwright 모두 SUCCESS.

## master vs PR 테스트 비교

명령: `NODE_PATH=/Users/kyu.lee/projects/agilo-medusa-pos-fork/node_modules \
  /Users/kyu.lee/projects/agilo-medusa-pos-fork/node_modules/.bin/vitest run --reporter=verbose`

| 기준 | 실패 파일 | 전체 파일 |
|------|-----------|-----------|
| base (`f3decf5`, PR merge-base) | 7 | 74 |
| PR (`1604759`) | 8 | 78 |

PR이 추가한 4개 파일 중 `m3-1124-n-custom-display-id-priority.test.ts` 1개가 worktree 환경에서 `qrcode` 모듈 경로 오류로 fail. 메인 repo에서 실행 시 10 cases all pass → 환경 아티팩트이며 PR이 기존 통과 테스트를 새로 깨뜨린 것 없음.

### base 실패 7파일 (pre-existing)

```
FAIL  __tests__/m0-1121-a-logo-print.test.ts           (upng-js 미설치)
FAIL  __tests__/m2-1123-e-receipt-queue-num.test.ts
FAIL  __tests__/m3-1117-g.test.ts
FAIL  __tests__/m3-1117-u.test.ts
FAIL  tests/flows/screen-calcs.test.ts
FAIL  __tests__/m2-1119-s-pos-slip-fixes.test.ts       (2 cases)
FAIL  __tests__/m3-1119-o-cd-emit.test.ts              (1 case)
Test Files  7 failed | 67 passed (74)
Tests  3 failed | 886 passed | 4 expected fail | 3 todo (896)
```

### PR 실패 8파일

```
FAIL  __tests__/m0-1121-a-logo-print.test.ts
FAIL  __tests__/m2-1123-e-receipt-queue-num.test.ts
FAIL  __tests__/m3-1124-n-custom-display-id-priority.test.ts  ← 신규(환경 아티팩트)
FAIL  __tests__/m3-1117-g.test.ts
FAIL  __tests__/m3-1117-u.test.ts
FAIL  tests/flows/screen-calcs.test.ts
FAIL  __tests__/m2-1119-s-pos-slip-fixes.test.ts       (2 cases)
FAIL  __tests__/m3-1119-o-cd-emit.test.ts              (1 case)
Test Files  8 failed | 70 passed (78)
Tests  3 failed | 927 passed | 4 expected fail | 3 todo (937)
```
