#!/usr/bin/env node
// scripts/hub-runner-v5.mjs · M1-1105-AA · 큐 자동 투입 러너 v5.
//
// v4 와의 차이 (v4 는 돌고 있으니 건드리지 않고 **새 파일**로 추가 · install.sh 가 v5 가리키게 되면 교체):
//   ① **cmux 탭 = 대화형 클로드코드**: `-p … --output-format stream-json` (JSON 원문 노출) 대신
//      **대화형** `claude "<프롬프트>" --model <m> --dangerously-skip-permissions` 를 cmux 탭에서 실행
//      → Kyu 가 평소 보는 클로드코드 화면 (생각 중 · 도구 호출 · 요약) 이 그대로 보임.
//      프롬프트는 "queue/<hub>/<ID>.md 파일을 읽고 그대로 수행" 한 줄로 전달 → 긴 인자 한도 회피.
//        · 선택지: ① -p + stream-json (v4) ② -p + stdin pipe ③ 대화형 + 짧은 지시.
//        · 채택: ③ 대화형 + "queue/<path> 읽고 수행" 한 줄.
//        · 이유: Kyu 가 "클로드코드 작업창 같은 것" 을 원함 — stream-json 1줄 압축은 사람용이지만
//          클로드코드 TUI 의 "생각 중 / 도구 호출 / 요약" 을 재현 못함. 대화형이 그 화면 자체.
//   ② **완료 판정 = 착지 폴링 (exit code 아님)**: 대화형은 스스로 종료 안 함.
//      5s 주기로 (a) `<hub>/<ID>-report.md` 존재 (b) claim.state ∈ {done, blocked, cancelled} 둘 중 감지되면
//      허브를 즉시 idle 로 복귀. **cmux 탭은 닫지 않음** — Kyu 가 끝 요약을 읽게. 탭 제목은 ✓/✗ 로 갱신.
//   ③ **같은 허브 다음 작업 시작 시 이전 탭 정리**: `~/.hub-runner/<hub>/prev-session.json` 에 workspace ref 저장.
//      다음 tick 에서 동일 허브가 새 아이템을 pick 하면 → `cmux close-workspace` 로 이전 탭 종료
//      (남은 claude 프로세스 함께 정리). 다른 허브 탭은 손대지 않음.
//   ④ **60분 상한 유지**: 타임아웃 시 `cmux send-key --workspace <ws> C-c` 로 claude 중단 → 5s grace →
//      close-workspace. claim blocked "timeout 60m".
//   ⑤ **사람 로그** `~/.hub-runner/<hub>/<ID>.log`: 대화형은 TTY 라 stream-json 요약이 없음 →
//      spawn / workspace-ref / 폴링 이벤트 / 착지 / 종료 각 1줄 + 착지 직후 `cmux read-screen` 1회 캡처
//      (탭 마지막 화면 ~50줄) 를 기록. 전체 전사는 cmux 탭 자체로 Kyu 가 봄.
//   ⑥ **background 폴백 (cmux 미응답)**: v4 방식 그대로 (`-p` stream-json → formatStreamLine → appendLine).
//      → cmux down 이어도 v4 와 동일 작동.
//
// 보안 금지선 (v2~v4 동일):
//   - `security` · 키체인 · 자격증명 금지.
//   - 접근 디렉토리: relay repo · ~/.hub-runner · runner-config 의 hub cwd 뿐.
//   - 다른 앱 제어: cmux CLI 소켓만.
//
// 안전장치:
//   - 실행 중인 v4 를 수정하지 않음. install.sh TARGET_RUNNER 가 v5 로 바뀌었을 때만 launchd 가 v5 를 띄움.
//   - `--dry-run` : spawn 대신 로그만.
//   - `node --check` 로 선실측 (install.sh).
//   - 타임아웃·크래시 포함 모든 비정상 종료는 claim blocked (덮어쓰지 않음 — 허브가 먼저 올렸으면 유지).
//   - 교체 (install.sh) 는 `--status` 에서 5허브 전부 idle 일 때만 — 돌고 있으면 중간 claude 가 SIGTERM.

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const RUNNER_HOME = join(homedir(), '.hub-runner');

const POLL_MS = 60 * 1000;
const STALE_LOCK_MS = 10 * 60 * 1000;
const DEFAULT_HEARTBEAT_MIN = 30;
const DEFAULT_RUN_TIMEOUT_MIN = 60;
const SIGKILL_GRACE_MS = 5 * 1000;
const CMUX_WAIT_MS = 10 * 60 * 1000;
const DEFAULT_CLAUDE_BIN = '/Users/kyu.lee/.local/bin/claude';

const CONFIG_FILE = join(REPO_ROOT, 'status', 'runner-config.json');
const QUEUE_DIR = join(REPO_ROOT, 'queue');
const CLAIMS_DIR = join(REPO_ROOT, 'status', 'claims');
const RUNNERS_DIR = join(REPO_ROOT, 'status', 'runners');
const ALL_HEARTBEAT = join(RUNNERS_DIR, 'all.json');
const LOCK_FILE = join(RUNNER_HOME, 'all.lock');

