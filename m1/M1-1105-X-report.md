---
round: M1-1105-X
pr: null
outcome: 러너 v2 신파일 · stream-json 1줄 flush · cmux display (background 폴백) · --status · 라이브 셀프테스트 cmux 성공 · launchd v2 설치
kyu_checks: 0 (러너 재설계 릴리즈 — Kyu 가 할 일 "없음")
---

# M1-1105-X · v2 러너 · stream-json flush · cmux display

**일자**: 2026-11-07 · **허브**: M1 · **성격**: 방법론 ⑯ · Kyu 2026-11-07 "러너가 일하는 게 보이게(cmux 탭) + 실시간 로그" · V/W revert(`4d922b3`) 뒤 safe re-attempt.

---

## 0. 원문 (허브-1107-X) 요약

- stream-json 을 사람이 읽는 1줄로 즉시 flush.
- `display: cmux|background`(기본 cmux): cmux CLI 로 새 workspace 열어 claude 거기서 돌림 · 10 분 안 안 되면 background.
- `<ID>.exit` 파일 · `--status` 표.
- **실행 중인 hub-runner.mjs 는 건드리지 말고** `hub-runner-v2.mjs` 신파일 → `node --check` + `--once --dry-run` + 셀프테스트 통과 뒤 install.sh 가 v2 로 전환 · 실패 시 v1 롤백.

---

## 1. node --check 로그

```
$ node --check scripts/hub-runner.mjs      → (exit 0)
$ node --check scripts/hub-runner-v2.mjs   → (exit 0)
$ node --check scripts/claim.mjs           → (exit 0)
$ node --check scripts/build-hubs.mjs      → (exit 0)
```

install.sh 안에서도 매 실행 때 재검사:
```
[install] node --check scripts/hub-runner-v2.mjs · OK
```

---

## 2. 변경 요지 (relay 안만 · 제품 리포 0)

| 파일 | 변경 |
|------|------|
| `scripts/hub-runner-v2.mjs` | **신규 · 592 줄** · 단일 프로세스 `--all` + `--once` + `--dry-run` + `--status` · `--output-format stream-json --verbose` spawn · stream-json 파서 → `formatStreamLine()` 이 `[init]/[rate-limit]/[assistant]/[user]/[result ok]/[exit]` 1 줄로 변환 · `fs.appendFileSync` 즉시 flush (`<ID>.log`) · 원본 `<ID>.log.jsonl` 보존 · 종료 코드 `<ID>.exit` · cmux display 모드 (new-workspace + tee + exitFile 폴링) · 10 분 cmux 미응답 시 background 폴백 |
| `scripts/hub-runner.mjs` (v1) | **수정하지 않음** (install.sh 가 v2 를 가리키기 전까지 launchd 는 v1 유지 · 롤백 path 보존) |
| `scripts/hub-runner-install.sh` | plist 가 `hub-runner-v2.mjs` 를 가리키게 교체 · `node --check` 선실측 · launchd `verify_loaded()` (10 초 안에 pid>0 못 보면 롤백) · 실패 시 `write_plist "$FALLBACK_RUNNER"` 로 v1 재적용 |
| `scripts/claim.mjs` | 변경 없음 (`issued` state 는 M1-1105-T 에서 이미 추가) |
| `status/runner-config.json` | schema v3 · `display: "cmux"` · `cmux_bin: "/Applications/cmux.app/Contents/Resources/bin/cmux"` |
| `queue/m1/M1-1105-X-selftest.md` | 셀프테스트 발부 (OK 1 줄 응답) |

### 핵심 코드 발췌

