// scripts/test/ci-health.test.mjs · M0-1119-I — v7.4 기반 v7.5 추가 모듈 단위 테스트.
//
// 커버리지:
//   G: fetchCiHealth 정상 · heavy 대기 · long job · runner_idle · API 실패
//   H: classifyRunnerKind · jsonl 중복 방지 · today 요약 · 비용 추정
//   I: 스코프 확장 · 백그라운드 1개+마감 · 분류(job.labels/runner_name) · 완료-run 기록 ·
//      WIB 날짜 라우팅 · suspect_done 기록-only · CLOUD_COST_PER_MIN_USD 단일 상수

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchCiHealth } from '../lib/ci-health.mjs';
import {
  classifyRunnerKind,
  appendJobs,
  readJsonlFile,
  summarizeToday,
  calcCloudCost,
  calcWastedMin,
  getJsonlPath,
  getWibDateStr,
  getWibDayBoundary,
  jobToRecord,
  CLOUD_COST_PER_MIN_USD,
  CLOUD_COST_NOTE,
} from '../lib/ci-history.mjs';
import { createCiBackground, maybeStartCiFetch, getLatestCi, isFetchInFlight } from '../lib/ci-background.mjs';
import { computeSuspectDone, SUSPECT_DONE_THRESHOLD_MS, SUSPECT_DONE_TMP_DIR } from '../lib/ci-suspect.mjs';
import { _resetCiHealthCache } from '../lib/ci-health.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');

function minsAgo(n) { return new Date(Date.now() - n * 60_000).toISOString(); }

// gh 응답 주입 헬퍼 (endpoint 포함 문자열 매칭)
// fork repo 는 빈 응답으로 격리 — G-* 테스트가 메인 repo 만 보도록.
const MAIN_REPO = 'CuriocityDevAi/storeport';
const EMPTY_RUNS = { workflow_runs: [] };
const EMPTY_RUNNERS = { runners: [] };
function makeExecFn(responses) {
  return async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return EMPTY_RUNS;
      if (endpoint.includes('actions/runners')) return EMPTY_RUNNERS;
      return {};
    }
    for (const [key, val] of Object.entries(responses)) {
      if (endpoint.includes(key)) return val;
    }
    throw new Error(`no mock for endpoint: ${endpoint}`);
  };
}

// ---- G: fetchCiHealth 일반 ----

test('G-1: 정상 — 대기 없음, 알림 없음', async () => {
  const execFn = makeExecFn({
    'actions/runs?status=queued': { workflow_runs: [] },
    'actions/runs?status=in_progress': { workflow_runs: [] },
    'actions/runs?status=completed': { workflow_runs: [] },
    'actions/runners': { runners: [{ labels: [{ name: 'curiocity-mac' }], status: 'online', busy: false, name: 'youngs-mac' }] },
  });
  const result = await fetchCiHealth({ execFn, repoRoot: REPO_ROOT });
  assert.ok(!result.error, `에러 없어야 함: ${result.error}`);
  assert.equal(result.heavy.queued, 0);
  assert.equal(result.heavy.in_progress.length, 0);
  assert.equal(result.alerts.length, 0);
  assert.equal(result.cloud_today, 0);
});

test('G-2: heavy 대기 60분 → queue_wait alert', async () => {
  const execFn = makeExecFn({
    'actions/runs?status=queued': {
      workflow_runs: [{
        id: 1001, name: 'CI', status: 'queued', created_at: minsAgo(60),
        head_branch: 'feat/test', pull_requests: [{ number: 42 }],
      }],
    },
    'actions/runs?status=in_progress': { workflow_runs: [] },
    'actions/runs?status=completed': { workflow_runs: [] },
    'actions/runners': { runners: [] },
  });
  const result = await fetchCiHealth({ execFn, repoRoot: REPO_ROOT });
  assert.ok(!result.error, `에러 없어야 함: ${result.error}`);
  assert.equal(result.heavy.queued, 1);
  assert.ok(result.heavy.oldest_queued_min >= 59);
  assert.ok(result.alerts.find((a) => a.type === 'queue_wait'));
});