mkdirSync(RUNNER_HOME, { recursive: true });
mkdirSync(RUNNERS_DIR, { recursive: true });

const argv = process.argv.slice(2);
const ONCE = argv.includes('--once');
const ALL = argv.includes('--all');
const DRY_RUN = argv.includes('--dry-run');
const STATUS = argv.includes('--status');
const hubFlag = (() => {
  const i = argv.indexOf('--hub');
  return i >= 0 ? argv[i + 1] : null;
})();

if (!STATUS && !ALL && !hubFlag) {
  console.error('Usage: node scripts/hub-runner-v5.mjs --all [--once] [--dry-run] | --hub <id> | --status');
  process.exit(2);
}

function ts() {
  return new Date().toISOString();
}

function log(scope, ...xs) {
  console.error(`[hub-runner-v5${scope ? `:${scope}` : ''} ${ts()}]`, ...xs);
}

const CMUX_PASSWORD_FILE = join(RUNNER_HOME, 'cmux-password');
function readCmuxPassword() {
  try {
    if (!existsSync(CMUX_PASSWORD_FILE)) return null;
    const val = readFileSync(CMUX_PASSWORD_FILE, 'utf8').replace(/\s+$/, '');
    return val || null;
  } catch {
    return null;
  }
}

function withCmuxAuth(args) {
  const pw = readCmuxPassword();
  return pw ? ['--password', pw, ...args] : args;
}

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  })
    .toString()
    .trim();
}

const RUNNER_SCOPE_PREFIXES = ['status/claims/', 'status/runners/', 'status/hubs.json'];

function outOfScopeChanges() {
  try {
    const out = execFileSync('git', ['status', '--porcelain'], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString();
    if (!out.trim()) return [];
    return out
      .split('\n')
      .filter((l) => l.length)
      .map((l) => (l.length > 3 ? l.slice(3) : '').trim())
      .filter((p) => p && !RUNNER_SCOPE_PREFIXES.some((pre) => p.startsWith(pre)));
  } catch {
    return [];
  }
}

function safePull() {
  const foreign = outOfScopeChanges();
  if (foreign.length) {
    log('git', `스코프 밖 변경 감지 · pull 건너뜀 · files=${foreign.slice(0, 5).join(',')}${foreign.length > 5 ? '…' : ''}`);
    return false;
  }
  try {
    git(['fetch', 'origin', 'main']);
    git(['pull', '--rebase', '--autostash', 'origin', 'main']);
    return true;
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message).trim().split('\n').slice(0, 3).join(' · ');
    log('git', `pull --rebase origin main 실패: ${msg} · rebase --abort`);
    try {
      git(['rebase', '--abort']);
    } catch {
      /* noop */
    }
    return false;
  }
}

function acquireLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      const st = statSync(LOCK_FILE);
      if (Date.now() - st.mtimeMs < STALE_LOCK_MS) return false;
      log('', `stale lock 삭제 (age ${Math.round((Date.now() - st.mtimeMs) / 1000)}s)`);
      rmSync(LOCK_FILE, { force: true });
    }
    writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
    return true;
  } catch {
    return false;
  }
}

function releaseLock() {
  try {
    rmSync(LOCK_FILE, { force: true });
  } catch {
    /* noop */
  }
}

function loadConfig() {
  const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  return {
    claude_bin: process.env.CLAUDE_BIN || raw.claude_bin || DEFAULT_CLAUDE_BIN,
    model: raw.model || 'opus',
    display: raw.display || 'cmux',
    cmux_bin: raw.cmux_bin || '/Applications/cmux.app/Contents/Resources/bin/cmux',
    hubs: raw.hubs || {},
    run_timeout_ms: Math.max(1, Number(raw.run_timeout_min || DEFAULT_RUN_TIMEOUT_MIN)) * 60 * 1000,
    heartbeat_ms: Math.max(1, Number(raw.heartbeat_min || DEFAULT_HEARTBEAT_MIN)) * 60 * 1000,
  };
}

let _claudeVersionCache = null;
function getClaudeVersion(bin) {
  if (_claudeVersionCache && _claudeVersionCache.bin === bin) return _claudeVersionCache.version;
  try {
    const out = execFileSync(bin, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .trim();
    _claudeVersionCache = { bin, version: out };
    return out;
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message).trim().split('\n')[0];
    _claudeVersionCache = { bin, version: `unknown (${msg})` };
    return _claudeVersionCache.version;
  }
}

