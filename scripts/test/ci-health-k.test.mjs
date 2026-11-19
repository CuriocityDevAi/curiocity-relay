// scripts/test/ci-health-k.test.mjs · M0-1119-K — deadline 분할 + partial + cursor 테스트
//
// 커버리지:
//   K-1: 큰 기록량 — history 10개 run 상한 (HISTORY_MAX_RUNS_PER_CALL)
//   K-2: 분할 — 첫 호출 2시간 커서 · 이후 cursor 파일에서 since 재개
//   K-3: partial flag — overallDeadlineMs 초과 시 ci.partial:true · 상태 보존
//   K-4: 상태 조회 항상 먼저 — state 완성 후 history 실행 순서
//   K-5: 커서 없을 때 getHistorySince → 최근 2시간 반환
//   K-6: updateHistoryCursor 가 최신 completed_at 으로 커서 갱신

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { fetchCiHealth, getHistorySince, updateHistoryCursor, _resetCiHealthCache } from '../lib/ci-health.mjs';
import { getJsonlPath, readJsonlFile, getWibDateStr } from '../lib/ci-history.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const MAIN_REPO = 'CuriocityDevAi/storeport';

function minsAgo(n) { return new Date(Date.now() - n * 60_000).toISOString(); }
function secsAgo(n) { return new Date(Date.now() - n * 1_000).toISOString(); }

// Make N completed runs with their jobs
function makeCompletedRuns(n, startId = 10000) {
  const runs = [];
  for (let i = 0; i < n; i++) {
    runs.push({
      id: startId + i,
      name: `CI run ${i}`,
      status: 'completed',
      created_at: minsAgo(60 + i),
      updated_at: minsAgo(30 + i),
      pull_requests: [{ number: 100 + i }],
      repository: { full_name: MAIN_REPO },
    });
  }
  return runs;
}

function makeJobForRun(run) {
  return {
    jobs: [{
      id: run.id * 10,
      name: 'build',
      status: 'completed',
      labels: ['ubuntu-latest'],
      runner_name: 'GitHub Actions 1',
      created_at: run.created_at,
      started_at: run.created_at,
      completed_at: run.updated_at,
      conclusion: 'success',
    }],
  };
}

function makeExecFnWithRuns(completedRuns, extraResponses = {}) {
  const jobMap = {};
  for (const run of completedRuns) {
    jobMap[`actions/runs/${run.id}/jobs`] = makeJobForRun(run);
  }

  return async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    for (const [key, val] of Object.entries(extraResponses)) {
      if (endpoint.includes(key)) return val;
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs?status=completed')) {
      return { workflow_runs: completedRuns };
    }
    for (const [key, val] of Object.entries(jobMap)) {
      if (endpoint.includes(key)) return val;
    }
    throw new Error(`no mock: ${endpoint}`);
  };
}

// ---- K-1: Large history volume — capped at HISTORY_MAX_RUNS_PER_CALL ----

test('K-1: 큰 기록량 — history 호출 10개 run 상한', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k1-'));

  // 25 completed runs — only 10 should be processed per call
  const runs = makeCompletedRuns(25);
  let jobCalls = 0;
  const baseExec = makeExecFnWithRuns(runs);
  const execFn = async (endpoint) => {
    if (endpoint.includes('/jobs')) jobCalls++;
    return baseExec(endpoint);
  };

  const result = await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });

  assert.ok(!result.error, `error: ${result.error}`);
  // At most 10 job calls for completed runs (plus possibly queued run job calls, but there are none here)
  assert.ok(jobCalls <= 10, `job calls ${jobCalls} should be ≤ 10 (capped per invocation)`);
  // partial should be set if we didn't process all runs
  // (25 runs → only 10 processed → partial=true or more runs remain)
  // We may or may not get partial=true depending on whether time is exceeded,
  // but we definitely should not have processed all 25 jobs
  assert.ok(result.jsonl_added <= 10, `jsonl_added ${result.jsonl_added} should be ≤ 10`);
});

// ---- K-2: History cursor splits across invocations ----

test('K-2: 커서 분할 — 첫 호출 2시간 조회 · 이후 cursor 파일에서 since 재개', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k2-'));

  // First run: no cursor → should use ~2h lookback
  const before = Date.now() - 2 * 60 * 60_000;
  const since1 = getHistorySince(tmpRoot);
  assert.ok(since1.getTime() >= before - 5000, 'first run since ≥ ~2h ago');
  assert.ok(since1.getTime() <= Date.now(), 'first run since ≤ now');

  // Write a cursor with a specific timestamp
  const cursor_ts = new Date(Date.now() - 5 * 60_000).toISOString(); // 5 min ago
  updateHistoryCursor(tmpRoot, [{ completed_at: cursor_ts }]);

  // Second run: should resume from cursor timestamp
  const since2 = getHistorySince(tmpRoot);
  assert.equal(since2.toISOString(), cursor_ts, 'second run uses cursor timestamp');
});