test('G-3: job 50분 실행(job.labels=curiocity-mac) → long_job alert', async () => {
  const jobStarted = minsAgo(50);
  const execFn = makeExecFn({
    'actions/runs?status=queued': { workflow_runs: [] },
    'actions/runs?status=in_progress': {
      workflow_runs: [{
        id: 2001, name: 'CI', status: 'in_progress',
        created_at: minsAgo(51), run_started_at: jobStarted,
        head_branch: 'feat/long', pull_requests: [{ number: 99 }],
      }],
    },
    'actions/runs?status=completed': { workflow_runs: [] },
    'actions/runners': { runners: [] },
    'actions/runs/2001/jobs': {
      jobs: [{
        id: 3001, name: 'build', status: 'in_progress',
        created_at: minsAgo(51), started_at: jobStarted,
        labels: ['self-hosted', 'curiocity-mac'], runner_name: 'youngs-mac',
        steps: [{ name: 'Run tests', status: 'in_progress' }],
      }],
    },
  });
  const result = await fetchCiHealth({ execFn, repoRoot: REPO_ROOT });
  assert.ok(!result.error);
  assert.equal(result.heavy.in_progress.length, 1, 'mac-heavy 로 분류');
  assert.ok(result.heavy.in_progress[0].running_min >= 49);
  assert.ok(result.alerts.find((a) => a.type === 'long_job'));
});

test('G-4: 대기 있지만 in_progress 0 · 20분 → runner_idle + queue_wait', async () => {
  const execFn = makeExecFn({
    'actions/runs?status=queued': {
      workflow_runs: [{
        id: 4001, name: 'CI', status: 'queued', created_at: minsAgo(20),
        head_branch: 'fix/idle', pull_requests: [],
      }],
    },
    'actions/runs?status=in_progress': { workflow_runs: [] },
    'actions/runs?status=completed': { workflow_runs: [] },
    'actions/runners': { runners: [] },
  });
  const result = await fetchCiHealth({ execFn, repoRoot: REPO_ROOT });
  assert.ok(result.alerts.find((a) => a.type === 'runner_idle'));
  assert.ok(result.alerts.find((a) => a.type === 'queue_wait'));
});

test('G-5: 모든 repo API 실패 → { error } 반환, 예외 없음', async () => {
  const execFn = async () => { throw new Error('gh: HTTP 403 Forbidden'); };
  let result;
  await assert.doesNotReject(async () => {
    result = await fetchCiHealth({ execFn, repoRoot: REPO_ROOT });
  });
  assert.ok(result.error);
  assert.ok(result.error.includes('403'));
});

// ---- H: 분류 · jsonl · 요약 · 비용 ----

test('H-1: classifyRunnerKind — labels 우선 + runner_name 보조', () => {
  assert.equal(classifyRunnerKind(['self-hosted', 'curiocity-mac']), 'mac-heavy');
  assert.equal(classifyRunnerKind(['self-hosted', 'curiocity-mac-heavy']), 'mac-heavy');
  assert.equal(classifyRunnerKind(['self-hosted', 'curiocity-mac-light']), 'mac-light');
  assert.equal(classifyRunnerKind(['ubuntu-latest']), 'cloud');
  assert.equal(classifyRunnerKind([]), 'cloud');
  assert.equal(classifyRunnerKind(null), 'cloud');
  assert.equal(
    classifyRunnerKind([{ name: 'self-hosted' }, { name: 'curiocity-mac-heavy' }]),
    'mac-heavy',
  );
  // runner_name 보조
  assert.equal(classifyRunnerKind([], 'Youngkyus-MacBook-Pro-M1'), 'mac-heavy');
  assert.equal(classifyRunnerKind([], 'gh-runner-mac-light-01'), 'mac-light');
});

test('H-2: jsonl 중복 방지 — 같은 id 두 번 append 해도 1번만', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-h-'));
  const dateStr = '2026-11-19';
  const job1 = {
    id: 9001, repo: 'test/repo', pr: 1, workflow: 'CI', job: 'build',
    runner_kind: 'mac-heavy', runner_name: 'mac-m1',
    completed_at: new Date().toISOString(), wait_min: 2, run_min: 5, conclusion: 'success',
  };
  assert.equal(appendJobs(tmpRoot, [job1], dateStr), 1);
  assert.equal(appendJobs(tmpRoot, [job1], dateStr), 0);
  assert.equal(readJsonlFile(getJsonlPath(tmpRoot, dateStr)).length, 1);
});

