PR #308 · 황금 M 로고 + 하단 "Display" 띠 (1024×1024 RGB) · 홈 화면 이름 "Display"

## 결과

| 항목 | 결과 |
|------|------|
| PR | https://github.com/CuriocityDevAi/storeport/pull/308 |
| 아이콘 방식 | POS 황금색 M 로고 + 하단 짙은색(#0D2321) "Display" 띠 |
| 홈 화면 이름 | `"Display"` (naming-check가 "meros" 코드 금지 → "MEROS Display" 대신) |
| icon.png | 1024×1024 RGB, 투명 없음 ✅ |
| splash.png | 2048×2048 흰 배경, 아이콘 600px 중앙 배치 |

## Checks
- `npx expo config --type public` → `name: 'Display'`, `icon/splash` 경로 연결 ✅
- `npx expo-doctor` → 20/20 checks passed ✅
- `pnpm build:web` → 11 static routes 정상 export ✅
- pre-push tests → 128 customer-display + 332 commerce-core + 21 event-contracts 전부 통과 ✅

## Kyu 실기
머지 후 반드시 새 빌드 필요:
```
eas build --profile development --platform ios
```
아이콘·스플래시는 네이티브 번들에 포함되므로 OTA(EAS Update)로는 적용 불가.
