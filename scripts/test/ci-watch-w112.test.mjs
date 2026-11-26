// scripts/test/ci-watch-w112.test.mjs  M2-1126-I — W2보완 + W10 테스트
//
// 커버:
//   W2보완-1: isMarkerJob — 'changes-filter' 는 마커
//   W2보완-2: isMarkerJob — 'markers-and-forbidden' 는 마커
//   W2보완-3: isCountableJob — changes-filter/markers-and-forbidden 는 카운트 제외
//   W10-1: renderLayout — '클라우드 오늘' 줄 등장 (폭 100)
//   W10-2: renderLayout — PR N · PT M · 잡 K · 넘김 X/Y 형태 (폭 100)
//   W10-3: renderLayout — 동일 형태 (폭 140)
//   W10-4: renderLayout — 넘김 소진(overflowUsed >= limit) → 빨강 코드 포함
//   W10-5: renderLayout — 넘김 미소진 → 빨강 코드 없음

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isMarkerJob,
  isCountableJob,
  renderLayout,
} from '../watch/ci-watch-render.mjs';
import { stripAnsi } from '../watch/text-width.mjs';

// ─── 공통 헬퍼 ───────────────────────────────────────────────────────────────

function makeLayoutData(overrides = {}) {
  const allJson = {
    at: new Date().toISOString(),
    ci_runners: [
      { name: 'Youngkyus-MacBook-Pro-M1',    status: 'online', busy: false },
      { name: 'curiocity-mac-light',         status: 'online', busy: false },
      { name: 'curiocity-mac-fork',          status: 'online', busy: false },
      { name: 'curiocity-mac-fork-light',    status: 'online', busy: false },
    ],
    ci: { data: { heavy: { in_progress: [] }, light: { in_progress: [] } } },
    hubs: {
      m0: { current: null }, m1: { current: null },
      m2: { current: null }, m3: { current: null }, r0: { current: null },
    },
    git_state: { ahead: 0, behind: 0, rebase_in_progress: false, needs_human: false },
  };
  return {
    allJson,
    runState: { heavy: { inProgress: [], queued: [] }, light: { inProgress: [], queued: [] } },
    cloudData:   { realCount: 18, limit: 5, totalMin: 12, last3: [] },
    runnerAlerts: [],
    ciAlerts:    [],
    ciDimAlerts: [],
    timeStr:     '2026/11/26 15:15:00',
    fullMode:    false,
    todayStats:  null,
    cloudTodayCount: 3,
    cloudLimit:  5,
    lastCiByRepo: [],
    countdownSec: 30,
    hubReportStatus: {},
    hubPending:  {},
    spinnerFrame: 0,
    terminalWidth: 100,
    version:     '1.12',
    versionNote: '',
    poolWaitStats:        {},
    hubWaitStats:         {},
    todayMachineStats:    null,
    todayPoolMachineStats: null,
    machineRecentStats:   null,
    summaryPR:   null,
    summaryPT:   null,
    summaryJobs: null,
    cloudPR:     3,
    cloudPT:     4,
    ...overrides,
  };
}

// ─── W2보완-1~3: MARKER_JOBS 보완 ────────────────────────────────────────────

test('W2보완-1: isMarkerJob — changes-filter 는 마커', () => {
  assert.equal(isMarkerJob('changes-filter'), true);
});

test('W2보완-2: isMarkerJob — markers-and-forbidden 는 마커', () => {
  assert.equal(isMarkerJob('markers-and-forbidden'), true);
});

test('W2보완-3: isCountableJob — changes-filter/markers-and-forbidden 는 카운트 제외', () => {
  assert.equal(isCountableJob({ job: 'changes-filter', conclusion: 'success' }), false);
  assert.equal(isCountableJob({ job: 'markers-and-forbidden', conclusion: 'success' }), false);
});

// ─── W10-1: 클라우드 오늘 줄 등장 (폭 100) ───────────────────────────────────

