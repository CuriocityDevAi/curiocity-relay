// scripts/test/ci-watch-k.test.mjs  M1-1123-K — ci-watch 렌더 + 헬퍼 단위 테스트

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isMarkerJob,
  countRealCloud,
  filterFreshUnclaimed,
  classifyRunner,
  buildRunnerRows,
  renderCompact,
} from '../watch/ci-watch-render.mjs';

// ---- K-1: 마커 잡 제외 ----

test('K-1a: isMarkerJob — route/heavy-cloud/ci-summary 는 마커', () => {
  assert.equal(isMarkerJob('route'), true);
  assert.equal(isMarkerJob('heavy-cloud'), true);
  assert.equal(isMarkerJob('ci-summary'), true);
  assert.equal(isMarkerJob('ci-summary-daily'), true);
  assert.equal(isMarkerJob('feature-map-route'), true);
});

test('K-1b: isMarkerJob — 실제 검사 잡은 마커 아님', () => {
  assert.equal(isMarkerJob('assertions'), false);
  assert.equal(isMarkerJob('flow-tests'), false);
  assert.equal(isMarkerJob('playwright'), false);
  assert.equal(isMarkerJob('lint'), false);
  assert.equal(isMarkerJob('heavy-mac'), false);
  assert.equal(isMarkerJob(null), false);
  assert.equal(isMarkerJob(''), false);
});

test('K-1c: countRealCloud — 마커 잡·mac 잡 제외하고 cloud 실제 잡만 카운트', () => {
  const records = [
    { runner_kind: 'cloud', job: 'route' },        // 마커 → 제외
    { runner_kind: 'cloud', job: 'heavy-cloud' },  // 마커 → 제외
    { runner_kind: 'cloud', job: 'assertions' },   // 실제 → 포함
    { runner_kind: 'mac-heavy', job: 'playwright' }, // mac → 제외
    { runner_kind: 'cloud', job: 'lint' },         // 실제 → 포함
    { runner_kind: 'cloud', job: 'ci-summary' },   // 마커 → 제외
  ];
  assert.equal(countRealCloud(records), 2);
});

// ---- K-2: 오래된 큐 제외 ----

test('K-2a: filterFreshUnclaimed — 24시간 미만만 통과', () => {
  const items = [
    { id: 'R0-1105-BA', ageMin: 18944 },  // 13일 → 제외
    { id: 'M1-1123-J',  ageMin: 3   },   // 3분 → 포함
    { id: 'M0-1123-X',  ageMin: 1500 },  // 25h → 제외
    { id: 'M1-1123-K',  ageMin: 1   },   // 1분 → 포함
  ];
  const fresh = filterFreshUnclaimed(items);
  assert.deepEqual(fresh.map(i => i.id), ['M1-1123-J', 'M1-1123-K']);
});

test('K-2b: filterFreshUnclaimed — 정확히 24h = 1440분은 제외', () => {
  const items = [{ id: 'X', ageMin: 1440 }];
  assert.equal(filterFreshUnclaimed(items).length, 0);
});

test('K-2c: filterFreshUnclaimed — 1439분은 포함', () => {
  const items = [{ id: 'X', ageMin: 1439 }];
  assert.equal(filterFreshUnclaimed(items).length, 1);
});

// ---- K-3: 러너 4대 / 역할 분류 ----

test('K-3a: classifyRunner — 이름 → repo×role 분류', () => {
  assert.deepEqual(classifyRunner('curiocity-mac-light'), { repo: 'storeport', role: 'light' });
  assert.deepEqual(classifyRunner('Youngkyus-MacBook-Pro-M1'), { repo: 'storeport', role: 'heavy' });
  assert.deepEqual(classifyRunner('curiocity-mac-fork'), { repo: 'fork', role: 'heavy' });
  assert.deepEqual(classifyRunner('curiocity-mac-fork-light'), { repo: 'fork', role: 'light' });
  assert.deepEqual(classifyRunner('new-runner-fork-light-v2'), { repo: 'fork', role: 'light' });
  assert.deepEqual(classifyRunner('storeport-light-v3'), { repo: 'storeport', role: 'light' });
});

