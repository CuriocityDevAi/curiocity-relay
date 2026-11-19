// scripts/lib/gh-runner-watchdog.mjs · M0-1119-T — Mac 수면 복귀 후 self-hosted runner "켜져있는데 일 안 함" 자동 재시작.
//
// 배경 (Kyu 11-19 13:07):
//   · 오늘 light(~/actions-runner-light) 75분 · heavy(~/actions-runner) 30분 둘 다
//     svc.sh status=Started 인데 job 을 안 가져감 (Mac 잠자기 후).
//   · ci-health 는 runner_idle alert 로 이미 감지하고 있으나 조치는 사람 몫이었다.
//   · 이 모듈 = 감지시 svc.sh stop && start 자동 수행 · 사람 손 제거.
//
// 설계 원칙:
//   · 호출: 허브 러너 tick 시작부 fire-and-forget (ci-background 와 같은 모양).
//     허브 본업(큐 투입 · 하트비트) blocking 금지 — 실패해도 조용히 흘러간다.
//   · 추가 API 호출 없음. ci-health 결과(getLatestCi) 를 재사용.
//   · 상태 = `.cache/gh-runner-watchdog-state.json` 에 1 파일. 허브 재기동과 무관.
//
// 판정 (stuck):
//   pool.queued > 0 AND pool.in_progress.length === 0 AND pool.oldest_queued_min >= N
//   (ci-health 의 `runner_idle` alert 조건과 동일 로직.)
//
// 조치:
//   `<svc.sh> stop && <svc.sh> start` (sh -c 로 체이닝 · timeout 30s)
//   · 같은 러너 30분/1회 상한 (`lastRestartAt`).
//   · 실행 중 job 이 있으면 (ci 의 in_progress) 절대 실행 안 함 → judgeStuck 에서 거름.
//   · 다음 회차에 상태 복귀 안 되면 "실패". 2회 연속 실패 → 더 안 하고 `gh_runner_alert` 플래그.
//
// 기록: `status/ci/runner-restarts-<WIB-date>.jsonl` · 한 줄 당 1 재시작.
//
// M0-1119-U — 실행 중 job 을 죽일 수 있는 경로 봉쇄 (R0C-1119-AH):
//   1. ci-health 가 queued 먼저 · in_progress 나중에 조회 → deadline/budget 로 partial 이면
//      queued 만 남고 in_progress 가 빔. repos_failed 에 들어간 repo 도 같은 공백.
//      또 latest 캐시가 오래됐으면 지금 돌고 있는 job 이 아직 반영 전.
//      → ciData 가 `partial` 이거나 `repos_failed.length>0` 이거나 `ci.data.at` 이 6분보다
//        오래되면 그 회차는 재시작 판정 통째 skip · warn 로그만.
//   2. stop 직전 안전망: 러너 폴더 (dirname(svc.sh)) 에 Runner.Worker 가 살아있으면 skip.
//      pgrep 호출은 execFile + 인자 배열 (셸 주입 방지).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const execFileAsync = promisify(execFile);

export const DEFAULT_STUCK_THRESHOLD_MIN = 8;
export const DEFAULT_COOLDOWN_MS = 30 * 60_000;
export const DEFAULT_RUNNER_PATHS = {
  'mac-heavy': '~/actions-runner/svc.sh',
  'mac-light': '~/actions-runner-light/svc.sh',
};
export const DEFAULT_MAX_FAILURES = 2;
export const DEFAULT_EXEC_TIMEOUT_MS = 30_000;
// M0-1119-U: ci.data.at 이 이보다 오래되면 "지금 돌고 있는 job 이 미반영" 가능 → skip.
export const DEFAULT_STALE_CACHE_MS = 6 * 60_000;
export const DEFAULT_WORKER_CHECK_TIMEOUT_MS = 3_000;
export const STATE_REL_PATH = join('.cache', 'gh-runner-watchdog-state.json');

// Module-level latest alert (also persisted in state file). Hub-runner heartbeat
// pulls from here via getLatestAlert() so all.json stays single-writer.
let latestAlert = null;

export function getLatestAlert() {
  return latestAlert;
}

export function _resetGhRunnerWatchdog() {
  latestAlert = null;
}

function expandHome(p) {
  if (!p) return p;
  if (p === '~') return homedir();
  if (p.startsWith('~/')) return join(homedir(), p.slice(2));
  return p;
}

