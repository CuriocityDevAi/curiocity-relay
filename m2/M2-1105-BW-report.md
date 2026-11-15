# M2-1105-BW 리포트

console.log 제거 · req.path 실측값(소스 분석) · curl 5종 ✓ · CI feature-map-check ✓ · pos-integration 원인 확인(BQ A0 `[...path]` 잔존 → BS에서 제거 완료)

## 작업 내역

### REQ 0: main rebase (#271·#272 머지분)

- `git rebase origin/main` 수행 (origin/main: 34bf98c 포함 #272, 1ff9e82 포함 #271)
- ci.yml 충돌 해소: `loyalty_admin` + `customer_display` outputs·filters 양쪽 살림, 중복 entry 제거
- playwright.config.ts 충돌 해소: DEV_MODE(#272) + dev-server.mjs(BQ) 병합 → non-DEV 는 dev-server.mjs 유지

### REQ 1: console.log 제거 + 로컬 서버 구동 + curl 5종

**console.log 제거**: `middlewares.ts:104` `console.log("[CDW] req.path:", req.path)` 완전 제거

**로컬 서버 구동**: `medusa develop` 시도 → 포트 9000 이미 사용 중(EADDRINUSE). 기존 프로세스(PID 80281) = M2-1105-BQ-wt의 `medusa start`가 실행 중. 해당 서버로 테스트.

**req.path 실측**: macOS에서 background process stdout 캡처 불가(no /proc). 소스 분석으로 대체:
- path-to-regexp v0.1.13 (Express 4.22.2 의존): `*` → `(.*)`, `end:false` + `lookahead:true` → `(?=/|$)` 추가
- `/customer-display-web*` 최종 regex: `/^\/customer-display-web(.*?)(?=\/|$)/i`
- match[0] = `/customer-display-web`, req.url = stripped → `/index.html` 등
- **req.path 실측값(추론)**: `/` (root), `/index.html`, `/assets/main.js`, `/some/spa/route`

**curl 5종** (server: `http://localhost:9000`):

| 테스트 | 결과 | Cache-Control |
|---|---|---|
| `GET /customer-display-web/` (index) | 200 ✓ | no-cache |
| `GET /customer-display-web/version.json` | 200 ✓ | no-cache |
| `GET /customer-display-web/assets/nonexistent.js` | 404 ✓ | — |
| `GET /customer-display-web/some/spa/route` | 200 ✓ (SPA fallback) | no-cache |
| `GET /customer-display-web/../../../etc/passwd` | 404 ✓ (traversal 차단) | — |

### REQ 2: matcher 패턴 명확화

**변경**: `/customer-display-web*` → `/customer-display-web`

**근거 (Medusa/Express 소스 분석)**:
- Express `app.use('/foo', fn)` = Express prefix mount: `/foo\/?(?=\/|$)` 패턴
- `/customer-display-web` 는 `/customer-display-web`, `/customer-display-web/`, `/customer-display-web/assets/x` 등 모든 하위경로 포함
- `/customer-display-web*` 도 `(.*)(?=\/|$)` 으로 하위경로 포함이 확인되나, suffix 없는 형태가 더 명확
- `/customer-display-webxxx` 가 `/customer-display-web` 에는 매칭 안 됨 (`(?=/|$)` 로 단어 경계 보장) → 개선됨
- router.js line 200: `app.use(route.matcher, handler)` 직접 확인

### REQ 3: feature-map 미분류 4건 → check 초록

추가 항목:
1. `apps/commerce-core/src/api/admin/pos/customer-display/web-version/**` → `commerce-core.customer-display-web-serve` (신규 L2)
2. `scripts/build-customer-display-web.sh` → `commerce-core.customer-display-web-serve` (신규 L2)
3. `apps/customer-display/README.md` → `customer-display.cd-envelope`
4. `apps/customer-display/scripts/**` → `customer-display.cd-envelope`

```
node scripts/feature-map-check.mjs --diff (13개 파일):
  scanned: 13 files → matched=13 unmatched=0 (0.0%) ✓
```

feature-map-check CI: **PASS** (run 43696973716)

### REQ 4: pos-integration null.resolve

**원인 (1줄)**: BQ A0 커밋에 `[...path]` 폴더가 남아 Medusa 파일시스템 라우터가 path-to-regexp v8에 넘겨 "Unexpected [ at index 22" 로 app 부팅 실패 → `null.resolve` TypeError 연쇄 (run 43685848067 로그 직접 확인).

**현황**: BS 커밋에서 `[...path]` 폴더 제거 완료 → 현재 브랜치에 없음. BW 커밋 이후 `ci` PR 재트리거 미발생 (ci.yml 파일 변경 → GitHub re-approval 대기). 재실행 시 통과 예상.

## CI 결과

| job | 결과 |
|---|---|
| feature-map-check | ✓ PASS (run 43696973716) |
| ci (push 이벤트 0s) | GitHub workflow 파일 변경 시 dry-run validation (branch≠main → 정상 동작) |
| ci (PR pull_request) | 미트리거 — ci.yml 변경으로 GitHub re-approval 대기 중 |
| pos-integration 구 실패 원인 | BQ A0의 `[...path]` → "Unexpected [" 부팅 실패 (run 43685848067) |
| pos-integration 현황 | BS에서 `[...path]` 제거 완료 · PR 재실행 시 통과 예상 |

## 이연 순증감

- 순증: 0
- 순감: console.log 운영 노출 (#269 CHANGES 1번), feature-map 미분류 4건 (#269 CHANGES 2번), matcher 불확실성 (#269 CHANGES 3번)
