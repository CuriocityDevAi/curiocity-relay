#385 · rebase O(충돌 0) · eslint 0 error O · R0C-A 3곳 #388(a9b0c32) lib 승격으로 해소 · typecheck O/unit 539/539 O/it tenders 96/96 O

## rebase
- `git rebase origin/main` — 충돌 0, 자동 완료
- branch HEAD: 736ee00 (rebased onto 59c5413)

## ESLint (pnpm --filter commerce-core exec eslint .)
- 0 errors, 105 warnings — 통과
- warn→error 승격 후 전체 클린

## R0C-A 3곳 해소 경위 (#388 a9b0c32이 선행 처리)
1. `src/lib/link-customer-order.ts` → `api/admin/pos/_shared/manager-pin` 경계 위반
   → **해소됨**: #388이 `manager-pin` 로직을 `src/lib/manager-pin.ts`로 승격, `link-customer-order.ts`가 lib 경로 import로 전환
2. `payment_xendit/__tests__/qris-xendit-bd` → `_shared/xendit-refund` 경계 위반
   → **해소됨**: #388이 `tryXenditRefund`를 `payment_xendit/lib/xendit-refund.ts`로 승격, 테스트가 lib 경로 import로 전환
3. `qris-simulate-bk` → `orders/[id]/qris-simulate/route` 경계 위반
   → **해소됨**: #388이 `handleQrisSimulate`를 `payment_xendit/lib/qris-simulate-handler.ts`로 승격, 테스트가 lib 경로 import로 전환

## 검증 결과
- typecheck: 에러 0 (tsc --noEmit 통과)
- unit: 47 suite / 539 tests all pass
- it tenders: 1 suite / 96 tests all pass

## PR 본문 수정
- 기존 `ESLint (SHARED_FILES): **위반 0**` → `ESLint 전체: 0 errors (105 warnings) + R0C-A 3건 해소 경위 추가`
- rebase 이력 섹션 추가

## CI
- push (force-with-lease): 60f57c3→736ee00
- 새 CI run 시작 확인: runs/44493883099, runs/44493883071 (pending)
