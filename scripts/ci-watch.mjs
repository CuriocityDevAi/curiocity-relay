#!/usr/bin/env node
// scripts/ci-watch.mjs  CI 감시 터미널 대시보드 (M1-1123-K)
// Usage: node ~/projects/curiocity-relay/scripts/ci-watch.mjs [--full]
//
// 화면 전용 · 읽기 전용 — relay git 쓰기 없음.
// 로컬 캐시는 ~/.hub-runner/ci-watch/ 에만 쓴다.
//
// !! ci-watch 를 바꾸는 모든 프롬프트는 CI_WATCH_VERSION 을 올릴 것.
// 버전 이력: 1.0 최초 · 1.1 M2-1124-A · 1.2 M2-1124-C~F · 1.3 M2-1124-H+I · 1.4 M2-1124-K

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
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
import { getWibDateStr, readJsonlFile } from './lib/ci-history.mjs';
import { readAllLocalRunnerStates } from './lib/local-ci.mjs';
import { computeRunnerAlerts } from './watch/runner-alerts.mjs';
import {
  isMarkerJob,
  filterFreshUnclaimed,
  buildRunnerRows,
  renderCompact,
} from './watch/ci-watch-render.mjs';

const CI_WATCH_VERSION = '1.4';

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
// M1-1124-H: ci-watch 는 `~/.hub-runner/bin/ci-watch.mjs` 로 배포돼 실행될 수 있다.
// 그 경우 REPO_ROOT 는 ~/.hub-runner 가 아니라 실제 clone (~/projects/curiocity-relay) 이어야 한다.
// 배포 경로 식별 규칙: HERE 가 `.hub-runner/bin` 와 같으면 배포본으로 간주.
const CI_WATCH_DEPLOY_HOME_BIN = join(homedir(), '.hub-runner', 'bin');
const CI_WATCH_IS_DEPLOYED = HERE === CI_WATCH_DEPLOY_HOME_BIN;
const REPO_ROOT = CI_WATCH_IS_DEPLOYED
  ? join(homedir(), 'projects', 'curiocity-relay')
  : resolve(HERE, '..');
const THIS_FILE = fileURLToPath(import.meta.url);

const LOCAL_REFRESH_MS = 3_000;              // 화면 갱신 · 로컬 전용 · GitHub 호출 없음
const GH_QUEUE_REFRESH_MS = 30_000;          // GitHub 대기열+클라우드 조회 간격
const GH_IDLE_REFRESH_MS = 5 * 60_000;       // 러너 전부 idle 시 GitHub 간격 (5분)
const RATE_LIMIT_SLOW_THRESHOLD = 500;        // rate_limit 잔여 < 500 → GH_IDLE_REFRESH_MS
const CLOUD_DAILY_LIMIT = 5;
const CI_LAST_CACHE_MS = 120_000;             // gh run list 2분 캐시

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

// REQ 2 (M2-1124-F): 프롬프트 ID에서 허브 코드 추출 ("M2-1124-F" → "m2")
function extractHubFromId(id) {
  const m = String(id || '').match(/^([A-Za-z])(\d)/);
  if (!m) return null;
  return m[1].toLowerCase() + m[2];
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

// --- REQ 1 (M2-1124-F): BUSY 러너 실행 중 잡 표시 ---

const busyPrPromptCache = new Map(); // "repo:prNum" → { promptId, fetchedAt }
const BUSY_CACHE_MS = 120_000;

async function fetchBusyPromptId(repo, prNum) {
  if (!repo || !prNum) return null;
  const key = `${repo}:${prNum}`;
  const cached = busyPrPromptCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < BUSY_CACHE_MS) return cached.promptId;

  // prPromptCache 에 이미 있으면 기본값으로 사용
  let promptId = lookupPrPrompt(repo, String(prNum)) || null;

  try {
    // 마지막 커밋 메시지 ID 우선 (stacked PR 대응)
    const commits = await ghApi(`repos/${repo}/pulls/${prNum}/commits?per_page=100`);
    if (Array.isArray(commits) && commits.length > 0) {
      const lastMsg = commits[commits.length - 1].commit?.message || '';
      const commitId = extractPromptId(lastMsg);
      if (commitId) promptId = commitId;
    }
  } catch {}

  busyPrPromptCache.set(key, { promptId, fetchedAt: Date.now() });
  return promptId;
}

