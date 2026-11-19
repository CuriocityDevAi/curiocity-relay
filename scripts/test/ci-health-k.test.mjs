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
//
// 커버리지 (O-*, M0-1119-O R0 재리뷰 CHANGES):
//   O-1a: long/short 겹침 — tick1 cursor ≤ long.created_at, tick2 에 long run 기록됨 (REQ1)
//   O-1b: completed 만 있고 active 없을 때 cursor = max 처리 run.created_at (REQ1)
//   O-1c: active 만 있고 completed 없을 때 cursor = min active.created_at (REQ1)
//   O-2a: computeExecTimeoutMs — 남은 시간 < 10s → 그 값으로 clamp (REQ2 nit)
//   O-2b: computeExecTimeoutMs — 남은 시간 ≥ 10s → 10s cap (REQ2 nit)
//   O-2c: computeExecTimeoutMs — 남은 시간 ≤ 0 → 0 (호출 거부 신호) (REQ2 nit)
//
// 커버리지 (P-*, M0-1119-P R0 3차 CHANGES):
//   P-1: partial 경로도 activeMin 반영 — long(진행 중) + shorts > 상한 →
//        tick1 커서 ≤ long.created_at · tick2 에 long 기록됨 (REQ1)
//
// 커버리지 (R-*, M0-1119-R R0 AA 4차 CHANGES):
//   R-1: AA §2-1 재현 — state 못 본 repo (sr.error 로 aliveState 누락) 는 history
//        커서 전진 생략 · 두 번째 tick 에 long run 기록됨 (REQ(a))
//   R-2: AA §2-2 재현 — collectCompletedJobs jobs 조회 실패 → noteUnprocessed + break
//        · 커서가 실패 run 의 created_at 을 넘지 않음 · 다음 tick 에 재조회 (REQ(b))
//   R-3: nit — collectInProgress 중간 break (sr.partial=true) 시 cursor 전진 생략
//        (REQ(a) 로 함께 해결)

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
  computeExecTimeoutMs,
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

// ---- O-1: Long/short overlap regression (M0-1119-O REQ1) ----
//
// R0C-1119-V ② 재현 시나리오:
//   - long run: T-40m 생성, 진행 중
//   - short run: T-35m 생성, T-30m 완료
//   - tick1: short 만 기록. 직전 구현은 cursor = short.completed_at (T-30m) → tick2 에
//     `created>=T-30m` 필터가 long(T-40m 생성)을 제외해 영구 누락.
//   - 수정: cursor = min(처리한 run 의 최대 run.created_at, 상태 단계 active 의 최소
//     run.created_at) · seen-set 이 중복 방지 · 두 번째 tick 에 long run 기록.

test('O-1a: long/short 겹침 — cursor ≤ long.created_at · 두 번째 tick 에 long 기록', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-o1a-'));

  const longRun = {
    id: 90001,
    name: 'long-ci',
    status: 'in_progress',
    created_at: minsAgo(40),
    pull_requests: [{ number: 501 }],
    head_branch: 'feat/long',
    repository: { full_name: MAIN_REPO },
  };
  const shortRun = {
    id: 90002,
    name: 'short-ci',
    status: 'completed',
    created_at: minsAgo(35),
    updated_at: minsAgo(30),
    pull_requests: [{ number: 502 }],
    head_branch: 'feat/short',
    repository: { full_name: MAIN_REPO },
  };

  const shortJobs = {
    jobs: [{
      id: 900020,
      name: 'build',
      status: 'completed',
      labels: ['ubuntu-latest'],
      runner_name: 'GitHub Actions 1',
      created_at: shortRun.created_at,
      started_at: shortRun.created_at,
      completed_at: shortRun.updated_at,
      conclusion: 'success',
    }],
  };
  const longJobsInProgress = {
    jobs: [{
      id: 900010,
      name: 'heavy-mac',
      status: 'in_progress',
      labels: ['self-hosted', 'curiocity-mac'],
      runner_name: 'youngs-mac',
      created_at: longRun.created_at,
      started_at: minsAgo(38),
      completed_at: null,
    }],
  };

  // ---- tick1 ----
  const execFn1 = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [longRun] };
    if (endpoint.includes('actions/runs?status=completed')) return { workflow_runs: [shortRun] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes(`actions/runs/${shortRun.id}/jobs`)) return shortJobs;
    if (endpoint.includes(`actions/runs/${longRun.id}/jobs`)) return longJobsInProgress;
    return {};
  };

  const r1 = await fetchCiHealth({
    execFn: execFn1,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r1.error, `tick1 error: ${r1.error}`);
  assert.equal(r1.jsonl_added, 1, 'tick1: only short run recorded');

  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  assert.ok(existsSync(cursorPath), 'cursor file exists after tick1');
  const cursor1 = JSON.parse(readFileSync(cursorPath, 'utf8'));
  const longCreatedMs = new Date(longRun.created_at).getTime();
  const cursor1Ms = new Date(cursor1[MAIN_REPO]).getTime();
  assert.ok(
    cursor1Ms <= longCreatedMs,
    `cursor ${cursor1[MAIN_REPO]} must be ≤ long.created_at ${longRun.created_at}`,
  );

  // ---- tick2: long run has completed. seen-set still holds short. ----
  const longRunCompleted = {
    ...longRun,
    status: 'completed',
    updated_at: new Date(Date.now() - 2 * 60_000).toISOString(),
  };
  const longJobsCompleted = {
    jobs: [{
      id: 900010,
      name: 'heavy-mac',
      status: 'completed',
      labels: ['self-hosted', 'curiocity-mac'],
      runner_name: 'youngs-mac',
      created_at: longRun.created_at,
      started_at: minsAgo(38),
      completed_at: longRunCompleted.updated_at,
      conclusion: 'success',
    }],
  };

  const applyCreatedFilter = (iso, list) => {
    if (!iso) return list;
    const since = new Date(iso).getTime();
    return list.filter((r) => new Date(r.created_at).getTime() >= since);
  };

  const execFn2 = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs?status=completed')) {
      const m = endpoint.match(/created=>=([^&]+)/);
      const sinceIso = m ? decodeURIComponent(m[1]) : null;
      return { workflow_runs: applyCreatedFilter(sinceIso, [shortRun, longRunCompleted]) };
    }
    if (endpoint.includes(`actions/runs/${shortRun.id}/jobs`)) return shortJobs;
    if (endpoint.includes(`actions/runs/${longRun.id}/jobs`)) return longJobsCompleted;
    return {};
  };

  const r2 = await fetchCiHealth({
    execFn: execFn2,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r2.error, `tick2 error: ${r2.error}`);
  assert.equal(
    r2.jsonl_added,
    1,
    'tick2: long run must now be recorded (regression: direct bug caused 0 here)',
  );
});

