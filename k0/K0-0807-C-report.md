# K0-0807-C · kyu-bridge launchd PATH 회수 (spawn process.execPath 정본)

**허브**: K0 · test-portal
**일자**: 2026-08-07
**상태**: **완료** (PR #57 · Kyu 실기 대기)

---

## [실기] · Kyu 검증 항목 (배포 완료 후 · 최우선)

**test-portal 배포 확인** (Cloudflare Workers Builds auto-deploy · 1-3 분 · CLAUDE.md § 9.5):
- SHA `2624943` main 반영 확인 후 실기 진입

### 실기 A · kyu-bridge 재설치 (구 데몬 회수 대상)

```bash
cd ~/projects/test-portal
git pull origin main   # PR #57 병합 후

node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge install
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge status
# → config OK · launchd loaded · listening ✅
```

### 실기 B · grownest 기동 상태에서 [🛑 서버 종료] 성공 확증

```bash
# grownest 기동
node ~/projects/test-portal/tools/kyu-devenv/bin/kyu-devenv start grownest
# → 양 포트 리스닝 확증 + matrix sanity OK

# 포털 상세 (예: /pr/CuriocityDevAi/grownest/N) → [🛑 서버 종료 · grownest]
# → confirm 승인 → "✓ 종료 완료 · 포트 해제 (3000, 3002)" 배지

# 실측 검증
lsof -i :3000 :3002
# → 공백 (프로세스 없음)
```

### 실기 C · 실패 시 진단 명료성 (회귀 방어)

- 만약 500 발생 시 stopMessage = **원인 상세** ("spawn node ENOENT" 등)
- 이전 = "종료 실패: bridge 500" · 진단 불가
- 지금 = "종료 실패: <상세 kind>" · 진단 가능

### 실기 D · 로그 실측

```bash
# stop 로그가 이제 실 내용 있음 (0 byte 아님)
ls -la ~/.kyu-bridge/logs/grownest-stop-*.log | tail -3
cat ~/.kyu-bridge/logs/grownest-stop-<latest>.log
# → "stop: grownest ..." 등 실 로그
```

---

## C-1 · 실측 로그 (스택 근거)

### launchd 로그 (Kyu 실측 상황 재현)

```
# ~/.kyu-bridge/logs/launchd-stdout.log
[kyu-bridge] listening on http://127.0.0.1:9876
[kyu-bridge] listening on http://127.0.0.1:9876

# ~/.kyu-bridge/logs/launchd-stderr.log
(empty)

# stop 시도 로그 = 0 byte (spawn 시작조차 안 함)
-rw-r--r-- 0 grownest-stop-2026-08-07T09-48-11-886Z.log
```

### curl 재현 (K0 직접 실기 · 500 body 확증)

```
$ curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"slug":"grownest"}' http://127.0.0.1:9876/stop
{
  "ok": false,
  "slug": "grownest",
  "exit_code": -1,
  "ports_expected_free": [3000, 3002],
  "ports_still_listening": [3000, 3002],
  "log_path": "/Users/kyu.lee/.kyu-bridge/logs/grownest-stop-2026-08-07T09-51-33-871Z.log"
}
HTTP_STATUS=500
```

### launchctl 확인 (Program = 절대경로 · PATH 아님)

```
$ launchctl list com.curiocity.kyu-bridge
"Program" = "/Users/kyu.lee/.nvm/versions/node/v20.19.6/bin/node";
```

### 재현 실험 (restricted PATH · launchd 컨텍스트 시뮬)

```
$ env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin \
    /Users/kyu.lee/.nvm/versions/node/v20.19.6/bin/node -e '
      const { spawn } = require("node:child_process");
      const c = spawn("node", ["-e", "process.exit(0)"], { stdio: "ignore" });
      c.on("error", e => console.log("spawn ERROR:", e.code, e.message));
      c.on("exit", code => console.log("exit:", code));
    '
spawn ERROR: ENOENT spawn node ENOENT

$ env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin \
    /Users/kyu.lee/.nvm/versions/node/v20.19.6/bin/node -e '
      const { spawn } = require("node:child_process");
      const c = spawn(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore" });
      c.on("error", e => console.log("spawn ERROR:", e.code, e.message));
      c.on("exit", code => console.log("exit:", code));
    '
exit: 0
```

### 뿌리 확증

- **launchd Program** = `~/.nvm/versions/node/v20.19.6/bin/node` (절대경로 · install.mjs `process.execPath` 로 씀)
- **launchd 컨텍스트 PATH** = `/usr/bin:/bin:/usr/sbin:/sbin` (nvm 경로 부재)
- **`spawn('node', ...)` = PATH lookup 실패** → ENOENT error event → child 시작 안 함 → redirect stdio 로 로그 파일 못 씀 (0 byte)
- **정정 = `spawn(process.execPath, ...)`** = 절대경로 사용 → PATH 무관 → 성공

---

## 완료 요약

### PR #57 (fix/k0-0807-c-launchd-path · `2624943`)

- 7 파일 · 246+ / 18-
- pnpm check 952 파일 0 err 0 warn
- pnpm test 409 pass (신설 4)
- pnpm build ✔

### fix 상세

**tools/kyu-bridge/src/server.mjs**:
- `handleStart` · `handleStop` = `spawn(nodeExec, ...)` · 기본 `nodeExec = process.execPath`
- `createBridgeServer` opts.nodeExec 추가 (테스트 override)
- `env: { ...process.env }` 명시 (묵시 상속 함정 회피)
- `spawnGuarded` 방어 래퍼 신설 (150ms error window · detached 자식 안전 unref)
- 500 응답 body 에 `{error, message, code, hint}` 편입 (Kyu 진단 명료)

**src/lib/kyu-bridge-client.ts**:
- `BridgeError kind` 확장 = `'not_found'` (404 · 구 데몬 endpoint 부재 회수)
- 500 body 안 `hint`/`message` 우선 매핑 (spawn_failed 원인 명시)
- 404 → `BridgeError('not_found', '구 데몬일 수 있음 (재설치)')`

**src/routes/pr/[owner]/[repo]/[id]/+page.svelte**:
- `stopDevenvServer` 오류 사람말 kind 별 안내 (network/not_found/unauthorized/기타)

### 신설 테스트 (4 케이스)

- server ENOENT 시나리오 (nodeExec 오버라이드 · 진짜 spawn 실패 재현):
  - exit_code=-1 · body.error='spawn_failed' · code='ENOENT' · hint~/launchd/
- server exit non-zero 시나리오 (script 부재 · node OK)
- client 500 body 상세 (message 우선)
- client 404 = BridgeError('not_found')

### SPEC v1.24 · CLAUDE.md § 5.16

- SPEC v1.24 trailer note = launchd PATH 회수 상세
- CLAUDE.md § 5.16 신설 = **launchd 데몬 안에서 `spawn('node', ...)` = ENOENT · 절대경로 (`process.execPath`) 필수** 재발 방지 규약

---

## 이연 순증감

**implemented (K0-0807-C)**:
- launchd PATH 부재 뿌리 회수 (spawn process.execPath + env 명시 + spawnGuarded)
- 오류 응답 상세화 (message/hint/code/kind 별 UI 사람말)
- BridgeError('not_found') 편입 (구 데몬 회수)
- CLAUDE.md § 5.16 gotcha 신설

**신설 이연 (별건)**:
- tools/kyu-bridge/README.md /stop endpoint 스펙 편입 (문서 정합 · 후속)
- kyu-bridge v0.2 (GitHub bus poll · W-오케 몸통 확장 · Kyu 사인 대기)
- Mixed content Safari/Chrome 실측 결과 SPEC 편입 (K0-0807-A 잔존)

**병합 순서**:
- PR #57 (이 라운드) = Kyu 실기 후 병합
- 이전 라운드 = 병합 완료

---

## 다음 대기 (Kyu 회신 후)

1. **실기 A-D 회수** → PR #57 검토
2. **PR #57 병합** → auto-deploy → Kyu 재설치 (`kyu-bridge install`) → 재실기 성공 확증
3. **후속**: kyu-bridge v0.2 (GitHub bus poll · W-오케 몸통) · Kyu 사인 대기

---

*K0-0807-C · 2026-08-07 · launchd PATH 회수 · Track 1 PR #57 · pr-test-checklist-guide 형식 준수*
