// scripts/lib/ci-health.mjs · M0-1119-I/J — storeport + fork CI 건강 조회 + 완료 job 기록
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

import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
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

async function collectCompletedJobs(execFn, repo, since, budget) {
  if (!budgetCheck(budget)) return [];
  const sinceParam = since ? `&updated=>=${encodeURIComponent(since.toISOString())}` : '';
  const data = await execFn(`repos/${repo}/actions/runs?status=completed&per_page=100${sinceParam}`);
  const runs = (data && data.workflow_runs) || [];
  const records = [];
  for (const run of runs) {
    const runKey = `${repo}:${run.id}`;
    if (seenCompletedRunIds.has(runKey)) continue;
    if (!budgetCheck(budget)) break;
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

async function collectForRepo(execFn, repo, since, budget, warn) {
  const todayStr = getWibDateStr();
  if (repoDailySkip.get(repo) === todayStr) {
    return { repo, queued: [], in_progress: [], completed_records: [], runners: null, error: null, skipped: 'daily-skip' };
  }

  const out = { repo, queued: [], in_progress: [], completed_records: [], runners: null, error: null };
  try {
    out.queued = await collectQueued(execFn, repo, budget);
    out.in_progress = await collectInProgress(execFn, repo, budget);
    out.completed_records = await collectCompletedJobs(execFn, repo, since, budget);
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

export async function fetchCiHealth(opts = {}, _legacy = null, _legacyRoot = null) {
  let execFn, repoRoot, repos, sinceMin, apiBudget, warn;
  if (typeof opts === 'function') {
    execFn = opts;
    repoRoot = _legacyRoot || null;
    repos = DEFAULT_REPOS;
    sinceMin = DEFAULT_LOOKBACK_MIN;
    apiBudget = DEFAULT_API_BUDGET;
    warn = (m) => process.stderr.write(m + '\n');
  } else {
    execFn = opts.execFn || defaultExecFn;
    repoRoot = opts.repoRoot || null;
    repos = opts.repos || DEFAULT_REPOS;
    sinceMin = opts.sinceMin || DEFAULT_LOOKBACK_MIN;
    apiBudget = opts.apiBudget || DEFAULT_API_BUDGET;
    warn = opts.warn || ((m) => process.stderr.write(m + '\n'));
  }

  const at = new Date().toISOString();
  const budget = makeBudget(apiBudget);
  try {
    const since = new Date(Date.now() - sinceMin * 60_000);

    const perRepo = [];
    for (const r of repos) {
      perRepo.push(await collectForRepo(execFn, r, since, budget, warn));
    }

    const alive = perRepo.filter((r) => !r.error && !r.skipped);
    if (alive.length === 0 && perRepo.every((r) => r.error)) {
      const firstErr = perRepo[0]?.error || 'all repos failed';
      return { at, error: firstErr, api_calls: budget.used, api_budget: budget.max };
    }

    const heavyInProgress = [];
    const lightInProgress = [];
    const cloudInProgress = [];
    const heavyQueued = [];
    const lightQueued = [];
    const cloudQueued = [];
    const completedRecords = [];
    let heavyOnline = 0, heavyBusy = 0, lightOnline = 0;

    for (const pr of alive) {
      completedRecords.push(...pr.completed_records);
      for (const j of pr.in_progress) {
        if (j.kind === 'mac-heavy') heavyInProgress.push(j);
        else if (j.kind === 'mac-light') lightInProgress.push(j);
        else cloudInProgress.push(j);
      }
      for (const q of pr.queued) {
        if (q.kind === 'mac-light') lightQueued.push(q);
        else if (q.kind === 'cloud') cloudQueued.push(q);
        else heavyQueued.push(q);
      }
      if (pr.runners) {
        heavyOnline += pr.runners.heavy_online;
        heavyBusy += pr.runners.heavy_busy;
        lightOnline += pr.runners.light_online;
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

    const todayBoundary = getWibDayBoundary();
    const cloudToday = completedRecords.filter((r) => {
      if (r.runner_kind !== 'cloud') return false;
      const c = r.completed_at ? new Date(r.completed_at) : null;
      return c && c >= todayBoundary;
    }).length;

    let jsonlAdded = 0;
    if (completedRecords.length > 0 && (repoRoot || DEFAULT_REPO_ROOT)) {
      try {
        jsonlAdded = appendJobs(repoRoot || DEFAULT_REPO_ROOT, completedRecords);
      } catch { /* skip */ }
    }

    let today = null;
    try { today = summarizeToday(repoRoot || DEFAULT_REPO_ROOT); } catch { today = null; }

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

    return {
      at,
      repos_scanned: alive.map((r) => r.repo),
      repos_failed: perRepo.filter((r) => r.error).map((r) => ({ repo: r.repo, error: r.error })),
      repos_skipped: perRepo.filter((r) => r.skipped).map((r) => ({ repo: r.repo, reason: r.skipped })),
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
  } catch (e) {
    return { at, error: e.message || String(e), api_calls: budget.used, api_budget: budget.max };
  }
}

if (process.argv.includes('--once')) {
  fetchCiHealth({ repoRoot: DEFAULT_REPO_ROOT }).then((result) => {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.jsonl_added > 0) {
      process.stderr.write(`[ci-health --once] jsonl_added=${result.jsonl_added}\n`);
    }
  });
}
