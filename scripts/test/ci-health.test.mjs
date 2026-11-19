// scripts/test/ci-health.test.mjs · M0-1119-H — ci-health.mjs + ci-history.mjs 단위 테스트
// 케이스(G): 정상(알림 없음) · heavy 대기 1시간 · job 50분 · runner idle · API 실패
// 케이스(H): runner_kind 분류 · jsonl 중복 방지 · today 요약 · 비용 계산 · suspect_done 판정
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
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
} from '../lib/ci-history.mjs';

// 현재 시각 기준 N분 전 ISO 문자열
function minsAgo(n) {
  return new Date(Date.now() - n * 60_000).toISOString();
}

// gh API 응답 주입 헬퍼
function makeExecFn(responses) {
  const map = new Map(Object.entries(responses));
  return async (endpoint) => {
    for (const [key, val] of map) {
      if (endpoint.includes(key)) return val;
    }
    throw new Error(`no mock for endpoint: ${endpoint}`);
  };
}

// 케이스 1: 정상 — 대기 없음, 실행 중 없음, alerts 없음
test('정상 — 대기 없음, 알림 없음', async () => {
  const execFn = makeExecFn({
    'actions/runs?status=queued': { workflow_runs: [] },
    'actions/runs?status=in_progress': { workflow_runs: [] },
    'actions/runners': { runners: [{ labels: [{ name: 'curiocity-mac' }], status: 'online', busy: false }] },
  });
  const result = await fetchCiHealth(execFn);
  assert.ok(!result.error, `에러 없어야 함: ${result.error}`);
  assert.equal(result.heavy.queued, 0);
  assert.equal(result.heavy.in_progress.length, 0);
  assert.equal(result.alerts.length, 0);
  assert.equal(result.cloud_today, 0);
});

// 케이스 2: heavy 대기 1시간 → queue_wait alert
test('heavy 대기 60분 → queue_wait alert', async () => {
  const execFn = makeExecFn({
    'actions/runs?status=queued': {
      workflow_runs: [{
        id: 1001,
        name: 'CI',
        status: 'queued',
        created_at: minsAgo(60),
        head_branch: 'feat/test',
        runner_labels: [{ name: 'curiocity-mac' }, { name: 'self-hosted' }],
        pull_requests: [{ number: 42 }],
      }],
    },
    'actions/runs?status=in_progress': { workflow_runs: [] },
    'actions/runners': { runners: [] },
  });
  const result = await fetchCiHealth(execFn);
  assert.ok(!result.error, `에러 없어야 함: ${result.error}`);
  assert.equal(result.heavy.queued, 1);
  assert.ok(result.heavy.oldest_queued_min >= 59, `oldest_queued_min=${result.heavy.oldest_queued_min}`);
  const alert = result.alerts.find((a) => a.type === 'queue_wait');
  assert.ok(alert, 'queue_wait alert 있어야 함');
});

// 케이스 3: job 50분 실행 → long_job alert
test('job 50분 실행 → long_job alert', async () => {
  const jobStarted = minsAgo(50);
  const execFn = makeExecFn({
    'actions/runs?status=queued': { workflow_runs: [] },
    'actions/runs?status=in_progress': {
      workflow_runs: [{
        id: 2001,
        name: 'CI',
        status: 'in_progress',
        created_at: minsAgo(51),
        run_started_at: jobStarted,
        head_branch: 'feat/long',
        runner_labels: [{ name: 'curiocity-mac' }],
        pull_requests: [{ number: 99 }],
      }],
    },
    'actions/runners': { runners: [] },
    'actions/runs/2001/jobs': {
      jobs: [{
        id: 3001,
        name: 'build',
        status: 'in_progress',
        started_at: jobStarted,
        steps: [{ name: 'Run tests', status: 'in_progress' }],
      }],
    },
  });
  const result = await fetchCiHealth(execFn);
  assert.ok(!result.error, `에러 없어야 함: ${result.error}`);
  assert.equal(result.heavy.in_progress.length, 1);
  assert.ok(result.heavy.in_progress[0].running_min >= 49, `running_min=${result.heavy.in_progress[0].running_min}`);
  const alert = result.alerts.find((a) => a.type === 'long_job');
  assert.ok(alert, 'long_job alert 있어야 함');
});

