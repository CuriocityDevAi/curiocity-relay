DONE — lint error 0 · #245 rebase 충돌 없음

## 커밋
- fix/M3-1123-L-test2: `bbf00ec` fix(lint): M3-1123-L — prettier deps 배열·메서드 체인 줄바꿈 수정
- feat/M3-1123-M-sell-header: `8a5fc26` (force-push · rebase 결과)

## prettier 변경 파일 (3건)
- `components/cart/CartPanel.tsx` — useCallback deps 배열 줄바꿈 (awaitingMutation 외 4개)
- `__tests__/m3-1123-a-order-chips.test.ts` — 배열 인라인화·ternary 괄호
- `e2e/flows/M3-1123-L-test2.spec.ts` — 메서드 체인 줄바꿈

## lint 결과
- error: 0
- warning: 5 (기존 패턴 — `no-unused-vars` 1·`set-state-in-effect` 1·`refs` 3)

## #245 rebase
- `git rebase fix/M3-1123-L-test2` → 충돌 없이 성공
- force-push: 7e48793 → 8a5fc26