test('O-1b: completed 만 — cursor = max 처리 run.created_at (active 없음)', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-o1b-'));
  const runs = makeCompletedRuns(3, 70000);
  const execFn = makeExecFnWithRuns(runs);

  const r = await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r.error, `error: ${r.error}`);
  assert.equal(r.jsonl_added, 3);

  const cursor = JSON.parse(readFileSync(join(tmpRoot, '.cache', 'ci-history-cursor.json'), 'utf8'));
  const sortedAsc = [...runs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const maxCreated = sortedAsc[sortedAsc.length - 1].created_at;
  assert.equal(cursor[MAIN_REPO], maxCreated,
    'cursor = max processed run.created_at when no active runs');
});

test('O-1c: active 만 — cursor = min active.created_at (completed 없음)', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-o1c-'));

  const active1 = {
    id: 80001, name: 'ci-a', status: 'in_progress',
    created_at: minsAgo(55),
    pull_requests: [{ number: 601 }],
    head_branch: 'feat/a',
  };
  const active2 = {
    id: 80002, name: 'ci-b', status: 'in_progress',
    created_at: minsAgo(20),
    pull_requests: [{ number: 602 }],
    head_branch: 'feat/b',
  };
  const activeJobs = (run) => ({
    jobs: [{
      id: run.id * 10, name: 'heavy-mac', status: 'in_progress',
      labels: ['self-hosted', 'curiocity-mac'], runner_name: 'youngs-mac',
      created_at: run.created_at, started_at: run.created_at, completed_at: null,
    }],
  });

  const execFn = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [active1, active2] };
    if (endpoint.includes('actions/runs?status=completed')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes(`actions/runs/${active1.id}/jobs`)) return activeJobs(active1);
    if (endpoint.includes(`actions/runs/${active2.id}/jobs`)) return activeJobs(active2);
    return {};
  };

  const r = await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r.error, `error: ${r.error}`);
  assert.equal(r.jsonl_added, 0, 'no completed records');

  const cursor = JSON.parse(readFileSync(join(tmpRoot, '.cache', 'ci-history-cursor.json'), 'utf8'));
  assert.equal(cursor[MAIN_REPO], active1.created_at,
    'cursor = min active.created_at = active1 (T-55m, older than active2 T-20m)');
});

// ---- O-2: execFile timeout clamp (M0-1119-O REQ2 nit) ----

test('O-2a: computeExecTimeoutMs — 남은 시간 < 10s → 남은 시간으로 clamp', () => {
  const deadline = Date.now() + 3_000;
  const t = computeExecTimeoutMs(deadline);
  assert.ok(t > 2_500 && t <= 3_000, `expected ~3000ms, got ${t}`);
});

test('O-2b: computeExecTimeoutMs — 남은 시간 ≥ 10s → 10s cap', () => {
  const deadline = Date.now() + 30_000;
  const t = computeExecTimeoutMs(deadline);
  assert.equal(t, 10_000, 'max is PER_REPO_TIMEOUT_MS=10s');
});

test('O-2c: computeExecTimeoutMs — 남은 시간 ≤ 0 → 0 (호출 거부 신호)', () => {
  assert.equal(computeExecTimeoutMs(Date.now() - 100), 0);
  assert.equal(computeExecTimeoutMs(Date.now()), 0);
});

test('O-2d: computeExecTimeoutMs — deadline null → full max', () => {
  assert.equal(computeExecTimeoutMs(null), 10_000);
  assert.equal(computeExecTimeoutMs(undefined), 10_000);
});

