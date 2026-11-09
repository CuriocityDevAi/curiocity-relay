# M2-1105-V · pane 상태 판정 + /exit → shell 복귀 흐름

날짜: 2026-11-10 (KST) · 모델: opus · 러너: v6 그대로 돌림, **v6.1 신파일을 고침** (아직 미설치).
스펙: `queue/m2/M2-1105-V.md` (task 설명) · 실측 발단: R0-1105-AN · 11-10 05:16 WIB · claim started 22:16:14Z (가짜 시작 · claude 입력칸에 shell 명령이 타이핑됨).

## 1. 수정 요약 (scripts/hub-runner-v6.1.mjs · 신파일 수정 · node --check ✓)

| # | 요구 | 수정 위치 (v6.1 신판) |
|---|------|------------------|
| ① | 투입 전 shell 복귀 보장 · 실패 시 **started 안 찍고** blocked "pane busy" | `detectPaneState` (`hub-runner-v6.1.mjs:822`) · `ensurePaneShell` (`:848`) · `dispatchInPane` 가 ready.ok 아니면 `{ok:false, reason:'pane-busy'}` 리턴 (`:947-950`) · tick IIFE 가 `result.dispatchFailed` 분기로 `blocked "pane busy"` enqueue (`:1409-1419`) |
| ② | 완료 뒤 pane 에 /exit → shell 복귀 (이중 방어) | `exitPaneClaude` (`:900`) · `spawnClaudeForItem` cmux-split 분기가 waitForLanding 직후 호출 (`:1198-1200`) · timeout 분기도 `pane 유지 (C-c + /exit 전송)` 로 기록 (`:1402`) |
| ③ | started 는 claude foreground 확인 뒤에만 | `waitPaneClaudeForeground` (`:882`) · dispatchInPane 가 shellCmd 송신 후 claude 상태로 전환 확인 뒤 ok 리턴 (`:957`) · spawnClaudeForItem 가 그 뒤에 `enqueueClaim(started) + await drainClaimQueue()` (`:1173-1180`) · tick 은 사전 started 금지 (`:1359-1363` 주석) |
| ④ | 셀프테스트 추가 (busy + 기존 3건 재실행) | `--selftest-busy` 블록 (`:1673-1794`) · mock-claude.mjs 로 chrome 토큰 띄워 ensurePaneShell 의 자동 /exit 경로 실측 |
| 🐛 | **발견 보너스 버그**: v6 전체가 `send-key C-c` 를 쓰는데 cmux 는 `C-c` 를 "Unknown key" 로 reject (실측 exit 1) → 그동안 모든 C-c 가 침묵 실패. 유효 키명 = `ctrl-c` 또는 `Ctrl-c` | v6.1 전역에서 `'C-c'` → `'ctrl-c'` 14 곳 치환 (sed) · 결과: selftest-timeout 에서 `sleep 300` 이 실제로 중단됨 (실측). v6 에서 M1-1105-AC 가 60m 상한 미발동으로 보인 **보조 원인** 가능 (타임아웃은 발동해 claim blocked 는 찍히나, pane 안 claude 는 interrupt 되지 않음 → 사용자 눈엔 "여전히 살아 있음"). |

### 판정 방식 (ascii 요약)

```
readPaneScreen(cmux read-screen) → split '\n'
  ├─ 마지막 비어있지 않은 라인 매칭 /[%$#][ \t]*$/  →  shell          (hub-runner-v6.1.mjs:830-838)
  ├─ 위 매치 실패 + 마지막 ~20줄 tail 에 claude chrome 토큰
  │    /❯|⏵⏵|⏺|✻|Deliberating…|esc to interrupt|bypass permissions|shift\+tab to cycle/ → claude  (:841)
  └─ 둘 다 아님 → unknown
```

- shell 체크를 먼저 하는 이유: 과거 출력된 claude chrome 토큰이 **스크롤백에 남아 있어도** 지금 shell 이면 shell 로 판정해야 함. 실측 (selftest-busy 첫 실패): chrome 가 스크롤백에 남은 상태에서 claude 로 오판 → phase A 실패. 순서 뒤집고 통과.

### dispatch 흐름 (v6.1)

```
dispatchInPane(cmux-split):
  1) ensurePaneShell (claude면 Escape×2 + /exit\n, unknown이면 ctrl-c ×2) · polling 15s · 실패시 return {ok:false, reason:'pane-busy'}
  2) markPane running
  3) sendPaneText(shellCmd + '\n')  (clear; cd; echo; <claude-bin> '<abs-queue-path> 파일을 읽고 그대로 수행' ...)
  4) waitPaneClaudeForeground · polling 30s · 실패시 return {ok:false, reason:'claude-foreground-timeout'}
spawnClaudeForItem(cmux-split) 직후:
  5) enqueueClaim(started) + await drainClaimQueue()   ← 여기서 비로소 상태판에 started 커밋·push
  6) waitForLanding (run_timeout_min = 60분)
  7) screen-capture · exitPaneClaude (Escape×2 + /exit → polling 15s · fallback ctrl-c ×2)
```

