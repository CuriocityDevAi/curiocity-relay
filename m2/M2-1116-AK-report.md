# M2-1116-AK 완료 — 아이콘 배경 #FFE58A (pastel.hero) · M #3B2A1F (pastel.heroInk) 적용, HP POINT 115pt 굵은 글씨 추가

## 색 토큰 출처

| 토큰 | 값 | 위치 |
|------|-----|------|
| `pastel.hero` (아이콘 배경 노란색) | `#FFE58A` | `customer-display/src/theme/tokens.ts:76` |
| `pastel.heroInk` (M 글자·HP POINT 색) | `#3B2A1F` | `customer-display/src/theme/tokens.ts:77` |

- 근거: `MainScreen.tsx:86` → `backgroundColor: t.hero`, `styles.headline` → `color: t.heroInk`
- 대비율: #3B2A1F on #FFE58A ≈ **9.5:1** (WCAG AAA 7:1 초과 ✓)
- 기존 주황색(`#E8A33D`)은 모두 `#FFE58A`로 교체

## 작업 내용

### MEROS POS (agilo-medusa-pos-fork)
- **PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/162
- 브랜치: `feat/m2-1116-ak`
- `assets/brand/icon-pos.svg` — 벡터 원본 (1024×1024 viewBox, 기하학 M 폴리곤)
- `assets/images/icon.png` — 1024×1024 노란 배경 + M (기존 흐린 래스터 교체)
- `assets/images/adaptive-icon.png` — 1024×1024 투명 배경 + M (Android, bg #FFE58A)
- `assets/images/splash-icon.png` — 1024×1024 투명 배경 + M (splash bg #FFE58A)
- `app.json`: splash backgroundColor `#f4faff→#FFE58A`, adaptiveIcon backgroundColor `#ffffff→#FFE58A`
- `scripts/gen-icons.mjs` — 재생성 스크립트

### MEROS HP Point (storeport)
- **PR**: https://github.com/CuriocityDevAi/storeport/pull/318
- 브랜치: `feat/m2-1116-ak`
- `apps/customer-display/assets/brand/icon-hp.svg` — 벡터 원본
- `apps/customer-display/assets/icon.png` — 1024×1024 노란 배경 + M + **"HP POINT"** (Arial-Black 115pt, kerning 6)
- `apps/customer-display/assets/splash.png` — 1024×1024 노란 배경 + M (텍스트 없음)
- `apps/customer-display/app.config.ts`: splash backgroundColor `#ffffff→#FFE58A`
- `apps/customer-display/scripts/gen-icons.mjs` — 재생성 스크립트

## 미리보기 PNG GitHub 경로 (raw)

- POS 1024px: https://raw.githubusercontent.com/CuriocityDevAi/agilo-medusa-pos-fork/feat/m2-1116-ak/assets/images/icon.png
- POS 비교(1024+76+60): https://raw.githubusercontent.com/CuriocityDevAi/agilo-medusa-pos-fork/feat/m2-1116-ak/assets/brand/preview-combined.png
- HP 1024px: https://raw.githubusercontent.com/CuriocityDevAi/storeport/feat/m2-1116-ak/apps/customer-display/assets/icon.png
- HP 76px: https://raw.githubusercontent.com/CuriocityDevAi/storeport/feat/m2-1116-ak/apps/customer-display/assets/brand/preview-hp-76.png
- HP 60px: https://raw.githubusercontent.com/CuriocityDevAi/storeport/feat/m2-1116-ak/apps/customer-display/assets/brand/preview-hp-60.png

## 아이콘 설계

```
M 형태: meros-mark-dark.svg 의 M 패스를 1024×1024 기준 기하학 폴리곤으로 재설계
POS : 좌기둥 x=179–333, 우기둥 x=691–845 (154px 굵기), 상하 여백 192px
HP  : 75% 축소 (기둥 115px), M y=160–640, "HP POINT" baseline y≈800
```

## 주의: EAS 재빌드 필요

아이콘·스플래시는 앱 번들에 포함되는 정보입니다.  
PR 머지 후 **POS·HP Point 각 1회 EAS 재빌드**가 필요합니다 (Kyu 담당).