// ---- P-1: Partial path also clamps to activeMin (M0-1119-P R0 Y CHANGES) ----
//
// R0C-1119-Y 재현 시나리오:
//   - long run: T-40m 생성, 진행 중
//   - short run × 12: T-35m~T-24m 생성, 모두 완료
//   - maxRuns = 10 → tick1 은 10개 처리 · 2개 미처리 (earliestUnprocessed = T-25m)
//   - 직전 구현은 `partial && earliestUnprocessed` 이면 커서 = earliestUnprocessed(T-25m)
//     만 사용 → tick2 에 `created>=T-25m` 필터가 long(T-40m 생성)을 제외 → 영구 누락.
//   - 수정: 커서 = min(earliestUnprocessed, activeMin). activeMin = T-40m 이므로
//     커서 ≤ T-40m. tick2 에 long 이 조회·기록된다.

test('P-1: partial + active 겹침 — 커서 ≤ long.created_at · tick2 에 long 기록', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-p1-'));

  const longRun = {
    id: 110001,
    name: 'long-ci',
    status: 'in_progress',
    created_at: minsAgo(40),
    pull_requests: [{ number: 701 }],
    head_branch: 'feat/long',
    repository: { full_name: MAIN_REPO },
  };
  const longJobsInProgress = {
    jobs: [{
      id: 1100010, name: 'heavy-mac', status: 'in_progress',
      labels: ['self-hosted', 'curiocity-mac'], runner_name: 'youngs-mac',
      created_at: longRun.created_at, started_at: minsAgo(38), completed_at: null,
    }],
  };

  // 12 short runs: ages (minsAgo) 35,34,...,24 (ascending created_at → most recent = T-24m)
  const shortRuns = [];
  for (let i = 0; i < 12; i++) {
    const ageMin = 35 - i; // 35, 34, ..., 24
    shortRuns.push({
      id: 110100 + i,
      name: `short-ci-${i}`,
      status: 'completed',
      created_at: minsAgo(ageMin),
      updated_at: minsAgo(Math.max(ageMin - 5, 1)),
      pull_requests: [{ number: 800 + i }],
      head_branch: `feat/short-${i}`,
      repository: { full_name: MAIN_REPO },
    });
  }
  const shortJobsById = {};
  for (const r of shortRuns) {
    shortJobsById[r.id] = {
      jobs: [{
        id: r.id * 10, name: 'build', status: 'completed',
        labels: ['ubuntu-latest'], runner_name: 'GitHub Actions 1',
        created_at: r.created_at, started_at: r.created_at,
        completed_at: r.updated_at, conclusion: 'success',
      }],
    };
  }

  const applyCreatedFilter = (iso, list) => {
    if (!iso) return list;
    const since = new Date(iso).getTime();
    return list.filter((r) => new Date(r.created_at).getTime() >= since);
  };

  // ---- tick1 ----
  const execFn1 = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [longRun] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs?status=completed')) {
      return { workflow_runs: shortRuns };
    }
    if (endpoint.includes(`actions/runs/${longRun.id}/jobs`)) return longJobsInProgress;
    for (const r of shortRuns) {
      if (endpoint.includes(`actions/runs/${r.id}/jobs`)) return shortJobsById[r.id];
    }
    return {};
  };

  const r1 = await fetchCiHealth({
    execFn: execFn1,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r1.error, `tick1 error: ${r1.error}`);
  assert.equal(r1.partial, true, 'tick1 partial=true (12 > maxRuns 10)');
  assert.equal(r1.jsonl_added, 10, 'tick1 records 10 short runs (maxRuns cap)');

  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  assert.ok(existsSync(cursorPath), 'cursor file exists after tick1');
  const cursor1 = JSON.parse(readFileSync(cursorPath, 'utf8'));
  const longCreatedMs = new Date(longRun.created_at).getTime();
  const cursor1Ms = new Date(cursor1[MAIN_REPO]).getTime();
  assert.ok(
    cursor1Ms <= longCreatedMs,
    `cursor ${cursor1[MAIN_REPO]} must be ≤ long.created_at ${longRun.created_at} (partial path must honor activeMin)`,
  );

  // ---- tick2: long completed, 2 remaining shorts still there + 10 seen shorts ----
  const longRunCompleted = {
    ...longRun,
    status: 'completed',
    updated_at: new Date(Date.now() - 2 * 60_000).toISOString(),
  };
  const longJobsCompleted = {
    jobs: [{
      id: 1100010, name: 'heavy-mac', status: 'completed',
      labels: ['self-hosted', 'curiocity-mac'], runner_name: 'youngs-mac',
      created_at: longRun.created_at, started_at: minsAgo(38),
      completed_at: longRunCompleted.updated_at, conclusion: 'success',
    }],
  };

  const execFn2 = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs?status=completed')) {
      const m = endpoint.match(/created=>=([^&]+)/);
      const sinceIso = m ? decodeURIComponent(m[1]) : null;
      const all = [longRunCompleted, ...shortRuns];
      return { workflow_runs: applyCreatedFilter(sinceIso, all) };
    }
    if (endpoint.includes(`actions/runs/${longRun.id}/jobs`)) return longJobsCompleted;
    for (const r of shortRuns) {
      if (endpoint.includes(`actions/runs/${r.id}/jobs`)) return shortJobsById[r.id];
    }
    return {};
  };

  const r2 = await fetchCiHealth({
    execFn: execFn2,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r2.error, `tick2 error: ${r2.error}`);
  // long (new) + 2 remaining shorts (unprocessed in tick1, still unseen) must be recorded.
  // The 10 shorts already in seen-set are skipped by runKey check.
  assert.equal(
    r2.jsonl_added,
    3,
    `tick2 must record long + 2 remaining shorts (regression: direct bug caused long=0). got ${r2.jsonl_added}`,
  );
});

