CHANGES — CI e2e-admin-loyalty 미실행(skip): `loyalty_admin` 필터 패턴(`e2e/admin/**`)이 `vite.smoke.config.ts`(`e2e/` 직하)를 커버하지 않아 24건 수정 CI 미검증. fix 로직(경로·서버 런타임) 자체는 이상 없음.

## 확인 항목

### ① 서버 런타임 import — PASS
`grep -r "@storeport/receipt-view-model" apps/commerce-core/src` 결과:
모두 `src/admin/`(Admin Vite 번들)에만 존재.
`medusa-config.ts` 주석: "runtime 서버는 receipt-view-model를 쓰지 않음 (admin UI 전용)".
배포 파손 위험 없음.

### ② CI e2e-admin-loyalty — FAIL (skipped)
CI run 45628617047 `heavy-mac` job 로그:
```
loyalty_admin: false
e2e-admin-loyalty → outcome=skipped;conclusion=skipped
```
원인: `changes-filter`의 `loyalty_admin` 패턴이
```
- 'apps/commerce-core/e2e/admin/**'
```
로 정의되어 있으나, 변경 파일 `apps/commerce-core/e2e/vite.smoke.config.ts`는
`e2e/` 직하에 위치 → 패턴 미매칭 → `loyalty_admin=false` → skip.
CI가 24건 fix를 실제로 검증하지 않고 `heavy-mac` pass.

필요 수정: `.github` `loyalty_admin` 필터에
`'apps/commerce-core/e2e/vite.smoke.config.ts'`(또는 `vite.*.config.ts`) 추가.

### ③ alias 경로 — PASS
- `medusa-config.ts` (`__dirname`=`apps/commerce-core/`): `../../packages/receipt-view-model/src/index.ts`
- `vite.smoke.config.ts` (`__dirname`=`apps/commerce-core/e2e/`): `../../../packages/receipt-view-model/src/index.ts`
둘 다 → `{root}/packages/receipt-view-model/src/index.ts` 동일 절대 경로.

## GitHub 리뷰
COMMENT(자기 PR 제한) 제출 완료.
판정 내용: CHANGES — CI 필터 보완 + re-run + 초록 확인 후 approve.
