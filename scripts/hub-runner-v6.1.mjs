#!/usr/bin/env node
// scripts/hub-runner-v6.1.mjs · M2-1105-U · v6 패치. 신파일.
//
// v6 와의 차이 (v6 는 돌고 있으니 건드리지 않고 **새 파일** · install.sh 교체는 전 허브 idle 때만):
//   ① **프롬프트/echo 는 queue 파일 절대경로** (REPO_ROOT 기준) — cmux-tab · cmux-split 둘 다.
//      v6 의 상대경로가 허브 cwd (예: pos-m1) 에 queue/ 가 없다는 이유로 claude 가 'file not found'
//      대신 입력 대기 상태로 머물던 문제 수정 (hub-runner-v6.mjs:463,469,694,702).
//   ② **"started" claim 재시작 복구**: tick() 진입 시 허브별 최신 "started" claim 을 스캔하여,
//      busy 에 없고 (자기 재시작 or 이전 러너 유산) started.at 기준 elapsed > run_timeout_min 이면
//      pane 안에 Ctrl+C 2 회 + claim blocked ("timeout 60m · 재시작 복구") 처리. v6 는 busy 가
//      메모리 전용이라 러너 재시작 후 waitForLanding 타이머가 사라져 60m 상한이 영원히 미발동.
//   ③ **Hubs 탭 단일화 (중복 생성 금지)**: ensureHubsLayout 이 저장 layout 무효 시
//      먼저 `list-workspaces` 에서 이름 "Hubs" 탭을 찾아 재사용하고, 빠진 pane 만 그 탭 안에서
//      new-split 으로 채움. 동명 탭이 여러 개면 가장 오래된 (workspace:<작은번호>) 1개만 사용,
//      나머지는 건드리지 않음 (Kyu 가 수동 close). new-workspace 는 "Hubs" 가 하나도 없을 때만.
//      기존 pane 식별은 surface 타이틀 ("M0 · idle" 등) 로 함.
//   ④ selftest-split 는 v6 와 동일 · 추가로 `--selftest-timeout` (claude 띄우지 않고 sleep + 60s
//      초과 → pane C-c + claim blocked) 과 `--selftest-layout` (저장 layout 손상 후 Hubs 재사용
//      성공 확인) 를 노출.
//
// 보안·안전장치는 v6 와 동일.

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
const HUBS_WORKSPACE_NAME = 'Hubs';
const PANE_INTERRUPT_GRACE_MS = 400;
const SPLIT_HUBS_ORDER = ['m0', 'm1', 'm2', 'm3', 'r0'];

const CONFIG_FILE = join(REPO_ROOT, 'status', 'runner-config.json');
const QUEUE_DIR = join(REPO_ROOT, 'queue');
const CLAIMS_DIR = join(REPO_ROOT, 'status', 'claims');
const RUNNERS_DIR = join(REPO_ROOT, 'status', 'runners');
const ALL_HEARTBEAT = join(RUNNERS_DIR, 'all.json');
const LOCK_FILE = join(RUNNER_HOME, 'all.lock');
const HUBS_LAYOUT_FILE = join(RUNNER_HOME, 'hubs-layout.json');
const RECOVERY_MARK_DIR = join(RUNNER_HOME, 'recovery');

mkdirSync(RUNNER_HOME, { recursive: true });
mkdirSync(RUNNERS_DIR, { recursive: true });
mkdirSync(RECOVERY_MARK_DIR, { recursive: true });

const argv = process.argv.slice(2);
const ONCE = argv.includes('--once');
const ALL = argv.includes('--all');
const DRY_RUN = argv.includes('--dry-run');
const STATUS = argv.includes('--status');
const INIT_SPLIT = argv.includes('--init-split');
const SELFTEST_SPLIT = argv.includes('--selftest-split');
const SELFTEST_TIMEOUT = argv.includes('--selftest-timeout');
const SELFTEST_LAYOUT = argv.includes('--selftest-layout');
const hubFlag = (() => {
  const i = argv.indexOf('--hub');
  return i >= 0 ? argv[i + 1] : null;
})();

if (
  !STATUS &&
  !ALL &&
  !hubFlag &&
  !INIT_SPLIT &&
  !SELFTEST_SPLIT &&
  !SELFTEST_TIMEOUT &&
  !SELFTEST_LAYOUT
) {
  console.error(
    'Usage: node scripts/hub-runner-v6.1.mjs --all [--once] [--dry-run] | --hub <id> | --status | --init-split | --selftest-split --hub <hub> --id <ID> | --selftest-timeout --hub <hub> --id <ID> | --selftest-layout --hub <hub> --id <ID>',
  );
  process.exit(2);
}

function ts() {
  return new Date().toISOString();
}

function log(scope, ...xs) {
  console.error(`[hub-runner-v6.1${scope ? `:${scope}` : ''} ${ts()}]`, ...xs);
}