function wibDateStr(ms) {
  // WIB = UTC+7. Reuse ci-history convention.
  const shifted = new Date(ms + 7 * 3600_000);
  return shifted.toISOString().slice(0, 10);
}

// M0-1119-U safety gate 1 (pure): ciData 가 믿을 수 있는가?
// partial · repos_failed · 오래된 캐시 중 하나라도 걸리면 in_progress 공백 가능 → skip.
export function isDataIncomplete(ciData, now, opts = {}) {
  const staleMs = opts.staleCacheMs ?? DEFAULT_STALE_CACHE_MS;
  if (!ciData) return { incomplete: true, reason: 'no-ci-data' };
  if (ciData.partial === true) return { incomplete: true, reason: 'data-partial' };
  if (Array.isArray(ciData.repos_failed) && ciData.repos_failed.length > 0) {
    return {
      incomplete: true,
      reason: 'data-repos-failed',
      repos_failed_n: ciData.repos_failed.length,
    };
  }
  if (ciData.at) {
    const atMs = new Date(ciData.at).getTime();
    if (Number.isFinite(atMs) && (now - atMs) > staleMs) {
      return { incomplete: true, reason: 'data-stale', age_ms: now - atMs };
    }
  }
  return { incomplete: false };
}

// M0-1119-U safety gate 2: Runner.Worker 가 러너 폴더에서 돌고 있는가?
// execFile + 인자 배열 (셸 없음 = 주입 없음). pgrep -f 는 ERE 패턴.
// exit 0 = 매칭 · exit 1 = 없음 · 기타 = 비정상.
async function defaultWorkerCheck(runnerDir) {
  try {
    await execFileAsync('pgrep', ['-f', `${runnerDir}.*Runner\\.Worker`], {
      timeout: DEFAULT_WORKER_CHECK_TIMEOUT_MS,
      maxBuffer: 256 * 1024,
    });
    return true;
  } catch (e) {
    if (e && e.code === 1) return false;  // no match — the expected "no worker" path
    throw e;                                // ENOENT / timeout / permission 등은 위로
  }
}

export async function hasRunningWorker(svcPath, opts = {}) {
  const runnerDir = dirname(expandHome(svcPath));
  const checkFn = opts.workerCheckFn || defaultWorkerCheck;
  try {
    return (await checkFn(runnerDir)) === true;
  } catch {
    // 안전측: 알 수 없음 → "있을 수 있음" 으로 보고 재시작 금지.
    return true;
  }
}

// Pure judge — exported for tests.
export function judgeStuck(ciData, kind, opts = {}) {
  const threshold = opts.thresholdMin ?? DEFAULT_STUCK_THRESHOLD_MIN;
  if (!ciData) return { stuck: false, reason: 'no-ci-data' };
  const pool = kind === 'mac-light' ? ciData.light : ciData.heavy;
  if (!pool) return { stuck: false, reason: 'no-pool' };
  if (!pool.queued || pool.queued <= 0) return { stuck: false, reason: 'no-queue' };
  // Safety: any job running → not stuck. Protects user work-in-flight.
  if (pool.in_progress && pool.in_progress.length > 0) {
    return { stuck: false, reason: 'job-running' };
  }
  const oldest = pool.oldest_queued_min;
  if (oldest == null || oldest < threshold) return { stuck: false, reason: 'below-threshold' };
  return {
    stuck: true,
    kind,
    queued: pool.queued,
    oldest_queued_min: oldest,
    oldest_queued_pr: pool.oldest_queued_pr || null,
  };
}

function emptyState() {
  return {
    lastRestartAt: {},         // {kind: ms}
    pendingVerification: {},   // {kind: bool} — 재시작 직후 아직 확인 못 한 상태
    consecutiveFailures: {},   // {kind: int}
    alerted: {},               // {kind: bool}
    alert: null,               // 최근 gh_runner_alert 전문 (없으면 null)
  };
}

function readState(stateFile) {
  try {
    if (!existsSync(stateFile)) return emptyState();
    const raw = JSON.parse(readFileSync(stateFile, 'utf8'));
    return {
      lastRestartAt: raw.lastRestartAt || {},
      pendingVerification: raw.pendingVerification || {},
      consecutiveFailures: raw.consecutiveFailures || {},
      alerted: raw.alerted || {},
      alert: raw.alert || null,
    };
  } catch {
    return emptyState();
  }
}

function writeState(stateFile, state) {
  try {
    mkdirSync(dirname(stateFile), { recursive: true });
    writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', 'utf8');
  } catch {
    // best-effort
  }
}

