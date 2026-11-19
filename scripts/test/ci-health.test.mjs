// scripts/test/ci-health.test.mjs · M0-1119-G — ci-health.mjs 단위 테스트
// 케이스: 정상(알림 없음) · heavy 대기 1시간 · job 50분 · runner idle · API 실패
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchCiHealth } from '../lib/ci-health.mjs';

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