test('H-3: summarizeToday — jobs/avg/success_rate/run_min_total · cloud_cost_est_usd', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-s-'));
  const dateStr = '2026-11-19';
  const mk = (id, kind, wait, run, conclusion) => ({
    id, repo: 'r', pr: null, workflow: 'CI', job: 't',
    runner_kind: kind, runner_name: null,
    completed_at: new Date().toISOString(), wait_min: wait, run_min: run, conclusion,
  });
  appendJobs(tmpRoot, [
    mk(1, 'mac-heavy', 2, 10, 'success'),
    mk(2, 'mac-heavy', 4, 20, 'success'),
    mk(3, 'mac-heavy', 3, 15, 'failure'),
    mk(4, 'cloud', 1, 5, 'success'),
    mk(5, 'cloud', 1, 3, 'cancelled'),
  ], dateStr);
  const s = summarizeToday(tmpRoot, dateStr);
  assert.equal(s['mac-heavy'].jobs, 3);
  assert.equal(s['mac-heavy'].avg_run_min, 15);
  assert.ok(s['mac-heavy'].success_rate > 60 && s['mac-heavy'].success_rate < 70);
  assert.equal(s['mac-heavy'].run_min_total, 45);
  assert.equal(s.cloud.jobs, 2);
  assert.equal(s.cloud.success_rate, 50);
  // 비용 = cloud jobs: ceil(5)=5 · ceil(3)=3 → 8 × 0.008 = 0.064
  assert.ok(Math.abs(s.cloud_cost_est_usd - 0.064) < 1e-6, `cloud_cost_est_usd=${s.cloud_cost_est_usd}`);
  assert.equal(s.cloud_cost_note, CLOUD_COST_NOTE);
  assert.equal(s.wasted_min, 3);
});

test('H-4: CLOUD_COST_PER_MIN_USD 단일 상수 · calcCloudCost ceil per job', () => {
  assert.equal(CLOUD_COST_PER_MIN_USD, 0.008);
  const jobs = Array.from({ length: 10 }, (_, i) => ({
    id: 100 + i, runner_kind: 'cloud', run_min: 3.2, conclusion: 'success',
  }));
  // ceil(3.2)=4, 4*0.008=0.032, × 10 = 0.32
  assert.ok(Math.abs(calcCloudCost(jobs) - 0.32) < 1e-6);
  // mac job 은 비용 0
  assert.equal(calcCloudCost([{ id: 1, runner_kind: 'mac-heavy', run_min: 10 }]), 0);
  assert.equal(calcWastedMin([
    { id: 1, runner_kind: 'cloud', run_min: 5, conclusion: 'cancelled' },
    { id: 2, runner_kind: 'mac-heavy', run_min: 8, conclusion: 'cancelled' },
    { id: 3, runner_kind: 'cloud', run_min: 3, conclusion: 'success' },
  ]), 13);
});

// ---- I: v7.5 확장 ----

test('I-1: 스코프 — v7.5 가 status/ci/ 를 RUNNER_SCOPE_PREFIXES 에 포함', () => {
  const v75 = readFileSync(join(REPO_ROOT, 'scripts', 'hub-runner-v7.5.mjs'), 'utf8');
  const line = v75.split('\n').find((l) => l.includes('RUNNER_SCOPE_PREFIXES ='));
  assert.ok(line, 'RUNNER_SCOPE_PREFIXES 선언 라인 있어야 함');
  assert.ok(line.includes("'status/ci/'"), `status/ci/ 포함: ${line}`);
  // v7.4 와 동일 prefix 셋 중 3개는 유지.
  assert.ok(line.includes("'status/claims/'"));
  assert.ok(line.includes("'status/runners/'"));
  assert.ok(line.includes("'status/hubs.json'"));
});