// ---- R-1: AA §2-1 — state 못 본 repo 는 history 커서 전진 생략 ----
//
// R0C-1119-AA §2-1 재현 시나리오:
//   - fork: queued API 가 non-404 error → sr.error → aliveState 에서 빠짐.
//     즉 fork 의 long(T-40m 진행 중) run 은 minActiveByRepo 에 없음.
//   - fork: completed short(T-30m) 만 history 에서 보임.
//   - 직전 구현은 state 못 본 repo 도 cursor 전진 → cursor = T-30m (short.created_at)
//     → tick2 에 long 완료 뒤에도 `created>=T-30m` 필터로 long(T-40m) 제외 → 영구 누락.
//   - 수정: sr.error (aliveState 누락) 인 repo 는 cursor 전진 생략.

test('R-1: AA §2-1 — state error 난 repo 는 cursor 전진 생략 · tick2 에 long 기록', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-r1-'));

  const forkLongRun = {
    id: 120001,
    name: 'long-heavy',
    status: 'in_progress',
    created_at: minsAgo(40),
    pull_requests: [],
    head_branch: 'ci/long-heavy',
    repository: { full_name: FORK_REPO },
  };
  const forkShortRun = {
    id: 120002,
    name: 'short-ci',
    status: 'completed',
    created_at: minsAgo(30),
    updated_at: minsAgo(25),
    pull_requests: [],
    head_branch: 'ci/short',
    repository: { full_name: FORK_REPO },
  };
  const forkShortJobs = {
    jobs: [{
      id: 1200020, name: 'build', status: 'completed',
      labels: ['ubuntu-latest'], runner_name: 'GitHub Actions 1',
      created_at: forkShortRun.created_at, started_at: forkShortRun.created_at,
      completed_at: forkShortRun.updated_at, conclusion: 'success',
    }],
  };
  const forkLongJobsInProgress = {
    jobs: [{
      id: 1200010, name: 'heavy-mac', status: 'in_progress',
      labels: ['self-hosted', 'curiocity-mac'], runner_name: 'youngs-mac',
      created_at: forkLongRun.created_at, started_at: minsAgo(38), completed_at: null,
    }],
  };

  const applyCreatedFilter = (iso, list) => {
    if (!iso) return list;
    const since = new Date(iso).getTime();
    return list.filter((r) => new Date(r.created_at).getTime() >= since);
  };

  // ---- tick1: fork queued throws (sr.error) ----
  const execFn1 = async (endpoint) => {
    // storeport — all empty, succeeds
    if (endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    // fork
    if (endpoint.includes(FORK_REPO)) {
      if (endpoint.includes('actions/runs?status=queued')) {
        throw new Error('500 Internal Server Error (simulated — state coverage incomplete)');
      }
      if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [forkLongRun] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      if (endpoint.includes('actions/runs?status=completed')) {
        const m = endpoint.match(/created=>=([^&]+)/);
        const sinceIso = m ? decodeURIComponent(m[1]) : null;
        return { workflow_runs: applyCreatedFilter(sinceIso, [forkShortRun]) };
      }
      if (endpoint.includes(`actions/runs/${forkShortRun.id}/jobs`)) return forkShortJobs;
      if (endpoint.includes(`actions/runs/${forkLongRun.id}/jobs`)) return forkLongJobsInProgress;
      return {};
    }
    return {};
  };

  const r1 = await fetchCiHealth({
    execFn: execFn1,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO, FORK_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r1.error, `tick1 error: ${r1.error}`);
  // fork should be in repos_failed (sr.error) → not in aliveState
  const forkFailed = (r1.repos_failed || []).some((f) => f.repo === FORK_REPO);
  assert.ok(forkFailed, 'fork reported as failed (sr.error) → not in aliveState');
  assert.equal(r1.jsonl_added, 1, 'tick1: fork short still recorded via history (REQ(a) keeps recording)');

  // The critical assertion: fork cursor must NOT have advanced (state was not seen).
  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  const cursor1 = existsSync(cursorPath) ? JSON.parse(readFileSync(cursorPath, 'utf8')) : {};
  if (cursor1[FORK_REPO]) {
    const cursorMs = new Date(cursor1[FORK_REPO]).getTime();
    const longCreatedMs = new Date(forkLongRun.created_at).getTime();
    assert.ok(
      cursorMs <= longCreatedMs,
      `fork cursor ${cursor1[FORK_REPO]} must be ≤ long.created_at ${forkLongRun.created_at} (state not fully seen)`,
    );
  }
  // storeport cursor advanced fine (state fully seen, no runs → no cursor write)
  // Not asserting on storeport cursor here — it's the happy path.

  // ---- tick2: fork state recovered · long completed ----
  const forkLongRunCompleted = {
    ...forkLongRun,
    status: 'completed',
    updated_at: new Date(Date.now() - 2 * 60_000).toISOString(),
  };
  const forkLongJobsCompleted = {
    jobs: [{
      id: 1200010, name: 'heavy-mac', status: 'completed',
      labels: ['self-hosted', 'curiocity-mac'], runner_name: 'youngs-mac',
      created_at: forkLongRun.created_at, started_at: minsAgo(38),
      completed_at: forkLongRunCompleted.updated_at, conclusion: 'success',
    }],
  };

  const execFn2 = async (endpoint) => {
    if (endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes(FORK_REPO)) {
      if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      if (endpoint.includes('actions/runs?status=completed')) {
        const m = endpoint.match(/created=>=([^&]+)/);
        const sinceIso = m ? decodeURIComponent(m[1]) : null;
        return { workflow_runs: applyCreatedFilter(sinceIso, [forkShortRun, forkLongRunCompleted]) };
      }
      if (endpoint.includes(`actions/runs/${forkShortRun.id}/jobs`)) return forkShortJobs;
      if (endpoint.includes(`actions/runs/${forkLongRun.id}/jobs`)) return forkLongJobsCompleted;
      return {};
    }
    return {};
  };

  const r2 = await fetchCiHealth({
    execFn: execFn2,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO, FORK_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r2.error, `tick2 error: ${r2.error}`);
  // Expect long (new) recorded. short is already in seen-set from tick1 → skipped.
  assert.equal(
    r2.jsonl_added,
    1,
    `tick2 must record long after state recovers (direct bug: cursor = T-30m → long filtered out → 0). got ${r2.jsonl_added}`,
  );
});

// ---- R-2: AA §2-2 — jobs 조회 실패 → unprocessed · cursor 전진 차단 ----
//
// R0C-1119-AA §2-2 재현 시나리오:
//   - A run (T-40m 생성, 완료). A 의 jobs 조회가 throw.
//   - B run (T-30m 생성, 완료). B 의 jobs 조회는 정상.
//   - 직전 구현은 A 의 catch 가 `// retry next tick` 만 → B 는 정상 처리 →
//     latestProcessedRunCreatedAt = B.created_at = T-30m → cursor = T-30m →
//     다음 tick 에 `created>=T-30m` 로 A 제외 → A 영구 누락.
//   - 수정: catch 에서 noteUnprocessed(A); break; → earliestUnprocessed = A.created_at
//     = T-40m → cursor = T-40m → 다음 tick 에 A 재조회.

test('R-2: AA §2-2 — jobs 조회 실패 run 은 unprocessed 로 표시 · 다음 tick 재조회', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-r2-'));

  const runA = {
    id: 130001,
    name: 'ci-A',
    status: 'completed',
    created_at: minsAgo(40),
    updated_at: minsAgo(35),
    pull_requests: [{ number: 901 }],
    head_branch: 'feat/A',
    repository: { full_name: MAIN_REPO },
  };
  const runB = {
    id: 130002,
    name: 'ci-B',
    status: 'completed',
    created_at: minsAgo(30),
    updated_at: minsAgo(25),
    pull_requests: [{ number: 902 }],
    head_branch: 'feat/B',
    repository: { full_name: MAIN_REPO },
  };
  const jobsB = {
    jobs: [{
      id: 1300020, name: 'build', status: 'completed',
      labels: ['ubuntu-latest'], runner_name: 'GitHub Actions 1',
      created_at: runB.created_at, started_at: runB.created_at,
      completed_at: runB.updated_at, conclusion: 'success',
    }],
  };
  const jobsA = {
    jobs: [{
      id: 1300010, name: 'build', status: 'completed',
      labels: ['ubuntu-latest'], runner_name: 'GitHub Actions 2',
      created_at: runA.created_at, started_at: runA.created_at,
      completed_at: runA.updated_at, conclusion: 'success',
    }],
  };

  const applyCreatedFilter = (iso, list) => {
    if (!iso) return list;
    const since = new Date(iso).getTime();
    return list.filter((r) => new Date(r.created_at).getTime() >= since);
  };

  // ---- tick1: A jobs throws ----
  let aJobCalls = 0;
  const execFn1 = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs?status=completed')) {
      const m = endpoint.match(/created=>=([^&]+)/);
      const sinceIso = m ? decodeURIComponent(m[1]) : null;
      return { workflow_runs: applyCreatedFilter(sinceIso, [runA, runB]) };
    }
    if (endpoint.includes(`actions/runs/${runA.id}/jobs`)) {
      aJobCalls++;
      throw new Error('simulated jobs API failure (timeout clamp kill)');
    }
    if (endpoint.includes(`actions/runs/${runB.id}/jobs`)) return jobsB;
    return {};
  };

  const r1 = await fetchCiHealth({
    execFn: execFn1,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r1.error, `tick1 error: ${r1.error}`);
  assert.ok(aJobCalls >= 1, 'A jobs was attempted');
  // B should NOT be recorded (break prevents the loop from reaching B). Only A was attempted.
  assert.equal(r1.jsonl_added, 0, 'tick1: A fails and loop breaks → B not processed yet');
  assert.equal(r1.partial, true, 'tick1 partial=true (A unprocessed)');

  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  assert.ok(existsSync(cursorPath), 'cursor file exists after tick1');
  const cursor1 = JSON.parse(readFileSync(cursorPath, 'utf8'));
  const cursor1Ms = new Date(cursor1[MAIN_REPO]).getTime();
  const runACreatedMs = new Date(runA.created_at).getTime();
  assert.ok(
    cursor1Ms <= runACreatedMs,
    `cursor ${cursor1[MAIN_REPO]} must be ≤ runA.created_at ${runA.created_at} (regression: cursor stepped past failed run to B.created_at=${runB.created_at})`,
  );

  // ---- tick2: A jobs now succeeds ----
  const execFn2 = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs?status=completed')) {
      const m = endpoint.match(/created=>=([^&]+)/);
      const sinceIso = m ? decodeURIComponent(m[1]) : null;
      return { workflow_runs: applyCreatedFilter(sinceIso, [runA, runB]) };
    }
    if (endpoint.includes(`actions/runs/${runA.id}/jobs`)) return jobsA;
    if (endpoint.includes(`actions/runs/${runB.id}/jobs`)) return jobsB;
    return {};
  };

  const r2 = await fetchCiHealth({
    execFn: execFn2,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r2.error, `tick2 error: ${r2.error}`);
  // Both A and B should now be recorded (A re-fetched because cursor didn't skip past it).
  assert.equal(
    r2.jsonl_added,
    2,
    `tick2 must record both A and B (regression: direct bug caused A=0 because cursor skipped past it). got ${r2.jsonl_added}`,
  );
});

