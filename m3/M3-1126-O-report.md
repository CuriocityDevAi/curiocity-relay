PASS #276 b08dd53 · #275 0cfd795

## #276 feat/M3-1126-K — 스크린샷 11장 재생성

### 수정 내용
- `waitForFontsAndBadge`: `page.evaluate(() => document.fonts.ready)` + `expect(badge).toHaveText(regex)` + **3 500 ms** 대기
  - NativeWind CSS-interop 는 마운트 후 비동기로 스타일을 적용하므로 300 ms 로는 부족함
- phone-entry-chip 테스트도 동일한 3 500 ms 대기 추가

### 스크린샷 크기 (before → after)

| 파일 | Before (B) | After (B) |
|------|-----------|-----------|
| M3-1126-K-none-ask.png | 167 | **1 932** |
| M3-1126-K-entering-waiting.png | 171 | **3 389** |
| M3-1126-K-entering-typing.png | 162 | **1 888** |
| M3-1126-K-confirming.png | 192 | **4 243** |
| M3-1126-K-confirmed-reenter.png | 197 | **4 460** |
| M3-1126-K-skipped-ask-again.png | 179 | **2 994** |
| M3-1126-K-locked-busy.png | 179 | **2 751** |
| M3-1126-K-reenter-cancel-visible.png | 179 | **2 809** |
| M3-1126-K-phone-entry-chip.png | 170 | **2 349** |
| M3-1126-K-viewport-portrait.png | 167 | **1 933** |
| M3-1126-K-viewport-landscape.png | 167 | **1 932** |

모두 1 KB 이상. 전부 OK (min pixel < 250, 실제 배지 렌더 확인).

### e2e: 12/12 PASS · lint: 0 errors

---

## #275 feat/M3-1126-I — postMessage origin 고정

### 수정 내용
`components/cd-preview/CdPreviewWindow.tsx` 2곳:
- `handleLoadEnd` (line ~284): `'*'` → `new URL(MEROS_CD_WEB_URL).origin`
- snapshot effect (line ~336): `'*'` → `new URL(MEROS_CD_WEB_URL).origin`

### storeport customer-display 수신 측 검사
파일: `apps/customer-display/app/mirror.tsx`
- `window.addEventListener("pos-mirror", handleMirror)` — CustomEvent 리스너 (postMessage 아님)
- `window.addEventListener('message', ...)` 없음 → **event.origin 검사 없음 — 후속 필요**

### e2e: 9/9 PASS · lint: 0 errors (react-hooks/refs warn은 기존 PanResponder 패턴, 수정 범위 외)
