// scripts/lib/ci-health.mjs · M0-1119-H — storeport CI 건강 상태 조회 (runner_kind · jsonl 기록 포함)
//
// 사용:
//   import { fetchCiHealth } from './ci-health.mjs';
//   const ci = await fetchCiHealth();                        // 기본 (gh CLI 사용)
//   const ci = await fetchCiHealth(execFn);                  // 의존성 주입 (테스트용)
//   const ci = await fetchCiHealth(execFn, null, repoRoot);  // jsonl 기록 활성화
//
// CLI:
//   node scripts/lib/ci-health.mjs --once     // 1회 실행 후 JSON pretty-print + jsonl 기록
//
// 반환 구조:
//   { at,
//     heavy: { queued, queued_prs: [prNum…], oldest_queued_min, oldest_queued_pr,
//              in_progress: [{repo, pr, job, step, running_min, runner}] },
//     light: { queued, oldest_queued_min,
//              in_progress: [{repo, pr, job, step, running_min, runner}] },
//     runners: { heavy_online, heavy_busy, light_online } | null,
//     cloud_today: N, today: {mac_heavy:{…}, mac_light:{…}, cloud:{…}, cloud_cost_usd, wasted_min},
//     alerts: [...] }
//   실패 시: { error: "..." }

import { execFile } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { classifyRunnerKind, appendJobs, summarizeToday } from './ci-history.mjs';

const execFileAsync = promisify(execFile);

const REPO = 'CuriocityDevAi/storeport';
const TIMEOUT_MS = 20_000;

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(HERE, '..', '..');

// heavy runner label: storeport 전 workflow 는 [self-hosted, curiocity-mac]
// light: ubuntu-latest 등 cloud runner (현재 storeport 에 없음 — 미래 대비)
const HEAVY_LABELS = ['curiocity-mac', 'curiocity-mac-heavy', 'self-hosted'];
const LIGHT_LABELS = ['curiocity-mac-light'];
const CLOUD_LABELS = ['ubuntu-latest', 'ubuntu-22.04', 'ubuntu-20.04'];

// WIB (Asia/Jakarta) UTC+7 기준 오늘 날짜 경계
function getTodayWibBoundary() {
  const now = new Date();
  const wibOffset = 7 * 60; // minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const wibMs = utcMs + wibOffset * 60_000;
  const wibDate = new Date(wibMs);
  // WIB 오늘 00:00:00 → UTC
  const todayWib = new Date(wibDate);
  todayWib.setHours(0, 0, 0, 0);
  const startUtcMs = todayWib.getTime() - wibOffset * 60_000;
  return new Date(startUtcMs);
}

function labelName(l) {
  // GitHub API may return string or { name: string } objects
  return typeof l === 'string' ? l : (l && l.name) || '';
}

function isHeavyRunner(labels) {
  if (!Array.isArray(labels)) return false;
  const names = labels.map(labelName);
  // mac-heavy: curiocity-mac or curiocity-mac-heavy (with or without self-hosted)
  // legacy: storeport uses [curiocity-mac] without self-hosted prefix
  if (names.some((n) => n === 'curiocity-mac' || n === 'curiocity-mac-heavy')) return true;
  // self-hosted + any curiocity-mac-* prefix (future-proof)
  if (names.includes('self-hosted') && names.some((n) => n.startsWith('curiocity-mac'))) return true;
  return false;
}

function isLightRunner(labels) {
  if (!Array.isArray(labels)) return false;
  const names = labels.map(labelName);
  // mac-light: curiocity-mac-light label
  return names.includes('curiocity-mac-light');
}

function isCloudRunner(labels) {
  if (!Array.isArray(labels)) return false;
  const names = labels.map(labelName);
  return CLOUD_LABELS.some((cl) => names.includes(cl));
}

function minutesSince(isoString) {
  if (!isoString) return null;
  const ms = Date.now() - new Date(isoString).getTime();
  return Math.round(ms / 60_000);
}

// gh CLI 래퍼 (기본 execFn)
async function defaultExecFn(endpoint) {
  const { stdout } = await execFileAsync('gh', ['api', endpoint, '--paginate'], {
    timeout: TIMEOUT_MS,
  });
  return JSON.parse(stdout);
}

// PR 번호 추출: head_branch 나 head_commit.message 에서 /M[0-9]-[0-9]+|PR#[0-9]+/ 형태 시도
function extractPr(run) {
  if (run.pull_requests && run.pull_requests.length > 0) {
    return `#${run.pull_requests[0].number}`;
  }
  const branch = run.head_branch || '';
  const m = branch.match(/\/(\d+)|^(\d+)/);
  if (m) return `branch:${branch}`;
  return branch || 'unknown';
}

