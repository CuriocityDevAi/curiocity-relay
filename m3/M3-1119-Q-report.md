fork PR #210 · 기존 M 56.3%(108dp)/92.3%(안전영역) · 채택 Var-A 50% safe zone(30.5% canvas) · 비교 이미지 O · 빌드 안 함

## 측정
- canvas: 1024×1024px (108dp 기준)
- 기존 M bbox: 577×482px at (223,234)
- M/canvas: 56.3%
- safe zone (66dp = 625px 직경) 대비: 92.3% ← 너무 큼
- iOS POS M: 46.9% (M3-1119-N 측정)

## 적용 (Variant A)
- 스케일: 원본 54.1% 축소 → 1024px 캔버스 중앙 배치
- 새 M 너비: 312px → safe zone 대비 50%
- 모노크롬: white M on transparent (Android 13 테마 아이콘)

## Variant B (참고용)
- M = 268px → safe zone 대비 43%
- 파일 미포함 (필요시 scale 46.4%)

## 변경 파일
- assets/images/adaptive-icon.png (교체)
- assets/images/adaptive-icon-mono.png (신규)
- app.json: monochromeImage 추가, backgroundColor #E8A33D
- docs/M3-1119-Q-android-compare.png (비교 이미지)

PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/210
