// scripts/test/ci-health-k.test.mjs · M0-1119-K/M — deadline 분할 + partial + cursor 테스트
//
// 커버리지 (K-*):
//   K-1: 큰 기록량 — history 10개 run 상한 (HISTORY_MAX_RUNS_PER_CALL)
//   K-2: 분할 — 첫 호출 2시간 커서 · 이후 cursor 파일에서 since 재개 (per-repo)
//   K-3: partial flag — overallDeadlineMs 초과 시 ci.partial:true · 상태 보존
//   K-4: 상태 조회 항상 먼저 — state 완성 후 history 실행 순서
//
// 커버리지 (M-*, M0-1119-M R0 CHANGES):
//   M-1: 내부 overallDeadlineMs < background · 매 호출 전 deadline 검사 (REQ1)
//   M-2a: history filter 가 `created=>=` (GitHub API 지원 형태) (REQ2)
//   M-2b: 커서가 repo 별로 유지됨 · storeport 와 fork 가 분리 (REQ2)
//   M-2c: maxRuns 상한에 걸려 처리 못한 run 있으면 커서는 그 run 앞에서 멈춤 · partial (REQ2)
//   M-3a: oldest_queued_pr 에 repo 표시 (예: `fork:ci/…`) (REQ3)
//   M-3b: queued 분류·대기 시간은 완료되지 않은 job 의 created_at 기준 (REQ3)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import {
  fetchCiHealth,
  getHistorySince,
  updateHistoryCursor,
  setHistoryCursor,
  repoShort,
  _resetCiHealthCache,
} from '../lib/ci-health.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const MAIN_REPO = 'CuriocityDevAi/storeport';
const FORK_REPO = 'CuriocityDevAi/agilo-medusa-pos-fork';

function minsAgo(n) { return new Date(Date.now() - n * 60_000).toISOString(); }

