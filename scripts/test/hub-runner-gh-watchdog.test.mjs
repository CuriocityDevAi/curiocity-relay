// scripts/test/hub-runner-gh-watchdog.test.mjs · M0-1119-T — gh-runner-watchdog 단위 테스트.
//
// 커버리지 ([REQ] 1~4):
//   T1  judgeStuck — queued>0 & in_progress=0 & oldest_queued_min>=N → stuck.
//   T2  judgeStuck — in_progress 하나라도 있으면 stuck=false (job 보호).
//   T3  judgeStuck — queued=0 → stuck=false.
//   T4  judgeStuck — ciData=null → stuck=false (no-ci-data).
//   T5  runOnce — stuck 판정 시 execFn 호출 · lastRestartAt 기록 · jsonl 기록.
//   T6  runOnce — cooldown 30분 안이면 execFn 호출 안 함.
//   T7  runOnce — cooldown 지나고 여전히 stuck → consec++ → 재시도.
//   T8  runOnce — 2회 연속 실패 → max-failures · alert 기록 · 이후 execFn 호출 안 함.
//   T9  runOnce — execFn throw 시 consec++ · 2회 exec 실패 → alert.
//   T10 runOnce — stuck 아니면 execFn 호출 안 함 (job 보호 포함).
//   T11 runOnce — 재시작 성공(다음 회차 not stuck) → consec/alert 모두 reset.
//   T12 runOnce — 설정 runnerPaths 의 경로가 그대로 execFn 에 전달.
//   T13 withinCooldown — 경계값.
// M0-1119-U 추가 ([REQ] 1~3):
//   T14 runOnce — ci.partial=true → 재시작 통째 skip · exec 0.
//   T15 runOnce — repos_failed.length>0 → skip · exec 0.
//   T16 runOnce — ci.at 이 6분보다 오래됨 → skip · exec 0.
//   T17 runOnce — stop 직전 Runner.Worker alive → skip · exec 0.
//   T18 isDataIncomplete — ciData null · partial · repos_failed · stale · 정상 5경우.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  judgeStuck,
  runOnce,
  withinCooldown,
  isDataIncomplete,
  hasRunningWorker,
  DEFAULT_STUCK_THRESHOLD_MIN,
  DEFAULT_COOLDOWN_MS,
  DEFAULT_STALE_CACHE_MS,
  _resetGhRunnerWatchdog,
} from '../lib/gh-runner-watchdog.mjs';

function makeCiData(overrides = {}) {
  return {
    heavy: {
      queued: 0,
      queued_prs: [],
      oldest_queued_min: null,
      oldest_queued_pr: null,
      in_progress: [],
    },
    light: {
      queued: 0,
      oldest_queued_min: null,
      oldest_queued_pr: null,
      in_progress: [],
    },
    ...overrides,
  };
}

function tmp() {
  return mkdtempSync(join(tmpdir(), 'gh-watchdog-'));
}

function withEnv() {
  const root = tmp();
  const stateFile = join(root, '.cache', 'gh-runner-watchdog-state.json');
  const execCalls = [];
  const execFn = async (svc, timeout) => { execCalls.push({ svc, timeout }); };
  const records = [];
  const recordFn = (rec) => { records.push(rec); };
  const runnerPaths = { 'mac-heavy': '/svc-heavy', 'mac-light': '/svc-light' };
  // M0-1119-U: 기본은 "worker 없음" — 실 pgrep 호출 방지 (test 머신에 actions-runner 가 있어도 안전).
  const workerCheckFn = async () => false;
  return { root, stateFile, execCalls, execFn, records, recordFn, runnerPaths, workerCheckFn };
}

test('T1: judgeStuck — queued>0 · in_progress=0 · oldest>=N → stuck', () => {
  const ci = makeCiData({
    heavy: { queued: 3, oldest_queued_min: 12, oldest_queued_pr: '#401', in_progress: [] },
  });
  const r = judgeStuck(ci, 'mac-heavy');
  assert.equal(r.stuck, true);
  assert.equal(r.queued, 3);
  assert.equal(r.oldest_queued_min, 12);
});

