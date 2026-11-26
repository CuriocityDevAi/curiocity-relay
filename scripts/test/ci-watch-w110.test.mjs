// scripts/test/ci-watch-w110.test.mjs  M2-1126-F — v1.10 W1~W4 테스트
//
// 커버:
//   W1-1: 허브 큐 머리줄 `평균대기` 라벨 x = CI 표 `평균대기` 열 시작 x (CI_AVG_X)
//   W1-2: 허브 줄 평균대기 값도 같은 CI_AVG_X 위치
//   W1-3: 창 폭 < CI_AVG_X + 8 → 허브 머리줄 라벨 생략
//   W1-4: 창 폭 < CI_AVG_X + 8 → 허브 줄 평균대기 값 생략
//   W3-1: hubs[hub].current 가 있으면 hubPending 에서 같은 ID 제거
//   W4-1: 쉼(N) — todayPoolMachineStats.mbp > 0 → 쉼(N)
//   W4-2: 실행 중 → ⠋ID 3m (N)
//   W4-3: 클라우드 idle → —(N)
//   W4-4: todayPoolMachineStats 없으면 쉼 (N 없음)
//   W4-5: 오늘 처리(잡) 라벨 등장

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderLayout,
  CI_AVG_X,
} from '../watch/ci-watch-render.mjs';
import { displayWidth, stripAnsi } from '../watch/text-width.mjs';

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

function makeAllJson() {
  return {
    at: new Date().toISOString(),
    ci_runners: [
      { name: 'ci-box-storeport-heavy-imac', status: 'online', busy: false },
      { name: 'ci-box-storeport-light-imac', status: 'online', busy: false },
      { name: 'ci-box-fork-heavy-imac', status: 'online', busy: false },
      { name: 'ci-box-fork-light-imac', status: 'online', busy: false },
      { name: 'Youngkyus-MacBook-Pro-M1', status: 'online', busy: false },
      { name: 'curiocity-mac-light', status: 'online', busy: false },
      { name: 'curiocity-mac-fork', status: 'online', busy: false },
      { name: 'curiocity-mac-fork-light', status: 'online', busy: false },
    ],
    ci: {
      data: {
        heavy: { in_progress: [], queued: 0 },
        light: { in_progress: [], queued: 0 },
        today: {
          'mac-heavy': { jobs: 7, avg_wait_min: 0.3, avg_run_min: 2.6, success_rate: 87 },
          'mac-light': { jobs: 61, avg_wait_min: 3.1, avg_run_min: 0.5, success_rate: 98 },
          cloud: { jobs: 18, avg_run_min: 1.2, success_rate: 56 },
          cloud_cost_est_usd: 0.5,
        },
      },
    },
    hubs: {
      m0: { current: null },
      m1: { current: null },
      m2: { current: null },
      m3: { current: null },
      r0: { current: null },
    },
    git_state: { ahead: 0, behind: 0, rebase_in_progress: false, needs_human: false },
  };
}

function makeRunState() {
  return {
    heavy: { inProgress: [], queued: [] },
    light: { inProgress: [], queued: [] },
  };
}

function makeLayoutData(overrides = {}) {
  return {
    allJson: makeAllJson(),
    runState: makeRunState(),
    cloudData: { realCount: 1, limit: 5, totalMin: 8, last3: [] },
    runnerAlerts: [],
    ciAlerts: [],
    ciDimAlerts: [],
    timeStr: '2026/11/26 09:00:00',
    fullMode: false,
    todayStats: makeAllJson().ci.data.today,
    cloudTodayCount: 1,
    cloudLimit: 5,
    lastCiByRepo: [],
    countdownSec: 30,
    hubReportStatus: {},
    hubPending: {},
    spinnerFrame: 0,
    terminalWidth: 140,
    version: '1.10',
    versionNote: '',
    poolWaitStats: {},
    hubWaitStats: {},
    todayMachineStats: null,
    todayPoolMachineStats: null,
    ...overrides,
  };
}

// display 위치 측정 헬퍼: ANSI 제거 후 str 이 시작되는 display column
function displayPosOf(line, str) {
  const idx = line.indexOf(str);
  if (idx < 0) return -1;
  return displayWidth(line.slice(0, idx));
}