// ---- R-3: nit — collectInProgress 중간 break (sr.partial) 로 cursor 전진 생략 ----
//
// R0C-1119-AA §3 nit 재현:
//   - storeport 에 in_progress run 2개: longEarly(T-45m, 진행 중) · short2(T-20m, 진행 중)
//   - budget 이 모자라 collectInProgress 가 두 번째 run jobs 호출 전에 partial=true 로 break
//     → runCreatedAts 는 longEarly 만 포함 (short2 는 꺼내기 전 break).
//   - completed: shortDone (T-25m, 완료) 만.
//   - 직전 구현은 sr.partial=true 라도 cursor 전진 → cursor = min(shortDone.created_at,
//     longEarly.created_at) = T-45m 은 괜찮으나, 만약 longEarly 가 아직 안 꺼내졌으면 cursor
//     = shortDone.created_at(T-25m) 로 올라감. 요지: state 가 partial 이면 activeMin 이
//     불완전 → cursor 전진이 위험. REQ(a) 로 이 경우 cursor 전진 자체를 생략.

test('R-3: nit — in_progress 중간 break (sr.partial) 시 history cursor 전진 생략', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-r3-'));

  // One in_progress run that we WON'T see (loop breaks before reaching it in a different scenario),
  // but the simpler shape here: force sr.partial via a budget-tight scenario.
  // We trigger partial by making the state phase hit the deadline during in_progress jobs call.

  const inProgRun = {
    id: 140001,
    name: 'long-heavy',
    status: 'in_progress',
    created_at: minsAgo(45),
    pull_requests: [{ number: 1001 }],
    head_branch: 'feat/long',
    repository: { full_name: MAIN_REPO },
  };
  const shortDone = {
    id: 140002,
    name: 'short-ci',
    status: 'completed',
    created_at: minsAgo(25),
    updated_at: minsAgo(22),
    pull_requests: [{ number: 1002 }],
    head_branch: 'feat/short',
    repository: { full_name: MAIN_REPO },
  };
  const shortDoneJobs = {
    jobs: [{
      id: 1400020, name: 'build', status: 'completed',
      labels: ['ubuntu-latest'], runner_name: 'GitHub Actions 1',
      created_at: shortDone.created_at, started_at: shortDone.created_at,
      completed_at: shortDone.updated_at, conclusion: 'success',
    }],
  };

  // Use a tiny apiBudget so collectInProgress runs out of budget during the inner jobs call.
  // Phase order: collectQueued (1 call) → collectInProgress (1 call for runs list, then jobs
  // per-run). If budget=2, the in-progress jobs call for inProgRun gets budget-rejected → partial.
  // History still runs for the remaining budget (we keep budget small enough that history also
  // breaks, but what matters is sr.partial=true).

  const execFn = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [inProgRun] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs?status=completed')) return { workflow_runs: [shortDone] };
    if (endpoint.includes(`actions/runs/${inProgRun.id}/jobs`)) {
      return {
        jobs: [{
          id: 1400010, name: 'heavy-mac', status: 'in_progress',
          labels: ['self-hosted', 'curiocity-mac'], runner_name: 'youngs-mac',
          created_at: inProgRun.created_at, started_at: minsAgo(44), completed_at: null,
        }],
      };
    }
    if (endpoint.includes(`actions/runs/${shortDone.id}/jobs`)) return shortDoneJobs;
    return {};
  };

  // apiBudget=2 → state uses queued(1) + in_progress runs list(1). Jobs call for inProgRun
  // is budget-rejected → ip.partial=true → sr.partial=true. History then budget-overflows too
  // (handled by budget.overflow gate). Either way, sr.partial should prevent cursor advance.
  const r = await fetchCiHealth({
    execFn,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
    apiBudget: 2,
  });

  assert.ok(!r.error, `error: ${r.error}`);
  assert.equal(r.partial, true, 'overall partial=true (state partial from budget exhaustion)');

  // Key assertion: cursor NOT advanced for storeport (state was partial).
  // Without REQ(a), the cursor would be set to shortDone.created_at or some other advanced value.
  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  const hasCursor = existsSync(cursorPath);
  if (hasCursor) {
    const cursor = JSON.parse(readFileSync(cursorPath, 'utf8'));
    assert.ok(
      !cursor[MAIN_REPO],
      `storeport cursor must not be set when sr.partial=true. got ${cursor[MAIN_REPO]}`,
    );
  }
  // hasCursor=false is also fine — means no cursor file was written at all.
});

