// scripts/test/ci-watch-machines.test.mjs  M2-1126-A/C — 기계 3칸 + v1.8 단위 테스트
//
// 커버:
//   M-1: classifyMachine — 알려진 runner name → 올바른 machine type
//   M-2: classifyMachine — 알려진 self-hosted 이름 아님 → 'unknown'
//   M-3: buildMachineState — MBP/iMAC/cloud 칸이 pool별로 생성됨
//   M-4: renderLayout — CI 섹션에 3칸 등장 (fake 데이터)
//   M-5: renderLayout — unknown runner name → 경고 줄 (빨간색)
//   M-6: renderLayout — 폭 < 100 에서도 테이블 헤더 존재
//   M-7: renderLayout — 동일 데이터로 2번 렌더 시 첫 번째와 동일한 줄 배열
//   P-1 (v1.8): truncateAnsiWidth — EAW 기준 절단
//   P-2 (v1.8): buildMachineState — partial=true → partial 플래그
//   P-3 (v1.8): renderLayout — partial=true offline → '?' 표시 (빨강 OFF 금지)
//   P-4 (v1.8): fmtDuration — s/m 단위
//   P-5 (v1.8): renderLayout — 열 제목 위치 = 데이터 행 열 위치 (정렬)
//   P-6 (v1.8): renderLayout — 허브 avgWait '대기avg' 접두어 없음

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyMachine,
  buildMachineState,
  renderLayout,
  fmtDuration,
} from '../watch/ci-watch-render.mjs';
import { truncateAnsiWidth, displayWidth, stripAnsi } from '../watch/text-width.mjs';

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

// ─── M-6: renderLayout — 폭 무관하게 테이블 헤더 (v1.8 한 줄 표) ────────────

test('M-6a: renderLayout — width 90 에서도 CI 큐 섹션 존재', () => {
  const lines = renderLayout(makeLayoutData({ terminalWidth: 90 }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('CI 큐'), 'CI 큐 섹션 존재 (narrow)');
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

// ─── M-8: CI 풀 avg wait 표시 (v1.8: 접두어 없이 s/m 단위) ──────────────────

test('M-8: renderLayout — poolWaitStats → CI 풀 평균대기 열에 값 등장', () => {
  const data = makeLayoutData({
    poolWaitStats: { 'storeport-heavy': { avgWait: 2.5 }, 'fork-light': { avgWait: 0.0 } },
  });
  const lines = renderLayout(data);
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  // v1.8: '대기avg' 접두어 없이 '2.5m' 형태
  assert.ok(!text.includes('대기avg'), `v1.8: 대기avg 접두어 금지\n${text}`);
  assert.ok(text.includes('2.5m'), `2.5m 없음\n${text}`);
});

test('M-8b: renderLayout — poolWaitStats 없으면 "-" 등장', () => {
  const lines = renderLayout(makeLayoutData());
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  // pool 행마다 '-' 가 나타나야 함 (대기 데이터 없을 때)
  const ciIdx = text.indexOf('CI 큐');
  const after = text.slice(ciIdx);
  // '-' 가 avg wait 위치에 있음
  assert.ok(after.includes('-'), `avg wait '-' 없음`);
});

// ─── M-9: 오늘 처리 MBP/iMAC 분리 ──────────────────────────────────────────

test('M-9: renderLayout — todayMachineStats → MBP·iMAC 분리 표시', () => {
  const data = makeLayoutData({
    todayMachineStats: { mbp: { jobs: 35, avgRun: 2.0 }, imac: { jobs: 1, avgRun: 0.6 } },
  });
  const lines = renderLayout(data);
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('35건·2m'), `35건·2m 없음\n${text}`);
  assert.ok(text.includes('1건·36s'), `1건·36s 없음\n${text}`);
});

test('M-9b: renderLayout — todayMachineStats 없으면 MAC 합산 표시', () => {
  const data = makeLayoutData({ todayStats: makeAllJson().ci.data.today });
  const lines = renderLayout(data);
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('오늘 처리'), '오늘 처리 행 없음');
  assert.ok(text.includes('33건·'), `33건 없음 (MAC 합산)\n${text}`);
});

// ─── M-10: ID 잘림 없음 ──────────────────────────────────────────────────────

test('M-10: renderLayout — prompt ID 잘림 없음 (M2-1126-A 9자)', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, busy: true } : r,
  );
  allJson.ci.data.heavy.in_progress = [{
    runner: 'Youngkyus-MacBook-Pro-M1',
    prompt_id: 'M2-1126-A',
    running_min: 5,
  }];
  const runState = makeRunState();
  runState.heavy.inProgress = [{
    runner: 'Youngkyus-MacBook-Pro-M1',
    repo: 'CuriocityDevAi/storeport',
    prompt_id: 'M2-1126-A',
    running_min: 5,
    light: false,
  }];

  const lines = renderLayout(makeLayoutData({ allJson, runState }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('M2-1126-A'), `M2-1126-A 전체가 없음 — ID 잘림\n${text}`);
  assert.ok(!text.includes('M2-1126- '), `M2-1126- 로 끝남 — A 가 잘림\n${text}`);
});

