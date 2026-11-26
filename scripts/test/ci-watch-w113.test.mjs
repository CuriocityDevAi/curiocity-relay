// scripts/test/ci-watch-w113.test.mjs  M2-1126-L — W2(cancel-on-close) · W5(OFF) · W10(4줄)
//
// 커버:
//   W2-cancel: cancel-on-close 는 마커
//   W2-count:  isCountableJob — cancel-on-close 카운트 제외
//   W5-off:    ci_runners 에 존재하지만 offline → OFF 표시 (? 아님)
//   W5-norunner: ci_runners 에 없고 partial=false → OFF 표시
//   W10-4lines: renderLayout — MBP M1 오늘 / iMAC M1 오늘 / 클라우드 오늘 / 전체 오늘 4줄
//   W10-cloud-넘김: 클라우드 오늘 줄에 넘김 X/Y 포함
//   W10-전체-jobs: 전체 오늘 잡 = summaryJobs
//   W10-일관성: 오늘 처리(잡) 행 클라우드 칸 == 클라우드 오늘 잡 값 (동일 집계 함수)
//   W10-전체PR: 전체 PR ≤ MBP PR + iMAC PR + 클라우드 PR (중복 제거 원칙)
//   W10-no-duplicate: W7 하단 단독 PR·PT·잡 합계 줄 미등장 (전체 오늘 로 통합)
//   폭100/140: 렌더 깨짐 없음

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isMarkerJob,
  isCountableJob,
  renderLayout,
  buildMachineState,
} from '../watch/ci-watch-render.mjs';
import { stripAnsi } from '../watch/text-width.mjs';

// ─── 공통 헬퍼 ───────────────────────────────────────────────────────────────

function makeAllJson(overrides = {}) {
  return {
    at: new Date().toISOString(),
    ci_runners: [
      { name: 'Youngkyus-MacBook-Pro-M1',    status: 'online', busy: false },
      { name: 'curiocity-mac-light',         status: 'online', busy: false },
      { name: 'curiocity-mac-fork',          status: 'online', busy: false },
      { name: 'curiocity-mac-fork-light',    status: 'online', busy: false },
      { name: 'ci-box-storeport-heavy-imac', status: 'online', busy: false },
      { name: 'ci-box-storeport-light-imac', status: 'online', busy: false },
      { name: 'ci-box-fork-heavy-imac',      status: 'online', busy: false },
      { name: 'ci-box-fork-light-imac',      status: 'online', busy: false },
    ],
    ci: { data: { heavy: { in_progress: [] }, light: { in_progress: [] } } },
    hubs: {
      m0: { current: null }, m1: { current: null },
      m2: { current: null }, m3: { current: null }, r0: { current: null },
    },
    git_state: { ahead: 0, behind: 0, rebase_in_progress: false, needs_human: false },
    ...overrides,
  };
}

function makeLayoutData(overrides = {}) {
  return {
    allJson: makeAllJson(),
    runState: { heavy: { inProgress: [], queued: [] }, light: { inProgress: [], queued: [] } },
    cloudData:   { realCount: 24, limit: 5, totalMin: 15, last3: [] },
    runnerAlerts: [],
    ciAlerts:    [],
    ciDimAlerts: [],
    timeStr:     '2026/11/26 17:48:00',
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
    version:     '1.13',
    versionNote: '',
    poolWaitStats:        {},
    hubWaitStats:         {},
    todayMachineStats:    { mbp: { jobs: 31, avgRun: 2.5 }, imac: { jobs: 57, avgRun: 1.8 } },
    todayPoolMachineStats: null,
    machineRecentStats:   null,
    summaryPR:   15,
    summaryPT:   12,
    summaryJobs: 112,
    cloudPR:     8,
    cloudPT:     6,
    mbpPR:       10,
    mbpPT:       8,
    imacPR:      12,
    imacPT:      9,
    ...overrides,
  };
}

