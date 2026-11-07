#!/usr/bin/env node
// scripts/hub-runner.mjs · 큐 자동 투입 러너 (M1-1105-S/T/V/W · 단일 프로세스)
//
// M1-1105-W 요지 (V 재발부):
//   - ❌ `security` · macOS 키체인 · ~/Library/Keychains · 어떤 자격증명 조회도 호출하지 않음.
//     토큰/인증이 필요하면 멈추고 claim blocked(blocked_by=kyu).
//   - stream-json 파싱: claude -p --output-format stream-json --verbose 를 사람이 읽을 수 있는
//     한 줄씩 로그에 **즉시 flush** (tool 호출 · 파일 수정 · 텍스트 · 최종 결과).
//   - cmux 탭 가시화 (디스패치 2 단계만): display="cmux" 면 러너가 claude 를 직접 spawn 하지
//     않고 (1) cmux 번들 CLI `new-workspace --command <bashCmd>` 를 보낸 뒤, 실패하면 (2)
//     AppleScript `tell application "cmux" / "System Events"` 로 창을 활성화하고 bashCmd 를 키
//     입력해 실행. 다른 터미널 앱(iTerm2 · Terminal.app) 제어는 금지 — 폴백 금지.
//     둘 다 실패하면 background 로 자동 폴백하고 로그 헤더에 사유 1 줄. 종료 코드는 탭이 쓰는
//     `<ID>.exit` 파일로 회수.
//   - `--status`: 허브별 current · 마지막 heartbeat · 로그 경로를 1 줄씩 출력 (게이트 디버그용).
//
// Usage:
//   node scripts/hub-runner.mjs --all             # 5 허브 상시 polling (60 s)
//   node scripts/hub-runner.mjs --all --once      # 1 tick 만
//   node scripts/hub-runner.mjs --hub m2          # 단일 허브 (디버그)
//   node scripts/hub-runner.mjs --status          # 러너 상태 1 줄/허브
//   node scripts/hub-runner.mjs --parse-stream    # stdin JSONL → stdout 사람 읽는 한 줄 (내부용)
//   CLAUDE_BIN=<path> node scripts/hub-runner.mjs --all   # claude 바이너리 override
//
// cwd 지도 · claude_bin · model · display 전부 status/runner-config.json 에서 로드.

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import {
  createWriteStream,
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
import { createInterface } from 'node:readline';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const RUNNER_HOME = join(homedir(), '.hub-runner');

const POLL_MS = 60 * 1000;
const STALE_LOCK_MS = 10 * 60 * 1000;
const HEARTBEAT_MS = 5 * 60 * 1000;
// M1-1105-V · 탭이 claude 를 끝낼 때까지 대기할 상한 (60 분). 넘기면 blocked 로.
const CMUX_EXIT_WAIT_MS = 60 * 60 * 1000;
const CMUX_EXIT_POLL_MS = 2 * 1000;
// M1-1105-T · claude_bin/model 은 runner-config.json 에서 로드 (override 우선순위: env > config.hubs[hub] > config).
const DEFAULT_CLAUDE_BIN = '/Applications/cmux.app/Contents/Resources/bin/claude';

const CONFIG_FILE = join(REPO_ROOT, 'status', 'runner-config.json');
const QUEUE_DIR = join(REPO_ROOT, 'queue');
const CLAIMS_DIR = join(REPO_ROOT, 'status', 'claims');
const RUNNERS_DIR = join(REPO_ROOT, 'status', 'runners');
const ALL_HEARTBEAT = join(RUNNERS_DIR, 'all.json');
const LOCK_FILE = join(RUNNER_HOME, 'all.lock');
const RUNNER_SCRIPT = fileURLToPath(import.meta.url);

mkdirSync(RUNNER_HOME, { recursive: true });
mkdirSync(RUNNERS_DIR, { recursive: true });

const argv = process.argv.slice(2);
const ONCE = argv.includes('--once');
const ALL = argv.includes('--all');
const STATUS = argv.includes('--status');
const PARSE_STREAM = argv.includes('--parse-stream');
const hubFlag = (() => {
  const i = argv.indexOf('--hub');
  return i >= 0 ? argv[i + 1] : null;
})();

if (PARSE_STREAM) {
  // §M1-1105-V · stdin 의 stream-json 이벤트를 사람이 읽을 수 있는 한 줄로 변환해 즉시 flush.
  parseStreamToStdout().catch((e) => {
    process.stderr.write(`[parse-stream] fatal: ${e.message}\n`);
    process.exit(1);
  });
} else if (STATUS) {
  printStatus();
  process.exit(0);
} else if (!ALL && !hubFlag) {
  console.error(
    'Usage: node scripts/hub-runner.mjs --all [--once] | --hub <id> | --status | --parse-stream',
  );
  process.exit(2);
} else {
  loop().catch((e) => {
    log('', `loop fatal: ${e.message}`);
    process.exit(1);
  });
}

function ts() {
  return new Date().toISOString();
}

function log(scope, ...xs) {
  console.error(`[hub-runner${scope ? `:${scope}` : ''} ${ts()}]`, ...xs);
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

// §3 안전: 러너 스코프 외 변경은 손 안 댐.
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
    log('git', `pull --rebase origin main 실패: ${msg} · rebase --abort 시도`);
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
  // M1-1105-V · display 전역 기본값 "cmux" · 허브별 override 가능.
  return {
    claude_bin: process.env.CLAUDE_BIN || raw.claude_bin || DEFAULT_CLAUDE_BIN,
    model: raw.model || 'opus',
    display: raw.display || 'cmux',
    hubs: raw.hubs || {},
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
    _claudeVersionCache = { bin, version: `unknown (--version 실패: ${msg})` };
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

// --- stream-json → human one-liner 변환 (M1-1105-V) ---

function truncate(s, n = 200) {
  if (!s) return '';
  const flat = String(s).replace(/\s+/g, ' ').trim();
  return flat.length <= n ? flat : flat.slice(0, n) + '…';
}

function summarizeToolInput(name, input) {
  if (!input || typeof input !== 'object') return '';
  switch (name) {
    case 'Bash': {
      const cmd = input.command || '';
      const desc = input.description ? ` (${truncate(input.description, 60)})` : '';
      return `${truncate(cmd, 160)}${desc}`;
    }
    case 'Read':
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return input.file_path || '';
    case 'Grep': {
      const where = input.path ? ` in ${input.path}` : '';
      return `/${truncate(input.pattern || '', 80)}/${where}`;
    }
    case 'Glob':
      return input.pattern || '';
    case 'TodoWrite': {
      const n = Array.isArray(input.todos) ? input.todos.length : 0;
      return `${n} todos`;
    }
    case 'Task':
      return `${input.subagent_type || '?'} · ${truncate(input.description, 120)}`;
    case 'WebFetch':
    case 'WebSearch':
      return truncate(input.url || input.query || '', 160);
    default: {
      const keys = Object.keys(input).slice(0, 3).join(',');
      return keys ? `{${keys}}` : '';
    }
  }
}

function formatEvent(evt) {
  const t = evt && evt.type;
  if (!t) return null;
  if (t === 'rate_limit_event') return null;
  if (t === 'system' && evt.subtype === 'init') {
    const sess = (evt.session_id || '').slice(0, 8);
    return `[init] model=${evt.model || '?'} · session=${sess} · cwd=${evt.cwd || '?'}`;
  }
  if (t === 'assistant' && evt.message && Array.isArray(evt.message.content)) {
    const lines = [];
    for (const block of evt.message.content) {
      if (block.type === 'text' && block.text) {
        lines.push(`[text] ${truncate(block.text, 240)}`);
      } else if (block.type === 'tool_use') {
        const name = block.name || '?';
        const summary = summarizeToolInput(name, block.input);
        lines.push(`[tool] ${name}${summary ? ` · ${summary}` : ''}`);
      } else if (block.type === 'thinking' && block.thinking) {
        lines.push(`[think] ${truncate(block.thinking, 160)}`);
      }
    }
    return lines.length ? lines.join('\n') : null;
  }
  if (t === 'user' && evt.message && Array.isArray(evt.message.content)) {
    const lines = [];
    for (const block of evt.message.content) {
      if (block.type === 'tool_result') {
        const content = block.content;
        let preview = '';
        if (typeof content === 'string') preview = content;
        else if (Array.isArray(content)) {
          preview = content.map((c) => c?.text || '').join(' ');
        }
        const err = block.is_error ? ' (error)' : '';
        lines.push(`[result]${err} ${truncate(preview, 200)}`);
      }
    }
    return lines.length ? lines.join('\n') : null;
  }
  if (t === 'result') {
    const err = evt.is_error ? ' ERROR' : '';
    const dur = typeof evt.duration_ms === 'number' ? ` · ${(evt.duration_ms / 1000).toFixed(1)}s` : '';
    const cost = typeof evt.total_cost_usd === 'number' ? ` · $${evt.total_cost_usd.toFixed(4)}` : '';
    const tail = evt.result ? `\n[final] ${evt.result}` : '';
    return `[done${err}]${dur}${cost}${tail}`;
  }
  return null;
}

async function parseStreamToStdout() {
  // Node writable streams on stdout 은 기본 line-buffer 가 아니라서, 매 write 뒤에
  // write barrier 를 얇게 두려고 isTTY 체크 없이 바로 write (process.stdout.write 는 비동기지만
  // 이벤트 루프가 다음 tick 에 flush — tail -f 가 거의 실시간으로 본다).
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let evt;
    try {
      evt = JSON.parse(line);
    } catch {
      process.stdout.write(`[raw] ${truncate(line, 400)}\n`);
      continue;
    }
    const out = formatEvent(evt);
    if (out) process.stdout.write(`${ts()} ${out}\n`);
  }
}

// Claim 큐 — 모든 git 변경은 여기서 직렬로.
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
  if (blockedBy) args.push('--blocked-by', blockedBy);
  if (note) args.push(note);
  try {
    execFileSync(process.execPath, args, { cwd: REPO_ROOT, stdio: 'inherit' });
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message).trim().split('\n').slice(0, 3).join(' · ');
    log('claim', `claim.mjs 실패 (${id} ${state}): ${msg}`);
  }
}

