PASS 29f2e03

## M3-1126-L 작업 요약

### REQ 0 — rebase
`git fetch origin && git rebase origin/master` 완료. #274 머지(8f092f5) 반영.
충돌 2개(`app/(tabs)/_layout.tsx`, `e2e/flows/M3-1126-H-tabbar-product-image.spec.ts`) M3-1126-H 버전으로 수동 해결.

---

### REQ 1 — 근본 원인 조사

**실측 결과**:
```
react-native-webview v14 WebView.js (web 빌드):
  "React Native WebView does not support this platform."
  → <iframe> 미생성 → onLoadEnd 미발화 → 15s 타임아웃 → 오류 오버레이
```

**원인 (ㄱ) 확인**: `react-native-webview` v14.0.1의 웹 빌드(`lib/WebView.js`)가 iframe을 렌더하지 않고 "not supported" 텍스트만 반환. `onLoadEnd` 연결 자체가 없었음.

**원인 (ㄴ)(ㄷ)(ㄹ) 미검증**: mirror 페이지(`https://admin.meros.id/customer-display-web/mirror`) 렌더 상태, postMessage 형식, 인증/세션은 실서버 접근 없이 e2e 환경에서 검증 불가.

**콘솔/네트워크 로그 (e2e Playwright 실행 중)**:
- `GET https://api.meros.id/admin/pos/registers/*/snapshot` → 200 (캐치올 mock)
- mirror URL `https://admin.meros.id/customer-display-web/mirror` → e2e 환경에서 iframe이 렌더되지 않아 네트워크 로그 없음 (수정 전)
- 수정 후: iframe이 렌더되어 네트워크 요청 시도. e2e 환경에서는 CORS/X-Frame-Options으로 onerror 발화 → `loadError=true` → 오류 overlay 표시 (15s 이전에 수초 내 전환)

---

### REQ 2 — 수정 내용

**`components/cd-preview/CdPreviewWindow.tsx`**:
- `Platform.OS === 'web'` 분기 추가 → `React.createElement('iframe', ...)` 직접 사용
  - `onLoad` → `handleLoadEnd`, `onError` → `handleError` 연결
  - `iframeRef` 추가, 로드 완료 시 `postMessage({ type: 'pos-mirror', detail: payload }, '*')`
- `loadState { key, ready, error }` key-coupled 상태 도입 → `webviewKey` 변경 시 자동 초기화

**3상태 스크린샷**: e2e 환경에서는 mirror 서버 미접근으로 "미리보기를 불러올 수 없습니다" 오류 오버레이만 확인 가능. **실 브라우저 3상태(빈 카트·장바구니·결제중) 직접 확인 미수행 — 미검증**.
- `e2e/screenshots/M3-1126-I-loading-transition.png` : loading → error overlay 전환 확인
- `e2e/screenshots/cd-preview-02-window-open.png` : 창 열림 확인
- `e2e/screenshots/M3-1126-I-close-btn-44.png` : X 버튼 44px 확인

---

### REQ 3 — lint 2 errors 수정

| 위치 | 규칙 | 수정 |
|------|------|------|
| 225행 `set-state-in-effect` | effect 본문 `setWebReady`/`setLoadError` 직접 호출 | `loadState{key,ready,error}` 도입 → effect 본문 setState 제거 |
| 311행 `refs` | `panResponder.panHandlers` 렌더 중 접근 | `React.useMemo(() => PanResponder.create({...}).panHandlers, [])` |

**수정 후 lint 결과**: `0 errors, 1 warning` (line 132 — `useMemo` 내부 PanResponder refs, 태스크 지정 외)

---

### REQ 4 — e2e 전체 9개 통과

**R1·R2 6개 수정 내용**:
- `page.waitForURL('**/products**')` → `waitForFunction('/sell' || '/products')`
- `cd-preview-badge-button` → `sell-preview-btn` (M3-1123-M 이후 SellTopBar 이동)

```
9 passed (24.7s)
  ✓ CD Preview R1 › badge button visible at 1024w
  ✓ CD Preview R1 › window opens on button press
  ✓ CD Preview R1 › window closes on second button press
  ✓ CD Preview R1 › badge button visible at 600w (narrow)
  ✓ CD Preview M3-1126-I › loading state transitions: Loading… disappears within 20s
  ✓ CD Preview M3-1126-I › X button touch area ≥ 44px
  ✓ CD Preview M3-1126-I › mouse drag: window follows cursor
  ✓ CD Preview R2 — mirror › window contains mirror WebView after open
  ✓ CD Preview R2 — mirror › window size S: width ~15% of viewport
```

---

### 커밋 · PR

- 커밋: `29f2e03` `fix(cd-preview): M3-1126-L — 웹 iframe onLoad 연결·lint 2개·R1R2 셀렉터 수정`
- branch: `feat/M3-1126-I` (master + M3-1126-H/I/J/L rebase)
- PR #275 본문 갱신 완료

### 미검증 항목

- 실 브라우저에서 Sell 빈 카트 → CD 대기화면 · 장바구니 1개 → 상품 목록 · 결제 중(Cash) → 결제 화면 3상태 스크린샷 (서버 접근 필요)
- mirror 페이지가 `window.addEventListener('message', ...)` 로 `{type:'pos-mirror', detail}` 형식 수신 여부 (서버 측 코드 확인 필요)
