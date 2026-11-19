// scripts/lib/ci-health.mjs · M0-1119-I/J/K — storeport + fork CI 건강 조회 + 완료 job 기록
//
// 핵심 원칙:
//   · 분류 = job API 의 labels + runner_name (run 의 runner_labels 는 존재하지 않음).
//   · 기록 범위 = `updated=>=since` 로 필터 (오래 걸린 run 누락 방지) · 완료된 run 의 모든 job.
//   · wait_min = job.created_at → job.started_at.
//   · 날짜 = job.completed_at 의 WIB.
//   · --paginate 제거 (per_page=100).
//   · 조회 범위 = CuriocityDevAi/storeport + fork CuriocityDevAi/agilo-medusa-pos-fork.
//   · 비용 = cloud_cost_est_usd (추정 · 단가 상수 ci-history.mjs).
//
// M0-1119-J 추가:
//   REQ1: 이미 기록한 run id 는 메모리 캐시(seenCompletedRunIds)로 jobs 재조회 안 함.
//   REQ1: 1회 조회 API 호출 수 상한(default 40). 넘으면 다음 회차로 미룸.
//   REQ4: queued run 은 jobs 호출로 labels 분류 (heavy / light / cloud).
//   REQ4: fork 접근 실패(404 등) 시 1회 경고 후 그날은 건너뜀.
//   REQ4: `created=>=` → `updated=>=`.
//
// M0-1119-K 추가:
//   REQ2: 상태(queued/in_progress/runner) 조회 먼저 · ≤10초 목표 · ci 블록 채움.
//         기록(completed jobs)은 남은 deadline 안에서만 · 한 번에 N≤10 run.
//   REQ3: 기록 조회 커서: 첫 실행은 최근 2시간 · 이후는 마지막 기록 시각부터.
//         커서 파일: .cache/ci-history-cursor.json.
//   REQ4: deadline 초과 시에도 상태 부분 보존 · ci.partial:true 로 표시.

import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifyRunnerKind,
  appendJobs,
  summarizeToday,
  jobToRecord,
  getWibDayBoundary,
  getWibDateStr,
} from './ci-history.mjs';

const execFileAsync = promisify(execFile);

const DEFAULT_REPOS = [
  'CuriocityDevAi/storeport',
  'CuriocityDevAi/agilo-medusa-pos-fork',
];
const PER_REPO_TIMEOUT_MS = 10_000;
const DEFAULT_LOOKBACK_MIN = 30;
const DEFAULT_API_BUDGET = 40;
// M0-1119-K: state must complete within this budget; history gets the rest
const STATE_DEADLINE_MS = 10_000;
// M0-1119-K: max completed runs to process per invocation
const HISTORY_MAX_RUNS_PER_CALL = 10;
// M0-1119-K: first-run lookback window for history cursor
const HISTORY_FIRST_LOOKBACK_MS = 2 * 60 * 60_000; // 2 hours
// M0-1119-K: cursor file path (relative to repoRoot)
const CURSOR_REL_PATH = join('.cache', 'ci-history-cursor.json');

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(HERE, '..', '..');

const seenCompletedRunIds = new Set();
const repoDailySkip = new Map();
const repoWarned = new Set();

export function _resetCiHealthCache() {
  seenCompletedRunIds.clear();
  repoDailySkip.clear();
  repoWarned.clear();
}

// ---- Cursor helpers (M0-1119-K REQ3) ----

