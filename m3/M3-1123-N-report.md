PASS — rebase 성공, #245 base=master, mergeable=clean, diff M3-1123-M 변경만 확인.

## #245 base
master (`28a57c6` — #244 squash 머지 후 최신)

## mergeable
clean

## 파일 목록 (5개)
| 파일 | 상태 | +추가 | -삭제 |
|------|------|-------|-------|
| `app/(tabs)/_layout.tsx` | modified | +1 | -35 |
| `app/(tabs)/sell.tsx` | modified | +13 | -34 |
| `components/RegisterBadge.tsx` | modified | +11 | -12 |
| `components/SellTopBar.tsx` | added | +56 | — |
| `e2e/flows/M3-1123-M-sell-header.spec.ts` | added | +147 | — |

## +/- 줄 수
+228 / -81

## 작업 내역
- `git rebase --onto origin/master bbf00ec feat/M3-1123-M-sell-header` → 커밋 1개(`a211819`) 만 master 위에 재배치
- `git push --force-with-lease origin feat/M3-1123-M-sell-header`
- PR #245 base `fix/M3-1123-L-test2` → `master` 변경 (GitHub API)
