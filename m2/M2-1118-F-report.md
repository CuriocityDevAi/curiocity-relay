PR #361 · 원인 Medusa RoutesSorter "/"→segments=[] 버그로 route 미등록 · 실서버 curl / → 302 O

## 원인 (확정)

`@medusajs/framework` v2.17.2 `RoutesSorter._processRoute`:

```js
const segments = matcher.split("/").filter(Boolean);
// "/" → ["", ""].filter(Boolean) → []
segments.forEach(...)  // 빈 배열 → 루프 미실행 → route 트리에 등록되지 않음
```

`src/api/route.ts`의 `export const GET` 핸들러가 Express에 `app.get("/", handler)` 로
등록되지 않는다. 결과: `GET /` → 404.

추가 확인: `"/(.*)"` 도 Express 4 path-to-regexp v0.1 에서 아무 경로도 매칭하지 않음
(Express 직접 테스트 실증). `"/*"` 가 올바른 패턴.

## 수정

`apps/commerce-core/src/api/middlewares.ts` 에 추가:

```ts
{
  matcher: "/*",        // segments=["*"] → wildcard 버킷 정상 등록
  methods: ["GET"],
  middlewares: [rootRedirectMiddleware],  // req.path==="/" 에만 302, 나머지 next()
}
```

## 실서버 curl 출력 (medusa start, port 9099, NODE_ENV=production)

### GET / → 302 Location: /app ✅
```
HTTP/1.1 302 Found
Location: /app
```

### GET /?foo=bar → 302 Location: /app?foo=bar ✅
```
HTTP/1.1 302 Found
Location: /app?foo=bar
```

### GET /app → 200 ✅
```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
```

### GET /health → 200 ✅
```
HTTP/1.1 200 OK
Cache-Control: no-store
Content-Type: application/json; charset=utf-8
```

### GET /admin/products → 401 ✅
```
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
```

## 빌드/테스트

- `pnpm build` exit 0
- 전체 유닛 테스트 532 passed (pre-push hook 통과)
- root-redirect.unit.spec.ts 4 passed