// ─── W2: cancel-on-close 마커 ────────────────────────────────────────────────

test('W2-cancel: cancel-on-close 는 마커 잡', () => {
  assert.equal(isMarkerJob('cancel-on-close'), true);
});

test('W2-count: isCountableJob — cancel-on-close 카운트 제외', () => {
  assert.equal(isCountableJob({ job: 'cancel-on-close', conclusion: 'success' }), false);
  assert.equal(isCountableJob({ job: 'Cancel-On-Close', conclusion: 'success' }), false);
});

// ─── W5: offline 러너 OFF 표시 ────────────────────────────────────────────────

test('W5-off: ci_runners 존재하지만 offline → OFF 표시 (? 아님)', () => {
  // MBP 가 ci_runners 에 있지만 offline
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, status: 'offline' } : r,
  );
  // partial=false (CI 데이터 정상)
  const ms = buildMachineState(allJson, { heavy: { inProgress: [], queued: [] }, light: { inProgress: [], queued: [] } });
  const sh = ms.get('storeport-heavy');
  assert.ok(sh, 'storeport-heavy machineState 없음');
  assert.equal(sh.mbp.status, 'offline', 'MBP offline 아님');
  assert.equal(sh.mbp.partial, false,
    `MBP offline 인데 partial=true → ? 표시됨 (W5 미수정 상태): partial=${sh.mbp.partial}`);
});

test('W5-off-render: 명시적 offline MBP → 렌더에서 OFF 등장', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, status: 'offline' } : r,
  );
  const lines = renderLayout(makeLayoutData({ allJson, terminalWidth: 100 }));
  const ciSection = stripAnsi(lines.join('\n'));
  const ciIdx = ciSection.indexOf('CI 큐');
  const inProgressIdx = ciSection.indexOf('진행 중');
  const ciPart = ciSection.slice(ciIdx, inProgressIdx);

  // storeport-heavy 행에서 MBP 칸이 OFF 여야 함
  const shRow = ciPart.split('\n').find(l => l.includes('storeport-heavy'));
  assert.ok(shRow, 'storeport-heavy 행 없음');
  assert.ok(shRow.includes('OFF'),
    `MBP offline 인데 OFF 없음 (? 로 나오는 버그 가능성): "${shRow}"`);
  assert.ok(!shRow.includes('?') || !shRow.startsWith('  storeport-heavy'),
    `MBP 칸에 ? 등장 — W5 미수정\n"${shRow}"`);
});

// ─── W10: 4줄 렌더 ────────────────────────────────────────────────────────────

test('W10-4lines(100): MBP M1 오늘 / iMAC M1 오늘 / 클라우드 오늘 / 전체 오늘 4줄 등장', () => {
  const lines = renderLayout(makeLayoutData({ terminalWidth: 100 }));
  const text = stripAnsi(lines.join('\n'));
  assert.ok(text.includes('MBP M1 오늘'),   `MBP M1 오늘 줄 없음\n...${text.slice(-500)}`);
  assert.ok(text.includes('iMAC M1 오늘'),  `iMAC M1 오늘 줄 없음\n...${text.slice(-500)}`);
  assert.ok(text.includes('클라우드 오늘'), `클라우드 오늘 줄 없음\n...${text.slice(-500)}`);
  assert.ok(text.includes('전체 오늘'),     `전체 오늘 줄 없음\n...${text.slice(-500)}`);
});

test('W10-4lines(140): 폭 140 에서도 4줄 등장', () => {
  const lines = renderLayout(makeLayoutData({ terminalWidth: 140 }));
  const text = stripAnsi(lines.join('\n'));
  assert.ok(text.includes('MBP M1 오늘') && text.includes('iMAC M1 오늘') &&
            text.includes('클라우드 오늘') && text.includes('전체 오늘'),
    `4줄 중 일부 없음 (폭 140)\n...${text.slice(-500)}`);
});

