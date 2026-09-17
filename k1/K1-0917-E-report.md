---
round: K1-0917-E
hub: k1
pr: '123'
outcome: landed
ledger_events:
  - '{"id":"R003","action":"consume","note":"Kyu 맥 SSE 401 뿌리 완결 · dual auth (Bearer + ?token=) · GET /env/open alias · timingSafeEqual · CORS 다중 · 실 GET SSE 4단계 완주 22.0s"}'
  - '{"id":"R031","action":"consume","note":"EventSource 계약 정합 · GET alias · branch 자동 조회 · K0-F 소비 코드와 파라미터 이름 일치 (repo·pr_id·token)"}'
kyu_checks:
  - Kyu 맥 test.curiocity.company/pr/CuriocityDevAi/todoboss/23 [테스트 열기] 4단계 완주 스샷
  - 헤더 /health 초록 dot (60s poll · 마지막 응답 N초 전)
  - dual auth 실측 (헤더/쿼리 각 200/401)
---

## 요지

R003 최우선 (Kyu 맥 SSE 401 뿌리) 완결 · R031 (EventSource 계약 정합) 완결. Bearer 헤더 + ?token= 쿼리 dual auth · GET /env/open alias · CORS 다중 origin · 회귀 테스트 13 case.

## PR

- **test-portal PR#123** = https://github.com/CuriocityDevAi/test-portal/pull/123 (feat/k1-0917-e) · merge SHA `56850e9`

## 실측 (K1 워크트리 · daemon 재기동 후)

### A1 · dual auth (R003)
- **뿌리**: EventSource 스펙 = 커스텀 헤더 부착 불가 · K0-F UI = `new EventSource('?token=...')` · K1 이전 Bearer 헤더만 검증 → 브라우저 SSE 항상 401
- **fix** (`server.mjs`):
  - `bearerToken ?? queryToken` 폴백 (헤더 우선 · 쿼리 정본)
  - `safeTokenEqual` = `crypto.timingSafeEqual` 상수 시간 · 길이 다르면 즉시 false
  - 401 로그 = `maskToken` (처음 6자 + `***` + 마지막 2자)
- **CORS 다중 origin** (`resolveAllowedOrigin`):
  - 프로덕션: `https://test.curiocity.company`
  - 개발: `http://localhost:<port>` · `http://127.0.0.1:<port>` (임의 포트)
  - Origin 부재 (curl · SSR): 기본 허용
  - 그 외: HTTP 403 `{error:'origin_blocked'}`

### A2 · GET /env/open alias (R031)
- **K0-F 정본 계약**: `?repo=<owner/name>&pr_id=<n>&token=<t>`
- **매핑**: `repo` → projects.json 역방향 → `slug` · `pr_id` → `pr` · `branch` = **자동 조회** (`resolveBranchForPr` GitHub API `/pulls/{pr}/head.ref`)
- POST 계약 병행 (curl 자동화 정본)
- **부수 정합**: `url = urlObj.pathname` (query strip 후 routing) · session-log/env-status urlObj.searchParams 재사용

### A3 · daemon 재기동 + 실 SSE 완주
- launchctl kickstart -k · daemon PID 48729 · version 0.5.0
- 실 GET `/env/open?repo=CuriocityDevAi%2Ftodoboss&pr_id=23&token=<t>` = SSE 4단계 완주:
  - clone (worktree · fetch-reset done · branch 자동 조회 성공)
  - install (pnpm 16.6s · 320 packages)
  - start (pnpm dev port=4321)
  - **ready** (elapsed_ms=22044 · autologin_applied=true · autologin=url-query · jobId=env-CuriocityDevAi_todoboss-pr23-b48c86)
- audit: docs/audits/K1-0917-E-sse-todoboss-23-get.log (177 lines)

### A4 · Vitest 회귀 (13 case)
- **dual auth 7**: 헤더 정본 200 · 헤더 오답 401 · 부재 401 · 쿼리 정본 200 · 쿼리 오답 401 · 헤더+쿼리 mismatch (헤더 우선 · 쿼리 폴백 안 됨) · timingSafeEqual 길이 검사
- **CORS 6**: Origin 프로덕션 echo · localhost:5173 허용 · 127.0.0.1:9999 허용 · evil.com 403 · Origin 부재 기본 허용 · OPTIONS preflight 204
- audit: docs/audits/K1-0917-E-auth-regression.log (59 lines)

### 문서 정정
- `docs/env-recipes.md § 6.1` = POST 정본 + GET alias 스펙 + EventSource JS 예시 (repo·pr_id·token)
- `tools/kyu-bridge/README.md § HTTP API` = 인증 이중 경로 재작성 + CORS 정본 3가지 + EventSource 예시

## 검증

- `pnpm check` = 0 errors 88 warnings (CSS unused · pre-existing)
- `pnpm test` = **1031 pass** (기존 1018 + server-auth-dual 13 case)
- 실 curl 4종 = 200/200/401/SSE 4단계 완주 정합
- 착지 前 `git fetch origin && git merge origin/main` 재실행 (Kyu K0-0915-A 규정 정합) · Already up to date

## Kyu 후속 실기

1. **A2 최우선**: Kyu 맥 브라우저 `test.curiocity.company/pr/CuriocityDevAi/todoboss/23` · [테스트 열기] → SSE 4단계 실 노출 · Chrome 자동 열림 · autologin 배지 · [실기 시작] 활성
2. **헬스 dot**: 포털 헤더 · 60s poll · 초록/빨강 + 마지막 응답 N초 전
3. **dual auth 확증**: 브라우저 devtools Network 탭 = SSE 요청에 ?token= 쿼리 확인 (헤더 없음 정상)

## 관련 문서

- SPEC v1.K1-0917-E (§ K1-dual-auth · § K1-env-open-get-alias · § K1-cors-multi-origin)
- docs/audits/K1-0917-E-sse-todoboss-23-get.log (177 lines · SSE GET 완주)
- docs/audits/K1-0917-E-auth-regression.log (59 lines · 회귀 4종 + Vitest 13 case)
- docs/env-recipes.md § 6.1 · tools/kyu-bridge/README.md § HTTP API
- docs/state/k1.md · docs/tracking/k1.md K81 편입