function readClaim(id) {
  const file = join(CLAIMS_DIR, `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function listQueue(hub) {
  const d = join(QUEUE_DIR, hub);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ id: f.replace(/\.md$/, ''), file: join(d, f), hub }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

function pickNext(hub) {
  for (const item of listQueue(hub)) {
    const claim = readClaim(item.id);
    if (!claim || claim.state === 'issued') return item;
  }
  return null;
}

const claimQueue = [];
let processingClaim = false;

function enqueueClaim(op) {
  claimQueue.push(op);
}

async function drainClaimQueue() {
  if (processingClaim) return;
  processingClaim = true;
  try {
    while (claimQueue.length) {
      const op = claimQueue.shift();
      await runClaim(op);
    }
  } finally {
    processingClaim = false;
  }
}

async function runClaim({ id, state, note, blockedBy }) {
  log('claim', `${id} → ${state}${note ? ` · ${note.slice(0, 80)}` : ''}`);
  const args = [join(HERE, 'claim.mjs'), id, state];
  if (blockedBy) {
    args.push('--blocked-by', blockedBy);
  }
  if (note) args.push(note);
  try {
    execFileSync(process.execPath, args, { cwd: REPO_ROOT, stdio: 'inherit' });
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message).trim().split('\n').slice(0, 3).join(' · ');
    log('claim', `claim.mjs 실패 (${id} ${state}): ${msg}`);
  }
}

// stream-json 한 줄 → 사람이 읽는 한 줄.
function formatStreamLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return `[raw] ${trimmed.slice(0, 200)}`;
  }
  const t = obj.type;
  if (t === 'system' && obj.subtype === 'init') {
    return `[init] model=${obj.model} session=${(obj.session_id || '').slice(0, 8)} cwd=${obj.cwd || ''}`;
  }
  if (t === 'rate_limit_event') {
    const r = obj.rate_limit_info || {};
    return `[rate-limit] status=${r.status} util=${r.utilization} resetsAt=${r.resetsAt}`;
  }
  if (t === 'assistant') {
    const msg = obj.message || {};
    const parts = (msg.content || [])
      .map((b) => {
        if (b.type === 'text') return `text(${(b.text || '').slice(0, 140).replace(/\s+/g, ' ')})`;
        if (b.type === 'tool_use') return `tool(${b.name})`;
        if (b.type === 'thinking') return `thinking`;
        return b.type || 'unknown';
      })
      .join(' · ');
    return `[assistant] ${parts || '(empty)'}`;
  }
  if (t === 'user') {
    const msg = obj.message || {};
    const parts = (msg.content || [])
      .map((b) => (b.type === 'tool_result' ? `tool_result(${(b.content ? String(b.content).slice(0, 80) : '')})` : b.type))
      .join(' · ');
    return `[user] ${parts || '(empty)'}`;
  }
  if (t === 'result') {
    const dur = obj.duration_ms != null ? `${(obj.duration_ms / 1000).toFixed(2)}s` : '?s';
    const cost = obj.total_cost_usd != null ? `$${obj.total_cost_usd.toFixed(4)}` : '?';
    const err = obj.is_error ? 'ERROR' : (obj.subtype || 'ok');
    const result = (obj.result || '').slice(0, 120).replace(/\s+/g, ' ');
    return `[result ${err}] ${result} · duration=${dur} · cost=${cost} · turns=${obj.num_turns || '?'}`;
  }
  return `[${t || 'unknown'}] ${JSON.stringify(obj).slice(0, 160)}`;
}

function appendLine(logFile, line) {
  appendFileSync(logFile, line + '\n');
}

// cmux 응답 ping. `~/.hub-runner/cmux-password` 있으면 --password 전달.
function cmuxAlive(cmuxBin) {
  try {
    const r = spawnSync(cmuxBin, withCmuxAuth(['ping']), { stdio: ['ignore', 'pipe', 'pipe'], timeout: 2000 });
    return r.status === 0 && r.stdout.toString().includes('PONG');
  } catch {
    return false;
  }
}

function openCmuxWorkspace(cmuxBin, { name, cwd, command }) {
  const args = withCmuxAuth(['new-workspace', '--name', name, '--cwd', cwd, '--command', command]);
  const r = spawnSync(cmuxBin, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: CMUX_WAIT_MS });
  if (r.status !== 0) {
    return { ok: false, err: (r.stderr?.toString() || r.stdout?.toString() || 'cmux new-workspace exit != 0').trim().split('\n')[0] };
  }
  return { ok: true, info: r.stdout.toString().trim() };
}

// 착지 검증 — relay 리포지토리에 `<hub>/<ID>-report.md` 파일 존재 여부.
function reportPath(hub, id) {
  return join(REPO_ROOT, hub, `${id}-report.md`);
}
function hasReport(hub, id) {
  return existsSync(reportPath(hub, id));
}

// child.pid 가 있으면 SIGTERM → grace 후 SIGKILL.
function killChildTree(child, logFile, reason) {
  if (!child || child.killed || child.exitCode != null) return;
  appendLine(logFile, `[timeout] ${reason} · SIGTERM pid=${child.pid}`);
  try {
    child.kill('SIGTERM');
  } catch (e) {
    appendLine(logFile, `[timeout] SIGTERM 실패: ${e.message}`);
  }
  setTimeout(() => {
    if (child.exitCode == null && !child.killed) {
      appendLine(logFile, `[timeout] SIGKILL pid=${child.pid} (SIGTERM grace ${SIGKILL_GRACE_MS}ms 초과)`);
      try {
        child.kill('SIGKILL');
      } catch {
        /* noop */
      }
    }
  }, SIGKILL_GRACE_MS);
}

// claude spawn (background · stream-json → appendLine · run_timeout_ms 상한).
function spawnClaudeBackground({ claudeBin, model, cwd, prompt, logFile, exitFile, timeoutMs }) {
  appendLine(logFile, `[spawn] background · claude=${claudeBin} version=${getClaudeVersion(claudeBin)} model=${model} · timeout=${Math.round(timeoutMs / 60000)}m`);
  return new Promise((resolve) => {
    let timedOut = false;
    const child = spawn(
      claudeBin,
      ['-p', prompt, '--model', model, '--dangerously-skip-permissions', '--output-format', 'stream-json', '--verbose'],
      {
        cwd,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const timer = setTimeout(() => {
      timedOut = true;
      killChildTree(child, logFile, `run_timeout ${Math.round(timeoutMs / 60000)}m 초과`);
    }, timeoutMs);

    let buf = '';
    child.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const l of lines) {
        const formatted = formatStreamLine(l);
        if (formatted) appendLine(logFile, formatted);
      }
    });
    child.stderr.on('data', (chunk) => {
      const txt = chunk.toString();
      for (const l of txt.split('\n')) {
        if (l.trim()) appendLine(logFile, `[stderr] ${l}`);
      }
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (buf.trim()) {
        const formatted = formatStreamLine(buf);
        if (formatted) appendLine(logFile, formatted);
      }
      const finalCode = timedOut ? -2 : (code != null ? code : (signal ? -1 : 0));
      appendLine(logFile, `[exit] ${finalCode}${signal ? ` · signal=${signal}` : ''}${timedOut ? ' · timeout' : ''}`);
      writeFileSync(exitFile, `${finalCode}\n`, 'utf8');
      resolve({ code: finalCode, timedOut });
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      appendLine(logFile, `[spawn-error] ${e.message}`);
      writeFileSync(exitFile, '-1\n', 'utf8');
      resolve({ code: -1, timedOut: false });
    });
  });
}

function shellEscape(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

// cmux new-workspace stdout 파싱. 실측 포맷: "OK workspace:5".
function parseWorkspaceRef(stdout) {
  const m = String(stdout || '').match(/workspace:\d+/);
  return m ? m[0] : null;
}

// cmux 가 돌리는 shell 명령 — **대화형** claude 를 띄우고, claude 종료 후에도 탭을 살려 둠 (exec bash).
// cmux 자식 PID 는 모르지만 workspace ref 로 send-key(C-c) · close-workspace 가능.
async function spawnClaudeCmuxInteractive({ cmuxBin, claudeBin, model, cwd, item, label, logFile, timeoutMs }) {
  const promptMsg = `queue/${item.hub}/${item.id}.md 파일을 읽고 그대로 수행`;
  const headerLine = `▶ ${item.id} 시작 · model=${model} · cwd=${cwd} · $(date "+%H:%M:%S")`;
  const footerLine = `▶ claude 세션 종료 · exit=$? · $(date "+%H:%M:%S") · (러너가 리포트 착지 폴링 중 · 탭 유지)`;
  const shellCmd = [
    `cd ${shellEscape(cwd)}`,
    `echo ${shellEscape(headerLine)}`,
    `echo ${shellEscape(`읽고 수행: queue/${item.hub}/${item.id}.md`)}`,
    `${shellEscape(claudeBin)} ${shellEscape(promptMsg)} --model ${shellEscape(model)} --dangerously-skip-permissions`,
    `echo ""`,
    `echo ${shellEscape(footerLine)}`,
    `exec bash -i`,
  ].join('; ');

  appendLine(logFile, `[spawn] cmux-interactive · label="${label}" · prompt="${promptMsg}" · claude=${claudeBin} · version=${getClaudeVersion(claudeBin)} · timeout=${Math.round(timeoutMs / 60000)}m`);
  const { ok, err, info } = openCmuxWorkspace(cmuxBin, { name: label, cwd, command: shellCmd });
  if (!ok) {
    appendLine(logFile, `[cmux-failed] ${err} · fallback=background`);
    return { ok: false, reason: err };
  }
  const workspaceRef = parseWorkspaceRef(info);
  appendLine(logFile, `[cmux-open] ${info}${workspaceRef ? '' : ' · (workspace ref 파싱 실패 — rename/close 불가 · timeout 시 수동 종료)'}`);
  return { ok: true, info, workspaceRef };
}

// cmux 탭 제목 갱신. ref 가 없으면 조용히 pass.
function renameCmuxWorkspace(cmuxBin, workspaceRef, newTitle) {
  if (!workspaceRef) return false;
  try {
    const r = spawnSync(cmuxBin, withCmuxAuth(['rename-workspace', '--workspace', workspaceRef, newTitle]), {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 2000,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

// cmux 탭에 Ctrl+C (SIGINT) 를 보냄 → 안에서 돌고 있는 claude 에 신호.
function sendCmuxCtrlC(cmuxBin, workspaceRef) {
  if (!workspaceRef) return false;
  try {
    const r = spawnSync(cmuxBin, withCmuxAuth(['send-key', '--workspace', workspaceRef, 'C-c']), {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 2000,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

// cmux 탭 닫기 (프로세스 트리 종료).
function closeCmuxWorkspace(cmuxBin, workspaceRef) {
  if (!workspaceRef) return false;
  try {
    const r = spawnSync(cmuxBin, withCmuxAuth(['close-workspace', '--workspace', workspaceRef]), {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 2000,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

// cmux 탭 마지막 화면 캡처 (스크롤백 포함 X · 현재 보이는 영역). 착지 직후 1회 호출용.
function readCmuxScreen(cmuxBin, workspaceRef) {
  if (!workspaceRef) return null;
  try {
    const r = spawnSync(cmuxBin, withCmuxAuth(['read-screen', '--workspace', workspaceRef]), {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 2000,
    });
    if (r.status !== 0) return null;
    return r.stdout.toString();
  } catch {
    return null;
  }
}

// 착지 폴링: 5s 주기 · (a) `<hub>/<ID>-report.md` 존재 (b) claim ∈ {done, blocked, cancelled} (c) timeout.
// 반환 { reason, timedOut }. reason ∈ {'report', 'claim-done', 'claim-blocked', 'claim-cancelled', 'timeout'}.
function waitForLanding({ hub, id, workspaceRef, cmuxBin, timeoutMs, logFile }) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const pollMs = 5000;
    let pollCount = 0;
    const interval = setInterval(() => {
      pollCount++;
      // (a) 리포트 파일
      if (hasReport(hub, id)) {
        clearInterval(interval);
        appendLine(logFile, `[landing] report file 감지 · ${hub}/${id}-report.md · poll=${pollCount}`);
        resolve({ reason: 'report', timedOut: false });
        return;
      }
      // (b) claim
      const claim = readClaim(id);
      if (claim && (claim.state === 'done' || claim.state === 'blocked' || claim.state === 'cancelled')) {
        clearInterval(interval);
        appendLine(logFile, `[landing] claim state=${claim.state} · note="${(claim.note || '').slice(0, 80)}" · poll=${pollCount}`);
        resolve({ reason: `claim-${claim.state}`, timedOut: false });
        return;
      }
      // (c) timeout
      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(interval);
        appendLine(logFile, `[timeout] cmux-interactive · ${Math.round(timeoutMs / 60000)}m 초과 · poll=${pollCount} · cmux send-key C-c + close-workspace`);
        // 탭 안 claude 중단 시도.
        if (workspaceRef) {
          const sent = sendCmuxCtrlC(cmuxBin, workspaceRef);
          appendLine(logFile, `[timeout] send-key C-c · ok=${sent}`);
        }
        setTimeout(() => {
          if (workspaceRef) {
            const closed = closeCmuxWorkspace(cmuxBin, workspaceRef);
            appendLine(logFile, `[timeout] close-workspace · ok=${closed}`);
          }
          resolve({ reason: 'timeout', timedOut: true });
        }, SIGKILL_GRACE_MS);
        return;
      }
      // safePull 은 러너 메인 루프가 함. 여기서는 claim/report 파일만 조회 (로컬 파일 시스템).
      // 단 claim 은 다른 러너/허브가 push 하면 git 반영이 늦으니, 주기적 fetch 를 러너 메인 tick 이 담당.
    }, pollMs);
  });
}

// 이전 세션 기록 파일 — 같은 허브 다음 pick 시 close-workspace 대상.
function prevSessionFile(hub) {
  return join(RUNNER_HOME, hub, 'prev-session.json');
}
function savePrevSession(hub, data) {
  const f = prevSessionFile(hub);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
function loadPrevSession(hub) {
  const f = prevSessionFile(hub);
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
}
function clearPrevSession(hub) {
  const f = prevSessionFile(hub);
  try {
    rmSync(f, { force: true });
  } catch {
    /* noop */
  }
}

// 같은 허브 pick 직전 호출. prev-session 이 있으면 cmux 탭 닫음 (남은 claude 종료 포함).
function cleanupPrevHubSession(hub, cmuxBin, logFile) {
  const prev = loadPrevSession(hub);
  if (!prev) return;
  if (prev.workspaceRef) {
    const closed = closeCmuxWorkspace(cmuxBin, prev.workspaceRef);
    appendLine(logFile, `[prev-cleanup] 이전 세션 ${prev.id} · workspace=${prev.workspaceRef} · close=${closed}`);
  } else {
    appendLine(logFile, `[prev-cleanup] 이전 세션 ${prev.id} · workspace ref 없음 · 수동 정리 필요`);
  }
  clearPrevSession(hub);
}

async function spawnClaudeForItem(item, cwd, config) {
  const logDir = join(RUNNER_HOME, item.hub);
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, `${item.id}.log`);
  const exitFile = join(logDir, `${item.id}.exit`);
  const jsonlFile = `${logFile}.jsonl`;
  const promptFile = join(logDir, `${item.id}.prompt.md`);

  // 기존 artifact 청소.
  for (const f of [logFile, exitFile, jsonlFile, `${logFile}.err`]) {
    try {
      rmSync(f, { force: true });
    } catch {
      /* noop */
    }
  }
  writeFileSync(promptFile, readFileSync(item.file, 'utf8'), 'utf8');

  const model = item.hubCfg?.model || config.model;
  const display = item.hubCfg?.display || config.display;

  const header = [
    `# hub-runner-v5 log · ${item.id}`,
    `started_at: ${ts()}`,
    `hub: ${item.hub}`,
    `cwd: ${cwd}`,
    `claude_bin: ${config.claude_bin}`,
    `claude_version: ${getClaudeVersion(config.claude_bin)}`,
    `model: ${model}`,
    `display: ${display}`,
    `run_timeout_min: ${Math.round(config.run_timeout_ms / 60000)}`,
    `heartbeat_min: ${Math.round(config.heartbeat_ms / 60000)}`,
    `process_env_path: ${process.env.PATH || '(unset)'}`,
    `exit_file: ${exitFile}`,
    `log: ${logFile}`,
    `jsonl: ${jsonlFile}`,
    `prompt: ${promptFile}`,
    '--- stream ---',
  ];
  writeFileSync(logFile, header.join('\n') + '\n', 'utf8');

  if (DRY_RUN) {
    appendLine(logFile, `[dry-run] skipping claude spawn · item=${item.id} model=${model}`);
    writeFileSync(exitFile, '0\n', 'utf8');
    return { mode: 'dry-run', code: 0, timedOut: false };
  }

  // 같은 허브의 이전 세션 정리 (cmux 탭 있으면 close — 남은 claude 프로세스 함께 종료).
  if (display === 'cmux') {
    cleanupPrevHubSession(item.hub, config.cmux_bin, logFile);
  }

  // cmux 사용 가능 체크.
  if (display === 'cmux' && cmuxAlive(config.cmux_bin)) {
    const label = `${item.hub} · ${item.id}`;
    const { ok, reason, workspaceRef } = await spawnClaudeCmuxInteractive({
      cmuxBin: config.cmux_bin,
      claudeBin: config.claude_bin,
      model,
      cwd,
      item,
      label,
      logFile,
      timeoutMs: config.run_timeout_ms,
    });
    if (ok) {
      // 다음 tick cleanup 을 위해 workspace ref 저장.
      savePrevSession(item.hub, { id: item.id, workspaceRef, startedAt: ts(), label });
      const landing = await waitForLanding({
        hub: item.hub,
        id: item.id,
        workspaceRef,
        cmuxBin: config.cmux_bin,
        timeoutMs: config.run_timeout_ms,
        logFile,
      });
      // 착지 직후 화면 캡처 (탭 끝 상태 기록).
      const screen = readCmuxScreen(config.cmux_bin, workspaceRef);
      if (screen) {
        const tail = screen.split('\n').slice(-50).join('\n');
        appendLine(logFile, `[screen-capture] (last ~50 lines of cmux tab)\n${tail}\n[/screen-capture]`);
      }
      return { mode: 'cmux', landingReason: landing.reason, timedOut: landing.timedOut, workspaceRef };
    }
    appendLine(logFile, `[fallback] cmux 실패 (${reason || 'unknown'}) · background 로 전환`);
  } else if (display === 'cmux') {
    appendLine(logFile, `[fallback] cmux 미응답 (ping 실패) · background 로 전환`);
  }

  // Background (v4 동등 — stream-json + formatStreamLine → appendLine).
  const bg = await spawnClaudeBackground({
    claudeBin: config.claude_bin,
    model,
    cwd,
    prompt: readFileSync(promptFile, 'utf8'),
    logFile,
    exitFile,
    timeoutMs: config.run_timeout_ms,
  });
  return { mode: 'bg', code: bg.code, timedOut: bg.timedOut };
}

