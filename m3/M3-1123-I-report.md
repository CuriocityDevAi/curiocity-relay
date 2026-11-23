DONE — rebase 성공 · PR #236 base=master · mergeable=clean · diff M3-1123-H 변경만

## #236 현황

- base: `master` (← `fix/M3-1123-G-sell-test1` 에서 변경)
- mergeable: **clean**
- commits: 1 (`3b24ad8` feat(sell): M3-1123-H — Ask on display 버튼 API 연결)

## diff 통계 (+352 / -9)

| 파일 | 변경 |
|------|------|
| `api/hooks/ask-phone-on-display.ts` | 신규 +42 |
| `components/order-chips/OrderChipDetail.tsx` | +49 / -9 |
| `components/order-chips/OrderChips.tsx` | +3 |
| `e2e/flows/M3-1123-H-ask-display.spec.ts` | 신규 +258 |

## 작업 내용

1. `git stash` → `git rebase --onto origin/master e6c9a0d feat/M3-1123-H-ask-on-display` (G 커밋 1개 제외, H 커밋만 replay)
2. `git push --force-with-lease origin feat/M3-1123-H-ask-on-display`
3. PR #236 base → `master` 변경 (GitHub API)
