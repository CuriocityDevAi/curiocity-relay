// scripts/lib/ci-health.mjs · M0-1119-I — storeport + fork CI 건강 조회 + 완료 run 의 모든 job 기록
//
// 핵심 원칙:
//   · 분류 = job API 의 labels + runner_name (run 의 runner_labels 는 존재하지 않음).
//   · 기록 범위 = "lastSeenAt 이후 완료된 run 들의 모든 job" (진행 중 run 안의 끝난 job만 보지 말 것).
//   · wait_min = job.created_at → job.started_at.
//   · 날짜 = job.completed_at 의 WIB.
//   · --paginate 제거 (per_page=100 · 완료 run 은 since/updated filter 로 범위 제한).
//   · 조회 범위 = storeport + CuriocityDevAi/storeport fork(존재할 때).
//   · 비용 = cloud_cost_est_usd (추정 · 단가 상수 ci-history.mjs).
//
// 사용:
//   import { fetchCiHealth } from './ci-health.mjs';
//   const ci = await fetchCiHealth();                      // 기본 (gh CLI)
//   const ci = await fetchCiHealth({ execFn, repoRoot });  // 의존성 주입
//
// CLI: node scripts/lib/ci-health.mjs --once

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
} from './ci-history.mjs';

const execFileAsync = promisify(execFile);

const DEFAULT_REPOS = [
  'CuriocityDevAi/storeport',
  // fork: 존재하지 않으면 404 로 silent drop.
  'KyuuuLee/storeport',
];
const PER_REPO_TIMEOUT_MS = 10_000;
const DEFAULT_LOOKBACK_MIN = 30;

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(HERE, '..', '..');

// gh api (--paginate 사용 금지 · 객체 응답 파싱 안정성)
async function defaultExecFn(endpoint) {
  const { stdout } = await execFileAsync('gh', ['api', endpoint, '-H', 'Accept: application/vnd.github+json'], {
    timeout: PER_REPO_TIMEOUT_MS,
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

function minutesSince(iso) {
  if (!iso) return null;
  return Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
}

function extractPr(run) {
  if (run.pull_requests && run.pull_requests.length > 0) return `#${run.pull_requests[0].number}`;
  return run.head_branch || 'unknown';
}

// 진행 중 run 의 "활성 job" 만 (분류는 job labels / runner_name 으로)
async function collectInProgress(execFn, repo) {
  const data = await execFn(`repos/${repo}/actions/runs?status=in_progress&per_page=100`);
  const runs = (data && data.workflow_runs) || [];
  const active = [];
  for (const run of runs) {
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
      // jobs 조회 실패 → run 단위 fallback
      active.push({
        repo, pr: extractPr(run), job: run.name || String(run.workflow_id),
        step: null, running_min: minutesSince(run.run_started_at || run.created_at),
        runner: null, kind: 'unknown',
      });
    }
  }
  return active;
}

async function collectQueued(execFn, repo) {
  const data = await execFn(`repos/${repo}/actions/runs?status=queued&per_page=100`);
  const runs = (data && data.workflow_runs) || [];
  return runs.map((run) => ({
    repo, id: run.id, name: run.name || null,
    pr: extractPr(run),
    pr_num: (run.pull_requests && run.pull_requests[0]?.number) || null,
    created_at: run.created_at || null,
    queued_min: minutesSince(run.created_at),
  }));
}

// 완료된 run 의 "모든 job" 을 기록 (진행 중 run 은 제외 — 완료 보장 범위만).
// since: ISO · 이 시각 이후 updated 된 run 만 조회.
async function collectCompletedJobs(execFn, repo, since) {
  const sinceParam = since ? `&created=>=${encodeURIComponent(since.toISOString())}` : '';
  const data = await execFn(`repos/${repo}/actions/runs?status=completed&per_page=100${sinceParam}`);
  const runs = (data && data.workflow_runs) || [];
  const records = [];
  for (const run of runs) {
    try {
      const jobsData = await execFn(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100&filter=latest`);
      const jobs = (jobsData && jobsData.jobs) || [];
      for (const job of jobs) {
        if (job.status !== 'completed' || !job.completed_at) continue;
        records.push(jobToRecord(job, run));
      }
    } catch {
      // job 조회 실패 — 해당 run 생략 (다음 tick 에서 재시도)
    }
  }
  return records;
}

// 각 repo 별로 수집 · repo 단위 실패는 그 repo 만 fail 로 기록.
async function collectForRepo(execFn, repo, since) {
  const out = { repo, queued: [], in_progress: [], completed_records: [], runners: null, error: null };
  try {
    const [q, p, c] = await Promise.all([
      collectQueued(execFn, repo),
      collectInProgress(execFn, repo),
      collectCompletedJobs(execFn, repo, since),
    ]);
    out.queued = q;
    out.in_progress = p;
    out.completed_records = c;
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
  } catch (e) {
    out.error = e.message || String(e);
  }
  return out;
}

export async function fetchCiHealth(opts = {}, _legacy = null, _legacyRoot = null) {
  // 역호환: fetchCiHealth(execFn) 또는 fetchCiHealth(execFn, null, repoRoot)
  let execFn, repoRoot, repos, sinceMin;
  if (typeof opts === 'function') {
    execFn = opts;
    repoRoot = _legacyRoot || null;
    repos = DEFAULT_REPOS;
    sinceMin = DEFAULT_LOOKBACK_MIN;
  } else {
    execFn = opts.execFn || defaultExecFn;
    repoRoot = opts.repoRoot || null;
    repos = opts.repos || DEFAULT_REPOS;
    sinceMin = opts.sinceMin || DEFAULT_LOOKBACK_MIN;
  }

  const at = new Date().toISOString();
  try {
    const since = new Date(Date.now() - sinceMin * 60_000);

    const perRepo = await Promise.all(repos.map((r) => collectForRepo(execFn, r, since)));

    // repo 전부 실패면 error 반환
    const alive = perRepo.filter((r) => !r.error);
    if (alive.length === 0) {
      const firstErr = perRepo[0]?.error || 'all repos failed';
      return { at, error: firstErr };
    }

    // 집계
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
      // queued runs 는 run 레벨 — run 의 labels 는 API 에 없으므로 heavy 로 간주(storeport 기본)
      for (const q of pr.queued) heavyQueued.push(q);
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

    // cloud_today: WIB 오늘 completed records 중 cloud
    const todayBoundary = getWibDayBoundary();
    const cloudToday = completedRecords.filter((r) => {
      if (r.runner_kind !== 'cloud') return false;
      const c = r.completed_at ? new Date(r.completed_at) : null;
      return c && c >= todayBoundary;
    }).length;

    // jsonl 기록 — per-job WIB routing 은 appendJobs 가 처리.
    let jsonlAdded = 0;
    if (completedRecords.length > 0 && (repoRoot || DEFAULT_REPO_ROOT)) {
      try {
        jsonlAdded = appendJobs(repoRoot || DEFAULT_REPO_ROOT, completedRecords);
      } catch { /* jsonl 실패 = CI health 결과에 영향 없음 */ }
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
    return { at, error: e.message || String(e) };
  }
}

// CLI --once
if (process.argv.includes('--once')) {
  fetchCiHealth({ repoRoot: DEFAULT_REPO_ROOT }).then((result) => {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.jsonl_added > 0) {
      process.stderr.write(`[ci-health --once] jsonl_added=${result.jsonl_added}\n`);
    }
  });
}