export function withinCooldown(state, kind, now, cooldownMs = DEFAULT_COOLDOWN_MS) {
  const last = state.lastRestartAt?.[kind];
  if (!last) return false;
  return (now - last) < cooldownMs;
}

function defaultRecord(repoRoot, rec) {
  try {
    const date = wibDateStr(new Date(rec.at).getTime());
    const file = join(repoRoot, 'status', 'ci', `runner-restarts-${date}.jsonl`);
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, JSON.stringify(rec) + '\n', 'utf8');
  } catch {
    // best-effort
  }
}

function defaultExec(svcPath, timeoutMs) {
  const abs = expandHome(svcPath);
  if (!existsSync(abs)) {
    return Promise.reject(new Error(`svc.sh not found: ${svcPath}`));
  }
  // stop && start as a single sh -c, so timeout bounds total wall time.
  return execFileAsync('sh', ['-c', `"${abs}" stop && "${abs}" start`], {
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });
}

// runOnce — call fire-and-forget each tick. Returns a plain summary (for tests).
// opts:
//   · ciData: result of getLatestCi()?.data (or null) — the inner shape with heavy/light.
//   · repoRoot: relay repo root.
//   · runnerPaths: { 'mac-heavy': '~/.../svc.sh', 'mac-light': '~/.../svc.sh' }
//   · thresholdMin, cooldownMs, maxFailures, execTimeoutMs: knobs.
//   · stateFile: override default path (tests).
//   · execFn(svcPath, timeoutMs): injectable — resolves on exec ok, rejects on fail.
//   · workerCheckFn(runnerDir): injectable — returns true if Runner.Worker alive (M0-1119-U).
//   · recordFn(record): injectable jsonl append.
//   · staleCacheMs: ci.data.at 허용 최대 지연 (M0-1119-U · 기본 6분).
//   · now: injectable clock.
//   · warn(msg): injectable logger.
export async function runOnce(opts = {}) {
  const repoRoot = opts.repoRoot;
  if (!repoRoot) throw new Error('gh-runner-watchdog.runOnce: repoRoot required');
  const ciData = opts.ciData ?? null;
  const runnerPaths = opts.runnerPaths || DEFAULT_RUNNER_PATHS;
  const thresholdMin = opts.thresholdMin ?? DEFAULT_STUCK_THRESHOLD_MIN;
  const cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const maxFailures = opts.maxFailures ?? DEFAULT_MAX_FAILURES;
  const execTimeoutMs = opts.execTimeoutMs ?? DEFAULT_EXEC_TIMEOUT_MS;
  const staleCacheMs = opts.staleCacheMs ?? DEFAULT_STALE_CACHE_MS;
  const stateFile = opts.stateFile || join(repoRoot, STATE_REL_PATH);
  const execFn = opts.execFn || ((svc, t) => defaultExec(svc, t));
  const workerCheckFn = opts.workerCheckFn || defaultWorkerCheck;
  const recordFn = opts.recordFn || ((rec) => defaultRecord(repoRoot, rec));
  const now = opts.now ?? Date.now();
  const warn = opts.warn || (() => {});

  const state = readState(stateFile);
  const actions = [];

  // M0-1119-U safety gate 1: ciData 가 불완전하면 그 회차 재시작 통째 skip (warn 만).
  // partial / repos_failed / stale cache 는 in_progress 공백을 만들 수 있고 → 돌고 있는 job 을 죽일 수 있다.
  const dataCheck = isDataIncomplete(ciData, now, { staleCacheMs });
  if (dataCheck.incomplete) {
    warn(`[gh-runner-watchdog] skip restart: ${dataCheck.reason}`);
    for (const kind of ['mac-heavy', 'mac-light']) {
      if (!runnerPaths[kind]) continue;
      actions.push({ kind, action: 'skip', reason: dataCheck.reason });
    }
    writeState(stateFile, state);
    latestAlert = state.alert || null;
    return { actions, alert: state.alert || null };
  }

  for (const kind of ['mac-heavy', 'mac-light']) {
    const svc = runnerPaths[kind];
    if (!svc) continue;

    const judgment = judgeStuck(ciData, kind, { thresholdMin });

    if (!judgment.stuck) {
      // Not stuck now. Either we never were, or a previous restart recovered.
      // Reset per-kind trackers so the next stuck event starts fresh.
      const hadAnyState =
        state.pendingVerification[kind] ||
        (state.consecutiveFailures[kind] || 0) > 0 ||
        state.alerted[kind];
      if (hadAnyState) {
        state.pendingVerification[kind] = false;
        state.consecutiveFailures[kind] = 0;
        state.alerted[kind] = false;
      }
      actions.push({ kind, action: 'skip', reason: judgment.reason });
      continue;
    }

    // Stuck. Respect cooldown.
    if (withinCooldown(state, kind, now, cooldownMs)) {
      actions.push({ kind, action: 'skip', reason: 'cooldown' });
      continue;
    }

    // Cooldown elapsed. If a previous restart was pending verification, it did not
    // clear the stuck state → count as failure.
    if (state.pendingVerification[kind]) {
      state.pendingVerification[kind] = false;
      state.consecutiveFailures[kind] = (state.consecutiveFailures[kind] || 0) + 1;
    }

    const failures = state.consecutiveFailures[kind] || 0;
    if (failures >= maxFailures) {
      if (!state.alerted[kind]) {
        state.alerted[kind] = true;
        state.alert = {
          at: new Date(now).toISOString(),
          kind,
          reason: `${failures} consecutive restart failures · runner stuck (queued=${judgment.queued}, oldest_queued_min=${judgment.oldest_queued_min})`,
          consecutive_failures: failures,
          oldest_queued_pr: judgment.oldest_queued_pr,
        };
        try { recordFn({ at: state.alert.at, kind, svc, event: 'alert', reason: state.alert.reason }); } catch {}
      }
      actions.push({ kind, action: 'skip', reason: 'max-failures', failures });
      continue;
    }

    // M0-1119-U safety gate 2: stop 직전 Runner.Worker 생존 확인. ci-health 가 놓친 in_progress 보호.
    let workerAlive = false;
    try {
      workerAlive = await hasRunningWorker(svc, { workerCheckFn });
    } catch (e) {
      // hasRunningWorker 자체는 삼키지만, 방어적으로 한 번 더.
      workerAlive = true;
      warn(`[gh-runner-watchdog] ${kind} worker-check 예외: ${e.message || e}`);
    }
    if (workerAlive) {
      warn(`[gh-runner-watchdog] ${kind} skip restart: Runner.Worker alive`);
      actions.push({ kind, action: 'skip', reason: 'worker-running' });
      continue;
    }

    // Attempt restart.
    const at = new Date(now).toISOString();
    let execResult;
    try {
      await execFn(svc, execTimeoutMs);
      execResult = { ok: true };
      state.pendingVerification[kind] = true;
    } catch (e) {
      const errMsg = ((e && (e.message || String(e))) || '').split('\n')[0];
      execResult = { ok: false, error: errMsg };
      // exec failure counts as a failure immediately (no verification will come).
      state.consecutiveFailures[kind] = (state.consecutiveFailures[kind] || 0) + 1;
      state.pendingVerification[kind] = false;
      if (state.consecutiveFailures[kind] >= maxFailures && !state.alerted[kind]) {
        state.alerted[kind] = true;
        state.alert = {
          at,
          kind,
          reason: `exec failed ${state.consecutiveFailures[kind]}x: ${errMsg}`,
          consecutive_failures: state.consecutiveFailures[kind],
          oldest_queued_pr: judgment.oldest_queued_pr,
        };
      }
      warn(`[gh-runner-watchdog] ${kind} exec 실패: ${errMsg}`);
    }

    state.lastRestartAt[kind] = now;

    try {
      recordFn({
        at,
        kind,
        svc,
        reason: `queued=${judgment.queued} oldest_queued_min=${judgment.oldest_queued_min} pr=${judgment.oldest_queued_pr || 'unknown'}`,
        result: execResult,
        consecutive_failures: state.consecutiveFailures[kind] || 0,
      });
    } catch (e) {
      warn(`[gh-runner-watchdog] record 실패: ${e.message || e}`);
    }

    actions.push({
      kind,
      action: 'restart',
      result: execResult,
      consecutive_failures: state.consecutiveFailures[kind] || 0,
    });
  }

  // Sync alert state: if no kind is in alerted state, clear top-level alert.
  const anyAlerted = Object.values(state.alerted || {}).some(Boolean);
  if (!anyAlerted) state.alert = null;

  writeState(stateFile, state);
  latestAlert = state.alert || null;
  return { actions, alert: state.alert || null };
}
