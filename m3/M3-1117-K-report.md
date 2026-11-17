#169 mergeable · 테스트 통과

## 작업 내용
- origin/master(#175 기준) 로 rebase 완료
- 충돌: `api/hooks/customers.ts` — #173의 `type CreateCustomerInput` + M3-1117-J의 `usePosCustomerSearch` 양쪽 보존
- 버튼 문구: "Cancel Cart" → "Clear cart" (2곳)
- 확인창 제목: "Are you sure you want to cancel the cart?" → "Clear all items from the cart?"
- 테스트: vitest 48 files / 589 tests 통과
- gh pr view 169 --json mergeable → MERGEABLE
- force-with-lease push 완료
