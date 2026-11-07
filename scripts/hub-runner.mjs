#!/usr/bin/env node
// scripts/hub-runner.mjs · 큐 자동 투입 러너 (M1-1105-S · 단일 프로세스 전부 처리)
//
// 교체 사유 (M2-1105-O 리포트 + Kyu 2026-11-07 실설치 로그):
//   - cwd=null → 러너가 아무 허브도 cwd 를 못 찾음 (hubs.json 에 cwd 없음 · build-hubs 가 매번 덮어씀).
//   - "cannot pull with rebase: unstaged changes" · "Cannot rebase onto multiple branches" — git pull 명시 안 함.
//   - 허브별 별도 프로세스 5 개 → 서로 push race + heartbeat 폭주. 단일 프로세스 안에서 git 을 직렬로 돌리는 게 안전.
//
// Usage:
//   node scripts/hub-runner.mjs --all             # 5 허브 상시 polling (60 s)
//   node scripts/hub-runner.mjs --all --once      # 1 tick 만
//   node scripts/hub-runner.mjs --hub m2          # 단일 허브 (디버그)
//   CLAUDE_BIN=<path> node scripts/hub-runner.mjs --all   # claude 바이너리 override
//
// cwd 지도: status/runner-config.json {hubs:{m0:{cwd}, ...}} — build-hubs 영향 X.
//
// 동작 요약:
//   1. tick 마다 safePull (주 process 직렬)
//   2. 각 허브마다 pickNext → busy 아니면 `claim started` 큐잉 + claude spawn (child 병렬)
//   3. claude 종료 후 `claim done|blocked` 큐잉 (덮어쓰기 금지: 허브가 이미 done/blocked/cancelled 올렸으면 skip)
//   4. 메인 루프의 claim-op 큐를 **한 번에 한 개** 만 drain (git 직렬 보장)
//   5. 5 분마다 `status/runners/all.json` 1 커밋 (heartbeat 폭주 방지)
//   6. git 안전: `git pull --rebase origin main` (branch 명시 → multiple branches 오류 제거). rebase 실패 → `rebase --abort`.
//                변경 범위는 `status/claims` · `status/runners` 로 한정 — 러너 스코프 밖 변경은 손 안 댐 (경고만).

import { execFileSync, spawn } from 'node:child_process';
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
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const RUNNER_HOME = join(homedir(), '.hub-runner');

const POLL_MS = 60 * 1000;
const STALE_LOCK_MS = 10 * 60 * 1000;
const HEARTBEAT_MS = 5 * 60 * 1000;
// M1-1105-T · claude_bin/model 은 runner-config.json 에서 로드 (override 우선순위: env > config.hubs[hub] > config). which claude 는 fallback 만.
const DEFAULT_CLAUDE_BIN = '/Applications/cmux.app/Contents/Resources/bin/claude';

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
const hubFlag = (() => {
  const i = argv.indexOf('--hub');
  return i >= 0 ? argv[i + 1] : null;
})();