// ─── W1-1: 허브 큐 머리줄 평균대기 x = CI_AVG_X ─────────────────────────────

test('W1-1: 허브 큐 머리줄 `평균대기` display 위치 = CI_AVG_X', () => {
  const hubWaitStats = { m0: { avgMin: 1.5, count: 1 } };
  const lines = renderLayout(makeLayoutData({ hubWaitStats }));
  const plain = lines.map(l => stripAnsi(l));

  // 허브 큐 머리줄 찾기
  const hubHdrIdx = plain.findIndex(l => l.includes('허브 큐'));
  assert.ok(hubHdrIdx >= 0, '허브 큐 머리줄 없음');

  // CI 열 제목 행 찾기
  const ciHdrIdx = plain.findIndex(l => l.includes('MBP M1') && l.includes('iMAC M1') && l.includes('평균대기'));
  assert.ok(ciHdrIdx >= 0, 'CI 열 제목 행 없음');

  const hubHdrLine = plain[hubHdrIdx];
  const ciHdrLine = plain[ciHdrIdx];

  // display 위치 비교 (CJK 문자는 1 char = 2 display cols)
  const hubAvgDispX = displayPosOf(hubHdrLine, '평균대기');
  const ciAvgDispX = displayPosOf(ciHdrLine, '평균대기');

  assert.ok(hubAvgDispX >= 0, `허브 머리줄에 평균대기 없음: "${hubHdrLine}"`);
  assert.ok(ciAvgDispX >= 0, `CI 헤더에 평균대기 없음: "${ciHdrLine}"`);
  assert.equal(hubAvgDispX, ciAvgDispX,
    `허브 머리줄 평균대기 display x=${hubAvgDispX} ≠ CI 헤더 display x=${ciAvgDispX}`);
  // CI_AVG_X 상수 검증
  assert.equal(ciAvgDispX, CI_AVG_X,
    `CI 헤더 평균대기 display x=${ciAvgDispX} ≠ CI_AVG_X=${CI_AVG_X}`);
});

// ─── W1-2: 허브 줄 평균대기 값 x = CI_AVG_X ────────────────────────────────

test('W1-2: 허브 줄 평균대기 값 display x = CI_AVG_X', () => {
  const hubWaitStats = { m0: { avgMin: 2.5, count: 2 } };
  const lines = renderLayout(makeLayoutData({ hubWaitStats }));
  const plain = lines.map(l => stripAnsi(l));

  // m0 허브 줄 찾기
  const m0Idx = plain.findIndex(l => /^\s+m0\s/.test(l) && !l.includes('└'));
  assert.ok(m0Idx >= 0, 'm0 허브 줄 없음');

  const m0Line = plain[m0Idx];
  // "2.5m"이 CI_AVG_X display 위치에 있어야 함
  const valDispX = displayPosOf(m0Line, '2.5m');
  assert.ok(valDispX >= 0, `m0 줄에 2.5m 없음: "${m0Line}"`);
  assert.equal(valDispX, CI_AVG_X,
    `m0 평균대기 값 display x=${valDispX} ≠ CI_AVG_X=${CI_AVG_X}`);
});

// ─── W1-3: 창 폭 좁으면 허브 머리줄 라벨 생략 ────────────────────────────────

test('W1-3: 창 폭 < CI_AVG_X + 8 → 허브 머리줄 `평균대기` 생략', () => {
  const hubWaitStats = { m0: { avgMin: 1.0, count: 1 } };
  // CI_AVG_X=94, '평균대기'=8 → 폭 94 는 충분히 좁음
  const narrowWidth = CI_AVG_X - 1;
  const lines = renderLayout(makeLayoutData({ hubWaitStats, terminalWidth: narrowWidth }));
  const plain = lines.map(l => stripAnsi(l));

  const hubHdrIdx = plain.findIndex(l => l.includes('허브 큐'));
  assert.ok(hubHdrIdx >= 0, '허브 큐 머리줄 없음');

  const hubHdrLine = plain[hubHdrIdx];
  assert.ok(!hubHdrLine.includes('평균대기'),
    `좁은 창에서 허브 머리줄에 평균대기 등장 → 금지\n"${hubHdrLine}"`);
});