function readCursor(repoRoot) {
  try {
    const path = join(repoRoot, CURSOR_REL_PATH);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function writeCursor(repoRoot, cursor) {
  try {
    const dir = join(repoRoot, '.cache');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(repoRoot, CURSOR_REL_PATH), JSON.stringify(cursor, null, 2), 'utf8');
  } catch {
    // best-effort
  }
}

export function getHistorySince(repoRoot) {
  const cursor = readCursor(repoRoot);
  if (cursor && cursor.last_completed_at) {
    return new Date(cursor.last_completed_at);
  }
  // first run: last 2 hours
  return new Date(Date.now() - HISTORY_FIRST_LOOKBACK_MS);
}

export function updateHistoryCursor(repoRoot, completedRecords) {
  if (!completedRecords || completedRecords.length === 0) return;
  const times = completedRecords
    .map((r) => r.completed_at)
    .filter(Boolean)
    .map((s) => new Date(s).getTime())
    .filter((t) => !isNaN(t));
  if (times.length === 0) return;
  const latest = Math.max(...times);
  writeCursor(repoRoot, { last_completed_at: new Date(latest).toISOString() });
}

// ---- Internal helpers ----

async function defaultExecFn(endpoint) {
  const { stdout } = await execFileAsync('gh', ['api', endpoint, '-H', 'Accept: application/vnd.github+json'], {
    timeout: PER_REPO_TIMEOUT_MS,
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

function makeBudget(max) {
  return { used: 0, max, overflow: false };
}

function budgetCheck(budget) {
  if (budget.used >= budget.max) {
    budget.overflow = true;
    return false;
  }
  budget.used++;
  return true;
}

function minutesSince(iso) {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
}

function extractPr(run) {
  if (run.pull_requests && run.pull_requests.length > 0) return `#${run.pull_requests[0].number}`;
  return run.head_branch || 'unknown';
}

function classifyFromJobs(jobs) {
  let hasLight = false;
  let hasHeavy = false;
  let hasCloud = false;
  for (const job of jobs) {
    const k = classifyRunnerKind(job.labels || [], job.runner_name || null);
    if (k === 'mac-light') hasLight = true;
    else if (k === 'mac-heavy') hasHeavy = true;
    else hasCloud = true;
  }
  if (hasHeavy) return 'mac-heavy';
  if (hasLight) return 'mac-light';
  if (hasCloud) return 'cloud';
  return 'mac-heavy';
}

async function collectInProgress(execFn, repo, budget) {
  if (!budgetCheck(budget)) return [];
  const data = await execFn(`repos/${repo}/actions/runs?status=in_progress&per_page=100`);
  const runs = (data && data.workflow_runs) || [];
  const active = [];
  for (const run of runs) {
    if (!budgetCheck(budget)) break;
    try {
      const jobsData = await execFn(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100&filter=latest`);
      const jobs = (jobsData && jobsData.jobs) || [];
      for (const job of jobs) {
        if (job.status !== 'in_progress') continue;
        const kind = classifyRunnerKind(job.labels || [], job.runner_name);
        const currentStep = (job.steps || [])
          .filter((s) => s.status === 'in_progress')
          .map((s) => s.name)[0] || null;
        active.push({
          repo,
          pr: extractPr(run),
          job: job.name,
          step: currentStep,
          running_min: minutesSince(job.started_at),
          runner: job.runner_name || null,
          kind,
        });
      }
    } catch {
      active.push({
        repo, pr: extractPr(run), job: run.name || String(run.workflow_id),
        step: null, running_min: minutesSince(run.run_started_at || run.created_at),
        runner: null, kind: 'unknown',
      });
    }
  }
  return active;
}

async function collectQueued(execFn, repo, budget) {
  if (!budgetCheck(budget)) return [];
  const data = await execFn(`repos/${repo}/actions/runs?status=queued&per_page=100`);
  const runs = (data && data.workflow_runs) || [];
  const out = [];
  for (const run of runs) {
    let kind = 'mac-heavy';
    if (budgetCheck(budget)) {
      try {
        const jobsData = await execFn(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100&filter=latest`);
        const jobs = (jobsData && jobsData.jobs) || [];
        if (jobs.length > 0) kind = classifyFromJobs(jobs);
      } catch {
        // label 조회 실패 → 기본 heavy
      }
    }
    out.push({
      repo, id: run.id, name: run.name || null,
      pr: extractPr(run),
      pr_num: (run.pull_requests && run.pull_requests[0]?.number) || null,
      created_at: run.created_at || null,
      queued_min: minutesSince(run.created_at),
      kind,
    });
  }
  return out;
}

// M0-1119-K: collectCompletedJobs now accepts maxRuns to limit per-invocation API calls
async function collectCompletedJobs(execFn, repo, since, budget, maxRuns) {
  if (!budgetCheck(budget)) return [];
  const sinceParam = since ? `&updated=>=${encodeURIComponent(since.toISOString())}` : '';
  const data = await execFn(`repos/${repo}/actions/runs?status=completed&per_page=100${sinceParam}`);
  const runs = (data && data.workflow_runs) || [];
  const records = [];
  let processed = 0;
  for (const run of runs) {
    if (maxRuns != null && processed >= maxRuns) break;
    const runKey = `${repo}:${run.id}`;
    if (seenCompletedRunIds.has(runKey)) continue;
    if (!budgetCheck(budget)) break;
    processed++;
    try {
      const jobsData = await execFn(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100&filter=latest`);
      const jobs = (jobsData && jobsData.jobs) || [];
      let allCompleted = true;
      for (const job of jobs) {
        if (job.status !== 'completed' || !job.completed_at) { allCompleted = false; continue; }
        records.push(jobToRecord(job, run));
      }
      if (allCompleted) seenCompletedRunIds.add(runKey);
    } catch {
      // 다음 tick 재시도
    }
  }
  return records;
}

function isMissingRepoError(err) {
  const msg = (err && (err.message || String(err))) || '';
  return msg.includes('404') || msg.toLowerCase().includes('not found');
}

// M0-1119-K: Collect state only (queued + in_progress + runners) — fast, ≤STATE_DEADLINE_MS
async function collectStateForRepo(execFn, repo, budget, warn) {
  const todayStr = getWibDateStr();
  if (repoDailySkip.get(repo) === todayStr) {
    return { repo, queued: [], in_progress: [], runners: null, error: null, skipped: 'daily-skip' };
  }

  const out = { repo, queued: [], in_progress: [], runners: null, error: null };
  try {
    out.queued = await collectQueued(execFn, repo, budget);
    out.in_progress = await collectInProgress(execFn, repo, budget);
    if (budgetCheck(budget)) {
      try {
        const runnersData = await execFn(`repos/${repo}/actions/runners?per_page=100`);
        const all = (runnersData && runnersData.runners) || [];
        const classify = (r) => classifyRunnerKind((r.labels || []).map((l) => l.name || l), r.name);
        const heavy = all.filter((r) => classify(r) === 'mac-heavy');
        const light = all.filter((r) => classify(r) === 'mac-light');
        out.runners = {
          heavy_online: heavy.filter((r) => r.status === 'online').length,
          heavy_busy: heavy.filter((r) => r.busy).length,
          light_online: light.filter((r) => r.status === 'online').length,
        };
      } catch {
        out.runners = null;
      }
    }
  } catch (e) {
    if (isMissingRepoError(e)) {
      repoDailySkip.set(repo, todayStr);
      if (!repoWarned.has(repo)) {
        repoWarned.add(repo);
        warn(`[ci-health] repo 접근 실패 (오늘 재시도 안함): ${repo} · ${(e.message || e).toString().split('\n')[0]}`);
      }
      out.skipped = 'missing-repo';
    } else {
      out.error = e.message || String(e);
    }
  }
  return out;
}

// M0-1119-K: Collect history for a single repo within remaining time+budget
async function collectHistoryForRepo(execFn, repo, since, budget, maxRuns, warn) {
  const todayStr = getWibDateStr();
  if (repoDailySkip.get(repo) === todayStr) return [];

  try {
    return await collectCompletedJobs(execFn, repo, since, budget, maxRuns);
  } catch (e) {
    if (isMissingRepoError(e)) {
      repoDailySkip.set(repo, todayStr);
      if (!repoWarned.has(repo)) {
        repoWarned.add(repo);
        warn(`[ci-health] repo 접근 실패 (오늘 재시도 안함): ${repo} · ${(e.message || e).toString().split('\n')[0]}`);
      }
    }
    return [];
  }
}

export async function fetchCiHealth(opts = {}, _legacy = null, _legacyRoot = null) {
  let execFn, repoRoot, repos, sinceMin, apiBudget, warn, overallDeadlineMs;
  if (typeof opts === 'function') {
    execFn = opts;
    repoRoot = _legacyRoot || null;
    repos = DEFAULT_REPOS;
    sinceMin = DEFAULT_LOOKBACK_MIN;
    apiBudget = DEFAULT_API_BUDGET;
    warn = (m) => process.stderr.write(m + '\n');
    overallDeadlineMs = 30_000;
  } else {
    execFn = opts.execFn || defaultExecFn;
    repoRoot = opts.repoRoot || null;
    repos = opts.repos || DEFAULT_REPOS;
    sinceMin = opts.sinceMin || DEFAULT_LOOKBACK_MIN;
    apiBudget = opts.apiBudget || DEFAULT_API_BUDGET;
    warn = opts.warn || ((m) => process.stderr.write(m + '\n'));
    overallDeadlineMs = opts.overallDeadlineMs != null ? opts.overallDeadlineMs : 30_000;
  }

  const root = repoRoot || DEFAULT_REPO_ROOT;
  const at = new Date().toISOString();
  const startMs = Date.now();
  const budget = makeBudget(apiBudget);

  // ---- Phase 1: State (queued/in_progress/runners) — always runs first ----
  const stateResults = [];
  let stateError = null;

  try {
    for (const r of repos) {
      stateResults.push(await collectStateForRepo(execFn, r, budget, warn));
      // Check if we've blown state deadline — stop collecting more repos' state
      if (Date.now() - startMs > STATE_DEADLINE_MS) break;
    }
  } catch (e) {
    stateError = e.message || String(e);
  }

  const aliveState = stateResults.filter((r) => !r.error && !r.skipped);

  // If all repos failed at state phase, return error immediately
  if (aliveState.length === 0 && stateResults.every((r) => r.error)) {
    const firstErr = stateError || stateResults[0]?.error || 'all repos failed';
    return { at, error: firstErr, api_calls: budget.used, api_budget: budget.max };
  }

  // Aggregate state data
  const heavyInProgress = [];
  const lightInProgress = [];
  const cloudInProgress = [];
  const heavyQueued = [];
  const lightQueued = [];
  const cloudQueued = [];
  let heavyOnline = 0, heavyBusy = 0, lightOnline = 0;

  for (const sr of aliveState) {
    for (const j of sr.in_progress) {
      if (j.kind === 'mac-heavy') heavyInProgress.push(j);
      else if (j.kind === 'mac-light') lightInProgress.push(j);
      else cloudInProgress.push(j);
    }
    for (const q of sr.queued) {
      if (q.kind === 'mac-light') lightQueued.push(q);
      else if (q.kind === 'cloud') cloudQueued.push(q);
      else heavyQueued.push(q);
    }
    if (sr.runners) {
      heavyOnline += sr.runners.heavy_online;
      heavyBusy += sr.runners.heavy_busy;
      lightOnline += sr.runners.light_online;
    }
  }

  const sortByCreated = (a, b) => new Date(a.created_at) - new Date(b.created_at);
  heavyQueued.sort(sortByCreated);
  lightQueued.sort(sortByCreated);

  const heavyOldest = heavyQueued[0] || null;
  const lightOldest = lightQueued[0] || null;
  const heavy_oldest_queued_min = heavyOldest ? heavyOldest.queued_min : null;
  const heavy_oldest_queued_pr = heavyOldest ? heavyOldest.pr : null;
  const light_oldest_queued_min = lightOldest ? lightOldest.queued_min : null;
  const queued_prs = [...new Set(heavyQueued.map((q) => q.pr_num).filter((n) => n != null))];

  // ---- Phase 2: History (completed jobs) — only if time/budget remain ----
  const completedRecords = [];
  let partial = false;
  const stateElapsedMs = Date.now() - startMs;
  const historyBudgetMs = overallDeadlineMs - stateElapsedMs;

  if (historyBudgetMs > 500 && !budget.overflow) {
    // M0-1119-K REQ3: use cursor-based since
    const historySince = getHistorySince(root);
    const historyStart = Date.now();

    try {
      for (const r of repos) {
        // Per-repo time check
        if (Date.now() - historyStart > historyBudgetMs) {
          partial = true;
          break;
        }
        const recs = await collectHistoryForRepo(
          execFn, r, historySince, budget, HISTORY_MAX_RUNS_PER_CALL, warn,
        );
        completedRecords.push(...recs);
      }
    } catch {
      partial = true;
    }

    // If we ran over overall deadline, mark partial
    if (Date.now() - startMs > overallDeadlineMs) {
      partial = true;
    }
  } else {
    // Not enough time/budget for history
    partial = true;
  }

  // Persist cursor if we got new completed records
  if (completedRecords.length > 0) {
    updateHistoryCursor(root, completedRecords);
  }

  // ---- Finalize ----
  const todayBoundary = getWibDayBoundary();
  const cloudToday = completedRecords.filter((r) => {
    if (r.runner_kind !== 'cloud') return false;
    const c = r.completed_at ? new Date(r.completed_at) : null;
    return c && c >= todayBoundary;
  }).length;

  let jsonlAdded = 0;
  if (completedRecords.length > 0) {
    try {
      jsonlAdded = appendJobs(root, completedRecords);
    } catch { /* skip */ }
  }

  let today = null;
  try { today = summarizeToday(root); } catch { today = null; }

  const alerts = [];
  if (heavy_oldest_queued_min != null && heavy_oldest_queued_min > 15) {
    alerts.push({ type: 'queue_wait', detail: `oldest heavy queued ${heavy_oldest_queued_min}m (${heavy_oldest_queued_pr})` });
  }
  for (const j of heavyInProgress) {
    if (j.running_min != null && j.running_min > 30) {
      alerts.push({ type: 'long_job', detail: `${j.job} running ${j.running_min}m (${j.pr})` });
    }
  }
  if (heavyQueued.length > 0 && heavyInProgress.length === 0 && heavy_oldest_queued_min != null && heavy_oldest_queued_min >= 10) {
    alerts.push({ type: 'runner_idle', detail: `${heavyQueued.length} queued but 0 in_progress for ${heavy_oldest_queued_min}m` });
  }
  if (light_oldest_queued_min != null && light_oldest_queued_min > 10) {
    alerts.push({ type: 'light_wait', detail: `oldest light queued ${light_oldest_queued_min}m` });
  }

  const result = {
    at,
    repos_scanned: aliveState.map((r) => r.repo),
    repos_failed: stateResults.filter((r) => r.error).map((r) => ({ repo: r.repo, error: r.error })),
    repos_skipped: stateResults.filter((r) => r.skipped).map((r) => ({ repo: r.repo, reason: r.skipped })),
    api_calls: budget.used,
    api_budget: budget.max,
    api_overflow: budget.overflow,
    heavy: {
      queued: heavyQueued.length,
      queued_prs,
      oldest_queued_min: heavy_oldest_queued_min,
      oldest_queued_pr: heavy_oldest_queued_pr,
      in_progress: heavyInProgress,
    },
    light: {
      queued: lightQueued.length,
      oldest_queued_min: light_oldest_queued_min,
      in_progress: lightInProgress,
    },
    cloud_in_progress: cloudInProgress,
    runners: (heavyOnline + lightOnline + heavyBusy > 0) ? {
      heavy_online: heavyOnline, heavy_busy: heavyBusy, light_online: lightOnline,
    } : null,
    cloud_today: cloudToday,
    today,
    jsonl_added: jsonlAdded,
    alerts,
  };

  // M0-1119-K REQ4: set partial flag if history was cut short
  if (partial) result.partial = true;

  return result;
}

if (process.argv.includes('--once')) {
  fetchCiHealth({ repoRoot: DEFAULT_REPO_ROOT }).then((result) => {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.jsonl_added > 0) {
      process.stderr.write(`[ci-health --once] jsonl_added=${result.jsonl_added}\n`);
    }
    if (result.partial) {
      process.stderr.write(`[ci-health --once] partial=true (history split across invocations)\n`);
    }
  });
}