// ---- S-1: AC §2-① — collectHistoryForRepo non-404 catch returns partial:true (M0-1119-S REQ1) ----
//
// R0C-1119-AC §2-① 재현 시나리오:
//   - storeport state 는 정상 (queued/in_progress long run T-40m, runners 정상).
//   - history 조회 (`actions/runs?status=completed`) 가 500 Internal Server Error 로 throw.
//   - 직전 구현은 catch 에서 `{ partial: false, earliestUnprocessed: null, ... }` 반환
//     → stateFullySeen=true, partial=false, earliestUnprocessed=null →
//       candidates=[activeMin=T-40m] → cursor = T-40m → 다음 tick 에 `created>=T-40m`
//       필터로 완료된 C(T-45m) 영구 누락.
//   - 수정: catch 에서 non-404 → partial:true 반환 + 커서 블록 skip (REQ2).

test('S-1: AC §2-① — history 조회 non-404 throw → cursor 전진 생략 · 다음 tick 재조회', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-s1-'));

  const longRun = {
    id: 150001,
    name: 'long-heavy',
    status: 'in_progress',
    created_at: minsAgo(40),
    pull_requests: [{ number: 1101 }],
    head_branch: 'feat/long',
    repository: { full_name: MAIN_REPO },
  };
  const longJobsInProgress = {
    jobs: [{
      id: 1500010, name: 'heavy-mac', status: 'in_progress',
      labels: ['self-hosted', 'curiocity-mac'], runner_name: 'youngs-mac',
      created_at: longRun.created_at, started_at: minsAgo(39), completed_at: null,
    }],
  };
  // C ran older than long (T-45m created, T-42m completed). After tick1 bug, cursor would be
  // set to T-40m and tick2's `created>=T-40m` filter would exclude C → permanent loss.
  const completedC = {
    id: 150002,
    name: 'ci-c',
    status: 'completed',
    created_at: minsAgo(45),
    updated_at: minsAgo(42),
    pull_requests: [{ number: 1102 }],
    head_branch: 'feat/c',
    repository: { full_name: MAIN_REPO },
  };
  const completedCJobs = {
    jobs: [{
      id: 1500020, name: 'build', status: 'completed',
      labels: ['ubuntu-latest'], runner_name: 'GitHub Actions 1',
      created_at: completedC.created_at, started_at: completedC.created_at,
      completed_at: completedC.updated_at, conclusion: 'success',
    }],
  };

  const applyCreatedFilter = (iso, list) => {
    if (!iso) return list;
    const since = new Date(iso).getTime();
    return list.filter((r) => new Date(r.created_at).getTime() >= since);
  };

  // ---- tick1: completed list throws 500 ----
  const execFn1 = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [longRun] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs?status=completed')) {
      throw new Error('500 Internal Server Error (simulated history failure)');
    }
    if (endpoint.includes(`actions/runs/${longRun.id}/jobs`)) return longJobsInProgress;
    return {};
  };

  const r1 = await fetchCiHealth({
    execFn: execFn1,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r1.error, `tick1 error: ${r1.error}`);
  assert.equal(r1.partial, true, 'tick1 partial=true (non-404 history catch)');
  assert.equal(r1.jsonl_added, 0, 'tick1: history threw → 0 records');

  // Key assertion: cursor NOT advanced to activeMin (long.created_at = T-40m).
  // Without fix: cursor set to T-40m → tick2 filter excludes C(T-45m) → permanent loss.
  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  if (existsSync(cursorPath)) {
    const cursor1 = JSON.parse(readFileSync(cursorPath, 'utf8'));
    if (cursor1[MAIN_REPO]) {
      const cursorMs = new Date(cursor1[MAIN_REPO]).getTime();
      const completedCMs = new Date(completedC.created_at).getTime();
      assert.ok(
        cursorMs <= completedCMs,
        `cursor ${cursor1[MAIN_REPO]} must be ≤ completedC.created_at ${completedC.created_at} (regression: cursor advanced to activeMin=${longRun.created_at} and skipped C)`,
      );
    }
    // No cursor entry = also fine (never written).
  }

  // ---- tick2: completed list recovers · C is still fetchable ----
  const execFn2 = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [longRun] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    if (endpoint.includes('actions/runs?status=completed')) {
      const m = endpoint.match(/created=>=([^&]+)/);
      const sinceIso = m ? decodeURIComponent(m[1]) : null;
      return { workflow_runs: applyCreatedFilter(sinceIso, [completedC]) };
    }
    if (endpoint.includes(`actions/runs/${longRun.id}/jobs`)) return longJobsInProgress;
    if (endpoint.includes(`actions/runs/${completedC.id}/jobs`)) return completedCJobs;
    return {};
  };

  const r2 = await fetchCiHealth({
    execFn: execFn2,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO],
    overallDeadlineMs: 30_000,
  });
  assert.ok(!r2.error, `tick2 error: ${r2.error}`);
  assert.equal(
    r2.jsonl_added,
    1,
    `tick2 must record C after history recovers (regression: cursor would have skipped past C). got ${r2.jsonl_added}`,
  );
});