test('T2: judgeStuck — in_progress 하나라도 있으면 not stuck (job 보호)', () => {
  const ci = makeCiData({
    heavy: { queued: 3, oldest_queued_min: 12, in_progress: [{ job: 'x' }] },
  });
  const r = judgeStuck(ci, 'mac-heavy');
  assert.equal(r.stuck, false);
  assert.equal(r.reason, 'job-running');
});

test('T3: judgeStuck — queued=0 → not stuck', () => {
  const ci = makeCiData({
    heavy: { queued: 0, oldest_queued_min: null, in_progress: [] },
  });
  const r = judgeStuck(ci, 'mac-heavy');
  assert.equal(r.stuck, false);
  assert.equal(r.reason, 'no-queue');
});

test('T4: judgeStuck — ciData null → not stuck', () => {
  const r = judgeStuck(null, 'mac-heavy');
  assert.equal(r.stuck, false);
  assert.equal(r.reason, 'no-ci-data');
});

test('T4b: judgeStuck — oldest_queued_min < threshold → not stuck', () => {
  const ci = makeCiData({
    heavy: { queued: 2, oldest_queued_min: 4, in_progress: [] },
  });
  const r = judgeStuck(ci, 'mac-heavy', { thresholdMin: 8 });
  assert.equal(r.stuck, false);
  assert.equal(r.reason, 'below-threshold');
});

test('T5: runOnce — stuck 판정시 execFn 호출 + jsonl 기록 + state 기록', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const ciData = makeCiData({
    heavy: { queued: 3, oldest_queued_min: 20, oldest_queued_pr: 'repo:#1', in_progress: [] },
  });
  const now = 1_000_000;
  const res = await runOnce({
    ciData,
    repoRoot: env.root,
    runnerPaths: env.runnerPaths,
    stateFile: env.stateFile,
    execFn: env.execFn,
    workerCheckFn: env.workerCheckFn,
    recordFn: env.recordFn,
    now,
  });
  assert.equal(env.execCalls.length, 1);
  assert.equal(env.execCalls[0].svc, '/svc-heavy');
  assert.equal(env.records.length, 1);
  assert.match(env.records[0].reason, /queued=3/);
  assert.equal(env.records[0].result.ok, true);
  const state = JSON.parse(readFileSync(env.stateFile, 'utf8'));
  assert.equal(state.lastRestartAt['mac-heavy'], now);
  assert.equal(state.pendingVerification['mac-heavy'], true);
  assert.equal(res.actions.find((a) => a.kind === 'mac-heavy').action, 'restart');
});

test('T6: runOnce — cooldown 30분 안이면 execFn 호출 안 함', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const ciData = makeCiData({
    heavy: { queued: 3, oldest_queued_min: 20, in_progress: [] },
  });
  // First restart at t=1_000_000.
  const t0 = 1_000_000;
  await runOnce({ ciData, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t0 });
  assert.equal(env.execCalls.length, 1);
  // Second invocation within 30m — must skip.
  const t1 = t0 + 10 * 60_000;
  const res = await runOnce({ ciData, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t1 });
  assert.equal(env.execCalls.length, 1, 'cooldown blocked a second exec');
  const heavy = res.actions.find((a) => a.kind === 'mac-heavy');
  assert.equal(heavy.action, 'skip');
  assert.equal(heavy.reason, 'cooldown');
});

test('T7: runOnce — cooldown 지나고 stuck 여전 → consec=1 · 재시도', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const ciData = makeCiData({
    heavy: { queued: 3, oldest_queued_min: 20, in_progress: [] },
  });
  const t0 = 1_000_000;
  await runOnce({ ciData, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t0 });
  const t1 = t0 + DEFAULT_COOLDOWN_MS + 1;
  await runOnce({ ciData, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t1 });
  assert.equal(env.execCalls.length, 2, '2 restart attempts across cooldowns');
  const state = JSON.parse(readFileSync(env.stateFile, 'utf8'));
  assert.equal(state.consecutiveFailures['mac-heavy'], 1);
});

