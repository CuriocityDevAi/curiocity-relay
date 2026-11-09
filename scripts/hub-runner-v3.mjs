#!/usr/bin/env node
// scripts/hub-runner-v3.mjs · M1-1105-Y · 큐 자동 투입 러너 v3.
//
// v2 와의 차이 (v2 는 돌고 있으니 건드리지 않고 **새 파일**로 추가 · install.sh 가 v3 를 가리키게 되면 교체):
//   ① **허브별 모델**: runner-config.json `hubs.<hub>.model` 을 1순위로 사용 (v2 도 지원했지만 --status 표에만 노출).
//      전역 fallback `model`. 로그 헤더 `model:` + `--status` 표 `model` 열에서 확인.
//   ② **60 분 상한**: 전역 `run_timeout_min` (기본 60) 초과 시 claude child 를 SIGTERM (+5s 후 SIGKILL).
//      타임아웃 → claim `blocked` note `timeout 60m` blocked_by `oke` (Kyu 가 아닌 오케 — 오케가 라운드를 쪼개야 함).
//   ③ **heartbeat 30 분**: 전역 `heartbeat_min` (기본 30). 로컬 `all.json` 은 매 tick 갱신 (파일 mtime 으로 러너 살아있음 확인).
//      git commit/push 만 30 분 간격 — "5 분 커밋 소음" (Kyu 피드백) 제거.
//   ④ **--status 확장**: `model` · `elapsed` (진행 중인 라운드의 경과시간) · `remaining` (60분 상한에서 남은 분) 열 추가.
//      heartbeat `at` · 러너 pid · claude version 그대로.
//   ⑤ **cmux 가시성**: workspace name = `<hub> · <ID>` (중점, Kyu 확인용). 나머지는 v2 와 동일 (CLI → background fallback).
//
// 보안 금지선 (v2 와 동일 · M1-1105-W revert 결정):
//   - `security` · 키체인 · 자격증명 금지.
//   - 접근 디렉토리: relay repo · ~/.hub-runner · runner-config 의 hub cwd 뿐.
//   - 다른 앱 제어: cmux CLI 소켓만.
//
// 안전장치:
//   - 실행 중인 v2 를 수정하지 않음. install.sh TARGET_RUNNER 가 v3 로 바뀌었을 때만 launchd 가 v3 를 띄움.
//   - `--dry-run` : spawn 대신 로그만.
//   - `node --check` 로 선실측 (install.sh).
//   - 타임아웃·크래시 포함 모든 비정상 종료는 claim blocked (덮어쓰지 않음 — 허브가 먼저 올렸으면 유지).

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
  console.error('Usage: node scripts/hub-runner-v3.mjs --all [--once] [--dry-run] | --hub <id> | --status');
  process.exit(2);
}

function ts() {
  return new Date().toISOString();
}

function log(scope, ...xs) {
  console.error(`[hub-runner-v3${scope ? `:${scope}` : ''} ${ts()}]`, ...xs);
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

// cmux 응답 ping.
function cmuxAlive(cmuxBin) {
  try {
    const r = spawnSync(cmuxBin, ['ping'], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 2000 });
    return r.status === 0 && r.stdout.toString().includes('PONG');
  } catch {
    return false;
  }
}

function openCmuxWorkspace(cmuxBin, { name, cwd, command }) {
  const args = ['new-workspace', '--name', name, '--cwd', cwd, '--command', command];
  const r = spawnSync(cmuxBin, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: CMUX_WAIT_MS });
  if (r.status !== 0) {
    return { ok: false, err: (r.stderr?.toString() || r.stdout?.toString() || 'cmux new-workspace exit != 0').trim().split('\n')[0] };
  }
  return { ok: true, info: r.stdout.toString().trim() };
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

