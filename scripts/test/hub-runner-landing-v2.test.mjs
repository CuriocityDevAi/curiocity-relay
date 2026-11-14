// scripts/test/hub-runner-landing-v2.test.mjs — M1-1105-BT · v7.3 착지 단위 테스트
//   REQ1: 폴링 간격 벽시계 점프 → 수면 간주 · 예산 보정
//   REQ2: report-local → 원격 착지 대기 · 5m 안 안 올라오면 needs-proxy-land
//
// 테스트는 injected clock + fake interval 로 실제 시간을 안 씀 (빠름 · 결정적).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitForLandingAwake } from '../lib/land-detect-v2.mjs';

/** fake 클록 + fake setInterval — tick(ms) 로 수동 전진. */
function makeFakeClock() {
  const state = {
    tMs: 0,
    pendingTimers: [],  // setTimeout 용
    activeInterval: null,
  };
  const now = () => state.tMs;
  const setIntervalFn = (cb, ms) => {
    const h = { cb, ms, nextAt: state.tMs + ms, cancelled: false };
    state.activeInterval = h;
    return h;
  };
  const clearIntervalFn = (h) => {
    if (h) h.cancelled = true;
    if (state.activeInterval === h) state.activeInterval = null;
  };
  const setTimeoutFn = (cb, ms) => {
    const h = { cb, at: state.tMs + ms, cancelled: false };
    state.pendingTimers.push(h);
    return h;
  };

  // 가상 시간을 deltaMs 만큼 전진하면서 interval/timeout 콜백 트리거.
  // interval.nextAt 이 과거라면 (jumpClock 뒤) 그 콜백은 현재 tMs 에서 1회 실행 (catch-up).
  async function advance(deltaMs) {
    const target = state.tMs + deltaMs;
    for (let safety = 0; safety < 100000; safety++) {
      const iv = state.activeInterval;
      const ivFireAt = iv && !iv.cancelled ? Math.max(iv.nextAt, state.tMs) : Infinity;
      const nextTimer = state.pendingTimers.find((t) => !t.cancelled);
      const timerFireAt = nextTimer ? Math.max(nextTimer.at, state.tMs) : Infinity;
      const nextAt = Math.min(ivFireAt, timerFireAt);
      if (nextAt > target || !Number.isFinite(nextAt)) {
        state.tMs = target;
        return;
      }
      state.tMs = nextAt;
      if (nextAt === ivFireAt && iv && !iv.cancelled) {
        iv.nextAt = state.tMs + iv.ms;
        try { iv.cb(); } catch { /* resolve 후 안 돌아옴 */ }
        await Promise.resolve();
        await Promise.resolve();
      } else if (nextTimer && !nextTimer.cancelled) {
        state.pendingTimers = state.pendingTimers.filter((t) => t !== nextTimer);
        try { nextTimer.cb(); } catch { /* noop */ }
        await Promise.resolve();
        await Promise.resolve();
      }
    }
    throw new Error('advance: safety 초과 (무한 루프?)');
  }

  // 수면 시뮬 — tMs 만 점프. 다음 advance() 시 interval.nextAt 은 과거 → catch-up fire 1회.
  function jumpClock(deltaMs) {
    state.tMs += deltaMs;
  }

  return { now, setIntervalFn, clearIntervalFn, setTimeoutFn, advance, jumpClock, state };
}

// ──────────────────────────────────────────────────────────────────────────
// REQ1: 수면 간주 · 예산 보정
// ──────────────────────────────────────────────────────────────────────────

test('REQ1 — 60m 예산 · 30m 수면 · 깨어나서 작업 지속 (timeout 안 됨)', { timeout: 5000 }, async () => {
  const clock = makeFakeClock();
  let sleepGaps = [];

  const p = waitForLandingAwake({
    reportExists: () => false,
    readClaim: () => null,
    getHead: () => { throw new Error('no git'); },
    fetchOriginReport: () => false,
    timeoutMs: 60 * 60_000,                // 60m 예산
    pollMs: 5_000,
    originPollInterval: 999,
    sigkillGraceMs: 10,
    remoteWaitMs: 5 * 60_000,
    sleepGapMultiplier: 4,
    now: clock.now,
    setIntervalFn: clock.setIntervalFn,
    clearIntervalFn: clock.clearIntervalFn,
    setTimeoutFn: clock.setTimeoutFn,
    onSleepGap: ({ gapMs }) => sleepGaps.push(gapMs),
  });

  // 10m 정상 진행
  await clock.advance(10 * 60_000);
  // 수면 30m — 시계만 점프 (interval 콜백은 안 돌음)
  clock.jumpClock(30 * 60_000);
  // 깨어난 뒤 폴링 재개 → 다음 advance 호출 시 catch-up interval 이 큰 gap 을 본다.
  await clock.advance(10 * 60_000);
  // 여기서 wall 은 50m, 효율 시간은 ~20m — 예산 60m 아직 여유.
  // report 가 안 올라오므로 결국 60m effective 소진 시점에 timeout.

  // 추가 전진: 20m 효율 시간 지나면 → effective 40m · 아직 여유
  await clock.advance(20 * 60_000);
  // 이제 effective 약 40m · 추가 25m → effective 65m 로 timeout
  await clock.advance(25 * 60_000);

  const result = await p;
  assert.equal(result.timedOut, true, `(효율 60m 지난 뒤) timeout 돼야 함 — got reason=${result.reason}`);
  assert.ok(result.sleepGapMs >= 29 * 60_000,
    `sleepGap 최소 29m+ 기대 · got ${Math.round(result.sleepGapMs / 60000)}m`);
  assert.ok(sleepGaps.length > 0, `onSleepGap 콜백 최소 1회 호출돼야 함 — got ${sleepGaps.length}`);
});

