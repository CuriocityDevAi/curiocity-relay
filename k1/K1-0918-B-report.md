---
round: K1-0918-B
hub: k1
pr: '135'
outcome: landed
ledger_events:
  - '{"id":"R003","action":"consume","note":"HTTP health check 200 후 ready · 서버 미기동 오탐 회수 · fetch failed 시 사람 문장 error emit 확증"}'
  - '{"id":"R031","action":"consume","note":"헬스 dot 진단 로그 · daemon crash 무재발 · install config.json.bak 자동 백업·복원 · Kyu 매번 재설정 반복 회수"}'
kyu_checks:
  - Kyu 맥 [테스트 열기] · Todoboss 로그인 화면 (localhost:4321 HTTP 200) 실 스샷
  - 포털 헤더 헬스 초록 dot 스샷
  - install 재실행 · config.json.bak 자동 생성 확증
---

## 요지

R003 (서버 미기동 "열었어요" 오탐) + R031 (헬스 회색 · -9 · 토큰 변경) 4항 대응. HTTP health 200 후만 ready · 헬스 dot 진단 · KeepAlive 확증 · token 자동 백업.

## PR

- **test-portal PR#135** = https://github.com/CuriocityDevAi/test-portal/pull/135 (feat/k1-0918-b) · merge SHA `4e24459`

## 실측

### A1 · HTTP health 200 후 ready (R003)
- **뿌리** = env.mjs `waitForPort` = TCP 리스닝만 확증 · HTTP 응답 확증 없음 → dead page 로 ready emit → Kyu 오탐
- **fix** = `httpHealthCheck(url, timeoutMs=10s)` 신설:
  - GET env.health URL · 2xx·3xx = healthy (302 로그인 리다이렉트 정합)
  - 500ms retry · AbortSignal.timeout 2s per attempt
  - `redirect: 'manual'` (리다이렉트도 healthy)
- 실패 시 error emit **사람 문장**: `"서버가 200 응답 안 함 (URL · reason). 로그인 화면·index 도달 실패 · dev 서버 로그 확인."`
- **실 실측 확증** (post-plist 정본 복구):
  ```
  event: progress · step:health · label:"서버 응답 확인 중"
  event: error · {"step":"health","message":"서버가 200 응답 안 함 (http://127.0.0.1:4321/ · fetch failed).","hint":"http_health_failed"}
  ```
  = ready 미발생 · Kyu 오탐 원천 차단 정본.

### A2 · 헬스 dot 진단 (R031)
- K0-F +page.svelte `checkDaemonHealth` = `console.log/warn` + `daemonHealthDebugMsg` state 편입
- 힌트 사전: token 부재 · HTTP status body · mixed-content 차단 · network error
- Kyu 실기 = 브라우저 devtools 콘솔 `[daemon-health]` 라인 확증

### A3 · daemon crash 확인 (R031)
- launchd stderr = K1-0917-D 이전 pnpm ENOENT crash (**이미 fix** · serverProc.on('error') + 150ms window)
- 지금 daemon = PID alive · KeepAlive true 유지
- plist template EnvironmentVariables 부재 = install.mjs 개선 K1-0918-C 회부

### A4 · token 자동 백업 (R031)
- install.mjs `config.json.bak` 자동 생성 (existing config 로드 시 · mode 0600)
- config 부재 시 `.bak` 자동 복원 · token 유지
- 신 config 생성 시 명시 warning
- **실 확증** = install 재실행 = "existing config · token 유지 (재생성 없음)" + `~/.kyu-bridge/config.json.bak` 파일 생성 (853 bytes · 오늘 11:16)

## Kyu 후속 실기 (착지 조건)

1. **스샷 1** (헬스 초록 dot): 포털 헤더 · 60s poll · 초록 색
2. **스샷 2** (Todoboss 로그인 화면): 새 Chrome · `localhost:4321` · HTTP 200 응답
3. `install 재실행` · `ls -la ~/.kyu-bridge/config.json*` = .bak 파일 확증

## Kyu 실기 시 조건 (K1 준비 완결)

- Kyu 개발 폴더 `~/projects/todoboss/web-admin/.env` 존재 시 = defaultPrepare 자동 복사 (K1-0918-A)
- pnpm dev 실 기동 성공 시 = httpHealthCheck 200 확증 후 ready emit (K1-0918-B)
- daemon plist WorkingDirectory + EnvironmentVariables 정본 유지 (원상 복구 완료)

## 검증

- `pnpm check` = 0 errors 89 warnings
- `pnpm test` = **1055 pass**
- install 실 실행 확증 = config.json.bak 파일 생성
- httpHealthCheck 실 실행 확증 = fetch failed 시 사람 문장 error emit
- 착지 前 `git fetch && git merge origin/main` · Already up to date

## 관련 문서

- SPEC v1.K1-0918-B (§ K1-http-health-check · § K1-daemon-health-dot-debug · § K1-token-backup-restore)
- docs/audits/K1-0918-B-real-daemon.log (90 lines · 4 항 근거 + 실 SSE http_health_failed 실측)
- tools/kyu-bridge/src/env.mjs (httpHealthCheck 함수)
- tools/kyu-bridge/src/commands/install.mjs (config backup/restore)
- src/routes/pr/[owner]/[repo]/[id]/+page.svelte (checkDaemonHealth debug + daemonHealthDebugMsg)
- docs/state/k1.md · docs/tracking/k1.md K87 편입
