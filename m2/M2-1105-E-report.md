---
round: M2-1105-E
pr: null
outcome: 진단 전용 (코딩 금지) · 뿌리 1 줄 · 수정 제안 (주인=M0 cross-team) · 필터 제거 가능성 분석
kyu_checks: 0 (코드 변경 없음)
---

# M2-1105-E · React #418 hydration mismatch 뿌리 진단

**일자**: 2026-11-06 · **허브**: M2 (관측/빌드 레인) · **성격**: 진단 전용 · **상대 리포**: `agilo-medusa-pos-fork` (master `21eb6f3`)

## 0. 뿌리 (1 줄)

**`app/_layout.tsx` 의 `App()` 반환 트리가 M0-1104-A (커밋 `cd09eef`) 에서 단일 `<Stack>` → `<><AuthedBootstrap conditional /><Stack>...</Stack></>` fragment-with-conditional 로 바뀌면서 Expo Router static pre-render 가 삽입하는 `<!--$-->` Suspense/fragment boundary 와 클라이언트 hydration 트리 사이에 구조 불일치가 생김 — React `#418 (fromText=false · "HTML")` 가 /index.html 로드 +298ms 지점에서 발생.**

Sentry 전환(M2-1104-A) · SDK 58 전환(M0-1104-B) 과는 무관 (둘 다 M0-1104-A 이후 머지). 뿌리는 "bootstrap crash 핫픽스" 단 1 commit.

---

## 1. 실측 (file:line + capture)

### 1-A. 재현 캡처 (filter OFF · master `21eb6f3`)

```
[298ms] Minified React error #418; visit https://react.dev/errors/418?args[]=HTML&args[]=
  Error: Minified React error #418; ...
      at Kl (http://127.0.0.1:9442/_expo/static/js/web/entry-*.js:119:40341)
      at Zl (...:119:41710)
      at is (...:119:97028)
      at Gf (...:119:137378)
      ...
      at MessagePort.q (...:131:1531)
```

- 1건 · 초기 /index.html hydration 진행 중 (**+298ms** · goto resolve 이전)
- 스택 전부 React Fiber 내부 (`react-dom-client.development.js` 의 `scheduleUpdateOnFiber` → `beginWork` → `hydrateInstance` → `throwOnHydrationMismatch` 경로)
- 재현률 100% (모든 Playwright 세션 · 모든 라우트 (`/`, `/login`, `/products`, `/settings`) · 모든 commit (아래 §1-B))

### 1-B. git bisect 결과 (file-restore 기반 · clean checkout 2 회로 검증)

| commit | 라벨 | #418 |
|--------|------|------|
| `acdf587` | M0-1103-C logo | **NO** |
| `4bedda8` | M0-1103-D stale draft | **NO** |
| **`cd09eef`** | **M0-1104-A bootstrap crash fix** | **YES** |
| `7f87271` | M0-1104-B SDK58 | YES |
| `3f6b671` | M2-1104-A Sentry | YES |
| `21eb6f3` | master tip (M3-1105-B) | YES |

**최초 발생 커밋**: `cd09eef` = PR #13 (M0-1104-A). Fragment 도입이 수용 범위 안.

### 1-C. 원인 커밋 단독 diff (`app/_layout.tsx`)

```diff
 function App() {
   const auth = useAuthCtx();
   const settings = useSettings();

-  // M0-1103-D · 로그인 직후 1회 저장된 draft order ID 검증 (옛/stale 폐기).
-  useBootstrapDraftOrderValidator(auth.state.status === 'authenticated');
-
   const isSetupComplete = ...;

   return (
-    <Stack>
+    <>
+      {/* M0-1104-A · 인증 서브트리에서만 마운트 → useMedusaSdk 안전 호출 (미인증 render 시 throw 없음) */}
+      {auth.state.status === 'authenticated' && <AuthedBootstrap />}
+      <Stack>
       <Stack.Protected ...>
         ...
       </Stack.Protected>
       ...
     </Stack>
+    </>
```

- **구조 변화**: 1 단일 element → 2 children fragment (조건부 null + Stack)
- **분기 조건**: `auth.state.status === 'authenticated'` — 초기 render 시 server/client 모두 `'loading'` → 조건 false → null 반환 → **DOM 상으로는 동일** 하나 React fiber tree 상 fragment slot 보유 → Expo Router static pre-render 가 `<!--$-->` suspense 마커를 삽입해 둠

### 1-D. 정적 HTML 에서 Suspense 마커 수 (POST-M0-1104-A)

```
<body><div id="root"><!--$--><div class="css-g5y9jx r-13awgt0"><!--$-->...
                    │                                         │
                    outer: expo-router provider              inner: App() fragment
```