function makeCompletedRuns(n, startId = 10000, repo = MAIN_REPO) {
  const runs = [];
  for (let i = 0; i < n; i++) {
    runs.push({
      id: startId + i,
      name: `CI run ${i}`,
      status: 'completed',
      created_at: minsAgo(60 + i),
      updated_at: minsAgo(30 + i),
      pull_requests: [{ number: 100 + i }],
      repository: { full_name: repo },
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

function makeExecFnWithRuns(completedRuns, extraResponses = {}, repo = MAIN_REPO) {
  const jobMap = {};
  for (const run of completedRuns) {
    jobMap[`actions/runs/${run.id}/jobs`] = makeJobForRun(run);
  }

  return async (endpoint) => {
    if (!endpoint.includes(repo)) {
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
  assert.ok(jobCalls <= 10, `job calls ${jobCalls} should be ≤ 10 (capped per invocation)`);
  assert.ok(result.jsonl_added <= 10, `jsonl_added ${result.jsonl_added} should be ≤ 10`);
});

// ---- K-2: Per-repo history cursor ----

test('K-2: 커서 분할 — 첫 호출 2시간 조회 · 이후 cursor 파일에서 since 재개 (per-repo)', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k2-'));

  const before = Date.now() - 2 * 60 * 60_000;
  const since1 = getHistorySince(tmpRoot, MAIN_REPO);
  assert.ok(since1.getTime() >= before - 5000, 'first run since ≥ ~2h ago');
  assert.ok(since1.getTime() <= Date.now(), 'first run since ≤ now');

  const cursor_ts = new Date(Date.now() - 5 * 60_000).toISOString();
  updateHistoryCursor(tmpRoot, MAIN_REPO, [{ completed_at: cursor_ts }]);

  const since2 = getHistorySince(tmpRoot, MAIN_REPO);
  assert.equal(since2.toISOString(), cursor_ts, 'second run uses cursor timestamp');
});

test('K-2b: updateHistoryCursor 가 cursor 파일 생성 + 최신 completed_at 기록 (per-repo)', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k2b-'));
  const t1 = '2026-11-19T10:00:00.000Z';
  const t2 = '2026-11-19T10:30:00.000Z'; // latest
  const t3 = '2026-11-19T09:00:00.000Z';

  updateHistoryCursor(tmpRoot, MAIN_REPO, [
    { completed_at: t1 },
    { completed_at: t2 },
    { completed_at: t3 },
  ]);

  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  assert.ok(existsSync(cursorPath), 'cursor file created');
  const cursor = JSON.parse(readFileSync(cursorPath, 'utf8'));
  assert.equal(cursor[MAIN_REPO], t2, 'cursor records the latest completed_at under repo key');
});

test('K-2c: getHistorySince 커서 없으면 ~2시간 전', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k2c-'));
  const before = Date.now();
  const since = getHistorySince(tmpRoot, MAIN_REPO);
  const twoHoursMs = 2 * 60 * 60_000;
  const diff = before - since.getTime();
  assert.ok(diff >= twoHoursMs - 1000, `diff ${diff}ms should be ≥ 2h`);
  assert.ok(diff <= twoHoursMs + 5000, `diff ${diff}ms should be ≤ 2h+5s (tolerance)`);
});

// ---- K-3: partial flag on deadline ----

test('K-3: partial flag — overallDeadlineMs 짧게 설정 → state 보존 + partial:true', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k3-'));

  const runs = makeCompletedRuns(20, 20000);
  const slowExec = async (endpoint) => {
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

  const result = await fetchCiHealth({
    execFn: slowExec,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 200,
  });

  assert.ok(!result.error, `no top-level error: ${result.error}`);
  assert.ok('heavy' in result, 'heavy field present (state preserved)');
  assert.ok('light' in result, 'light field present (state preserved)');
  assert.ok(Array.isArray(result.heavy.in_progress), 'heavy.in_progress is array');
  assert.equal(result.partial, true, 'partial=true when deadline exceeded');
});

test('K-3b: partial=true が設定されない場合 — fast path', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-k3b-'));

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

  const histIdx = callOrder.findIndex((c) => c.startsWith('history:'));
  if (histIdx === -1) {
    assert.ok(callOrder.some((c) => c.startsWith('state:')), 'at least one state call');
  } else {
    const stateAfterHist = callOrder.slice(0, histIdx).every((c) => c.startsWith('state:'));
    assert.ok(stateAfterHist, `All calls before first history call must be state calls. Order: ${callOrder.join(', ')}`);
  }
});

// ---- M-1: REQ1 — pre-call deadline check inside loops ----

test('M-1: 내부 마감 < background · 느린 jobs 호출 모의 → 30s 전에 partial 반환', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-m1-'));
  // Many runs, each jobs call is slow (60ms). overallDeadline 500ms.
  // Baseline bug: all 10 cap x 60ms = 600ms would fire *after* background 30s only because
  // we had no per-call check. With REQ1 we must stop the loop and return partial well before
  // the outer timer triggers.
  const runs = makeCompletedRuns(10, 50000);
  const slowExec = async (endpoint) => {
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs?status=completed')) return { workflow_runs: runs };
    if (endpoint.includes('/jobs')) {
      await new Promise((r) => setTimeout(r, 60));
      return makeJobForRun(runs.find((r) => endpoint.includes(String(r.id))) || runs[0]);
    }
    return {};
  };

  const t0 = Date.now();
  const result = await fetchCiHealth({
    execFn: slowExec,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 500,
  });
  const elapsed = Date.now() - t0;

  assert.ok(!result.error, `no error: ${result.error}`);
  // Must return before the simulated background 30s deadline.
  assert.ok(elapsed < 30_000, `elapsed ${elapsed}ms should be < 30_000ms (background)`);
  // And should respect the internal deadline with modest slack (deadline + one in-flight API ≤ ~600ms).
  assert.ok(elapsed < 1200, `elapsed ${elapsed}ms should be within internal deadline + slack`);
  assert.equal(result.partial, true, 'partial=true when internal deadline cuts jobs iteration');
  assert.ok(Array.isArray(result.heavy.in_progress), 'state preserved');
});