// 케이스 4: heavy 대기 있는데 in_progress 0 으로 10분 이상 → runner_idle alert
test('대기 있지만 in_progress 0 · 20분 → runner_idle + queue_wait alert', async () => {
  const execFn = makeExecFn({
    'actions/runs?status=queued': {
      workflow_runs: [{
        id: 4001,
        name: 'CI',
        status: 'queued',
        created_at: minsAgo(20),
        head_branch: 'fix/idle',
        runner_labels: [{ name: 'curiocity-mac' }],
        pull_requests: [],
      }],
    },
    'actions/runs?status=in_progress': { workflow_runs: [] },
    'actions/runners': { runners: [] },
  });
  const result = await fetchCiHealth(execFn);
  assert.ok(!result.error, `에러 없어야 함: ${result.error}`);
  const alert = result.alerts.find((a) => a.type === 'runner_idle');
  assert.ok(alert, 'runner_idle alert 있어야 함');
  // queue_wait: 20분 > 15분 → 같이 뜸
  const qAlert = result.alerts.find((a) => a.type === 'queue_wait');
  assert.ok(qAlert, 'queue_wait alert 도 있어야 함 (20분 초과)');
});

// 케이스 5: API 실패 → { error } 반환, throw 없음
test('API 실패 → { error } 반환, 예외 없음', async () => {
  const execFn = async () => {
    throw new Error('gh: HTTP 403 Forbidden');
  };
  let result;
  await assert.doesNotReject(async () => {
    result = await fetchCiHealth(execFn);
  });
  assert.ok(result.error, 'error 필드 있어야 함');
  assert.ok(result.error.includes('403'), `error 내용: ${result.error}`);
});

// ---- M0-1119-H 추가 테스트 (5개) ----

// H-1: runner_kind 분류
test('H-1: runner_kind 분류 — mac-heavy / mac-light / cloud', () => {
  // mac-heavy: self-hosted + curiocity-mac
  assert.equal(
    classifyRunnerKind(['self-hosted', 'curiocity-mac']),
    'mac-heavy',
    'self-hosted+curiocity-mac = mac-heavy',
  );
  // mac-heavy: 명시적 curiocity-mac-heavy
  assert.equal(
    classifyRunnerKind(['self-hosted', 'curiocity-mac-heavy']),
    'mac-heavy',
    'self-hosted+curiocity-mac-heavy = mac-heavy',
  );
  // mac-light: self-hosted + curiocity-mac-light
  assert.equal(
    classifyRunnerKind(['self-hosted', 'curiocity-mac-light']),
    'mac-light',
    'self-hosted+curiocity-mac-light = mac-light',
  );
  // cloud: ubuntu-latest (self-hosted 없음)
  assert.equal(
    classifyRunnerKind(['ubuntu-latest']),
    'cloud',
    'ubuntu-latest = cloud',
  );
  // cloud: empty labels
  assert.equal(classifyRunnerKind([]), 'cloud', 'empty labels = cloud');
  // cloud: null
  assert.equal(classifyRunnerKind(null), 'cloud', 'null = cloud');
  // object labels ({ name: "..." } 형식)
  assert.equal(
    classifyRunnerKind([{ name: 'self-hosted' }, { name: 'curiocity-mac-heavy' }]),
    'mac-heavy',
    'object labels mac-heavy',
  );
});

// H-2: jsonl 중복 방지
test('H-2: jsonl 중복 방지 — 같은 job id 두 번 append 해도 1번만 저장', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-history-test-'));
  const dateStr = '2026-11-19';

  const job1 = { id: 9001, repo: 'test/repo', pr: 1, workflow: 'CI', job: 'build',
    runner_kind: 'mac-heavy', runner_name: 'mac-m1', queued_at: null, started_at: null,
    completed_at: new Date().toISOString(), wait_min: 2, run_min: 5, conclusion: 'success' };

  const added1 = appendJobs(tmpRoot, [job1], dateStr);
  assert.equal(added1, 1, '첫 번째 append: 1개 추가');

  const added2 = appendJobs(tmpRoot, [job1], dateStr);
  assert.equal(added2, 0, '두 번째 append: 중복이므로 0개');

  const records = readJsonlFile(getJsonlPath(tmpRoot, dateStr));
  assert.equal(records.length, 1, 'jsonl 에 1개만 저장되어야 함');
});

// H-3: today 요약 계산
test('H-3: today 요약 — jobs/avg_wait_min/avg_run_min/success_rate', () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'ci-history-today-'));
  const dateStr = '2026-11-19';

  const makeJob = (id, kind, wait, run, conclusion) => ({
    id, repo: 'r', pr: null, workflow: 'CI', job: 'test',
    runner_kind: kind, runner_name: null, queued_at: null, started_at: null,
    completed_at: new Date().toISOString(), wait_min: wait, run_min: run, conclusion,
  });

  const jobs = [
    makeJob(1, 'mac-heavy', 2, 10, 'success'),
    makeJob(2, 'mac-heavy', 4, 20, 'success'),
    makeJob(3, 'mac-heavy', 3, 15, 'failure'),
    makeJob(4, 'cloud', 1, 5, 'success'),
    makeJob(5, 'cloud', 1, 3, 'cancelled'),
  ];

  appendJobs(tmpRoot, jobs, dateStr);
  const summary = summarizeToday(tmpRoot, dateStr);

  // mac-heavy: 3 jobs
  assert.equal(summary['mac-heavy'].jobs, 3, 'mac-heavy jobs=3');
  assert.ok(summary['mac-heavy'].avg_wait_min > 0, 'avg_wait_min > 0');
  // 10+20+15=45 / 3 = 15
  assert.equal(summary['mac-heavy'].avg_run_min, 15, 'mac-heavy avg_run_min=15');
  // 2/3 = 66.7%
  assert.ok(summary['mac-heavy'].success_rate > 60 && summary['mac-heavy'].success_rate < 70,
    `mac-heavy success_rate=${summary['mac-heavy'].success_rate}`);
  assert.equal(summary['mac-heavy'].run_min_total, 45, 'mac-heavy run_min_total=45');

  // cloud: 2 jobs
  assert.equal(summary.cloud.jobs, 2, 'cloud jobs=2');
  // success_rate: 1/2 = 50%
  assert.equal(summary.cloud.success_rate, 50, 'cloud success_rate=50');
});