- `<!--$-->` 3 건 · `<!--/$-->` 3 건 (= 3 Suspense/fragment 경계)
- 클라이언트 hydration 때 Fiber reconciliation 이 이 마커들을 기대 · `<AuthedBootstrap />` 조건이 server/client 간 실행 타이밍 차이 (SSR 은 즉시 "null" · 클라이언트는 React.lazy chunk load 순서?) 로 1개 어긋남 추정

### 1-E. 오류 메시지 해독

React source (`node_modules/react-dom/cjs/react-dom-client.development.js:5548-5555`):

```js
"Hydration failed because the server rendered " +
  (fromText ? "text" : "HTML") +
  " didn't match the client. As a result this tree will be regenerated on the client. ..."
```

URL 의 `args[]=HTML&args[]=` → **fromText=false · HTML(element) 미스매치 · text content 미스매치 아님**. 즉 attribute/structure level 불일치.

### 1-F. iPad 네이티브 영향 **0**

- React #418 은 `react-dom/client` 의 hydration 경로 (SSR pre-render → client hydrate) 에서만 발생.
- React Native 는 **hydration 개념 없음** — `AppRegistryImpl.js` 에 `hydrate` 심볼 참조 0 건. 네이티브 fabric/paper renderer 가 네이티브 bridge 로 직접 mount.
- Expo Router 의 `output: 'static'` 는 `app.json web` 전용 설정 · iOS/Android 빌드 경로 미사용.
- **결론**: iPad 에서는 #418 재현 불가능 (경로 자체가 없음).

---

## 2. 필터 유지 / 제거 비용 분석

### 2-A. 현재 필터 사용 현황 (7 파일 · M2 레인에서 측정)

```
scripts/m0-1104-a-playwright.mjs
scripts/m1-1104-b-playwright.mjs
scripts/m1-1105-b-playwright.mjs
scripts/m2-1104-a-playwright.mjs
scripts/m2-1105-b-inventory-playwright.mjs
scripts/m2-1105-c-settings-playwright.mjs
scripts/m3-1105-a-playwright.mjs
```

각 파일마다 `WEB_SSR_ALLOWLIST = [/react\.dev\/errors\/418/i]` 또는 `KNOWN_PRE_EXISTING` 패턴 1 블록 유지 (3~6 라인).

### 2-B. 사용자 영향 분석

React #418 은 recoverable error — React 가 client-side 에서 **tree 를 통째로 regenerate** 함 (SSR 결과 버리고 CSR 처음부터). 사용자 관점:

- 초기 hydration 트리가 unmount → 재렌더 (대략 1 프레임)
- SplashScreen 이 짧게 2 번 깜빡일 수 있음 (SSR → regenerate 과정)
- 그 뒤 정상 동작 · interaction loss 0 · state loss 0 (초기 render 뿐이라 state 없음)

→ 사실상 **invisible 하게 복구**. 다만 콘솔 pageerror 로그가 쌓임.

### 2-C. 필터 유지 비용

- 라운드마다 Playwright 하네스 신설 시 복붙 3~6 라인
- 리베이스 시 drift 위험 (M2-1104-B/E 에서 실제로 M0-1104-B allowlist 도입 뒤 추가 필터 필요했음)
- 신규 라운드 담당자가 "왜 걸러야 하나" 재조사하는 시간 (M0·M1·M3 보고서 3회 "pre-existing flag" 중복)

### 2-D. 필터 제거 vs fix 비용

| 옵션 | 수정 범위 | 위험 | 예상 공수 |
|------|-----------|------|-----------|
| **A. Fix 뿌리 (`_layout.tsx` 구조 복원)** | 1 파일 · ~5 라인 | AuthedBootstrap 마운트 타이밍 회귀 (M0-1104-A 원인 "User is not authenticated" 재발 가능) | M0 · 중 (4~8h · 회귀 테스트 재검증 필요) |
| **B. Wrapper 컴포넌트로 중첩 흡수** | 1 파일 · ~10 라인 · AuthedBootstrapGate 추가 | 낮음 (fragment 제거 · AuthedBootstrap 는 자기 내부에서 가드) | M0 · 소 (2~4h) |
| **C. `web.output: 'single'`** | `app.json` 1 라인 | SSR 포기 → SEO 약화 (POS 는 SEO 무관 · 영향 없음) · Playwright 하네스 재튜닝 | M0 · 소~중 (2~6h · 전 하네스 검증) |
| **D. 필터 유지 + 중앙화** | `scripts/_harness.mjs` 신설 · 7 파일 import 1 라인 치환 | 낮음 | M2 · 소 (1~2h) |
| **E. 아무것도 안 함** | 0 | drift 지속 · 신규 라운드마다 재질문 | 0 |

### 2-E. 권장안

**D (필터 중앙화) + 추후 B (wrapper 흡수)** 병행.