// ---- M-2a: `created=>=` filter ----

test('M-2a: history filter 가 `created=>=` 로 변경 (updated 는 GitHub API 미지원)', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-m2a-'));
  const seenEndpoints = [];
  const execFn = async (endpoint) => {
    seenEndpoints.push(endpoint);
    if (endpoint.includes('actions/runners')) return { runners: [] };
    return { workflow_runs: [] };
  };
  await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: [MAIN_REPO],
  });
  const completedEp = seenEndpoints.find((e) => e.includes('status=completed'));
  assert.ok(completedEp, 'completed runs 조회 있음');
  assert.ok(completedEp.includes('created'), `created 파라미터 있음: ${completedEp}`);
  assert.ok(!/[?&]updated=/.test(completedEp), `updated 파라미터 제거됨: ${completedEp}`);
});

// ---- M-2b: Per-repo cursor is independent ----

test('M-2b: 커서가 repo 별로 유지됨 · storeport 와 fork 가 분리', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-m2b-'));
  const t_main = '2026-11-19T10:00:00.000Z';
  const t_fork = '2026-11-19T09:00:00.000Z';

  setHistoryCursor(tmpRoot, MAIN_REPO, t_main);
  setHistoryCursor(tmpRoot, FORK_REPO, t_fork);

  const since_main = getHistorySince(tmpRoot, MAIN_REPO);
  const since_fork = getHistorySince(tmpRoot, FORK_REPO);
  assert.equal(since_main.toISOString(), t_main);
  assert.equal(since_fork.toISOString(), t_fork);

  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  const raw = JSON.parse(readFileSync(cursorPath, 'utf8'));
  assert.equal(raw[MAIN_REPO], t_main, 'per-repo key for main');
  assert.equal(raw[FORK_REPO], t_fork, 'per-repo key for fork');
});

// ---- M-2c: Partial — cursor clamps to earliest unprocessed ----

test('M-2c: 상한 초과 — 처리 못 한 가장 오래된 run 앞에서 커서가 멈춤 + partial', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-m2c-'));
  // 15 runs > HISTORY_MAX_RUNS_PER_CALL (10) → 5 unprocessed.
  // Oldest run (sorted ascending by created_at) is processed first; the unprocessed set is
  // the newer 5. The cursor must therefore be clamped to the oldest unprocessed = index 10's
  // created_at (which is minsAgo(60+10)=minsAgo(70)).
  const runs = makeCompletedRuns(15, 60000);
  const execFn = makeExecFnWithRuns(runs);

  const result = await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!result.error, `no error: ${result.error}`);
  assert.equal(result.partial, true, 'partial=true when maxRuns hit');

  // Sorted ascending, we process runs 14..5 (10 oldest). Unprocessed: 4..0 (newest 5).
  // Oldest unprocessed by created_at = runs[4] = minsAgo(60+4) = minsAgo(64).
  const sortedAsc = [...runs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const expectedCursorIso = sortedAsc[10].created_at;

  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  const raw = JSON.parse(readFileSync(cursorPath, 'utf8'));
  assert.equal(raw[MAIN_REPO], expectedCursorIso,
    'cursor clamped to earliest unprocessed run\'s created_at');
});

// ---- M-3a: repo prefix in oldest_queued_pr / alerts ----

