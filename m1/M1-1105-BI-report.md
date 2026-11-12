# M1-1105-BI Report

## 충돌 파일·채택

| 파일 | 충돌 | 채택 |
|------|------|------|
| `app/orders/[orderId].tsx` | bae3407(BH)가 top-level `import ViewShot from 'react-native-view-shot'` + eslint-disable 추가, master(#110)는 lazy-load(useMemo) 방식 | **master 채택**: ViewShot top-level import 삭제 · lazy-load useMemo 유지. BG의 `deriveGrandTotal`/`deriveOutstanding` import + 연산 변경은 그대로 얹음 |
| `package-lock.json` | rebase 중 자동 머지 성공 (충돌 없음) — vite 6.4.6 · vitest 5.1.0 반영 완료 | package-lock 추가 npm install 불필요 (이미 커밋 1392a74에 반영) |
| `vitest.config.ts` | #107 e2e Playwright 파일이 vitest에 걸려 실패 | `exclude: ['e2e/**']` 추가 커밋(9749687) — #107에만 적용 |

## 로컬 결과

- lint: 0 errors (44 warnings) ✅
- vitest (전체): Test Files 9 passed · Tests 93 passed | 6 expected fail ✅
- test:flows: Test Files 4 passed · Tests 46 passed | 6 expected fail ✅

## 두 PR CI Run 번호·결과

| PR | Branch | Run ID | 결과 |
|----|--------|--------|------|
| #105 | test/m1-1105-be-flow-e2e | 43192692056 | ✅ success |
| #107 | test/m1-1105-bf-playwright-flows | 43192903920 | ✅ success |

## 작업 내용

1. `test/m1-1105-be-flow-e2e` → `origin/master(82c0751)` 위로 rebase · force-with-lease push
   - 충돌 1건: `app/orders/[orderId].tsx` import 섹션 — master 채택(top-level ViewShot import 제거)
2. PR #107 base `test/m1-1105-be-flow-e2e` → `master` 로 변경(`gh pr edit --base master`)
3. `test/m1-1105-bf-playwright-flows` → 새 `test/m1-1105-be-flow-e2e` 위로 rebase(`--onto`) · force-with-lease push
   - 충돌 없음 (BF 커밋 2개만 replayed)
   - vitest.config.ts e2e 제외 커밋 추가
