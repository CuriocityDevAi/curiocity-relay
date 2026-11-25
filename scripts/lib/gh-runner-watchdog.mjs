// scripts/lib/gh-runner-watchdog.mjs · M1-1125-G — fork 러너 감시 + sleep 복귀 재연결 + partial-but-safe.
//
// M0-1119-T 원본:
//   · Mac 잠자기 복귀 후 storeport 러너(heavy/light) "켜져있는데 일 안 함" 자동 재시작 (svc.sh stop&&start).
//   · M0-1119-U: data-partial / repos_failed / stale cache → 재시작 통째 skip.
//
// M1-1125-G 추가 (REQ1~4):
//   1. fork 러너 2대(fork-heavy · fork-light) 감시 목록 추가. storeport 2대 유지.
//   2. sleep gap 감지 시 GitHub API 로 offline 러너 확인 → launchctl kickstart -k.
//      · Runner.Worker 살아있는 바쁜 러너는 건드리지 않음.
//      · 호출 예산: 같은 repo 는 1 호출 캐싱.
//   3. data-partial 일 때 "GH offline + in_progress=0 + Runner.Worker 없음" → partial-but-safe 재시작.
//   4. selftest: fork 목록 · sleep 복귀 트리거 · busy 제외 · partial-but-safe.
//
// 판정 (stuck, storeport 전용):
//   pool.queued > 0 AND pool.in_progress.length === 0 AND pool.oldest_queued_min >= N
//   fork 러너는 별도 CI pool 없음 → judgeStuck = no-pool → stuck 경로 skip.
//   sleep 복귀 경로(REQ2) · partial-but-safe(REQ3) 는 fork 포함 전체 대상.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir, userInfo } from 'node:os';

const execFileAsync = promisify(execFile);

export const DEFAULT_STUCK_THRESHOLD_MIN = 8;
export const DEFAULT_COOLDOWN_MS = 30 * 60_000;
// storeport 2대 + fork 2대
export const DEFAULT_RUNNER_PATHS = {
  'mac-heavy': '~/actions-runner/svc.sh',
  'mac-light': '~/actions-runner-light/svc.sh',
  'fork-heavy': '~/actions-runner-fork/svc.sh',
  'fork-light': '~/actions-runner-fork-light/svc.sh',
};
// launchd 서비스 레이블 — launchctl kickstart -k gui/<uid>/<label> 에 사용.
export const DEFAULT_RUNNER_LAUNCHD_LABELS = {
  'mac-heavy': 'actions.runner.CuriocityDevAi-storeport.Youngkyus-MacBook-Pro-M1',
  'mac-light': 'actions.runner.CuriocityDevAi-storeport.curiocity-mac-light',
  'fork-heavy': 'actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork',
  'fork-light': 'actions.runner.CuriocityDevAi-agilo-medusa-pos-fork.curiocity-mac-fork-light',
};
// GitHub Actions runner 이름 + 소속 repo — GH API 조회용.
export const DEFAULT_RUNNER_GH_NAMES = {
  'mac-heavy': { repo: 'CuriocityDevAi/storeport', name: 'Youngkyus-MacBook-Pro-M1' },
  'mac-light': { repo: 'CuriocityDevAi/storeport', name: 'curiocity-mac-light' },
  'fork-heavy': { repo: 'CuriocityDevAi/agilo-medusa-pos-fork', name: 'curiocity-mac-fork' },
  'fork-light': { repo: 'CuriocityDevAi/agilo-medusa-pos-fork', name: 'curiocity-mac-fork-light' },
};
export const DEFAULT_MAX_FAILURES = 2;
export const DEFAULT_EXEC_TIMEOUT_MS = 30_000;
export const DEFAULT_GH_API_TIMEOUT_MS = 10_000;
// M0-1119-U: ci.data.at 이 이보다 오래되면 "지금 돌고 있는 job 이 미반영" 가능 → skip.
export const DEFAULT_STALE_CACHE_MS = 6 * 60_000;
export const DEFAULT_WORKER_CHECK_TIMEOUT_MS = 3_000;
export const STATE_REL_PATH = join('.cache', 'gh-runner-watchdog-state.json');