test('M-3a: oldest_queued_pr 와 alert detail 에 repo 표시 (fork:ci/…)', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-m3a-'));
  const forkHeavyQueued = {
    workflow_runs: [{
      id: 44476507188,
      name: 'CI',
      status: 'queued',
      created_at: minsAgo(200), // > 15 → queue_wait alert
      head_branch: 'ci/M2-1119-J-one-heavy',
      pull_requests: [],
    }],
  };
  const forkJobs = {
    jobs: [{
      id: 999, name: 'heavy-mac', status: 'queued',
      labels: ['self-hosted', 'macOS', 'curiocity-mac'],
      runner_name: null,
      created_at: minsAgo(200), started_at: null, completed_at: null,
    }],
  };

  const execFn = async (endpoint) => {
    if (endpoint.includes(FORK_REPO)) {
      if (endpoint.includes('actions/runs?status=queued')) return forkHeavyQueued;
      if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runs?status=completed')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      if (endpoint.includes(`actions/runs/${forkHeavyQueued.workflow_runs[0].id}/jobs`)) return forkJobs;
      return {};
    }
    // storeport: empty
    if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    return {};
  };

  const r = await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: [MAIN_REPO, FORK_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r.error, `no error: ${r.error}`);
  assert.equal(r.heavy.queued, 1);
  assert.equal(r.heavy.oldest_queued_pr, 'fork:ci/M2-1119-J-one-heavy',
    'oldest_queued_pr carries repo prefix');
  const qw = r.alerts.find((a) => a.type === 'queue_wait');
  assert.ok(qw, 'queue_wait alert present');
  assert.ok(qw.detail.includes('fork:ci/M2-1119-J-one-heavy'),
    `alert detail includes repo-prefixed id: ${qw.detail}`);
});

test('M-3a-repoShort: repoShort 가 fork/storeport 로 축약', () => {
  assert.equal(repoShort('CuriocityDevAi/storeport'), 'storeport');
  assert.equal(repoShort('CuriocityDevAi/agilo-medusa-pos-fork'), 'fork');
  assert.equal(repoShort('OrgX/other-fork'), 'fork');
  assert.equal(repoShort(null), '');
  assert.equal(repoShort(''), '');
});

// ---- M-3b: queued judgment uses only incomplete jobs ----

test('M-3b: queued 분류·대기 시간 — 완료된 job 제외 · 미완 job 의 created_at 기준', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-m3b-'));
  // Run was created 90m ago (pre-stage already ran), but the still-queued heavy job
  // was created only 5m ago (added to the run later / rerun scenario).
  // Previously run.created_at (90m) was used → inflated wait. With REQ3 it must be 5m.
  const queued = {
    workflow_runs: [{
      id: 70001,
      name: 'CI',
      status: 'queued',
      created_at: minsAgo(90),
      head_branch: 'feat/incomplete-only',
      pull_requests: [{ number: 321 }],
    }],
  };
  const jobs = {
    jobs: [
      // completed cloud job — must be IGNORED for kind + queued_min
      {
        id: 80001, name: 'lint', status: 'completed',
        labels: ['ubuntu-latest'], runner_name: 'GitHub Actions 1',
        created_at: minsAgo(90), started_at: minsAgo(89),
        completed_at: minsAgo(85), conclusion: 'success',
      },
      // still-queued heavy job created later — should drive classification + queued_min
      {
        id: 80002, name: 'heavy-mac', status: 'queued',
        labels: ['self-hosted', 'curiocity-mac'], runner_name: null,
        created_at: minsAgo(5), started_at: null, completed_at: null,
      },
    ],
  };

  const execFn = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return queued;
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=completed')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs/70001/jobs')) return jobs;
    return {};
  };

  const r = await fetchCiHealth({ execFn, repoRoot: tmpRoot });
  assert.ok(!r.error, `no error: ${r.error}`);
  assert.equal(r.heavy.queued, 1, 'classified as heavy (via incomplete job)');
  // queued_min must be based on job created 5m ago, not run created 90m ago.
  assert.ok(r.heavy.oldest_queued_min <= 7,
    `queued_min ${r.heavy.oldest_queued_min}m should be ~5m (incomplete job), not ~90m`);
  assert.ok(r.heavy.oldest_queued_min >= 4,
    `queued_min ${r.heavy.oldest_queued_min}m should be ≥ 4m`);
});
