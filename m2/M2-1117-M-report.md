PR #333 · 워드마크 SVG · 네이티브 바 화면(재빌드 필요)

## 완료 항목

- MerosWordmark.tsx: meros-logo.svg Archivo Black glyph path → react-native-svg (height=26, fill=INK, y-flip transform)
- SplashAnimation.tsx: `<Text>MEROS</Text>` → `<MerosWordmark height={26} fill={INK} />`
- splash.png: 구 로고 2048×2048 → 프린터 바만(@3x 624×18 RGBA, INK_85)
- app.config.ts: expo-splash-screen `image: ./assets/splash.png` + `imageWidth: 208`
- naming-check.sh: MerosWordmark.tsx 예외 추가
- 테스트: splash-wordmark.test.ts 신규 4개 · 전체 144/144 통과
- tsc: 에러 0

## 확인 필요

- EAS native 빌드 후 새 splash 화면 실기 확인
- expo web 스크린샷 미검증 (실행 환경 없음)

## 링크

PR: https://github.com/CuriocityDevAi/storeport/pull/333
브랜치: feat/M2-1117-M-cd-splash-wordmark