test('K-2b: updateHistoryCursor 가 cursor 파일 생성 + 최신 completed_at 기록', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k2b-'));
  const t1 = '2026-11-19T10:00:00.000Z';
  const t2 = '2026-11-19T10:30:00.000Z'; // later
  const t3 = '2026-11-19T09:00:00.000Z'; // earlier

  updateHistoryCursor(tmpRoot, [
    { completed_at: t1 },
    { completed_at: t2 },
    { completed_at: t3 },
  ]);

  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  assert.ok(existsSync(cursorPath), 'cursor file created');
  const cursor = JSON.parse(readFileSync(cursorPath, 'utf8'));
  assert.equal(cursor.last_completed_at, t2, 'cursor records the latest completed_at');
});

test('K-2c: getHistorySince 커서 없으면 ~2시간 전', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k2c-'));
  const before = Date.now();
  const since = getHistorySince(tmpRoot);
  const twoHoursMs = 2 * 60 * 60_000;
  const diff = before - since.getTime();
  assert.ok(diff >= twoHoursMs - 1000, `diff ${diff}ms should be ≥ 2h`);
  assert.ok(diff <= twoHoursMs + 5000, `diff ${diff}ms should be ≤ 2h+5s (tolerance)`);
});

// ---- K-3: partial flag on deadline ----

test('K-3: partial flag — overallDeadlineMs 짧게 설정 → state 보존 + partial:true', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k3-'));

  // Make history slow with 20 runs but tiny deadline
  const runs = makeCompletedRuns(20, 20000);
  let callCount = 0;
  const slowExec = async (endpoint) => {
    callCount++;
    // Simulate slow history calls
    if (endpoint.includes('actions/runs?status=completed')) {
      await new Promise((r) => setTimeout(r, 50));
      return { workflow_runs: runs };
    }
    if (endpoint.includes('/jobs')) {
      await new Promise((r) => setTimeout(r, 30));
      return makeJobForRun(runs.find((r) => endpoint.includes(String(r.id))) || runs[0]);
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    return {};
  };

  // 200ms deadline: state finishes (queued/in_progress are instant), history gets cut
  const result = await fetchCiHealth({
    execFn: slowExec,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 200,
  });

  assert.ok(!result.error, `no top-level error: ${result.error}`);
  // State fields must be present
  assert.ok('heavy' in result, 'heavy field present (state preserved)');
  assert.ok('light' in result, 'light field present (state preserved)');
  assert.ok(Array.isArray(result.heavy.in_progress), 'heavy.in_progress is array');
  // partial flag set
  assert.equal(result.partial, true, 'partial=true when deadline exceeded');
});

test('K-3b: partial=true が設定されない場合 — fast path', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k3b-'));

  // No completed runs → history phase fast → no partial
  const execFn = async (endpoint) => {
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=completed')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    return {};
  };

  const result = await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });

  assert.ok(!result.error, `no error: ${result.error}`);
  // partial should not be set (or be false/undefined) when history completes fine
  assert.ok(!result.partial, `partial should not be set when no timeout: ${result.partial}`);
});

// ---- K-4: State always runs first ----

test('K-4: 상태 조회 항상 먼저 — state API calls 먼저 발생', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k4-'));

  const callOrder = [];
  const execFn = async (endpoint) => {
    if (endpoint.includes('actions/runs?status=queued')) {
      callOrder.push('state:queued');
      return { workflow_runs: [] };
    }
    if (endpoint.includes('actions/runs?status=in_progress')) {
      callOrder.push('state:in_progress');
      return { workflow_runs: [] };
    }
    if (endpoint.includes('actions/runners')) {
      callOrder.push('state:runners');
      return { runners: [] };
    }
    if (endpoint.includes('actions/runs?status=completed')) {
      callOrder.push('history:completed_runs');
      return { workflow_runs: [] };
    }
    return {};
  };

  await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: [MAIN_REPO],
  });

  // State calls must come before any history calls
  const histIdx = callOrder.findIndex((c) => c.startsWith('history:'));
  if (histIdx === -1) {
    // No history calls at all is fine (empty completed runs)
    assert.ok(callOrder.some((c) => c.startsWith('state:')), 'at least one state call');
  } else {
    const stateAfterHist = callOrder.slice(0, histIdx).every((c) => c.startsWith('state:'));
    assert.ok(stateAfterHist, `All calls before first history call must be state calls. Order: ${callOrder.join(', ')}`);
  }
});
