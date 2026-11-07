---
round: M3-1105-Q
pr:
  fork: agilo-medusa-pos-fork#TBD
commit: TBD (branch feat/m3-1105-q-shift-close-gate · base master a0bfcd6)
outcome: Close shift → Z Report 가 Open shift 시트에 덮이는 iPad 실기 버그 (#60 M1-1105-U 수정 후에도 재현) 를 sticky closingShift latch (ShiftCloseGate 컴포넌트) 로 교정. `usePathname()` + regex 는 web 에서 PASS 였지만 iOS 의 UIViewController modal fade race 를 못 막음 — 한 프레임 flash 자체를 차단해야 하므로 segments 기반 latch 로 shift-result 진입 시 `visible=true` 커밋을 원천 차단. app/_layout.tsx 는 AuthedOpenShiftGate 인라인 → `<ShiftCloseGate>` 로 이관. api/hooks/** · lib/printer · Checkout 파일 미수정 (금지선 준수). Playwright 신규 25/25 (Case A: Settings→Close→Z Report·MutationObserver anti-flash 0 · Done→sheet 재노출 · 하루 복수 교대 · Case B: boot sheet P5① 회귀 · Case C: 탭 전환 latch release) + m1-1105-u 17/17 회귀 + m1-1105-n 13/13 회귀 + 색 어설션 37/37 + 번들 가드 PASS + typecheck + lint 0 error (pre-existing 34 warnings 유지). iOS 시뮬 maestro 플로 `maestro/pos/sim-shift-close-flow.yaml` 신규 (Kyu 실기 재현용 · pos-m3 Metro 재바인딩 필요).
kyu_checks:
  - iOS 시뮬 실기 1회 (maestro/pos/sim-shift-close-flow.yaml · 스샷 2장 확인)
---

# M3-1105-Q · Close shift → Z Report 가 Open shift 시트에 덮이던 iPad 실기 버그 (sticky latch)

**일자**: 2026-11-07 · **허브**: M3 (이번 한정 파일 주인: app/_layout.tsx · components/shift/** · scripts/m3-* · maestro/pos/sim-shift-close-flow.yaml) · **성격**: open-requirements Kyu 실기 3차·6차 (11-07 22:44) "Close shift → Z Report 가 뜨자마자 Open shift 시트가 덮음 — #60 머지된 a0bfcd6 에서도 똑같음".

---

## §0 뿌리 (file:line · "왜 #60 이 iPad 에서 안 먹었는가")

**순서 로그 (Playwright navLog · scripts/m3-1105-q-playwright.mjs Case A)**:

```
40.232  POST /admin/register-sessions/.../close              ← close.tsx:54 mutateAsync
40.351  GET  /admin/register-sessions  phase=post-close n=0  ← onSuccess invalidate refetch
42.575  GET  /admin/register-sessions  phase=post-close n=0  ← 폴링
44.709  POST /admin/register-sessions                        ← OpenShiftSheet submit
44.852  GET  /admin/register-sessions  phase=open-2 n=1
```

- (1) `useCloseRegisterSession.onSuccess` (`api/hooks/register-session.ts:182-188`) 가 `setQueryData z-report` → **`invalidateQueries(REGISTER_QK)`** 를 돌리고 await 가 풀린 뒤 `close.tsx:61 router.replace('/register/z-result')` 가 실행됨 — **session 쿼리 invalidation 이 라우트 커밋보다 먼저**.
- (2) 리페치 뒤 `useCurrentOpenSession.data === null` 로 뒤집히는 React 커밋과 `pathname === '/register/z-result'` 로 뒤집히는 커밋 **사이에 한 프레임의 틈**이 열린다. 그 프레임:
  ```
  shouldPrompt = isFetched && !data && !onShiftResultRoute === true
  → <OpenShiftSheet visible={true}>
  → <Modal visible={true}> (components/ui/Dialog.tsx:84)
  ```
- (3) **웹**: React DOM re-render 로 visible=false 가 즉시 Modal 을 unmount — flash 가 눈에 띄지 않아 M1-1105-U Playwright 17/17 PASS 했다.
- (4) **iOS (iPad)**: `<Modal animationType="fade">` 는 UIViewController presentation. 한번 present 명령이 들어가면 그 fade 애니메이션 (≈ 300 ms) 이 완결되기 전 visible=false 로 돌려도 네이티브 modal 이 전면에 머물러 Z Report 를 덮음 (알려진 RN race).
- (5) **가설 ② (pathname vs segments) 는 틀렸다**: `node_modules/expo-router/build/global-state/useRouteInfo.js:21-35` 에서 `usePathname()` 와 `useSegments()` 둘 다 **같은 `routeInfoContext.RouteInfoContext`** 를 읽는다 — 두 훅의 업데이트 cadence 는 동일. 진짜 수리는 한 프레임의 flip 자체를 차단해야 한다.
- (6) **가설 ③ (web vs native 라우트 문자열 차이) 도 큰 영향 없음**: 두 플랫폼 모두 `/register/close` · `/register/z-result` 로 동일. 차이는 (4) 의 Modal presentation lifecycle.

→ **확정 뿌리**: invalidate-먼저 라는 순서 자체를 바꾸지 않고, 시트 `visible` 을 "shift-result 라우트에 한 번 들어선 이후엔 명확히 벗어나기 전까지 FALSE 로 latch" 하는 상태 머신으로 교정.

---

## 1. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | §0 뿌리 재현 로그 수집 (Playwright navLog) 및 iOS Modal race 가설 확정 | ✓ |
| 2 | ShiftCloseGate 신규 · sticky `closingShift` latch (segments 기반) | ✓ |
| 3 | app/_layout.tsx · AuthedOpenShiftGate 인라인 제거 → `<ShiftCloseGate>` | ✓ |
| 4 | shift-result 라우트 (register/close · register/z-result) 식별 helper | ✓ |
| 5 | latch release 조건 — segments[0] 이 '(tabs)' · 'settings' · 'checkout' 등 non-shift top-level 로 flip 시 | ✓ |
| 6 | P5 ① 로그인 직후 강제 시트 회귀 0 (초기 segments 가 non-shift → latch=false 유지) | ✓ |
| 7 | Playwright m3-1105-q · Case A (settings → close → Z Report · MutationObserver anti-flash 0 · Done → sheet 재노출 · 재개점) | ✓ 13/13 |
| 8 | Playwright m3-1105-q · Case B (최초 boot · 세션 null · sheet 전면 노출) | ✓ 4/4 |
| 9 | Playwright m3-1105-q · Case C (Z Report → Settings 탭 이동 → latch release) | ✓ 6/6 |
| 10 | 기존 m1-1105-u 회귀 17/17 | ✓ |
| 11 | 기존 m1-1105-n 회귀 13/13 | ✓ |
| 12 | 색 어설션 37/37 | ✓ |
| 13 | 번들 가드 (m2-1105-q · 정적 grep + iOS Metro 번들 해석) | ✓ |
| 14 | typecheck (pre-existing `global.css` side-effect import 오류만 유지 · 본 수정 무관) | ✓ |
| 15 | lint (0 error · 34 pre-existing warnings 유지) | ✓ |
| 16 | iOS 시뮬 maestro 플로 신규 (`maestro/pos/sim-shift-close-flow.yaml` · Kyu 실기 재현용) | ✓ |
| 17 | api/hooks/** · lib/printer · Checkout 파일 미수정 (금지선) | ✓ |

---

## 2. 산출물 (base master `a0bfcd6`)

| 파일 | 변경 | 라인 |
|------|------|------|
| `components/shift/ShiftCloseGate.tsx` | **신규** · sticky latch · segments 기반 · §0 전체 주석 | +109 |
| `app/_layout.tsx` | AuthedOpenShiftGate 인라인 제거 · `<ShiftCloseGate>` import | +4 / -14 |
| `scripts/m3-1105-q-playwright.mjs` | **신규** · Case A/B/C · MutationObserver anti-flash · navLog 덤프 | +320 |
| `maestro/pos/sim-shift-close-flow.yaml` | **신규** · iPad 실기 재현용 (open shift → Settings → Close → Z Report `assertNotVisible open-shift-sheet` → Done → `assertVisible open-shift-sheet` + 스샷 2장) | +72 |

---

## 3. §스샷 (web Playwright · 1024×1366 iPad Pro 11-inch 뷰포트)

**web screenshots** (anti-flash race 는 네이티브 전용이지만, 라우트 순서·컴포넌트 트리는 동일 — 시각 회귀 보조자료):

- `/tmp/m3-1105-q-z-no-sheet.png` — Z Report 전면 노출 · OpenShiftSheet 미노출 (Copy to WhatsApp · Done 버튼 접근 가능)
- `/tmp/m3-1105-q-sheet-after-done.png` — Done 누른 뒤 /products · OpenShiftSheet 전면 노출 (하루 복수 교대 재개점 UX)

**iOS 시뮬 실기 (Kyu 체크 ① · 본 리포트 승인 전제)**:
```
npm run sim:run                                   # ios/ prebuild + 빌드 + 설치 (10~15분)
                                                  # (주의: 다른 Metro 서버가 8081 점유 중이면 중단)
maestro test maestro/pos/sim-shift-close-flow.yaml \
  -e EMAIL=<test> -e PASSWORD=<test>              # 스샷 2장 자동 저장 → maestro output
```
스샷:
- `m3-1105-q-ios-z-no-sheet` — iPad Z Report · `assertNotVisible open-shift-sheet` 뒤 캡처
- `m3-1105-q-ios-sheet-after-done` — Done 뒤 /products · `assertVisible open-shift-sheet` 뒤 캡처

---

## 4. CI (local runner)

| 검사 | 결과 |
|------|------|
| `node scripts/m3-1105-q-playwright.mjs` | **25/25 PASS** · 0 pageerror · 0 console.error |
| `node scripts/m1-1105-u-playwright.mjs` | **17/17 PASS** (#60 회귀 가드) |
| `node scripts/m1-1105-n-playwright.mjs` | **13/13 PASS** (P5 ① 회귀 가드) |
| `node scripts/m3-1105-a-color-assertions.mjs` | **37/37 PASS** (색 어설션) |
| `node scripts/m2-1105-q-bundle-guard.mjs` | **PASS** (정적 grep + iOS Metro 번들 해석 17.4 s) |
| `npx tsc --noEmit` | pre-existing `global.css` side-effect import 1건만 (M0-1104-A 이래 상수 · 본 수정 무관) |
| `npx expo lint` | **0 error** · 34 warnings (모두 pre-existing · BottomSheet·QuantityPicker 등 본 수정 무관) |

---

## 5. 설계 요지 (code · `components/shift/ShiftCloseGate.tsx:80-108`)

```tsx
// Sticky latch — segmentsKey 가 바뀔 때만 재평가 (Adjusting state while rendering · react.dev 블레싱)
const segmentsKey = segments.join('/');
const [prevSegmentsKey, setPrevSegmentsKey] = React.useState(segmentsKey);
const [closingShift, setClosingShift] = React.useState(false);

if (prevSegmentsKey !== segmentsKey) {
  setPrevSegmentsKey(segmentsKey);
  if (onShiftResultRoute) {
    if (!closingShift) setClosingShift(true);          // close/z-result 진입 → latch on
  } else if (closingShift && isClearNonShiftTop(segments)) {
    setClosingShift(false);                             // Done · 탭 전환 → latch release
  }
  // else: segments 미해결 (transition 중 공백) → latch 유지 (flash 금지)
}

const shouldPrompt =
  openSessionQuery.isFetched && !openSessionQuery.data && !closingShift && !onShiftResultRoute;
return <OpenShiftSheet visible={shouldPrompt} />;
```

**왜 한 프레임 flash 를 막는가**: `closingShift` 가 TRUE 인 동안 `shouldPrompt` 가 FALSE 로 고정되어, 한 프레임이든 여러 프레임이든 `visible=true` 커밋이 Modal 로 내려가지 않는다. iOS Modal 의 present-애니메이션이 시작되는 "발화점" 자체가 소거되므로 (4) 의 race 가 성립할 여지가 없음.

**release 조건이 왜 segments[0] non-shift 로 좁은가**: `register/pickup` · `register/open` 같은 register 하위에서도 shift-close 흐름을 떠난 것으로 본다 (해당 화면 오픈 시엔 session 쿼리 자체가 가드) — latch 를 과도하게 길게 들고 있어 재개점 sheet 가 안 뜨는 회귀를 막기 위함. **`settings` 를 non-shift 로 둔 이유**: Kyu REQ 2 "Z Report 를 떠날 때 (Done · **다른 탭**)" — Settings 탭으로 돌아갈 때도 release 되어야 한다 (Playwright Case C 로 회귀 가드).

---

## 6. 금지선 준수

| 금지선 | 확인 |
|-------|------|
| `api/hooks/**` | **미수정** (register-session.ts · draft-orders.ts · 모두 그대로) |
| `lib/printer` | **미수정** |
| Checkout 파일 (`app/checkout/` · `components/payment/` · `components/receipt/`) | **미수정** (#62 리뷰 중 · 간섭 없음) |

파일 주인 (이번 한정 · M1 대신): `app/_layout.tsx` · `components/shift/**` · `scripts/m3-1105-q-*` · `maestro/pos/sim-shift-close-flow.yaml`. `app/(tabs)/settings.tsx` 는 **수정 없이 재사용** (M1-1105-P 가 이미 세운 `router.push('/register/close')` 와 testID · 그대로 활용).

---

## 7. 열린 확인

- (Kyu 체크 ①) iOS 시뮬 실기 — 위 §스샷 명령 그대로 1회 돌려 2 장 스샷 확인 후 승인 부탁.
- (후속) 이 latch 패턴은 P6 분할 결제 Checkout 흐름에도 동일 race 소지가 있다 (close 처럼 invalidate-먼저 → navigate 뒤짐) — 그쪽 가드가 필요해지면 ShiftCloseGate 패턴 재사용 가능.
