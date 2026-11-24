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
const CI_LAST_CACHE_MS = 120_000; // gh run list 2분 캐시

// --- err_tail 오류 허용 목록 판정 (M2-1124-A) ---
// 이 목록에 매칭되는 줄만 ⚠. 나머지는 정상 정보 줄.
const ERR_PATTERNS = [
  /실패/,
  /\bfatal\b/i,
  /\bError\b/,
  /\berror:/i,
  /\bblocked\b/i,
  /침범/,
  /\btimeout\b/i,
  /\bconflict\b/i,
  /\bneeds_human\b/,
  /Could not resolve host/i,
];

function isErrLine(line) {
  return ERR_PATTERNS.some(p => p.test(line));
}

/**
 * err_tail 에서 허용 목록 패턴에 해당하는 줄만 집계.
 * resolved=true 이면 경보 카운트 제외 · err_tail 표시 영역에 "[해소됨]" 으로 표기.
 */
function computeErrTailAlerts(allJson) {
  if (!allJson?.err_tail) return [];
  const lines = allJson.err_tail.split('\n').filter(Boolean);
  const errLines = lines.filter(isErrLine);
  if (!errLines.length) return [];

  const counts = new Map();
  for (const l of errLines) counts.set(l, (counts.get(l) || 0) + 1);

  const gs = allJson.git_state;
  const gitClean = gs && !gs.needs_human && !(gs.conflicted?.length) && (gs.ahead || 0) === 0;
  const lastLine = lines[lines.length - 1];
  const recoveredByLog = !!(lastLine && !isErrLine(lastLine));
  const resolved = gitClean && recoveredByLog;

  const alerts = [];
  for (const [line, count] of counts) {
    if (count >= 3) {
      const summary = line.length > 80 ? line.slice(0, 80) + '…' : line;
      alerts.push({ type: resolved ? 'err_repeat_resolved' : 'err_repeat', msg: `오류 ${count}회 반복: ${summary}`, resolved });
    }
  }
  return alerts;
}

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

// --- 마지막 완료 CI (JSONL + gh run list 폴백) ---

const lastCiGhCache = new Map(); // repo → { data, fetchedAt }

function readLastCiFromJsonl(dateStr) {
  const jsonlPath = join(PATHS.ciJsonl, `${dateStr}.jsonl`);
  if (!existsSync(jsonlPath)) return {};
  try {
    const records = readJsonlFile(jsonlPath);
    const byRepo = {};
    for (const r of records) {
      if (!r.completed_at || !r.repo || isMarkerJob(r.job)) continue;
      if (!byRepo[r.repo] || r.completed_at > byRepo[r.repo].completed_at) {
        byRepo[r.repo] = r;
      }
    }
    return byRepo;
  } catch { return {}; }
}