export async function fetchCiHealth(execFn = defaultExecFn, _unused = null, repoRoot = null) {
  try {
    const at = new Date().toISOString();

    // 1. queued runs
    const [queuedRaw, inProgressRaw] = await Promise.all([
      execFn(`repos/${REPO}/actions/runs?status=queued&per_page=50`),
      execFn(`repos/${REPO}/actions/runs?status=in_progress&per_page=50`),
    ]);

    const queuedRuns = queuedRaw.workflow_runs || [];
    const inProgressRuns = inProgressRaw.workflow_runs || [];

    // heavy / light 분류
    const heavyQueued = queuedRuns.filter((r) => isHeavyRunner(r.runner_labels || []));
    const lightQueued = queuedRuns.filter((r) => isLightRunner(r.runner_labels || []));

    // heavyQueued 에 runner_labels 없으면 — storeport 전 job 이 curiocity-mac 이므로 all queued = heavy
    // runner_labels API 필드가 없을 수 있어 fallback: queued 전부 heavy
    const effectiveHeavyQueued = heavyQueued.length === 0 && lightQueued.length === 0
      ? queuedRuns
      : heavyQueued;

    // oldest queued
    let oldestQueuedMin = null;
    let oldestQueuedPr = null;
    if (effectiveHeavyQueued.length > 0) {
      const sorted = [...effectiveHeavyQueued].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      );
      const oldest = sorted[0];
      oldestQueuedMin = minutesSince(oldest.created_at);
      oldestQueuedPr = extractPr(oldest);
    }

    // in_progress jobs — heavy 만
    const heavyInProgress = inProgressRuns.filter((r) => {
      const labels = r.runner_labels || [];
      if (labels.length === 0) return true; // fallback: all in_progress = heavy
      return isHeavyRunner(labels);
    });

    const inProgressDetails = [];
    // completed jobs 수집 (jsonl 기록용)
    const completedJobRecords = [];

    for (const run of heavyInProgress) {
      try {
        const jobsData = await execFn(`repos/${REPO}/actions/runs/${run.id}/jobs?per_page=50`);
        const jobs = jobsData.jobs || [];
        const activeJobs = jobs.filter((j) => j.status === 'in_progress');
        const doneJobs = jobs.filter((j) => j.status === 'completed');

        for (const job of activeJobs) {
          const currentStep = job.steps
            ? job.steps.filter((s) => s.status === 'in_progress').map((s) => s.name)[0] || null
            : null;
          inProgressDetails.push({
            repo: REPO,
            pr: extractPr(run),
            job: job.name,
            step: currentStep,
            running_min: minutesSince(job.started_at),
            runner: job.runner_name || null,
          });
        }

        // 완료된 job 수집
        for (const job of doneJobs) {
          if (!job.completed_at) continue;
          completedJobRecords.push({
            id: job.id,
            repo: REPO,
            pr: (run.pull_requests && run.pull_requests[0]?.number) || null,
            workflow: run.name || null,
            job: job.name,
            runner_kind: classifyRunnerKind(run.runner_labels || [], job.runner_name),
            runner_name: job.runner_name || null,
            queued_at: run.created_at || null,
            started_at: job.started_at || null,
            completed_at: job.completed_at,
            wait_min: (run.created_at && job.started_at)
              ? Math.round((new Date(job.started_at) - new Date(run.created_at)) / 60_000)
              : null,
            run_min: (job.started_at && job.completed_at)
              ? Math.round((new Date(job.completed_at) - new Date(job.started_at)) / 60_000 * 10) / 10
              : null,
            conclusion: job.conclusion || null,
          });
        }
      } catch {
        // job 조회 실패 → run 단위만
        inProgressDetails.push({
          repo: REPO,
          pr: extractPr(run),
          job: run.name || run.workflow_id,
          step: null,
          running_min: minutesSince(run.run_started_at || run.created_at),
          runner: null,
        });
      }
    }

    // light in_progress
    const lightInProgress = inProgressRuns.filter((r) => {
      const labels = r.runner_labels || [];
      return isLightRunner(labels);
    });
    const lightInProgressDetails = [];
    for (const run of lightInProgress) {
      try {
        const jobsData = await execFn(`repos/${REPO}/actions/runs/${run.id}/jobs?per_page=50`);
        const jobs = jobsData.jobs || [];
        const activeJobs = jobs.filter((j) => j.status === 'in_progress');
        const doneJobs = jobs.filter((j) => j.status === 'completed');
        for (const job of activeJobs) {
          const currentStep = job.steps
            ? job.steps.filter((s) => s.status === 'in_progress').map((s) => s.name)[0] || null
            : null;
          lightInProgressDetails.push({
            repo: REPO,
            pr: extractPr(run),
            job: job.name,
            step: currentStep,
            running_min: minutesSince(job.started_at),
            runner: job.runner_name || null,
          });
        }
        for (const job of doneJobs) {
          if (!job.completed_at) continue;
          completedJobRecords.push({
            id: job.id,
            repo: REPO,
            pr: (run.pull_requests && run.pull_requests[0]?.number) || null,
            workflow: run.name || null,
            job: job.name,
            runner_kind: 'mac-light',
            runner_name: job.runner_name || null,
            queued_at: run.created_at || null,
            started_at: job.started_at || null,
            completed_at: job.completed_at,
            wait_min: (run.created_at && job.started_at)
              ? Math.round((new Date(job.started_at) - new Date(run.created_at)) / 60_000)
              : null,
            run_min: (job.started_at && job.completed_at)
              ? Math.round((new Date(job.completed_at) - new Date(job.started_at)) / 60_000 * 10) / 10
              : null,
            conclusion: job.conclusion || null,
          });
        }
      } catch {
        lightInProgressDetails.push({
          repo: REPO,
          pr: extractPr(run),
          job: run.name || run.workflow_id,
          step: null,
          running_min: minutesSince(run.run_started_at || run.created_at),
          runner: null,
        });
      }
    }

    // light queued stats
    let oldestLightMin = null;
    if (lightQueued.length > 0) {
      const sorted = [...lightQueued].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      );
      oldestLightMin = minutesSince(sorted[0].created_at);
    }

    // queued_prs: heavy 대기 중인 PR 번호 목록 (중복 제거)
    const queuedPrsSet = new Set();
    for (const run of effectiveHeavyQueued) {
      if (run.pull_requests && run.pull_requests.length > 0) {
        queuedPrsSet.add(run.pull_requests[0].number);
      }
    }
    const queued_prs = [...queuedPrsSet];

    // runners API (권한 없을 수 있음)
    let runners = null;
    try {
      const runnersData = await execFn(`repos/${REPO}/actions/runners?per_page=100`);
      const all = runnersData.runners || [];
      const heavy = all.filter((r) => (r.labels || []).some((l) => HEAVY_LABELS.includes(l.name)));
      const light = all.filter((r) => (r.labels || []).some((l) => LIGHT_LABELS.includes(l.name)));
      runners = {
        heavy_online: heavy.filter((r) => r.status === 'online').length,
        heavy_busy: heavy.filter((r) => r.busy).length,
        light_online: light.filter((r) => r.status === 'online').length,
      };
    } catch {
      runners = null;
    }

    // cloud_today: cloud runner (ubuntu) 로 돈 job 수 (WIB 오늘)
    const todayBoundary = getTodayWibBoundary();
    const cloudToday = [...queuedRuns, ...inProgressRuns].filter((r) => {
      const labels = r.runner_labels || [];
      const isCloud = isCloudRunner(labels);
      const created = new Date(r.created_at);
      return isCloud && created >= todayBoundary;
    }).length;

    // jsonl 기록 (repoRoot 가 있을 때만)
    const effectiveRepoRoot = repoRoot || DEFAULT_REPO_ROOT;
    let jsonlAdded = 0;
    if (completedJobRecords.length > 0) {
      try {
        jsonlAdded = appendJobs(effectiveRepoRoot, completedJobRecords);
      } catch (e) {
        // jsonl 기록 실패는 CI health 결과에 영향 주지 않음
      }
    }

    // today 요약 (ci-history 에서)
    let today = null;
    try {
      today = summarizeToday(effectiveRepoRoot);
    } catch {
      today = null;
    }

    // alerts
    const alerts = [];

    // queue_wait: heavy 대기 15분 초과
    if (oldestQueuedMin !== null && oldestQueuedMin > 15) {
      alerts.push({ type: 'queue_wait', detail: `oldest heavy queued ${oldestQueuedMin}m (${oldestQueuedPr})` });
    }

    // long_job: in_progress 중 30분 초과 job
    for (const j of inProgressDetails) {
      if (j.running_min !== null && j.running_min > 30) {
        alerts.push({ type: 'long_job', detail: `${j.job} running ${j.running_min}m (${j.pr})` });
      }
    }

    // runner_idle: heavy 대기 job 있는데 in_progress 0 이 10분 이상
    if (effectiveHeavyQueued.length > 0 && inProgressDetails.length === 0 && oldestQueuedMin !== null && oldestQueuedMin >= 10) {
      alerts.push({ type: 'runner_idle', detail: `${effectiveHeavyQueued.length} queued but 0 in_progress for ${oldestQueuedMin}m` });
    }

    // light_wait: light 대기 10분 초과
    if (oldestLightMin !== null && oldestLightMin > 10) {
      alerts.push({ type: 'light_wait', detail: `oldest light queued ${oldestLightMin}m` });
    }

    return {
      at,
      heavy: {
        queued: effectiveHeavyQueued.length,
        queued_prs,
        oldest_queued_min: oldestQueuedMin,
        oldest_queued_pr: oldestQueuedPr,
        in_progress: inProgressDetails,
      },
      light: {
        queued: lightQueued.length,
        oldest_queued_min: oldestLightMin,
        in_progress: lightInProgressDetails,
      },
      runners,
      cloud_today: cloudToday,
      today,
      jsonl_added: jsonlAdded,
      alerts,
    };
  } catch (e) {
    return { error: e.message || String(e) };
  }
}

// CLI --once
if (process.argv.includes('--once')) {
  fetchCiHealth(undefined, null, DEFAULT_REPO_ROOT).then((result) => {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.jsonl_added > 0) {
      process.stderr.write(`[ci-health --once] jsonl_added=${result.jsonl_added}\n`);
    }
  });
}