test('REQ1 — 짧은 gap(pollMs × 2) 은 수면 간주 안 함', { timeout: 5000 }, async () => {
  const clock = makeFakeClock();
  let sleepGaps = [];

  const p = waitForLandingAwake({
    reportExists: () => false,
    readClaim: () => null,
    getHead: () => { throw new Error('no git'); },
    fetchOriginReport: () => false,
    timeoutMs: 60_000,
    pollMs: 5_000,
    originPollInterval: 999,
    sigkillGraceMs: 10,
    sleepGapMultiplier: 4,  // 임계 = 20s
    now: clock.now,
    setIntervalFn: clock.setIntervalFn,
    clearIntervalFn: clock.clearIntervalFn,
    setTimeoutFn: clock.setTimeoutFn,
    onSleepGap: ({ gapMs }) => sleepGaps.push(gapMs),
  });

  // 10s 수면(gap ≈ 10s < 20s 임계) 흉내 → 수면 간주 안 함
  await clock.advance(5_000);
  clock.jumpClock(10_000);
  await clock.advance(10_000);

  // 나머지 60s 소진
  await clock.advance(60_000);

  const result = await p;
  assert.equal(sleepGaps.length, 0, `임계 이하 gap 은 수면 감지 X — got ${sleepGaps.length} 건`);
  assert.equal(result.timedOut, true, 'timeout 돼야 함');
});

// ──────────────────────────────────────────────────────────────────────────
// REQ2: 2단계 착지 (report-local → 원격 확인)
// ──────────────────────────────────────────────────────────────────────────

test('REQ2 — report-local 후 claim done → claim-done 반환', { timeout: 5000 }, async () => {
  const clock = makeFakeClock();
  let reportExists = false;
  let claim = null;

  const p = waitForLandingAwake({
    reportExists: () => reportExists,
    readClaim: () => claim,
    getHead: () => { throw new Error('no git'); },
    fetchOriginReport: () => false,
    timeoutMs: 60 * 60_000,
    pollMs: 5_000,
    originPollInterval: 999,
    sigkillGraceMs: 10,
    remoteWaitMs: 5 * 60_000,
    now: clock.now,
    setIntervalFn: clock.setIntervalFn,
    clearIntervalFn: clock.clearIntervalFn,
    setTimeoutFn: clock.setTimeoutFn,
  });

  // 10s 뒤 로컬 리포트 생성
  await clock.advance(10_000);
  reportExists = true;
  // 폴 1회 돌려서 report-local 감지 → await-remote 로 전환
  await clock.advance(5_000);
  // 2분 뒤 허브가 claim done
  await clock.advance(2 * 60_000);
  claim = { state: 'done', note: 'hub pushed' };
  await clock.advance(10_000);

  const result = await p;
  assert.equal(result.reason, 'claim-done', `claim-done 기대 · got ${result.reason}`);
  assert.equal(result.timedOut, false);
});

test('REQ2 — report-local 후 report-origin 감지 → report-origin', { timeout: 5000 }, async () => {
  const clock = makeFakeClock();
  let reportExists = false;
  let originHasReport = false;

  const p = waitForLandingAwake({
    reportExists: () => reportExists,
    readClaim: () => null,
    getHead: () => { throw new Error('no git'); },
    fetchOriginReport: () => originHasReport,
    timeoutMs: 60 * 60_000,
    pollMs: 5_000,
    originPollInterval: 2,  // 2 폴마다 origin 체크
    sigkillGraceMs: 10,
    remoteWaitMs: 5 * 60_000,
    now: clock.now,
    setIntervalFn: clock.setIntervalFn,
    clearIntervalFn: clock.clearIntervalFn,
    setTimeoutFn: clock.setTimeoutFn,
  });

  await clock.advance(10_000);
  reportExists = true;                 // 로컬 report
  await clock.advance(10_000);         // await-remote 로 전환
  originHasReport = true;              // 허브가 push 했다고 치고
  await clock.advance(20_000);

  const result = await p;
  assert.equal(result.reason, 'report-origin', `report-origin 기대 · got ${result.reason}`);
});

