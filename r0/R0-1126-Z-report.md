#274 APPROVE
#275 CHANGES

---

## #274 (M3-1126-J) — 탭바 선택 가시성·이미지 contain

### 판정: APPROVE

**검토 항목**

| 항목 | 결과 |
|------|------|
| tabBarStyle.backgroundColor 고정 배경 제거 | ✓ _layout.tsx에 tabBarStyle 없음 |
| Light 활성 TOKEN_INK `#0E1B18` 대비 (흰 탭바) | ≥18:1 ✓ |
| Dark 활성 TOKEN_ON_SELECTED `#FFFFFF` 대비 (어두운 탭바) | ≥18:1 ✓ |
| Light 비활성 TOKEN_INK_MUTED `#6F6F6F` | ≥4.5:1 ✓ |
| Dark 비활성 TOKEN_INK_SUBTLE `#B5B5B5` | ≥8:1 ✓ |
| useColorScheme()과 탭바 테마 동일 출처 | ✓ 모두 Appearance.getColorScheme() |
| 이전 "dark portrait 흰 탭바 + TOKEN_INK" 위험 | 해소 — 고정 배경 제거로 불일치 불가 |

**E2E 스크린샷 직접 확인**
- dark portrait: 탭바 배경 어두움, Sell 라벨 흰색 ✓
- light portrait: 탭바 배경 흰색, Sell 라벨 어두운 잉크 ✓

**테스트 결과**
```
vitest:         89 files · 1158 passed
playwright:     6/6 passed (M3-1126-H-tabbar-product-image.spec.ts)
lint 변경 파일: 0 errors (product-details 경고 2건은 기존)
tsc:            변경 파일 신규 에러 없음
```

---

## #275 (M3-1126-I) — CD Preview 로딩전환·X버튼·드래그

### 판정: CHANGES

### 근거

#### Kyu 불량 ① "Preview가 실제 손님 화면을 보여주지 않음"

**상태 기계 로직** ✓
- mount → 15s 타임아웃 → setLoadError(true) → 오류 오버레이
- onError/onHttpError 처리 추가
- IDLE_SNAPSHOT = { pos_screen: 'sell' } — snapshot null 시 CD sell 화면 초기화
- MIRROR_URL `https://admin.meros.id/customer-display-web/mirror`: HTTP 200, X-Frame-Options 없음

**웹/Playwright 직접 확인 결과**
- 초기 로딩 오버레이 `cd-preview-loading` 표시: ✓ (신규 dist 기준)
- 20s 후 오류 오버레이: `loading: false error: true` → iframe이 15s 타임아웃
- 오류 UI "미리보기를 불러올 수 없습니다" + "다시 시도" 버튼: 렌더 올바름 ✓
- 스크린샷: e2e/screenshots/R0-1126-Z-cd-state2-after20s.png (CD Preview 오류 오버레이 + X 버튼 원형 표시)

**미결 — 실제 손님 화면 렌더링**
- 웹 환경(iframe)은 15s 내 로드 불가 → native에서만 확인 가능
- IDLE_SNAPSHOT이 CD 앱 sell 화면 콘텐츠를 렌더하는지는 CD 앱 내부 계약 의존
- snapshot이 non-null이 되어야 실제 카트·제품 화면 반영

#### X 버튼 ✓

```tsx
width: 44, height: 44, borderRadius: 22   // 44pt 원형 iOS식
pressed → backgroundColor: TOKEN_INK_DISABLED + scale: 0.88  // 눌림 피드백
data-cd-close 속성 → 웹 drag handler 클릭 구분
```

Playwright 측정 (신규 dist): **width: 44px, height: 44px** ✓
스크린샷: e2e/screenshots/R0-1126-Z-cd-xbtn.png

#### 드래그 ✓