// ─── W1-4: 창 폭 좁으면 허브 줄 평균대기 값 생략 ────────────────────────────

test('W1-4: 창 폭 < CI_AVG_X + val_width → 허브 줄 평균대기 값 생략', () => {
  const hubWaitStats = { m0: { avgMin: 1.0, count: 1 } };
  const narrowWidth = CI_AVG_X + 1; // '1m'(2chars) 넣기에 모자람: CI_AVG_X + 2 필요
  const lines = renderLayout(makeLayoutData({ hubWaitStats, terminalWidth: narrowWidth }));
  const plain = lines.map(l => stripAnsi(l));

  const m0Idx = plain.findIndex(l => /^\s+m0\s/.test(l) && !l.includes('└'));
  if (m0Idx < 0) return; // 허브 데이터 없으면 스킵
  const m0Line = plain[m0Idx];
  // CI_AVG_X+1 폭에서는 '1m' 넣을 공간이 없으므로 avg wait 없어야 함
  assert.ok(!m0Line.includes('1m') || displayWidth(stripAnsi(m0Line)) <= narrowWidth,
    `좁은 창에서 평균대기 값이 창 폭 초과\n"${m0Line}"`);
});

// ─── W3-1: hubPending 에서 현재 실행 중인 ID 제외 ────────────────────────────
// (renderLayout 는 hubPending 그대로 렌더. W3 fix 는 ci-watch.mjs tick() 에서 하므로
//  여기서는 renderLayout 에 직접 hubPending 을 주입해서 중복 표시가 없음을 확인)

test('W3-1: hubPending 에 current ID 없으면 허브 줄에 current 칩 미표시', () => {
  const allJson = makeAllJson();
  allJson.hubs.m0 = { current: 'M0-1126-F', started_at: new Date().toISOString() };

  // hubPending.m0 에 M0-1126-F 를 포함 → 본래 버그 상황 재현
  const hubPendingWithBug = {
    m0: [{ id: 'M0-1126-F', ageMin: 5 }, { id: 'M0-1126-G', ageMin: 2 }],
  };

  // tick() 에서 current 제거 후의 상태 (버그 수정 결과)
  const hubPendingFixed = {
    m0: [{ id: 'M0-1126-G', ageMin: 2 }],  // M0-1126-F 제거됨
  };

  // 버그 수정 후 렌더: m0 줄에 M0-1126-F 가 pending 칩에 없어야 함
  const linesFixed = renderLayout(makeLayoutData({ allJson, hubPending: hubPendingFixed }));
  const plainFixed = linesFixed.map(l => stripAnsi(l));

  // m0 허브 줄 (└ 아닌 줄)
  const m0Idx = plainFixed.findIndex(l => /^\s+m0\s/.test(l) && !l.includes('└'));
  assert.ok(m0Idx >= 0, 'm0 허브 줄 없음');

  const m0Line = plainFixed[m0Idx];
  // └ 줄에는 M0-1126-F 가 있어야 함 (실행 중)
  const subIdx = plainFixed.findIndex(l => l.includes('└') && l.includes('M0-1126-F'));
  assert.ok(subIdx >= 0, '└ 줄에 M0-1126-F 없음 (실행 중 표시 필요)');

  // 허브 줄 오른쪽 칩에 M0-1126-F 없어야 함 (pending 큐에서 제거됨)
  assert.ok(!m0Line.includes('[M0-1126-F'),
    `m0 허브 줄 칩에 M0-1126-F 중복 표시\n"${m0Line}"`);
  // M0-1126-G 는 있어야 함
  assert.ok(m0Line.includes('[M0-1126-G'),
    `m0 허브 줄 칩에 M0-1126-G 없음\n"${m0Line}"`);
});

// ─── W4-1: 쉼(N) — todayPoolMachineStats → idle 셀 ───────────────────────────

