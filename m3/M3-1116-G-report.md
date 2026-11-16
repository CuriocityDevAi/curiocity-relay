#149 base master · #150(→#152) rebase · 로컬 검증 · CI

## 작업 요약

### #149 (M3-1116-D)
- `git rebase --onto origin/master feat/m3-1116-c feat/m3-1116-d` 완료
- `feat/m3-1116-d` → D 커밋만 (ed1866f + fix bf5e419)
- `gh pr edit 149 --base master` 완료
- CI: assertions ✓ / flow-tests ✓ / playwright ✓ / lint ✗ (pre-existing prettier 에러, split-tender 파일, 우리 커밋과 무관)

### #150 → #152 (M3-1116-F)
- #149와 HEAD 브랜치 공유 충돌(head==base 불가) → #150 close 후 `feat/m3-1116-f` 브랜치 분리
- `feat/m3-1116-f` = D + fix + F (master 위)
- 새 PR #152: head=feat/m3-1116-f, base=feat/m3-1116-d
- CI: assertions ✓ / flow-tests ✓ / playwright ✓

### 로컬 검증
- Lint: 2 errors (pre-existing, split-tender — 우리 파일 무관)
- TypeScript: 10 errors (pre-existing, FlashList/toast 등 — 우리 파일 무관)
- 단위 테스트: 335 passed / 30 test files (loyalty-snapshot 18 cases ✓, add-to-cart ✓)
- color-assertions: 최초 실패 (bg-green-500 / text-amber-500 → bg-success / text-warning 수정 후 37/37 ✓)

### 브랜치 구조 (최종)
- `feat/m3-1116-d`: master → D → fix (PR #149)
- `feat/m3-1116-f`: master → D → fix → F (PR #152)
