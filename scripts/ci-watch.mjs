#!/usr/bin/env node
// scripts/ci-watch.mjs  CI 감시 터미널 대시보드 (M1-1123-K)
// Usage: node ~/projects/curiocity-relay/scripts/ci-watch.mjs [--full]
//
// 화면 전용 · 읽기 전용 — relay git 쓰기 없음.
// 로컬 캐시는 ~/.hub-runner/ci-watch/ 에만 쓴다.

import { execFile } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

import { getWibDateStr, readJsonlFile } from './lib/ci-history.mjs';
import { computeRunnerAlerts } from './watch/runner-alerts.mjs';
import {
  isMarkerJob,
  filterFreshUnclaimed,
  buildRunnerRows,
  renderCompact,
} from './watch/ci-watch-render.mjs';

const REFRESH_MS = 30_000;
const RUNNER_REFRESH_MS = 120_000;
const CLOUD_DAILY_LIMIT = 5;

const PROMPT_ID_RE = /([MRTNK]\d-\d{4}-[A-Z]+)/;

const PATHS = {
  cloudQuota: join(REPO_ROOT, 'ci', 'cloud-quota'),
  ciJsonl: join(REPO_ROOT, 'status', 'ci'),
  allJson: join(REPO_ROOT, 'status', 'runners', 'all.json'),
  queueRoot: join(REPO_ROOT, 'queue'),
  claims: join(REPO_ROOT, 'status', 'claims'),
};

const REPOS = [
  'CuriocityDevAi/storeport',
  'CuriocityDevAi/agilo-medusa-pos-fork',
];

export function extractPromptId(str) {
  if (!str) return null;
  const m = String(str).match(PROMPT_ID_RE);
  return m ? m[1] : null;
}

function repoShort(repo) {
  if (!repo) return '';
  const last = String(repo).split('/').pop();
  return last.endsWith('-fork') ? 'fork' : last;
}

function minSince(iso) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.round(ms / 60_000);
}

function isLightWorkflow(name) {
  if (!name) return false;
  const n = String(name).toLowerCase();
  return n.includes('feature-map') || n.includes('light') || n.includes('check');
}

async function ghApi(endpoint) {
  const { stdout } = await execFileAsync(
    'gh', ['api', endpoint, '-H', 'Accept: application/vnd.github+json'],
    { timeout: 10_000, maxBuffer: 4 * 1024 * 1024 },
  );
  return JSON.parse(stdout);
}

function getCloudQuota(dateStr) {
  const p = join(PATHS.cloudQuota, `${dateStr}.json`);
  if (!existsSync(p)) return CLOUD_DAILY_LIMIT;
  try { return CLOUD_DAILY_LIMIT + (JSON.parse(readFileSync(p, 'utf8')).extra || 0); }
  catch { return CLOUD_DAILY_LIMIT; }
}

const prPromptCache = new Map();

function cachePrPrompt(repo, prNum, headBranch) {
  if (!prNum) return;
  const key = `${repo}:${prNum}`;
  if (!prPromptCache.has(key)) {
    const pid = extractPromptId(headBranch);
    prPromptCache.set(key, pid);
  }
}

function lookupPrPrompt(repo, prNum) {
  if (!prNum) return null;
  return prPromptCache.get(`${repo}:${prNum}`) || null;
}

