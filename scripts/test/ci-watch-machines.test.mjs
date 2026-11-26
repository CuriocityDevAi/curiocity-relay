// scripts/test/ci-watch-machines.test.mjs  M2-1126-A — 기계 3칸 단위 테스트
//
// 커버:
//   M-1: classifyMachine — 알려진 runner name → 올바른 machine type
//   M-2: classifyMachine — 알려진 self-hosted 이름 아님 → 'unknown'
//   M-3: buildMachineState — MBP/iMAC/cloud 칸이 pool별로 생성됨
//   M-4: renderLayout — CI 섹션에 3칸 등장 (fake 데이터)
//   M-5: renderLayout — unknown runner name → 경고 줄 (빨간색)
//   M-6: renderLayout — 폭 < 100 → cloud 칸 미등장
//   M-7: renderLayout — 동일 데이터로 2번 렌더 시 첫 번째와 동일한 줄 배열

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyMachine,
  buildMachineState,
  renderLayout,
} from '../watch/ci-watch-render.mjs';

// ─── M-1: classifyMachine — 알려진 runner name ─────────────────────────────

test('M-1a: classifyMachine — ci-box-*-imac → imac', () => {
  assert.equal(classifyMachine('ci-box-storeport-heavy-imac'), 'imac');
  assert.equal(classifyMachine('ci-box-storeport-light-imac'), 'imac');
  assert.equal(classifyMachine('ci-box-fork-heavy-imac'), 'imac');
  assert.equal(classifyMachine('ci-box-fork-light-imac'), 'imac');
});

test('M-1b: classifyMachine — Youngkyus-MacBook* → mbp', () => {
  assert.equal(classifyMachine('Youngkyus-MacBook-Pro-M1'), 'mbp');
});

test('M-1c: classifyMachine — curiocity-mac-* → mbp', () => {
  assert.equal(classifyMachine('curiocity-mac-light'), 'mbp');
  assert.equal(classifyMachine('curiocity-mac-fork'), 'mbp');
  assert.equal(classifyMachine('curiocity-mac-fork-light'), 'mbp');
});

test('M-1d: classifyMachine — GitHub-hosted → cloud', () => {
  assert.equal(classifyMachine('GitHub Actions 2'), 'cloud');
  assert.equal(classifyMachine('ubuntu-latest'), 'cloud');
  assert.equal(classifyMachine('macos-14'), 'cloud');
});

test('M-1e: classifyMachine — null/undefined → cloud', () => {
  assert.equal(classifyMachine(null), 'cloud');
  assert.equal(classifyMachine(undefined), 'cloud');
  assert.equal(classifyMachine(''), 'cloud');
});

// ─── M-2: classifyMachine — unknown self-hosted ────────────────────────────

test('M-2a: classifyMachine — 미지 self-hosted → unknown', () => {
  assert.equal(classifyMachine('some-custom-runner'), 'unknown');
  assert.equal(classifyMachine('my-box-new'), 'unknown');
});

test('M-2b: classifyMachine — ci-box 이지만 -imac 없으면 unknown', () => {
  // ci-box-... 가 -imac 으로 끝나지 않으면 unknown
  assert.equal(classifyMachine('ci-box-storeport-heavy'), 'unknown');
  assert.equal(classifyMachine('ci-box-other-mac'), 'unknown');
});

// ─── M-3: buildMachineState — MBP/iMAC/cloud 칸 생성 ─────────────────────

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
          'mac-heavy': { jobs: 11, avg_wait_min: 1, avg_run_min: 4.7, success_rate: 81.8 },
          'mac-light': { jobs: 22, avg_wait_min: 10.4, avg_run_min: 2.0, success_rate: 90.0 },
          cloud: { jobs: 2, avg_run_min: 8.0, success_rate: 100 },
          cloud_cost_est_usd: 0.15,
        },
      },
    },
    hubs: { m0: { current: null }, m1: { current: null }, m2: { current: null }, m3: { current: null }, r0: { current: null } },
    git_state: { ahead: 0, behind: 0, rebase_in_progress: false, needs_human: false },
  };
}

function makeRunState() {
  return {
    heavy: { inProgress: [], queued: [] },
    light: { inProgress: [], queued: [] },
  };
}

test('M-3a: buildMachineState — 4개 풀 키 존재', () => {
  const ms = buildMachineState(makeAllJson(), makeRunState());
  assert.ok(ms.has('storeport-heavy'), 'storeport-heavy 풀 존재');
  assert.ok(ms.has('storeport-light'), 'storeport-light 풀 존재');
  assert.ok(ms.has('fork-heavy'), 'fork-heavy 풀 존재');
  assert.ok(ms.has('fork-light'), 'fork-light 풀 존재');
  assert.equal(ms.size, 4);
});

test('M-3b: buildMachineState — storeport-heavy 에 mbp·imac·cloud 필드 존재', () => {
  const ms = buildMachineState(makeAllJson(), makeRunState());
  const sh = ms.get('storeport-heavy');
  assert.ok(sh, 'storeport-heavy 존재');
  assert.ok('mbp' in sh, 'mbp 필드 존재');
  assert.ok('imac' in sh, 'imac 필드 존재');
  assert.ok('cloud' in sh, 'cloud 필드 존재');
});

test('M-3c: buildMachineState — online runner 는 idle 상태', () => {
  const ms = buildMachineState(makeAllJson(), makeRunState());
  const sh = ms.get('storeport-heavy');
  assert.equal(sh.mbp.status, 'idle');
  assert.equal(sh.imac.status, 'idle');
  assert.equal(sh.cloud.count, 0);
});

