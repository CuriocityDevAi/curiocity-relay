// scripts/lib/ci-health.mjs · M0-1119-G — storeport CI 건강 상태 조회
//
// 사용:
//   import { fetchCiHealth } from './ci-health.mjs';
//   const ci = await fetchCiHealth();          // 기본 (gh CLI 사용)
//   const ci = await fetchCiHealth(execFn);    // 의존성 주입 (테스트용)
//
// CLI:
//   node scripts/lib/ci-health.mjs --once     // 1회 실행 후 JSON pretty-print
//
// 반환 구조:
//   { at, heavy: { queued, oldest_queued_min, oldest_queued_pr, in_progress: [{pr, job, step, running_min}] },
//     light: { queued, oldest_queued_min }, runners: { heavy_online, heavy_busy, light_online } | null,
//     cloud_today: N, alerts: [...] }
//   실패 시: { error: "..." }

import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const REPO = 'CuriocityDevAi/storeport';
const TIMEOUT_MS = 20_000;

// heavy runner label: storeport 전 workflow 는 [self-hosted, curiocity-mac]
// light: ubuntu-latest 등 cloud runner (현재 storeport 에 없음 — 미래 대비)
const HEAVY_LABELS = ['curiocity-mac', 'self-hosted'];
const LIGHT_LABELS = ['ubuntu-latest', 'ubuntu-22.04', 'ubuntu-20.04'];

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
  return labels.some((l) => HEAVY_LABELS.includes(labelName(l)));
}

function isLightRunner(labels) {
  if (!Array.isArray(labels)) return false;
  return labels.some((l) => LIGHT_LABELS.includes(labelName(l)));
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

export async function fetchCiHealth(execFn = defaultExecFn) {
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
    for (const run of heavyInProgress) {
      try {
        const jobsData = await execFn(`repos/${REPO}/actions/runs/${run.id}/jobs?per_page=50`);
        const activeJobs = (jobsData.jobs || []).filter((j) => j.status === 'in_progress');
        for (const job of activeJobs) {
          const currentStep = job.steps
            ? job.steps.filter((s) => s.status === 'in_progress').map((s) => s.name)[0] || null
            : null;
          inProgressDetails.push({
            pr: extractPr(run),
            job: job.name,
            step: currentStep,
            running_min: minutesSince(job.started_at),
          });
        }
      } catch {
        // job 조회 실패 → run 단위만
        inProgressDetails.push({
          pr: extractPr(run),
          job: run.name || run.workflow_id,
          step: null,
          running_min: minutesSince(run.run_started_at || run.created_at),
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

    // cloud_today: ubuntu runner 로 돈 heavy job 수 (WIB 오늘)
    const todayBoundary = getTodayWibBoundary();
    const cloudToday = [...queuedRuns, ...inProgressRuns].filter((r) => {
      const labels = r.runner_labels || [];
      const isCloud = isLightRunner(labels);
      const created = new Date(r.created_at);
      return isCloud && created >= todayBoundary;
    }).length;

    // alerts
    const alerts = [];
    const now = Date.now();

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
        oldest_queued_min: oldestQueuedMin,
        oldest_queued_pr: oldestQueuedPr,
        in_progress: inProgressDetails,
      },
      light: {
        queued: lightQueued.length,
        oldest_queued_min: oldestLightMin,
      },
      runners,
      cloud_today: cloudToday,
      alerts,
    };
  } catch (e) {
    return { error: e.message || String(e) };
  }
}

// CLI --once
if (process.argv.includes('--once')) {
  fetchCiHealth().then((result) => {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  });
}