// cmux 가 돌리는 shell 명령 — bash 수준 상한은 적용 안 됨 (cmux 비동기).
// cmux 는 workspace 띄우고 바로 return; 상한 enforcement 는 메인 러너가 exitFile 폴링 중 수행.
async function spawnClaudeCmux({ cmuxBin, claudeBin, model, cwd, promptFile, logFile, exitFile, label, timeoutMs }) {
  const shellCmd = [
    `printf '[spawn] cmux · claude=${claudeBin} version=${getClaudeVersion(claudeBin)} model=${model} timeout=${Math.round(timeoutMs / 60000)}m · cwd=${cwd}\\n' >> ${shellEscape(logFile)}`,
    `${shellEscape(claudeBin)} -p "$(cat ${shellEscape(promptFile)})" --model ${shellEscape(model)} --dangerously-skip-permissions --output-format stream-json --verbose 2>>${shellEscape(logFile)}.err | tee -a ${shellEscape(logFile)}.jsonl`,
    `printf '%s\\n' "$?" > ${shellEscape(exitFile)}`,
  ].join('; ');

  appendLine(logFile, `[spawn] cmux open-workspace · label="${label}"`);
  const { ok, err, info } = openCmuxWorkspace(cmuxBin, { name: label, cwd, command: shellCmd });
  if (!ok) {
    appendLine(logFile, `[cmux-failed] ${err} · fallback=background`);
    return { ok: false, reason: err };
  }
  appendLine(logFile, `[cmux-open] ${info}`);
  return { ok: true, info };
}