test('REQ2 — report-local 후 5m 안 원격 X → needs-proxy-land', { timeout: 10000 }, async () => {
  const clock = makeFakeClock();
  let reportExists = false;

  const p = waitForLandingAwake({
    reportExists: () => reportExists,
    readClaim: () => null,
    getHead: () => { throw new Error('no git'); },
    fetchOriginReport: () => false,
    timeoutMs: 60 * 60_000,
    pollMs: 5_000,
    originPollInterval: 999,
    sigkillGraceMs: 10,
    remoteWaitMs: 5 * 60_000,
    now: clock.now,
    setIntervalFn: clock.setIntervalFn,
    clearIntervalFn: clock.clearIntervalFn,
    setTimeoutFn: clock.setTimeoutFn,
  });

  await clock.advance(10_000);
  reportExists = true;                 // 로컬 report
  // 5m 이상 전진 (원격 X)
  await clock.advance(6 * 60_000);

  const result = await p;
  assert.equal(result.reason, 'needs-proxy-land', `needs-proxy-land 기대 · got ${result.reason}`);
  assert.equal(result.timedOut, false);
});

// ──────────────────────────────────────────────────────────────────────────
// REQ1 ∧ REQ2: 수면으로 원격 대기 상한도 보정되는지
// ──────────────────────────────────────────────────────────────────────────

test('REQ1+2 — report-local 후 수면 30m · 깨어나 즉시 claim done → claim-done (needs-proxy-land 안 터짐)', { timeout: 5000 }, async () => {
  const clock = makeFakeClock();
  let reportExists = false;
  let claim = null;

  const p = waitForLandingAwake({
    reportExists: () => reportExists,
    readClaim: () => claim,
    getHead: () => { throw new Error('no git'); },
    fetchOriginReport: () => false,
    timeoutMs: 60 * 60_000,
    pollMs: 5_000,
    originPollInterval: 999,
    sigkillGraceMs: 10,
    remoteWaitMs: 5 * 60_000,
    sleepGapMultiplier: 4,
    now: clock.now,
    setIntervalFn: clock.setIntervalFn,
    clearIntervalFn: clock.clearIntervalFn,
    setTimeoutFn: clock.setTimeoutFn,
  });

  await clock.advance(10_000);
  reportExists = true;                  // 로컬 report (await-remote 로)
  await clock.advance(10_000);          // 전환 확인
  // 수면 30m — 시계만 점프
  clock.jumpClock(30 * 60_000);
  // 깨어나서 즉시 허브가 claim done 올림
  claim = { state: 'done', note: 'woke-up and pushed' };
  await clock.advance(15_000);          // 1 폴 안에 claim-done 감지

  const result = await p;
  assert.equal(result.reason, 'claim-done',
    `수면 30m 가 원격 대기(5m) 를 소진 안 해야 함 (수면 제외) · got ${result.reason}`);
  assert.ok(result.sleepGapMs >= 29 * 60_000, `sleepGap 기록 · got ${Math.round(result.sleepGapMs / 60000)}m`);
});

// ──────────────────────────────────────────────────────────────────────────
// 기본 동작: report 없음 → timeout
// ──────────────────────────────────────────────────────────────────────────

test('기본 — report/claim 없음 · 효율 60m 지나면 timeout', { timeout: 5000 }, async () => {
  const clock = makeFakeClock();
  let timedOutCallbacks = 0;

  const p = waitForLandingAwake({
    reportExists: () => false,
    readClaim: () => null,
    getHead: () => { throw new Error('no git'); },
    fetchOriginReport: () => false,
    timeoutMs: 60_000,
    pollMs: 5_000,
    originPollInterval: 999,
    sigkillGraceMs: 10,
    now: clock.now,
    setIntervalFn: clock.setIntervalFn,
    clearIntervalFn: clock.clearIntervalFn,
    setTimeoutFn: clock.setTimeoutFn,
    onTimeout: () => timedOutCallbacks++,
  });

  await clock.advance(70_000);  // sigkillGraceMs 뒤 resolve 까지 포함
  const result = await p;
  assert.equal(result.reason, 'timeout');
  assert.equal(result.timedOut, true);
  assert.equal(timedOutCallbacks, 1, 'onTimeout 1회 호출');
});
