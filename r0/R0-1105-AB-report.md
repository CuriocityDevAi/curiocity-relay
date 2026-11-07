---
name: R0-1105-AB · fork #60 M1-1105-U (Z Report shift-sheet gate) + 리뷰 체크리스트 ⑦ 보강
description: fork #60 (M1-1105-U · AuthedOpenShiftGate 가 /register/close·/register/z-result 에서 pathname 가드로 sheet 숨김) 리뷰 · **APPROVE** · 체크리스트 ⑦(Node core/`node:*` import 금지 + Metro iOS 번들 해석) 신설 · 로컬 36/36 PASS · iOS 번들 export exit 0.
author: R0
dated: 2026-11-07
---

# R0-1105-AB · fork #60 M1-1105-U + 리뷰 체크리스트 ⑦ 보강

**스코프**: fork PR #60 (`feat/m1-1105-u-shift-sheet-gate` HEAD `e0d5615`) 단건.
**정본**: fork master `b332508` (M2-1105-P · #59 머지 후) — PR base `3ff7e9e` 이후 master 가 1 커밋 앞서 있으나 `app/_layout.tsx` 미접촉 → 3-way clean.
**직전**: R0-1105-AA → fork #59 APPROVE (Node 어설션만 보고 통과 · Kyu 실기 4차에서 `node:zlib` 로 iPad 크래시). 재발 방지용 체크리스트 ⑦ 을 이 라운드부터 신설.
**claim**: `status/claims/R0-1105-AB.json`.
**금지**: 코드 수정 · 커밋. (`r0/README.md` · `r0/R0-1105-AB-report.md` 2 개만 relay push.)

## 판정

| PR | head | 판정 |
|---|---|---|
| **fork #60** (M1-1105-U · Z Report 라우트에서 OpenShiftSheet 숨김) | `e0d5615` | **APPROVE** — 가드 조건 정확(① `register/close`·`z-result` 전용 · ② 다른 화면·로그인 직후 기존 강제 유지) · ③ `Done` 이동 시 pathname flip → sheet 재노출 · Playwright 17/17 · 전체 36/36 PASS · 체크리스트 ⑦ 신설 포함 모든 축 통과 |

한 줄: `app/_layout.tsx` 에만 손댄 4 줄 변경(regex 1 상수 + `usePathname()` 1 호출 + `shouldPrompt` 조건 `&& !onShiftResultRoute` 1 어펜드) 으로 P5 ② 흐름(close → Z → Done → 다음 open)의 **blocking sheet 가 Z Report 를 가리던** 버그를 정확히 해소.

---

## §A · 변경 좌표 & 로직 검증

### A.1 · 가드 선언 — `app/_layout.tsx:49` · `49-55`

```ts
// L49
const SHIFT_RESULT_ROUTE_RE = /^\/register\/(close|z-result)(\/|$|\?)/;

// L51-57
const AuthedOpenShiftGate: React.FC<{ stockLocationId?: string }> = ({ stockLocationId }) => {
  const openSessionQuery = useCurrentOpenSession(stockLocationId);
  const pathname = usePathname();                                           // L53
  const onShiftResultRoute = SHIFT_RESULT_ROUTE_RE.test(pathname ?? '');    // L54
  const shouldPrompt = openSessionQuery.isFetched && !openSessionQuery.data && !onShiftResultRoute; // L55
  return <OpenShiftSheet visible={shouldPrompt} />;
};
```

| 축 | 평가 |
|---|---|
| **① 라우트 좁음** | 정규식 anchor(`^`) + 명시 `close\|z-result` + terminator `(\/\|$\|\?)` → `/register/close`, `/register/close/`, `/register/close?x` 만 매치. `/register/open`, `/register/pickup`, `/products`, `/settings/**`, `/orders/**`, `/checkout/**`, `/login`, `/setup-wizard` 등 전부 **미매치 → 기존 강제 유지**. ✓ |
| **② 전제 보존** | `openSessionQuery.isFetched && !openSessionQuery.data` 는 M1-1105-N 와 동일. 라우트 가드가 **true 일 때만** 추가로 꺼진다. 로그인 직후 pathname = `/products`(또는 index) → regex no-match → **기존 강제 유지**. ✓ |
| **③ 자동 재노출** | `router.replace('/(tabs)/products')` (`app/register/z-result.tsx:57`) 로 Done → expo-router pathname flip (`/products`) → `onShiftResultRoute=false` → `shouldPrompt=true` → sheet 재노출. **Playwright A6~A8** 로 확증. ✓ |
| **④ 가드 범위** | `AuthedOpenShiftGate` 자체가 `auth.state.status === 'authenticated' && isSetupComplete` 서브트리에서만 마운트(`app/_layout.tsx:81-83`) → 미인증·설정 미완 상태에서 `useCurrentOpenSession` throw 와 무관. 기존 M1-1105-N 격리 유지. ✓ |

**null-safety**: `pathname ?? ''` — expo-router `usePathname()` 이 미정착 시 `null` 반환 가능(잠깐의 route resolve 중). `null` → `''` → regex no-match → `onShiftResultRoute=false` → **보수적**(기존 로직과 동일). ✓

### A.2 · `/register/close` 로직과의 상호작용

- `app/register/close.tsx:40-64` — close 화면 진입 시 `session.data` 는 아직 non-null(open 세션). 따라서 **이 화면에 있는 동안**은 `openSessionQuery.data` truthy → `shouldPrompt=false`. 가드가 기여하는 몫은 **close submit 성공 후 `router.replace('/register/z-result', ...)`** 로 넘어가는 그 **한 틱 사이**(캐시 invalidate → 다음 GET /register-sessions 가 empty 반환 → data null) 에 **z-result 라우트에서 sheet 가 뜨지 않도록** 하는 것. ✓
- `app/register/close.tsx:102-104` — Cancel = `router.back()`. 이 때 session 은 여전히 open 이므로 sheet 조건이 성립하지 않음. 라우트 가드 영향 없음. ✓

### A.3 · `/register/z-result` 상호작용

- `app/register/z-result.tsx:53` `Copy to WhatsApp` 버튼 — M2-1105-M 영수증 WA 복사 흐름. Playwright **A5** 에서 `isVisible()` + 클릭 가능 확인(sheet 가 가리는지 여부). ✓
- `app/register/z-result.tsx:57` `Done (back to home)` — `router.replace('/(tabs)/products')`. Playwright **A6~A8** 에서 **sheet 재노출** 확증. ✓
- 뒤로가기 경로(iOS swipe · Android 하드웨어 백) — `router.replace` 로 왔기 때문에 history pop target 자체가 없음. 가드의 안전망 또한 거의 유일 off-ramp. ✓

---

## §B · 체크리스트 전체 (①~⑦)

### ① 스코프

`gh pr diff 60 --name-only`:
```
app/_layout.tsx            (수정 · +11 / -2)
docs/M1-1105-U-sheet-after-done.png   (스크린샷)
docs/M1-1105-U-z-no-sheet.png         (스크린샷)
scripts/m1-1105-u-playwright.mjs      (신규 테스트)
```
→ 단일 가드 파일 + 테스트/스크린샷. **금지영역 수정 0**. ✓

### ② 서버 계약

변경 없음(기존 `useCurrentOpenSession` · `/admin/register-sessions` GET). Playwright A0·A2·A9 에서 fixture 상태머신으로 응답 shape 그대로 재현. ✓

### ③ D1 · 영어 copy

- `node scripts/m2-1105-n-accent-guard.mjs` → `PASS · accent 토큰 사용처 가드 · 허용 파일 밖 사용 0건`. ✓
- `app/_layout.tsx` 한글 검사: 모든 한글(L41-48·L63·L78·L80) 은 **주석 전용** — 렌더 문자열/toast/placeholder 미노출. ✓
- `OpenShiftSheet.tsx` 미접촉 → 영어 copy 그대로(“Open shift” · “Count the cash drawer …” · “Log out”). ✓

### ④ Playwright/assertion

| 스크립트 | 결과 |
|---|---|
| `scripts/m1-1105-u-playwright.mjs` (신규 · Case A 11건 + Case B 6건) | **17/17 PASS** (★ A4 Z 위 sheet=0 · ★ A8 Done 뒤 sheet 재노출 · A3 `zReportHeaderMark` · A5 Copy 클릭 · A9 재open 후 sheet 자동 닫힘 · B1 최초 boot sheet 강제 · B2 Log out 유일 off-ramp) |
| `scripts/m1-1105-n-playwright.mjs` (회귀 가드) | **13/13 PASS** (최초 boot sheet 강제 · open 상태 재진입 미노출) |
| `node scripts/run-all.mjs all` | **36 / 36 PASS · 0 FAIL · 389.8s** |

### ⑤ CI

`gh pr view 60 --json statusCheckRollup`:
- `CI / assertions + playwright` → **SUCCESS** (2026-11-07T14:37:14Z · 42381707550)
- `Lint / lint` → **SUCCESS** (2026-11-07T14:28:57Z · 42381707406)

### ⑥ Kyu 결정 존중 (P5 ①②)

- **① 취소 없음**: `OpenShiftSheet.tsx:82-88` `onRequestClose`/`onOverlayPress` preventDefault 그대로 · 유일 off-ramp = Log out 버튼(`:111-113`). PR #60 미접촉. ✓
- **② 하루 복수 교대**: close → Z Report(sheet 가림 없이) → Done → **sheet 재노출 → Open shift 폼 → 새 session** 흐름이 Playwright Case A (A1→A10) 로 end-to-end 확증. ✓
- **로그인 직후 강제 유지**: Case B (B1) — 최초 boot 세션 null → sheet 전면 노출. ✓

### ⑦ **RN 번들 안전** (신설 · r0/README §⑦)

**정적 grep** — `app/** components/** lib/** api/** hooks/** contexts/** config/** constants/** utils/**` 에서 다음 패턴 매치 **0건**:

```
pattern:  (^|[^.\w])(from\s+["']|require\(["'])(node:[a-z_]+|fs|fs/promises|path|path/posix|path/win32|zlib|child_process|os|crypto|stream|net|tls|http|https|dns|url|tty|util|v8|vm|worker_threads|readline|module|perf_hooks|async_hooks|events|buffer|assert)(["'])
결과:     No matches found
```

**Metro iOS 번들 해석** — `npx expo export --platform ios --dev`:

```
› ios bundles (1):
_expo/static/js/ios/entry-d41d8cd98f00b204e9800998ecf8427e.js (22MB)

Exported: dist
exit=0
```

생성 번들에서 `node:zlib` · `node:fs` · `node:child_process` · `require("zlib")` · `require("fs")` · `require("child_process")` 매치 **0건**. `node:path` 1 건은 `expo-router` 내 **문자열/주석 리터럴**(“Avoid using node:path to be compatible with web and RN runtime.”) — 실제 import 아님. ✓

→ Kyu 실기 4차 `node:zlib` 크래시(fork #59/M2-1105-P) 재발 없음을 PR #60 범위에서 확정.

---

## §C · 체크리스트 보강 (r0/README)

이 라운드부터 **상시 체크 ⑦** 를 r0/README 에 신설(이 리포 push 와 함께 커밋):

- **정적 grep** (app/components/lib/api/hooks/contexts/config/constants/utils) + **Metro iOS 번들 해석 1 회** (`npx expo export --platform ios --dev` exit 0 + `_expo/static/js/ios/*.js` 산출).
- 실패 시 CHANGES. 허용 예외 = `scripts/**` · `metro.config.js` · `babel.config.js` · `eslint.config.js` 등 **앱 번들 그래프 밖** 파일.
- M2-1105-Q (`#61` 핫픽스) 머지 후에는 `scripts/m2-1105-q-bundle-guard.mjs` 하나로 통합(⑦ 의 집행 수단 교체 · 판정은 동일).

(PR #61 자체는 R0-1105-AC 에서 별도 리뷰.)

---

## §D · 운영 노트 · 다음 라운드

- **PR 상태**: `mergeable: UNKNOWN` (gh 캐시 이슈로 흔함) · PR base `3ff7e9e` 와 master `b332508` 사이에 **`app/_layout.tsx` 미접촉** → 수동 점검상 머지 안전. 머지 전에 GitHub UI 상 "Resolve conflicts" 배지 다시 확인 권장.
- **deferred risk** (blocker 아님): 가드 regex 가 `/register/close` · `/register/z-result` 만 커버. 향후 다른 "shift 결과형" 라우트(예: `/register/x-report` summary 등)가 추가되면 regex 확장 필요. 지금 범위 적절.
- **review-only 변경**(이 라운드 relay push): `r0/README.md`(신설) · `r0/R0-1105-AB-report.md`(이 파일). 상위 [청소] § 1 (허브당 리포트 1 개 유지) 준수를 위해 이전 `r0/R0-1105-AA-report.md`, `r0/R0-1105-Y-report.md`, `r0/R0-1105-Z-report.md` 는 같은 커밋에서 삭제.
- **claim**: `status/claims/R0-1105-AB.json` 를 `done` 으로 업데이트 (`scripts/claim.mjs R0-1105-AB done …`).

**최종 판정**: fork #60 **APPROVE**.
