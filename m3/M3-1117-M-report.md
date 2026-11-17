PR #180 · 크기 160/208 통일 · 워드마크 SVG · 네이티브 바 화면(재빌드 필요)

## 변경 요약

- `components/SplashReceiptAnim.tsx`: RECEIPT_W 220→160, BAR_W 208(+48), marginTop 20→24, `<Text>MEROS`→`<MerosLogo kind="wordmark" height={28} />`, scheduleOnRN→`'worklet'; runOnJS(onDone)()`
- `app.json`: expo-splash-screen `image: ./assets/images/splash-native.png` + `imageWidth: 208`
- `assets/images/splash-native.png`: 624×696px @3x 투명 PNG, 바(TOKEN_INK 0.85)만 그림
- `e2e/flows/M1-1117-F-splash.spec.ts`: `meros-logo-wordmark` testID 검증 추가

## 손님앱 수치 비교

| 항목 | 손님앱 정본 | POS (변경 후) |
|---|---|---|
| RECEIPT_W | 160dp | 160dp ✅ |
| BAR_W | 208dp | 208dp ✅ |
| BAR_H | 6dp | 6dp ✅ |
| marginTop | 24dp | 24dp ✅ |
| 워드마크 | 28pt text | 28dp SVG ✅ |

## 검증

- `npx tsc --noEmit`: 변경 파일 신규 오류 0 (기존 오류는 pre-existing)
- scheduleOnRN 사용 없음 확인: `runOnJS` 패턴으로 교체 완료
- 실기(시뮬레이터/실기기): 미검증 — 재빌드 후 확인 필요

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/180