test('K-3b: buildRunnerRows — 4슬롯 모두 채워짐', () => {
  const ciRunners = [
    { name: 'curiocity-mac-light', status: 'online', busy: false },
    { name: 'Youngkyus-MacBook-Pro-M1', status: 'online', busy: true },
    { name: 'curiocity-mac-fork', status: 'online', busy: false },
    { name: 'curiocity-mac-fork-light', status: 'online', busy: false },
  ];
  const rows = buildRunnerRows(ciRunners, []);
  assert.equal(rows.length, 4);
  const repos = rows.map(r => `${r.repo}-${r.role}`);
  assert.deepEqual(repos, ['storeport-heavy', 'storeport-light', 'fork-heavy', 'fork-light']);
});

test('K-3c: buildRunnerRows — fork-light offline 시 offline 행 포함', () => {
  const ciRunners = [
    { name: 'curiocity-mac-light', status: 'online', busy: false },
    { name: 'Youngkyus-MacBook-Pro-M1', status: 'online', busy: false },
    { name: 'curiocity-mac-fork', status: 'online', busy: false },
    // fork-light 없음
  ];
  const rows = buildRunnerRows(ciRunners, []);
  const forkLight = rows.find(r => r.repo === 'fork' && r.role === 'light');
  assert.ok(forkLight, 'fork-light 행 존재');
  assert.equal(forkLight.status, 'offline');
  assert.equal(forkLight.name, null);
});

test('K-3d: buildRunnerRows — 새 러너 이름(fork-v2-light) 자동 포함', () => {
  const ciRunners = [
    { name: 'curiocity-mac-light', status: 'online', busy: false },
    { name: 'Youngkyus-MacBook-Pro-M1', status: 'online', busy: false },
    { name: 'curiocity-mac-fork', status: 'online', busy: false },
    { name: 'curiocity-mac-fork-v2-light', status: 'online', busy: false },
  ];
  const rows = buildRunnerRows(ciRunners, []);
  const forkLight = rows.find(r => r.repo === 'fork' && r.role === 'light');
  assert.equal(forkLight?.status, 'online');
  assert.equal(forkLight?.name, 'curiocity-mac-fork-v2-light');
});

test('K-3e: buildRunnerRows — 잡 정보 연결 (runner 이름 기준)', () => {
  const ciRunners = [
    { name: 'Youngkyus-MacBook-Pro-M1', status: 'online', busy: true },
    { name: 'curiocity-mac-light', status: 'online', busy: false },
    { name: 'curiocity-mac-fork', status: 'online', busy: false },
    { name: 'curiocity-mac-fork-light', status: 'online', busy: false },
  ];
  const inProgressAll = [
    { runner: 'Youngkyus-MacBook-Pro-M1', repo: 'CuriocityDevAi/storeport', pr: '#414', pr_display: 'storeport:#414', job: 'heavy-mac', running_min: 5 },
  ];
  const rows = buildRunnerRows(ciRunners, inProgressAll);
  const sh = rows.find(r => r.repo === 'storeport' && r.role === 'heavy');
  assert.ok(sh?.job, 'storeport-heavy 에 잡 연결됨');
  assert.equal(sh.job.pr, '#414');
  assert.equal(sh.job.running_min, 5);
});

// ---- K-4: 40줄 이내 렌더 (최대 데이터) ----