test('W10-1: renderLayout — "클라우드 오늘" 줄 등장 (폭 100)', () => {
  const lines = renderLayout(makeLayoutData({ terminalWidth: 100 }));
  const text  = stripAnsi(lines.join('\n'));
  assert.ok(text.includes('클라우드 오늘'),
    `클라우드 오늘 줄 미등장\n...${text.slice(-600)}`);
});

// ─── W10-2: PR · PT · 잡 · 넘김 형태 (폭 100) ────────────────────────────────

test('W10-2: renderLayout — PR 3 · PT 4 · 잡 18 · 넘김 3/5 형태 (폭 100)', () => {
  const lines = renderLayout(makeLayoutData({ terminalWidth: 100, cloudPR: 3, cloudPT: 4 }));
  const foundLine = lines.map(l => stripAnsi(l)).find(l => l.includes('클라우드 오늘'));
  assert.ok(foundLine, '클라우드 오늘 줄 없음');
  assert.ok(foundLine.includes('PR 3'),  `PR 3 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('PT 4'),  `PT 4 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('잡 18'), `잡 18 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('넘김'),  `넘김 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('3/5'),   `3/5 없음: "${foundLine}"`);
});

// ─── W10-3: 동일 형태 폭 140 ─────────────────────────────────────────────────

test('W10-3: renderLayout — 클라우드 오늘 줄 등장 (폭 140)', () => {
  const lines = renderLayout(makeLayoutData({ terminalWidth: 140, cloudPR: 3, cloudPT: 4 }));
  const foundLine = lines.map(l => stripAnsi(l)).find(l => l.includes('클라우드 오늘'));
  assert.ok(foundLine, '클라우드 오늘 줄 없음 (폭 140)');
  assert.ok(foundLine.includes('PR 3') && foundLine.includes('PT 4') && foundLine.includes('잡 18'),
    `PR/PT/잡 없음 (폭 140): "${foundLine}"`);
});

// ─── W10-4: 넘김 소진 → 빨강 ─────────────────────────────────────────────────

test('W10-4: cloudTodayCount >= cloudLimit → 넘김 빨강 색상 코드 포함', () => {
  // overflow = limit = 5 → 소진
  const lines = renderLayout(makeLayoutData({
    cloudTodayCount: 5,
    cloudLimit: 5,
    cloudPR: 2,
    cloudPT: 3,
  }));
  const rawLine = lines.find(l => stripAnsi(l).includes('클라우드 오늘'));
  assert.ok(rawLine, '클라우드 오늘 줄 없음');
  // 빨강 ANSI 코드(\x1b[31m) 가 포함되어야 함
  assert.ok(rawLine.includes('\x1b[31m'),
    `넘김 소진인데 빨강 코드 없음: "${rawLine.slice(0, 120)}"`);
  // 5/5 텍스트도 있어야 함
  assert.ok(stripAnsi(rawLine).includes('5/5'),
    `5/5 없음: "${stripAnsi(rawLine)}"`);
});

// ─── W10-5: 넘김 미소진 → 빨강 없음 ─────────────────────────────────────────

test('W10-5: cloudTodayCount < cloudLimit → 넘김 줄에 빨강 없음', () => {
  // overflow = 2, limit = 5 → 미소진
  const lines = renderLayout(makeLayoutData({
    cloudTodayCount: 2,
    cloudLimit: 5,
    cloudPR: 1,
    cloudPT: 1,
  }));
  const rawLine = lines.find(l => stripAnsi(l).includes('클라우드 오늘'));
  assert.ok(rawLine, '클라우드 오늘 줄 없음');
  // 2/5 텍스트가 있어야 함
  assert.ok(stripAnsi(rawLine).includes('2/5'),
    `2/5 없음: "${stripAnsi(rawLine)}"`);
  // 넘김 미소진 → 빨강 코드 없어야 함
  assert.ok(!rawLine.includes('\x1b[31m'),
    `미소진인데 빨강 코드 있음: "${rawLine.slice(0, 120)}"`);
});