const busy = new Map();
const hubsToRun = ALL ? ['m0', 'm1', 'm2', 'm3', 'r0'] : (hubFlag ? [hubFlag] : []);

let lastHeartbeatAt = 0;
function writeHeartbeat(config, force = false) {
  const now = Date.now();
  const heartbeatMs = config?.heartbeat_ms || DEFAULT_HEARTBEAT_MIN * 60 * 1000;
  const payload = {
    at: ts(),
    pid: process.pid,
    runner: 'v5',
    poll_ms: POLL_MS,
    heartbeat_ms: heartbeatMs,
    run_timeout_ms: config?.run_timeout_ms || DEFAULT_RUN_TIMEOUT_MIN * 60 * 1000,
    hubs: Object.fromEntries(
      hubsToRun.map((hub) => [
        hub,
        busy.has(hub)
          ? {
              current: busy.get(hub).id,
              started_at: new Date(busy.get(hub).startedAt).toISOString(),
              model: busy.get(hub).model || null,
            }
          : { current: null },
      ]),
    ),
  };
  writeFileSync(ALL_HEARTBEAT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  if (!force && now - lastHeartbeatAt < heartbeatMs) return;
  try {
    git(['add', 'status/runners/all.json']);
    git(['commit', '-m', `chore(runner-v5): heartbeat · ${hubsToRun.map((h) => `${h}=${payload.hubs[h].current || 'idle'}`).join(' · ')}`]);
    git(['push', 'origin', 'HEAD:main']);
    lastHeartbeatAt = now;
    log('', `heartbeat pushed (interval=${Math.round(heartbeatMs / 60000)}m)`);
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message).trim().split('\n')[0];
    if (!/nothing to commit/i.test(msg)) {
      log('', `heartbeat push skip: ${msg}`);
    } else {
      lastHeartbeatAt = now;
    }
  }
}