test('T8: runOnce — 2회 연속 실패 → max-failures · alert · 이후 exec 호출 안 함', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const ciData = makeCiData({
    heavy: { queued: 3, oldest_queued_min: 20, oldest_queued_pr: 'repo:#1', in_progress: [] },
  });
  const t0 = 1_000_000;
  await runOnce({ ciData, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t0 });
  const t1 = t0 + DEFAULT_COOLDOWN_MS + 1;
  await runOnce({ ciData, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t1 });
  const t2 = t1 + DEFAULT_COOLDOWN_MS + 1;
  const res = await runOnce({ ciData, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t2 });
  // After 2 consecutive failures (first restart didn't fix, second didn't either),
  // the third tick (cooldown elapsed) must NOT exec.
  assert.equal(env.execCalls.length, 2, 'third attempt blocked by max-failures');
  const state = JSON.parse(readFileSync(env.stateFile, 'utf8'));
  assert.equal(state.alerted['mac-heavy'], true);
  assert.ok(state.alert, 'alert set in state');
  assert.equal(state.alert.kind, 'mac-heavy');
  assert.ok(res.alert, 'alert present in result');
  const heavy = res.actions.find((a) => a.kind === 'mac-heavy');
  assert.equal(heavy.action, 'skip');
  assert.equal(heavy.reason, 'max-failures');
});

test('T9: runOnce — execFn throw 시 consec 증가 · 2회 exec 실패 → alert', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const ciData = makeCiData({
    heavy: { queued: 3, oldest_queued_min: 20, in_progress: [] },
  });
  let calls = 0;
  const failingExec = async () => { calls++; throw new Error('svc.sh not found'); };
  const t0 = 1_000_000;
  await runOnce({ ciData, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: failingExec, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t0 });
  const t1 = t0 + DEFAULT_COOLDOWN_MS + 1;
  const res = await runOnce({ ciData, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: failingExec, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t1 });
  assert.equal(calls, 2, '2 exec attempts');
  const state = JSON.parse(readFileSync(env.stateFile, 'utf8'));
  assert.equal(state.consecutiveFailures['mac-heavy'], 2);
  assert.equal(state.alerted['mac-heavy'], true);
  assert.ok(res.alert);
  assert.match(res.alert.reason, /exec failed/i);
});

test('T10: runOnce — stuck 아니면 execFn 호출 안 함 (in_progress 보호)', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  // Scenario: queued=3 but one job already running on the runner → safe, don't restart.
  const ciData = makeCiData({
    heavy: { queued: 3, oldest_queued_min: 20, in_progress: [{ job: 'x' }] },
  });
  const t0 = 1_000_000;
  const res = await runOnce({ ciData, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t0 });
  assert.equal(env.execCalls.length, 0, 'job-running protection');
  const heavy = res.actions.find((a) => a.kind === 'mac-heavy');
  assert.equal(heavy.action, 'skip');
  assert.equal(heavy.reason, 'job-running');
});

test('T11: runOnce — 재시작 후 다음 회차 not stuck → consec/alerted/alert reset', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const stuckCi = makeCiData({
    heavy: { queued: 3, oldest_queued_min: 20, in_progress: [] },
  });
  // Force 2 failures to get into alerted state.
  let t = 1_000_000;
  await runOnce({ ciData: stuckCi, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t });
  t += DEFAULT_COOLDOWN_MS + 1;
  await runOnce({ ciData: stuckCi, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t });
  t += DEFAULT_COOLDOWN_MS + 1;
  await runOnce({ ciData: stuckCi, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t });
  let state = JSON.parse(readFileSync(env.stateFile, 'utf8'));
  assert.equal(state.alerted['mac-heavy'], true);
  // Recovery: not stuck next tick.
  const okCi = makeCiData({
    heavy: { queued: 0, oldest_queued_min: null, in_progress: [{ job: 'x' }] },
  });
  t += 60_000;
  const res = await runOnce({ ciData: okCi, repoRoot: env.root, runnerPaths: env.runnerPaths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: t });
  state = JSON.parse(readFileSync(env.stateFile, 'utf8'));
  assert.equal(state.consecutiveFailures['mac-heavy'], 0);
  assert.equal(state.alerted['mac-heavy'], false);
  assert.equal(state.alert, null);
  assert.equal(res.alert, null);
});