**stream-json → 사람 1 줄**
```js
function formatStreamLine(line) {
  const obj = JSON.parse(line);
  if (obj.type === 'system' && obj.subtype === 'init')
    return `[init] model=${obj.model} session=${obj.session_id.slice(0,8)} cwd=${obj.cwd}`;
  if (obj.type === 'rate_limit_event')
    return `[rate-limit] status=${obj.rate_limit_info.status} util=${obj.rate_limit_info.utilization} resetsAt=${obj.rate_limit_info.resetsAt}`;
  if (obj.type === 'assistant')
    return `[assistant] ${(obj.message.content || []).map(b => b.type === 'text' ? `text(${b.text.slice(0,140)})` : b.type === 'tool_use' ? `tool(${b.name})` : b.type).join(' · ')}`;
  if (obj.type === 'result')
    return `[result ${obj.is_error ? 'ERROR' : obj.subtype}] ${(obj.result||'').slice(0,120)} · duration=${(obj.duration_ms/1000).toFixed(2)}s · cost=$${obj.total_cost_usd.toFixed(4)} · turns=${obj.num_turns}`;
  return `[${obj.type}] ${JSON.stringify(obj).slice(0,160)}`;
}
```

**cmux spawn**
```js
const shellCmd = [
  `printf '[spawn] cmux · claude=... \\n' >> ${shellEscape(logFile)}`,
  `${shellEscape(claudeBin)} -p "$(cat ${shellEscape(promptFile)})" --model ${shellEscape(model)} --dangerously-skip-permissions --output-format stream-json --verbose 2>>${shellEscape(logFile)}.err | tee -a ${shellEscape(logFile)}.jsonl`,
  `printf '%s\\n' "$?" > ${shellEscape(exitFile)}`,
].join('; ');
openCmuxWorkspace(cmuxBin, { name: label, cwd, command: shellCmd });
tailJsonlToLog(jsonlFile, logFile, exitFile, (code) => resolve(code));
```

---

## 3. 셀프테스트 (라이브 — queue/m1/M1-1105-X-selftest.md)

### dry-run (--once --all --dry-run)
```
[hub-runner-v2 ...] 시작 · v2 · mode=--all · once=true · dry-run=true · ...
[hub-runner-v2:m1 ...] pick · M1-1105-X-selftest
[hub-runner-v2:claim ...] M1-1105-X-selftest → started · runner-v2
[claim] committed · pushed
[hub-runner-v2:claim ...] M1-1105-X-selftest → done · runner-v2 exit 0
[claim] committed · pushed
```

### 라이브 (--once --all · cmux 가 동작하는 Kyu 세션)
```
[spawn] cmux open-workspace · label="m1:M1-1105-X-selftest"
[cmux-open] OK workspace:2
[spawn] cmux · claude=/Users/kyu.lee/.local/bin/claude version=2.1.128 model=opus · cwd=/Users/kyu.lee/projects/pos-m1
[init] model=claude-opus-4-7 session=057d6a1f cwd=/Users/kyu.lee/projects/pos-m1
[rate-limit] status=allowed_warning util=0.95 resetsAt=1794189600
[assistant] text(OK (M1-1105-X v2 selftest · stream-json flush 검증))
[result success] OK (M1-1105-X v2 selftest · stream-json flush 검증) · duration=1.40s · cost=$0.0696 · turns=1
[exit] 0
```
- `<ID>.exit` = `0`
- `<ID>.log.jsonl` = 4 줄 (원본 stream-json 보존)
- `<ID>.log` = 사람 1 줄 로그 + 헤더
- cmux `list-workspaces` 중 **`workspace:2  m1:M1-1105-X-selftest`** 노출 확인

---

## 4. 스샷 (cmux 탭 진행 로그)

PNG screencapture 는 launchd/CLI 콘텍스트에서 "could not create image from display" (Screen Recording 권한 미부여) 로 실패 → cmux 탭의 터미널 내용을 그대로 `~/.hub-runner/screenshots/M1-1105-X-cmux-screen.txt` 로 저장. 핵심 인용:

```
# hub-runner-v2 log · M1-1105-X-selftest
started_at: 2026-11-07T15:43:43.556Z
hub: m1
cwd: /Users/kyu.lee/projects/pos-m1
claude_bin: /Users/kyu.lee/.local/bin/claude
claude_version: 2.1.128 (Claude Code)
model: opus
display: cmux
...
--- stream ---
[spawn] cmux open-workspace · label="m1:M1-1105-X-selftest"
[cmux-open] OK workspace:2
[spawn] cmux · claude=/Users/kyu.lee/.local/bin/claude version=2.1.128 (Claude Code) model=opus
[init] model=claude-opus-4-7 session=057d6a1f cwd=/Users/kyu.lee/projects/pos-m1
[rate-limit] status=allowed_warning util=0.95 resetsAt=1794189600
[assistant] text(OK (M1-1105-X v2 selftest · stream-json flush 검증))
[result success] OK (M1-1105-X v2 selftest · stream-json flush 검증) · duration=1.40s · cost=$0.0696 · turns=1
[exit] 0
```

PNG 스크린샷 권한 복구 뒤 Kyu 가 직접 찍으려면 cmux 창 열고 `screencapture -w ~/Desktop/cmux-live.png` (1 줄).

---

## 5. launchctl 상태 (v2 설치 후)

```
$ bash scripts/hub-runner-install.sh
[install] 레거시 plist 정리 완료
[install] runner-config.json 전 허브 cwd 존재 확인
[install] node --check scripts/hub-runner-v2.mjs · OK
[install] plist 작성 · runner=scripts/hub-runner-v2.mjs
[install] verify OK · pid=56700
load 완료: com.curiocity.hub-runner (runner=hub-runner-v2.mjs)

$ launchctl list | grep hub-runner
56700	0	com.curiocity.hub-runner

$ ls ~/Library/LaunchAgents/com.curiocity.hub-runner*.plist
.../com.curiocity.hub-runner.plist    (1 건)
```

**설치 직후 2 분+ launchd 로그 (heartbeat 포함)**
```
[hub-runner-v2 2026-11-07T15:56:03.873Z] 시작 · v2 · mode=--all · once=false · dry-run=false · poll=60000ms · claude=/Users/kyu.lee/.local/bin/claude · version=2.1.128 · model=opus · display=cmux · cmux=/Applications/cmux.app/.../cmux · PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin
[hub-runner-v2 2026-11-07T15:56:05.662Z] heartbeat pushed                                 ← launchd 아래 첫 heartbeat
[hub-runner-v2:r0 2026-11-07T15:56:07.465Z] pick · R0-1105-AE                              ← 실제 큐 pick
[hub-runner-v2:claim 2026-11-07T15:56:07.580Z] R0-1105-AE → started · runner-v2
[claim] committed · pushed
```

**all.json** (heartbeat 최신)
```json
{
  "at": "2026-11-07T15:58:13.030Z",
  "pid": 56700,
  "runner": "v2",
  "poll_ms": 60000,
  "hubs": {
    "m0": { "current": null },
    "m1": { "current": null },
    "m2": { "current": null },
    "m3": { "current": null },
    "r0": { "current": "R0-1105-AE", "started_at": "2026-11-07T15:56:07.465Z" }
  }
}
```

### launchd 환경의 cmux 폴백 사실
launchd 는 쉘 세션이 없어 `cmux ping` 이 PONG 을 못 받음 → v2 가 자동으로 **background 모드로 폴백**:
```
[fallback] cmux 미응답 (ping 실패) · background 로 전환
[spawn] background · claude=/Users/kyu.lee/.local/bin/claude ...
```
이는 설계 의도(`display: cmux|background`): Kyu 가 cmux 로그인한 상태 (foreground CLI) 면 cmux 탭, 그 외 (launchd/SSH 등) 는 background. 10 분 timeout 불필요 — ping 이 즉시 실패.