test('I-2a: 백그라운드 — 동시 1개만, 두 번째 호출은 skip', async () => {
  const state = createCiBackground();
  let active = 0, maxActive = 0;
  const slowFetch = async () => {
    active++; maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, 50));
    active--;
    return { ok: true };
  };
  const r1 = maybeStartCiFetch(slowFetch, { state, deadlineMs: 500 });
  const r2 = maybeStartCiFetch(slowFetch, { state, deadlineMs: 500 });
  assert.equal(r1.started, true);
  assert.equal(r2.started, false);
  assert.equal(r2.reason, 'in-flight');
  // 완료 대기
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(maxActive, 1, '동시 실행은 최대 1');
  assert.ok(getLatestCi({ state }).data.ok);
});

test('I-2b: 백그라운드 — deadline 소프트 (error 보고 · inFlight 는 실 fetch 완료까지 유지)', async () => {
  const state = createCiBackground();
  let resolveFetch;
  const slowFetch = () => new Promise((r) => { resolveFetch = r; });
  const r = maybeStartCiFetch(slowFetch, { state, deadlineMs: 50 });
  assert.equal(r.started, true);
  await new Promise((res) => setTimeout(res, 120));
  const latest = getLatestCi({ state });
  assert.ok(latest && latest.error && latest.error.includes('deadline'),
    `deadline error 보고: ${latest && latest.error}`);
  assert.equal(isFetchInFlight({ state }), true,
    'in-flight 유지 (실 fetch 미완) — 다음 tick 과 겹침 방지');
  resolveFetch({ ok: 'late' });
  await new Promise((res) => setTimeout(res, 20));
  assert.equal(isFetchInFlight({ state }), false, '실 fetch 완료 후 in-flight 해제');
});

test('I-3: 분류 fallback — labels 비어도 runner_name 으로 mac-heavy', () => {
  // 실제 storeport 러너 이름 패턴
  assert.equal(classifyRunnerKind([], 'Youngkyus-MacBook-Pro-M1'), 'mac-heavy');
});

test('I-4: 기록 범위 — 완료 run 들의 모든 job 이 저장 (진행 중 run 밖)', async () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-r-'));
  const completedRunCreated = minsAgo(5);
  const completedJobDone = minsAgo(2);
  const execFn = makeExecFn({
    'actions/runs?status=queued': { workflow_runs: [] },
    'actions/runs?status=in_progress': { workflow_runs: [] },
    'actions/runs?status=completed': {
      workflow_runs: [{
        id: 5001, name: 'CI', status: 'completed',
        created_at: completedRunCreated,
        pull_requests: [{ number: 7 }],
        repository: { full_name: 'CuriocityDevAi/storeport' },
      }],
    },
    'actions/runs/5001/jobs': {
      jobs: [
        {
          id: 6001, name: 'typecheck', status: 'completed',
          labels: ['self-hosted', 'curiocity-mac'],
          runner_name: 'youngs-mac',
          created_at: completedRunCreated, started_at: completedRunCreated,
          completed_at: completedJobDone, conclusion: 'success',
        },
        {
          id: 6002, name: 'lint', status: 'completed',
          labels: ['ubuntu-latest'], runner_name: 'GitHub Actions 42',
          created_at: completedRunCreated, started_at: completedRunCreated,
          completed_at: completedJobDone, conclusion: 'success',
        },
      ],
    },
    'actions/runners': { runners: [] },
  });
  const result = await fetchCiHealth({ execFn, repoRoot: tmpRoot });
  assert.ok(!result.error, `error=${result.error}`);
  assert.ok(result.jsonl_added >= 2, `jsonl_added=${result.jsonl_added}`);
  const dateStr = getWibDateStr(new Date(completedJobDone));
  const records = readJsonlFile(getJsonlPath(tmpRoot, dateStr));
  assert.equal(records.length, 2);
  const heavy = records.find((r) => r.job === 'typecheck');
  const cloud = records.find((r) => r.job === 'lint');
  assert.equal(heavy.runner_kind, 'mac-heavy');
  assert.equal(cloud.runner_kind, 'cloud');
  // wait_min = job.created_at → started_at (여기서 동일 → 0)
  assert.equal(heavy.wait_min, 0);
});