async function tick(hubs) {
  if (!acquireLock()) {
    log('', `lock 획득 실패 · 다른 러너 작동 중 (${LOCK_FILE})`);
    return;
  }
  try {
    safePull();
    const config = loadConfig();

    for (const hub of hubs) {
      if (busy.has(hub)) continue;
      const cfg = config.hubs[hub];
      if (!cfg?.cwd) {
        log(hub, `runner-config 에 cwd 없음 · skip`);
        continue;
      }
      if (!existsSync(cfg.cwd)) {
        log(hub, `cwd 부재 · ${cfg.cwd} · skip`);
        continue;
      }
      const item = pickNext(hub);
      if (!item) continue;
      item.hubCfg = cfg;
      const model = cfg.model || config.model;
      log(hub, `pick · ${item.id} · model=${model}`);
      busy.set(hub, { id: item.id, startedAt: Date.now(), model });
      enqueueClaim({ id: item.id, state: 'started', note: `runner-v5 · model=${model}` });

      (async () => {
        const result = await spawnClaudeForItem(item, cfg.cwd, config);
        busy.delete(hub);

        safePull();
        const logFile = join(RUNNER_HOME, hub, `${item.id}.log`);
        const post = readClaim(item.id);

        // 탭 제목 갱신 helper (cmux 모드만).
        const markTab = (icon) => {
          if (result.mode === 'cmux' && result.workspaceRef) {
            renameCmuxWorkspace(config.cmux_bin, result.workspaceRef, `${icon} ${hub} · ${item.id}`);
          }
        };

        if (post && (post.state === 'done' || post.state === 'blocked' || post.state === 'cancelled')) {
          log(hub, `claim 이미 ${post.state} (허브 설정) · 덮어쓰기 금지`);
          markTab(post.state === 'done' ? '✓' : '✗');
          writeHeartbeat(config);
          drainClaimQueue();
          return;
        }

        if (result.mode === 'cmux') {
          // 대화형 모드 — 착지 폴링 결과로 판정.
          if (result.timedOut) {
            enqueueClaim({
              id: item.id,
              state: 'blocked',
              note: `timeout 60m · runner-v5 cmux-interactive · 탭 close · model=${model} · 로그: ${logFile}`,
              blockedBy: 'oke',
            });
            markTab('✗');
          } else if (result.landingReason === 'report') {
            enqueueClaim({
              id: item.id,
              state: 'done',
              note: `runner-v5 cmux-interactive · 리포트 확인 ${hub}/${item.id}-report.md · model=${model} · 로그: ${logFile}`,
            });
            markTab('✓');
          } else {
            // landingReason === claim-done / claim-blocked / claim-cancelled — 위 post 분기에서 이미 처리.
            // 여기 도달했다면 pull 사이에 claim 이 사라졌거나 레이스 — blocked 로 안전 기록.
            enqueueClaim({
              id: item.id,
              state: 'blocked',
              note: `runner-v5 cmux-interactive · landing=${result.landingReason} · post claim 없음 (race?) · 로그: ${logFile}`,
              blockedBy: 'kyu',
            });
            markTab('✗');
          }
        } else {
          // Background 모드 — v4 와 동일 (exit code + 착지 검증).
          const code = result.code;
          if (result.timedOut) {
            enqueueClaim({
              id: item.id,
              state: 'blocked',
              note: `timeout 60m · runner-v5 bg exit ${code} · 로그: ${logFile}`,
              blockedBy: 'oke',
            });
          } else if (code === 0) {
            if (hasReport(hub, item.id)) {
              enqueueClaim({
                id: item.id,
                state: 'done',
                note: `runner-v5 bg exit 0 · 리포트 확인 ${hub}/${item.id}-report.md · model=${model} · 로그: ${logFile}`,
              });
            } else {
              enqueueClaim({
                id: item.id,
                state: 'blocked',
                note: `exit 0 · 리포트/claim 없음 · 미완 의심 · 리포트 기대 경로 ${hub}/${item.id}-report.md · model=${model} · 로그: ${logFile}`,
                blockedBy: 'oke',
              });
            }
          } else {
            enqueueClaim({
              id: item.id,
              state: 'blocked',
              note: `runner-v5 bg exit ${code} · model=${model} · 로그: ${logFile}`,
              blockedBy: 'kyu',
            });
          }
        }
        writeHeartbeat(config);
        drainClaimQueue();
      })();
    }

    await drainClaimQueue();
    writeHeartbeat(config);
  } finally {
    releaseLock();
  }
}

