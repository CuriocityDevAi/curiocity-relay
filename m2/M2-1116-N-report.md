PR #305 · projectId 반영 · 웹 export 영향 없음

## 작업 내용
- `apps/customer-display/app.config.ts` 한 파일 수정
- `EAS_PROJECT_ID` 기본값 `""` → `"5b023fc6-c56a-4846-b187-ba16019e3ca3"` (환경변수 우선 유지)
- PLACEHOLDER 조건 분기 제거 (단순화)
- 주석 "자리만 두고" → 실제 ID 기록으로 정정

## 검증 결과
- `npx expo config --type public`: `extra.eas.projectId=5b023fc6-c56a-4846-b187-ba16019e3ca3` ✓
- `updates.url=https://u.expo.dev/5b023fc6-c56a-4846-b187-ba16019e3ca3` ✓
- `EAS_BUILD_PLATFORM=ios` 시 baseUrl 없음 ✓
- `pnpm build:web`: `/customer-display-web` prefix 유지 ✓
- vitest: 326 passed (commerce-core) + 123 passed (customer-display) ✓
