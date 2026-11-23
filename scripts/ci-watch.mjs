#!/usr/bin/env node
// scripts/ci-watch.mjs  CI 감시 터미널 대시보드 (M3-1123-E)
// Usage: node ~/projects/curiocity-relay/scripts/ci-watch.mjs

import { execFile, execFileSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

import { getWibDateStr, readJsonlFile } from './lib/ci-history.mjs';

const REFRESH_MS = 30_000;
const RUNNER_REFRESH_MS = 120_000;
const PUSH_INTERVAL_MS = 600_000;
const HEAVY_WARN_MIN = 30;
const HEAVY_CRIT_MIN = 45;
const QUEUE_WARN_MIN = 10;
const CLOUD_DAILY_LIMIT = 5;

const PROMPT_ID_RE = /([MRTNK]\d-\d{4}-[A-Z]+)/;

const PATHS = {
  ledgerHistory: join(REPO_ROOT, 'ledger', 'ci-history.jsonl'),
  ledgerDaily: join(REPO_ROOT, 'ledger', 'ci-daily.md'),
  alerts: join(REPO_ROOT, 'status', 'ci-alerts.json'),
  cloudQuota: join(REPO_ROOT, 'ci', 'cloud-quota'),
  ciJsonl: join(REPO_ROOT, 'status', 'ci'),
  allJson: join(REPO_ROOT, 'status', 'runners', 'all.json'),
  runnerHeavy: join(homedir(), 'actions-runner'),
  runnerLight: join(homedir(), 'actions-runner-light'),
};

const REPOS = [
  'CuriocityDevAi/storeport',
  'CuriocityDevAi/agilo-medusa-pos-fork',
];

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const col = (text, ...codes) => codes.join('') + text + C.reset;

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
  if (!prCache.has(key)) {
    const pid = extractPromptId(headBranch);
    prPromptCache.set(key, pid);
  }
}

function lookupPrPrompt(repo, prNum) {
  if (!prNum) return null;
  return prPromptCache.get(`${repo}:${prNum}`) || null;
}

const prCache = prPromptCache;

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

async function fetchRunners() {
  const result = { heavy_online: 0, heavy_busy: 0, light_online: 0 };
  for (const repo of REPOS) {
    try {
      const d = await ghApi(`repos/${repo}/actions/runners?per_page=100`);
      for (const r of (d.runners || [])) {
        const labels = (r.labels || []).map(l => l.name || l);
        if (labels.includes('curiocity-mac-light')) {
          if (r.status === 'online') result.light_online++;
        } else if (labels.some(l => l === 'curiocity-mac' || l === 'curiocity-mac-heavy')) {
          if (r.status === 'online') result.heavy_online++;
          if (r.busy) result.heavy_busy++;
        }
      }
    } catch {}
  }
  return result;
}

function readAllJson() {
  if (!existsSync(PATHS.allJson)) return null;
  try { return JSON.parse(readFileSync(PATHS.allJson, 'utf8')); }
  catch { return null; }
}

function getLatestDiagLog(runnerDir) {
  const diagDir = join(runnerDir, '_diag');
  if (!existsSync(diagDir)) return null;
  try {
    const files = readdirSync(diagDir)
      .filter(f => f.startsWith('Worker_') && f.endsWith('.log'))
      .sort();
    return files.length ? join(diagDir, files[files.length - 1]) : null;
  } catch { return null; }
}

function logTail(logPath, n = 8) {
  if (!logPath || !existsSync(logPath)) return [];
  try {
    return readFileSync(logPath, 'utf8').split('\n').filter(Boolean).slice(-n);
  } catch { return []; }
}

const histSeenIds = new Set();
let lastPushAt = 0;

function loadHistSeenIds() {
  if (!existsSync(PATHS.ledgerHistory)) return;
  for (const line of readFileSync(PATHS.ledgerHistory, 'utf8').split('\n').filter(Boolean)) {
    try { const r = JSON.parse(line); if (r.id) histSeenIds.add(String(r.id)); } catch {}
  }
}