// --- cmux 디스패치 (M1-1105-W · CLI → System Events 2 단계만, 다른 터미널 앱 금지) ---

const CMUX_CLI = '/Applications/cmux.app/Contents/Resources/bin/cmux';

function shellSingleQuote(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function osaRun(script, timeoutMs = 4000) {
  const r = spawnSync('osascript', ['-e', script], {
    timeout: timeoutMs,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const out = (r.stdout?.toString() || '').trim();
  const err = (r.stderr?.toString() || '').trim().split('\n')[0];
  return { ok: r.status === 0, status: r.status, out, err };
}

function cmuxSendViaCli(tabName, bashCmd, cwd) {
  // cmux CLI 는 소켓 암호 인증을 요구. launchd / 비 cmux PTY 에서는 거의 항상 실패하지만,
  // 쓸 수 있으면 가장 깔끔 (cmux 세션 안이라 claude 가 TTY · 인증 상속).
  if (!existsSync(CMUX_CLI)) return { ok: false, reason: 'cmux-cli: 바이너리 없음' };
  try {
    const r = spawnSync(
      CMUX_CLI,
      ['new-workspace', '--name', tabName, '--cwd', cwd, '--command', bashCmd],
      { timeout: 6000, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    if (r.status === 0) return { ok: true, via: 'cmux-cli:new-workspace' };
    const err = (r.stderr?.toString() || '').trim().split('\n')[0] || `exit ${r.status}`;
    return { ok: false, reason: `cmux-cli: ${err}` };
  } catch (e) {
    return { ok: false, reason: `cmux-cli: ${e.message}` };
  }
}

function cmuxSendViaSystemEvents(tabName, bashCmd) {
  // AppleScript: cmux 활성화 → System Events 로 Cmd+T (새 탭) → 명령 keystroke + Enter.
  // 사전 요구: 로그인/언락 상태 · '시스템 설정 → 개인정보 · 보안 → 손쉬운 사용' 에 러너를 띄우는
  // 프로세스(launchd 데몬 또는 node) 가 허용돼 있어야 함. 아니면 keystroke 가 조용히 실패.
  // 탭 이름은 System Events 로 조작 못 하므로 참조용 주석만: tabName.
  if (!bashCmd) return { ok: false, reason: 'system-events: empty cmd' };
  const safeCmd = bashCmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const script = [
    'with timeout of 8 seconds',
    `-- target cmux workspace label: ${tabName.replace(/\n/g, ' ')}`,
    'tell application "cmux" to activate',
    'delay 0.4',
    'tell application "System Events"',
    '  tell process "cmux"',
    '    keystroke "t" using command down',
    '    delay 0.4',
    `    keystroke "${safeCmd}"`,
    '    key code 36',
    '  end tell',
    'end tell',
    'end timeout',
  ].join('\n');
  const r = osaRun(script, 10000);
  if (r.ok) return { ok: true, via: 'applescript-system-events' };
  return { ok: false, reason: `system-events: ${r.err || 'unknown'}` };
}

function dispatchToTab(tabName, bashCmd, cwd) {
  const reasons = [];
  const cli = cmuxSendViaCli(tabName, bashCmd, cwd);
  if (cli.ok) return cli;
  reasons.push(cli.reason);

  const se = cmuxSendViaSystemEvents(tabName, bashCmd);
  if (se.ok) return se;
  reasons.push(se.reason);

  return { ok: false, reason: reasons.join(' · ') };
}

// --- claude 실행 (display: cmux | background) ---

function hubTabName(hub, cfg) {
  return cfg?.cmux_tab || hub.toUpperCase();
}

function buildPipelineCmd({ claudeBin, promptFile, model, logFile }) {
  // - set -o pipefail: claude 가 실패하면 파이프라인도 실패 → $? != 0.
  // - stderr 는 2>&1 로 파이프 안에 섞어 JSON 이 아닌 라인도 [raw] 로 나오게.
  // - tee -a: 로그에 누적하고 탭에도 출력 (cmux 탭에서 진행이 보임).
  const quotedBin = shellSingleQuote(claudeBin);
  const quotedPrompt = shellSingleQuote(promptFile);
  const quotedModel = shellSingleQuote(model);
  const quotedLog = shellSingleQuote(logFile);
  const quotedRunner = shellSingleQuote(RUNNER_SCRIPT);
  // 전체를 한 셸에서 돌려 pipefail 이 파이프라인에 적용되게.
  return `set -o pipefail; ${quotedBin} -p "$(cat ${quotedPrompt})" --model ${quotedModel} --output-format stream-json --verbose --dangerously-skip-permissions 2>&1 | node ${quotedRunner} --parse-stream | tee -a ${quotedLog}`;
}

function writeLogHeader(logFile, meta) {
  const header =
    [
      `# hub-runner log · ${meta.id}`,
      `started_at: ${ts()}`,
      `hub: ${meta.hub}`,
      `cwd: ${meta.cwd}`,
      `claude_bin: ${meta.claudeBin}`,
      `claude_version: ${meta.claudeVersion}`,
      `model: ${meta.model}`,
      `display: ${meta.display}${meta.displayVia ? ` (${meta.displayVia})` : ''}`,
      meta.fallbackReason ? `fallback_reason: ${meta.fallbackReason}` : null,
      `process_env_path: ${process.env.PATH || '(unset)'}`,
      `log: ${logFile}`,
      '--- stream ---',
      '',
    ]
      .filter((l) => l !== null)
      .join('\n');
  writeFileSync(logFile, header, 'utf8');
}

async function runClaude(item, cfg, config) {
  const { cwd } = cfg;
  const claudeBin = config.claude_bin;
  const model = cfg.model || config.model;
  const display = cfg.display || config.display;
  const claudeVersion = getClaudeVersion(claudeBin);
  const logDir = join(RUNNER_HOME, item.hub);
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, `${item.id}.log`);
  const promptFile = join(logDir, `${item.id}.prompt`);
  const exitFile = join(logDir, `${item.id}.exit`);
  // exitFile 이 과거 run 에서 남아 있으면 혼동 → 지움.
  try {
    rmSync(exitFile, { force: true });
  } catch {
    /* noop */
  }
  const prompt = readFileSync(item.file, 'utf8');
  writeFileSync(promptFile, prompt, 'utf8');

  const bashCmd = buildPipelineCmd({ claudeBin, promptFile, model, logFile });
  // cd 를 체이닝 안에 포함해 cd 실패도 exit 코드에 잡히게. RC=$? 로 **파이프라인** 종료코드 보존 후 파일로.
  const fullCmd = `cd ${shellSingleQuote(cwd)} && ${bashCmd}; RC=$?; echo "$RC" > ${shellSingleQuote(exitFile)}`;

  if (display === 'cmux') {
    const tabName = hubTabName(item.hub, cfg);
    const r = dispatchToTab(tabName, fullCmd, cwd);
    if (r.ok) {
      writeLogHeader(logFile, {
        id: item.id,
        hub: item.hub,
        cwd,
        claudeBin,
        claudeVersion,
        model,
        display: 'cmux',
        displayVia: r.via,
      });
      log(item.hub, `dispatched → ${r.via} · tab=${tabName} · ID=${item.id}`);
      const code = await waitForExitFile(exitFile, logFile);
      return { exit: code, logFile };
    }
    // 폴백.
    writeLogHeader(logFile, {
      id: item.id,
      hub: item.hub,
      cwd,
      claudeBin,
      claudeVersion,
      model,
      display: 'background',
      fallbackReason: r.reason,
    });
    log(item.hub, `cmux 디스패치 실패 · background 폴백 · ${r.reason}`);
  } else {
    writeLogHeader(logFile, {
      id: item.id,
      hub: item.hub,
      cwd,
      claudeBin,
      claudeVersion,
      model,
      display: 'background',
    });
  }

  // background: 러너 프로세스가 직접 bash -c '…' 를 spawn. 같은 파이프라인 / 같은 로그.
  log(item.hub, `spawn (background) · ID=${item.id} · cwd=${cwd} · bin=${claudeBin} · ver=${claudeVersion} · model=${model}`);
  return new Promise((resolvePromise) => {
    const child = spawn('bash', ['-c', fullCmd], {
      cwd,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stderrChunks = [];
    child.stdout.on('data', () => {
      /* 파이프라인이 로그에 쓰므로 여기서는 버림 */
    });
    child.stderr.on('data', (c) => stderrChunks.push(c));
    child.on('close', (code) => {
      const err = Buffer.concat(stderrChunks).toString();
      if (err.trim()) {
        try {
          // 러너 스코프 외 stderr 만 로그에 꼬리로 붙임.
          const fs = createWriteStream(logFile, { flags: 'a' });
          fs.write(`\n--- bash stderr ---\n${err}\n--- exit ${code} ---\n`);
          fs.end();
        } catch {
          /* noop */
        }
      } else {
        try {
          writeFileSync(logFile, `\n--- exit ${code} ---\n`, { flag: 'a' });
        } catch {
          /* noop */
        }
      }
      resolvePromise({ exit: code ?? -1, logFile });
    });
    child.on('error', (e) => {
      try {
        writeFileSync(logFile, `\nspawn error: ${e.message}\n--- exit -1 ---\n`, { flag: 'a' });
      } catch {
        /* noop */
      }
      resolvePromise({ exit: -1, logFile });
    });
  });
}

async function waitForExitFile(exitFile, logFile) {
  const deadline = Date.now() + CMUX_EXIT_WAIT_MS;
  while (Date.now() < deadline) {
    if (existsSync(exitFile)) {
      try {
        const txt = readFileSync(exitFile, 'utf8').trim();
        const code = parseInt(txt, 10);
        if (!Number.isNaN(code)) return code;
      } catch {
        /* retry */
      }
    }
    await new Promise((r) => setTimeout(r, CMUX_EXIT_POLL_MS));
  }
  try {
    writeFileSync(logFile, `\n--- timeout waiting for exit file (${Math.round(CMUX_EXIT_WAIT_MS / 60000)} min) ---\n`, { flag: 'a' });
  } catch {
    /* noop */
  }
  return 124; // bash timeout convention
}

// --- 상태 subcommand (M1-1105-V) ---

function pad(s, n) {
  s = String(s ?? '');
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function printStatus() {
  const cfg = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  let hb = null;
  try {
    hb = JSON.parse(readFileSync(ALL_HEARTBEAT, 'utf8'));
  } catch {
    /* no heartbeat yet */
  }
  const hubIds = Object.keys(cfg.hubs || {}).sort();
  console.log(`hub-runner --status · heartbeat_at=${hb?.at || '(none)'} · pid=${hb?.pid || '(none)'}`);
  console.log(
    `${pad('hub', 4)}${pad('current', 24)}${pad('started_at', 26)}${pad('display', 12)}log`,
  );
  for (const hub of hubIds) {
    const h = hb?.hubs?.[hub];
    const current = h?.current || '(idle)';
    const started = h?.started_at || '';
    const logDir = join(RUNNER_HOME, hub);
    const logPath = h?.current ? join(logDir, `${h.current}.log`) : logDir;
    const display = cfg.hubs[hub]?.display || cfg.display || 'cmux';
    console.log(`${pad(hub, 4)}${pad(current, 24)}${pad(started, 26)}${pad(display, 12)}${logPath}`);
  }
}

// --- 메인 루프 ---

const busy = new Map(); // hub -> { id, startedAt }
const hubsToRun = ALL ? ['m0', 'm1', 'm2', 'm3', 'r0'] : [hubFlag];

let lastHeartbeatAt = 0;
function writeHeartbeat(force = false) {
  const now = Date.now();
  const payload = {
    at: ts(),
    pid: process.pid,
    poll_ms: POLL_MS,
    hubs: Object.fromEntries(
      hubsToRun.map((hub) => [
        hub,
        busy.has(hub)
          ? { current: busy.get(hub).id, started_at: new Date(busy.get(hub).startedAt).toISOString() }
          : { current: null },
      ]),
    ),
  };
  writeFileSync(ALL_HEARTBEAT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  if (!force && now - lastHeartbeatAt < HEARTBEAT_MS) return;
  try {
    git(['add', 'status/runners/all.json']);
    git([
      'commit',
      '-m',
      `chore(runner): heartbeat · ${hubsToRun
        .map((h) => `${h}=${payload.hubs[h].current || 'idle'}`)
        .join(' · ')}`,
    ]);
    git(['push', 'origin', 'HEAD:main']);
    lastHeartbeatAt = now;
    log('', `heartbeat pushed`);
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
        log(hub, `runner-config 에 cwd 없음 · 건너뜀`);
        continue;
      }
      if (!existsSync(cfg.cwd)) {
        log(hub, `cwd 부재 · ${cfg.cwd} · 건너뜀 (큐가 있어도 cwd 복구 전엔 claim 안 바꿈)`);
        continue;
      }
      const item = pickNext(hub);
      if (!item) continue;
      log(hub, `pick · ${item.id}`);
      busy.set(hub, { id: item.id, startedAt: Date.now() });
      enqueueClaim({ id: item.id, state: 'started', note: 'runner' });

      (async () => {
        const { exit, logFile } = await runClaude(item, cfg, config);
        busy.delete(hub);

        safePull();
        const post = readClaim(item.id);
        if (post && (post.state === 'done' || post.state === 'blocked' || post.state === 'cancelled')) {
          log(hub, `claim 이미 ${post.state} (허브 설정) · 덮어쓰지 않음`);
          writeHeartbeat();
          drainClaimQueue();
          return;
        }

        if (exit === 0) {
          enqueueClaim({ id: item.id, state: 'done', note: `runner exit 0 · 로그: ${logFile}` });
        } else {
          enqueueClaim({
            id: item.id,
            state: 'blocked',
            note: `runner exit ${exit} · 로그: ${logFile}`,
            blockedBy: 'kyu',
          });
        }
        writeHeartbeat();
        drainClaimQueue();
      })();
    }

    await drainClaimQueue();
    writeHeartbeat();
  } finally {
    releaseLock();
  }
}

async function loop() {
  const cfg = loadConfig();
  const ver = getClaudeVersion(cfg.claude_bin);
  log(
    '',
    `시작 · mode=${ALL ? '--all' : `--hub ${hubFlag}`} · once=${ONCE} · poll=${POLL_MS}ms · display=${cfg.display} · claude=${cfg.claude_bin} · version=${ver} · model=${cfg.model} · PATH=${process.env.PATH || '(unset)'}`,
  );
  writeHeartbeat(true);
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
      writeHeartbeat(true);
      break;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
