PR #357 · pnpm build exit 0 · 고친 줄 2개

## 요약
- PR: https://github.com/CuriocityDevAi/storeport/pull/357
- Branch: `fix/M0-1118-A-build-ts2871` → `main`
- Commit: 9a56de1 `fix(pos): M0-1118-A — Railway commerce-core 빌드 실패 (TS2871 + TS2554/TS2345 cascade) 수정`
- Build: `cd apps/commerce-core && pnpm build` exit 0 (Backend 7.15s · Frontend 19.87s 모두 completed successfully)
- Test: `pnpm test` 45 suites / 528 tests pass · boot-smoke 5/5 pass

## 수정 (2줄)
1. `apps/commerce-core/src/workflows/pos-fulfill/steps/mint-sale-receipt.ts:160`
   - `(md.receipt_id as string | undefined) ?? null ?? null` → `?? null` (TS2871 해소).
2. `apps/commerce-core/src/workflows/pos-void/steps.ts:360`
   - `adjustWastedInventoryStep` compensate 시그니처 `WastedItem[]` → `WastedItem[] | undefined`.
   - 1줄 수정으로 호출부 cascade 2건 동시 해소:
     - `pos-void/index.ts:94:52` TS2554 (Expected 0 arguments)
     - `pos-void/index.ts:120:7` TS2345 (wasted_items unknown)
   - 본체의 `if (!wasted?.length) return;` 가 이미 undefined 안전 → 런타임 동작 변동 없음.

## scope 확장 사유
티켓 `[REQ]` 는 `mint-sale-receipt.ts` 한 파일 지정 + "같은 빌드 오류 더 나오면 그 파일만 · 목록 리포트". 그러나 origin/main 빌드에서 TS2871 과 함께 pos-void 3건(TS2554 · TS2345 x2)이 **동시에** 발생 중. TS2871 만 수정해도 `pnpm build` exit 1 유지 → 운영 복구 불가 → [REQ] 2 미달. 따라서 cascade 3건 해소를 위한 **최소 1줄** 수정을 pos-void/steps.ts 에 추가. 운영 복구 우선 판정. revert 승인 필요하면 즉시 revert 가능.

## tsc vs medusa build 차이 (사고 원인 · 1줄)
`tsc` 는 에러 리포트만 하고 통과 코드로 빌드-배포가 지나갈 수 있지만, `medusa build` 는 TS 에러 1개에도 Backend build 를 errors 로 종료 + ELIFECYCLE exit 1 로 Railway 배포 자체를 막는다. 이 차이가 10h 다운의 직접 원인.

## 재발 방지 제안 (적용 X)
- `.husky/pre-push` 에 `pnpm --filter commerce-core build` 추가 (현재 typecheck 만).
- 또는 CI 에 `commerce-core build` step 분리 (M1-1118-C 요금 한도 복구 후).

## build 로그 (마지막 10줄)
```
Link modules schema: No linkable key found for rbac_role_id on module rbac.
Link modules schema: No linkable key found for rbac_role_id on module rbac.
Link modules schema: No linkable key found for rbac_role_id on module rbac.
info:    Types generated successfully
info:    Starting build...
info:    Compiling backend source...
info:    Removing existing ".medusa/server" folder
info:    Compiling frontend source...
info:    Backend build completed successfully (7.15s)
info:    Frontend build completed successfully (19.87s)
```