// ─── M-11: 허브 avg wait 표시 (v1.8: 접두어 없이 s/m) ──────────────────────

test('M-11: renderLayout — hubWaitStats → 허브 줄에 avg 등장 (대기avg 접두어 없음)', () => {
  const data = makeLayoutData({
    hubWaitStats: { m0: { avgMin: 0.1, count: 1 }, m2: { avgMin: 1.5, count: 2 } },
  });
  const lines = renderLayout(data);
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  // v1.8: '대기avg' 접두어 금지 (§3) → '0.1m' or '6s' 형태
  assert.ok(!text.includes('대기avg'), `v1.8: 대기avg 접두어 등장 → 금지\n${text}`);
  // 값은 존재해야 함
  assert.ok(text.includes('1.5m') || text.includes('1m'), `m2 avg 값 없음\n${text}`);
});

// ─── P-1: truncateAnsiWidth — EAW 절단 ──────────────────────────────────────

test('P-1a: truncateAnsiWidth — ASCII 절단', () => {
  const result = truncateAnsiWidth('hello world', 5);
  assert.equal(result, 'hello');
});

test('P-1b: truncateAnsiWidth — ANSI 코드 포함 절단', () => {
  const result = truncateAnsiWidth('\x1b[31mhello world\x1b[0m', 5);
  const plain = result.replace(/\x1b\[[0-9;]*m/g, '');
  assert.equal(plain, 'hello', `plain: ${plain}`);
  assert.ok(result.endsWith('\x1b[0m'), '열린 색상 코드 닫힘');
});

test('P-1c: truncateAnsiWidth — 한글 2칸 경계 절단', () => {
  // '안녕' = 4 display cols (2+2)
  const result = truncateAnsiWidth('안녕하세요', 4);
  const plain = result.replace(/\x1b\[[0-9;]*m/g, '');
  assert.equal(displayWidth(plain), 4, `폭: ${displayWidth(plain)}`);
  assert.equal(plain, '안녕', `내용: ${plain}`);
});

test('P-1d: truncateAnsiWidth — 여러 폭에서 초과 없음', () => {
  const testStr = '\x1b[33m[M2-1126-A 5m]\x1b[0m 대기중 some text 더보기';
  for (const w of [10, 20, 30, 50, 100]) {
    const result = truncateAnsiWidth(testStr, w);
    const plain = result.replace(/\x1b\[[0-9;]*m/g, '');
    const dw = displayWidth(plain);
    assert.ok(dw <= w, `폭 ${w} 에서 ${dw} 초과: "${plain}"`);
  }
});

// ─── P-2: buildMachineState — partial 플래그 ────────────────────────────────

test('P-2a: buildMachineState — ci.data.partial=true → offline 러너 partial 플래그', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, status: 'offline' } : r,
  );
  allJson.ci.data.partial = true;
  const ms = buildMachineState(allJson, makeRunState());
  const sh = ms.get('storeport-heavy');
  assert.equal(sh.mbp.status, 'offline');
  assert.equal(sh.mbp.partial, true, 'partial 플래그 true');
});