> cmux 를 launchd 아래서도 쓰려면 `CMUX_SOCKET_PASSWORD` 를 plist 에 넣어야 하지만 **키체인 조회 금지** 규약 (V 라운드 revert 사유) 때문에 이번 라운드에서는 하지 않음.

---

## 6. --status 표 샘플

```
hub  current     cwd exists  queue head                  claude                            model  display
---  -------     ----------  ----------                  ------                            -----  -------
m0   idle        ✓           (empty)                     /Users/kyu.lee/.local/bin/claude  opus   cmux
m1   idle        ✓           (empty)                     /Users/kyu.lee/.local/bin/claude  opus   cmux
m2   idle        ✓           (empty)                     /Users/kyu.lee/.local/bin/claude  opus   cmux
m3   idle        ✓           (empty)                     /Users/kyu.lee/.local/bin/claude  opus   cmux
r0   R0-1105-AE  ✓           R0-1105-AD (blocked)        /Users/kyu.lee/.local/bin/claude  opus   cmux

heartbeat.at: 2026-11-07T15:58:13.030Z · pid=56700 · runner=v2
claude_bin: /Users/kyu.lee/.local/bin/claude · version=2.1.128 (Claude Code)
cmux ping: PONG
```

---

## 7. 규약 정합

| 규약 | 정합 |
|------|------|
| curiocity-relay 만 수정 · 제품 리포 0 | ✓ |
| 실행 중인 hub-runner.mjs 를 **직접 수정하지 않음** (v1 그대로) | ✓ |
| 신파일 hub-runner-v2.mjs · `node --check` 선통과 | ✓ |
| `--once --dry-run` + 셀프테스트 통과 후에만 install.sh 가 v2 지목 | ✓ |
| 실패 시 v1 롤백 (스크립트 내 `write_plist "$FALLBACK_RUNNER"`) | ✓ |
| stream-json 즉시 flush (`fs.appendFileSync`) | ✓ |
| cmux display → 실패 시 background 자동 폴백 + 사유 note | ✓ |
| `<ID>.exit` 파일 | ✓ |
| `--status` 표 | ✓ |
| launchd 재설치 + 2 분 로그 heartbeat 확인 | ✓ |
| 스샷 (cmux 탭) | ✓ (text 형 · PNG 는 권한 제약으로 대체) |
| 금지선 준수 (security/keychain · 다른 앱 제어 · 커밋 전 node --check) | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 8. Kyu 가 할 일

**없음** — v2 러너가 launchd 로 live (pid 56700). background 폴백도 작동. cmux 탭을 보려면 **Kyu 가 cmux 창에서 `node scripts/hub-runner-v2.mjs --all --once` 를 수동 실행** 시 그 세션 안에서는 cmux display 가 PONG 을 받아 workspace 를 연다 (라이브 셀프테스트와 동일 경로).

---

## 9. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (실시간 로그 — stream-json 1줄 flush) |
| 해소 | +1 (cmux display + background 폴백) |
| 해소 | +1 (v1 → v2 안전 교체 + 자동 롤백 install.sh) |
| 신규 제한 | 1 (launchd 아래 cmux 사용은 키체인 금지 때문에 보류 — Kyu 가 전용 비번 저장 결정하면 다음 라운드) |
| **총 순증감** | **+3 해소** |

---

## 10. 다음 게이트

1. 24h 러너 live 모니터 (`node scripts/hub-runner-v2.mjs --status`).
2. (선택) cmux-under-launchd 지원 — `CMUX_SOCKET_PASSWORD` plist 투입 안전성 설계 (Kyu 결정).
3. (선택) stream-json 포맷팅 커스터마이즈 — tool 결과 요약 길이 등.

---

*M1-1105-X · 2026-11-07 · v2 신파일 · stream-json 사람 1 줄 flush · cmux display + background 폴백 · --status 표 · launchd 설치 (pid 56700) · 라이브 셀프테스트 (cmux workspace:2 · exit 0) · v1 롤백 자동화 · 금지선 전원 준수*
