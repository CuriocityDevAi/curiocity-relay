# M2-1116-AL — DONE | PR#162 (fork) · PR#318 (storeport)

## 작업 요약

Kyu 승인 A안(각진 M) 디자인을 POS 및 HP Point 아이콘에 적용.

## 변경 파일

### fork (agilo-medusa-pos-fork) — PR #162
- `assets/brand/icon-pos.svg` → 각진 M polygon (160×160 viewBox)
- `scripts/gen-icons.mjs` → 좌표 160×160→1024 ×6.4 갱신, HP 렌더링 SVG 방식으로 변경
- `assets/images/icon.png` (1024×1024)
- `assets/images/adaptive-icon.png` (1024×1024, 투명 배경)
- `assets/images/splash-icon.png` (1024×1024, 투명 배경)
- `assets/brand/preview-pos-76.png` (76×76)
- `assets/brand/preview-pos-60.png` (60×60)
- `assets/brand/preview-combined.png` (POS+HP 비교)

### storeport — PR #318
- `apps/customer-display/assets/brand/icon-hp.svg` → 각진 M×0.8 + HP POINT path (Helvetica Neue Bold → path 변환)
- `apps/customer-display/assets/icon.png` (1024×1024)
- `apps/customer-display/assets/splash.png` (1024×1024, icon과 동일)
- `apps/customer-display/assets/brand/preview-hp-76.png` (76×76)
- `apps/customer-display/assets/brand/preview-hp-60.png` (60×60)

## GitHub 경로

- POS 1024: https://raw.githubusercontent.com/CuriocityDevAi/agilo-medusa-pos-fork/feat/m2-1116-ak/assets/images/icon.png
- POS 76px: https://raw.githubusercontent.com/CuriocityDevAi/agilo-medusa-pos-fork/feat/m2-1116-ak/assets/brand/preview-pos-76.png
- POS 60px: https://raw.githubusercontent.com/CuriocityDevAi/agilo-medusa-pos-fork/feat/m2-1116-ak/assets/brand/preview-pos-60.png
- HP 1024: https://raw.githubusercontent.com/CuriocityDevAi/storeport/feat/m2-1116-ak/apps/customer-display/assets/icon.png
- HP 76px: https://raw.githubusercontent.com/CuriocityDevAi/storeport/feat/m2-1116-ak/apps/customer-display/assets/brand/preview-hp-76.png
- HP 60px: https://raw.githubusercontent.com/CuriocityDevAi/storeport/feat/m2-1116-ak/apps/customer-display/assets/brand/preview-hp-60.png