test('I-5: WIB 날짜 라우팅 — job.completed_at 의 WIB 로 파일 라우팅', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-w-'));
  // 두 job: 서로 다른 WIB 날짜 (17:30 UTC = 2026-11-19 00:30 WIB · 16:00 UTC = 2026-11-18 23:00 WIB)
  const jobA = { id: 7001, runner_kind: 'cloud', run_min: 1, conclusion: 'success',
    completed_at: '2026-11-19T17:30:00Z' }; // WIB = 2026-11-20 00:30
  const jobB = { id: 7002, runner_kind: 'cloud', run_min: 1, conclusion: 'success',
    completed_at: '2026-11-19T16:00:00Z' }; // WIB = 2026-11-19 23:00
  appendJobs(tmpRoot, [jobA, jobB]); // dateStr 없음 → per-job 라우팅
  const dateA = getWibDateStr(new Date(jobA.completed_at));
  const dateB = getWibDateStr(new Date(jobB.completed_at));
  assert.notEqual(dateA, dateB, '두 job 이 서로 다른 WIB 날짜');
  assert.equal(readJsonlFile(getJsonlPath(tmpRoot, dateA)).length, 1);
  assert.equal(readJsonlFile(getJsonlPath(tmpRoot, dateB)).length, 1);
});

test('I-5b: getWibDateStr 는 local tz 와 무관하게 UTC+7', () => {
  // 2026-11-19T00:00:00Z → WIB 07:00 → date = 2026-11-19
  assert.equal(getWibDateStr(new Date('2026-11-19T00:00:00Z')), '2026-11-19');
  // 2026-11-19T17:30:00Z → WIB +7 = 2026-11-20 00:30 → 2026-11-20
  assert.equal(getWibDateStr(new Date('2026-11-19T17:30:00Z')), '2026-11-20');
  // 2026-11-19T16:59:59Z → WIB = 23:59:59 → 2026-11-19
  assert.equal(getWibDateStr(new Date('2026-11-19T16:59:59Z')), '2026-11-19');
});

test('I-6: suspect_done — 기록만 (threshold 미만/초과)', () => {
  const now = Date.now();
  const latestClaim = (h) => ({
    m0: { id: 'M0-TEST-A', state: 'started', at: new Date(now - 20 * 60_000).toISOString() },
    m1: { id: 'M1-TEST-B', state: 'started', at: new Date(now - 5 * 60_000).toISOString() },
    m2: { id: 'M2-TEST-C', state: 'done',    at: new Date(now - 30 * 60_000).toISOString() },
    m3: { id: 'M3-TEST-D', state: 'started', at: new Date(now - 60 * 60_000).toISOString() },
  }[h] || null);
  const exists = (id) => id === 'M0-TEST-A' || id === 'M3-TEST-D' || id === 'M1-TEST-B';
  const out = computeSuspectDone({
    hubs: ['m0', 'm1', 'm2', 'm3'],
    latestClaim,
    reportExists: exists,
    now,
  });
  // m0: started + report + 20분 > 15분 → suspect
  assert.ok(out.m0, 'm0 suspect');
  assert.equal(out.m0.id, 'M0-TEST-A');
  // m1: 5분 < 15분 → 없음
  assert.ok(!out.m1);
  // m2: done 상태 → 없음
  assert.ok(!out.m2);
  // m3: started + report + 60분 > 15분 → suspect
  assert.ok(out.m3);
});

test('I-6b: suspect_done — report 없으면 없음 · 15분 경계', () => {
  const now = Date.now();
  const latestClaim = () => ({
    id: 'X-1', state: 'started', at: new Date(now - 14 * 60_000).toISOString(),
  });
  // report 없음 → 없음
  assert.deepEqual(computeSuspectDone({
    hubs: ['m0'], latestClaim, reportExists: () => false, now,
  }), {});
  // 14분 (미만) → 없음
  assert.deepEqual(computeSuspectDone({
    hubs: ['m0'], latestClaim, reportExists: () => true, now,
  }), {});
  // 15분 정확히 → suspect
  const latest2 = () => ({ id: 'Y-1', state: 'started',
    at: new Date(now - SUSPECT_DONE_THRESHOLD_MS).toISOString() });
  const out = computeSuspectDone({ hubs: ['m0'], latestClaim: latest2, reportExists: () => true, now });
  assert.ok(out.m0, '15분 경계에서 suspect');
});