function detectAndRecordCompleted() {
  const dateStr = getWibDateStr();
  const jsonlPath = join(PATHS.ciJsonl, `${dateStr}.jsonl`);
  if (!existsSync(jsonlPath)) return 0;

  const srcRecs = readJsonlFile(jsonlPath);
  const newOnes = [];

  for (const rec of srcRecs) {
    if (histSeenIds.has(String(rec.id))) continue;
    const prNum = rec.pr ? String(rec.pr) : null;
    const promptId = prNum ? lookupPrPrompt(rec.repo, prNum) : null;
    newOnes.push({
      id: rec.id,
      date: dateStr,
      prompt_id: promptId,
      repo: rec.repo,
      pr: prNum ? `#${prNum}` : null,
      check: rec.job,
      runner: rec.runner_kind,
      queued_at: rec.created_at,
      started_at: rec.started_at,
      finished_at: rec.completed_at,
      wait_min: rec.wait_min,
      run_min: rec.run_min,
      result: rec.conclusion,
    });
  }

  if (newOnes.length > 0) {
    mkdirSync(join(REPO_ROOT, 'ledger'), { recursive: true });
    for (const rec of newOnes) {
      histSeenIds.add(String(rec.id));
      appendFileSync(PATHS.ledgerHistory, JSON.stringify(rec) + '\n', 'utf8');
    }
    updateDailyMd(dateStr);
  }
  return newOnes.length;
}

function updateDailyMd(dateStr) {
  if (!existsSync(PATHS.ledgerHistory)) return;
  const all = readFileSync(PATHS.ledgerHistory, 'utf8').split('\n').filter(Boolean);
  const today = [];
  for (const l of all) {
    try { const r = JSON.parse(l); if (r.date === dateStr) today.push(r); } catch {}
  }
  if (!today.length) return;

  const mac = today.filter(r => r.runner !== 'cloud');
  const cloud = today.filter(r => r.runner === 'cloud');
  const avgMin = arr => {
    const v = arr.map(x => x.run_min || 0).filter(x => x > 0);
    return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length * 10) / 10 : 0;
  };
  const cloudIds = [...new Set(cloud.map(r => r.prompt_id).filter(Boolean))].join(', ') || '-';
  const newLine = `| ${dateStr} | Mac: ${mac.length} (avg ${avgMin(mac)}m) | Cloud: ${cloud.length}/${CLOUD_DAILY_LIMIT} (avg ${avgMin(cloud)}m) | ${cloudIds} |`;

  mkdirSync(join(REPO_ROOT, 'ledger'), { recursive: true });
  let content = existsSync(PATHS.ledgerDaily)
    ? readFileSync(PATHS.ledgerDaily, 'utf8')
    : '# CI 일별 요약\n\n| 날짜 | Mac | Cloud | 클라우드 처리 ID |\n|---|---|---|---|\n';

  if (content.includes(`| ${dateStr} |`)) {
    content = content.split('\n').map(l => l.startsWith(`| ${dateStr} |`) ? newLine : l).join('\n');
  } else {
    content = content.trimEnd() + '\n' + newLine + '\n';
  }
  writeFileSync(PATHS.ledgerDaily, content, 'utf8');
}

function countCloudToday(dateStr) {
  if (!existsSync(PATHS.ledgerHistory)) return 0;
  return readFileSync(PATHS.ledgerHistory, 'utf8').split('\n').filter(Boolean)
    .reduce((n, l) => {
      try { const r = JSON.parse(l); return r.runner === 'cloud' && r.date === dateStr ? n + 1 : n; }
      catch { return n; }
    }, 0);
}

function computeAlerts(runState, runners) {
  const alerts = [];

  for (const j of runState.heavy.inProgress) {
    if ((j.running_min || 0) >= HEAVY_CRIT_MIN) {
      alerts.push({ type: 'stuck_suspected', detail: `${j.check} ${j.running_min}분 경과 (${j.display})` });
    } else if ((j.running_min || 0) >= HEAVY_WARN_MIN) {
      alerts.push({ type: 'long_running', detail: `${j.check} ${j.running_min}분 경과 (${j.display})` });
    }
  }

  if (runState.heavy.queued.length > 0) {
    const oldest = runState.heavy.queued[0];
    if ((oldest.queued_min || 0) >= QUEUE_WARN_MIN) {
      alerts.push({ type: 'queue_wait', detail: `heavy 대기 ${oldest.queued_min}분 미감소 (${oldest.display})` });
    }
  }

  if (runners.heavy_online === 0) {
    alerts.push({ type: 'runner_offline', detail: 'curiocity-mac (heavy) offline' });
  }
  if (runners.light_online === 0) {
    alerts.push({ type: 'runner_offline', detail: 'curiocity-mac-light (light) offline' });
  }

  return alerts;
}