test('T12: runOnce — runnerPaths 가 execFn 에 그대로 전달', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const ciData = makeCiData({
    light: { queued: 2, oldest_queued_min: 15, oldest_queued_pr: 'repo:#5', in_progress: [] },
  });
  const paths = { 'mac-light': '/custom/path/svc.sh' };
  const res = await runOnce({ ciData, repoRoot: env.root, runnerPaths: paths, stateFile: env.stateFile, execFn: env.execFn, workerCheckFn: env.workerCheckFn, recordFn: env.recordFn, now: 1_000_000 });
  assert.equal(env.execCalls.length, 1);
  assert.equal(env.execCalls[0].svc, '/custom/path/svc.sh');
  const light = res.actions.find((a) => a.kind === 'mac-light');
  assert.equal(light.action, 'restart');
});

test('T13: withinCooldown — 경계 테스트', () => {
  const state = { lastRestartAt: { 'mac-heavy': 1000 } };
  assert.equal(withinCooldown(state, 'mac-heavy', 1000, 500), true);
  assert.equal(withinCooldown(state, 'mac-heavy', 1499, 500), true);
  assert.equal(withinCooldown(state, 'mac-heavy', 1500, 500), false);
  assert.equal(withinCooldown(state, 'mac-light', 10_000, 500), false);  // 기록 없음
});

// ---- M0-1119-U: 실행 중 job 을 죽일 수 있는 경로 봉쇄 ----

test('T14: runOnce — ci.partial=true → 재시작 skip · exec 0', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const ciData = {
    ...makeCiData({ heavy: { queued: 3, oldest_queued_min: 20, oldest_queued_pr: 'repo:#1', in_progress: [] } }),
    partial: true,
  };
  const res = await runOnce({
    ciData, repoRoot: env.root, runnerPaths: env.runnerPaths,
    stateFile: env.stateFile, execFn: env.execFn,
    workerCheckFn: env.workerCheckFn, recordFn: env.recordFn,
    now: 1_000_000,
  });
  assert.equal(env.execCalls.length, 0, 'partial 이면 exec 금지');
  const heavy = res.actions.find((a) => a.kind === 'mac-heavy');
  const light = res.actions.find((a) => a.kind === 'mac-light');
  assert.equal(heavy.action, 'skip');
  assert.equal(heavy.reason, 'data-partial');
  assert.equal(light.reason, 'data-partial');
});

test('T15: runOnce — repos_failed 하나라도 있으면 skip · exec 0', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const ciData = {
    ...makeCiData({ heavy: { queued: 3, oldest_queued_min: 20, in_progress: [] } }),
    repos_failed: [{ repo: 'storeport', error: '500 rate limit' }],
  };
  const res = await runOnce({
    ciData, repoRoot: env.root, runnerPaths: env.runnerPaths,
    stateFile: env.stateFile, execFn: env.execFn,
    workerCheckFn: env.workerCheckFn, recordFn: env.recordFn,
    now: 1_000_000,
  });
  assert.equal(env.execCalls.length, 0, 'repos_failed 이면 exec 금지');
  const heavy = res.actions.find((a) => a.kind === 'mac-heavy');
  assert.equal(heavy.reason, 'data-repos-failed');
});

