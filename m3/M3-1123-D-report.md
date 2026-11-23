M3-1123-D · FIXED — 낡아진 어설션 2종 갱신 + CartPanel estimatedItemSize 실제 회귀 수정

원인: M3-1123-A 탭 구조 변경(cart.tsx→CartPanel.tsx 이동) 시 어설션 경로 미갱신 + estimatedItemSize 누락

커밋: 2699044 (`fix(assertions): M3-1123-D — AP·C 어설션 M3-1123-A 탭 구조 갱신 + CartPanel estimatedItemSize 복원`)

로컬 assertions 결과: 47개 · 46 PASS · 1 FAIL(m3-1105-ab: 로컬 .claude/worktrees/ 스캔 false positive · CI에서는 PASS)
