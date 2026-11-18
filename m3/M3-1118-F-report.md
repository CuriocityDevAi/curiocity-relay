#376 갱신 · /me route O · 401 it O · rebase 충돌 X

## 작업 요약

### 완료 항목

**[REQ1] GET /customer-display/me route**
- `apps/commerce-core/src/api/customer-display/me/route.ts` 신규 생성
- device token 미들웨어 보호 (401 missing/revoked)
- 200 → `{ stock_location_id }` 반환

**[REQ2] middlewares.ts — me 경로 1줄 추가**
- `{ matcher: "/customer-display/me", middlewares: [deviceTokenMiddleware] }` 추가

**[REQ3] pairing.ts JSDoc 정정**
- "network error or other HTTP error → treat as invalid" → "other HTTP error → ok (old server) · network error → ok" 로 실제 동작과 일치

**[REQ4] 통합 테스트**
- `integration-tests/pos/customer-display-me.spec.ts` 신규
  - REQ1: 유효 토큰 → 200 ✓
  - REQ2: 무효 토큰 → 401 device_token_revoked ✓
  - REQ3: 토큰 없음 → 401 missing_device_token ✓

### 테스트 로그

```
it.sh customer-display-me
=== [it.sh] customer-display-me ===
PASS integration-tests/pos/customer-display-me.spec.ts (12.657 s)
  M3-1118-F · GET /customer-display/me
    ✓ REQ1: 유효 토큰 → 200 · stock_location_id 반환 (449 ms)
    ✓ REQ2: 무효 토큰 → 401 device_token_revoked (712 ms)
    ✓ REQ3: 토큰 없음 → 401 missing_device_token (628 ms)
Tests: 3 passed, 3 total
==============================
 통과: 1 / 1
==============================
```

unit tests:
- commerce-core: 539 passed (47 suites)
- customer-display: 166 passed (10 files)

### 커밋
`07bd9a5` feat(customer-display): M3-1118-F — GET /customer-display/me route · 401 bootCheck 수정

### rebase
- push 전 `git rebase origin/main` — 충돌 없음 (up to date)