// ---- S-2: AC §2-② — collectCompletedJobs budget-exhaustion early return (M0-1119-S REQ2) ----
//
// R0C-1119-AC §2-② 재현 시나리오:
//   - 2 repos. Main 의 history 가 budget 을 다 써서 fork 의 collectCompletedJobs
//     진입 시점에 `!budgetCheck(budget)` 으로 조기 반환 (partial:true, earliestUnprocessed:null).
//   - fork 는 state 단계에서 long run (T-40m) 을 봤으므로 activeMin = T-40m.
//   - 직전 구현은 커서 블록이 partial:true + earliestUnprocessed=null 를 특별 처리하지 않아
//     candidates=[activeMin] → cursor = T-40m → 다음 tick 에 `created>=T-40m` 필터로
//     T-50m 완료 run (완료된 C) 영구 누락.
//   - 수정: `if (partial && !earliestUnprocessed) continue;` 로 cursor 전진 생략 (REQ2).

test('S-2: AC §2-② — collectCompletedJobs budget 조기 반환 → cursor 전진 생략', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-s2-'));

  const forkLongRun = {
    id: 160001,
    name: 'long-heavy',
    status: 'in_progress',
    created_at: minsAgo(40),
    pull_requests: [{ number: 1201 }],
    head_branch: 'feat/long',
    repository: { full_name: FORK_REPO },
  };
  const forkLongJobsInProgress = {
    jobs: [{
      id: 1600010, name: 'heavy-mac', status: 'in_progress',
      labels: ['self-hosted', 'curiocity-mac'], runner_name: 'youngs-mac',
      created_at: forkLongRun.created_at, started_at: minsAgo(39), completed_at: null,
    }],
  };
  // Main completed runs — just enough to consume budget so fork hits the early return.
  const mainCompleted = makeCompletedRuns(5, 160100, MAIN_REPO);

  const execFn = async (endpoint) => {
    if (endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      if (endpoint.includes('actions/runs?status=completed')) return { workflow_runs: mainCompleted };
      for (const run of mainCompleted) {
        if (endpoint.includes(`actions/runs/${run.id}/jobs`)) return makeJobForRun(run);
      }
      return {};
    }
    if (endpoint.includes(FORK_REPO)) {
      if (endpoint.includes('actions/runs?status=queued')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runs?status=in_progress')) return { workflow_runs: [forkLongRun] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      if (endpoint.includes('actions/runs?status=completed')) return { workflow_runs: [] };
      if (endpoint.includes(`actions/runs/${forkLongRun.id}/jobs`)) return forkLongJobsInProgress;
      return {};
    }
    return {};
  };

  // Budget trace with apiBudget=11:
  //   state: main queued(1), main in_progress(2), main runners(3),
  //          fork queued(4), fork in_progress(5), fork in_progress jobs(6), fork runners(7)
  //   history: main completed list(8), main run1 jobs(9), main run2 jobs(10), main run3 jobs(11)
  //            → budget.overflow=true during run4's budgetCheck (noteUnprocessed path)
  //   fork history enter: collectCompletedJobs line 369 budgetCheck fails → early return
  //     { partial:true, earliestUnprocessed:null, latestProcessedRunCreatedAt:null }.
  const r = await fetchCiHealth({
    execFn,
    repoRoot: tmpRoot,
    repos: [MAIN_REPO, FORK_REPO],
    overallDeadlineMs: 30_000,
    apiBudget: 11,
  });
  assert.ok(!r.error, `error: ${r.error}`);
  assert.equal(r.api_overflow, true, 'api_overflow=true (budget exhausted during history)');

  // Key assertion: fork cursor NOT advanced to activeMin (forkLongRun.created_at = T-40m).
  // Without REQ2: cursor set to T-40m (forkLongRun) → next tick filter would skip anything older.
  // With REQ2: partial:true + earliestUnprocessed=null → continue → no cursor write.
  const cursorPath = join(tmpRoot, '.cache', 'ci-history-cursor.json');
  if (existsSync(cursorPath)) {
    const cursor = JSON.parse(readFileSync(cursorPath, 'utf8'));
    if (cursor[FORK_REPO]) {
      const cursorMs = new Date(cursor[FORK_REPO]).getTime();
      const longCreatedMs = new Date(forkLongRun.created_at).getTime();
      assert.ok(
        cursorMs < longCreatedMs,
        `fork cursor ${cursor[FORK_REPO]} must be < forkLongRun.created_at ${forkLongRun.created_at} (regression: cursor advanced to activeMin via partial:true+null path)`,
      );
    }
    // Also acceptable: fork cursor not written at all.
  }
});