async function fetchRunsForRepo(repo) {
  const [ipData, qData] = await Promise.all([
    ghApi(`repos/${repo}/actions/runs?status=in_progress&per_page=20`).catch(() => null),
    ghApi(`repos/${repo}/actions/runs?status=queued&per_page=20`).catch(() => null),
  ]);

  const inProgress = [];
  for (const run of ((ipData && ipData.workflow_runs) || [])) {
    const prNum = run.pull_requests?.[0]?.number || null;
    const prStr = prNum ? `#${prNum}` : (run.head_branch || '-');
    const promptId = extractPromptId(run.head_branch) || extractPromptId(run.name) || null;
    if (prNum) cachePrPrompt(repo, String(prNum), run.head_branch);
    inProgress.push({
      repo, prNum, pr: prStr,
      display: `${repoShort(repo)}${prStr}`,
      prompt_id: promptId,
      check: run.name || '',
      running_min: minSince(run.run_started_at || run.created_at),
      head_branch: run.head_branch,
      run_id: run.id,
      light: isLightWorkflow(run.name),
    });
  }

  const queued = [];
  for (const run of ((qData && qData.workflow_runs) || [])) {
    if (isMarkerJob(run.name)) continue;
    const prNum = run.pull_requests?.[0]?.number || null;
    const prStr = prNum ? `#${prNum}` : (run.head_branch || '-');
    const promptId = extractPromptId(run.head_branch) || extractPromptId(run.name) || null;
    if (prNum) cachePrPrompt(repo, String(prNum), run.head_branch);
    queued.push({
      repo, prNum, pr: prStr,
      display: `${repoShort(repo)}${prStr}`,
      prompt_id: promptId,
      check: run.name || '',
      queued_min: minSince(run.created_at),
      head_branch: run.head_branch,
      run_id: run.id,
      created_at: run.created_at,
      light: isLightWorkflow(run.name),
    });
  }

  return { inProgress, queued };
}

async function fetchAllRunState() {
  const results = await Promise.all(REPOS.map(r => fetchRunsForRepo(r).catch(() => ({ inProgress: [], queued: [] }))));
  const heavy = { inProgress: [], queued: [] };
  const light = { inProgress: [], queued: [] };

  for (const { inProgress, queued } of results) {
    for (const j of inProgress) {
      (j.light ? light : heavy).inProgress.push(j);
    }
    for (const q of queued) {
      (q.light ? light : heavy).queued.push(q);
    }
  }

  heavy.queued.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  light.queued.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return { heavy, light };
}

function readAllJson() {
  if (!existsSync(PATHS.allJson)) return null;
  try { return JSON.parse(readFileSync(PATHS.allJson, 'utf8')); }
  catch { return null; }
}

/**
 * status/ci/<date>.jsonl 에서 실제 검사 잡(마커 제외)만 집계
 */
export function readRealCloudData(dateStr, limit) {
  const jsonlPath = join(PATHS.ciJsonl, `${dateStr}.jsonl`);
  if (!existsSync(jsonlPath)) return { realCount: 0, limit, totalMin: 0, last3: [] };

  const records = readJsonlFile(jsonlPath).filter(r =>
    r.runner_kind === 'cloud' && !isMarkerJob(r.job),
  );

  const totalMin = records.reduce((s, r) => s + (r.run_min || 0), 0);
  const last3 = records.slice(-3).reverse().map(r => ({
    job: r.job,
    conclusion: r.conclusion,
    run_min: r.run_min || 0,
  }));

  return { realCount: records.length, limit, totalMin, last3 };
}

const QUEUE_HUBS = ['m0', 'm1', 'm2', 'm3', 'r0'];

function scanUnclaimedIds() {
  const result = [];
  const nowMs = Date.now();
  for (const hub of QUEUE_HUBS) {
    const hubDir = join(PATHS.queueRoot, hub);
    if (!existsSync(hubDir)) continue;
    let files;
    try { files = readdirSync(hubDir); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.md')) continue;
      const id = f.replace(/\.md$/, '');
      const claimPath = join(PATHS.claims, `${id}.json`);
      let claimed = false;
      if (existsSync(claimPath)) {
        try {
          const c = JSON.parse(readFileSync(claimPath, 'utf8'));
          if (c.state && c.state !== 'issued') claimed = true;
        } catch {}
      }
      if (!claimed) {
        try {
          const st = statSync(join(hubDir, f));
          const ageMin = Math.round((nowMs - st.mtimeMs) / 60000);
          result.push({ id, ageMin });
        } catch {}
      }
    }
  }
  return result;
}

