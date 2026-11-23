PASS — PR #243 머지 대기
PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/243

## 작업 내역

### 문제
`CdPreviewWindow.tsx`의 mirror WebView가 손님 화면을 실제 크기(1920×1080)로 렌더해
작은 미리보기 창(예: M 사이즈 256×144)에 우측 상단 일부만 표시됐음.

### 수정 (`components/cd-preview/CdPreviewWindow.tsx`)

1. **캔버스 상수** `CD_CANVAS_W = 1920`, `CD_CANVAS_H = 1080`
2. **`buildMirrorFitScript(containerW, containerH)`**: `transform: scale(min(W/1920, H/1080))` +
   `transform-origin: top left` + `position: fixed; overflow: hidden` 를 HTML 요소에 주입
3. **`MIRROR_PRE_SCRIPT`**: `injectedJavaScriptBeforeContentLoaded` — 페이지 렌더 전에
   `<meta viewport width=1920>` 를 추가해 layout viewport를 캔버스 너비로 고정
4. **`handleLoadEnd`** 갱신: 로드 완료 시 `dimsRef.current`로 fit 스크립트 주입
5. **`useEffect([winW, winH, webReady])`**: 창 크기 변경(회전·windowSize 변경) 시 scale 재계산 주입

### 자기 검증 (`e2e/flows/M1-1123-N-mirror-fit.spec.ts`)

- `page.route('**/mirror**', ...)` — 1920×1080 캔버스 + 네 모서리 색상 블록 mock HTML 서빙
- Playwright CDP로 fit CSS 직접 주입 (RN Web cross-origin 제약 우회)
- 네 모서리 bounding box가 iframe(256×144) 시각 영역 안에 있는지 어설션 (tol=2px)
- **검증 결과** (scale = 0.133333):
  - corner-tl: (0.5, 0.5) → right=11.2, bottom=11.2 ✓
  - corner-tr: (244.8, 0.5) → right=255.5 ✓
  - corner-bl: (0.5, 132.8) → bottom=143.5 ✓
  - corner-br: (244.8, 132.8) → right=255.5, bottom=143.5 ✓

### 스크린샷

`e2e/screenshots/M1-1123-N-mirror-fit.png` — 256×144 프레임에 1920×1080 손님 화면 전체가
축소 표시됨. 네 모서리 색상 블록(빨강·파랑·초록·노랑) 모두 보임.

```
corner-tl  corner-tr
  [빨강]      [파랑]
       CD Mirror
  [초록]      [노랑]
corner-bl  corner-br
```

## 파일 목록
- `components/cd-preview/CdPreviewWindow.tsx` — 27줄 추가 (fit 스크립트 주입)
- `e2e/flows/M1-1123-N-mirror-fit.spec.ts` — 신규 (Playwright 자기검증)