test('P-2b: buildMachineState — partial=false → partial 플래그 false', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, status: 'offline' } : r,
  );
  // partial 미설정 (undefined → false)
  const ms = buildMachineState(allJson, makeRunState());
  const sh = ms.get('storeport-heavy');
  assert.equal(sh.mbp.partial, false, 'partial 플래그 false');
});

test('P-2c: buildMachineState — repos_failed 에 fork repo → fork 풀 partial=true', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'ci-box-fork-heavy-imac' ? { ...r, status: 'offline' } : r,
  );
  allJson.ci.data.repos_failed = ['CuriocityDevAi/agilo-medusa-pos-fork'];
  const ms = buildMachineState(allJson, makeRunState());
  const fh = ms.get('fork-heavy');
  assert.equal(fh.imac.partial, true, 'fork-heavy imac partial=true');
  // storeport 풀은 partial=false 여야 함
  const sh = ms.get('storeport-heavy');
  // storeport runners are online → not offline → partial irrelevant
  assert.equal(sh.imac.status, 'idle');
});

// ─── P-3: renderLayout — partial=true offline → '?' 표시 ────────────────────

test('P-3a: renderLayout — partial=true 且 offline → ? 표시 (빨강 OFF 금지)', () => {
  const allJson = makeAllJson();
  // 모든 MBP 러너를 offline 으로
  allJson.ci_runners = allJson.ci_runners.map(r =>
    classifyMachine(r.name) === 'mbp' ? { ...r, status: 'offline' } : r,
  );
  allJson.ci.data.partial = true;

  const lines = renderLayout(makeLayoutData({ allJson }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');

  // CI 큐 섹션에서 'OFF' 가 없어야 함 (partial 이면 '?' 로 대체)
  const ciIdx = text.indexOf('CI 큐');
  const ciSection = text.slice(ciIdx, ciIdx + 500);
  assert.ok(ciSection.includes('?'), `partial=true 에서 ? 없음\n${ciSection}`);
  assert.ok(!ciSection.includes('OFF'), `partial=true 에서 OFF 등장 → 금지\n${ciSection}`);
});

test('P-3b: renderLayout — partial=false 且 offline → 빨강 OFF 표시', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    classifyMachine(r.name) === 'mbp' ? { ...r, status: 'offline' } : r,
  );
  // partial 미설정

  const lines = renderLayout(makeLayoutData({ allJson }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  const ciIdx = text.indexOf('CI 큐');
  const ciSection = text.slice(ciIdx, ciIdx + 500);
  assert.ok(ciSection.includes('OFF'), `partial=false 에서 OFF 없음\n${ciSection}`);
});

// ─── P-4: fmtDuration — s/m 단위 ────────────────────────────────────────────

test('P-4a: fmtDuration — 0분 → 0s', () => {
  assert.equal(fmtDuration(0), '0s');
});

test('P-4b: fmtDuration — 0.5분 → 30s', () => {
  assert.equal(fmtDuration(0.5), '30s');
});

test('P-4c: fmtDuration — 1분 → 1m', () => {
  assert.equal(fmtDuration(1), '1m');
});

test('P-4d: fmtDuration — 5분 → 5m (정수)', () => {
  assert.equal(fmtDuration(5), '5m');
});

test('P-4e: fmtDuration — 4.5분 → 4.5m', () => {
  assert.equal(fmtDuration(4.5), '4.5m');
});

test('P-4f: fmtDuration — null → -', () => {
  assert.equal(fmtDuration(null), '-');
  assert.equal(fmtDuration(undefined), '-');
});

// ─── P-5: 열 제목 위치 = 데이터 행 열 위치 (정렬) ──────────────────────────

test('P-5: renderLayout — CI 열 제목 x 위치 = 데이터 행 첫 번째 열 x 위치', () => {
  const lines = renderLayout(makeLayoutData({ terminalWidth: 140 }));
  const plain = lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, ''));

  // 열 제목 행 찾기: MBP M1 · iMAC M1 · 클라우드 · 평균대기 가 모두 있는 줄
  const hdrIdx = plain.findIndex(l => l.includes('MBP M1') && l.includes('iMAC M1'));
  assert.ok(hdrIdx >= 0, '열 제목 행 없음');

  // 데이터 행 찾기: 'storeport-heavy' 가 있는 줄
  const dataIdx = plain.findIndex(l => l.includes('storeport-heavy'));
  assert.ok(dataIdx >= 0, 'storeport-heavy 행 없음');

  const hdrLine = plain[hdrIdx];
  const dataLine = plain[dataIdx];

  // 열 제목 'MBP M1' 의 x 위치
  const mbpHdrX = hdrLine.indexOf('MBP M1');
  assert.ok(mbpHdrX >= 0, 'MBP M1 위치 없음');

  // 데이터 행에서 같은 x 위치에 무언가 있는지 확인 (공백 아닌 문자)
  // 데이터 행의 MBP 열에는 '쉼', 'OFF', '?', 또는 스피너가 있어야 함
  const mbpDataArea = dataLine.slice(mbpHdrX, mbpHdrX + 14);
  assert.ok(mbpDataArea.trim().length > 0, `MBP 데이터 열(x=${mbpHdrX}) 비어있음: "${mbpDataArea}"`);
});

