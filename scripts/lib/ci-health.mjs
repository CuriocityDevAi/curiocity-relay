// scripts/lib/ci-health.mjs · M0-1119-I/J/K/M — storeport + fork CI 건강 조회 + 완료 job 기록
//
// 핵심 원칙:
//   · 분류 = job API 의 labels + runner_name (run 의 runner_labels 는 존재하지 않음).
//   · wait_min = job.created_at → job.started_at.
//   · 날짜 = job.completed_at 의 WIB.
//   · --paginate 제거 (per_page=100).
//   · 조회 범위 = CuriocityDevAi/storeport + fork CuriocityDevAi/agilo-medusa-pos-fork.
//   · 비용 = cloud_cost_est_usd (추정 · 단가 상수 ci-history.mjs).
//
// M0-1119-J:
//   REQ1: 이미 기록한 run id 는 메모리 캐시(seenCompletedRunIds)로 jobs 재조회 안 함.
//   REQ1: 1회 조회 API 호출 수 상한(default 40). 넘으면 다음 회차로 미룸.
//   REQ4: queued run 은 jobs 호출로 labels 분류 (heavy / light / cloud).
//   REQ4: fork 접근 실패(404 등) 시 1회 경고 후 그날은 건너뜀.
//
// M0-1119-K:
//   REQ2: 상태(queued/in_progress/runner) 조회 먼저 · ≤10초 목표 · ci 블록 채움.
//         기록(completed jobs)은 남은 deadline 안에서만 · 한 번에 N≤10 run.
//   REQ3: 기록 조회 커서: 첫 실행은 최근 2시간 · 이후는 마지막 기록 시각부터.
//         커서 파일: .cache/ci-history-cursor.json.
//   REQ4: deadline 초과 시에도 상태 부분 보존 · ci.partial:true 로 표시.
//
// M0-1119-M (R0 CHANGES):
//   REQ1: 내부 overallDeadlineMs 기본값 20s (background 30s 보다 짧게) ·
//         collectCompletedJobs / collectInProgress / collectQueued 각 run 루프 안
//         **매 API 호출 전** 남은 시간 검사 · 넘기면 그 자리에서 partial 반환.
//         background deadline 이 먼저 터져 state 가 날아가는 재발 차단.
//   REQ2: 커서 필터 = `created=>=` (GitHub List workflow runs 는 updated 필터 미지원) ·
//         커서는 **repo 별** (per-repo map) · maxRuns 상한에 걸려 처리 못한 run 있으면
//         그 중 가장 오래된 run 의 created_at 으로만 전진 · partial:true.
//   REQ3: queued run 분류·대기 시간 = 완료되지 않은 job 의 created_at 기준 ·
//         완료된 job 은 kind 분류에서 제외 ·
//         oldest_queued_pr / alert detail 에 repo 를 함께 표시 (예: `fork:ci/M2-…`).
//
// M0-1119-O (R0 재리뷰 CHANGES):
//   REQ1: 커서 = min(처리한 run 의 최대 **created_at**, 상태 단계에서 본 queued/in_progress
//         run 의 최소 created_at). seen-set 이 재처리 중복을 막아 줌.
//         재발 차단: long run(T-40m, 진행 중) + short run(T-35m 생성·T-30m 완료) 겹침 시
//         직전 구현은 커서를 완료 job 의 max completed_at (T-30m) 으로 올려 long run 을
//         영구 누락. 이제는 min(long.created_at)=T-40m 으로 커서를 clamp.
//   REQ2 (nit): execFile timeout = min(남은 시간, PER_REPO_TIMEOUT_MS).
//         남은 시간 ≤ 0 이면 호출 자체를 거부.
//
// M0-1119-P (R0 Y CHANGES):
//   REQ1: partial 경로 커서도 activeMin 을 반영. `partial && earliestUnprocessed`
//         일 때 커서 = min(earliestUnprocessed, activeMin). activeMin 없으면
//         earliestUnprocessed 그대로. 재발 차단: long(T-40m 진행 중) + short 12개
//         (상한 10) → 직전은 커서 = earliestUnprocessed(T-25m) 로만 올려
//         long(T-40m) 을 다음 tick `created>=T-25m` 필터로 영구 누락.
//
// M0-1119-R (R0 AA CHANGES — 4차):
//   REQ(a): state 를 끝까지 못 본 repo (stateResults 누락 · sr.error · sr.skipped ·
//           sr.partial) 는 history 커서 전진 생략. 기록은 그대로 수행 (seen-set 이
//           중복 방지). 재발 차단: state 단계 10s 초과로 fork repo 의 queued/in_progress
//           를 끝까지 못 보면 minActiveByRepo 에 fork 의 long run (T-40m) 이 빠짐 →
//           history 가 short run (T-30m) 만 보고 cursor = T-30m 로 올리면 long 영구
//           누락. partial 인 repo 는 cursor 를 그대로 둬서 다음 tick 에 created>=이전
//           cursor 로 long 을 재조회.
//   REQ(b): collectCompletedJobs 의 jobs 조회 catch 에서 noteUnprocessed(run); break;
//           실패한 run 이 unprocessed 로 표시되지 않으면 뒤 run 처리 결과로 커서가
//           실패 run 의 created_at 을 넘어가 영구 누락. runs 는 오름차순 처리라 break
//           시 earliestUnprocessed = 실패 run 의 created_at 으로 설정 → 다음 tick 에
//           created>=실패 run.created_at 로 재조회.
//
// M0-1119-S (R0 AC CHANGES — 5차 · 후속):
//   REQ1: collectHistoryForRepo catch 에서 non-404 (예: 500 · 네트워크 실패) 는
//         `{ partial: true, earliestUnprocessed: null, latestProcessedRunCreatedAt: null }`
//         반환. 직전은 non-404 도 partial:false 로 떨어져 커서 블록이 activeMin 으로
//         전진 → 완료 run 영구 누락. 404 는 기존대로 partial:false (state 가 skipped
//         로 표시 → stateFullySeen=false 로 cursor 전진 생략).
//   REQ2: 커서 블록에서 `partial && !earliestUnprocessed` 이면 cursor 전진 생략.
//         collectCompletedJobs 시작부 budget/deadline 조기 반환 (partial:true,
//         earliestUnprocessed:null) + REQ1 non-404 catch 모두 이 조건으로 fall-through.
//         직전은 candidates=[activeMin] 으로 cursor = activeMin 전진 → long run 영구
//         누락. O-1c (active 만 · completed 없음 · partial=false) 는 유지 — partial=false
//         이면 이 continue 가 불발.

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
// M0-1119-M REQ1: shorter than ci-background 30s so state is never dropped by the outer timer
const DEFAULT_OVERALL_DEADLINE_MS = 20_000;

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