function writeAlerts(alerts) {
  writeFileSync(PATHS.alerts, JSON.stringify({ at: new Date().toISOString(), alerts }, null, 2) + '\n', 'utf8');
}

function gitPush() {
  try {
    const toAdd = [PATHS.ledgerHistory, PATHS.ledgerDaily, PATHS.alerts].filter(existsSync);
    if (!toAdd.length) return;
    execFileSync('git', ['add', ...toAdd], { cwd: REPO_ROOT, stdio: 'ignore' });
    const st = execFileSync('git', ['status', '--porcelain'], { cwd: REPO_ROOT }).toString().trim();
    if (!st) return;
    execFileSync('git', ['commit', '-m', `ci-watch: 기록 ${getWibDateStr()}`], { cwd: REPO_ROOT, stdio: 'ignore' });
    try {
      execFileSync('git', ['pull', '--rebase', 'origin', 'main'], { cwd: REPO_ROOT, stdio: 'ignore' });
    } catch {
      try { execFileSync('git', ['rebase', '--abort'], { cwd: REPO_ROOT, stdio: 'ignore' }); } catch {}
      return;
    }
    execFileSync('git', ['push', 'origin', 'main'], { cwd: REPO_ROOT, stdio: 'ignore' });
    lastPushAt = Date.now();
  } catch {}
}

