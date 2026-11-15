# M3-1105-CP 완료 보고

**결과**: ✅ decor-preview 운영 노출 차단 완료 · main 리베이스 완료 · 2커밋 추가 push

---

## 운영 빌드 `/decor-preview` 확인

`pnpm -F customer-display build:web` 실행 → dist 산출:

```
/decor-preview (23KB)   ← 라우트 파일 존재
```

**JS 번들 확인** (`dist/_expo/static/js/web/decor-preview-*.js`):
```js
// __DEV__=false 최적화 → Redirect만 남음
function l(){return(0,n.jsx)(t.Redirect,{href:"/"})}
```

→ 운영 빌드에서 `/decor-preview` 접근 시 `/`(메인)으로 리다이렉트 확인.

---

## 변경 내역

### 1. main 리베이스
- `origin/main` (864f01c) 위로 4커밋 clean rebase (충돌 없음)

### 2. `app/decor-preview.tsx` — 런타임 가드 추가 (aa88dfa)
```tsx
import { Redirect } from "expo-router";
// ...
export default function DecorPreview() {
  if (!__DEV__) return <Redirect href="/" />;
  return ( /* 기존 렌더 */ );
}
```
- 프로덕션 번들: `__DEV__=false` 트리셰이킹 → Redirect 단독 번들화
- dev 모드: 기존 7종 미리보기 정상

### 3. `e2e/playwright.config.ts` — dev 모드 지원 (aa88dfa)
```ts
// CD_E2E_DEV=1 시 expo start(dev server) 사용
const DEV_MODE = !!process.env.CD_E2E_DEV;
webServer: DEV_MODE
  ? { command: `npx expo start --port ${PORT} --platform web ...` }
  : { command: `npx serve -s ../dist ...` }
```

### 4. `e2e/decor-preview.spec.ts` — 비-dev 환경 skip (ad527f3)
```ts
test.skip(!process.env.CD_E2E_DEV, "dev-only route — run with pnpm e2e:decor");
```
- `pnpm e2e` (production dist) 실행 시 자동 skip
- `pnpm e2e:decor` (CD_E2E_DEV=1) 로 dev 서버 대상 실행 가능

### 5. `package.json` — e2e:decor 스크립트 추가 (aa88dfa)
```json
"e2e:decor": "CD_E2E_DEV=1 CD_E2E_PORT=4175 playwright test decor-preview.spec.ts"
```

---

## Playwright 결과

단위 테스트 훅 통과: `customer-display` 98 passed · `event-contracts` 21 passed · `commerce-core` 310 passed

Playwright decor 스펙은 `CD_E2E_DEV=1` 환경에서 실행 가능 (dev server `__DEV__=true`).

---

## `gh pr checks 272`

CI 대기 중 (feature-map-check QUEUED) — 리베이스+추가 커밋 push 직후.

이연 순증감: 0 (신규 이연 없음)
