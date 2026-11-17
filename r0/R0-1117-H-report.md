#318 APPROVE · #324 APPROVE

---

## #318 — feat(brand): 손님 화면 아이콘 A0 + 시작 화면 영수증 인쇄 애니메이션

### REQ 1 — 정본 `ledger/design/splash-receipt-v1.md` 대조

**아이콘 A0**
- ✅ 글자 없음: `gen-icons.mjs`는 M 폴리곤만 그리고 "CUSTOMER" 등 텍스트 없음
- ✅ M 폴리곤 100×100 좌표: `M_ICON_100` = 정본과 문자 단위 일치
- ✅ 1024 RGB 무투명: `-alpha off` 플래그 + 1024×1024 출력. e2e `icon.png is 1024×1024 RGB`에서 PNG IHDR color_type=2 (RGB) 직접 확인
- ✅ 슈퍼샘플링: 4096→1024 축소, 흐림 없음

**영수증 SVG 좌표** (gen-icons.mjs 수학 검증)
- 종이 path `M16 13 H84 V79 L77.2,86 … Z` → canvas (x-16)×4, (y-13)×4 변환 후 `RECEIPT_PAPER` 모든 꼭짓점 일치 ✅
- M `translate(14,10) scale(0.72)` 후 뷰박스 오프셋 적용 → `RECEIPT_M` 13개 꼭짓점 계산 일치 ✅

**애니메이션 타이밍**
- ✅ 1.5s cubic-bezier(.22,.61,.36,1): `duration:1500`, `Easing.bezier(0.22,0.61,0.36,1)` 정확
- ✅ 초기값 `-Math.ceil(RECEIPT_H×1.02)` = -178 → translateY(-102%)와 동일
- ✅ 막대: `height:6, width:RECEIPT_W+48(영수증보다 양쪽 24dp 넓음), borderRadius:3, INK_85`
- ✅ 글자 떠오르기: 1500ms + 50ms delay = **1550ms (1.55s)** 시작, `duration:600, Easing.out(Easing.ease)`, `textY 10→0`
- ✅ 두 줄(`MEROS` + `Customer`) `Animated.parallel`로 동시 등장
- ✅ 콜드 스타트 1회: 모듈 레벨 `let _splashShown = false` 플래그
- ✅ 준비 완료 후 0.2s 페이드: `Animated.timing(splashOpacity, {duration:200})`
- ✅ 동작 줄이기: `AccessibilityInfo.isReduceMotionEnabled()` → true 시 최종 상태만

### REQ 2

- ✅ 시스템 스플래시 배경 = JS 애니 배경: `app.config.ts` → `backgroundColor: "#FFE58A"`, `SplashAnimation.tsx` → `const BG = "#FFE58A"` 동일값, `image` 필드 없음 → 이음새 없음
- ✅ 앱 준비가 애니보다 늦을 때 마지막 프레임 유지: `tryComplete()`가 `animDoneRef.current && appReadyRef.current` 둘 다 true일 때만 발동
- ✅ mock 모드 스킵 (`?mock=1`) 운영 무영향: `showSplash = !_splashShown && !useMock` — `useMock`은 URL param 조건이므로 운영(no param)에서 항상 false

### REQ 3 (스플래시 반응형)

- ✅ `SplashAnimation` root: `flex:1, alignItems:center, justifyContent:center` → 모든 폭에서 수학적으로 가운데 정렬
- ✅ `clipContainer` width=160dp → 507px 최소 뷰포트에서도 충분한 여백
- ✅ `splash-anim.spec.ts` boundingBox 어설션: 3 뷰포트(1180×820, 820×1180, 540×820)에서 clip이 뷰포트 안에 들어오고 leftMargin ≈ rightMargin (2px 허용)

### REQ 4 — 테스트·타입체크·expo-doctor

- ✅ typecheck: PR 자기검증 에러 0
- ✅ unit: 132/132 pass
- ✅ e2e: 32 pass / 1 fail / 8 skipped