// ---- Cursor helpers (M0-1119-K REQ3 · M0-1119-M REQ2 per-repo) ----

function readCursorFile(repoRoot) {
  try {
    const path = join(repoRoot, CURSOR_REL_PATH);
    if (!existsSync(path)) return {};
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    // Back-compat: old single-key `{ last_completed_at }` → migrate to per-repo map keyed by legacy '*'
    if (raw && raw.last_completed_at && !Object.values(raw).some((v) => typeof v === 'string' && v.includes('T'))) {
      return { _legacy_last_completed_at: raw.last_completed_at };
    }
    if (raw && typeof raw === 'object') return raw;
    return {};
  } catch {
    return {};
  }
}

function writeCursorFile(repoRoot, cursor) {
  try {
    const dir = join(repoRoot, '.cache');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(repoRoot, CURSOR_REL_PATH), JSON.stringify(cursor, null, 2), 'utf8');
  } catch {
    // best-effort
  }
}

export function getHistorySince(repoRoot, repo) {
  const cursor = readCursorFile(repoRoot);
  if (repo && cursor[repo]) return new Date(cursor[repo]);
  // back-compat path (M0-1119-K single-key cursor)
  if (cursor._legacy_last_completed_at) return new Date(cursor._legacy_last_completed_at);
  // first run: last 2 hours
  return new Date(Date.now() - HISTORY_FIRST_LOOKBACK_MS);
}