function macNotify(title, body) {
  if (process.platform !== 'darwin') return;
  const safe = body.replace(/"/g, "'");
  execFile('osascript', ['-e', `display notification "${safe}" with title "${title}"`], { timeout: 3000 }, () => {});
}

const notifiedAlertKeys = new Set();

function updateRunnerAlertNotifications(currentAlerts) {
  const currentKeys = new Set(currentAlerts.map(a => `${a.type}:${a.msg}`));
  for (const a of currentAlerts) {
    const key = `${a.type}:${a.msg}`;
    if (!notifiedAlertKeys.has(key)) {
      macNotify('러너 경보', a.msg);
      notifiedAlertKeys.add(key);
    }
  }
  for (const key of [...notifiedAlertKeys]) {
    if (!currentKeys.has(key)) notifiedAlertKeys.delete(key);
  }
}

function computeCiAlerts(runState) {
  const alerts = [];
  const HEAVY_WARN_MIN = 25;

  for (const j of runState.heavy.inProgress) {
    if ((j.running_min || 0) >= HEAVY_WARN_MIN) {
      alerts.push({ type: 'long_running', detail: `잡 ${j.running_min}분 경과 (${j.display})` });
    }
  }

  for (const side of ['heavy', 'light']) {
    const q = runState[side].queued;
    if (q.length > 0) {
      const oldest = q[0];
      if ((oldest.queued_min || 0) >= 10) {
        alerts.push({ type: 'queue_wait', detail: `${side} 대기 ${oldest.queued_min}분 (${oldest.display})` });
      }
    }
  }

  // light 잡이 heavy 뒤 5분+ 대기
  const lightOldest = runState.light.queued[0];
  if (lightOldest && (lightOldest.queued_min || 0) >= 5 && runState.heavy.inProgress.length > 0) {
    alerts.push({ type: 'light_blocked', detail: `light 대기 ${lightOldest.queued_min}분 (heavy 뒤)` });
  }

  return alerts;
}

let cachedRunState = { heavy: { inProgress: [], queued: [] }, light: { inProgress: [], queued: [] } };
let aheadSinceMs = null;
let runStateAt = 0;

async function tick(fullMode) {
  const dateStr = getWibDateStr();
  const cloudLimit = getCloudQuota(dateStr);

  if (Date.now() - runStateAt > RUNNER_REFRESH_MS) {
    try {
      cachedRunState = await fetchAllRunState();
      runStateAt = Date.now();
    } catch {}
  }

  const allJson = readAllJson();

  const cloudData = readRealCloudData(dateStr, cloudLimit);

  const rawUnclaimed = scanUnclaimedIds();
  const freshUnclaimed = filterFreshUnclaimed(rawUnclaimed);

  const { alerts: runnerAlerts, aheadSinceMs: newAheadSinceMs } = computeRunnerAlerts(allJson, {
    aheadSinceMs,
    unclaimedIds: freshUnclaimed,
  });
  aheadSinceMs = newAheadSinceMs;
  updateRunnerAlertNotifications(runnerAlerts);

  const ciAlerts = computeCiAlerts(cachedRunState);

  const nowStr = new Date().toLocaleString('en', {
    timeZone: 'Asia/Jakarta', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).replace(',', '');

  const lines = renderCompact({
    allJson,
    runState: cachedRunState,
    cloudData,
    runnerAlerts,
    ciAlerts,
    timeStr: nowStr,
    fullMode,
  });

  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(lines.join('\n') + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fullMode = process.argv.includes('--full');

  process.on('SIGINT', () => { process.stdout.write('\x1b[?25h\n'); process.exit(0); });
  process.stdout.write('\x1b[?25l');

  (async () => {
    await tick(fullMode);
    const loop = () => tick(fullMode).catch(() => {}).then(() => setTimeout(loop, REFRESH_MS));
    setTimeout(loop, REFRESH_MS);
  })();
}
