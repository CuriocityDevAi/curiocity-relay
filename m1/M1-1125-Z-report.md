PASS

## M1-1125-Z — storeport #446 main 위로 rebase

**새 head SHA:** `04969d8` (rebased from `75643e2`)

**rebase 명령:**
```
git rebase --onto origin/main 7d3d8ba
```
- onto: `origin/main` → `756e7fa` (#444 squash 머지 커밋)
- upstream: `7d3d8ba` (#444 원본 최종 커밋, M1-1125-X 타입체크 픽스)
- 충돌: 없음

**PR #446 고유 커밋 (2개):**
- `04969d8` fix(cd): M1-1125-U — CustomerFlow.source '"cd" | "pos" | null' (계약서 v1.1)
- `b8d5c28` feat(cd): M1-1125-U — LiveIndexRoute CD sync 연결 · taxRate fix · live e2e

**PR #446 변경 파일 (M1-1125-U 고유 — 7개, 모두 apps/customer-display/):**
- `apps/customer-display/app/index.tsx`
- `apps/customer-display/app/mirror.tsx`
- `apps/customer-display/e2e/live-cd-route.spec.ts`
- `apps/customer-display/src/lib/__tests__/live-cd-connect.test.ts`
- `apps/customer-display/src/lib/snapshot-api.ts`
- `apps/customer-display/src/types/cd-sync-contract.ts`
- `apps/customer-display/src/types/order-snapshot.ts`

**#444 원본 커밋 제거 확인:** `93ea32f` · `519c282` · `3d974ee` · `7d3d8ba` → 모두 제거됨 ✓

**로컬 검증:**
- customer-display typecheck: PASS (tsc --noEmit 에러 없음)
- customer-display 단위 테스트: PASS (16 test files, 312 tests passed)

**push:** `git push origin feat/M1-1125-U --force-with-lease` → 성공
