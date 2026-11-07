#!/usr/bin/env node
// scripts/hub-runner.mjs · 허브 큐 자동 투입 러너 (M2-1105-O · 방법론 ⑯)
//
// Usage:
//   node scripts/hub-runner.mjs <hub>              # 상시 polling (60 s)
//   node scripts/hub-runner.mjs <hub> --once       # 1 tick 만 돌고 exit (CI/pilot)
//   node scripts/hub-runner.mjs <hub> --cwd <path> # hubs.json 의 cwd override
//
// 큐 규약:
//   queue/<hub>/<ID>.md · 본문 = 프롬프트 원문 그대로 · 첫 줄 "허브-월일-알파벳 (ID)".
//   취소 = 파일 삭제 또는 status/claims/<ID>.json state=cancelled.
//
// 동작:
//   1. 60 s 마다 `git pull --rebase --quiet` → queue/<hub>/*.md 스캔.
//   2. claim 이 없거나 state 가 'issued' 인 것 중 **파일명 최솟값** 1개 선택 · 허브당 동시 1개.
//   3. `scripts/claim.mjs <ID> started "runner"` 로 커밋+푸시.
//   4. claude -p "<본문>" --dangerously-skip-permissions 를 hub cwd 에서 spawn.
//      stdout/stderr → ~/.hub-runner/<hub>/<ID>.log.
//   5. exit 0 → claim done "runner exit 0"
//      exit N → claim blocked "runner exit N · 로그: <path>" (blocked_by: kyu)
//      단, 허브가 이미 done/blocked 를 올렸으면 **덮어쓰지 않음** (claim 파일 확인).
//   6. heartbeat status/runners/<hub>.json {at, pid, current} 5 분마다
//      (chore(runner) · 변화 없으면 commit 생략).
//   7. 허브당 lock ~/.hub-runner/<hub>.lock — stale 10 분 뒤 자동 해제.

import { execFileSync, spawnSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const RUNNER_HOME = join(homedir(), '.hub-runner');

const POLL_MS = 60 * 1000;
const STALE_LOCK_MS = 10 * 60 * 1000;
const HEARTBEAT_MS = 5 * 60 * 1000;

const CLAUDE_BIN = process.env.CLAUDE_BIN || findInPath('claude') || '/Applications/cmux.app/Contents/Resources/bin/claude';

const argv = process.argv.slice(2);
const hub = argv.find((a) => /^[a-z]\d+$/.test(a));
if (!hub) {
  console.error('Usage: node scripts/hub-runner.mjs <hub> [--once] [--cwd <path>]');
  process.exit(2);
}
const ONCE = argv.includes('--once');
const cwdIdx = argv.indexOf('--cwd');
const CWD_ARG = cwdIdx >= 0 ? argv[cwdIdx + 1] : null;

const QUEUE_DIR = join(REPO_ROOT, 'queue', hub);
const CLAIMS_DIR = join(REPO_ROOT, 'status', 'claims');
const RUNNERS_DIR = join(REPO_ROOT, 'status', 'runners');
const LOG_DIR = join(RUNNER_HOME, hub);
const LOCK_FILE = join(RUNNER_HOME, `${hub}.lock`);
const HEARTBEAT_FILE = join(RUNNERS_DIR, `${hub}.json`);

mkdirSync(RUNNER_HOME, { recursive: true });
mkdirSync(LOG_DIR, { recursive: true });
mkdirSync(RUNNERS_DIR, { recursive: true });

function log(...xs) {
  const ts = new Date().toISOString();
  console.error(`[hub-runner:${hub} ${ts}]`, ...xs);
}

function findInPath(cmd) {
  try {
    const out = execFileSync('which', [cmd], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return out || null;
  } catch { return null; }
}

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'], ...opts }).toString();
}

function tryGitPull() {
  try { git(['pull', '--rebase', '--quiet']); return true; }
  catch (e) { log('git pull --rebase 실패 (계속 진행):', (e.stderr?.toString() || e.message).trim().split('\n')[0]); return false; }
}

function acquireLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      const st = statSync(LOCK_FILE);
      if (Date.now() - st.mtimeMs < STALE_LOCK_MS) return false;
      log('stale lock 삭제');
      rmSync(LOCK_FILE, { force: true });
    }
    writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
    return true;
  } catch { return false; }
}

function releaseLock() {
  try { rmSync(LOCK_FILE, { force: true }); } catch { /* noop */ }
}

