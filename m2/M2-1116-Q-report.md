#308 · "MEROS HP Point" · 황금 계열 amber 띠 · TS clean

## 작업 요약

- **이름**: "MEROS HP Point" (14자 · iOS 2줄 wrapping 범위 — "HP Point" 단축 불필요)
- **띠 색**: dark teal → 황금 계열 amber (#C47D0A) · 띠 문구 "HP Point" · 대비색 dark teal 텍스트
- **TS BLOCKER 수정**: `app.config.ts` top-level `splash` 블록 제거 → `tsc --noEmit` clean
- **naming-check 예외**: `scripts/naming-check.sh` §1에 `app.config.ts` name 필드 1곳 허용 추가

## 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/customer-display/app.config.ts` | name "MEROS HP Point" · top-level splash 제거 |
| `apps/customer-display/assets/icon.png` | 황금 amber 띠 · "HP Point" 텍스트 |
| `apps/customer-display/assets/splash.png` | 아이콘 반영 재생성 |
| `scripts/naming-check.sh` | M2-1116-Q 예외 1줄 추가 |

## Checks

- `tsc --noEmit` → clean ✅
- `naming-check` → PASS ✅
- `npx expo config --type public` → `name: 'MEROS HP Point'` · top-level splash 없음 ✅
- `npx expo-doctor` → 19/20 (1건: React Native Directory network · 비코드) ✅
- `pnpm build:web` → 11 static routes exported ✅
- pos-integration ✅

## PR

https://github.com/CuriocityDevAi/storeport/pull/308
커밋: 239bb3a

## Kyu 실기

머지 후 `eas build --profile development --platform ios` 로 새 빌드 필요 (OTA 미적용 · 아이콘/이름은 네이티브 번들 교체 필요)
