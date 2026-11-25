PASS

- CI run ID: 45632118139
- loyalty_admin: true
- e2e-admin-loyalty: 24 passed (28.0s)
- #447 head SHA: 95205e65d4e28c5945548c29ceefe233eff87c32

변경 내용: `.github/workflows/ci.yml` loyalty_admin 필터에 `apps/commerce-core/e2e/vite.*.config.ts` · `apps/commerce-core/e2e/playwright.*.config.ts` · `packages/receipt-view-model/**` 3개 패턴 추가. 이전 run(45628617047)에서 e2e/vite.smoke.config.ts 변경이 필터에 걸리지 않아 e2e-admin-loyalty 가 skip 됐던 문제 해소.