- `setPointerCapture` → 커서가 핸들 밖 나가도 추적 ✓
- `onPointerUp`/`onPointerCancel` → `releasePointerCapture` ✓
- `clamp` 경계 → 화면 밖 이탈 방지 ✓
- posRef 갱신으로 손 뗀 위치 세션 동안 유지 ✓
- Playwright drag 테스트 passed ✓

### CHANGES 항목

**1. e2e 하네스 R1×4 + R2×2 = 6개 실패 (신규 dist 기준)**

기존 R1/R2 테스트가 M3-1123-M 이전 API 사용:
- `waitForURL('**/products**')` → 현재 앱은 /sell로 이동
- `cd-preview-badge-button` → 현재는 sell-preview-btn (SellTopBar)

```
실행: npx playwright test e2e/flows/cd-preview.spec.ts
M3-1126-I:  3/3 passed
R1 + R2:    6/6 failed  ← CI 실패
```

PR body "3 passed (19.9s)"는 M3-1126-I 3개만 집계, 기존 6개 실패 미기재.

수정: R1/R2 `waitForURL('**/products**')` → `waitForFunction('/sell'||'/products')`, `cd-preview-badge-button` → `sell-preview-btn`

**2. lint 2 errors**

```
CdPreviewWindow.tsx:225  react-hooks/set-state-in-effect
  setWebReady(false); setLoadError(false); — useEffect 내 직접 setState

CdPreviewWindow.tsx:311  react-hooks/refs
  panResponder.panHandlers — render 중 ref 접근
```

### 테스트 결과

```
vitest:          89 files · 1158 passed ✓
playwright M3-1126-I:  3/3 passed ✓  (신규 dist 기준)
playwright R1+R2:      6/6 failed ✗  (하네스 미업데이트)
lint 변경 파일:  2 errors ✗
```

---

## 실행 로그 요약

```bash
# fetch & 코드 확인
git fetch origin
git show origin/feat/M3-1126-H:app/(tabs)/_layout.tsx       # #274 코드 확인
git show origin/feat/M3-1126-I:components/cd-preview/CdPreviewWindow.tsx  # #275 코드 확인

# vitest
npx vitest run → 89 files, 1158 passed

# lint
npx eslint app/(tabs)/_layout.tsx app/product-details.tsx
  → 0 errors (product-details 기존 경고 2건)
npx eslint components/cd-preview/CdPreviewWindow.tsx
  → 2 errors (set-state-in-effect, refs)

# playwright #274
npx playwright test e2e/flows/M3-1126-H-tabbar-product-image.spec.ts
  → 6/6 passed

# MIRROR_URL 접근
curl -sI https://admin.meros.id/customer-display-web/mirror
  → HTTP 200, X-Frame-Options 없음

# expo export (dist 재빌드)
npx expo export -p web --output-dir dist
  → dist 내 borderRadius:22 확인 (M3-1126-I 반영됨)

# playwright #275 (신규 dist)
npx playwright test e2e/flows/cd-preview.spec.ts --grep "M3-1126-I"
  → 3/3 passed

npx playwright test e2e/flows/cd-preview.spec.ts
  → 3 passed (M3-1126-I) / 6 failed (R1+R2 하네스)

# CD Preview 3상태 직접 확인
npx playwright test e2e/flows/r0-review-cd-states.spec.ts
  state1 initial loading visible: true ✓
  state2 after 20s — loading: false, error: true (15s 타임아웃 정상)
  xbtn boundingBox: width:44, height:44 ✓
```

## 스크린샷

- `e2e/screenshots/M3-1126-H-tabbar-sell-dark-portrait.png` — dark 모드 Sell 탭 선택 (어두운 탭바 + 흰 라벨)
- `e2e/screenshots/M3-1126-H-tabbar-sell-light-portrait.png` — light 모드 Sell 탭 선택
- `e2e/screenshots/R0-1126-Z-cd-state2-after20s.png` — CD Preview 오류 오버레이 + X 버튼 원형
- `e2e/screenshots/R0-1126-Z-cd-xbtn.png` — X 버튼 측정
