#162 APPROVE

## R0-1117-L — fork PR #162 재확인 (M1-1117-F 스플래시 애니)

### 1. 정본 대조 (ledger/design/splash-receipt-v1.md)

| 항목 | 정본 | 코드 | 결과 |
|------|------|------|------|
| SVG viewBox | `16 13 68 74` | `viewBox="16 13 68 74"` | ✅ |
| 종이 path | `M16 13 H84 V79 L77.2 86 …` | PAPER_D 동일 | ✅ |
| M transform | `translate(14,10) scale(0.72)` | `<G transform="translate(14,10) scale(0.72)">` | ✅ |
| M polygon | 13점 좌표 | M_POINTS 동일 | ✅ |
| 슬라이드 | 1.5s cubic-bezier(.22,.61,.36,1) | duration:1500, Easing.bezier(0.22,0.61,0.36,1) | ✅ |
| START_Y | translateY(-102%) | -Math.ceil(RECEIPT_H*1.02)=-244 | ✅ |
| overflow clip | 막대 아래 clip | `overflow:'hidden'` clip View | ✅ |
| 막대 | 폭+양쪽, 6pt, 둥글, INK 85% | RECEIPT_W+32, h:6, r:3, TOKEN_INK, opacity:0.85 | ✅ |
| MEROS 떠오르기 | opacity 0→1 + Y(10→0), 0.6s ease-out, delay 1.55s | withDelay(1550, withTiming(600, Easing.out)) | ✅ |
| MEROS 텍스트 | "MEROS", w500~600, 0.06em, INK | fontWeight:'600', letterSpacing:32*0.06, TOKEN_INK | ✅ |
| 콜드스타트 1회 | 첫 마운트만 | root _layout.tsx 1회 마운트 → overlayVisible 초기값 true | ✅ |
| 애니+준비 → 0.2s 페이드 | `animDone && appReady` → 0.2s | withTiming(0,{duration:200}) | ✅ |
| 접근성 Reduce Motion | 애니 없이 최종 상태 | useReducedMotion() → 즉시 최종값·onDone() | ✅ |
| 시스템 스플래시 배경 | expo-splash-screen backgroundColor = overlay backgroundColor | #FFFFFF = TOKEN_SURFACE ✅ |
| 시스템 스플래시 이미지 없음 | image 키 제거 | app.json diff: `"image"` 제거됨 | ✅ |

**블로커 없음.**

### 2. #166 캐시(AuthedBootstrap) · 로그인 흐름

- `AuthedBootstrap` 위치: `Stack.Protected guard={authenticated}` 안 — 변경 없음 ✅
- `SplashScreenController.appReady`: `auth.state.status !== 'loading'` — 로그인 복원 완료 대기 ✅
- `SplashScreenController` 위치: GestureHandlerRootView 안쪽으로 이동 (이전: ThemeProvider 직하, 현재: Toast 아래) — `pointerEvents="none"` 으로 터치 간섭 없음 ✅
- m1-1117-b 테스트(isDraftOrderCacheCorrupted + validator + optional-chain): **26/26 pass** ✅
- m1-1117-a 테스트: **pass** ✅

### 3. master(#172 머지됨) 충돌

`git merge-tree` 결과: **충돌 없음**
- PR 추가 파일(SplashReceiptAnim.tsx, SplashScreenController.tsx 수정, app.json 일부) ↔ master 변경 파일(customers.ts, orders.ts, Button.tsx, OptionChip.tsx 등) 겹치는 파일 없음 ✅

### 4. 테스트 · 타입체크 · 스크린샷

- **vitest**: m1-1117-a + m1-1117-b 합계 26/26 pass
- **tsc**: 스플래시 관련 파일(SplashReceiptAnim.tsx, SplashScreenController.tsx) 타입 오류 없음. 나머지 에러(cart.tsx, split-pending-orders.test.ts 등)는 이 PR 이전부터 존재하는 기존 에러.
- **Playwright 프레임 스샷** (10장 첨부됨):
  - t=0s: 막대+영수증 톱니만 노출 ✅
  - t=0.75s: 영수증 M 완전 노출 ✅
  - t=1.5s: 영수증 완전 노출 + MEROS 텍스트 출현 직전(opacity ≈ 0) ✅
  - t=1.9s: 영수증 + MEROS 텍스트 완전 표시(INK 색) ✅
  - t=2.3s: 스플래시 페이드아웃 완료 → 로그인 화면 ✅

### 판정: APPROVE
