# M3-1105-BK Report

## 수정 내용
- `components/orders/VoidRefundSheet.tsx:142`
  - 전: `fulfilled: Number(it.fulfilled_quantity ?? 0) > 0`
  - 후: `fulfilled: it.fulfilled_quantity != null ? Number(it.fulfilled_quantity) > 0 : undefined`
  - 서버가 `fulfilled_quantity` 미전송 시 `undefined` 반환 → "Not handed over" 오표시 방지

## 단위 테스트
- `__tests__/void-refund-fulfilled-flag.test.ts` 신설 (7 assertions)
  - null → undefined, undefined → undefined, 0 → false, 1 → true, 2 → true, "0" → false, "3" → true

## Rebase 결과
- BG/BI 커밋(이미 squash됨 → a06900b #113) 드랍
- BH 고유 커밋(84ff0ba) + fix 커밋(5c35939)만 origin/master 위로 rebase
- `git rebase --onto origin/master 1faa967` 성공

## 커밋
- `84ff0ba` feat(pos): M3-1105-BH
- `5c35939` fix(pos): R0-1105-CX — fulfilled_quantity null 시 undefined 반환

## PR #114
- base: `feat/m3-1105-bg-nav-cleanup` → `master` 변경 완료
- force-with-lease push 완료
- CI run 43251904450 (assertions, flow-tests, lint) pending → 초록 대기 중

## lint / vitest
- lint: 0 errors (warnings only — QuantityPicker useEffect 등 기존 issues)
- vitest: 7/7 passed
