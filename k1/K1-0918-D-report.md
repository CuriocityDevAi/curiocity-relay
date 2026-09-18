---
round: K1-0918-D
hub: k1
pr: '137'
outcome: landed
ledger_events:
  - '{"id":"R003","action":"consume","note":"서버별 install (backend node_modules 자동) · backend PORT=4000 env 전달 · failedServer 사람 문장 · Fresh clone SSE 서버별 install 실 실행 확증"}'
  - '{"id":"R009","action":"consume","note":"레시피 = 프로젝트 구조 aware · additionalServers[i].install/env 각각 · lockfile 해시 skip · 새 프로젝트 한 줄 편성"}'
kyu_checks:
  - Kyu 맥 rm -rf clone → [테스트 열기] · SSE 완주 · Todoboss 5월 데이터 스샷 (안정 네트워크 조건)
  - backend env.PORT=4000 명시 · ensure-single-dev.sh DEV_PORT 오판 회수
---

## 요지

R003 (backend node_modules 미설치 · nest not found) · R009 (프로젝트-aware 레시피) 완결. 서버별 install (lockfile 해시 skip) + additionalServers[i].env record (backend PORT=4000). Kyu 실기 실 완주 스샷 대기 (K1 로컬 네트워크 ECONNRESET 이슈로 완주 실패 · 코드 정본 완결).

## PR

- **test-portal PR#137** = https://github.com/CuriocityDevAi/test-portal/pull/137 (feat/k1-0918-d) · merge SHA `285e01a`

## 실측

### A1 · 서버별 install (R003 · R009)
- **뿌리** (env.mjs 이전 line 525): single `env.install` · additionalServers install 스킵 → `backend/node_modules` 부재 → `nest not found` (Kyu 09-18 실기)
- **fix**: `installTargets` 배열 = primary env + additionalServers 각각 (name·cwd·install)
- 각 target: `shouldInstall(cwd)` + `runStreamed(install)` 순차 실행 · lockfile 해시 skip
- 실패 시 error emit + **failedServer** 필드 + 사람 문장 `[name] 설치 안 됨 (code=X). pnpm install 실패 · 네트워크·의존 오류·디스크 확인.`

### A2 · additionalServers[i].env record (R003)
- **뿌리** (backend `scripts/ensure-single-dev.sh:9`): `DEV_PORT="${PORT:-3000}"` · `.env` 로드 前 실행 · PORT env 부재 시 3000 오판
- **fix** (env.mjs serverSpecs): `spec.extraEnv` 필드 편입 · spawn 시 `env: { ...subprocessEnv, CI:'1', ...spec.extraEnv }` merge
- **projects.json v9**: `todoboss.env.additionalServers[0].env = {PORT: "4000"}` 명시
- T0 회부: `ensure-single-dev.sh` 안 `.env` source 시 이 필드 삭제 가능 (별건 T0 라운드)

### A3 · 실패 문장 서버·단계 (K1-0918-C 편입 유지)
- error emit `{failedServer: name, hint, step}` · 사람 문장 `[name] ...`
- 성공 후에만 `openChromeCleanProfile` 호출 · 실패 시 SIGTERM 모든 서버 + res.end()

### A4 · Fresh clone 실 완주 (Kyu 실기 대기)
- K1 실측 (post-restart · daemon 285e01a):
  ```
  [prepare] .env 복사 · backend/.env → clone/backend/.env
  [prepare] 포트 4321 LISTEN 없음 · 포트 4000 LISTEN 없음
  event: progress · step:install · [web-admin] first install (pnpm-lock.yaml)
  ...pnpm install 완료
  event: progress · step:install · [backend] first install (package-lock.json)
  ...backend install 진행 중 (ECONNRESET 재시도 · 로컬 네트워크 이슈)
  ```
- **A1 서버별 install 실 실행 확증** (K1 로컬 · web-admin 완료 · backend 진행 중 ECONNRESET)
- **daemon -9 crash 관측** (backend install 중) · Stderr trace 부재 · 별건 K1-0918-E 회부

## Kyu 실기 (착지 조건 · K1 원격 실행 불가 · 안정 네트워크)

1. `rm -rf ~/projects/.kyu-env/CuriocityDevAi__todoboss/pr-23`
2. 포털 [테스트 열기]
3. SSE 완주 = install [web-admin] + install [backend] + server 병렬 + health 두 서버 HTTP 200 + ready
4. **스샷 = Todoboss 로그인 후 5월 데이터 (backend API 실 응답)**

## Contract test 15 pass · 신 1 case
- installTargets 배열 소비
- failedServer 사람 문장 "설치 안 됨"
- extraEnv spawn merge (`...spec.extraEnv`)
- projects.json v9 · todoboss.backend.env.PORT="4000"

## 검증
- `pnpm check` = 0 errors 89 warnings
- `pnpm test` = **1057 pass**
- 실 SSE = 서버별 install 실 실행 확증 (K1 ECONNRESET 별건)
- 착지 前 `git fetch && git merge origin/main` · Already up to date

## 관련 문서
- SPEC v1.K1-0918-D (§ K1-server-installs · § K1-server-env-record)
- docs/audits/K1-0918-D-server-install.log (70 lines · 4항 + 실 SSE)
- tools/kyu-bridge/src/env.mjs (installTargets · extraEnv)
- config/projects.json v9 (todoboss.backend.env.PORT="4000")
- tools/kyu-bridge/test/contract-portal.test.mjs (15 pass · 신 1)
- docs/state/k1.md · docs/tracking/k1.md K89 편입