// CI pool 키 매핑 — storeport 전용. fork 종류는 null → judgeStuck = no-pool.
const POOL_MAP = { 'mac-heavy': 'heavy', 'mac-light': 'light' };

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

// M1-1125-G: GitHub API 로 repo 의 self-hosted runner 목록 조회 (gh CLI 사용).
// 반환: Array<{ id, name, status: 'online'|'offline', busy: boolean }>
export async function defaultFetchRunnerStatuses(repo, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_GH_API_TIMEOUT_MS;
  const { stdout } = await execFileAsync('gh', ['api', `repos/${repo}/actions/runners`], {
    timeout: timeoutMs,
    maxBuffer: 256 * 1024,
  });
  const data = JSON.parse(stdout);
  return (data.runners || []).map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    busy: r.busy || false,
  }));
}

// M1-1125-G: launchctl kickstart -k gui/<uid>/<label> 로 launchd 서비스 강제 재시작.
export async function defaultKickstart(label, uid, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_EXEC_TIMEOUT_MS;
  return execFileAsync('launchctl', ['kickstart', '-k', `gui/${uid}/${label}`], {
    timeout: timeoutMs,
    maxBuffer: 256 * 1024,
  });
}

// Pure judge — exported for tests.
// M1-1125-G: POOL_MAP 사용 → fork 종류는 no-pool 반환 (storeport 풀 오용 방지).
export function judgeStuck(ciData, kind, opts = {}) {
  const threshold = opts.thresholdMin ?? DEFAULT_STUCK_THRESHOLD_MIN;
  if (!ciData) return { stuck: false, reason: 'no-ci-data' };
  const poolKey = POOL_MAP[kind];
  if (!poolKey) return { stuck: false, reason: 'no-pool' };
  const pool = ciData[poolKey];
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
//   · runnerPaths: { 'mac-heavy': '~/.../svc.sh', ... }
//   · runnerLabels: { 'mac-heavy': 'actions.runner.…', ... } — launchd service labels (M1-1125-G).
//   · runnerGhNames: { 'mac-heavy': { repo, name }, ... } — GitHub API runner info (M1-1125-G).
//   · sleepGapMs: tick 간 sleep 간격 ms (> 0 이면 sleep-wake 복귀 경로 실행, M1-1125-G).
//   · thresholdMin, cooldownMs, maxFailures, execTimeoutMs: knobs.
//   · stateFile: override default path (tests).
//   · execFn(svcPath, timeoutMs): injectable — svc.sh stop&&start.
//   · workerCheckFn(runnerDir): injectable — returns true if Runner.Worker alive.
//   · fetchRunnerStatusesFn(repo): injectable — GitHub API runner list (M1-1125-G).
//   · kickstartFn(label, uid, opts): injectable — launchctl kickstart -k (M1-1125-G).
//   · uid: OS user UID for launchctl (M1-1125-G, default: os.userInfo().uid).
//   · recordFn(record): injectable jsonl append.
//   · staleCacheMs: ci.data.at 허용 최대 지연.
//   · now: injectable clock.
//   · warn(msg): injectable logger.
export async function runOnce(opts = {}) {
  const repoRoot = opts.repoRoot;
  if (!repoRoot) throw new Error('gh-runner-watchdog.runOnce: repoRoot required');
  const ciData = opts.ciData ?? null;
  const runnerPaths = opts.runnerPaths || DEFAULT_RUNNER_PATHS;
  const runnerLabels = opts.runnerLabels || DEFAULT_RUNNER_LAUNCHD_LABELS;
  const runnerGhNames = opts.runnerGhNames || DEFAULT_RUNNER_GH_NAMES;
  const sleepGapMs = opts.sleepGapMs ?? 0;
  const thresholdMin = opts.thresholdMin ?? DEFAULT_STUCK_THRESHOLD_MIN;
  const cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const maxFailures = opts.maxFailures ?? DEFAULT_MAX_FAILURES;
  const execTimeoutMs = opts.execTimeoutMs ?? DEFAULT_EXEC_TIMEOUT_MS;
  const staleCacheMs = opts.staleCacheMs ?? DEFAULT_STALE_CACHE_MS;
  const stateFile = opts.stateFile || join(repoRoot, STATE_REL_PATH);
  const execFn = opts.execFn || ((svc, t) => defaultExec(svc, t));
  const workerCheckFn = opts.workerCheckFn || defaultWorkerCheck;
  // null 로 두면 sleep-wake · partial-but-safe 비활성. hub-runner 가 명시적으로 주입.
  const fetchRunnerStatusesFn = opts.fetchRunnerStatusesFn ?? null;
  const kickstartFn = opts.kickstartFn ?? null;
  const uid = opts.uid ?? (() => { try { return userInfo().uid; } catch { return 502; } })();
  const recordFn = opts.recordFn || ((rec) => defaultRecord(repoRoot, rec));
  const now = opts.now ?? Date.now();
  const warn = opts.warn || (() => {});

  const state = readState(stateFile);
  const actions = [];

  // GH API 결과 캐시 — 같은 repo 를 sleep-wake · partial-but-safe 에서 중복 호출 방지.
  const _repoCache = new Map();
  async function getGhStatusFor(kind) {
    if (!fetchRunnerStatusesFn) return null;
    const ghInfo = runnerGhNames[kind];
    if (!ghInfo) return null;
    if (!_repoCache.has(ghInfo.repo)) {
      try {
        const list = await fetchRunnerStatusesFn(ghInfo.repo);
        _repoCache.set(ghInfo.repo, list);
      } catch (e) {
        warn(`[gh-runner-watchdog] GH API 실패 (${ghInfo.repo}): ${e.message || e}`);
        _repoCache.set(ghInfo.repo, null);
      }
    }
    const list = _repoCache.get(ghInfo.repo);
    return list?.find((r) => r.name === ghInfo.name) || null;
  }

  // M1-1125-G REQ2: sleep 복귀 후 offline 러너 launchctl kickstart -k.
  // sleepGapMs > 0 이고 kickstartFn 이 주입된 tick 에만 실행. kickstart 성공 시 lastRestartAt 세팅 → stuck 경로 cooldown 처리.
  if (sleepGapMs > 0 && kickstartFn) {
    for (const kind of Object.keys(runnerPaths)) {
      const svc = runnerPaths[kind];
      if (!svc) continue;
      const label = runnerLabels[kind];
      if (!label) continue;

      const ghStatus = await getGhStatusFor(kind);
      if (!ghStatus || ghStatus.status !== 'offline') {
        actions.push({ kind, action: 'skip', reason: 'wake-online', event: 'wake' });
        continue;
      }

      // M0-1119-U 안전: Runner.Worker 살아있으면 건드리지 않음.
      let workerAlive = false;
      try {
        workerAlive = await hasRunningWorker(svc, { workerCheckFn });
      } catch {
        workerAlive = true;
      }
      if (workerAlive) {
        warn(`[gh-runner-watchdog] wake: ${kind} Runner.Worker alive — skip kickstart`);
        actions.push({ kind, action: 'skip', reason: 'wake-worker-running', event: 'wake' });
        continue;
      }

      const at = new Date(now).toISOString();
      let kickResult;
      try {
        await kickstartFn(label, uid, { timeoutMs: execTimeoutMs });
        kickResult = { ok: true };
        // cooldown 등록: 이 tick 의 stuck 경로가 중복 재시작하지 않도록.
        state.lastRestartAt[kind] = now;
      } catch (e) {
        const errMsg = ((e && (e.message || String(e))) || '').split('\n')[0];
        kickResult = { ok: false, error: errMsg };
        warn(`[gh-runner-watchdog] wake: ${kind} kickstart 실패: ${errMsg}`);
      }

      try {
        recordFn({
          at,
          kind,
          label,
          reason: `sleep-wake recovery · gap_ms=${sleepGapMs} · gh_status=offline`,
          event: 'wake',
          result: kickResult,
        });
      } catch {}

      actions.push({ kind, action: 'kickstart', event: 'wake', result: kickResult });
    }
  }

  // M0-1119-U safety gate 1: ciData 가 불완전하면 처리 분기.
  // partial / repos_failed / stale cache 는 in_progress 공백을 만들 수 있고 → 돌고 있는 job 을 죽일 수 있다.
  const dataCheck = isDataIncomplete(ciData, now, { staleCacheMs });
  if (dataCheck.incomplete) {
    if (dataCheck.reason === 'data-partial' && fetchRunnerStatusesFn) {
      // M1-1125-G REQ3: partial-but-safe — GH offline + in_progress=0 + Runner.Worker 없음이면 재시작 허용.
      for (const kind of Object.keys(runnerPaths)) {
        const svc = runnerPaths[kind];
        if (!svc) continue;

        const ghStatus = await getGhStatusFor(kind);
        if (!ghStatus || ghStatus.status !== 'offline') {
          warn(`[gh-runner-watchdog] partial skip: ${kind} gh_status=${ghStatus?.status ?? 'unknown'}`);
          actions.push({ kind, action: 'skip', reason: 'data-partial' });
          continue;
        }

        // partial ciData 의 in_progress 가 비어있지 않으면 (일부라도) 건드리지 않음.
        const poolKey = POOL_MAP[kind];
        const pool = poolKey ? ciData?.[poolKey] : null;
        if (pool?.in_progress?.length > 0) {
          warn(`[gh-runner-watchdog] partial skip: ${kind} in_progress not empty`);
          actions.push({ kind, action: 'skip', reason: 'data-partial' });
          continue;
        }

        // M0-1119-U 안전: Runner.Worker 생존 확인.
        let workerAlive = false;
        try {
          workerAlive = await hasRunningWorker(svc, { workerCheckFn });
        } catch {
          workerAlive = true;
        }
        if (workerAlive) {
          warn(`[gh-runner-watchdog] partial skip: ${kind} Runner.Worker alive`);
          actions.push({ kind, action: 'skip', reason: 'worker-running' });
          continue;
        }

        // cooldown · failure tracking — 기존 stuck 경로와 동일 로직.
        if (withinCooldown(state, kind, now, cooldownMs)) {
          actions.push({ kind, action: 'skip', reason: 'cooldown' });
          continue;
        }

        if (state.pendingVerification[kind]) {
          state.pendingVerification[kind] = false;
          state.consecutiveFailures[kind] = (state.consecutiveFailures[kind] || 0) + 1;
        }

        const pFailures = state.consecutiveFailures[kind] || 0;
        if (pFailures >= maxFailures) {
          actions.push({ kind, action: 'skip', reason: 'max-failures', failures: pFailures });
          continue;
        }

        const at = new Date(now).toISOString();
        let execResult;
        try {
          await execFn(svc, execTimeoutMs);
          execResult = { ok: true };
          state.pendingVerification[kind] = true;
        } catch (e) {
          const errMsg = ((e && (e.message || String(e))) || '').split('\n')[0];
          execResult = { ok: false, error: errMsg };
          state.consecutiveFailures[kind] = (state.consecutiveFailures[kind] || 0) + 1;
          state.pendingVerification[kind] = false;
          warn(`[gh-runner-watchdog] partial-but-safe exec 실패: ${kind} ${errMsg}`);
        }
        state.lastRestartAt[kind] = now;

        try {
          recordFn({
            at, kind, svc,
            reason: `partial-but-safe · gh_status=offline · in_progress=0`,
            result: execResult,
            consecutive_failures: state.consecutiveFailures[kind] || 0,
          });
        } catch {}

        actions.push({
          kind,
          action: 'restart',
          reason: 'partial-but-safe',
          result: execResult,
          consecutive_failures: state.consecutiveFailures[kind] || 0,
        });
      }
    } else {
      // data-repos-failed · data-stale · no-ci-data · fetchRunnerStatusesFn 미주입 partial: 기존 동작 유지 — 통째 skip.
      warn(`[gh-runner-watchdog] skip restart: ${dataCheck.reason}`);
      for (const kind of Object.keys(runnerPaths)) {
        if (!runnerPaths[kind]) continue;
        actions.push({ kind, action: 'skip', reason: dataCheck.reason });
      }
    }
    writeState(stateFile, state);
    latestAlert = state.alert || null;
    return { actions, alert: state.alert || null };
  }

  // 정상 경로: stuck 판정 → svc.sh stop&&start.
  for (const kind of Object.keys(runnerPaths)) {
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