- D 를 M2 가 즉시 처리 → 당장 drift 비용 소멸.
- B 는 M0 가 "User is not authenticated" 회귀 가드와 함께 묶어 다음 M0 라운드에 처리.
- C 는 보류 — POS 에는 SEO 요구 없지만 Metro 의 dev/prod 번들 전략이 바뀌므로 넓은 영향.
- A 는 **지양** — 원래 cd09eef 이 핫픽스였기 때문에 되돌리면 M0-1103-D 회귀.

---

## 3. 수정 제안 (owner · 파일·줄·공수)

### 3-A. 필터 중앙화 (즉시) · **M2**

- 신규: `scripts/_harness.mjs` (혹은 `_shared.mjs`) 에 다음 export:
  ```js
  export const WEB_SSR_ALLOWLIST = [/react\.dev\/errors\/418/i, /Download the React DevTools/];
  export const isAllowedWebSSR = (msg) => WEB_SSR_ALLOWLIST.some((re) => re.test(msg));
  ```
- 7 하네스 파일에서 inline 배열 → `import { isAllowedWebSSR } from './_harness.mjs'` + `const isKnown = isAllowedWebSSR;`
- 어설션 로직 (`pageerror.filter(e => !isKnown(e))`) 동일.

**공수**: 1~2h · **파일**: 8 (`scripts/_harness.mjs` 신설 + 7 하네스 치환).

### 3-B. Fragment → Wrapper 컴포넌트 흡수 (추후) · **M0**

`app/_layout.tsx` App() 패턴:

```tsx
function AuthedBootstrapGate() {
  const auth = useAuthCtx();
  if (auth.state.status !== 'authenticated') return null;
  return <AuthedBootstrap />;
}

function App() {
  return (
    <Stack>
      <Stack.Screen name="__bootstrap" options={{ ... }} />  {/* OR keep as sibling if Stack allows */}
      ...existing Stack.Protected...
    </Stack>
  );
}
```

실제로 `<Stack>` 이 비-Screen 자식을 허용하는지 확인 필요 (expo-router 57+ 제약). 허용 안 되면 AuthedBootstrap 호출을 AuthProvider 내부로 이식 (`contexts/auth.tsx` 에 useAuthedBootstrap() 훅으로 흡수 · provider 자식에 side-effect render) — 이 쪽이 더 깨끗.

**공수**: 2~4h · **파일**: 2 (`app/_layout.tsx` + `contexts/auth.tsx` or `api/hooks/draft-orders.tsx`) · **회귀 가드**: `scripts/m0-1104-a-playwright.mjs` 재실행.

### 3-C. (대안 C) `web.output: 'single'` · **M0 or 오케스트레이터**

`app.json web.output: 'static'` → `'single'`. SSR 포기 · hydration 자체 없음.

- **장점**: #418 영원히 사라짐 · Playwright 필터 전부 불필요.
- **단점**: 빌드 산출물이 index.html 1장 + SPA · 라우트별 .html 없음 (POS 운영 상 영향 0 · 확정)
- **공수**: 2~6h · 1 파일 · 전 하네스 "/settings → 직접 navigate" 패턴 재검

**M2 재추천**: 3-C 가 사실상 best path (POS 에게 SSR 가치 0). B 라운드 전에 C 를 검토할 가치.

---

## 4. 필터 제거 가능성 (요약)

| 조건 | 필터 제거 가능? |
|------|----------------|
| 3-A 만 (중앙화) | ❌ (여전히 1건 뜨고 걸러야 함 · 중앙화만) |
| 3-B (fragment 수정) | ⚠️ 추정 (hypothesis · 재측정 필요) |
| 3-C (output: single) | ✅ (SSR 자체 없음 → hydration 없음 → #418 불가) |

## 5. 요약

- **뿌리**: `app/_layout.tsx` 의 M0-1104-A fragment-with-conditional 구조 → SSR/CSR Suspense 경계 미스매치.
- **범위**: 웹 only (iPad 네이티브 영향 0 · recoverable · 사용자 보이지 않음).
- **권장 액션**: M2 즉시 `scripts/_harness.mjs` 신설로 필터 중앙화 + M0 다음 라운드에서 3-B/C 중 선택.
- **코드 변경 0 라운드**: 본 M2-1105-E 는 보고서만 산출.

## 6. 참고

- 뿌리 커밋: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/commit/cd09eef (PR #13)
- React source: `node_modules/react-dom/cjs/react-dom-client.development.js:5548-5555`
- 현재 master: `21eb6f3`
- 측정 기록: `/tmp/m2-1105-e-stack.mjs` 출력 (+298ms repro)
- iPad 네이티브 무영향 근거: `node_modules/react-native/Libraries/ReactNative/AppRegistryImpl.js` 의 `hydrate` 참조 0 건