test('I-7: safePull 재현 — scope 안이면 out-of-scope 미해당 (텍스트 검증)', () => {
  // v7.5 의 outOfScopeChanges 함수는 RUNNER_SCOPE_PREFIXES 를 소스로 쓰므로
  // RUNNER_SCOPE_PREFIXES 에 status/ci/ 가 있으면 jsonl 변경은 out-of-scope 아님.
  const src = readFileSync(join(REPO_ROOT, 'scripts', 'hub-runner-v7.5.mjs'), 'utf8');
  const i1 = src.indexOf('RUNNER_SCOPE_PREFIXES = [');
  const i2 = src.indexOf('];', i1);
  assert.ok(i1 !== -1 && i2 !== -1);
  const arr = src.slice(i1, i2 + 2);
  assert.ok(arr.includes("'status/ci/'"));
  // outOfScopeChanges 호출 사이트 그대로 유지 (safePull 내부)
  assert.ok(src.includes('outOfScopeChanges'), 'outOfScopeChanges 유지');
});

test('I-8: jobToRecord — labels 로 분류 · wait=created→started', () => {
  const job = {
    id: 999, name: 'build', status: 'completed',
    labels: ['self-hosted', 'curiocity-mac'], runner_name: 'youngs-mac',
    created_at: '2026-11-19T10:00:00Z',
    started_at: '2026-11-19T10:03:00Z',
    completed_at: '2026-11-19T10:15:00Z',
    conclusion: 'success',
  };
  const run = { pull_requests: [{ number: 123 }], name: 'CI',
    repository: { full_name: 'CuriocityDevAi/storeport' } };
  const rec = jobToRecord(job, run);
  assert.equal(rec.runner_kind, 'mac-heavy');
  assert.equal(rec.wait_min, 3);
  assert.equal(rec.run_min, 12);
  assert.equal(rec.pr, 123);
  assert.equal(rec.repo, 'CuriocityDevAi/storeport');
});

test('I-9: getWibDayBoundary — WIB 자정의 UTC', () => {
  // 2026-11-19T10:00:00Z (WIB 17:00) → WIB 오늘 자정 = 2026-11-19T00:00 WIB = 2026-11-18T17:00Z
  const b = getWibDayBoundary(new Date('2026-11-19T10:00:00Z'));
  assert.equal(b.toISOString(), '2026-11-18T17:00:00.000Z');
});

// ---- J: M0-1119-J — 간격 · 캐시 · 겹침 0 · /tmp · fork 스킵 · budget ----

test('J-1: fireCi minIntervalMs 가드 — 5분 미만 재호출은 min-interval 로 skip', async () => {
  const state = createCiBackground();
  const fast = async () => ({ ok: 1 });
  const r1 = maybeStartCiFetch(fast, { state, deadlineMs: 500, minIntervalMs: 5 * 60_000 });
  assert.equal(r1.started, true);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(isFetchInFlight({ state }), false);
  const r2 = maybeStartCiFetch(fast, { state, deadlineMs: 500, minIntervalMs: 5 * 60_000 });
  assert.equal(r2.started, false, '5분 지나지 않으면 start 금지');
  assert.equal(r2.reason, 'min-interval');
});

test('J-1b: fireCi minIntervalMs=0 이면 간격 가드 off', async () => {
  const state = createCiBackground();
  const fast = async () => ({ ok: 1 });
  maybeStartCiFetch(fast, { state, deadlineMs: 500 });
  await new Promise((r) => setTimeout(r, 30));
  const r2 = maybeStartCiFetch(fast, { state, deadlineMs: 500 });
  assert.equal(r2.started, true, 'minIntervalMs 미지정 → gate off');
});

test('J-1c: hub-runner-v7.5 소스에 CI_MIN_FIRE_INTERVAL_MS=5분 상수 선언', () => {
  const src = readFileSync(join(REPO_ROOT, 'scripts', 'hub-runner-v7.5.mjs'), 'utf8');
  assert.ok(src.includes('CI_MIN_FIRE_INTERVAL_MS'), '상수 선언 있음');
  assert.ok(/CI_MIN_FIRE_INTERVAL_MS\s*=\s*5\s*\*\s*60_?000/.test(src),
    '값 = 5 * 60_000 (5분)');
  assert.ok(src.includes('minIntervalMs: CI_MIN_FIRE_INTERVAL_MS'),
    'fireCi 가 maybeStartCiFetch 에 minIntervalMs 전달');
});

