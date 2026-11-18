#361 CHANGES · curl / 302 O

## curl 실측 결과 (port 9001, `pnpm build` → `medusa start`)

```
GET /               → 302  Location: /app          ✅
GET /app            → 200  text/html               ✅
GET /health         → 200  application/json        ✅
GET /admin/products → 401  Unauthorized            ✅
GET /store/products → 400  (Medusa CORS 오류, 서버 정상 처리) ✅
POST /hooks/payment/xendit → xendit token unconfigured (서버 정상 처리, GET 미들웨어 무관) ✅
```

## REQ 체크

### REQ-1: `matcher:"/*"` + GET + `req.path==="/"` → 302, 나머지 `next()`
- **OK.** `rootRedirectMiddleware` 는 GET 전용(`methods:["GET"]`). `req.path !== "/"` 분기로 즉시 `next()` 호출.
- `/app` 정적 파일: `req.path=/app` → next() → 영향 없음.
- `/admin/*` 인증: `req.path=/admin/products` → next() → Medusa 인증 미들웨어가 그대로 처리.
- `/store/*`: 동일 로직, 영향 없음.
- `/hooks/*` (POST): `methods:["GET"]` 로 아예 미들웨어 미 호출, 영향 없음.

### REQ-2: 미들웨어 배열 순서·충돌
- 순서: `/*`(GET) → `/customer-display/snapshots/*` → `/customer-display-web`
- 충돌 없음. `/*` GET 미들웨어는 path===`/` 일 때만 종료, 나머지는 항상 next(). 다른 matcher 에게 영향 없음.
- `/customer-display-web` 는 GET 요청이지만 `req.path=/customer-display-web`이므로 rootRedirect 통과.

### REQ-3: `pnpm build` + `medusa start` + curl
- 빌드: `Backend build completed successfully (4.60s)` / `Frontend build completed successfully (17.60s)` ✅
- 실측 위 표 참조 — 302 O / /app 200 O / /health 200 O / /admin/products 401 O.

### REQ-4: 이전 `src/api/route.ts` 죽은 코드 정리 여부
- **미정리.** PR 브랜치에 `apps/commerce-core/src/api/route.ts` 가 그대로 존재.
  ```ts
  // apps/commerce-core/src/api/route.ts (PR 브랜치)
  export const GET = (req, res) => { res.redirect(302, `/app${qs}`); };
  ```
- 이 파일은 #358 에서 추가된 Medusa RoutesSorter 미등록 경로 (`/`). middlewares.ts 방식으로 이전했으나 삭제되지 않음.
- Medusa 는 `src/api/route.ts` 를 `GET /` 로 등록 시도하지만 RoutesSorter 버그로 실제로는 무시됨.
- 미들웨어가 먼저 처리하므로 기능 충돌은 없지만, 혼란을 줄 수 있는 죽은 코드.

## 판정

**CHANGES** — 기능 동작 자체는 정상(302 확인)이지만 `src/api/route.ts` 죽은 코드가 미삭제.

```
CHANGES: apps/commerce-core/src/api/route.ts 삭제 필요.
  - #358 에서 추가된 RoutesSorter-버그-우회 시도 코드.
  - 현 PR 의 middlewares.ts 방식이 올바르게 동작하므로 route.ts 는 불필요.
  - 삭제하지 않으면 "GET / → route handler" 의도인지 "middleware redirect" 의도인지
    모호해짐. 향후 Medusa 버전에서 RoutesSorter 버그가 수정될 경우 이중 redirect 위험.
```