test('M-3d: buildMachineState — offline runner → offline 상태', () => {
  const allJson = makeAllJson();
  // storeport-heavy MBP runner 를 offline 으로
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, status: 'offline' } : r,
  );
  const ms = buildMachineState(allJson, makeRunState());
  const sh = ms.get('storeport-heavy');
  assert.equal(sh.mbp.status, 'offline');
});

test('M-3e: buildMachineState — in_progress 잡 → running 상태 + job 정보', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, busy: true } : r,
  );
  allJson.ci.data.heavy.in_progress = [{
    runner: 'Youngkyus-MacBook-Pro-M1',
    pr: '#414',
    prompt_id: 'M2-1126-A',
    running_min: 5,
  }];
  const runState = makeRunState();
  runState.heavy.inProgress = [{
    runner: 'Youngkyus-MacBook-Pro-M1',
    repo: 'CuriocityDevAi/storeport',
    pr: '#414',
    prompt_id: 'M2-1126-A',
    running_min: 5,
    light: false,
  }];

  const ms = buildMachineState(allJson, runState);
  const sh = ms.get('storeport-heavy');
  assert.equal(sh.mbp.status, 'running');
  assert.ok(sh.mbp.job, 'job 정보 존재');
  assert.equal(sh.mbp.job.promptId, 'M2-1126-A');
  assert.equal(sh.mbp.job.min, 5);
});

// ─── M-4: renderLayout — CI 섹션에 3칸 등장 (wide 모드) ──────────────────

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
    terminalWidth: 120,
    version: '1.6',
    versionNote: '',
    ...overrides,
  };
}

test('M-4a: renderLayout — 줄 배열 반환', () => {
  const lines = renderLayout(makeLayoutData());
  assert.ok(Array.isArray(lines), '배열 반환');
  assert.ok(lines.length > 0, '줄 1개 이상');
});

test('M-4b: renderLayout — CI 큐 섹션 존재', () => {
  const lines = renderLayout(makeLayoutData());
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('CI 큐'), 'CI 큐 섹션 존재');
});

test('M-4c: renderLayout — wide 모드에서 MBP M1 · iMAC M1 · 클라우드 칸 타이틀 등장', () => {
  const lines = renderLayout(makeLayoutData({ terminalWidth: 120 }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('MBP M1'), 'MBP M1 칼럼 타이틀 존재');
  assert.ok(text.includes('iMAC M1'), 'iMAC M1 칼럼 타이틀 존재');
  assert.ok(text.includes('클라우드'), '클라우드 칼럼 타이틀 존재');
});

test('M-4d: renderLayout — 허브 큐 섹션 존재', () => {
  const lines = renderLayout(makeLayoutData());
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('허브 큐'), '허브 큐 섹션 존재');
});

test('M-4e: renderLayout — allJson null 이어도 오류 없음', () => {
  const data = makeLayoutData({ allJson: null });
  let lines;
  assert.doesNotThrow(() => { lines = renderLayout(data); });
  assert.ok(Array.isArray(lines) && lines.length > 0, '줄 배열 반환');
});

// ─── M-5: renderLayout — unknown runner → 경고 줄 ────────────────────────

test('M-5: renderLayout — unknown runner name → 주의 줄 등장', () => {
  const allJson = makeAllJson();
  // 미분류 self-hosted runner 추가
  allJson.ci_runners.push({ name: 'my-custom-runner-xyz', status: 'online', busy: false });
  const lines = renderLayout(makeLayoutData({ allJson }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(
    text.includes('미분류 러너') || text.includes('my-custom-runner-xyz'),
    `미분류 러너 경고 줄 없음. 출력:\n${text}`,
  );
});

// ─── M-6: renderLayout — 폭 < 100 → cloud 칸 미등장 ─────────────────────

test('M-6a: renderLayout — width < 100 → 클라우드 칼럼 타이틀 없음', () => {
  const lines = renderLayout(makeLayoutData({ terminalWidth: 90 }));
  // CI 섹션 헤더 줄만 추출
  const ciHeaderLine = lines.find(l => l.replace(/\x1b\[[0-9;]*m/g, '').includes('CI 큐'));
  assert.ok(ciHeaderLine, 'CI 큐 헤더 줄 존재');
  const plain = ciHeaderLine.replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(!plain.includes('클라우드') || plain.includes('+클라우드'), '클라우드 칼럼 타이틀 없음 (또는 +N클라우드 형식)');
});

test('M-6b: renderLayout — width >= 100 → 클라우드 칼럼 타이틀 존재', () => {
  const lines = renderLayout(makeLayoutData({ terminalWidth: 100 }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('클라우드'), '클라우드 칼럼 타이틀 존재 (wide)');
});

// ─── M-7: renderLayout — 동일 데이터 2번 렌더 시 동일한 줄 배열 ──────────

test('M-7: renderLayout — 동일 데이터 2번 렌더 시 동일한 줄 수/내용 (spinnerFrame 고정)', () => {
  const data = makeLayoutData({ spinnerFrame: 3 });
  const lines1 = renderLayout(data);
  const lines2 = renderLayout(data);

  assert.equal(lines1.length, lines2.length, '줄 수 동일');

  let diffCount = 0;
  for (let i = 0; i < lines1.length; i++) {
    if (lines1[i] !== lines2[i]) diffCount++;
  }
  assert.equal(diffCount, 0, `동일 데이터에서 ${diffCount}줄이 다름 (차분 렌더 오류)`);
});