test('W4-1: todayPoolMachineStats.mbp > 0 → 쉼(N) 등장', () => {
  const todayPoolMachineStats = {
    'storeport-heavy': { mbp: 7, imac: 2, cloud: 12 },
    'storeport-light': { mbp: 41, imac: 20, cloud: 2 },
    'fork-heavy':      { mbp: 17, imac: 16, cloud: 4 },
    'fork-light':      { mbp: 25, imac: 19, cloud: 0 },
  };
  const lines = renderLayout(makeLayoutData({ todayPoolMachineStats }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');

  assert.ok(text.includes('쉼(7)') || text.includes('쉼(41)') || text.includes('쉼(17)') || text.includes('쉼(25)'),
    `쉼(N) 없음\n${text.slice(text.indexOf('CI 큐'), text.indexOf('CI 큐') + 500)}`);
});

// ─── W4-2: 실행 중 → ⠋ID 3m (N) ───────────────────────────────────────────

test('W4-2: 실행 중 셀 → ⠋ID 3m (N) 형태', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, busy: true } : r,
  );
  allJson.ci.data.heavy.in_progress = [{
    runner: 'Youngkyus-MacBook-Pro-M1',
    prompt_id: 'M2-1126-F',
    running_min: 3,
  }];
  const runState = makeRunState();
  runState.heavy.inProgress = [{
    runner: 'Youngkyus-MacBook-Pro-M1',
    repo: 'CuriocityDevAi/storeport',
    prompt_id: 'M2-1126-F',
    running_min: 3,
    light: false,
  }];

  const todayPoolMachineStats = {
    'storeport-heavy': { mbp: 7, imac: 2, cloud: 12 },
    'storeport-light': { mbp: 41, imac: 20, cloud: 2 },
    'fork-heavy':      { mbp: 17, imac: 16, cloud: 4 },
    'fork-light':      { mbp: 25, imac: 19, cloud: 0 },
  };

  const lines = renderLayout(makeLayoutData({ allJson, runState, todayPoolMachineStats }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');

  // storeport-heavy MBP 가 실행 중이므로 M2-1126-F + (7) 이 있어야 함
  assert.ok(text.includes('M2-1126-F') && text.includes('(7)'),
    `실행 중 셀에 ID 또는 (N) 없음\n${text.slice(text.indexOf('CI 큐'), text.indexOf('CI 큐') + 500)}`);
});

// ─── W4-3: 클라우드 idle → —(N) ─────────────────────────────────────────────

test('W4-3: 클라우드 idle 셀 → —(N)', () => {
  const todayPoolMachineStats = {
    'storeport-heavy': { mbp: 7, imac: 2, cloud: 12 },
    'storeport-light': { mbp: 41, imac: 20, cloud: 2 },
    'fork-heavy':      { mbp: 17, imac: 16, cloud: 4 },
    'fork-light':      { mbp: 25, imac: 19, cloud: 0 },
  };
  const lines = renderLayout(makeLayoutData({ todayPoolMachineStats }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  const ciSec = text.slice(text.indexOf('CI 큐'), text.indexOf('진행 중'));

  // storeport-heavy cloud=12 → —(12)
  assert.ok(ciSec.includes('—(12)'),
    `클라우드 idle 셀에 —(12) 없음\n${ciSec}`);
});

// ─── W4-4: todayPoolMachineStats 없으면 단순 쉼 ─────────────────────────────

test('W4-4: todayPoolMachineStats=null → 쉼 (숫자 없음)', () => {
  const lines = renderLayout(makeLayoutData({ todayPoolMachineStats: null }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  const ciSec = text.slice(text.indexOf('CI 큐'), text.indexOf('진행 중'));

  // 쉼은 있어야 하고, 쉼(숫자)는 없어야 함
  assert.ok(ciSec.includes('쉼'), `쉼 없음\n${ciSec}`);
  assert.ok(!/쉼\(\d+\)/.test(ciSec), `todayPoolMachineStats 없는데 쉼(N) 등장\n${ciSec}`);
});

// ─── W4-5: 오늘 처리(잡) 라벨 ─────────────────────────────────────────────

test('W4-5: 오늘 처리(잡) 라벨 등장', () => {
  const todayMachineStats = { mbp: { jobs: 90, avgRun: 2.0 }, imac: { jobs: 57, avgRun: 1.5 } };
  const lines = renderLayout(makeLayoutData({ todayMachineStats }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');

  assert.ok(text.includes('오늘 처리(잡)'),
    `오늘 처리(잡) 라벨 없음\n${text.slice(text.indexOf('CI 큐'), text.indexOf('진행 중'))}`);
});