test('J-2: completed run id 메모리 캐시 — 같은 run 두 번째 조회는 jobs 호출 안 함', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-cache-'));
  const completedAt = minsAgo(2);
  const createdAt = minsAgo(5);
  let jobsCalls = 0;
  const responses = {
    'actions/runs?status=queued': { workflow_runs: [] },
    'actions/runs?status=in_progress': { workflow_runs: [] },
    'actions/runs?status=completed': {
      workflow_runs: [{
        id: 8001, name: 'CI', status: 'completed',
        created_at: createdAt, updated_at: completedAt,
        pull_requests: [{ number: 55 }],
        repository: { full_name: 'CuriocityDevAi/storeport' },
      }],
    },
    'actions/runs/8001/jobs': {
      jobs: [{
        id: 9001, name: 'lint', status: 'completed',
        labels: ['ubuntu-latest'],
        created_at: createdAt, started_at: createdAt, completed_at: completedAt,
        conclusion: 'success',
      }],
    },
    'actions/runners': { runners: [] },
  };
  const execFn = async (endpoint) => {
    if (!endpoint.includes(MAIN_REPO)) {
      if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
      if (endpoint.includes('actions/runners')) return { runners: [] };
      return {};
    }
    if (endpoint.includes('/jobs')) jobsCalls++;
    for (const [key, val] of Object.entries(responses)) {
      if (endpoint.includes(key)) return val;
    }
    throw new Error(`no mock: ${endpoint}`);
  };
  const r1 = await fetchCiHealth({ execFn, repoRoot: tmpRoot });
  assert.ok(!r1.error, `r1 error: ${r1.error}`);
  const jobsCallsAfter1 = jobsCalls;
  assert.ok(jobsCallsAfter1 >= 1, 'first run 은 jobs 호출');
  const r2 = await fetchCiHealth({ execFn, repoRoot: tmpRoot });
  assert.ok(!r2.error, `r2 error: ${r2.error}`);
  assert.equal(jobsCalls, jobsCallsAfter1,
    `두 번째 호출은 같은 completed run 재조회 안 함 (jobs 호출 추가 0)`);
});

test('J-3: 겹침 0 — deadline 후에도 inFlight 유지 → 다음 start 는 in-flight skip', async () => {
  const state = createCiBackground();
  let active = 0, maxActive = 0;
  const hangTillExternal = () => new Promise((resolve) => {
    active++; maxActive = Math.max(maxActive, active);
    setTimeout(() => { active--; resolve({ ok: 1 }); }, 200);
  });
  const r1 = maybeStartCiFetch(hangTillExternal, { state, deadlineMs: 50 });
  assert.equal(r1.started, true);
  await new Promise((res) => setTimeout(res, 80));
  const r2 = maybeStartCiFetch(hangTillExternal, { state, deadlineMs: 50 });
  assert.equal(r2.started, false, 'deadline 지나도 in-flight → 두 번째 start 금지');
  assert.equal(r2.reason, 'in-flight');
  await new Promise((res) => setTimeout(res, 200));
  assert.equal(maxActive, 1, '동시 실행 최대 1 (겹침 0)');
  assert.equal(isFetchInFlight({ state }), false);
});

test('J-4: suspect_done TMP_DIR 는 리터럴 /tmp (os.tmpdir 영향 없음)', () => {
  assert.equal(SUSPECT_DONE_TMP_DIR, '/tmp');
  const src = readFileSync(join(REPO_ROOT, 'scripts', 'lib', 'ci-suspect.mjs'), 'utf8');
  assert.ok(!src.includes("tmpdir()"), 'tmpdir() 호출 제거');
  assert.ok(src.includes("'/tmp'"), '/tmp 리터럴 사용');
});