function normalizeDisplay(raw) {
  const v = String(raw || 'cmux-tab').toLowerCase();
  if (v === 'cmux' || v === 'cmux-tab' || v === 'tab') return 'cmux-tab';
  if (v === 'cmux-split' || v === 'split') return 'cmux-split';
  if (v === 'background' || v === 'bg') return 'background';
  return 'cmux-tab';
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

function cmux(cmuxBin, args, timeoutMs = 2000) {
  try {
    const r = spawnSync(cmuxBin, withCmuxAuth(args), {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
    });
    return {
      ok: r.status === 0,
      status: r.status,
      stdout: r.stdout?.toString() || '',
      stderr: r.stderr?.toString() || '',
    };
  } catch (e) {
    return { ok: false, status: -1, stdout: '', stderr: e.message };
  }
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
    display: normalizeDisplay(raw.display),
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

function cmuxAlive(cmuxBin) {
  const r = cmux(cmuxBin, ['ping'], 2000);
  return r.ok && r.stdout.includes('PONG');
}

// ---------- cmux-tab (v5 호환) 경로 ----------

function openCmuxWorkspace(cmuxBin, { name, cwd, command }) {
  const r = cmux(cmuxBin, ['new-workspace', '--name', name, '--cwd', cwd, '--command', command], CMUX_WAIT_MS);
  if (!r.ok) {
    return { ok: false, err: (r.stderr || r.stdout || 'cmux new-workspace exit != 0').trim().split('\n')[0] };
  }
  return { ok: true, info: r.stdout.trim() };
}

function parseWorkspaceRef(stdout) {
  const m = String(stdout || '').match(/workspace:\d+/);
  return m ? m[0] : null;
}

function parseSurfaceRef(stdout) {
  const m = String(stdout || '').match(/surface:\d+/);
  return m ? m[0] : null;
}

function reportPath(hub, id) {
  return join(REPO_ROOT, hub, `${id}-report.md`);
}
function hasReport(hub, id) {
  return existsSync(reportPath(hub, id));
}

function queueFileAbs(hub, id) {
  return join(REPO_ROOT, 'queue', hub, `${id}.md`);
}

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

async function spawnClaudeCmuxInteractive({ cmuxBin, claudeBin, model, cwd, item, label, logFile, timeoutMs }) {
  const qfile = queueFileAbs(item.hub, item.id);
  const promptMsg = `${qfile} 파일을 읽고 그대로 수행`;
  const headerLine = `▶ ${item.id} 시작 · model=${model} · cwd=${cwd} · $(date "+%H:%M:%S")`;
  const footerLine = `▶ claude 세션 종료 · exit=$? · $(date "+%H:%M:%S") · (러너가 리포트 착지 폴링 중 · 탭 유지)`;
  const shellCmd = [
    `cd ${shellEscape(cwd)}`,
    `echo ${shellEscape(headerLine)}`,
    `echo ${shellEscape(`읽고 수행: ${qfile}`)}`,
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

function renameCmuxWorkspace(cmuxBin, workspaceRef, newTitle) {
  if (!workspaceRef) return false;
  return cmux(cmuxBin, ['rename-workspace', '--workspace', workspaceRef, newTitle]).ok;
}

function sendCmuxCtrlC(cmuxBin, workspaceRef) {
  if (!workspaceRef) return false;
  return cmux(cmuxBin, ['send-key', '--workspace', workspaceRef, 'C-c']).ok;
}

function closeCmuxWorkspace(cmuxBin, workspaceRef) {
  if (!workspaceRef) return false;
  return cmux(cmuxBin, ['close-workspace', '--workspace', workspaceRef]).ok;
}

function readCmuxScreen(cmuxBin, workspaceRef, surfaceRef = null) {
  if (!workspaceRef && !surfaceRef) return null;
  const args = ['read-screen'];
  if (workspaceRef) args.push('--workspace', workspaceRef);
  if (surfaceRef) args.push('--surface', surfaceRef);
  const r = cmux(cmuxBin, args);
  return r.ok ? r.stdout : null;
}

// ---------- cmux-split 경로 (v6 신규 · v6.1 Hubs 재사용 패치) ----------

function loadHubsLayout() {
  if (!existsSync(HUBS_LAYOUT_FILE)) return null;
  try {
    return JSON.parse(readFileSync(HUBS_LAYOUT_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveHubsLayout(layout) {
  writeFileSync(HUBS_LAYOUT_FILE, JSON.stringify(layout, null, 2) + '\n', 'utf8');
}

function clearHubsLayout() {
  try {
    rmSync(HUBS_LAYOUT_FILE, { force: true });
  } catch {
    /* noop */
  }
}

function listWorkspaceRefs(cmuxBin) {
  const r = cmux(cmuxBin, ['list-workspaces']);
  if (!r.ok) return [];
  const refs = [];
  for (const line of r.stdout.split('\n')) {
    const m = line.match(/workspace:\d+/);
    if (m) refs.push(m[0]);
  }
  return refs;
}

// `list-workspaces` 출력 예:
//   workspace:17  Hubs
//   workspace:16  Hubs
// * workspace:1  ~/projects/curiocity-relay  [selected]
// 이름 == HUBS_WORKSPACE_NAME ("Hubs") 인 것들을 ref num 오름차순 (가장 오래된 1개 먼저) 로 반환.
function listHubsWorkspaces(cmuxBin) {
  const r = cmux(cmuxBin, ['list-workspaces']);
  if (!r.ok) return [];
  const found = [];
  for (const line of r.stdout.split('\n')) {
    const stripped = line.replace(/^[*\s]+/, '').trim();
    const m = stripped.match(/^workspace:(\d+)\s+(.+?)(?:\s+\[[^\]]+\])?$/);
    if (!m) continue;
    const num = parseInt(m[1], 10);
    const name = m[2].trim();
    if (name === HUBS_WORKSPACE_NAME) {
      found.push({ ref: `workspace:${num}`, num });
    }
  }
  found.sort((a, b) => a.num - b.num);
  return found;
}

// tree --workspace <ref> 출력 파싱 → [{ surfaceRef, title, hub? }, ...].
function inspectWorkspaceSurfaces(cmuxBin, workspaceRef) {
  const r = cmux(cmuxBin, ['tree', '--workspace', workspaceRef]);
  if (!r.ok) return [];
  const out = [];
  for (const line of r.stdout.split('\n')) {
    const sm = line.match(/surface:(\d+)[^"]*"([^"]*)"/);
    if (!sm) continue;
    const surfaceRef = `surface:${sm[1]}`;
    const title = sm[2].trim();
    const hm = title.match(/^(M0|M1|M2|M3|R0)\b/i);
    const hub = hm ? hm[1].toLowerCase() : null;
    out.push({ surfaceRef, title, hub });
  }
  return out;
}

function listWorkspaceSurfaces(cmuxBin, workspaceRef) {
  return inspectWorkspaceSurfaces(cmuxBin, workspaceRef).map((s) => s.surfaceRef);
}

function hubsWorkspaceStillValid(cmuxBin, layout) {
  if (!layout || !layout.workspaceRef) return false;
  if (!listWorkspaceRefs(cmuxBin).includes(layout.workspaceRef)) return false;
  const surfaces = new Set(listWorkspaceSurfaces(cmuxBin, layout.workspaceRef));
  for (const hub of SPLIT_HUBS_ORDER) {
    const pane = layout.panes?.[hub];
    if (!pane?.surfaceRef) return false;
    if (!surfaces.has(pane.surfaceRef)) return false;
  }
  return true;
}

function splitAndGetSurface(cmuxBin, workspaceRef, direction, fromSurface, logFile) {
  const r = cmux(cmuxBin, ['new-split', direction, '--workspace', workspaceRef, '--surface', fromSurface]);
  if (!r.ok) {
    appendLine(logFile, `[hubs-split] new-split ${direction} from ${fromSurface} 실패: ${(r.stderr || r.stdout).trim().split('\n')[0]}`);
    return null;
  }
  const sref = parseSurfaceRef(r.stdout);
  appendLine(logFile, `[hubs-split] split ${direction} from ${fromSurface} → ${sref || '?'}`);
  return sref;
}

function buildHubsWorkspace(cmuxBin, logFile) {
  appendLine(logFile, `[hubs-split] new-workspace "${HUBS_WORKSPACE_NAME}" 생성`);
  const created = cmux(cmuxBin, ['new-workspace', '--name', HUBS_WORKSPACE_NAME, '--cwd', REPO_ROOT], CMUX_WAIT_MS);
  if (!created.ok) {
    appendLine(logFile, `[hubs-split] new-workspace 실패: ${(created.stderr || created.stdout).trim().split('\n')[0]}`);
    return null;
  }
  const workspaceRef = parseWorkspaceRef(created.stdout);
  if (!workspaceRef) {
    appendLine(logFile, `[hubs-split] workspace ref 파싱 실패 · stdout=${created.stdout.trim()}`);
    return null;
  }
  let paneSurfaces = [];
  for (let i = 0; i < 10; i++) {
    paneSurfaces = listWorkspaceSurfaces(cmuxBin, workspaceRef);
    if (paneSurfaces.length > 0) break;
    const end = Date.now() + 300;
    while (Date.now() < end) { /* busy wait */ }
  }
  if (paneSurfaces.length === 0) {
    appendLine(logFile, `[hubs-split] 초기 surface 없음 · ${workspaceRef} · 재시도 10회 후 포기`);
    return null;
  }
  const sM0 = paneSurfaces[0];
  const sM3 = splitAndGetSurface(cmuxBin, workspaceRef, 'down', sM0, logFile);
  if (!sM3) return null;
  const sM1 = splitAndGetSurface(cmuxBin, workspaceRef, 'right', sM0, logFile);
  if (!sM1) return null;
  const sM2 = splitAndGetSurface(cmuxBin, workspaceRef, 'right', sM1, logFile);
  if (!sM2) return null;
  const sR0 = splitAndGetSurface(cmuxBin, workspaceRef, 'right', sM3, logFile);
  if (!sR0) return null;

  const layout = {
    workspaceRef,
    created_at: ts(),
    panes: {
      m0: { surfaceRef: sM0 },
      m1: { surfaceRef: sM1 },
      m2: { surfaceRef: sM2 },
      m3: { surfaceRef: sM3 },
      r0: { surfaceRef: sR0 },
    },
  };
  for (const hub of SPLIT_HUBS_ORDER) {
    cmux(cmuxBin, ['rename-tab', '--workspace', workspaceRef, '--surface', layout.panes[hub].surfaceRef, '--', paneTitle(hub, 'idle')]);
  }
  appendLine(logFile, `[hubs-split] 신규 완료 · ${workspaceRef} · panes=${SPLIT_HUBS_ORDER.map((h) => `${h}=${layout.panes[h].surfaceRef}`).join(',')}`);
  return layout;
}

// v6.1 패치: 저장 layout 무효 → list-workspaces 에서 "Hubs" 재사용 (가장 오래된 1개).
// 빠진 hub pane 은 그 workspace 안에서 new-split 으로 채움. new-workspace 는 Hubs 가 하나도 없을 때만.
function ensureHubsLayout(cmuxBin, logFile) {
  const saved = loadHubsLayout();
  if (hubsWorkspaceStillValid(cmuxBin, saved)) {
    return saved;
  }
  if (saved) {
    appendLine(logFile, `[hubs-split] 저장 layout 무효 (workspace ${saved.workspaceRef} / pane 사라짐) · "Hubs" 재사용 시도`);
  }

  const hubsList = listHubsWorkspaces(cmuxBin);
  if (hubsList.length === 0) {
    appendLine(logFile, `[hubs-split] "Hubs" 탭 전무 · new-workspace 경로`);
    clearHubsLayout();
    const layout = buildHubsWorkspace(cmuxBin, logFile);
    if (layout) saveHubsLayout(layout);
    return layout;
  }

  const chosen = hubsList[0];
  if (hubsList.length > 1) {
    const leftovers = hubsList.slice(1).map((w) => w.ref).join(',');
    appendLine(logFile, `[hubs-split] "Hubs" 탭 ${hubsList.length} 개 감지 · 가장 오래된 ${chosen.ref} 재사용 · 나머지 (${leftovers}) 건드리지 않음 (Kyu 수동 정리)`);
  } else {
    appendLine(logFile, `[hubs-split] "Hubs" 탭 1개 감지 · ${chosen.ref} 재사용`);
  }

  const surfaces = inspectWorkspaceSurfaces(cmuxBin, chosen.ref);
  const panes = {};
  const usedSurfaceRefs = new Set();
  // 1) 타이틀로 hub 식별된 surface 를 그대로 매핑.
  for (const s of surfaces) {
    if (s.hub && SPLIT_HUBS_ORDER.includes(s.hub) && !panes[s.hub]) {
      panes[s.hub] = { surfaceRef: s.surfaceRef };
      usedSurfaceRefs.add(s.surfaceRef);
      appendLine(logFile, `[hubs-split] 재사용 hub=${s.hub} · surface=${s.surfaceRef} · 타이틀="${s.title}"`);
    }
  }
  // 2) 이름 못 알아본 기존 surface 가 있으면 빠진 hub 순서대로 재지정 (타이틀 재설정).
  const nonHubSurfaces = surfaces.filter((s) => !usedSurfaceRefs.has(s.surfaceRef));
  const missing = () => SPLIT_HUBS_ORDER.filter((h) => !panes[h]);
  for (const s of nonHubSurfaces) {
    const m = missing();
    if (m.length === 0) break;
    const hub = m[0];
    panes[hub] = { surfaceRef: s.surfaceRef };
    usedSurfaceRefs.add(s.surfaceRef);
    cmux(cmuxBin, ['rename-tab', '--workspace', chosen.ref, '--surface', s.surfaceRef, '--', paneTitle(hub, 'idle')]);
    appendLine(logFile, `[hubs-split] 흡수 hub=${hub} · 기존 surface=${s.surfaceRef} · (기존 타이틀="${s.title}" → idle)`);
  }
  // 3) 그래도 빠진 hub 는 new-split 으로 채움. seed 는 이미 배정된 pane 중 하나.
  const stillMissing = missing();
  if (stillMissing.length > 0) {
    let seedSurface = Object.values(panes)[0]?.surfaceRef || null;
    // 기존 surface 가 하나도 없는 extreme case: new-pane 으로 seed 만들기 (아니면 fallback).
    if (!seedSurface) {
      const np = cmux(cmuxBin, ['new-pane', '--workspace', chosen.ref, '--type', 'terminal']);
      seedSurface = parseSurfaceRef(np.stdout);
      appendLine(logFile, `[hubs-split] seed pane 없음 · new-pane → ${seedSurface || '실패'}`);
    }
    if (!seedSurface) {
      appendLine(logFile, `[hubs-split] seed 없음 · 재사용 포기 · new-workspace 로 폴백`);
      clearHubsLayout();
      const layout = buildHubsWorkspace(cmuxBin, logFile);
      if (layout) saveHubsLayout(layout);
      return layout;
    }
    for (const hub of stillMissing) {
      const sref = splitAndGetSurface(cmuxBin, chosen.ref, 'right', seedSurface, logFile);
      if (!sref) {
        appendLine(logFile, `[hubs-split] split 실패 hub=${hub} · 재사용 포기 · new-workspace 로 폴백`);
        clearHubsLayout();
        const layout = buildHubsWorkspace(cmuxBin, logFile);
        if (layout) saveHubsLayout(layout);
        return layout;
      }
      panes[hub] = { surfaceRef: sref };
      cmux(cmuxBin, ['rename-tab', '--workspace', chosen.ref, '--surface', sref, '--', paneTitle(hub, 'idle')]);
      appendLine(logFile, `[hubs-split] hub=${hub} · 신규 split → ${sref}`);
    }
  }

  const layout = {
    workspaceRef: chosen.ref,
    created_at: ts(),
    reused: true,
    panes,
  };
  saveHubsLayout(layout);
  appendLine(logFile, `[hubs-split] 재사용 layout 저장 · ${chosen.ref} · panes=${SPLIT_HUBS_ORDER.map((h) => `${h}=${panes[h]?.surfaceRef || '?'}`).join(',')}`);
  return layout;
}

function paneTitle(hub, state, id = null) {
  const H = hub.toUpperCase();
  if (state === 'idle') return `${H} · idle`;
  if (state === 'running') return `${H} · ⠐ ${id}`;
  if (state === 'done') return `${H} · ✓ ${id}`;
  if (state === 'blocked') return `${H} · ✗ ${id}`;
  return `${H} · ${state}`;
}

function markPane(cmuxBin, layout, hub, state, id = null) {
  const sref = layout?.panes?.[hub]?.surfaceRef;
  if (!layout?.workspaceRef || !sref) return false;
  return cmux(cmuxBin, ['rename-tab', '--workspace', layout.workspaceRef, '--surface', sref, '--', paneTitle(hub, state, id)]).ok;
}

function sendPaneKey(cmuxBin, layout, hub, key) {
  const sref = layout?.panes?.[hub]?.surfaceRef;
  if (!layout?.workspaceRef || !sref) return false;
  return cmux(cmuxBin, ['send-key', '--workspace', layout.workspaceRef, '--surface', sref, key]).ok;
}

function sendPaneText(cmuxBin, layout, hub, text) {
  const sref = layout?.panes?.[hub]?.surfaceRef;
  if (!layout?.workspaceRef || !sref) return false;
  return cmux(cmuxBin, ['send', '--workspace', layout.workspaceRef, '--surface', sref, text]).ok;
}

function readPaneScreen(cmuxBin, layout, hub) {
  const sref = layout?.panes?.[hub]?.surfaceRef;
  if (!layout?.workspaceRef || !sref) return null;
  return readCmuxScreen(cmuxBin, layout.workspaceRef, sref);
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cleanupPaneForNewTask(cmuxBin, layout, hub, logFile) {
  const ok1 = sendPaneKey(cmuxBin, layout, hub, 'C-c');
  await sleepMs(PANE_INTERRUPT_GRACE_MS);
  const ok2 = sendPaneKey(cmuxBin, layout, hub, 'C-c');
  await sleepMs(PANE_INTERRUPT_GRACE_MS);
  appendLine(logFile, `[pane-cleanup] hub=${hub} · C-c ×2 · ok=${ok1 && ok2}`);
}

async function dispatchInPane({ cmuxBin, layout, hub, item, cwd, claudeBin, model, logFile }) {
  const qfile = queueFileAbs(item.hub, item.id);
  const promptMsg = `${qfile} 파일을 읽고 그대로 수행`;
  const nowHMS = new Date().toTimeString().slice(0, 8);
  const headerLine = `▶ ${item.id} 시작 · model=${model} · cwd=${cwd} · ${nowHMS}`;
  const shellCmd = [
    `clear`,
    `cd ${shellEscape(cwd)}`,
    `echo ${shellEscape(headerLine)}`,
    `echo ${shellEscape(`읽고 수행: ${qfile}`)}`,
    `${shellEscape(claudeBin)} ${shellEscape(promptMsg)} --model ${shellEscape(model)} --dangerously-skip-permissions`,
    `_rc=$?`,
    `echo ""`,
    `echo "▶ claude 세션 종료 · exit=$_rc · $(date '+%H:%M:%S') · (러너가 리포트 착지 폴링 중 · pane 유지)"`,
  ].join('; ');

  appendLine(logFile, `[spawn] cmux-split · hub=${hub} · surface=${layout.panes[hub].surfaceRef} · prompt="${promptMsg}" · claude=${claudeBin} · version=${getClaudeVersion(claudeBin)}`);
  await cleanupPaneForNewTask(cmuxBin, layout, hub, logFile);
  markPane(cmuxBin, layout, hub, 'running', item.id);
  const sent = sendPaneText(cmuxBin, layout, hub, shellCmd + '\n');
  appendLine(logFile, `[cmux-send] hub=${hub} · send=${sent}`);
  return { ok: sent };
}

// ---------- 착지 폴링 ----------

function waitForLanding({ hub, id, timeoutMs, logFile, onTimeout }) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const pollMs = 5000;
    let pollCount = 0;
    const interval = setInterval(() => {
      pollCount++;
      if (hasReport(hub, id)) {
        clearInterval(interval);
        appendLine(logFile, `[landing] report file 감지 · ${hub}/${id}-report.md · poll=${pollCount}`);
        resolve({ reason: 'report', timedOut: false });
        return;
      }
      const claim = readClaim(id);
      if (claim && (claim.state === 'done' || claim.state === 'blocked' || claim.state === 'cancelled')) {
        clearInterval(interval);
        appendLine(logFile, `[landing] claim state=${claim.state} · note="${(claim.note || '').slice(0, 80)}" · poll=${pollCount}`);
        resolve({ reason: `claim-${claim.state}`, timedOut: false });
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(interval);
        appendLine(logFile, `[timeout] ${Math.round(timeoutMs / 60000)}m 초과 · poll=${pollCount}`);
        try {
          onTimeout?.();
        } catch (e) {
          appendLine(logFile, `[timeout] onTimeout 실패: ${e.message}`);
        }
        setTimeout(() => resolve({ reason: 'timeout', timedOut: true }), SIGKILL_GRACE_MS);
        return;
      }
    }, pollMs);
  });
}

// ---------- prev-session (cmux-tab 전용) ----------

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
  try {
    rmSync(prevSessionFile(hub), { force: true });
  } catch {
    /* noop */
  }
}

function cleanupPrevHubTab(hub, cmuxBin, logFile) {
  const prev = loadPrevSession(hub);
  if (!prev) return;
  if (prev.workspaceRef) {
    const closed = closeCmuxWorkspace(cmuxBin, prev.workspaceRef);
    appendLine(logFile, `[prev-cleanup] 이전 세션 ${prev.id} · workspace=${prev.workspaceRef} · close=${closed}`);
  } else {
    appendLine(logFile, `[prev-cleanup] 이전 세션 ${prev.id} · workspace ref 없음`);
  }
  clearPrevSession(hub);
}

// ---------- started-claim 복구 (v6.1 신규) ----------

function recoveryMarkFile(id) {
  return join(RECOVERY_MARK_DIR, `${id}.done`);
}
function recoveryMarked(id) {
  return existsSync(recoveryMarkFile(id));
}
function markRecovered(id) {
  try {
    writeFileSync(recoveryMarkFile(id), ts() + '\n', 'utf8');
  } catch { /* noop */ }
}

function findStartedClaim(hub) {
  if (!existsSync(CLAIMS_DIR)) return null;
  const prefix = hub.toUpperCase() + '-';
  const files = readdirSync(CLAIMS_DIR).filter((f) => f.endsWith('.json') && f.toUpperCase().startsWith(prefix));
  let latest = null;
  let latestMs = 0;
  for (const f of files) {
    try {
      const claim = JSON.parse(readFileSync(join(CLAIMS_DIR, f), 'utf8'));
      if (claim.state !== 'started') continue;
      const atMs = Date.parse(claim.at);
      if (atMs > latestMs) {
        latestMs = atMs;
        latest = claim;
      }
    } catch { /* noop */ }
  }
  return latest;
}

async function recoverStuckStartedClaims(hubs, config) {
  for (const hub of hubs) {
    if (busy.has(hub)) continue;
    const stuck = findStartedClaim(hub);
    if (!stuck) continue;
    if (recoveryMarked(stuck.id)) continue;
    const atMs = Date.parse(stuck.at);
    if (!Number.isFinite(atMs)) continue;
    const elapsedMs = Date.now() - atMs;
    if (elapsedMs < config.run_timeout_ms) continue;
    log(hub, `복구 · ${stuck.id} started ${Math.round(elapsedMs / 60000)}m 경과 (>${Math.round(config.run_timeout_ms / 60000)}m) · blocked 처리`);
    if (config.display === 'cmux-split' && cmuxAlive(config.cmux_bin)) {
      const layout = loadHubsLayout();
      if (layout) {
        sendPaneKey(config.cmux_bin, layout, hub, 'C-c');
        await sleepMs(300);
        sendPaneKey(config.cmux_bin, layout, hub, 'C-c');
        markPane(config.cmux_bin, layout, hub, 'blocked', stuck.id);
      }
    }
    enqueueClaim({
      id: stuck.id,
      state: 'blocked',
      note: `timeout ${Math.round(config.run_timeout_ms / 60000)}m · 러너 재시작 복구 · elapsed=${Math.round(elapsedMs / 60000)}m · runner-v6.1 · pane 유지 (C-c 전송)`,
      blockedBy: 'oke',
    });
    markRecovered(stuck.id);
  }
}

// ---------- 메인 디스패치 ----------

async function spawnClaudeForItem(item, cwd, config) {
  const logDir = join(RUNNER_HOME, item.hub);
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, `${item.id}.log`);
  const exitFile = join(logDir, `${item.id}.exit`);
  const jsonlFile = `${logFile}.jsonl`;
  const promptFile = join(logDir, `${item.id}.prompt.md`);

  for (const f of [logFile, exitFile, jsonlFile, `${logFile}.err`]) {
    try {
      rmSync(f, { force: true });
    } catch {
      /* noop */
    }
  }
  writeFileSync(promptFile, readFileSync(item.file, 'utf8'), 'utf8');

  const model = item.hubCfg?.model || config.model;
  const displayRaw = item.hubCfg?.display || config.display;
  const display = normalizeDisplay(displayRaw);

  const header = [
    `# hub-runner-v6.1 log · ${item.id}`,
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
    `queue_file_abs: ${queueFileAbs(item.hub, item.id)}`,
    '--- stream ---',
  ];
  writeFileSync(logFile, header.join('\n') + '\n', 'utf8');

  if (DRY_RUN) {
    appendLine(logFile, `[dry-run] skipping claude spawn · item=${item.id} model=${model} display=${display}`);
    writeFileSync(exitFile, '0\n', 'utf8');
    return { mode: 'dry-run', code: 0, timedOut: false };
  }

  if (display === 'cmux-split' && cmuxAlive(config.cmux_bin)) {
    const layout = ensureHubsLayout(config.cmux_bin, logFile);
    if (!layout) {
      appendLine(logFile, `[fallback] cmux-split 레이아웃 생성 실패 · background 로 전환`);
    } else {
      const { ok } = await dispatchInPane({
        cmuxBin: config.cmux_bin,
        layout,
        hub: item.hub,
        item,
        cwd,
        claudeBin: config.claude_bin,
        model,
        logFile,
      });
      if (ok) {
        const landing = await waitForLanding({
          hub: item.hub,
          id: item.id,
          timeoutMs: config.run_timeout_ms,
          logFile,
          onTimeout: () => {
            const k1 = sendPaneKey(config.cmux_bin, layout, item.hub, 'C-c');
            appendLine(logFile, `[timeout] pane send-key C-c · ok=${k1}`);
            setTimeout(() => sendPaneKey(config.cmux_bin, layout, item.hub, 'C-c'), 300);
          },
        });
        const screen = readPaneScreen(config.cmux_bin, layout, item.hub);
        if (screen) {
          const tail = screen.split('\n').slice(-50).join('\n');
          appendLine(logFile, `[screen-capture] (pane ${item.hub} 마지막 ~50줄)\n${tail}\n[/screen-capture]`);
        }
        return {
          mode: 'cmux-split',
          landingReason: landing.reason,
          timedOut: landing.timedOut,
          layout,
        };
      }
      appendLine(logFile, `[fallback] cmux-split 디스패치 실패 · background 로 전환`);
    }
  } else if (display === 'cmux-split') {
    appendLine(logFile, `[fallback] cmux 미응답 · background 로 전환 (display=cmux-split)`);
  }

  if (display === 'cmux-tab' && cmuxAlive(config.cmux_bin)) {
    cleanupPrevHubTab(item.hub, config.cmux_bin, logFile);
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
      savePrevSession(item.hub, { id: item.id, workspaceRef, startedAt: ts(), label });
      const landing = await waitForLanding({
        hub: item.hub,
        id: item.id,
        timeoutMs: config.run_timeout_ms,
        logFile,
        onTimeout: () => {
          if (workspaceRef) {
            const sent = sendCmuxCtrlC(config.cmux_bin, workspaceRef);
            appendLine(logFile, `[timeout] send-key C-c · ok=${sent}`);
            setTimeout(() => {
              const closed = closeCmuxWorkspace(config.cmux_bin, workspaceRef);
              appendLine(logFile, `[timeout] close-workspace · ok=${closed}`);
            }, 1000);
          }
        },
      });
      const screen = readCmuxScreen(config.cmux_bin, workspaceRef);
      if (screen) {
        const tail = screen.split('\n').slice(-50).join('\n');
        appendLine(logFile, `[screen-capture] (last ~50 lines of cmux tab)\n${tail}\n[/screen-capture]`);
      }
      return { mode: 'cmux-tab', landingReason: landing.reason, timedOut: landing.timedOut, workspaceRef };
    }
    appendLine(logFile, `[fallback] cmux-tab 실패 (${reason || 'unknown'}) · background 로 전환`);
  } else if (display === 'cmux-tab') {
    appendLine(logFile, `[fallback] cmux 미응답 · background 로 전환 (display=cmux-tab)`);
  }

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
    runner: 'v6.1',
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
    git(['commit', '-m', `chore(runner-v6.1): heartbeat · ${hubsToRun.map((h) => `${h}=${payload.hubs[h].current || 'idle'}`).join(' · ')}`]);
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

    if (config.display === 'cmux-split' && cmuxAlive(config.cmux_bin)) {
      const bootLog = join(RUNNER_HOME, 'hubs-split.log');
      try {
        ensureHubsLayout(config.cmux_bin, bootLog);
      } catch (e) {
        log('hubs-split', `ensureHubsLayout 예외: ${e.message}`);
      }
    }

    // v6.1: 러너 재시작 복구 — 60m 초과 "started" claim 을 blocked 처리.
    await recoverStuckStartedClaims(hubs, config);

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
      log(hub, `pick · ${item.id} · model=${model} · display=${config.display}`);
      busy.set(hub, { id: item.id, startedAt: Date.now(), model });
      enqueueClaim({ id: item.id, state: 'started', note: `runner-v6.1 · model=${model} · display=${config.display}` });

      (async () => {
        const result = await spawnClaudeForItem(item, cfg.cwd, config);
        busy.delete(hub);

        safePull();
        const logFile = join(RUNNER_HOME, hub, `${item.id}.log`);
        const post = readClaim(item.id);

        const markSplit = (state) => {
          if (result.mode === 'cmux-split' && result.layout) {
            markPane(config.cmux_bin, result.layout, hub, state, item.id);
          }
        };
        const markTab = (icon) => {
          if (result.mode === 'cmux-tab' && result.workspaceRef) {
            renameCmuxWorkspace(config.cmux_bin, result.workspaceRef, `${icon} ${hub} · ${item.id}`);
          }
        };

        if (post && (post.state === 'done' || post.state === 'blocked' || post.state === 'cancelled')) {
          log(hub, `claim 이미 ${post.state} (허브 설정) · 덮어쓰기 금지`);
          const good = post.state === 'done';
          markSplit(good ? 'done' : 'blocked');
          markTab(good ? '✓' : '✗');
          writeHeartbeat(config);
          drainClaimQueue();
          return;
        }

        if (result.mode === 'cmux-split') {
          if (result.timedOut) {
            enqueueClaim({
              id: item.id,
              state: 'blocked',
              note: `timeout 60m · runner-v6.1 cmux-split · pane 유지 (C-c 전송) · model=${model} · 로그: ${logFile}`,
              blockedBy: 'oke',
            });
            markSplit('blocked');
          } else if (result.landingReason === 'report') {
            enqueueClaim({
              id: item.id,
              state: 'done',
              note: `runner-v6.1 cmux-split · 리포트 확인 ${hub}/${item.id}-report.md · model=${model} · 로그: ${logFile}`,
            });
            markSplit('done');
          } else {
            enqueueClaim({
              id: item.id,
              state: 'blocked',
              note: `runner-v6.1 cmux-split · landing=${result.landingReason} · post claim 없음 (race?) · 로그: ${logFile}`,
              blockedBy: 'kyu',
            });
            markSplit('blocked');
          }
        } else if (result.mode === 'cmux-tab') {
          if (result.timedOut) {
            enqueueClaim({
              id: item.id,
              state: 'blocked',
              note: `timeout 60m · runner-v6.1 cmux-tab · 탭 close · model=${model} · 로그: ${logFile}`,
              blockedBy: 'oke',
            });
            markTab('✗');
          } else if (result.landingReason === 'report') {
            enqueueClaim({
              id: item.id,
              state: 'done',
              note: `runner-v6.1 cmux-tab · 리포트 확인 ${hub}/${item.id}-report.md · model=${model} · 로그: ${logFile}`,
            });
            markTab('✓');
          } else {
            enqueueClaim({
              id: item.id,
              state: 'blocked',
              note: `runner-v6.1 cmux-tab · landing=${result.landingReason} · post claim 없음 (race?) · 로그: ${logFile}`,
              blockedBy: 'kyu',
            });
            markTab('✗');
          }
        } else {
          const code = result.code;
          if (result.timedOut) {
            enqueueClaim({
              id: item.id,
              state: 'blocked',
              note: `timeout 60m · runner-v6.1 bg exit ${code} · 로그: ${logFile}`,
              blockedBy: 'oke',
            });
          } else if (code === 0) {
            if (hasReport(hub, item.id)) {
              enqueueClaim({
                id: item.id,
                state: 'done',
                note: `runner-v6.1 bg exit 0 · 리포트 확인 ${hub}/${item.id}-report.md · model=${model} · 로그: ${logFile}`,
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
              note: `runner-v6.1 bg exit ${code} · model=${model} · 로그: ${logFile}`,
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
    `시작 · v6.1 · mode=${ALL ? '--all' : `--hub ${hubFlag}`} · once=${ONCE} · dry-run=${DRY_RUN} · poll=${POLL_MS}ms · claude=${cfg.claude_bin} · version=${ver} · model=${cfg.model} · display=${cfg.display} · cmux=${cfg.cmux_bin} · cmux_password=${readCmuxPassword() ? 'file' : '(none)'} · heartbeat=${Math.round(cfg.heartbeat_ms / 60000)}m · run_timeout=${Math.round(cfg.run_timeout_ms / 60000)}m`,
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
  if (config.display === 'cmux-split') {
    const layout = loadHubsLayout();
    if (layout && layout.workspaceRef) {
      const hubsNow = cmuxAlive(config.cmux_bin) ? listHubsWorkspaces(config.cmux_bin) : [];
      const dupNote = hubsNow.length > 1
        ? ` · "Hubs" 중복 ${hubsNow.length} 개: ${hubsNow.map((w) => w.ref).join(',')} (가장 오래된 재사용, 나머지 수동 close)`
        : '';
      console.log(`hubs-split: ${layout.workspaceRef} · panes=${SPLIT_HUBS_ORDER.map((h) => `${h}=${layout.panes?.[h]?.surfaceRef || '?'}`).join(' · ')}${dupNote}`);
    } else {
      console.log(`hubs-split: layout 없음 (처음 작동 시 생성)`);
    }
  }
}

if (STATUS) {
  printStatus();
  process.exit(0);
}

if (INIT_SPLIT) {
  const cfg = loadConfig();
  const bootLog = join(RUNNER_HOME, 'hubs-split.log');
  if (!cmuxAlive(cfg.cmux_bin)) {
    console.error('cmux 미응답 · init-split 중단');
    process.exit(1);
  }
  const layout = ensureHubsLayout(cfg.cmux_bin, bootLog);
  if (!layout) {
    console.error('hubs-split 레이아웃 생성 실패 · see ' + bootLog);
    process.exit(1);
  }
  console.log(`hubs-split OK · ${layout.workspaceRef} · panes=${SPLIT_HUBS_ORDER.map((h) => `${h}=${layout.panes[h].surfaceRef}`).join(' · ')}`);
  process.exit(0);
}

if (SELFTEST_SPLIT || SELFTEST_TIMEOUT || SELFTEST_LAYOUT) {
  (async () => {
    const cfg = loadConfig();
    const idIdx = argv.indexOf('--id');
    const hubIdx = argv.indexOf('--hub');
    if (idIdx < 0 || hubIdx < 0) {
      console.error('Usage: --selftest-split|--selftest-timeout|--selftest-layout --hub <hub> --id <ID>');
      process.exit(2);
    }
    const hub = argv[hubIdx + 1];
    const id = argv[idIdx + 1];
    if (!SPLIT_HUBS_ORDER.includes(hub)) {
      console.error(`invalid hub "${hub}" · one of: ${SPLIT_HUBS_ORDER.join(',')}`);
      process.exit(2);
    }
    const bootLog = join(RUNNER_HOME, 'hubs-split.log');
    if (!cmuxAlive(cfg.cmux_bin)) {
      console.error('cmux 미응답');
      process.exit(1);
    }

    // SELFTEST_LAYOUT: 저장 layout 을 손상시켜서 ensureHubsLayout 이 "Hubs" 를 재사용하는지 확인.
    // 안전장치: 원본 layout 백업 → 테스트 → 복원 (실행 중 v6 러너가 layout 혼동 안 하도록).
    if (SELFTEST_LAYOUT) {
      const beforeLayoutRaw = existsSync(HUBS_LAYOUT_FILE) ? readFileSync(HUBS_LAYOUT_FILE, 'utf8') : null;
      const beforeLayout = loadHubsLayout();
      const beforeHubs = listHubsWorkspaces(cfg.cmux_bin);
      if (!beforeLayout) {
        console.error('저장 layout 없음 (먼저 --init-split 실행 필요)');
        process.exit(1);
      }
      if (beforeHubs.length === 0) {
        console.error('cmux 에 "Hubs" 탭 없음 · 재사용 테스트 불가');
        process.exit(1);
      }
      try {
        // 손상: surfaceRef 를 가짜로 바꿔 저장.
        const broken = JSON.parse(JSON.stringify(beforeLayout));
        for (const h of SPLIT_HUBS_ORDER) {
          if (broken.panes?.[h]) broken.panes[h].surfaceRef = 'surface:999999';
        }
        saveHubsLayout(broken);
        console.log(`[selftest-layout] 저장 layout 손상 (모든 surfaceRef → surface:999999) · 이전 workspaceRef=${beforeLayout.workspaceRef}`);
        console.log(`[selftest-layout] 재사용 대상 "Hubs" 탭 ${beforeHubs.length} 개: ${beforeHubs.map((w) => w.ref).join(',')}`);

        const logDir = join(RUNNER_HOME, hub);
        mkdirSync(logDir, { recursive: true });
        const logFile = join(logDir, `${id}.log`);
        writeFileSync(logFile, `# hub-runner-v6.1 selftest-layout · ${id}\nstarted_at: ${ts()}\nhub: ${hub}\n--- events ---\n`, 'utf8');

        const layout = ensureHubsLayout(cfg.cmux_bin, logFile);
        if (!layout) {
          console.error('[selftest-layout] ensureHubsLayout 실패');
          process.exit(1);
        }
        console.log(`[selftest-layout] 복구 layout · workspaceRef=${layout.workspaceRef} · reused=${!!layout.reused}`);
        console.log(`[selftest-layout] panes=${SPLIT_HUBS_ORDER.map((h) => `${h}=${layout.panes?.[h]?.surfaceRef || '?'}`).join(' · ')}`);

        // 재사용 성공 조건: ensureHubsLayout 이 beforeHubs 중 가장 오래된 1개를 재사용해야 함.
        // (실행 중 다른 러너 tick 이 신 workspace 를 만드는 경합은 v6.1 자체 결함이 아니므로 참고치만 기록.)
        const afterHubs = listHubsWorkspaces(cfg.cmux_bin);
        const beforeRefs = new Set(beforeHubs.map((w) => w.ref));
        if (!beforeRefs.has(layout.workspaceRef)) {
          console.error(`[selftest-layout] FAIL · v6.1 이 신 workspace 를 만듦 · layout.workspaceRef=${layout.workspaceRef} · beforeRefs=${[...beforeRefs].join(',')}`);
          process.exit(1);
        }
        const expectedRef = beforeHubs[0].ref;
        if (layout.workspaceRef !== expectedRef) {
          console.error(`[selftest-layout] FAIL · 가장 오래된 "Hubs" (${expectedRef}) 재사용 안됨 · 실제=${layout.workspaceRef}`);
          process.exit(1);
        }
        if (afterHubs.length > beforeHubs.length) {
          console.log(`[selftest-layout] NOTE · 외부 러너 경합으로 신 workspace 증가 (before=${beforeHubs.length} after=${afterHubs.length}) · v6.1 는 ${layout.workspaceRef} 재사용 ✓`);
        }

        // 실제 작업 1건: 재사용된 pane 안에 report 파일만 쓰기 (claim.mjs 안 침).
        // 재사용 workspace 의 해당 hub pane 이 실제로 존재하는지 확인.
        if (!layout.panes?.[hub]?.surfaceRef) {
          console.error(`[selftest-layout] FAIL · hub=${hub} pane 재사용 실패`);
          process.exit(1);
        }
        const reportFile = join(REPO_ROOT, hub, `${id}-report.md`);
        try { rmSync(reportFile, { force: true }); } catch { /* noop */ }
        await cleanupPaneForNewTask(cfg.cmux_bin, layout, hub, logFile);
        markPane(cfg.cmux_bin, layout, hub, 'running', id);
        const shellCmd = [
          `clear`,
          `cd ${shellEscape(REPO_ROOT)}`,
          `echo ${shellEscape(`[selftest-layout] 재사용 workspaceRef=${layout.workspaceRef} · surface=${layout.panes[hub].surfaceRef}`)}`,
          `printf '%s\\n' ${shellEscape(`# ${id} selftest-layout report\n\nhub: ${hub}\nreused_workspace: ${layout.workspaceRef}\npane: ${layout.panes[hub].surfaceRef}\nbefore_hubs_count: ${beforeHubs.length}\nafter_hubs_count: ${afterHubs.length}\n`)} > ${shellEscape(reportFile)}`,
          `echo ${shellEscape(`[selftest-layout] wrote ${reportFile}`)}`,
        ].join('; ');
        sendPaneText(cfg.cmux_bin, layout, hub, shellCmd + '\n');
        const landing = await waitForLanding({ hub, id, timeoutMs: 60_000, logFile, onTimeout: () => sendPaneKey(cfg.cmux_bin, layout, hub, 'C-c') });
        if (landing.reason !== 'report') {
          console.error(`[selftest-layout] FAIL · landing=${landing.reason}`);
          process.exit(1);
        }
        markPane(cfg.cmux_bin, layout, hub, 'done', id);
        console.log(`[selftest-layout] OK · 재사용 workspace=${layout.workspaceRef} · 신 workspace 생성 안함 · report landing 성공`);
      } finally {
        // 원본 layout 복원 (실행 중 v6 러너가 혼동 안 하도록).
        if (beforeLayoutRaw != null) {
          writeFileSync(HUBS_LAYOUT_FILE, beforeLayoutRaw, 'utf8');
          console.log(`[selftest-layout] 원본 layout 복원 완료 (workspaceRef=${beforeLayout.workspaceRef})`);
        }
      }
      process.exit(0);
    }

    // SELFTEST_TIMEOUT: claude 없이 sleep 2시간 하는 스크립트를 pane 에 보냄, run_timeout 짧게 (60s) 두고 C-c 발동 확인.
    if (SELFTEST_TIMEOUT) {
      const layout = ensureHubsLayout(cfg.cmux_bin, bootLog);
      if (!layout) {
        console.error('[selftest-timeout] layout 없음');
        process.exit(1);
      }
      const logDir = join(RUNNER_HOME, hub);
      mkdirSync(logDir, { recursive: true });
      const logFile = join(logDir, `${id}.log`);
      writeFileSync(logFile, `# hub-runner-v6.1 selftest-timeout · ${id}\nstarted_at: ${ts()}\nhub: ${hub}\n--- events ---\n`, 'utf8');
      await cleanupPaneForNewTask(cfg.cmux_bin, layout, hub, logFile);
      markPane(cfg.cmux_bin, layout, hub, 'running', id);
      // sleep 300 : claim/report 를 쓰지 않음 → waitForLanding 은 timeoutMs 로만 끝남.
      const shellCmd = [
        `clear`,
        `echo ${shellEscape(`[selftest-timeout] ${id} · sleep 300 시작`)}`,
        `sleep 300`,
        `echo ${shellEscape(`[selftest-timeout] (이 메시지는 C-c 뒤에 보이면 안됨)`)}`,
      ].join('; ');
      sendPaneText(cfg.cmux_bin, layout, hub, shellCmd + '\n');
      // timeout 을 60s 로 강제 (config 의 run_timeout_min 과 독립).
      let ctrlCCount = 0;
      const landing = await waitForLanding({
        hub,
        id,
        timeoutMs: 60_000,
        logFile,
        onTimeout: () => {
          ctrlCCount++;
          sendPaneKey(cfg.cmux_bin, layout, hub, 'C-c');
          setTimeout(() => { ctrlCCount++; sendPaneKey(cfg.cmux_bin, layout, hub, 'C-c'); }, 300);
        },
      });
      if (landing.reason !== 'timeout' || !landing.timedOut) {
        console.error(`[selftest-timeout] FAIL · landing=${landing.reason}`);
        process.exit(1);
      }
      markPane(cfg.cmux_bin, layout, hub, 'blocked', id);
      const screen = readPaneScreen(cfg.cmux_bin, layout, hub);
      const tail = screen ? screen.split('\n').slice(-20).join('\n') : '(no screen)';
      appendLine(logFile, `[selftest-timeout] screen tail:\n${tail}`);
      // 효과 확인: "이 메시지는 C-c 뒤에 보이면 안됨" 이 없어야 함 (sleep 300 가 끝나기 전에 C-c 로 중단).
      const bad = /보이면 안됨/.test(tail);
      if (bad) {
        console.error(`[selftest-timeout] FAIL · sleep 300 이 끝까지 돌았음 (C-c 미도달)`);
        process.exit(1);
      }
      console.log(`[selftest-timeout] OK · 60s 초과 → C-c ${ctrlCCount}회 송신 · pane blocked · sleep 중단 확인`);
      process.exit(0);
    }

    // SELFTEST_SPLIT: 기본 echo + report 작성 셀프테스트 (v6 와 동일 흐름).
    const layout = ensureHubsLayout(cfg.cmux_bin, bootLog);
    if (!layout) {
      console.error('레이아웃 없음');
      process.exit(1);
    }
    const logDir = join(RUNNER_HOME, hub);
    mkdirSync(logDir, { recursive: true });
    const logFile = join(logDir, `${id}.log`);
    writeFileSync(logFile, `# hub-runner-v6.1 selftest-split · ${id}\nstarted_at: ${ts()}\nhub: ${hub}\n--- events ---\n`, 'utf8');

    appendLine(logFile, `[spawn] selftest-split · hub=${hub} · surface=${layout.panes[hub].surfaceRef}`);
    await cleanupPaneForNewTask(cfg.cmux_bin, layout, hub, logFile);
    markPane(cfg.cmux_bin, layout, hub, 'running', id);

    const qfileAbs = queueFileAbs(hub, id);
    const reportFile = join(REPO_ROOT, hub, `${id}-report.md`);
    try { rmSync(reportFile, { force: true }); } catch { /* noop */ }
    const nowHMS = new Date().toTimeString().slice(0, 8);
    const headerLine = `▶ ${id} 셀프테스트 시작 · hub=${hub} · ${nowHMS}`;
    const footerLine = `▶ 셀프테스트 종료 · (러너가 ✓ 로 바꾸고 pane 유지)`;
    const shellCmd = [
      `clear`,
      `cd ${shellEscape(REPO_ROOT)}`,
      `echo ${shellEscape(headerLine)}`,
      `echo ${shellEscape(`[selftest] queue 파일 절대경로 가짜 확인: ${qfileAbs}`)}`,
      `echo ${shellEscape(`[selftest] hello from ${hub} pane · v6.1 cmux-split`)}`,
      `sleep 1`,
      `printf '%s\\n' ${shellEscape(`# ${id} selftest report\n\nhub: ${hub}\npane: ${layout.panes[hub].surfaceRef}\nqueue_file_abs: ${qfileAbs}\nrunner: v6.1 cmux-split selftest\n`)} > ${shellEscape(reportFile)}`,
      `echo ${shellEscape(`[selftest] wrote ${reportFile}`)}`,
      `echo ${shellEscape(footerLine)}`,
    ].join('; ');
    const sent = sendPaneText(cfg.cmux_bin, layout, hub, shellCmd + '\n');
    appendLine(logFile, `[cmux-send] hub=${hub} · send=${sent}`);

    const landing = await waitForLanding({
      hub,
      id,
      timeoutMs: 60 * 1000,
      logFile,
      onTimeout: () => {
        sendPaneKey(cfg.cmux_bin, layout, hub, 'C-c');
      },
    });
    appendLine(logFile, `[landing-result] ${JSON.stringify(landing)}`);
    const screen = readPaneScreen(cfg.cmux_bin, layout, hub);
    if (screen) {
      const tail = screen.split('\n').slice(-30).join('\n');
      appendLine(logFile, `[screen-capture] (pane ${hub} 마지막 ~30줄)\n${tail}\n[/screen-capture]`);
    }
    if (landing.reason === 'claim-done' || landing.reason === 'report') {
      markPane(cfg.cmux_bin, layout, hub, 'done', id);
      console.log(`selftest-split OK · hub=${hub} · id=${id} · landing=${landing.reason} · pane=${layout.panes[hub].surfaceRef}`);
      process.exit(0);
    } else {
      markPane(cfg.cmux_bin, layout, hub, 'blocked', id);
      console.error(`selftest-split FAIL · hub=${hub} · id=${id} · landing=${landing.reason}`);
      process.exit(1);
    }
  })().catch((e) => {
    console.error(`selftest 예외: ${e.message}`);
    process.exit(1);
  });
} else {
  loop().catch((e) => {
    log('', `loop fatal: ${e.message}`);
    process.exit(1);
  });
}
