PASS #275 57c66906f147f504185f8bf1e24e75fcdc30de84 · #277 bc061f5c1d8494bbce6c2b0f64bc319c205d6866

## #275 feat/M3-1126-I

**변경**: `components/cd-preview/CdPreviewWindow.tsx`
- "미리보기를 불러올 수 없습니다" → "Preview unavailable"
- "다시 시도" → "Retry"

**assertions**: 10/10 passed (`scripts/m3-1105-c-english-assertions.mjs`)
- 코드 (주석 제외) 한글 0건 ✓
- M3-1105-C 회귀 가드 4건 ✓
- M3-1119-C 영어화 회귀 가드 5건 ✓

**e2e**: 직접 실행 불가 (dist 빌드 환경 없음) — 소스 assertions 통과로 대체

## #277 feat/M3-1126-P

**변경**: `scripts/spec-guard-pos-playwright.mjs`

SELL-TAB-LABEL — Playwright 라이트·다크 Sell 탭 라벨 WCAG 대비 단언
- light: 17.67:1 ≥ 4.5 ✓
- dark: 18.73:1 ≥ 4.5 ✓

SELL-PRODUCT-SHEET-IMG — NativeWind CSS Interop 실제 렌더 단언
- portrait: background-size:contain ✓, 390×293 ≤ 390×293 ✓
- landscape: background-size:contain ✓, 390×293 ≤ 390×293 ✓

구현 메모: NativeWind CSS Interop은 `<Image resizeMode="contain">`을 `<div background-size:contain>(visible) + <img opacity:0>(invisible)` 구조로 렌더. `img.previousElementSibling.backgroundSize === 'contain'` 로 단언.

**스펙 가드 결과**: 23/23 × 3회 연속 통과