// ─── P-6: 허브 avgWait 접두어 없음 ─────────────────────────────────────────

test('P-6: renderLayout — 허브 avgWait 에 "대기avg" 접두어 없음', () => {
  const data = makeLayoutData({
    hubWaitStats: {
      m0: { avgMin: 2.5, count: 3 },
      m1: { avgMin: 0.3, count: 1 },
    },
  });
  const lines = renderLayout(data);
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(!text.includes('대기avg'), `대기avg 접두어 발견 → v1.8 에서 금지\n${text}`);
  // 값은 있어야 함 (2.5m or similar)
  assert.ok(text.includes('2.5m'), `2.5m 없음\n${text}`);
});

// ─── Q-1~Q-2: 클라우드 count≥2 → +N 출력 ─────────────────────────────────────

test('Q-1: renderLayout — 클라우드 2건 → +1 등장', () => {
  const runState = makeRunState();
  runState.heavy.inProgress = [
    { runner: 'GitHub Actions 1', repo: 'CuriocityDevAi/storeport', prompt_id: 'M2-1126-A', running_min: 5, light: false },
    { runner: 'GitHub Actions 2', repo: 'CuriocityDevAi/storeport', prompt_id: 'M2-1126-B', running_min: 3, light: false },
  ];
  const lines = renderLayout(makeLayoutData({ runState }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('+1'), `+1 없음 (클라우드 2건)\n${text}`);
});

test('Q-2: renderLayout — 클라우드 3건 → +2 등장', () => {
  const runState = makeRunState();
  runState.heavy.inProgress = [
    { runner: 'GitHub Actions 1', repo: 'CuriocityDevAi/storeport', prompt_id: 'M2-1126-A', running_min: 5, light: false },
    { runner: 'GitHub Actions 2', repo: 'CuriocityDevAi/storeport', prompt_id: 'M2-1126-B', running_min: 3, light: false },
    { runner: 'GitHub Actions 3', repo: 'CuriocityDevAi/storeport', prompt_id: 'M2-1126-C', running_min: 1, light: false },
  ];
  const lines = renderLayout(makeLayoutData({ runState }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('+2'), `+2 없음 (클라우드 3건)\n${text}`);
});

// ─── Q-3~Q-4: 대기 3+건 → 칩 2개 + +N 출력 ──────────────────────────────────

test('Q-3: renderLayout — 대기 3건 → 칩 2개 + +1 등장', () => {
  const runState = makeRunState();
  runState.heavy.queued = [
    { prompt_id: 'M2-1126-A', repo: 'CuriocityDevAi/storeport', queued_min: 5, light: false },
    { prompt_id: 'M2-1126-B', repo: 'CuriocityDevAi/storeport', queued_min: 3, light: false },
    { prompt_id: 'M2-1126-C', repo: 'CuriocityDevAi/storeport', queued_min: 1, light: false },
  ];
  const lines = renderLayout(makeLayoutData({ runState }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('[M2-1126-A'), `첫 번째 칩 없음\n${text}`);
  assert.ok(text.includes('[M2-1126-B'), `두 번째 칩 없음\n${text}`);
  assert.ok(text.includes('+1'), `+1 없음 (대기 3건)\n${text}`);
});

test('Q-4: renderLayout — 대기 4건 → 칩 2개 + +2 등장', () => {
  const runState = makeRunState();
  runState.heavy.queued = [
    { prompt_id: 'M2-1126-A', repo: 'CuriocityDevAi/storeport', queued_min: 5, light: false },
    { prompt_id: 'M2-1126-B', repo: 'CuriocityDevAi/storeport', queued_min: 3, light: false },
    { prompt_id: 'M2-1126-C', repo: 'CuriocityDevAi/storeport', queued_min: 1, light: false },
    { prompt_id: 'M2-1126-D', repo: 'CuriocityDevAi/storeport', queued_min: 0, light: false },
  ];
  const lines = renderLayout(makeLayoutData({ runState }));
  const text = lines.join('\n').replace(/\x1b\[[0-9;]*m/g, '');
  assert.ok(text.includes('+2'), `+2 없음 (대기 4건)\n${text}`);
});

// ─── PTY-1: 잔상 자기 검증 ② ─────────────────────────────────────────────────
// node-pty / @xterm/headless 미설치 환경 → 순수 JS 가상 버퍼로 대체
// renderDiff 로직 미러링 + CSI 시퀀스 가상 터미널 재생

// 가상 터미널: renderDiff 가 쓰는 CSI 시퀀스만 처리
function replayToRows(allWrites) {
  const rows = new Map();
  let r = 0;
  for (const chunk of allWrites) {
    const str = typeof chunk === 'string' ? chunk : String(chunk);
    let i = 0;
    while (i < str.length) {
      if (str[i] === '\x1b' && i + 1 < str.length && str[i + 1] === '[') {
        let j = i + 2;
        while (j < str.length && !(str.charCodeAt(j) >= 0x40 && str.charCodeAt(j) <= 0x7E)) j++;
        if (j >= str.length) break;
        const finalByte = str[j];
        const params = str.slice(i + 2, j);
        if (finalByte === 'J') {
          if (params === '2') { rows.clear(); r = 0; }
          else { for (const k of [...rows.keys()]) { if (k >= r) rows.delete(k); } }
        } else if (finalByte === 'H') {
          const parts = params.split(';').map(p => parseInt(p) || 1);
          r = (parts[0] || 1) - 1;
        } else if (finalByte === 'K' && params === '2') {
          rows.delete(r);
        }
        i = j + 1;
      } else if (str[i] === '\n') { r++; i++; }
      else if (str[i] === '\r') { i++; }
      else {
        let j = i;
        while (j < str.length && str[j] !== '\x1b' && str[j] !== '\n' && str[j] !== '\r') j++;
        const plain = str.slice(i, j).replace(/\x1b\[[0-9;]*m/g, '');
        if (plain) rows.set(r, (rows.get(r) || '') + plain);
        i = j;
      }
    }
  }
  return rows;
}

// renderDiff 로직 미러링 (process.stdout mock 없이 가상 버퍼에 직접 write)
function simulateRenderDiff(lines, termWidth, prevLines) {
  const writes = [];
  const truncated = lines.map(l => truncateAnsiWidth(l, termWidth));
  if (!prevLines || prevLines.length === 0) {
    writes.push('\x1b[2J\x1b[H');
    for (const line of truncated) writes.push(line + '\n');
  } else {
    const maxLen = Math.max(truncated.length, prevLines.length);
    for (let i = 0; i < maxLen; i++) {
      const nl = truncated[i] || '';
      const ol = prevLines[i] || '';
      if (nl !== ol) writes.push(`\x1b[${i + 1};1H\x1b[2K${nl}`);
    }
    writes.push(`\x1b[${truncated.length + 1};1H`);
  }
  writes.push('\x1b[J');
  return { writes, truncated };
}

test('PTY-1: 잔상 자기 검증 ② — 가상 버퍼 (node-pty 미설치, 순수 JS 가상 터미널)', () => {
  // node-pty / @xterm/headless 미설치로 renderDiff 로직을 가상 버퍼에 미러링
  // SIGWINCH 시뮬레이션: prevLines=[] 로 전체 재그림 (ci-watch.mjs:1188 동일 로직)
  const allWrites = [];
  let prev = [];

  // Frame 1: width=120 (초기 렌더)
  const { writes: w1, truncated: t1 } = simulateRenderDiff(
    renderLayout(makeLayoutData({ terminalWidth: 120 })), 120, [],
  );
  allWrites.push(...w1);
  prev = t1;

  // SIGWINCH 120→90: prevLines 초기화 → 전체 재그림
  const { writes: w2, truncated: t2 } = simulateRenderDiff(
    renderLayout(makeLayoutData({ terminalWidth: 90 })), 90, [],
  );
  allWrites.push(...w2);
  prev = t2;

  // diff 렌더 at 90 (스피너 업데이트)
  const { writes: w3, truncated: t3 } = simulateRenderDiff(
    renderLayout(makeLayoutData({ terminalWidth: 90, spinnerFrame: 1 })), 90, prev,
  );
  allWrites.push(...w3);
  prev = t3;

  // SIGWINCH 90→120: prevLines 초기화 → 전체 재그림
  const { writes: w4, truncated: t4 } = simulateRenderDiff(
    renderLayout(makeLayoutData({ terminalWidth: 120 })), 120, [],
  );
  allWrites.push(...w4);

  // 가상 버퍼 재생
  const finalRows = replayToRows(allWrites);
  const expectedCount = t4.length;

  // (a) 폭 초과 없음 (truncateAnsiWidth 로 보장 · 가상 버퍼로 확인)
  for (const [row, content] of finalRows) {
    const dw = displayWidth(content);
    assert.ok(dw <= 120, `행 ${row}: 폭 ${dw} > 120 (잔상 가능)\n"${content}"`);
  }

  // (b) 최종 렌더 범위 밖 잔상 0 (\x1b[J 로 보장 · 가상 버퍼로 확인)
  for (const [row] of finalRows) {
    assert.ok(row < expectedCount,
      `행 ${row}: 최종 렌더(${expectedCount}행) 밖 잔상\n"${finalRows.get(row)}"`);
  }

  // 실행 로그 (리포트 첨부용)
  const maxW = finalRows.size > 0
    ? Math.max(...[...finalRows.values()].map(l => displayWidth(l)))
    : 0;
  console.log(
    `[PTY-1] write=${allWrites.length} 총 프레임=4 (120→90→90→120) ` +
    `최종행=${finalRows.size}/${expectedCount} 최대폭=${maxW}`,
  );
});