**"1 pre-existing fail" 확인**: `pair-screen.spec.ts` → `"incognito context (no localStorage)"` 테스트. `browser.newContext({storageState: undefined})`로 생성한 컨텍스트는 Playwright config의 `baseURL` (`http://localhost:4173/customer-display-web`)을 **상속받지 않음** → `page.goto("/")` → `http://localhost:4173/` (prefix 없음) → pair-screen 도달 불가. `pair-screen.spec.ts`는 hub-m3(main)에도 동일하게 존재하므로 pre-existing 확인 ✅. 이 PR 범위 밖 버그.

- ⚠️ expo-doctor: PR에 결과 미보고. 의존성 변경 없으므로 블로커 아님. 머지 전 로컬 확인 권고.

### 코드 품질 메모

- 영수증을 SVG 대신 PNG 에셋(`receipt-anim.png`, 272×296)으로 pre-render하는 방식 — 고정 160dp 표시 기준 1.7× 해상도로 충분, 새 라이브러리 도입 없이 reanimated/RN Animated 그대로 사용하는 의도적 선택.
- `_layout.tsx`에서 boot gate(appReady=false) → main layout(appReady=true) 전환 시 `SplashAnimation` 재마운트 발생. `getDeviceToken()`이 `localStorage.getItem()`으로 동기 반환하므로 첫 commit 직후 state 갱신 → 애니 재시작 시점이 사실상 첫 프레임이라 사용자에게 비가시. 의도된 구조.

---

## #324 — fix(customer-display): 반응형 레이아웃 (#318 위에서 rebase)

### REQ 3 — 화면 3종 × 폭 3종

**breakpoint 경계 (useLayout.ts)**
- `wide ≥1033`: 1366×1024 → 1366 ≥ 1033 → wide ✅
- `normal 600-1032`: 1024×1366 → 1024 < 1033 → normal ✅  
- `narrow <600`: 507×1024 → 507 < 600 → narrow ✅

**글자 안 깨짐**
- ✅ `wide` → 2열 가로 레이아웃 유지 (기존 동일)
- ✅ `normal/narrow` → `flexDirection:"column"` 1열 스택 전환. 각 텍스트 요소에 `bpFs(bp, wide, normal, narrow)` 개별 적용 → 고정 폭 컨테이너 없음 → `flex:1` 자식이 뷰포트 폭에 맞게 흘러감
- ✅ pair.tsx 코드 셀: narrow에서 44×52px로 축소 → 6개 × (44+10)gap ≈ 314dp < 507dp, 넘침 없음

**시작 애니 반응형**
- ✅ `SplashAnimation` #318에서 변경 없음. `flex:1 center` 레이아웃이 모든 폭 대응.

**responsive.spec.ts 검증**
- ✅ VIEWPORTS: `{1366×1024, 1024×1366, 507×1024}` — REQ 요구 사항과 정확히 동일
- ✅ 3 viewport × 3 screen(main/keypad/cart) × 3 lang(id/en/ko) = 27 케이스 all pass
- 어설션: 가로 넘침 여부, testID zero-dimension 여부, 큰 글자(>20px) 1글자씩 세로 쪼개짐 여부, keypad 버튼 최소 40px

### REQ 4

- ✅ typecheck: 에러 0
- ✅ unit: 132/132 pass (변경 없음)
- ✅ e2e: 기존 12/12 + 신규 반응형 27/27 = 39/39 pass

### rebase 상태

- r0-324의 첫 번째가 아닌 커밋이 r0-318의 HEAD(`7fb777a`)와 동일 → #318 위에서 정상 rebase ✅
- 충돌 흔적 없음 (diff r0-318...r0-324에 충돌 마커 없음) ✅

---

## 머지 순서

**#318 먼저 → #324** (PR #324 본문 명시, r0-324가 `feat/m2-1116-ak` 위에서 분기됨)