function readClaim(id) {
  const file = join(CLAIMS_DIR, `${id}.json`);
  if (!existsSync(file)) return null;
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

function listQueue() {
  if (!existsSync(QUEUE_DIR)) return [];
  return readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ id: f.replace(/\.md$/, ''), file: join(QUEUE_DIR, f) }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

function pickNext() {
  for (const item of listQueue()) {
    const claim = readClaim(item.id);
    // 선택 조건: claim 없음 또는 state === 'issued'. started/done/blocked/cancelled 는 skip.
    if (!claim || claim.state === 'issued') return item;
  }
  return null;
}

function runClaim(id, state, note) {
  log(`claim ${id} → ${state}`);
  try {
    execFileSync(process.execPath, [join(HERE, 'claim.mjs'), id, state, note || ''], {
      cwd: REPO_ROOT, stdio: 'inherit',
    });
  } catch (e) {
    log(`claim.mjs 실패 (${id} ${state}):`, (e.stderr?.toString() || e.message).trim().split('\n')[0]);
  }
}

function hubCwd() {
  if (CWD_ARG) return CWD_ARG;
  try {
    const hubs = JSON.parse(readFileSync(join(REPO_ROOT, 'status/hubs.json'), 'utf8'));
    const h = hubs.hubs?.[hub];
    if (h?.cwd) return h.cwd;
    // fallback: work_dir 기반 매핑 (/Users/<home>/projects/<work_dir>)
    if (h?.work_dir) return join(homedir(), 'projects', h.work_dir);
  } catch { /* noop */ }
  return null;
}

function runPrompt(item, cwd) {
  const prompt = readFileSync(item.file, 'utf8');
  const logFile = join(LOG_DIR, `${item.id}.log`);
  const header = [
    `# hub-runner log · ${item.id}`,
    `started_at: ${new Date().toISOString()}`,
    `hub: ${hub}`,
    `cwd: ${cwd}`,
    `claude: ${CLAUDE_BIN}`,
    `log: ${logFile}`,
    '--- stdout+stderr ---',
    '',
  ].join('\n');
  writeFileSync(logFile, header, 'utf8');

  log(`spawn claude -p · ID=${item.id} · cwd=${cwd}`);
  const child = spawnSync(CLAUDE_BIN, ['-p', prompt, '--dangerously-skip-permissions'], {
    cwd,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 50 * 1024 * 1024,
  });
  const out = (child.stdout || Buffer.alloc(0)).toString();
  const err = (child.stderr || Buffer.alloc(0)).toString();
  writeFileSync(logFile, header + out + '\n--- stderr ---\n' + err + `\n--- exit ${child.status} ---\n`, 'utf8');
  return { exit: child.status, logFile };
}

function heartbeat(currentId) {
  const payload = { at: new Date().toISOString(), pid: process.pid, hub, current: currentId || null };
  const serialized = JSON.stringify(payload, null, 2) + '\n';
  // 변화 없으면 skip (pid/at 는 매번 바뀌므로 current 기준으로 diff 판단)
  let prev = null;
  try { prev = JSON.parse(readFileSync(HEARTBEAT_FILE, 'utf8')); } catch { /* noop */ }
  if (prev && prev.current === payload.current && prev.hub === payload.hub && prev.pid === payload.pid) {
    // 변화 없음 → 파일만 재기록 (commit 생략)
    writeFileSync(HEARTBEAT_FILE, serialized, 'utf8');
    return;
  }
  writeFileSync(HEARTBEAT_FILE, serialized, 'utf8');
  try {
    git(['add', `status/runners/${hub}.json`]);
    git(['commit', '-m', `chore(runner): ${hub} heartbeat · current=${payload.current || 'idle'}`]);
    git(['push', 'origin', 'HEAD:main']);
    log(`heartbeat pushed · current=${payload.current || 'idle'}`);
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message).trim().split('\n')[0];
    if (!/nothing to commit/i.test(msg)) log(`heartbeat push skip: ${msg}`);
  }
}

async function tick() {
  if (!acquireLock()) {
    log('lock 획득 실패 · 다른 러너 작동 중 (stale 10m 뒤 자동 해제)');
    return;
  }
  try {
    tryGitPull();
    heartbeat(null);
    const item = pickNext();
    if (!item) { log('큐 비어 있음 · 다음 폴 대기'); return; }
    log(`pick · ${item.id}`);
    heartbeat(item.id);

    const cwd = hubCwd();
    if (!cwd || !existsSync(cwd)) {
      log(`hub cwd 미설정/부재 · ${cwd} · claim blocked`);
      runClaim(item.id, 'blocked', `runner: cwd 부재 (${cwd})`);
      return;
    }

    runClaim(item.id, 'started', 'runner');
    const { exit, logFile } = runPrompt(item, cwd);

    // 허브가 이미 done/blocked/cancelled 를 올렸는지 확인 (덮어쓰기 금지)
    tryGitPull(); // 허브가 도중에 claim 을 올렸을 가능성 반영
    const post = readClaim(item.id);
    if (post && (post.state === 'done' || post.state === 'blocked' || post.state === 'cancelled')) {
      log(`claim 이미 ${post.state} (허브가 설정) · 덮어쓰지 않음`);
    } else if (exit === 0) {
      runClaim(item.id, 'done', `runner exit 0 · 로그: ${logFile}`);
    } else {
      runClaim(item.id, 'blocked', `runner exit ${exit} · 로그: ${logFile} · blocked_by:kyu`);
    }
    heartbeat(null);
  } finally {
    releaseLock();
  }
}

async function loop() {
  log(`loop 시작 · poll=${POLL_MS}ms · heartbeat=${HEARTBEAT_MS}ms · hub cwd=${hubCwd()}`);
  let lastHeartbeat = 0;
  for (;;) {
    try { await tick(); }
    catch (e) { log('tick 예외:', e.message); }
    if (ONCE) break;
    const now = Date.now();
    if (now - lastHeartbeat > HEARTBEAT_MS) {
      try { heartbeat(null); lastHeartbeat = now; } catch { /* noop */ }
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

loop().catch((e) => { log('loop fatal:', e.message); process.exit(1); });
