APPROVE

## R0-1125-C — PR #426 (M2-1125-D) 리뷰

### 1. CD M 75% 비율 (compare PNG)

`M2-1125-D-icon-compare.png` 열람 결과:
- 레이블: "POS (기준 512px)" / "CD 75% = 384px ★" ✓
- 폴리곤 좌표 검증:
  - `icon-hp.svg` 신규 polygon: `43,103 43,43 63,43 81,70 99,43 118,43 118,103 100,103 100,73 85,94 76,94 61,73 61,103`
  - mH = 103 − 43 = **60px**, mW = 118 − 43 = **75px** (160×160 캔버스)
  - gen-icons `iconBLayout(75)` 기준값(mW=75, mH=60) 과 일치 ✓
  - POS M (100×80px) × 75% = 75×60px ✓

### 2. gen-icons.mjs 폰트 절대경로 CI/다른 맥

| 항목 | 결과 |
|------|------|
| CI 에서 gen-icons 실행 여부 | **실행 안 함** — `.github/workflows/ci.yml` / `linux-check.yml` 모두 typecheck·test만 실행, gen-icons 호출 없음 → CI 무관 |
| macOS 경로 유효성 | `/System/Library/Fonts/Supplemental/Arial Black.ttf`, `Arial Bold.ttf` — macOS Catalina+ 표준 경로, 대부분 맥에서 존재 |
| 폴백 여부 | **없음** — `existsSync` import는 있으나 폰트 파일 존재 확인 로직 없음; 경로 없으면 `magick` 실패 |

**판단**: gen-icons.mjs는 CI에서 실행되지 않으므로 CI 블로커 아님. 다른 맥에서는 Catalina+ 표준 경로이므로 실제 깨질 위험 낮음. 폴백 미구현은 minor — dev 전용 스크립트 범위.

> ℹ️ 개선 여지: `if (!existsSync('/System/Library/Fonts/Supplemental/Arial Black.ttf')) throw new Error(...)` 같은 조기 경고 추가 시 UX 향상되지만 blocking 아님.

### 3. 에셋 경로 ↔ app.config.ts 일치

`app.config.ts` 참조:
- `icon: "./assets/icon.png"` → PR에서 `assets/icon.png` 갱신 ✓
- `ios.icon: "./assets/icon.png"` → 동일 파일 ✓
- `android.adaptiveIcon.foregroundImage: "./assets/icon-adaptive-foreground.png"` → PR에서 `assets/icon-adaptive-foreground.png` 갱신 ✓
- `brand/` 폴더 파일들(`icon-b-75.png`, `preview-cd-*.png`, `M2-1125-D-icon-compare.png`)은 app.config.ts 미참조 (디자인·비교용 에셋) ✓

### 4. CI

| 잡 | 상태 |
|----|------|
| check | ✅ pass |
| changes-filter | ✅ pass |
| markers-and-forbidden | ✅ pass |
| route | ✅ pass |
| heavy-cloud | ⏳ pending (검토 시점 기준) |
| heavy-mac | — skipping |

heavy-cloud 미완료이나 에셋 전용 PR(TypeScript 변경 없음)이므로 heavy 잡 결과 무관.

### 결론

- 75% 비율: PNG·polygon·gen-icons 삼각 검증 모두 일치 ✓  
- 폰트 절대경로: CI에서 실행 안 됨, macOS 표준 경로 ✓ (폴백 없는 점 minor)  
- 에셋 경로 → app.config.ts 참조 완전 일치 ✓  

**APPROVE** — 블로킹 이슈 없음.
