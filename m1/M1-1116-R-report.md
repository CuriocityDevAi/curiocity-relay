PR #312 · 방식: gitignore + git rm --cached + 스크립트 예외 · expo start 후 git status 깨끗

## 변경 내역
- `apps/customer-display/.gitignore`: `expo-env.d.ts` 추가 (Expo 권장, 파일 주석 명시)
- `git rm --cached apps/customer-display/expo-env.d.ts`: 기존 tracked 파일 untrack
- `apps/customer-display/scripts/dev-refresh.sh`: dirty 체크에서 `expo-env.d.ts` · `tsconfig.json` 제외 (app.json 과 동일 방식, 안전망)

## 검증
- `bash -n` 문법 통과
- `git check-ignore -v apps/customer-display/expo-env.d.ts` → `.gitignore:5:expo-env.d.ts` 확인
- 커밋 후 `git status` 에 `expo-env.d.ts` 미표시 (`??` 없음)
- customer-display vitest 132 passed, commerce-core 332 passed