function makeMaxData() {
  // 경보 5개, cloud 3개, err_tail 2줄
  const ciRunners = [
    { name: 'Youngkyus-MacBook-Pro-M1', status: 'online', busy: true },
    { name: 'curiocity-mac-light', status: 'online', busy: false },
    { name: 'curiocity-mac-fork', status: 'online', busy: true },
    { name: 'curiocity-mac-fork-light', status: 'offline', busy: false },
  ];
  const inProgressAll = [
    { runner: 'Youngkyus-MacBook-Pro-M1', pr: '#414', pr_display: 'storeport:#414', job: 'heavy-mac', running_min: 30 },
    { runner: 'curiocity-mac-fork', pr: '#233', pr_display: 'fork:#233', job: 'playwright', running_min: 27 },
  ];
  const allJson = {
    at: new Date(Date.now() - 2 * 60000).toISOString(),
    runner: 'v7.7', pid: 12345,
    hubs: {
      m0: { current: 'M0-1123-G', started_at: new Date(Date.now() - 16 * 60000).toISOString() },
      m1: { current: 'M1-1123-K', started_at: new Date(Date.now() - 1 * 60000).toISOString() },
      m2: { current: 'M2-1123-F', started_at: new Date(Date.now() - 0.5 * 60000).toISOString() },
      m3: { current: null },
      r0: { current: null },
    },
    git_state: { ahead: 0, behind: 0, rebase_in_progress: false, needs_human: false, conflicted: [] },
    ci_runners: ciRunners,
    ci: { data: { heavy: { in_progress: inProgressAll }, light: { in_progress: [] } } },
    err_tail: 'error line 1\nerror line 2',
  };
  const runState = {
    heavy: {
      inProgress: [
        { repo: 'CuriocityDevAi/storeport', pr: '#414', display: 'storeport:#414', prompt_id: 'M1-1123-J', check: 'heavy-mac', running_min: 30, queued_min: null, light: false },
      ],
      queued: [
        { repo: 'CuriocityDevAi/storeport', pr: '#415', display: 'storeport:#415', prompt_id: null, check: 'heavy-mac', queued_min: 15, created_at: new Date(Date.now() - 15 * 60000).toISOString(), light: false },
        { repo: 'CuriocityDevAi/agilo-medusa-pos-fork', pr: '#236', display: 'fork:#236', prompt_id: null, check: 'playwright', queued_min: 5, created_at: new Date(Date.now() - 5 * 60000).toISOString(), light: false },
      ],
    },
    light: {
      inProgress: [],
      queued: [],
    },
  };
  const cloudData = {
    realCount: 3, limit: 5, totalMin: 32.5,
    last3: [
      { job: 'assertions', conclusion: 'success', run_min: 1.2 },
      { job: 'playwright', conclusion: 'failure', run_min: 23.1 },
      { job: 'lint', conclusion: 'success', run_min: 0.9 },
    ],
  };
  const runnerAlerts = [
    { type: 'runner_offline', msg: 'fork-light offline' },
    { type: 'long_running', msg: '잡 30분 경과 (storeport:#414)' },
    { type: 'long_running', msg: '잡 27분 경과 (fork:#233)' },
  ];
  const ciAlerts = [
    { type: 'queue_wait', detail: 'heavy 대기 15분 (storeport:#415)' },
    { type: 'light_blocked', detail: 'light 대기 ...' },
  ];
  const timeStr = '2026/11/23 22:35:06';
  return { allJson, runState, cloudData, runnerAlerts, ciAlerts, timeStr, fullMode: false };
}

test('K-4a: renderCompact — 최대 데이터에서 40줄 이내', () => {
  const data = makeMaxData();
  const lines = renderCompact(data);
  // ANSI 코드 제거 후 실제 줄 수 확인
  const printableLines = lines.filter(l => l.replace(/\x1b\[[0-9;]*m/g, '').trim() !== '' || l === '');
  assert.ok(
    lines.length <= 40,
    `렌더 결과 ${lines.length}줄 — 40줄 초과: \n${lines.join('\n')}`,
  );
});

test('K-4b: renderCompact — 필수 섹션 포함 확인', () => {
  const data = makeMaxData();
  const lines = renderCompact(data);
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');

  assert.ok(text.includes('경보'), '상태 헤더에 경보 포함');
  assert.ok(text.includes('m0'), 'hub m0 포함');
  assert.ok(text.includes('storeport-heavy'), 'storeport-heavy 러너 행 포함');
  assert.ok(text.includes('fork-light'), 'fork-light 러너 행 포함');
  assert.ok(text.includes('cloud 잡 오늘'), '클라우드 섹션 포함');
  assert.ok(text.includes('⚠'), '경보 포함');
});

test('K-4c: renderCompact — 경보 없을 때 정상 표시', () => {
  const data = makeMaxData();
  data.runnerAlerts = [];
  data.ciAlerts = [];
  const lines = renderCompact(data);
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('정상'), '경보 없을 때 정상 표시');
});

test('K-4d: renderCompact — allJson 없어도 오류 없이 렌더', () => {
  const data = makeMaxData();
  data.allJson = null;
  let lines;
  assert.doesNotThrow(() => { lines = renderCompact(data); });
  assert.ok(Array.isArray(lines) && lines.length > 0, '줄 배열 반환');
});