async function buildBusyJobMap(allJson, localStates) {
  const result = new Map(); // runnerName → { pr, promptId, jobName, runningMin }
  const fromAllJson = [
    ...(allJson?.ci?.data?.heavy?.in_progress || []),
    ...(allJson?.ci?.data?.light?.in_progress || []),
  ];
  // 로컬 상태로 보완: allJson 미반영 러너가 local 에서 running 이면 추가
  const coveredRunners = new Set(fromAllJson.filter(j => j.runner).map(j => j.runner));
  const localExtra = (localStates || [])
    .filter(s => s.running && !coveredRunners.has(s.name))
    .map(s => ({ runner: s.name, repo: s.repo, pr: '-', job: s.jobName || '', running_min: s.runningMin ?? null }));
  const inProgressAll = [...fromAllJson, ...localExtra];

  await Promise.all(inProgressAll.filter(j => j.runner).map(async j => {
    const prNum = (j.pr || '').replace('#', '');
    const promptId = await fetchBusyPromptId(j.repo, prNum || null);
    result.set(j.runner, {
      pr: j.pr || '-',
      promptId,
      jobName: j.job || '',
      runningMin: j.running_min ?? null,
    });
  }));
  return result;
}

const BUSY_MARKER = '\x1b[33m●BUSY\x1b[0m';