test('J-5: fork 404 → repoDailySkip + 1회 경고', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-fork-'));
  const warned = [];
  const execFn = async (endpoint) => {
    if (endpoint.includes('agilo-medusa-pos-fork')) {
      throw new Error('gh: HTTP 404 Not Found (repos/CuriocityDevAi/agilo-medusa-pos-fork/...)');
    }
    if (endpoint.includes('actions/runs')) return { workflow_runs: [] };
    if (endpoint.includes('actions/runners')) return { runners: [] };
    return {};
  };
  const r1 = await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: ['CuriocityDevAi/storeport', 'CuriocityDevAi/agilo-medusa-pos-fork'],
    warn: (m) => warned.push(m),
  });
  assert.ok(!r1.error);
  assert.ok(r1.repos_skipped.find((s) => s.repo === 'CuriocityDevAi/agilo-medusa-pos-fork'),
    'fork 는 skipped 목록에');
  assert.equal(warned.length, 1, '첫 접근에 1회 경고');
  const r2 = await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: ['CuriocityDevAi/storeport', 'CuriocityDevAi/agilo-medusa-pos-fork'],
    warn: (m) => warned.push(m),
  });
  assert.ok(!r2.error);
  assert.equal(warned.length, 1, '같은 날 재조회에도 경고 중복 발행 안 함');
});

test('J-5b: DEFAULT_REPOS 에 fork = CuriocityDevAi/agilo-medusa-pos-fork', () => {
  const src = readFileSync(join(REPO_ROOT, 'scripts', 'lib', 'ci-health.mjs'), 'utf8');
  assert.ok(src.includes("'CuriocityDevAi/agilo-medusa-pos-fork'"), 'fork 지정 확인');
  assert.ok(!src.includes("'KyuuuLee/storeport'"), '옛 fork 추측값 제거');
});

test('J-6: API 호출 상한 — overflow 시 api_overflow:true, 예외 없음', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-bud-'));
  let calls = 0;
  const execFn = async () => {
    calls++;
    if (calls <= 2) return { workflow_runs: [] };
    return { workflow_runs: [], runners: [] };
  };
  const r = await fetchCiHealth({
    execFn, repoRoot: tmpRoot, apiBudget: 2,
    repos: ['CuriocityDevAi/storeport'],
  });
  assert.ok(!r.error, `error: ${r.error}`);
  assert.ok(r.api_calls <= 2, `api_calls ${r.api_calls} <= budget 2`);
  assert.equal(r.api_overflow, true, 'budget 소진 플래그');
});

test('J-7: updated=>= 로 URL 쿼리 filter (오래 걸린 run 누락 방지)', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-upd-'));
  const seenEndpoints = [];
  const execFn = async (endpoint) => {
    seenEndpoints.push(endpoint);
    if (endpoint.includes('actions/runners')) return { runners: [] };
    return { workflow_runs: [] };
  };
  await fetchCiHealth({
    execFn, repoRoot: tmpRoot,
    repos: ['CuriocityDevAi/storeport'],
  });
  const completedEp = seenEndpoints.find((e) => e.includes('status=completed'));
  assert.ok(completedEp, 'completed runs 조회 있음');
  assert.ok(completedEp.includes('updated'), `updated 파라미터 있음: ${completedEp}`);
  assert.ok(!completedEp.includes('created='), 'created 파라미터 제거됨');
});

test('J-8: queued run 분류 — jobs 의 labels=curiocity-mac-light → lightQueued', async () => {
  _resetCiHealthCache();
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-qj-'));
  const execFn = makeExecFn({
    'actions/runs?status=queued': {
      workflow_runs: [{
        id: 12001, name: 'CI', status: 'queued', created_at: minsAgo(3),
        head_branch: 'feat/light', pull_requests: [{ number: 77 }],
      }],
    },
    'actions/runs?status=in_progress': { workflow_runs: [] },
    'actions/runs?status=completed': { workflow_runs: [] },
    'actions/runs/12001/jobs': {
      jobs: [{
        id: 13001, name: 'lint', status: 'queued',
        labels: ['self-hosted', 'curiocity-mac-light'], runner_name: null,
        created_at: minsAgo(3), started_at: null, completed_at: null,
      }],
    },
    'actions/runners': { runners: [] },
  });
  const r = await fetchCiHealth({ execFn, repoRoot: tmpRoot });
  assert.ok(!r.error, `error: ${r.error}`);
  assert.equal(r.light.queued, 1, 'light queued 로 분류');
  assert.equal(r.heavy.queued, 0, 'heavy queued 비어있음');
});
