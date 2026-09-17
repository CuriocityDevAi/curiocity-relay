---
round: K1-0917-F
hub: k1
pr: '124'
outcome: landed
ledger_events:
  - '{"id":"R003","action":"consume","note":"[테스트 열기] 400 뿌리 완결 · repo 3형식 (short/owner-name/case-insensitive) · 사람 문장 400 · 실 SSE short name repo=todoboss 4단계 완주 elapsed=3.3s"}'
  - '{"id":"R031","action":"consume","note":"K0/K1 계약 mismatch 3회째 → src/lib/kyu-bridge-env-open.ts K0/K1 공유 모듈 + K0-F refactor + contract-portal.test.mjs 8 case CI 필수 재발 방지"}'
kyu_checks:
  - Kyu 맥 test.curiocity.company/pr/CuriocityDevAi/todoboss/23 [테스트 열기] Chrome 실 완주 스샷
  - 알 수 없는 프로젝트 400 사람 문장 UI 노출 확증
  - contract-portal.test.mjs CI 필수 편입 (K0 변경 자동 감시)
---

## 요지

R003 최우선 (Kyu 콘솔 실측 = [테스트 열기] 400 뿌리) 완결 · R031 (K0↔K1 계약 mismatch 3회째 재발 방지) 완결. 3형식 repo 수용 + 사람 문장 + 계약 테스트 CI 필수.

## PR

- **test-portal PR#124** = https://github.com/CuriocityDevAi/test-portal/pull/124 (feat/k1-0917-f) · merge SHA `926c9a9`

## 실측

### A1 · /env/open 400 뿌리 규명 + 3형식 수용 (R003)
- **뿌리** (Kyu 콘솔 실측 정합):
  - K0-F `+page.svelte:84` = `const repoParam = String(page.params.repo)` = URL 경로 `[repo]` = **"todoboss" (short name)**
  - K1-0917-E `server.mjs:418` = `projects.find((p) => p.repo === repoParam)` = `p.repo = "CuriocityDevAi/todoboss"` 만 매칭
  - → **`unknown_repo` 400** → Kyu [테스트 열기] 마일스톤 막힘
- **fix** (`findProjectByAnyName` 3형식):
  - (a) short name / slug (예: `todoboss`) → `p.slug` 매칭
  - (b) owner/name (예: `CuriocityDevAi/todoboss`) → `p.repo` 매칭 (K1-0917-E 백워드 호환)
  - (c) case-insensitive short name fallback
- **400 사람 문장** (Kyu 원문 정본):
  ```
  {"error":"unknown_repo","repo":"doesnotexist",
   "message":"알 수 없는 프로젝트: doesnotexist · 등록된 이름: grownest, storeport, todoboss, test-portal, agilo-medusa-pos-fork"}
  ```
  Kyu 원문 "포털은 본문 그대로 노출" = K0 fetch body.message UI 표시 (K0 별건 라운드).

### A2 · 계약 테스트 · R031 3회째 재발 방지
- **`src/lib/kyu-bridge-env-open.ts` 신설** (K0/K1 공유 계약 모듈):
  - `buildEnvOpenUrl({daemonBase, repo, pr, token})` = EventSource URL 생성
  - `buildHealthUrl(daemonBase, token)` = /health URL 생성
  - `ENV_OPEN_SSE_EVENTS = ['progress','log','autologin','ready','error']` = K1 발화 · K0 addEventListener 목록
  - `ENV_OPEN_PROGRESS_STAGES = ['start','clone','install','server']` = 4단계 정본
- **K0-F +page.svelte:221 refactor** = inline URL (`${DAEMON_BASE}/env/open?repo=${...}...`) → `buildEnvOpenUrl({...})` 호출
- **`tools/kyu-bridge/test/contract-portal.test.mjs`** (K1 소유 · **CI 필수**) 8 case:
  1. K0 client 실 URL (short name) = 데몬 매치
  2. owner/name 백워드 호환
  3. 알 수 없는 이름 = 400 + 사람 문장
  4. 인증 정본 = ?token= 200
  5. 인증 오답 = 401
  6. SSE 이벤트 이름 계약 (5종)
  7. progress 4단계 stages
  8. buildEnvOpenUrl 무효 = throw
- **재발 방지 뿌리 (R031 3회째)**:
  1. K1-0917-B: PRIVATE 리포 raw fetch 404
  2. K1-0917-D: js-yaml load/dump 재-포맷
  3. K1-0917-E→F: repo 파라미터 형식 (owner/name vs short)
  → contract-portal 테스트 = K0 client 편집 시 자동 fail · **4회째 재발 방지**

### A3 · daemon 재기동 + 실 SSE 4단계 완주
- launchctl kickstart -k · daemon PID 65967 · version 0.5.0
- 실 curl `?repo=todoboss&pr_id=23&token=<t>` (short name 정본) = SSE 4단계 완주:
  - clone (fetch-reset done)
  - install (pnpm cached · fast)
  - start (pnpm dev port=4321)
  - **ready** (`elapsed_ms=3336` · autologin_applied=true · autologin=url-query · jobId=env-CuriocityDevAi_todoboss-pr23-064b53)
- audit: docs/audits/K1-0917-F-sse-todoboss-short-name.log (33 lines)
- audit: docs/audits/K1-0917-F-400-fix.log (48 lines · 뿌리 규명)

## 검증

- `pnpm check` = 0 errors 88 warnings (CSS unused · pre-existing)
- `pnpm test` = **1039 pass** (contract-portal 8 + auth-dual 13 + ledger-patch 7 + base64-utf8 7 + 기존 1004)
- 실 SSE (short name) 4단계 완주 elapsed=3.3s (cached · worktree 있음)
- 착지 직전 `git fetch && git merge origin/main` 재실행 (K0-0915-A 규정) · Already up to date

## Kyu 후속 실기

1. **R003 최우선**: Kyu 맥 브라우저 `test.curiocity.company/pr/CuriocityDevAi/todoboss/23` · [테스트 열기] · 400 재발 없음 · SSE 4단계 실 노출 · Chrome 자동 열림 · autologin 배지 · **스샷** 첨부
2. 알 수 없는 프로젝트 요청 시 = 사람 문장 UI 노출 확증 (K0 body.message 표시)
3. contract-portal.test.mjs CI 필수 편성 = 다음 라운드부터 K0 변경 자동 감시

## 관련 문서

- SPEC v1.K1-0917-F (§ K1-repo-3-form · § K1-contract-portal-test)
- docs/audits/K1-0917-F-400-fix.log (48 lines · 뿌리 + 3형식 fix)
- docs/audits/K1-0917-F-sse-todoboss-short-name.log (33 lines · 실 SSE 4단계)
- src/lib/kyu-bridge-env-open.ts (K0/K1 공유 계약)
- src/routes/pr/[owner]/[repo]/[id]/+page.svelte (K0-F refactor · buildEnvOpenUrl 소비)
- tools/kyu-bridge/test/contract-portal.test.mjs (8 case · CI 필수)
- docs/state/k1.md · docs/tracking/k1.md K82 편입