export function setHistoryCursor(repoRoot, repo, isoString) {
  if (!repo || !isoString) return;
  const cursor = readCursorFile(repoRoot);
  cursor[repo] = isoString;
  // drop legacy marker — new write means we're on the per-repo scheme
  delete cursor._legacy_last_completed_at;
  writeCursorFile(repoRoot, cursor);
}

export function updateHistoryCursor(repoRoot, repo, completedRecords) {
  // M0-1119-M: now per-repo. Signature: (repoRoot, repo, records)
  if (!repo) return;
  if (!completedRecords || completedRecords.length === 0) return;
  const times = completedRecords
    .map((r) => r.completed_at)
    .filter(Boolean)
    .map((s) => new Date(s).getTime())
    .filter((t) => !isNaN(t));
  if (times.length === 0) return;
  const latest = Math.max(...times);
  setHistoryCursor(repoRoot, repo, new Date(latest).toISOString());
}

// ---- Internal helpers ----

// M0-1119-O REQ2 (nit): execFile timeout = min(remaining, PER_REPO_TIMEOUT_MS).
// deadlineAt null → use the full per-repo timeout.
export function computeExecTimeoutMs(deadlineAt, maxMs = PER_REPO_TIMEOUT_MS) {
  if (deadlineAt == null) return maxMs;
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) return 0;
  return Math.min(remaining, maxMs);
}

function makeDefaultExecFn(deadlineAt) {
  return async (endpoint) => {
    const timeoutMs = computeExecTimeoutMs(deadlineAt);
    if (timeoutMs <= 0) throw new Error('ci-health: deadline exceeded before API call');
    const { stdout } = await execFileAsync('gh', ['api', endpoint, '-H', 'Accept: application/vnd.github+json'], {
      timeout: timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  };
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

// M0-1119-M REQ3: short repo label for alert detail / oldest_queued_pr
export function repoShort(repo) {
  if (!repo) return '';
  const last = String(repo).split('/').pop();
  if (!last) return '';
  if (last.endsWith('-fork')) return 'fork';
  return last;
}

function repoPrefixedPr(repo, pr) {
  const short = repoShort(repo);
  if (!short) return pr;
  return `${short}:${pr}`;
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

function deadlineExceeded(deadlineAt) {
  return deadlineAt != null && Date.now() >= deadlineAt;
}

async function collectInProgress(execFn, repo, budget, deadlineAt) {
  if (deadlineExceeded(deadlineAt)) return { entries: [], partial: true, runCreatedAts: [] };
  if (!budgetCheck(budget)) return { entries: [], partial: true, runCreatedAts: [] };
  const data = await execFn(`repos/${repo}/actions/runs?status=in_progress&per_page=100`);
  const runs = (data && data.workflow_runs) || [];
  const active = [];
  const runCreatedAts = [];
  let partial = false;
  for (const run of runs) {
    if (run.created_at) runCreatedAts.push(run.created_at);
    if (deadlineExceeded(deadlineAt)) { partial = true; break; }
    if (!budgetCheck(budget)) { partial = true; break; }
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
          pr_display: repoPrefixedPr(repo, extractPr(run)),
          job: job.name,
          step: currentStep,
          running_min: minutesSince(job.started_at),
          runner: job.runner_name || null,
          kind,
        });
      }
    } catch {
      active.push({
        repo,
        pr: extractPr(run),
        pr_display: repoPrefixedPr(repo, extractPr(run)),
        job: run.name || String(run.workflow_id),
        step: null,
        running_min: minutesSince(run.run_started_at || run.created_at),
        runner: null,
        kind: 'unknown',
      });
    }
  }
  return { entries: active, partial, runCreatedAts };
}