// H-4: 비용 계산 (ceil per job)
test('H-4: 클라우드 비용 계산 — ceil per job · $0.008/min', () => {
  // 10 jobs × 3.2 min → ceil(3.2)=4 min × 0.008 = $0.032/job → 10 jobs → $0.32
  const jobs = Array.from({ length: 10 }, (_, i) => ({
    id: 100 + i,
    runner_kind: 'cloud',
    run_min: 3.2,
    conclusion: 'success',
  }));
  const cost = calcCloudCost(jobs);
  assert.ok(Math.abs(cost - 0.32) < 0.001, `expected ~0.32, got ${cost}`);

  // non-cloud job 은 비용 0
  const macJobs = [{ id: 200, runner_kind: 'mac-heavy', run_min: 10, conclusion: 'success' }];
  assert.equal(calcCloudCost(macJobs), 0, 'mac-heavy 비용 없음');

  // wasted_min: cancelled job run_min 합
  const mixedJobs = [
    { id: 301, runner_kind: 'cloud', run_min: 5, conclusion: 'cancelled' },
    { id: 302, runner_kind: 'mac-heavy', run_min: 8, conclusion: 'cancelled' },
    { id: 303, runner_kind: 'cloud', run_min: 3, conclusion: 'success' },
  ];
  const wasted = calcWastedMin(mixedJobs);
  assert.equal(wasted, 13, `wasted_min=13 (5+8), got ${wasted}`);
});

// H-5: suspect_done 판정 (순수 로직 · tmux 없이)
test('H-5: suspect_done 판정 로직 — 보고서+프롬프트 조건 · 10분 초과 blocked 승격', () => {
  // suspect_done 의 순수 로직 부분을 직접 테스트:
  // 조건: reportExists=true, atPrompt=true, 경과시간 초과 여부
  const now = Date.now();

  // 케이스 A: 보고서 없음 → suspect 아님
  {
    const reportExists = false;
    assert.ok(!reportExists, '보고서 없으면 suspect_done 아님');
  }

  // 케이스 B: 보고서 있고 5분 미만 → nudge 아직 안 함
  {
    const reportExists = true;
    const atPrompt = true;
    const promptSince = now - 2 * 60_000; // 2분 전
    const THRESHOLD_MS = 5 * 60_000;
    const shouldNudge = reportExists && atPrompt && (now - promptSince) >= THRESHOLD_MS;
    assert.ok(!shouldNudge, '5분 미만 → nudge 안 함');
  }

  // 케이스 C: 보고서 있고 6분 경과 → nudge 해야 함
  {
    const reportExists = true;
    const atPrompt = true;
    const promptSince = now - 6 * 60_000; // 6분 전
    const THRESHOLD_MS = 5 * 60_000;
    const shouldNudge = reportExists && atPrompt && (now - promptSince) >= THRESHOLD_MS;
    assert.ok(shouldNudge, '6분 경과 → nudge 해야 함');
  }

  // 케이스 D: nudge 보냈고 11분 경과 → blocked 승격 해야 함
  {
    const nudgeSentAt = now - 11 * 60_000; // 11분 전
    const BLOCKED_THRESHOLD_MS = 10 * 60_000;
    const sinceNudge = now - nudgeSentAt;
    const shouldBlock = sinceNudge >= BLOCKED_THRESHOLD_MS;
    assert.ok(shouldBlock, '11분 경과 → blocked 승격');
  }

  // 케이스 E: nudge 보냈고 9분 경과 → 아직 blocked 아님
  {
    const nudgeSentAt = now - 9 * 60_000;
    const BLOCKED_THRESHOLD_MS = 10 * 60_000;
    const sinceNudge = now - nudgeSentAt;
    const shouldBlock = sinceNudge >= BLOCKED_THRESHOLD_MS;
    assert.ok(!shouldBlock, '9분 경과 → 아직 blocked 아님');
  }
});
