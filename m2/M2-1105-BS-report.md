# M2-1105-BS 리포트

라우트 패턴 교체(middlewares.ts) · 부팅 확인(BOOT OK + curl 4종 200) · pos-integration 미검증(CI 대기 중)

---

## 수행 내역

### REQ 1 · #269 main rebase
- BQ 브랜치(`m2/M2-1105-BQ-customer-display-web-serve`)를 `origin/main`(8b52033 · #261 포함)으로 rebase
- 충돌 없음 · force-with-lease push 완료

### REQ 2 · 라우트 패턴 교체

**근본 원인 분석 (Medusa 소스 직접 확인):**
- `@medusajs/framework` v2.17.2 → `path-to-regexp ^8.2.0`
- `routes-loader.js` PARAM_SEGMENT_MATCHER = `/\[(\w+)\]/` → `[...path]` 의 `...` 는 `\w` 불일치 → 치환 없음
- `RoutesFinder.add()` 가 `/customer-display-web/[...path]` → `pathToRegexp()` 에 그대로 전달 → `Unexpected [` 오류

**선택: middlewares.ts 커스텀 핸들러**
- `express` 직접 의존성 없음 → `express.static()` 대신 커스텀 핸들러 사용
- `app.use('/customer-display-web', handler)` 로 등록 → Express 4 prefix 제거 후 `req.path` = `/index.html` 수신
- safePath(path traversal 방어) · MIME 맵 · 캐시 헤더 · SPA fallback 모두 유지

**삭제한 파일:**
```
apps/commerce-core/src/api/customer-display-web/[...path]/route.ts  (삭제)
apps/commerce-core/src/api/customer-display-web/route.ts            (삭제)
```

**수정한 파일:**
```
apps/commerce-core/src/api/middlewares.ts  (+115 lines · customerDisplayWebHandler 추가)
```

### REQ 3 · 로컬 부팅 + curl 확인

```
✓ BOOT OK :9000  (medusa develop)
```

**curl 결과:**
```
curl /customer-display-web/index.html         → HTTP 200  Content-Type: text/html; charset=utf-8  Cache-Control: no-cache
curl /customer-display-web/version.json       → HTTP 200  Content-Type: application/json; charset=utf-8  Cache-Control: public, max-age=31536000, immutable
curl /customer-display-web                    → HTTP 200  Content-Type: text/html; charset=utf-8  Cache-Control: no-cache  (root)
curl /customer-display-web/spa-route/nonexist → HTTP 200  Content-Type: text/html; charset=utf-8  Cache-Control: no-cache  (SPA fallback)
```

### REQ 4 · 재발 방지 금지 패턴 추가

`scripts/naming-check.sh` 에 **검사 3** 추가:
- `apps/commerce-core/src/api/` 하위 모든 폴더 중 `[...]` 패턴 발견 시 fail
- 오류 메시지: "Next.js 스타일 [...x] 사용 금지. path-to-regexp v8 에서 부팅 오류 발생."
- 로컬 `bash scripts/naming-check.sh` → PASS 확인

---

## CI 상태

- PR #269 push 완료 (`e3cea5c`) · draft 해제 완료
- CI 아직 시작 전 (GitHub Actions 대기 중)
- pos-integration: **미검증** (CI 대기)

**단위 테스트 (pre-push hook):**
```
commerce-core: 22 suites · 310 tests PASS
customer-display: 2 suites · 74 tests PASS
packages/event-contracts: 2 suites · 21 tests PASS
```

---

## 이연 순증감

- 없음