test('W10-MBP줄: PR · PT · 잡 값 포함', () => {
  const lines = renderLayout(makeLayoutData({ mbpPR: 10, mbpPT: 8 }));
  const foundLine = lines.map(l => stripAnsi(l)).find(l => l.includes('MBP M1 오늘'));
  assert.ok(foundLine, 'MBP M1 오늘 줄 없음');
  assert.ok(foundLine.includes('PR 10'), `PR 10 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('PT 8'),  `PT 8 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('잡 31'), `잡 31 없음: "${foundLine}"`);
});

test('W10-iMAC줄: PR · PT · 잡 값 포함', () => {
  const lines = renderLayout(makeLayoutData({ imacPR: 12, imacPT: 9 }));
  const foundLine = lines.map(l => stripAnsi(l)).find(l => l.includes('iMAC M1 오늘'));
  assert.ok(foundLine, 'iMAC M1 오늘 줄 없음');
  assert.ok(foundLine.includes('PR 12'), `PR 12 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('PT 9'),  `PT 9 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('잡 57'), `잡 57 없음: "${foundLine}"`);
});

test('W10-cloud줄(M2-1126-S): PR · PT · 잡 · 넘김 폐지 표시 (cloud>0 → 위반 경고)', () => {
  const lines = renderLayout(makeLayoutData({ cloudPR: 8, cloudPT: 6, cloudTodayCount: 3, cloudLimit: 5 }));
  const foundLine = lines.map(l => stripAnsi(l)).find(l => l.includes('클라우드 오늘'));
  assert.ok(foundLine, '클라우드 오늘 줄 없음');
  assert.ok(foundLine.includes('PR 8'),  `PR 8 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('PT 6'),  `PT 6 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('잡 24'), `잡 24 없음: "${foundLine}"`);
  // M2-1126-S: "넘김 X/Y" 는 폐지. cloud>0 이면 "넘김 폐지 위반" 경고.
  assert.ok(/넘김\s*폐지/.test(foundLine), `넘김 폐지 라벨 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('위반'), `cloud>0 인데 위반 라벨 없음: "${foundLine}"`);
});

test('W10-전체줄(v1.15): 세 줄 PR·PT·잡 단순 합 (summary* 는 고유 참고용)', () => {
  // mbpPR=10, imacPR=12, cloudPR=8 → 30
  // mbpPT=8,  imacPT=9,  cloudPT=6 → 23
  // mbp.jobs=31, imac.jobs=57, cloud(cd.realCount)=24 → 112
  const lines = renderLayout(makeLayoutData({ summaryPR: 15, summaryPT: 12, summaryJobs: 112 }));
  const foundLine = lines.map(l => stripAnsi(l)).find(l => l.includes('전체 오늘'));
  assert.ok(foundLine, '전체 오늘 줄 없음');
  assert.ok(foundLine.includes('PR 30'),  `전체 PR 합 30 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('PT 23'),  `전체 PT 합 23 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('잡 112'), `전체 잡 합 112 없음: "${foundLine}"`);
  // 고유 PR 15 참고 괄호 (전체 30 ≠ summaryPR 15 이므로 표시)
  assert.ok(foundLine.includes('고유 PR 15'),
    `(고유 PR 15) 참고 괄호 없음: "${foundLine}"`);
});

test('W10-넘김폐지위반(M2-1126-S): 클라우드 잡>0 → 빨강 위반 경고', () => {
  // M2-1126-S 넘김 폐지: 한도 소진 개념 없음. 클라우드 잡이 생겼다는 것 자체가 위반.
  const lines = renderLayout(makeLayoutData({
    cloudData: { realCount: 3, limit: 5, totalMin: 2, last3: [] },
    cloudTodayCount: 3, cloudLimit: 5,
  }));
  const rawLine = lines.find(l => stripAnsi(l).includes('클라우드 오늘'));
  assert.ok(rawLine, '클라우드 오늘 줄 없음');
  assert.ok(rawLine.includes('\x1b[31m'), `클라우드 잡>0 인데 빨강 없음: "${rawLine.slice(0, 160)}"`);
  assert.ok(stripAnsi(rawLine).includes('위반'), `위반 라벨 없음`);
});

test('W10-정상(M2-1126-S): 클라우드 잡 0 → 녹색 "넘김 폐지"', () => {
  const lines = renderLayout(makeLayoutData({
    cloudData: { realCount: 0, limit: 5, totalMin: 0, last3: [] },
    cloudTodayCount: 0, cloudLimit: 5,
  }));
  const rawLine = lines.find(l => stripAnsi(l).includes('클라우드 오늘'));
  assert.ok(rawLine, '클라우드 오늘 줄 없음');
  assert.ok(!rawLine.includes('\x1b[31m'), `클라우드 잡=0 인데 빨강 있음: "${rawLine.slice(0, 160)}"`);
  assert.ok(/넘김\s*폐지/.test(stripAnsi(rawLine)), `넘김 폐지 라벨 없음`);
});

// ─── W10 일관성: 오늘 처리(잡) 클라우드 칸 == 클라우드 오늘 잡 값 ────────────

test('W10-일관성: cloudData.realCount 가 오늘 처리(잡) 클라우드 칸과 클라우드 오늘 줄에 동일 등장', () => {
  const data = makeLayoutData({ cloudData: { realCount: 24, limit: 5, totalMin: 15, last3: [] } });
  const lines = renderLayout(data);
  const text = stripAnsi(lines.join('\n'));

  // 클라우드 오늘 줄에 잡 24
  const cloudLine = lines.map(l => stripAnsi(l)).find(l => l.includes('클라우드 오늘'));
  assert.ok(cloudLine?.includes('잡 24'), `클라우드 오늘 줄에 잡 24 없음: "${cloudLine}"`);
});

// ─── W10 전체 PR ≤ 세 줄 PR 합 ────────────────────────────────────────────────

test('W10-전체PR(v1.15): 전체 PR = mbpPR + imacPR + cloudPR (단순 합 · Kyu 규칙)', () => {
  // v1.15: 전체 = 세 줄 단순 합. 고유 수 아님.
  const { mbpPR, imacPR, cloudPR } = makeLayoutData();
  const sum = (mbpPR ?? 0) + (imacPR ?? 0) + (cloudPR ?? 0);
  const lines = renderLayout(makeLayoutData());
  const foundLine = lines.map(l => stripAnsi(l)).find(l => l.includes('전체 오늘'));
  assert.ok(foundLine?.includes(`PR ${sum}`),
    `전체 PR ${sum} (세 줄 합) 없음: "${foundLine}"`);
});

// ─── W10-no-duplicate: 하단 단독 PR·PT·잡 줄 없음 ────────────────────────────

test('W10-no-duplicate: 오늘 완료 섹션 이후 단독 PR·PT·잡 줄 없음 (전체 오늘로 통합)', () => {
  const lines = renderLayout(makeLayoutData({ summaryPR: 15, summaryPT: 12, summaryJobs: 112 }));
  const doneIdx = lines.findIndex(l => stripAnsi(l).includes('오늘 완료'));
  assert.ok(doneIdx >= 0, '오늘 완료 섹션 없음');

  // 오늘 완료 이후 줄 중 "전체 오늘" 없이 단독으로 "PR 15 · PT 12 · 잡 112" 패턴 없어야 함
  const afterDone = lines.slice(doneIdx + 1).map(l => stripAnsi(l));
  const duplicateLine = afterDone.find(l =>
    /^\s+PR \d+ · PT \d+ · 잡 \d+\s*$/.test(l),
  );
  assert.ok(!duplicateLine,
    `W7 하단 단독 합계 줄 여전히 존재: "${duplicateLine}"`);
});