async function collectQueued(execFn, repo, budget, deadlineAt) {
  if (deadlineExceeded(deadlineAt)) return { entries: [], partial: true, runCreatedAts: [] };
  if (!budgetCheck(budget)) return { entries: [], partial: true, runCreatedAts: [] };
  const data = await execFn(`repos/${repo}/actions/runs?status=queued&per_page=100`);
  const runs = (data && data.workflow_runs) || [];
  const out = [];
  const runCreatedAts = [];
  let partial = false;
  for (const run of runs) {
    if (run.created_at) runCreatedAts.push(run.created_at);
    if (deadlineExceeded(deadlineAt)) { partial = true; break; }
    let kind = 'mac-heavy';
    let effectiveCreatedAt = run.created_at || null;
    let sawAllComplete = false;
    if (budgetCheck(budget)) {
      try {
        const jobsData = await execFn(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100&filter=latest`);
        const jobs = (jobsData && jobsData.jobs) || [];
        // M0-1119-M REQ3: queued judgment uses only incomplete jobs.
        // Completed jobs within a queued run (e.g. prior pipeline stages) are excluded from
        // kind classification and queued_min calculation — run.created_at over-counts wait.
        const incomplete = jobs.filter((j) => j.status !== 'completed');
        if (jobs.length > 0 && incomplete.length === 0) {
          sawAllComplete = true;
        } else if (incomplete.length > 0) {
          kind = classifyFromJobs(incomplete);
          const times = incomplete
            .map((j) => j.created_at)
            .filter(Boolean)
            .sort();
          if (times.length > 0) effectiveCreatedAt = times[0];
        }
      } catch {
        // on error fall back to run-level defaults
      }
    }
    if (sawAllComplete) continue;
    const prText = extractPr(run);
    out.push({
      repo,
      id: run.id,
      name: run.name || null,
      pr: prText,
      pr_display: repoPrefixedPr(repo, prText),
      pr_num: (run.pull_requests && run.pull_requests[0]?.number) || null,
      created_at: effectiveCreatedAt,
      queued_min: minutesSince(effectiveCreatedAt),
      kind,
    });
  }
  return { entries: out, partial, runCreatedAts };
}

// M0-1119-M REQ2 · M0-1119-O REQ1: collectCompletedJobs returns
//   { records, partial, earliestUnprocessed, latestProcessedRunCreatedAt }
//   · `created=>=` filter (GitHub API does not support `updated` on list workflow runs).
//   · Pre-API deadline check inside the loop so background 30s timer never fires mid-work.
//   · Partial = true when maxRuns / deadline / budget cut us short; earliestUnprocessed =
//     oldest run (by created_at) that we skipped, so the per-repo cursor can be clamped
//     to just that time (older runs never permanently disappear).
//   · latestProcessedRunCreatedAt = max run.created_at of runs we fully processed
//     (added to seen-set). The caller uses this (not completed_at) to advance the cursor,
//     so that a long run whose created_at precedes a short run's completed_at is not
//     skipped by the `created=>=` filter on the next tick.
async function collectCompletedJobs(execFn, repo, since, budget, maxRuns, deadlineAt) {
  if (deadlineExceeded(deadlineAt)) return { records: [], partial: true, earliestUnprocessed: null, latestProcessedRunCreatedAt: null };
  if (!budgetCheck(budget)) return { records: [], partial: true, earliestUnprocessed: null, latestProcessedRunCreatedAt: null };
  const sinceParam = since ? `&created=>=${encodeURIComponent(since.toISOString())}` : '';
  const data = await execFn(`repos/${repo}/actions/runs?status=completed&per_page=100${sinceParam}`);
  const runs = (data && data.workflow_runs) || [];
  // Process oldest first so the cursor advances deterministically.
  runs.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  const records = [];
  let processed = 0;
  let partial = false;
  let earliestUnprocessed = null;
  let latestProcessedRunCreatedAt = null;

  const noteUnprocessed = (run) => {
    partial = true;
    if (!earliestUnprocessed && run && run.created_at) earliestUnprocessed = run.created_at;
  };

  for (const run of runs) {
    if (maxRuns != null && processed >= maxRuns) { noteUnprocessed(run); break; }
    if (deadlineExceeded(deadlineAt)) { noteUnprocessed(run); break; }
    const runKey = `${repo}:${run.id}`;
    if (seenCompletedRunIds.has(runKey)) continue;
    if (!budgetCheck(budget)) { noteUnprocessed(run); break; }
    processed++;
    try {
      // M0-1119-M REQ1: re-check deadline before each API call (jobs can be up to PER_REPO_TIMEOUT_MS)
      if (deadlineExceeded(deadlineAt)) { noteUnprocessed(run); break; }
      const jobsData = await execFn(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100&filter=latest`);
      const jobs = (jobsData && jobsData.jobs) || [];
      let allCompleted = true;
      for (const job of jobs) {
        if (job.status !== 'completed' || !job.completed_at) { allCompleted = false; continue; }
        records.push(jobToRecord(job, run));
      }
      if (allCompleted) {
        seenCompletedRunIds.add(runKey);
        if (run.created_at) {
          const t = new Date(run.created_at).getTime();
          if (!isNaN(t) && (latestProcessedRunCreatedAt == null || t > latestProcessedRunCreatedAt)) {
            latestProcessedRunCreatedAt = t;
          }
        }
      }
    } catch {
      // M0-1119-R REQ(b): mark the failed run as unprocessed so the cursor can't step past it.
      // Since runs are sorted ascending by created_at, break here guarantees earliestUnprocessed
      // = this failed run's created_at (no later run has processed yet to overwrite the cursor).
      noteUnprocessed(run);
      break;
    }
  }
  return {
    records,
    partial,
    earliestUnprocessed,
    latestProcessedRunCreatedAt: latestProcessedRunCreatedAt != null
      ? new Date(latestProcessedRunCreatedAt).toISOString()
      : null,
  };
}

function isMissingRepoError(err) {
  const msg = (err && (err.message || String(err))) || '';
  return msg.includes('404') || msg.toLowerCase().includes('not found');
}

async function collectStateForRepo(execFn, repo, budget, warn, deadlineAt) {
  const todayStr = getWibDateStr();
  if (repoDailySkip.get(repo) === todayStr) {
    return { repo, queued: [], in_progress: [], runners: null, error: null, skipped: 'daily-skip', partial: false, activeRunCreatedAts: [] };
  }

  const out = { repo, queued: [], in_progress: [], runners: null, error: null, partial: false, activeRunCreatedAts: [] };
  try {
    const q = await collectQueued(execFn, repo, budget, deadlineAt);
    out.queued = q.entries;
    if (q.runCreatedAts) out.activeRunCreatedAts.push(...q.runCreatedAts);
    if (q.partial) out.partial = true;
    const ip = await collectInProgress(execFn, repo, budget, deadlineAt);
    out.in_progress = ip.entries;
    if (ip.runCreatedAts) out.activeRunCreatedAts.push(...ip.runCreatedAts);
    if (ip.partial) out.partial = true;
    if (!deadlineExceeded(deadlineAt) && budgetCheck(budget)) {
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
    } else if (deadlineExceeded(deadlineAt)) {
      out.partial = true;
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

async function collectHistoryForRepo(execFn, repo, since, budget, maxRuns, warn, deadlineAt) {
  const todayStr = getWibDateStr();
  if (repoDailySkip.get(repo) === todayStr) return { records: [], partial: false, earliestUnprocessed: null, latestProcessedRunCreatedAt: null };

  try {
    return await collectCompletedJobs(execFn, repo, since, budget, maxRuns, deadlineAt);
  } catch (e) {
    if (isMissingRepoError(e)) {
      repoDailySkip.set(repo, todayStr);
      if (!repoWarned.has(repo)) {
        repoWarned.add(repo);
        warn(`[ci-health] repo 접근 실패 (오늘 재시도 안함): ${repo} · ${(e.message || e).toString().split('\n')[0]}`);
      }
      return { records: [], partial: false, earliestUnprocessed: null, latestProcessedRunCreatedAt: null };
    }
    // M0-1119-S REQ1: non-404 (e.g. 500, network failure) returns partial:true so the
    // cursor block falls through to the `partial && !earliestUnprocessed` skip (REQ2).
    // Without this, cursor = activeMin → completed runs created before activeMin are
    // permanently lost on next tick's `created>=activeMin` filter.
    return { records: [], partial: true, earliestUnprocessed: null, latestProcessedRunCreatedAt: null };
  }
}

export async function fetchCiHealth(opts = {}, _legacy = null, _legacyRoot = null) {
  let execFn, repoRoot, repos, sinceMin, apiBudget, warn, overallDeadlineMs;
  let userProvidedExecFn = false;
  if (typeof opts === 'function') {
    execFn = opts;
    userProvidedExecFn = true;
    repoRoot = _legacyRoot || null;
    repos = DEFAULT_REPOS;
    sinceMin = DEFAULT_LOOKBACK_MIN;
    apiBudget = DEFAULT_API_BUDGET;
    warn = (m) => process.stderr.write(m + '\n');
    overallDeadlineMs = DEFAULT_OVERALL_DEADLINE_MS;
  } else {
    userProvidedExecFn = !!opts.execFn;
    execFn = opts.execFn || null;
    repoRoot = opts.repoRoot || null;
    repos = opts.repos || DEFAULT_REPOS;
    sinceMin = opts.sinceMin || DEFAULT_LOOKBACK_MIN;
    apiBudget = opts.apiBudget || DEFAULT_API_BUDGET;
    warn = opts.warn || ((m) => process.stderr.write(m + '\n'));
    overallDeadlineMs = opts.overallDeadlineMs != null ? opts.overallDeadlineMs : DEFAULT_OVERALL_DEADLINE_MS;
  }

  const root = repoRoot || DEFAULT_REPO_ROOT;
  const at = new Date().toISOString();
  const startMs = Date.now();
  const deadlineAt = startMs + overallDeadlineMs;
  // M0-1119-O REQ2: default gh wrapper clamps execFile timeout to remaining budget.
  if (!userProvidedExecFn) execFn = makeDefaultExecFn(deadlineAt);
  const budget = makeBudget(apiBudget);

  // ---- Phase 1: State (queued/in_progress/runners) — always runs first ----
  const stateResults = [];
  let stateError = null;
  let overallPartial = false;

  try {
    for (const r of repos) {
      // STATE_DEADLINE_MS is a target, but overallDeadline is the hard cap
      const stateDeadlineForRepo = Math.min(deadlineAt, startMs + STATE_DEADLINE_MS * repos.length);
      const sr = await collectStateForRepo(execFn, r, budget, warn, stateDeadlineForRepo);
      stateResults.push(sr);
      if (sr.partial) overallPartial = true;
      if (Date.now() - startMs > STATE_DEADLINE_MS) {
        overallPartial = true;
        break;
      }
      if (deadlineExceeded(deadlineAt)) {
        overallPartial = true;
        break;
      }
    }
  } catch (e) {
    stateError = e.message || String(e);
  }

  const aliveState = stateResults.filter((r) => !r.error && !r.skipped);

  if (aliveState.length === 0 && stateResults.every((r) => r.error)) {
    const firstErr = stateError || stateResults[0]?.error || 'all repos failed';
    return { at, error: firstErr, api_calls: budget.used, api_budget: budget.max };
  }

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
  const heavy_oldest_queued_pr = heavyOldest ? heavyOldest.pr_display : null;
  const light_oldest_queued_min = lightOldest ? lightOldest.queued_min : null;
  const light_oldest_queued_pr = lightOldest ? lightOldest.pr_display : null;
  const queued_prs = [...new Set(heavyQueued.map((q) => q.pr_num).filter((n) => n != null))];

  // ---- Phase 2: History (completed jobs) — only if time/budget remain ----
  const completedRecords = [];
  const stateElapsedMs = Date.now() - startMs;
  const historyBudgetMs = overallDeadlineMs - stateElapsedMs;

  // M0-1119-O REQ1: pre-compute per-repo min(created_at) across queued + in_progress.
  // This caps how far forward the cursor can advance so a long-running run (whose
  // created_at precedes a shorter sibling's completion) is never filtered out on the
  // next tick by `created=>=`.
  const minActiveByRepo = new Map();
  for (const sr of aliveState) {
    if (!sr.activeRunCreatedAts || sr.activeRunCreatedAts.length === 0) continue;
    let minT = null;
    for (const iso of sr.activeRunCreatedAts) {
      const t = new Date(iso).getTime();
      if (isNaN(t)) continue;
      if (minT == null || t < minT) minT = t;
    }
    if (minT != null) minActiveByRepo.set(sr.repo, new Date(minT).toISOString());
  }

  // M0-1119-R REQ(a): index stateResults by repo so we can tell, per repo, whether state
  // was fully seen. A repo is "state fully seen" iff it's in stateResults AND !error AND
  // !skipped AND !partial. Only those repos are safe for cursor advancement; otherwise the
  // activeMin we'd clamp against is incomplete and a long in-progress run may be skipped.
  const stateResultByRepo = new Map();
  for (const sr of stateResults) stateResultByRepo.set(sr.repo, sr);

  if (historyBudgetMs > 500 && !budget.overflow) {
    try {
      for (const r of repos) {
        if (deadlineExceeded(deadlineAt)) { overallPartial = true; break; }
        // M0-1119-M REQ2: per-repo cursor
        const historySince = getHistorySince(root, r);
        const { records, partial, earliestUnprocessed, latestProcessedRunCreatedAt } =
          await collectHistoryForRepo(
            execFn, r, historySince, budget, HISTORY_MAX_RUNS_PER_CALL, warn, deadlineAt,
          );
        completedRecords.push(...records);
        if (partial) overallPartial = true;

        // M0-1119-R REQ(a): skip cursor advance when state wasn't fully seen for this repo.
        // seen-set still prevents duplicate recording when the same runs come back next tick.
        const sr = stateResultByRepo.get(r);
        const stateFullySeen = sr && !sr.error && !sr.skipped && !sr.partial;
        if (!stateFullySeen) continue;

        // M0-1119-S REQ2: skip cursor advance when history is partial without a marker.
        // Covers (a) collectCompletedJobs budget/deadline early-return before any API call
        // and (b) collectHistoryForRepo non-404 catch (REQ1). Both return partial:true with
        // earliestUnprocessed=null; without this skip, candidates=[activeMin] → cursor =
        // activeMin → completed runs older than activeMin are filtered out next tick.
        // O-1c (completed empty · active present · partial=false) still advances: partial
        // is false so this guard doesn't fire.
        if (partial && !earliestUnprocessed) continue;

        // Advance cursor per-repo:
        //   - partial: clamp to min(earliestUnprocessed, activeMin). (M0-1119-M + M0-1119-P)
        //   - else: cursor = min(latestProcessedRunCreatedAt, activeMin).
        //     Using run.created_at (not completed_at) plus the active-min clamp guarantees
        //     a concurrent long run is still re-queried next tick; the seen-set prevents
        //     double-recording of runs we already processed. (M0-1119-O REQ1 · M0-1119-P)
        const activeMinIso = minActiveByRepo.get(r) || null;
        const candidates = [];
        if (partial && earliestUnprocessed) {
          candidates.push(earliestUnprocessed);
        } else if (latestProcessedRunCreatedAt) {
          candidates.push(latestProcessedRunCreatedAt);
        }
        if (activeMinIso) candidates.push(activeMinIso);
        if (candidates.length > 0) {
          const chosen = candidates.reduce((a, b) =>
            new Date(a).getTime() <= new Date(b).getTime() ? a : b);
          setHistoryCursor(root, r, chosen);
        }
      }
    } catch {
      overallPartial = true;
    }

    if (Date.now() - startMs > overallDeadlineMs) {
      overallPartial = true;
    }
  } else {
    overallPartial = true;
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
      alerts.push({ type: 'long_job', detail: `${j.job} running ${j.running_min}m (${j.pr_display || j.pr})` });
    }
  }
  if (heavyQueued.length > 0 && heavyInProgress.length === 0 && heavy_oldest_queued_min != null && heavy_oldest_queued_min >= 10) {
    alerts.push({ type: 'runner_idle', detail: `${heavyQueued.length} queued but 0 in_progress for ${heavy_oldest_queued_min}m (${heavy_oldest_queued_pr})` });
  }
  if (light_oldest_queued_min != null && light_oldest_queued_min > 10) {
    alerts.push({ type: 'light_wait', detail: `oldest light queued ${light_oldest_queued_min}m (${light_oldest_queued_pr})` });
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
      oldest_queued_pr: light_oldest_queued_pr,
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

  if (overallPartial) result.partial = true;

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