if (!ALL && !hubFlag) {
  console.error('Usage: node scripts/hub-runner.mjs --all [--once] | --hub <id>');
  process.exit(2);
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

// §3 안전: 러너 스코프 (status/claims · status/runners · status/hubs.json) 외 변경은 손 안 댐.
const RUNNER_SCOPE_PREFIXES = ['status/claims/', 'status/runners/', 'status/hubs.json'];

function outOfScopeChanges() {
  try {
    // 주의: git() 헬퍼의 .trim() 은 첫 줄 선행 공백 (" M path") 을 삼켜서
    // XY 파싱이 어긋나기 때문에 porcelain 은 raw stdout 로 직접 읽는다.
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
    // --autostash: 커밋 안 된 러너 스코프 변경 (예: 아직 push 전인 all.json) 을 임시로 stash 후 복원.
    // branch 명시 (`origin main`) 로 "Cannot rebase onto multiple branches" 재발 방지.
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
  // M1-1105-T · 전역 claude_bin / model + 허브별 override 지원.
  const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  return {
    claude_bin: process.env.CLAUDE_BIN || raw.claude_bin || DEFAULT_CLAUDE_BIN,
    model: raw.model || 'opus',
    hubs: raw.hubs || {},
  };
}

// M1-1105-T · claude_bin 버전 캐시 (process 수명 내 1 회 호출). 404 모델 재발 디버깅용.
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
    // §5: 기존 started/in_progress (Kyu 수동 투입) 는 skip.
    if (!claim || claim.state === 'issued') return item;
  }
  return null;
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
  // scripts/claim.mjs 에 선택적 --blocked-by 인자 전달 (지원되지 않으면 note 안에 포함).
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

// claude 를 cwd 에서 spawn — 큐 파일 본문을 그대로 prompt 로 전달.
function spawnClaude(item, cwd, claudeBin, model) {
  const prompt = readFileSync(item.file, 'utf8');
  const logDir = join(RUNNER_HOME, item.hub);
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, `${item.id}.log`);
  const version = getClaudeVersion(claudeBin);
  const header = [
    `# hub-runner log · ${item.id}`,
    `started_at: ${ts()}`,
    `hub: ${item.hub}`,
    `cwd: ${cwd}`,
    `claude_bin: ${claudeBin}`,
    `claude_version: ${version}`,
    `model: ${model}`,
    `process_env_path: ${process.env.PATH || '(unset)'}`,
    `log: ${logFile}`,
    '--- stdout ---',
    '',
  ].join('\n');
  writeFileSync(logFile, header, 'utf8');

  log(item.hub, `spawn claude -p · ID=${item.id} · cwd=${cwd} · bin=${claudeBin} · ver=${version} · model=${model}`);
  return new Promise((resolve) => {
    const child = spawn(claudeBin, ['-p', prompt, '--model', model, '--dangerously-skip-permissions'], {
      cwd,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const outChunks = [];
    const errChunks = [];
    child.stdout.on('data', (c) => outChunks.push(c));
    child.stderr.on('data', (c) => errChunks.push(c));
    child.on('close', (code) => {
      const out = Buffer.concat(outChunks).toString();
      const err = Buffer.concat(errChunks).toString();
      writeFileSync(
        logFile,
        `${header}${out}\n--- stderr ---\n${err}\n--- exit ${code} ---\n`,
        'utf8',
      );
      resolve({ exit: code, logFile });
    });
    child.on('error', (e) => {
      writeFileSync(logFile, `${header}spawn error: ${e.message}\n--- exit -1 ---\n`, 'utf8');
      resolve({ exit: -1, logFile });
    });
  });
}

const busy = new Map(); // hub -> { id, startedAt }
const hubsToRun = ALL ? ['m0', 'm1', 'm2', 'm3', 'r0'] : [hubFlag];

// §4 heartbeat — status/runners/all.json 로 1 파일 · 5 분마다 commit.
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
    git(['commit', '-m', `chore(runner): heartbeat · ${hubsToRun.map((h) => `${h}=${payload.hubs[h].current || 'idle'}`).join(' · ')}`]);
    git(['push', 'origin', 'HEAD:main']);
    lastHeartbeatAt = now;
    log('', `heartbeat pushed`);
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message).trim().split('\n')[0];
    if (!/nothing to commit/i.test(msg)) {
      log('', `heartbeat push skip: ${msg}`);
    } else {
      // "nothing to commit" 도 lastHeartbeatAt 전진 — 변경 없으면 다음 5 분에 재시도.
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

      // M1-1105-T · 허브별 model override 가능.
      const model = cfg.model || config.model;
      // 자식 claude 는 메인 루프와 **병렬**로 돌지만, claim 커밋은 전부 queue drain 으로 직렬화.
      (async () => {
        const { exit, logFile } = await spawnClaude(item, cfg.cwd, config.claude_bin, model);
        busy.delete(hub);

        // 허브가 중간에 done/blocked/cancelled 올렸는지 확인 (덮어쓰기 금지)
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
    `시작 · mode=${ALL ? '--all' : `--hub ${hubFlag}`} · once=${ONCE} · poll=${POLL_MS}ms · claude=${cfg.claude_bin} · version=${ver} · model=${cfg.model} · PATH=${process.env.PATH || '(unset)'}`,
  );
  writeHeartbeat(true);
  for (;;) {
    try {
      await tick(hubsToRun);
    } catch (e) {
      log('', `tick 예외: ${e.message}`);
    }
    if (ONCE) {
      // 자식 claude 가 아직 돌고 있으면 전부 끝날 때까지 대기 (--once --all 셀프테스트용).
      while (busy.size > 0 || claimQueue.length > 0 || processingClaim) {
        await new Promise((r) => setTimeout(r, 1000));
      }
      // 마지막 heartbeat flush
      writeHeartbeat(true);
      break;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

loop().catch((e) => {
  log('', `loop fatal: ${e.message}`);
  process.exit(1);
});
