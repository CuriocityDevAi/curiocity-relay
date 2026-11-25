PASS

## M2-1125-D — CD 앱 아이콘 M 크기 75% 정정

PR: https://github.com/CuriocityDevAi/storeport/pull/426  
Branch: `fix/M2-1125-D-cd-icon-75`  
Commit: e812cf6

### 변경 사항

| 파일 | 변경 |
|------|------|
| `apps/customer-display/assets/brand/icon-hp.svg` | 주석 "× 65% POS" → "× 75% POS" + polygon 좌표 갱신 (M2-1125-D 기준) |
| `apps/customer-display/scripts/gen-icons.mjs` | Arial-Black/Arial-Bold 폰트 이름 → 절대경로 (`/System/Library/Fonts/Supplemental/Arial Black.ttf` / `Arial Bold.ttf`) 고정 · 비교 출력명 M2-1125-D-icon-compare.png |
| `apps/customer-display/assets/icon.png` | 재생성 (75% · 4× SS · 1024×1024) |
| `apps/customer-display/assets/brand/icon-b-75.png` | 재생성 |
| `apps/customer-display/assets/brand/preview-cd-60.png` | 재생성 |
| `apps/customer-display/assets/brand/preview-cd-76.png` | 재생성 |
| `apps/customer-display/assets/icon-adaptive-foreground.png` | 재생성 |
| `apps/customer-display/assets/brand/M2-1125-D-icon-compare.png` | 신규 — POS(기준 512px) 옆 CD 75%=384px 비교 PNG |

### 비교 PNG

`apps/customer-display/assets/brand/M2-1125-D-icon-compare.png`  
(1024px · 76px · 60px 3단 행 · 레이블: "POS (기준 512px)" / "CD 75% = 384px")

### 배경

M2-1119-V에서 gen-icons.mjs + icon.png는 75%로 갱신됐으나  
SVG 소스(`icon-hp.svg`)의 주석/polygon이 65% 그대로 방치됨.  
이번 PR로 SVG 소스와 에셋의 일관성을 맞춤.

### QC

- gen-icons.mjs 재실행: 에러 없이 완료 ✓
- 테스트: customer-display 233/233 · commerce-core 626/626 ✓
- naming-check: PASS ✓

> 앱 아이콘은 다음 EAS 빌드에 반영됨
