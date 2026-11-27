PASS bc236af — #291 전용 테스트(M3-1127-K ⑤⑧)가 #294 브랜치에 혼입돼 unit-tests 빨강 유발.

## 실패 테스트
- `M3-1127-K ⑧ 위치·크기 로컬 저장 > storeport ?mirror=1 → /mirror 리다이렉트 존재`
  - `expect(s).toMatch(/isMirrorRequested/)` 실패
  - 대상 파일: `../storeport/apps/customer-display/app/_layout.tsx`

## 원인
#291 전용 테스트 혼입 — storeport `_layout.tsx`에 `isMirrorRequested` / `router.replace → /mirror` 는 #291 에서 추가되는 기능이고, storeport 최신화 후에도 해당 코드가 없음. `m3-1127-k-cd-preview-edge.test.ts`의 ⑤⑧ describe 블록이 #294(`fix/M3-1127-N-text-node`) 브랜치에 함께 들어와 CI 실패를 유발.

## 조치
`__tests__/m3-1127-k-cd-preview-edge.test.ts` 에서 ⑤(`미러 쓰기 요청 없음`) · ⑧(`위치·크기 로컬 저장`) describe 블록 제거(42줄).

## 결과
- Tests: 1220 passed | 6 expected fail | 3 todo (0 failed)
- commit: `bc236af` pushed → `origin/fix/M3-1127-N-text-node`
