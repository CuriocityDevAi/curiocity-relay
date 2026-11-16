# M0-1116-O — storeport #313 main 충돌 해결 (R0 APPROVE · 내용 변경 금지)

#313 rebase · 충돌 1건(`api/admin/pos/orders/[id]/loyalty-info/route.ts`) · unit ✅ + customer-link.spec ✅ · push cf23c8d

## 수행 요약

- 베이스 `origin/main` = `8af5728` (M1-1116-T #315 반영) 위로 `fix/m0-1116-m` 2커밋 rebase.
  - `591c180` → `16a3436` fix(loyalty): M0-1116-M — 손님 화면 earn_preview 서버 계산
  - `b62de74` → `cf23c8d` test(loyalty): M0-1116-N — customer-link spec earn_preview 기대 갱신
- force-push: `b62de74 → cf23c8d` on `fix/m0-1116-m` (`--force-with-lease`).

## 충돌 해결 (1 file)

`apps/commerce-core/src/api/admin/pos/orders/[id]/loyalty-info/route.ts`

- main(#311 M1-1116-P) 의 `earn_rate_pct` 응답 필드 **보존**: `LOYALTY_SETTINGS_MODULE` · `DEFAULT_LOYALTY_SETTINGS` import + `earnRatePct` 계산 + `res.json({ earn_rate_pct: earnRatePct, ... })`.
- #313(M0-1116-M) 의 earn_preview 서버 계산 **유지**: `computeEarnPreviewForTotals` · `loadEarnPreviewSettings` import + `earnPreview` 계산 (earn.applied === true 분기) + `res.json({ earn_preview: earnPreview, ... })`.
- 헤더 코멘트 2종(M1-1116-P · M0-1116-M) 모두 유지. `earn.ts` · `receipt-preview.ts` 변경 無.

## 테스트 (local)

- `src/lib/loyalty/__tests__/snapshot-earn.unit.spec.ts` → **7/7 pass** (세전 900 · 세후 990 case 포함)
- `integration-tests/loyalty/customer-link.spec.ts` → **12/12 pass** (15.5 s · 빈 draft order earn_preview=0 포함)
- pre-push unit 전수 → **343/343 pass** (25 suites)

## 상태

- CI (storeport-pr-ci) 는 push 후 자동 재실행. 결과 대기는 하지 않음(REQ 3).
- #313 이 "CONFLICTING" → "MERGEABLE" 로 전환되는지 확인은 다음 단계.

## 커밋

- head: `cf23c8d test(loyalty): M0-1116-N — customer-link spec earn_preview 기대 갱신`
- base: `8af5728` (origin/main)