function shellEscape(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

// jsonl 폴링 → logFile 에 사람 읽기 + 타임아웃 enforcement (cmux 자식 PID 를 모르니 timeoutFile 로 신호).
function tailJsonlToLog(jsonlFile, logFile, exitFile, timeoutMs, cb) {
  let offset = 0;
  let buf = '';
  const startedAt = Date.now();
  let timedOut = false;
  const interval = setInterval(() => {
    try {
      const data = readFileSync(jsonlFile, 'utf8');
      if (data.length > offset) {
        buf += data.slice(offset);
        offset = data.length;
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const l of lines) {
          const formatted = formatStreamLine(l);
          if (formatted) appendLine(logFile, formatted);
        }
      }
    } catch {
      /* file not ready yet */
    }
    if (!timedOut && Date.now() - startedAt > timeoutMs) {
      timedOut = true;
      appendLine(logFile, `[timeout] cmux 모드 · ${Math.round(timeoutMs / 60000)}m 초과 · exit=-2 강제 기록 (cmux 자식 pid 제어 불가 — Kyu 가 cmux 탭 수동 종료)`);
      writeFileSync(exitFile, '-2\n', 'utf8');
    }
    if (existsSync(exitFile)) {
      const codeStr = readFileSync(exitFile, 'utf8').trim();
      if (codeStr) {
        clearInterval(interval);
        if (buf.trim()) {
          const formatted = formatStreamLine(buf);
          if (formatted) appendLine(logFile, formatted);
        }
        appendLine(logFile, `[exit] ${codeStr}${timedOut ? ' · timeout' : ''}`);
        cb({ code: parseInt(codeStr, 10), timedOut });
      }
    }
  }, 1000);
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
    `# hub-runner-v3 log · ${item.id}`,
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
    return { code: 0, timedOut: false };
  }

  // cmux 사용 가능 체크.
  if (display === 'cmux' && cmuxAlive(config.cmux_bin)) {
    const label = `${item.hub} · ${item.id}`;
    const { ok, reason } = await spawnClaudeCmux({
      cmuxBin: config.cmux_bin,
      claudeBin: config.claude_bin,
      model,
      cwd,
      promptFile,
      logFile,
      exitFile,
      label,
      timeoutMs: config.run_timeout_ms,
    });
    if (ok) {
      return new Promise((resolve) => {
        tailJsonlToLog(jsonlFile, logFile, exitFile, config.run_timeout_ms, (res) => resolve(res));
      });
    }
    appendLine(logFile, `[fallback] cmux 실패 (${reason || 'unknown'}) · background 로 전환`);
  } else if (display === 'cmux') {
    appendLine(logFile, `[fallback] cmux 미응답 (ping 실패) · background 로 전환`);
  }

  // Background.
  return spawnClaudeBackground({
    claudeBin: config.claude_bin,
    model,
    cwd,
    prompt: readFileSync(promptFile, 'utf8'),
    logFile,
    exitFile,
    timeoutMs: config.run_timeout_ms,
  });
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
    runner: 'v3',
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
    git(['commit', '-m', `chore(runner-v3): heartbeat · ${hubsToRun.map((h) => `${h}=${payload.hubs[h].current || 'idle'}`).join(' · ')}`]);
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
      enqueueClaim({ id: item.id, state: 'started', note: `runner-v3 · model=${model}` });

      (async () => {
        const { code, timedOut } = await spawnClaudeForItem(item, cfg.cwd, config);
        busy.delete(hub);

        safePull();
        const post = readClaim(item.id);
        if (post && (post.state === 'done' || post.state === 'blocked' || post.state === 'cancelled')) {
          log(hub, `claim 이미 ${post.state} (허브 설정) · 덮어쓰기 금지`);
          writeHeartbeat(config);
          drainClaimQueue();
          return;
        }
        const logFile = join(RUNNER_HOME, hub, `${item.id}.log`);
        if (timedOut) {
          enqueueClaim({
            id: item.id,
            state: 'blocked',
            note: `timeout 60m · runner-v3 exit ${code} · 로그: ${logFile}`,
            blockedBy: 'oke',
          });
        } else if (code === 0) {
          enqueueClaim({ id: item.id, state: 'done', note: `runner-v3 exit 0 · model=${model} · 로그: ${logFile}` });
        } else {
          enqueueClaim({
            id: item.id,
            state: 'blocked',
            note: `runner-v3 exit ${code} · model=${model} · 로그: ${logFile}`,
            blockedBy: 'kyu',
          });
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
    `시작 · v3 · mode=${ALL ? '--all' : `--hub ${hubFlag}`} · once=${ONCE} · dry-run=${DRY_RUN} · poll=${POLL_MS}ms · claude=${cfg.claude_bin} · version=${ver} · model=${cfg.model} · display=${cfg.display} · cmux=${cfg.cmux_bin} · heartbeat=${Math.round(cfg.heartbeat_ms / 60000)}m · run_timeout=${Math.round(cfg.run_timeout_ms / 60000)}m`,
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

// --status : claims + heartbeat + per-run elapsed/remaining.
function printStatus() {
  const config = loadConfig();
  const heartbeat = existsSync(ALL_HEARTBEAT) ? JSON.parse(readFileSync(ALL_HEARTBEAT, 'utf8')) : null;
  const now = Date.now();
  const rows = [];
  rows.push(['hub', 'current', 'model', 'elapsed', 'remaining', 'queue head', 'cwd']);
  rows.push(['---', '-------', '-----', '-------', '---------', '----------', '---']);
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
    const q = listQueue(hub);
    let head = '(empty)';
    for (const item of q) {
      const claim = readClaim(item.id);
      if (!claim || claim.state === 'issued') {
        head = `${item.id} (${claim?.state || 'new'})`;
        break;
      }
    }
    rows.push([hub, current, model, elapsed, remaining, head, cfg.cwd ? (existsSync(cfg.cwd) ? '✓' : '✗') : '(none)']);
  }
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
  for (const r of rows) {
    console.log(r.map((c, i) => String(c).padEnd(widths[i])).join('  '));
  }
  console.log();
  console.log(`heartbeat.at: ${heartbeat?.at || '(none)'} · pid=${heartbeat?.pid || '?'} · runner=${heartbeat?.runner || '?'}`);
  console.log(`claude_bin: ${config.claude_bin} · version=${getClaudeVersion(config.claude_bin)}`);
  console.log(`cmux ping: ${cmuxAlive(config.cmux_bin) ? 'PONG' : 'DOWN'} · bin=${config.cmux_bin}`);
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