function enhanceBusyLines(lines, busyJobMap) {
  if (!busyJobMap || !busyJobMap.size) return lines;
  return lines.map(line => {
    const busyIdx = line.indexOf(BUSY_MARKER);
    if (busyIdx === -1) return line;

    // prefix 에서 러너 이름 추출 (ANSI 제거 후 두 번째 토큰)
    const prefix = line.slice(0, busyIdx);
    const plainPrefix = prefix.replace(/\x1b\[[0-9;]*m/g, '');
    const tokens = plainPrefix.trim().split(/\s+/);
    // tokens[0] = "fork-heavy", tokens[1] = "curiocity-mac-fork"
    const runnerName = tokens[1];
    if (!runnerName) return line;

    const details = busyJobMap.get(runnerName);
    if (!details) return line;

    const { pr, promptId, jobName, runningMin } = details;
    const parts = [pr || '-'];
    if (promptId) parts.push(promptId);
    if (jobName) parts.push(jobName);
    if (runningMin != null) parts.push(`${runningMin}분째`);

    const jobStr = parts.join(' · ');
    const colorCode = typeof runningMin === 'number' && runningMin >= 25 ? '\x1b[31m'
      : typeof runningMin === 'number' && runningMin >= 15 ? '\x1b[33m' : '';
    return prefix + BUSY_MARKER + '  ' + colorCode + jobStr + '\x1b[0m';
  });
}

// GitHub 에서 대기열(queued) + 클라우드 실행중(in_progress) 만 조회.
// 로컬 self-hosted 실행 중인 잡은 local-ci.mjs 에서 직접 읽음 → GitHub 호출 불필요.
async function fetchQueuedForRepo(repo) {
  const [qData, ipData] = await Promise.all([
    ghApi(`repos/${repo}/actions/runs?status=queued&per_page=20`).catch(() => null),
    ghApi(`repos/${repo}/actions/runs?status=in_progress&per_page=20`).catch(() => null),
  ]);

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

  // GitHub 에서 보이는 in_progress 는 클라우드 잡일 수 있음.
  // 로컬 러너 이름과 대조해 로컬 잡은 tick() 에서 제외 처리.
  const cloudInProgress = [];
  for (const run of ((ipData && ipData.workflow_runs) || [])) {
    const prNum = run.pull_requests?.[0]?.number || null;
    const prStr = prNum ? `#${prNum}` : (run.head_branch || '-');
    const promptId = extractPromptId(run.head_branch) || extractPromptId(run.name) || null;
    if (prNum) cachePrPrompt(repo, String(prNum), run.head_branch);
    cloudInProgress.push({
      repo, prNum, pr: prStr,
      display: `${repoShort(repo)}${prStr}`,
      prompt_id: promptId,
      check: run.name || '',
      running_min: minSince(run.run_started_at || run.created_at),
      head_branch: run.head_branch,
      run_id: run.id,
      light: isLightWorkflow(run.name),
      runner: run.runner?.name || null,
    });
  }

  return { queued, cloudInProgress };
}

async function fetchGhQueueAndCloud() {
  const results = await Promise.all(REPOS.map(r => fetchQueuedForRepo(r).catch(() => ({ queued: [], cloudInProgress: [] }))));
  const heavy = { queued: [] };
  const light = { queued: [] };
  const cloudInProgress = [];

  for (const { queued, cloudInProgress: cip } of results) {
    for (const q of queued) (q.light ? light : heavy).queued.push(q);
    cloudInProgress.push(...cip);
  }

  heavy.queued.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  light.queued.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return { heavy, light, cloudInProgress };
}

// rate_limit 잔여량 확인 (1분 캐시)
async function checkRateLimit() {
  if (Date.now() - rateLimitCheckedAt < 60_000) return;
  try {
    const data = await ghApi('rate_limit');
    rateLimitRemaining = data?.resources?.core?.remaining ?? Infinity;
    rateLimitCheckedAt = Date.now();
  } catch {}
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

function fileContentHash(filePath) {
  try {
    return createHash('md5').update(readFileSync(filePath)).digest('hex').slice(0, 8);
  } catch { return ''; }
}

function readClaimState(id) {
  const p = join(PATHS.claims, `${id}.json`);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')).state || null; }
  catch { return null; }
}

// Returns { ids: string[], hashes: Map<id, string> } for a hub's pending queue.
function listHubPendingState(hub) {
  const hubDir = join(PATHS.queueRoot, hub);
  if (!existsSync(hubDir)) return { ids: [], hashes: new Map() };
  let files;
  try { files = readdirSync(hubDir); } catch { return { ids: [], hashes: new Map() }; }

  const sorted = files
    .filter(f => f.endsWith('.md') && !f.endsWith('-report.md') && !f.endsWith('-selftest.md'))
    .map(f => f.replace(/\.md$/, ''))
    .sort((a, b) => a.localeCompare(b));

  const ids = [];
  const hashes = new Map();
  for (const id of sorted) {
    const state = readClaimState(id);
    if (state !== null && state !== 'issued') continue;
    ids.push(id);
    hashes.set(id, fileContentHash(join(hubDir, `${id}.md`)));
  }
  return { ids, hashes };
}

function listHubPendingIds(hub) {
  return listHubPendingState(hub).ids;
}

// --- 대기 큐 변경 알림 (M2-1124-E) ---
// 직전 갱신 대비 추가·삭제·수정·순서 변경을 30초간 표시.

const prevHubQueue = new Map(); // hub → { ids: string[], hashes: Map }
const activeQueueNotifs = [];   // { hub, label, detectedAt }

function diffHubQueue(hub, prev, curr) {
  const labels = [];
  const prevSet = new Set(prev.ids);
  const currSet = new Set(curr.ids);

  for (const id of curr.ids) {
    if (!prevSet.has(id)) labels.push(`\x1b[32m+\x1b[0m ${id} 추가`);
  }

  for (const id of prev.ids) {
    if (!currSet.has(id)) {
      const st = readClaimState(id);
      if (st === 'started' || st === 'done') {
        labels.push(`\x1b[36m▶\x1b[0m ${id} 시작`);
      } else {
        labels.push(`\x1b[31m✕\x1b[0m ${id} 삭제`);
      }
    }
  }

  for (const id of curr.ids) {
    if (prevSet.has(id) && prev.hashes.get(id) !== curr.hashes.get(id)) {
      labels.push(`\x1b[33m✎\x1b[0m ${id} 내용 수정`);
    }
  }

  // 순서 변경: 공통 항목의 상대 순서 비교
  const commonPrev = prev.ids.filter(id => currSet.has(id));
  const commonCurr = curr.ids.filter(id => prevSet.has(id));
  if (commonPrev.length > 1 && commonPrev.join(',') !== commonCurr.join(',')) {
    labels.push(`\x1b[35m↕\x1b[0m 순서 변경: ${commonPrev.join(',')} → ${commonCurr.join(',')}`);
  }

  return labels;
}

function tickQueueDiff() {
  const now = Date.now();
  const NOTIF_TTL = 30_000;

  // 만료 제거
  let i = activeQueueNotifs.length;
  while (i--) {
    if (now - activeQueueNotifs[i].detectedAt >= NOTIF_TTL) activeQueueNotifs.splice(i, 1);
  }

  for (const hub of QUEUE_HUBS) {
    const curr = listHubPendingState(hub);
    const prev = prevHubQueue.get(hub);
    if (prev !== undefined) {
      for (const label of diffHubQueue(hub, prev, curr)) {
        activeQueueNotifs.push({ hub, label, detectedAt: now });
      }
    }
    prevHubQueue.set(hub, curr);
  }

  // hub별 현재 알림 목록 반환
  const byHub = {};
  for (const n of activeQueueNotifs) {
    if (!byHub[n.hub]) byHub[n.hub] = [];
    byHub[n.hub].push(n.label);
  }
  return byHub;
}

const ANSI_RE = /\x1b\[[0-9;]*m/g;
const HUB_LINE_RE = /^  ([a-z][0-9])  /;
const HUB_LINE_SET = new Set(['m0', 'm1', 'm2', 'm3', 'r0']);

function appendHubPending(lines, hubPending, hubNotifs) {
  const result = [];
  for (const line of lines) {
    const stripped = line.replace(ANSI_RE, '');
    const m = stripped.match(HUB_LINE_RE);
    if (!m || !HUB_LINE_SET.has(m[1])) { result.push(line); continue; }
    const hub = m[1];
    const pending = hubPending[hub];
    result.push(pending && pending.length
      ? line + `  \x1b[2m[${pending.join(', ')}]\x1b[0m`
      : line);
    for (const label of (hubNotifs[hub] || [])) {
      result.push(`       \x1b[2m${label}\x1b[0m`);
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

// GitHub 에서 가져온 대기열+클라우드 캐시 (30s or 5min 간격 갱신)
let cachedGhData = { heavy: { queued: [] }, light: { queued: [] }, cloudInProgress: [], fetchedAt: 0 };
let ghDataFetchedAt = 0;
let ghIgnoreCache = false;      // r 키로 GitHub 캐시 무시
let rateLimitRemaining = Infinity;
let rateLimitCheckedAt = 0;
let aheadSinceMs = null;

// --- M2-1124-I: 버전 표시 · 최신 아님 경고 · 파일 갱신 경고 ---

function isNewerVersion(v1, v2) {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] ?? 0;
    const b = p2[i] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

// 기동 시 1회 · git commit date (WIB) · 없으면 mtime
let fileCommitDate = '';
async function initFileCommitDate() {
  try {
    const { stdout } = await execFileAsync(
      'git', ['log', '-1', '--format=%cd', '--date=format-local:%Y%m%d', '--', 'scripts/ci-watch.mjs'],
      { cwd: REPO_ROOT, timeout: 5000, env: { ...process.env, TZ: 'Asia/Jakarta' } },
    );
    const d = stdout.trim();
    if (/^\d{8}$/.test(d)) { fileCommitDate = d; return; }
  } catch {}
  try {
    const st = statSync(THIS_FILE);
    const wibMs = st.mtimeMs + 7 * 3600 * 1000;
    const wd = new Date(wibMs);
    fileCommitDate = `${wd.getUTCFullYear()}${String(wd.getUTCMonth() + 1).padStart(2, '0')}${String(wd.getUTCDate()).padStart(2, '0')}`;
  } catch {}
}

// origin/main 버전 확인 · 5분 캐시 · fetch 금지
let originVersionCache = { version: null, different: false, checkedAt: 0 };
const ORIGIN_VERSION_CACHE_MS = 5 * 60 * 1000;

async function checkOriginVersion() {
  if (Date.now() - originVersionCache.checkedAt < ORIGIN_VERSION_CACHE_MS) {
    return originVersionCache;
  }
  try {
    const { stdout } = await execFileAsync(
      'git', ['show', 'origin/main:scripts/ci-watch.mjs'],
      { cwd: REPO_ROOT, timeout: 5000, maxBuffer: 1024 * 1024 },
    );
    const m = stdout.match(/\bCI_WATCH_VERSION\s*=\s*['"]([^'"]+)['"]/);
    const originVersion = m ? m[1] : null;
    let thisContent = '';
    try { thisContent = readFileSync(THIS_FILE, 'utf8'); } catch {}
    originVersionCache = { version: originVersion, different: stdout !== thisContent, checkedAt: Date.now() };
  } catch {
    originVersionCache = { ...originVersionCache, checkedAt: Date.now() };
  }
  return originVersionCache;
}

// 기동 시 실행 중 코드 해시 1회 고정 — 이후 디스크 변경 감지용
let runningCodeHash = '';
try { runningCodeHash = createHash('md5').update(readFileSync(THIS_FILE)).digest('hex'); } catch {}

function getDiskFileHash() {
  try { return createHash('md5').update(readFileSync(THIS_FILE)).digest('hex'); } catch { return ''; }
}

// M1-1124-H: 자기 파일 변화 감지 시 exit(0) → ci-watch.sh 래퍼가 재기동.
// 배포본일 때만 자동 재기동(원본 실행은 Kyu 가 Ctrl+C 로 결정하도록 v1.4 경고 유지).
function exitIfSelfChanged(tag = 'tick') {
  if (!runningCodeHash) return;
  const now = getDiskFileHash();
  if (!now || now === runningCodeHash) return;
  if (!CI_WATCH_IS_DEPLOYED) return;
  process.stdout.write('\x1b[?25h\n');
  process.stderr.write(`[ci-watch:self-update] 파일 변화 감지(${tag}) · exit(0) · 래퍼가 재기동\n`);
  process.exit(0);
}

// --- M2-1124-H: 카운트다운 + 키 입력 ---

let nextGhRefreshMs = 0;        // GH 큐 다음 갱신 시각 (카운트다운 표시용)
let countdownTimer = null;
let refreshTimer = null;
let isRendering = false;
let lastForceRefreshMs = 0;
const KEY_REFRESH_COOLDOWN_MS = 10_000;

function fmtCountdownLine(remainSec, fullMode, ghAgeStr, rateLimitWarn) {
  const extra = fullMode ? '' : '  --full: 전체 목록';
  const ghPart = ghAgeStr ? `  \x1b[2m${ghAgeStr}\x1b[0m` : '';
  const rlPart = rateLimitWarn ? `  \x1b[33m${rateLimitWarn}\x1b[0m` : '';
  return `\x1b[2m  로컬 3초 | GH큐 갱신 ${remainSec}초 | r GH캐시무시+즉시 · q 종료${extra}\x1b[0m${ghPart}${rlPart}`;
}

function startCountdownTimer(fullMode, ghAgeStr, rateLimitWarn) {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (isRendering) return;
    const remain = Math.max(0, Math.round((nextGhRefreshMs - Date.now()) / 1000));
    process.stdout.write('\x1b[1A\r\x1b[2K' + fmtCountdownLine(remain, fullMode, ghAgeStr, rateLimitWarn) + '\n');
  }, 1000);
}

function cleanupTerminal() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  try {
    if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
  } catch {}
  process.stdout.write('\x1b[?25h\n');
}

// ended_at 이 all.json 에 기록된 경우에만 작업시간·착지대기 분리 (M2-1124-H REQ 3)
function computeHubReportStatus(allJson) {
  const result = {};
  for (const hub of QUEUE_HUBS) {
    const h = allJson?.hubs?.[hub];
    if (!h?.current || !h?.ended_at) continue;
    const startMs = new Date(h.started_at).getTime();
    const endMs = new Date(h.ended_at).getTime();
    const workMin = Math.round((endMs - startMs) / 60000);
    const waitMin = Math.round((Date.now() - endMs) / 60000);
    const reportExists = existsSync(join(REPO_ROOT, hub, `${h.current}-report.md`));
    result[hub] = { workMin, waitMin, reportExists };
  }
  return result;
}

async function tick(fullMode) {
  const dateStr = getWibDateStr();
  const cloudLimit = getCloudQuota(dateStr);

  // === 1. 로컬 러너 상태 (3초마다 · GitHub 호출 없음) ===
  const localStates = readAllLocalRunnerStates();
  const allRunnersIdle = localStates.every(s => !s.running);

  // === 2. GitHub 대기열+클라우드 (30초 or idle 시 5분) ===
  const ghInterval = rateLimitRemaining < RATE_LIMIT_SLOW_THRESHOLD
    ? GH_IDLE_REFRESH_MS
    : (allRunnersIdle ? GH_IDLE_REFRESH_MS : GH_QUEUE_REFRESH_MS);

  if (ghIgnoreCache || Date.now() - ghDataFetchedAt > ghInterval) {
    ghIgnoreCache = false;
    try {
      const freshData = await fetchGhQueueAndCloud();
      cachedGhData = { ...freshData, fetchedAt: Date.now() };
      ghDataFetchedAt = Date.now();
    } catch {}
    checkRateLimit().catch(() => {});
  }

  // GH 캐시 나이 문자열 (회색 표시용)
  const ghAgeSec = ghDataFetchedAt > 0 ? Math.round((Date.now() - ghDataFetchedAt) / 1000) : null;
  const ghAgeStr = ghAgeSec !== null
    ? (ghAgeSec > 600 ? `\x1b[33mGH ${ghAgeSec}초 전\x1b[0m\x1b[2m` : `GH ${ghAgeSec}초 전`)
    : 'GH 미조회';
  const rateLimitWarn = rateLimitRemaining < RATE_LIMIT_SLOW_THRESHOLD
    ? `rate_limit ${rateLimitRemaining} → 5분 간격` : null;

  const allJson = readAllJson();
  const cloudData = readRealCloudData(dateStr, cloudLimit);
  const rawUnclaimed = scanUnclaimedIds();
  const freshUnclaimed = filterFreshUnclaimed(rawUnclaimed);

  // REQ 2 (M2-1124-F): 허브 BUSY 중이면 대기 큐 항목은 정상 대기 — idle 허브만 미투입 판정
  const idleUnclaimed = freshUnclaimed.filter(({ id }) => {
    const hub = extractHubFromId(id);
    return hub ? !allJson?.hubs?.[hub]?.current : true;
  });

  // err_tail 은 허용 목록 방식으로 직접 판정 → computeRunnerAlerts 에는 넘기지 않음
  const allJsonNoErr = allJson ? { ...allJson, err_tail: '' } : allJson;
  const { alerts: rawRunnerAlerts, aheadSinceMs: newAheadSinceMs } = computeRunnerAlerts(allJsonNoErr, {
    aheadSinceMs,
    unclaimedIds: idleUnclaimed,
  });
  aheadSinceMs = newAheadSinceMs;

  const errAlerts = computeErrTailAlerts(allJson);
  const runnerAlerts = [...rawRunnerAlerts, ...errAlerts.filter(a => !a.resolved)];
  updateRunnerAlertNotifications(runnerAlerts);

  // === 3. 로컬 inProgress → runState (로컬 우선) ===
  const localInProgress = localStates
    .filter(s => s.running)
    .map(s => ({
      repo: s.repo,
      pr: '-',
      display: `${repoShort(s.repo)}(로컬)`,
      prompt_id: null,
      check: s.jobName || '',
      running_min: s.runningMin ?? 0,
      head_branch: null,
      run_id: null,
      light: s.name.includes('light'),
      runner: s.name,
      job: s.jobName || '',
      source: 'local',
    }));

  // 로컬 running 러너는 GitHub cloudInProgress 에서 제외 (충돌 → 로컬 우선)
  const localRunningRunners = new Set(localStates.filter(s => s.running).map(s => s.name));
  const cloudInProgress = (cachedGhData.cloudInProgress || []).filter(j => !localRunningRunners.has(j.runner));

  const runState = {
    heavy: {
      inProgress: [...localInProgress.filter(j => !j.light), ...cloudInProgress.filter(j => !j.light)],
      queued: cachedGhData.heavy?.queued || [],
    },
    light: {
      inProgress: [...localInProgress.filter(j => j.light), ...cloudInProgress.filter(j => j.light)],
      queued: cachedGhData.light?.queued || [],
    },
  };

  // === 4. ci_runners 충돌 해소: 로컬 running → busy=true 강제 ===
  const localStateByRunner = new Map(localStates.map(s => [s.name, s]));
  const mergedCiRunners = (allJson?.ci_runners || []).map(r => {
    const ls = localStateByRunner.get(r.name);
    if (ls?.running && !r.busy) return { ...r, busy: true, status: 'online' };
    return r;
  });

  const ciAlerts = computeCiAlerts(runState);

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
  // ci_runners 충돌 해소 적용
  if (mergedCiRunners.length > 0 && mergedCiRunners !== allJson?.ci_runners) {
    renderAllJson = { ...(renderAllJson || allJson), ci_runners: mergedCiRunners };
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
  const hubNotifs = tickQueueDiff();

  // BUSY 러너 잡 상세 조회 (2분 캐시) · 로컬 상태 보완 포함
  const busyJobMap = await buildBusyJobMap(allJson, localStates);

  isRendering = true;
  nextGhRefreshMs = ghDataFetchedAt + ghInterval;

  const rawLines = renderCompact({
    allJson: renderAllJson,
    runState,
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
    countdownSec: Math.round(ghInterval / 1000),
    hubReportStatus: computeHubReportStatus(allJson),
  });

  // 타이틀 줄: 버전 · 날짜 · 최신 아님 경고 · 파일 갱신 경고
  const originInfo = await checkOriginVersion();
  const fileChanged = runningCodeHash && getDiskFileHash() !== runningCodeHash;
  let titleLine = `\x1b[1mRunner/CI Monitoring v${CI_WATCH_VERSION} (${fileCommitDate || '?'})\x1b[0m`;
  if (originInfo.version && isNewerVersion(originInfo.version, CI_WATCH_VERSION)) {
    titleLine += `  \x1b[33m⚠ 최신 v${originInfo.version} 있음 — Ctrl+C 후 재시작\x1b[0m`;
  } else if (originInfo.different) {
    titleLine += `  \x1b[33m⚠ 최신 내용 다름 — Ctrl+C 후 재시작\x1b[0m`;
  }
  if (fileChanged) {
    titleLine += `  \x1b[33m⚠ 파일 갱신됨 — 재시작 필요\x1b[0m`;
  }

  const finalLines = [titleLine, ...appendHubPending(enhanceBusyLines(rawLines, busyJobMap), hubPending, hubNotifs)];
  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(finalLines.join('\n') + '\n');

  startCountdownTimer(fullMode, ghAgeStr, rateLimitWarn);
  isRendering = false;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fullMode = process.argv.includes('--full');

  process.on('SIGINT', () => { cleanupTerminal(); process.exit(0); });
  process.on('SIGTERM', () => { cleanupTerminal(); process.exit(0); });
  process.stdout.write('\x1b[?25l');

  // M1-1124-H: boot 로그 — 배포본 여부 · boot hash.
  process.stderr.write(`[ci-watch:boot] deployed=${CI_WATCH_IS_DEPLOYED} · self=${THIS_FILE} · hash=${(runningCodeHash || '').slice(0, 12)}\n`);

  function scheduleNext() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (isRendering) { scheduleNext(); return; }
      // M1-1124-H: tick 호출 전 자기 파일 변화 체크 → 배포본이면 exit(0) → 래퍼 재기동.
      exitIfSelfChanged('tick');
      tick(fullMode).catch(() => {}).finally(scheduleNext);
    }, LOCAL_REFRESH_MS);
  }

  function forceRefresh() {
    if (isRendering) return;
    if (refreshTimer) clearTimeout(refreshTimer);
    // r 키: GitHub 캐시 무시 (10초 쿨다운)
    ghIgnoreCache = true;
    tick(fullMode).catch(() => {}).finally(scheduleNext);
  }

  // stdin raw mode — r: GitHub 캐시무시+즉시갱신 · q/Ctrl+C: 종료 (M2-1124-H REQ 1)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', key => {
      if (key === '') { cleanupTerminal(); process.exit(0); }
      else if (key === 'q' || key === 'Q') { cleanupTerminal(); process.exit(0); }
      else if (key === 'r' || key === 'R') {
        const now = Date.now();
        if (now - lastForceRefreshMs >= KEY_REFRESH_COOLDOWN_MS) {
          lastForceRefreshMs = now;
          forceRefresh();
        }
      }
    });
  }

  (async () => {
    exitIfSelfChanged('boot');
    await initFileCommitDate();
    await tick(fullMode).catch(() => {});
    scheduleNext();
  })();
}