function render(runState, runners, cloudInProgress, dateStr, cloudLimit) {
  const W = process.stdout.columns || 100;
  const hr = '─'.repeat(Math.min(W - 1, 100));
  const lines = [];

  const nowStr = new Date().toLocaleString('en', {
    timeZone: 'Asia/Jakarta', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).replace(',', '');

  lines.push(col(`CI 감시 대시보드  ${nowStr} WIB`, C.bold));
  lines.push(hr);

  lines.push(col('■ 1. 러너', C.bold, C.cyan));

  const fmtRunner = (name, kind, online, busy, jobs) => {
    const s = !online ? col('오프라인', C.red)
      : busy ? col('BUSY', C.yellow) : col('온라인', C.green);
    if (!jobs.length) return `  ${col(name, C.bold)} (${kind})  ${s}  잡: -`;
    const j = jobs[0];
    const pid = j.prompt_id || j.display || j.pr;
    const rmin = j.running_min ?? '-';
    const c = typeof rmin === 'number'
      ? (rmin >= HEAVY_CRIT_MIN ? C.red : rmin >= HEAVY_WARN_MIN ? C.yellow : '') : '';
    const stuck = typeof rmin === 'number' && rmin >= HEAVY_CRIT_MIN ? col(' ⚠멈춤의심', C.red) : '';
    return `  ${col(name, C.bold)} (${kind})  ${s}  ${c}${pid}${C.reset} ${j.display} ${j.check} ${rmin}분${stuck}`;
  };

  lines.push(fmtRunner('curiocity-mac', 'heavy', runners.heavy_online > 0, runners.heavy_busy > 0, runState.heavy.inProgress));
  lines.push(fmtRunner('curiocity-mac-light', 'light', runners.light_online > 0, false, runState.light.inProgress));
  lines.push('');

  lines.push(col('■ 2. 대기열', C.bold, C.cyan));
  const cloudCount = countCloudToday(dateStr);
  const remaining = cloudLimit - cloudCount;
  const willCloud = runners.heavy_busy > 0 || runners.heavy_online === 0;

  lines.push(`  ${col('heavy', C.bold)} (${runState.heavy.queued.length}건)${willCloud ? col('  → 클라우드 가능', C.cyan) : ''}`);
  if (!runState.heavy.queued.length) {
    lines.push('    대기 없음');
  } else {
    for (let i = 0; i < runState.heavy.queued.length; i++) {
      const q = runState.heavy.queued[i];
      const pid = q.prompt_id || q.display;
      const qm = q.queued_min ?? '-';
      const c = typeof qm === 'number' && qm >= QUEUE_WARN_MIN ? C.yellow : '';
      const cloudTag = willCloud && i < remaining
        ? col(' ☁클라우드예정', C.cyan)
        : willCloud && i >= remaining
          ? col(' ☁한도초과·로컬대기', C.red)
          : '';
      lines.push(`    ${c}${pid}${C.reset}  ${q.display}  ${q.check}  대기 ${qm}분${cloudTag}`);
    }
  }
  lines.push(`  ${col('오늘 클라우드', C.dim)}: ${cloudCount}/${cloudLimit}  남은 슬롯: ${Math.max(0, remaining)}`);
  lines.push('');

  lines.push(`  ${col('light', C.bold)} (${runState.light.queued.length}건)`);
  if (!runState.light.queued.length) {
    lines.push('    대기 없음');
  } else {
    for (const q of runState.light.queued) {
      const pid = q.prompt_id || q.display;
      const qm = q.queued_min ?? '-';
      const c = typeof qm === 'number' && qm >= QUEUE_WARN_MIN ? C.yellow : '';
      lines.push(`    ${c}${pid}${C.reset}  ${q.display}  ${q.check}  대기 ${qm}분`);
    }
  }
  lines.push('');

  lines.push(col('■ 3. 클라우드 사용 (오늘)', C.bold, C.cyan));

  if (cloudInProgress.length) {
    lines.push('  진행중:');
    for (const j of cloudInProgress) {
      const pid = extractPromptId(j.pr_display) || j.pr_display || j.pr;
      lines.push(`    ${pid}  ${j.pr_display || j.pr}  ${j.job}  ${j.running_min ?? '-'}분`);
    }
  }

  if (existsSync(PATHS.ledgerHistory)) {
    const todayCloud = readFileSync(PATHS.ledgerHistory, 'utf8').split('\n').filter(Boolean)
      .flatMap(l => {
        try { const r = JSON.parse(l); return r.runner === 'cloud' && r.date === dateStr ? [r] : []; }
        catch { return []; }
      });
    if (todayCloud.length) {
      lines.push(`  완료 (${todayCloud.length}/${cloudLimit}):`);
      for (const r of todayCloud) {
        const pid = r.prompt_id || r.pr || '-';
        const rsh = r.repo ? repoShort(r.repo) : '';
        const res = r.result === 'success' ? col('✓', C.green) : col('✗', C.red);
        lines.push(`    ${pid}  ${rsh}${r.pr || ''}  ${r.check}  ${(r.run_min || 0).toFixed(1)}분  ${res}`);
      }
    } else {
      lines.push('  완료된 클라우드 잡 없음');
    }
  } else {
    lines.push('  이력 없음 (ledger/ci-history.jsonl 없음)');
  }
  lines.push('');

  lines.push(col('■ 4. 로그 (heavy 러너 · Worker.log 마지막 8줄)', C.bold, C.cyan));
  const logPath = getLatestDiagLog(PATHS.runnerHeavy);
  const logLines = logTail(logPath, 8);
  if (logLines.length) {
    for (const l of logLines) lines.push(col('  ' + l.slice(0, W - 4), C.dim));
  } else {
    lines.push('  로그 없음');
  }
  lines.push('');
  lines.push(col(`  갱신 30초  |  Ctrl+C 종료`, C.dim));

  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(lines.join('\n') + '\n');
}

let cachedRunners = { heavy_online: 0, heavy_busy: 0, light_online: 0 };
let runnersAt = 0;

async function tick() {
  const dateStr = getWibDateStr();
  const cloudLimit = getCloudQuota(dateStr);

  let runState = { heavy: { inProgress: [], queued: [] }, light: { inProgress: [], queued: [] } };
  try { runState = await fetchAllRunState(); } catch {}

  if (Date.now() - runnersAt > RUNNER_REFRESH_MS) {
    try {
      cachedRunners = await fetchRunners();
      runnersAt = Date.now();
    } catch {}
  }

  const allJson = readAllJson();
  const cloudInProgress = allJson?.ci?.data?.cloud_in_progress || [];

  detectAndRecordCompleted();

  const alerts = computeAlerts(runState, cachedRunners);
  writeAlerts(alerts);

  if (Date.now() - lastPushAt > PUSH_INTERVAL_MS) {
    gitPush();
  }

  render(runState, cachedRunners, cloudInProgress, dateStr, cloudLimit);
}

import { pathToFileURL } from 'node:url';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadHistSeenIds();
  process.on('SIGINT', () => { process.stdout.write('\x1b[?25h\n'); process.exit(0); });
  process.stdout.write('\x1b[?25l');

  (async () => {
    await tick();
    const loop = () => tick().catch(() => {}).then(() => setTimeout(loop, REFRESH_MS));
    setTimeout(loop, REFRESH_MS);
  })();
}
