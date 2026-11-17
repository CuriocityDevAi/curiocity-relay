PR #351 · svg 의존 0 · ios 번들 OK · 아이콘 B

## 결과 요약

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/351
- **브랜치**: fix/M2-1117-AA-cd-wordmark-png-icon
- **react-native-svg import**: 0 (grep -rE "\breact-native-svg\b" apps/customer-display/src/ = 없음)
- **iOS 번들**: `iOS Bundled 7923ms (1177 modules)` — `assets/wordmark.png (3 variations | 1.9KB)` 포함
- **tsc 신규 에러**: 0
- **테스트**: 150/150 pass

## 변경 파일

- `MerosWordmark.tsx`: SVG → PNG Image (react-native-svg 제거)
- `SplashAnimation.tsx`: fill prop 제거
- `app.config.ts`: android.adaptiveIcon 추가
- `assets/wordmark.png` / @2x / @3x: 88×16 / 176×32 / 264×48 투명 PNG
- `assets/icon.png`: 1024×1024 아이콘 B (#3B2A1F bg · M #FFE58A · CUSTOMER 텍스트)
- `assets/icon-adaptive-foreground.png`: Android adaptive foreground