async function fetchLastCiGh(repo) {
  const cached = lastCiGhCache.get(repo);
  if (cached && Date.now() - cached.fetchedAt < CI_LAST_CACHE_MS) return cached.data;
  try {
    const { stdout } = await execFileAsync(
      'gh', ['run', 'list', '--repo', repo, '--status', 'completed', '--limit', '1',
             '--json', 'databaseId,name,conclusion,updatedAt,headBranch,event,workflowName,number'],
      { timeout: 10_000, maxBuffer: 512 * 1024 },
    );
    const runs = JSON.parse(stdout);
    const data = runs[0] || null;
    lastCiGhCache.set(repo, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    if (cached) return cached.data;
    lastCiGhCache.set(repo, { data: null, fetchedAt: Date.now() });
    return null;
  }
}

async function getLastCiByRepo(dateStr) {
  const jsonlData = readLastCiFromJsonl(dateStr);
  return Promise.all(REPOS.map(async repo => {
    const r = jsonlData[repo];
    if (r) {
      return { repo, completed_at: r.completed_at, conclusion: r.conclusion, workflow: r.workflow, job: r.job, pr: r.pr };
    }
    const run = await fetchLastCiGh(repo).catch(() => null);
    if (!run) return { repo, completed_at: null, conclusion: null, workflow: null, job: null, pr: null };
    return { repo, completed_at: run.updatedAt, conclusion: run.conclusion, workflow: run.workflowName || run.name, job: null, pr: null };
  }));
}

// --- CI 요약 경보: 멈춤 의심 · playwright 건너뜀 ---

function computeCiSummaryAlerts(allJson, lastCiByRepo, dateStr) {
  const alerts = [];
  const heavyQueued = allJson?.ci?.data?.heavy?.queued || 0;
  const lightQueued = allJson?.ci?.data?.light?.queued || 0;
  const heavyOldestMin = allJson?.ci?.data?.heavy?.oldest_queued_min || 0;
  const lightOldestMin = allJson?.ci?.data?.light?.oldest_queued_min || 0;
  const worstQueueMin = Math.max(heavyOldestMin, lightOldestMin);
  const anyActive = heavyQueued > 0 || lightQueued > 0 ||
    (allJson?.ci?.data?.heavy?.in_progress?.length || 0) > 0 ||
    (allJson?.ci?.data?.cloud_in_progress?.length || 0) > 0;

  // CI 멈춤: 활성 잡이 있는데 마지막 완료가 30분+ 이상 전
  if (anyActive && lastCiByRepo.length > 0) {
    const completedMins = lastCiByRepo
      .filter(x => x.completed_at)
      .map(x => Math.round((Date.now() - new Date(x.completed_at).getTime()) / 60_000));
    const minSinceCompleted = completedMins.length ? Math.min(...completedMins) : null;
    if (minSinceCompleted !== null && minSinceCompleted > 30) {
      alerts.push({ type: 'ci_stall', msg: `CI 멈춤 의심 (마지막 완료 ${minSinceCompleted}분 전)`, detail: `CI 멈춤 의심 (마지막 완료 ${minSinceCompleted}분 전)` });
    }
  }
  // CI 멈춤: 큐 대기 30분+
  if (worstQueueMin >= 30) {
    alerts.push({ type: 'ci_stall_queue', msg: `CI 멈춤 의심 (대기 ${worstQueueMin}분)`, detail: `CI 멈춤 의심 (대기 ${worstQueueMin}분)` });
  }

  // playwright 건너뜀 → dim 안내
  const jsonlPath = join(PATHS.ciJsonl, `${dateStr}.jsonl`);
  if (existsSync(jsonlPath)) {
    try {
      const records = readJsonlFile(jsonlPath);
      const playwrightJobs = records.filter(r => r.job === 'playwright');
      const lastPlaywright = playwrightJobs[playwrightJobs.length - 1];
      if (lastPlaywright?.conclusion === 'skipped') {
        alerts.push({ type: 'playwright_skip', msg: 'heavy 미실행(선행 실패)', dim: true });
      }
    } catch {}
  }

  return alerts;
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

// --- 허브 대기 큐 판정 (M2-1124-D) ---
// hub-runner-v7.8 의 listQueue + pickNext 규칙을 읽기 전용으로 복제.
// 러너 규칙과 다르면 표시가 틀릴 수 있음.
function listHubPendingIds(hub) {
  const hubDir = join(PATHS.queueRoot, hub);
  if (!existsSync(hubDir)) return [];
  let files;
  try { files = readdirSync(hubDir); } catch { return []; }

  const ids = files
    .filter(f => f.endsWith('.md') && !f.endsWith('-report.md') && !f.endsWith('-selftest.md'))
    .map(f => f.replace(/\.md$/, ''))
    .sort((a, b) => a.localeCompare(b));

  const pending = [];
  for (const id of ids) {
    const claimPath = join(PATHS.claims, `${id}.json`);
    if (!existsSync(claimPath)) { pending.push(id); continue; }
    try {
      const c = JSON.parse(readFileSync(claimPath, 'utf8'));
      if (c.state === 'issued') pending.push(id);
    } catch { /* 파싱 실패 → non-pending 취급 */ }
  }
  return pending;
}

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const HUB_LINE_RE = /^  ([a-z][0-9])  /;
const HUB_LINE_SET = new Set(['m0', 'm1', 'm2', 'm3', 'r0']);

function appendHubPending(lines, hubPending) {
  return lines.map(line => {
    const stripped = line.replace(ANSI_RE, '');
    const m = stripped.match(HUB_LINE_RE);
    if (!m || !HUB_LINE_SET.has(m[1])) return line;
    const pending = hubPending[m[1]];
    if (!pending || !pending.length) return line;
    return line + `  \x1b[2m[${pending.join(', ')}]\x1b[0m`;
  });
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

  // err_tail 은 허용 목록 방식으로 직접 판정 → computeRunnerAlerts 에는 넘기지 않음
  const allJsonNoErr = allJson ? { ...allJson, err_tail: '' } : allJson;
  const { alerts: rawRunnerAlerts, aheadSinceMs: newAheadSinceMs } = computeRunnerAlerts(allJsonNoErr, {
    aheadSinceMs,
    unclaimedIds: freshUnclaimed,
  });
  aheadSinceMs = newAheadSinceMs;

  const errAlerts = computeErrTailAlerts(allJson);
  const runnerAlerts = [...rawRunnerAlerts, ...errAlerts.filter(a => !a.resolved)];
  updateRunnerAlertNotifications(runnerAlerts);

  const ciAlerts = computeCiAlerts(cachedRunState);

  const lastCiByRepo = await getLastCiByRepo(dateStr).catch(() => []);
  const ciSummaryAlerts = computeCiSummaryAlerts(allJson, lastCiByRepo, dateStr);
  const todayStats = allJson?.ci?.data?.today || null;
  const cloudTodayCount = allJson?.ci?.data?.cloud_today ?? null;

  // 해소됨 오류 → err_tail 표시 영역(회색 줄)에 추가 · 경보 카운트 제외
  const resolvedErrAlerts = errAlerts.filter(a => a.resolved);
  let renderAllJson = allJson;
  if (resolvedErrAlerts.length > 0) {
    const tail = allJson?.err_tail?.split('\n').filter(Boolean).slice(-1).join('\n') || '';
    const resolvedNote = resolvedErrAlerts.map(a => `[해소됨] ${a.msg}`).join('\n');
    renderAllJson = { ...allJson, err_tail: (tail ? tail + '\n' : '') + resolvedNote };
  }

  const nowStr = new Date().toLocaleString('en', {
    timeZone: 'Asia/Jakarta', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).replace(',', '');

  const hubPending = {};
  for (const hub of QUEUE_HUBS) {
    hubPending[hub] = listHubPendingIds(hub);
  }

  const lines = renderCompact({
    allJson: renderAllJson,
    runState: cachedRunState,
    cloudData,
    runnerAlerts,
    ciAlerts: [...ciAlerts, ...ciSummaryAlerts.filter(a => !a.dim)],
    ciDimAlerts: ciSummaryAlerts.filter(a => a.dim),
    timeStr: nowStr,
    fullMode,
    todayStats,
    cloudTodayCount,
    cloudLimit,
    lastCiByRepo,
  });

  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(appendHubPending(lines, hubPending).join('\n') + '\n');
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
