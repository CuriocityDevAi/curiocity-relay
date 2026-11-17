#347 rebase OK · void 409 검증 · 테스트 7

## M0-1117-P 리포트 (2026-11-17)

**대상 PR**: #347 (feat/M0-1117-O-void-net)
**뿌리**: R0-1117-AN PR Review CHANGES 2건 · relay `r0/R0-1117-AN-report.md` 문제 1·2.
**작업 워크트리**: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1117-O-wt`
**HEAD 이전**: `d57eee7` (on 4aa3bde 위) · **HEAD 이후**: `b50d637` (on `8a7e9e1`(=rebased M0-1117-O) 위 · origin/main `0154afe` 바로 위 2 commits)

## 1. Rebase — 중복 커밋 drop

```
git rebase --onto origin/main 4aa3bde feat/M0-1117-O-void-net
  → Rebasing (1/1) Successfully rebased and updated refs/heads/feat/M0-1117-O-void-net.
git log --oneline origin/main..HEAD
  b50d637 fix(loyalty): M0-1117-P — void confirmed 경로 금액 검증 (preview_ref · expected_net_refund_amount)
  8a7e9e1 feat(loyalty): M0-1117-O — S5 void NET 미리보기·확인 2단계 + recover 빈틈 메움
```

- `4aa3bde` (M2-1117-W · S4 refund NET) drop — 이미 #345 로 머지 (`a5a344f`), 중복 커밋 제거.
- 최신 origin/main (`0154afe`) 위로 재배치 · 충돌 0.
- `preview-recover.ts` (main 버전) import 만, 수정 없음.

## 2. void confirmed 금액 검증 추가 (M0-1117-P)

**파일**: `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts`

- `VoidBody` 에 `preview_ref?: string` · `expected_net_refund_amount?: number` 필드 추가.
- preview 응답에 `preview_ref: previewResult.preview_ref` 포함 (confirmed 에서 에코).
- confirmed 분기 상단에 `validatePreviewRef(previewResult, body.preview_ref, body.expected_net_refund_amount)` 호출.
  - `reason === "missing_fields"` → **400** `{ type: "invalid_data", message: "confirmed=true requires preview_ref and expected_net_refund_amount" }`
  - `reason === "stale"` → **409** `{ code: "preview_stale", new_preview }` · workflow 미호출 → DB 무변경.
- refund route 338-354 패턴과 동일. `preview-recover.ts` (loyalty lib) 는 수정 없이 named import 만.
- 하위 호환 (preview/confirmed 둘 다 없음) 분기는 그대로 — recover 빈틈 메움 유지.

## 3. 테스트 — 7 신설 케이스 모두 pass

**파일**: `apps/commerce-core/src/workflows/pos-void/__tests__/pos-void-route.unit.spec.ts`

| # | 케이스 | 검증 |
|---|---------|------|
| 1 | confirmed · preview_ref 누락 | 400 invalid_data · "preview_ref" 포함 · workflow 미호출 |
| 2 | confirmed · expected_net_refund_amount 누락 | 400 invalid_data · "expected_net_refund_amount" 포함 · workflow 미호출 |
| 3 | confirmed · preview_ref 불일치 | 409 `{code:"preview_stale",new_preview}` · workflow 미호출 |
| 4 | confirmed · 금액 불일치 (10000 vs 7000) | 409 · new_preview.net_refund_amount=7000 · workflow 미호출 |
| 5 | confirmed · preview_ref + 금액 일치 (정상 confirmed) | 200 ok · workflow 1회 호출 |
| 6 | 하위 호환 (preview/confirmed 둘 다 없음) | 200 ok · preview 미호출 · workflow 1회 호출 |
| 7 | preview=true | preview_ref 응답 포함 · workflow 미호출 |

**가정**: 테스트는 route `await import("…/preview-recover.js")` 의 `.js` 접미사 때문에 `virtual: true` 로 preview-recover 모듈을 mock (jest 리졸버가 `.js` 확장자 그대로는 찾지 못함). `jest.requireActual` 로 `validatePreviewRef` (pure 함수) 는 실제 구현을 그대로 사용 → 검증 로직의 end-to-end 커버.

## 4. 전체 테스트 로그

```
TEST_TYPE=unit pnpm --filter commerce-core test (= npx jest)
  Test Suites: 44 passed, 44 total
  Tests:       523 passed, 523 total
  Snapshots:   18 passed, 18 total
  Time:        5.021 s
```

push 시 pre-push hook 재실행: `Tests: 523 passed, 523 total · Time: 18.835s`.

## 5. tsc 신규 에러 0

```
cd apps/commerce-core && npx tsc --noEmit
  src/workflows/pos-fulfill/steps/mint-sale-receipt.ts(160,67): error TS2871: This expression is always nullish.
```

- `src/workflows/pos-fulfill/steps/mint-sale-receipt.ts:160` TS2871 은 **origin/main `0154afe` 와 동일** (`?? null ?? null` · M2-1117-Z 에서 유입).
- M0-1117-P 변경 범위 (`void/route.ts` + 신설 `pos-void-route.unit.spec.ts`) 는 **TS 에러 0**.

## 6. push · PR 갱신

- `git push --force-with-lease origin feat/M0-1117-O-void-net` → `+ d57eee7...b50d637 (forced update)`.
- `gh pr edit 347 --body-file …` → PR 본문에 R0-1117-AN CHANGES 2건 해결 표 추가. PR URL: https://github.com/CuriocityDevAi/storeport/pull/347.
- /loop 미사용 · 35분 상한 내 완료.

## 허용 파일 범위 준수

| 파일 | 수정 여부 |
|------|-----------|
| `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` | O (VoidBody 2 필드 + 검증 분기 24줄 · preview 응답 1 필드) |
| `apps/commerce-core/src/workflows/pos-void/__tests__/pos-void-route.unit.spec.ts` | 신설 |
| `apps/commerce-core/src/workflows/pos-void/**` | 수정 없음 (d57eee7 그대로) |
| `apps/commerce-core/src/lib/loyalty/preview-recover.ts` | **수정 없음** (main 버전 import 만) |
| refund route / workflow | **수정 없음** |