test('T16: runOnce — ci.at 이 6분보다 오래됨 → skip · exec 0', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const now = Date.parse('2026-11-19T10:00:00Z');
  const atOld = new Date(now - (DEFAULT_STALE_CACHE_MS + 1_000)).toISOString();  // 6분 1초 전
  const ciData = {
    ...makeCiData({ heavy: { queued: 3, oldest_queued_min: 20, in_progress: [] } }),
    at: atOld,
  };
  const res = await runOnce({
    ciData, repoRoot: env.root, runnerPaths: env.runnerPaths,
    stateFile: env.stateFile, execFn: env.execFn,
    workerCheckFn: env.workerCheckFn, recordFn: env.recordFn,
    now,
  });
  assert.equal(env.execCalls.length, 0, 'stale cache 이면 exec 금지');
  const heavy = res.actions.find((a) => a.kind === 'mac-heavy');
  assert.equal(heavy.reason, 'data-stale');

  // 6분 안쪽이면 다시 통과.
  _resetGhRunnerWatchdog();
  const env2 = withEnv();
  const atFresh = new Date(now - (DEFAULT_STALE_CACHE_MS - 1_000)).toISOString();  // 5분 59초 전
  const ciData2 = {
    ...makeCiData({ heavy: { queued: 3, oldest_queued_min: 20, in_progress: [] } }),
    at: atFresh,
  };
  await runOnce({
    ciData: ciData2, repoRoot: env2.root, runnerPaths: env2.runnerPaths,
    stateFile: env2.stateFile, execFn: env2.execFn,
    workerCheckFn: env2.workerCheckFn, recordFn: env2.recordFn,
    now,
  });
  assert.equal(env2.execCalls.length, 1, 'fresh cache 이면 exec 통과');
});

test('T17: runOnce — stop 직전 Runner.Worker alive → skip · exec 0 · 기록 없음', async () => {
  _resetGhRunnerWatchdog();
  const env = withEnv();
  const ciData = makeCiData({
    heavy: { queued: 3, oldest_queued_min: 20, oldest_queued_pr: 'repo:#1', in_progress: [] },
  });
  // ci-health 는 "stuck" 이라고 보고하지만, 실제로 Mac 에서 Runner.Worker 가 돌고 있는 상황.
  // 셸 주입 방지 확인: workerCheckFn 은 runnerDir 을 인자로 받는다 (셸 아님).
  const workerCalls = [];
  const workerCheckFn = async (runnerDir) => {
    workerCalls.push(runnerDir);
    return true;
  };
  const res = await runOnce({
    ciData, repoRoot: env.root, runnerPaths: env.runnerPaths,
    stateFile: env.stateFile, execFn: env.execFn,
    workerCheckFn, recordFn: env.recordFn,
    now: 1_000_000,
  });
  assert.equal(env.execCalls.length, 0, 'worker 살아있으면 exec 금지');
  assert.ok(workerCalls.length >= 1, 'workerCheckFn 이 호출되었다');
  // runnerDir = dirname('/svc-heavy') = '/'
  assert.equal(workerCalls[0], '/');
  const heavy = res.actions.find((a) => a.kind === 'mac-heavy');
  assert.equal(heavy.action, 'skip');
  assert.equal(heavy.reason, 'worker-running');
  // 재시작 안 했으니 lastRestartAt 도 없다.
  const state = JSON.parse(readFileSync(env.stateFile, 'utf8'));
  assert.equal(state.lastRestartAt['mac-heavy'], undefined);
});

test('T18: isDataIncomplete — null/partial/repos_failed/stale/정상 5경우', () => {
  const now = Date.parse('2026-11-19T10:00:00Z');
  assert.equal(isDataIncomplete(null, now).incomplete, true);
  assert.equal(isDataIncomplete(null, now).reason, 'no-ci-data');

  assert.equal(isDataIncomplete({ partial: true, at: new Date(now).toISOString() }, now).reason, 'data-partial');

  assert.equal(
    isDataIncomplete({ repos_failed: [{ repo: 'x', error: 'e' }], at: new Date(now).toISOString() }, now).reason,
    'data-repos-failed',
  );

  const stale = new Date(now - (DEFAULT_STALE_CACHE_MS + 1)).toISOString();
  assert.equal(isDataIncomplete({ at: stale }, now).reason, 'data-stale');

  const fresh = new Date(now - 60_000).toISOString();
  assert.equal(isDataIncomplete({ at: fresh, repos_failed: [] }, now).incomplete, false);
});

test('T19: hasRunningWorker — workerCheckFn 가 throw 하면 "있음" 으로 판정 (안전측)', async () => {
  const bombCheck = async () => { throw new Error('pgrep missing'); };
  const result = await hasRunningWorker('/path/to/svc.sh', { workerCheckFn: bombCheck });
  assert.equal(result, true, '예외 시 재시작 봉쇄');
});
