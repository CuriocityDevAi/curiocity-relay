---
round: K1-0918-C
hub: k1
pr: '136'
outcome: landed
ledger_events:
  - '{"id":"R003","action":"consume","note":"병렬 서버 (backend+web-admin) · 두 host 헬스 · lsof 정본 · 다중 .env · 실 SSE 6.6s HTTP 200 확증"}'
  - '{"id":"R031","action":"consume","note":"lsof -nP -sTCP:LISTEN 정본 · 오판 회수 · envCwds 배열"}'
kyu_checks:
  - Kyu 맥 [테스트 열기] · Todoboss 로그인 후 5월 데이터 (백엔드 4000 + web-admin 4321) 실 스샷
  - SSE 로그 [web-admin] · [backend] prefix + HTTP 200 확증
---

## 요지

R003 (테스트 열기 · 헬스 host 불일치 · 백엔드 미기동) + R031 (포트 오판) 완결. env.additionalServers[] 병렬 · 두 host 헬스 · lsof 정본 · envCwds 배열. **실 SSE = backend+web-admin 둘 다 HTTP 200 확증 · elapsed 6.6s.**

## PR

- **test-portal PR#136** = https://github.com/CuriocityDevAi/test-portal/pull/136 (feat/k1-0918-c) · merge SHA `1ec8566`

## 실측 (post-merge · daemon 재기동 후 · 1ec8566 반영)

### A1 · httpHealthCheck 두 host + 30s (R003)
- URL hostname swap (`localhost` ↔ `127.0.0.1`) · 순차 시도 · 하나만 2xx·3xx healthy
- 30s 총 · 1s 간격 · AbortSignal.timeout 2s per attempt · `redirect: 'manual'` (302 로그인 정합)

### A2 · env.additionalServers[] 병렬 spawn (R003)
- primary env + additionalServers 병렬 spawn (detached)
- SSE log prefix `[name]` (예: `[web-admin]` · `[backend]`)
- 각 서버 순차 waitForPort + httpHealthCheck 검증
- 실패 시 `{failedServer: name}` 사람 문장 error + 모든 서버 SIGTERM
- projects.json v8: todoboss.env.additionalServers = [{name:"backend", port:4000, health:"/api/health"}]

### A3 · lsof -nP -iTCP -sTCP:LISTEN 정본 (R031)
- `-n` numeric addr · `-P` numeric port · `-sTCP:LISTEN` LISTEN 상태만
- kill 후 300ms 재확인 · ports 배열 지원

### A4 · envCwds 배열 · 다중 .env 복사 (R003)
- env.envCwds = ["web-admin", "backend"] optional
- 각 cwd 원본 → clone 대응 위치 복사
- Kyu 실측 (2026-09-18): web-admin `.env` 부재 · backend `.env` 존재 (DB · PORT=4000)

## 실 SSE 실측 (post-restart · 두 서버 HTTP 200)

```
event: log · [prepare] .env 원본 부재 (skip · /Users/.../todoboss/web-admin/.env)
event: log · [prepare] .env 복사 · /Users/.../todoboss/backend/.env → /Users/.../pr-23/backend/.env
event: log · [prepare] 포트 4321 LISTEN 없음
event: log · [prepare] 포트 4000 LISTEN 없음

event: progress · step:server · [web-admin] pnpm dev (port=4321)
event: progress · step:server · [backend] pnpm dev (port=4000)

event: progress · [web-admin] 응답 확인 (http://127.0.0.1:4321/ · HTTP 200)
event: progress · [backend] 응답 확인 (http://127.0.0.1:4000/api/health · HTTP 200)

event: ready · elapsed_ms=6630 · autologin_applied=true
  base_url=http://127.0.0.1:4321 · port=4321
```

## Kyu 실기 (착지 조건 · K1 원격 화면 실행 불가)

**Kyu 맥 포털 [테스트 열기] → 새 Chrome에 Todoboss 로그인 후 5월 데이터가 뜨는 스샷 (backend 포함).**

- backend NestJS (PORT=4000) 정상 응답 시 = web-admin 안 5월 데이터 API `/api/*` 통과 → 화면 노출
- Chrome 자동 열림 · autologin url-query = `test=1&autologin=admin`

## 검증

- pnpm check 0 err · pnpm test **1056 pass**
- contract 14 pass (신 1 case = env.additionalServers · envCwds · lsof -nP · host swap · projects.json v8)
- 실 SSE = 두 서버 병렬 spawn + 각 HTTP 200 확증 + ready 6.6s
- 착지 前 `git fetch && git merge origin/main` · Already up to date

## 관련 문서

- SPEC v1.K1-0918-C (§ K1-parallel-servers · § K1-health-dual-host · § K1-lsof-listen-only · § K1-envcwds-multi)
- docs/audits/K1-0918-C-parallel-servers.log (94 lines · 4항 + 실 SSE evidence)
- tools/kyu-bridge/src/env.mjs (additionalServers · dual host · lsof -nP · envCwds)
- config/projects.json v8 (todoboss backend spec)
- tools/kyu-bridge/test/contract-portal.test.mjs (14 pass · 신 1)
- docs/state/k1.md · docs/tracking/k1.md K88 편입