## 2. 셀프테스트 로그 (로컬 실측 2026-11-09 밤 KST · m2 pane · surface:39)

### 2-1. `--selftest-busy --hub m2 --id M2-1105-V-busy` (신규 · 핵심)

```
$ node scripts/hub-runner-v6.1.mjs --selftest-busy --hub m2 --id M2-1105-V-busy
[selftest-busy] OK · busy claude pane → 자동 /exit → 작업 투입 → report 착지 → shell 복귀 (4 phase 전부)

$ cat m2/M2-1105-V-busy-report.md
# M2-1105-V-busy selftest-busy report

hub: m2
pane: surface:39
mock: busy pane → /exit → fresh dispatch · report 착지 뒤 shell 복귀 검증
```

4 단계:
- A) mock-claude (chrome 토큰 print + stdin `/exit` 기다림) 를 pane 에 띄움 → `detectPaneState` = claude 확인 → `ensurePaneShell` Escape+/exit → mock exit → shell 복귀.
- B) mock-work (chrome 2초 유지 + report 작성) 투입 → `waitPaneClaudeForeground` chrome 감지.
- C) `waitForLanding` → report 착지.
- D) `exitPaneClaude` → 이미 shell 이라 skip 확인 + 최종 pane 상태 = shell.

pane 최종 screen tail (실측):

```
[mock-claude] /exit 감지 · 종료
kyu.lee@Youngkyus-MacBook-Pro-M1 ~/projects/relay-m1 % node '/Users/kyu.lee/.hub-runner/mock-work-M2-1105-V-busy.mjs'
[mock-task] starting work
❯ 작업 중…
⏵⏵ bypass permissions on (shift+tab to cycle) · esc to interrupt
[mock-task] report written
kyu.lee@Youngkyus-MacBook-Pro-M1 ~/projects/relay-m1 %
```

### 2-2. `--selftest-split --hub m2 --id M2-1105-V-selftest` (기존 재실행)

```
$ node scripts/hub-runner-v6.1.mjs --selftest-split --hub m2 --id M2-1105-V-selftest
selftest-split OK · hub=m2 · id=M2-1105-V-selftest · landing=report · pane=surface:39
```

절대경로 prompt/echo 여전히 작동 (M2-1105-U 수정분 유지).

### 2-3. `--selftest-timeout --hub m2 --id M2-1105-V-timeout` (기존 재실행 · ctrl-c 수정 포함)

```
$ node scripts/hub-runner-v6.1.mjs --selftest-timeout --hub m2 --id M2-1105-V-timeout
[selftest-timeout] OK · 60s 초과 → C-c 2회 송신 · pane blocked · sleep 중단 확인
```

이번엔 **실제로 sleep 300 프로세스가 pane 에서 interrupt** 됨 (`ps -p <pid>` 로 사라짐 확인). v6.1 이전에는 cmux "Unknown key" 로 조용히 실패하던 것.

### 2-4. `--selftest-layout --hub m2 --id M2-1105-V-layout` (기존 재실행 · 자체 pane 복구 포함)

```
$ node scripts/hub-runner-v6.1.mjs --selftest-layout --hub m2 --id M2-1105-V-layout
[selftest-layout] 저장 layout 손상 (모든 surfaceRef → surface:999999) · 이전 workspaceRef=workspace:17
[selftest-layout] 재사용 대상 "Hubs" 탭 1 개: workspace:17
[selftest-layout] 복구 layout · workspaceRef=workspace:17 · reused=true
[selftest-layout] panes=m0=surface:36 · m1=surface:38 · m2=surface:39 · m3=surface:37 · r0=surface:40
[selftest-layout] OK · 재사용 workspace=workspace:17 · 신 workspace 생성 안함 · report landing 성공
[selftest-layout] 원본 layout 복원 완료 (workspaceRef=workspace:17)
```

Hubs 중복은 어느새 1개로 수렴 (가 아마 Kyu 수동 정리). 이 경로도 `ensurePaneShell` 사용으로 전환 (v6.1 이전은 cleanupPaneForNewTask C-c 침묵 실패에 의존).

## 3. 기술 선택지 · 채택 · 이유 (3 줄)

- A) `cmux read-screen` + 정규식 (텍스트 신호 매칭) — 채택.
- B) `cmux tree` 로 pane 의 `tty=ttysNN` 뽑아 `ps -o pid,comm -t ttysNN` 로 foreground 프로세스 조회 — 미채택.
- C) cmux 가 foreground 메타데이터 직접 제공 — 현 cmux help 에 해당 명령 없음 (`surface-health` 있으나 포그라운드 프로세스 노출 아님).

**이유 3줄**: ① A 는 이미 v6 에서 쓰는 read-screen 1개 API 로 끝나고 PATH/권한 추가 요구 없음. ② B 는 `security`/프로세스 조회 쪽 금지선과 애매하게 겹치고 (ps 는 안전하지만 tty 매핑이 추가 복잡도), 실제 claude REPL 은 `node`/`bun` 로 보여 `comm` 만으로는 1:1 구분 어려움. ③ claude chrome 토큰 (`❯`, `⏵⏵ bypass permissions`, `esc to interrupt`) 과 shell prompt 끝 문자 (`%`, `$`, `#`) 는 cmux read-screen 출력에서 안정적으로 보이는 시각 신호 — 실측 4건 전부 통과.

