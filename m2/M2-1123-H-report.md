PASS — lint 0 errors · commit 887d3c6 · push 완료

## 커밋
- SHA: 887d3c6
- 브랜치: feat/M3-1123-H-ask-on-display
- push: origin/feat/M3-1123-H-ask-on-display ✓

## 로컬 lint 결과
- errors: 0
- warnings: 62 (전부 master 선재)

## 변경 파일
- `components/order-chips/OrderChipDetail.tsx` — :92 Button props 1줄로 (prettier)
- `e2e/flows/M3-1123-H-ask-display.spec.ts` — 줄 길이 초과 4곳 wrapping (prettier)
- `api/hooks/ask-phone-on-display.ts` — 변경 없음
- `components/order-chips/OrderChips.tsx` — 변경 없음

## master 선재 경고 확인
master 브랜치 lint 결과도 동일하게 0 errors · 62 warnings.
`require()` · `useMemo` · `imported multiple times` 경고는 모두 master 에 선재 — #236 미도입.