async function loop() {
  const cfg = loadConfig();
  const ver = getClaudeVersion(cfg.claude_bin);
  log(
    '',
    `시작 · v5 · mode=${ALL ? '--all' : `--hub ${hubFlag}`} · once=${ONCE} · dry-run=${DRY_RUN} · poll=${POLL_MS}ms · claude=${cfg.claude_bin} · version=${ver} · model=${cfg.model} · display=${cfg.display} · cmux=${cfg.cmux_bin} · cmux_password=${readCmuxPassword() ? 'file' : '(none)'} · heartbeat=${Math.round(cfg.heartbeat_ms / 60000)}m · run_timeout=${Math.round(cfg.run_timeout_ms / 60000)}m`,
  );
  writeHeartbeat(cfg, true);
  for (;;) {
    try {
      await tick(hubsToRun);
    } catch (e) {
      log('', `tick 예외: ${e.message}`);
    }
    if (ONCE) {
      while (busy.size > 0 || claimQueue.length > 0 || processingClaim) {
        await new Promise((r) => setTimeout(r, 1000));
      }
      writeHeartbeat(cfg, true);
      break;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

// 특정 허브의 최근 claim 1 건 (mtime 가장 새 것). 판정 열용.
function latestClaimForHub(hub) {
  if (!existsSync(CLAIMS_DIR)) return null;
  const prefix = hub.toUpperCase() + '-';
  const files = readdirSync(CLAIMS_DIR)
    .filter((f) => f.endsWith('.json') && f.toUpperCase().startsWith(prefix))
    .map((f) => ({ id: f.replace(/\.json$/, ''), file: join(CLAIMS_DIR, f) }));
  if (!files.length) return null;
  files.sort((a, b) => {
    try {
      return statSync(b.file).mtimeMs - statSync(a.file).mtimeMs;
    } catch {
      return 0;
    }
  });
  try {
    return JSON.parse(readFileSync(files[0].file, 'utf8'));
  } catch {
    return null;
  }
}

function judgeClaim(claim) {
  if (!claim) return '—';
  const state = String(claim.state || '').toLowerCase();
  if (state === 'done') return 'done';
  if (state === 'started') return 'started';
  if (state === 'blocked') {
    const note = String(claim.note || '').toLowerCase();
    if (note.includes('리포트/claim 없음') || note.includes('no-report') || note.includes('미완 의심')) return 'no-report';
    return 'blocked';
  }
  return state || '—';
}

// --status : claims + heartbeat + per-run elapsed/remaining + judge.
function printStatus() {
  const config = loadConfig();
  const heartbeat = existsSync(ALL_HEARTBEAT) ? JSON.parse(readFileSync(ALL_HEARTBEAT, 'utf8')) : null;
  const now = Date.now();
  const rows = [];
  rows.push(['hub', 'current', 'model', 'elapsed', 'remaining', 'judge', 'last claim', 'queue head', 'cwd']);
  rows.push(['---', '-------', '-----', '-------', '---------', '-----', '----------', '----------', '---']);
  for (const hub of ['m0', 'm1', 'm2', 'm3', 'r0']) {
    const cfg = config.hubs[hub] || {};
    const hbHub = heartbeat?.hubs?.[hub] || {};
    const current = hbHub.current || 'idle';
    const startedAt = hbHub.started_at ? Date.parse(hbHub.started_at) : null;
    const model = hbHub.model || cfg.model || config.model;
    let elapsed = '—';
    let remaining = '—';
    if (current !== 'idle' && startedAt) {
      const elapsedMs = now - startedAt;
      elapsed = `${Math.floor(elapsedMs / 60000)}m${Math.floor((elapsedMs % 60000) / 1000).toString().padStart(2, '0')}s`;
      const remMs = Math.max(0, config.run_timeout_ms - elapsedMs);
      remaining = `${Math.floor(remMs / 60000)}m`;
    }
    const latestClaim = latestClaimForHub(hub);
    const judge = judgeClaim(latestClaim);
    const lastClaimId = latestClaim?.id || '—';
    const q = listQueue(hub);
    let head = '(empty)';
    for (const item of q) {
      const claim = readClaim(item.id);
      if (!claim || claim.state === 'issued') {
        head = `${item.id} (${claim?.state || 'new'})`;
        break;
      }
    }
    rows.push([hub, current, model, elapsed, remaining, judge, lastClaimId, head, cfg.cwd ? (existsSync(cfg.cwd) ? '✓' : '✗') : '(none)']);
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
  for (const r of rows) {
    console.log(r.map((c, i) => String(c).padEnd(widths[i])).join('  '));
  }
  console.log();
  console.log(`heartbeat.at: ${heartbeat?.at || '(none)'} · pid=${heartbeat?.pid || '?'} · runner=${heartbeat?.runner || '?'}`);
  console.log(`claude_bin: ${config.claude_bin} · version=${getClaudeVersion(config.claude_bin)}`);
  console.log(`cmux ping: ${cmuxAlive(config.cmux_bin) ? 'PONG' : 'DOWN'} · bin=${config.cmux_bin} · password=${readCmuxPassword() ? 'file(' + CMUX_PASSWORD_FILE + ')' : '(none)'}`);
  console.log(`run_timeout: ${Math.round(config.run_timeout_ms / 60000)}m · heartbeat_interval: ${Math.round(config.heartbeat_ms / 60000)}m · display: ${config.display}`);
}

if (STATUS) {
  printStatus();
  process.exit(0);
}

loop().catch((e) => {
  log('', `loop fatal: ${e.message}`);
  process.exit(1);
});