## 4. 교체 안 함 (스펙 §5)

v6.1 은 아직 미설치 — Kyu 가 직접 교체. 모든 허브 idle 확인 후 아래 1줄.

```bash
bash scripts/hub-runner-install.sh
```

(이미 커밋된 `scripts/hub-runner-install.sh` 가 TARGET=`hub-runner-v6.1.mjs`, FALLBACK=`hub-runner-v6.mjs` · node --check 선실측 포함.)

## 5. 커밋·푸시 & claim done

- 변경 파일: `scripts/hub-runner-v6.1.mjs` (수정 · `C-c`→`ctrl-c` 14곳 포함) · `m2/M2-1105-V-report.md` · 셀프테스트 산출 2건 (`m2/M2-1105-V-busy-report.md` · `m2/M2-1105-V-selftest-report.md` · `m2/M2-1105-V-layout-report.md`).
- v6.mjs · install.sh TARGET 은 M2-1105-U 커밋 그대로 (v6.1 target, v6 fallback).
- push: `git push origin HEAD:main` · 이어서 `node scripts/claim.mjs M2-1105-V done "..."`.

## 6. 참고 · 핵심 코드 발췌 (hub-runner-v6.1.mjs)

```javascript
// detect  (:822)
function detectPaneState(cmuxBin, layout, hub) {
  const screen = readPaneScreen(cmuxBin, layout, hub);
  if (screen == null) return { state: 'unknown', reason: 'read-screen null', tail: '' };
  const lines = screen.split('\n');
  const tailLines = lines.slice(-20).join('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].replace(/\s+$/, '');
    if (!t) continue;
    if (SHELL_PROMPT_LINE_RE.test(t)) return { state: 'shell', reason: `마지막 prompt 라인="${t.slice(-60)}"`, tail: tailLines };
    break;
  }
  if (CLAUDE_CHROME_RE.test(tailLines)) return { state: 'claude', reason: 'tail 영역 claude chrome 토큰 감지', tail: tailLines };
  return { state: 'unknown', reason: 'prompt/claude 둘 다 아님', tail: tailLines };
}

// ensurePaneShell · 투입 전 보장 (:848)
async function ensurePaneShell(cmuxBin, layout, hub, logFile, { timeoutMs = PANE_SHELL_WAIT_MS } = {}) {
  const init = detectPaneState(cmuxBin, layout, hub);
  if (init.state === 'shell') return { ok: true, initial: init.state };
  if (init.state === 'claude') {
    sendPaneKey(cmuxBin, layout, hub, 'Escape'); await sleepMs(200);
    sendPaneKey(cmuxBin, layout, hub, 'Escape'); await sleepMs(200);
    sendPaneText(cmuxBin, layout, hub, '/exit\n');
  } else {
    sendPaneKey(cmuxBin, layout, hub, 'ctrl-c'); await sleepMs(PANE_INTERRUPT_GRACE_MS);
    sendPaneKey(cmuxBin, layout, hub, 'ctrl-c');
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleepMs(PANE_POLL_MS);
    if (detectPaneState(cmuxBin, layout, hub).state === 'shell') return { ok: true, initial: init.state };
  }
  return { ok: false, initial: init.state, last: detectPaneState(cmuxBin, layout, hub).state };
}
```

```javascript
// dispatchInPane 핵심 (:942)
const ready = await ensurePaneShell(cmuxBin, layout, hub, logFile);
if (!ready.ok) return { ok: false, reason: 'pane-busy', initial: ready.initial, last: ready.last };
markPane(cmuxBin, layout, hub, 'running', item.id);
const sent = sendPaneText(cmuxBin, layout, hub, shellCmd + '\n');
if (!sent) return { ok: false, reason: 'cmux-send-failed' };
const claudeUp = await waitPaneClaudeForeground(cmuxBin, layout, hub, logFile);
if (!claudeUp) return { ok: false, reason: 'claude-foreground-timeout' };
return { ok: true };
```

```javascript
// spawnClaudeForItem cmux-split 성공 경로 (:1170-1203)
if (dispatch.ok) {
  enqueueClaim({ id: item.id, state: 'started', note: `runner-v6.1 · cmux-split · model=${model} · pane foreground=claude 확인 뒤 started · 로그 ${logFile}` });
  await drainClaimQueue();
  const landing = await waitForLanding({ hub: item.hub, id: item.id, timeoutMs: config.run_timeout_ms, logFile, onTimeout: () => { sendPaneKey(config.cmux_bin, layout, item.hub, 'ctrl-c'); setTimeout(() => sendPaneKey(config.cmux_bin, layout, item.hub, 'ctrl-c'), 300); } });
  ...
  const exited = await exitPaneClaude(config.cmux_bin, layout, item.hub, logFile);
  return { mode: 'cmux-split', landingReason: landing.reason, timedOut: landing.timedOut, layout, startedClaimed: true, panePostExit: exited };
}
```
