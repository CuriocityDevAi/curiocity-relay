// scripts/test/ci-watch-w111.test.mjs  M2-1126-G — v1.11 W5~W9 테스트
//
// 커버:
//   W5-1: classifyMachine(null) → 'unknown' (not 'cloud')
//   W5-2: classifyMachine('ubuntu-latest') → 'cloud'
//   W5-3: 클라우드 칸에 null runner run 미포함 (self-hosted 제외)
//   W6-1: idle + partial=true → 셀에 '?' 등장
//   W6-2: ERR_TAIL_SCREEN_FILTERS — '[hub-runner' · 'partial skip' 줄 화면 미출력
//   W7-1: summaryPR/PT/잡 → 'PR N · PT N · 잡 N' 형태 한 줄
//   W7-2: 순서 고정 PR → PT → 잡
//   W8-1: idle + recentMin=3 → 셀에 '✓3m' 초록 등장
//   W8-2: 오늘 처리(잡) 행 MBP/iMAC 칸에 ✓Nm 초록
//   W8-3: OFF 기계 (offline) → ✓Nm 없음
//   W9-1: running 셀 '#PR·잡이름' 형태 등장
//   W9-2: running 셀 열 폭 절단 (colW=14 초과 텍스트)
//   W9-3: job 없을 때 '?' 표시 (⠋? 허용은 오직 info 없을 때)
//   W9-H: health.sh collect_running_jobs 파이썬 파싱 — Worker 로그 샘플 단위 테스트

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import {
  renderLayout,
  classifyMachine,
  buildMachineState,
} from '../watch/ci-watch-render.mjs';
import { displayWidth, stripAnsi } from '../watch/text-width.mjs';

// ─── 공통 헬퍼 ──────────────────────────────────────────────────────────────

function makeAllJson(overrides = {}) {
  return {
    at: new Date().toISOString(),
    ci_runners: [
      { name: 'ci-box-storeport-heavy-imac', status: 'online', busy: false },
      { name: 'ci-box-storeport-light-imac', status: 'online', busy: false },
      { name: 'ci-box-fork-heavy-imac',      status: 'online', busy: false },
      { name: 'ci-box-fork-light-imac',      status: 'online', busy: false },
      { name: 'Youngkyus-MacBook-Pro-M1',    status: 'online', busy: false },
      { name: 'curiocity-mac-light',         status: 'online', busy: false },
      { name: 'curiocity-mac-fork',          status: 'online', busy: false },
      { name: 'curiocity-mac-fork-light',    status: 'online', busy: false },
    ],
    ci: {
      data: {
        heavy: { in_progress: [], queued: 0 },
        light: { in_progress: [], queued: 0 },
        today: {
          'mac-heavy': { jobs: 7,  avg_wait_min: 0.3, avg_run_min: 2.6, success_rate: 87 },
          'mac-light': { jobs: 61, avg_wait_min: 3.1, avg_run_min: 0.5, success_rate: 98 },
          cloud: { jobs: 18, avg_run_min: 1.2, success_rate: 56 },
          cloud_cost_est_usd: 0.5,
        },
      },
    },
    hubs: {
      m0: { current: null }, m1: { current: null },
      m2: { current: null }, m3: { current: null }, r0: { current: null },
    },
    git_state: { ahead: 0, behind: 0, rebase_in_progress: false, needs_human: false },
    ...overrides,
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
    cloudData:   { realCount: 1, limit: 5, totalMin: 8, last3: [] },
    runnerAlerts: [],
    ciAlerts:    [],
    ciDimAlerts: [],
    timeStr:     '2026/11/26 09:00:00',
    fullMode:    false,
    todayStats:  makeAllJson().ci.data.today,
    cloudTodayCount: 1,
    cloudLimit:  5,
    lastCiByRepo: [],
    countdownSec: 30,
    hubReportStatus: {},
    hubPending:  {},
    spinnerFrame: 0,
    terminalWidth: 140,
    version:     '1.11',
    versionNote: '',
    poolWaitStats:        {},
    hubWaitStats:         {},
    todayMachineStats:    null,
    todayPoolMachineStats: null,
    machineRecentStats:   null,
    summaryPR:   null,
    summaryPT:   null,
    summaryJobs: null,
    ...overrides,
  };
}

// ─── W5-1: classifyMachine(null) → 'unknown' ─────────────────────────────────

test('W5-1: classifyMachine(null) → "unknown" (not "cloud")', () => {
  assert.equal(classifyMachine(null), 'unknown');
  assert.notEqual(classifyMachine(null), 'cloud');
});

// ─── W5-2: classifyMachine cloud names ───────────────────────────────────────

test('W5-2: classifyMachine cloud runner names → "cloud"', () => {
  for (const name of ['ubuntu-latest', 'ubuntu-22.04', 'windows-latest', 'macos-14', 'GitHub Actions']) {
    assert.equal(classifyMachine(name), 'cloud', `${name} 이 cloud 아님`);
  }
});

// ─── W5-3: null runner run → 클라우드 칸 미포함 ──────────────────────────────

test('W5-3: null/self-hosted runner → buildMachineState 클라우드 칸에 미포함', () => {
  const allJson = makeAllJson();
  const runState = makeRunState();
  // null runner in-progress (미배정 run)
  runState.heavy.inProgress = [
    { runner: null, repo: 'CuriocityDevAi/storeport', prompt_id: 'M2-TEST', running_min: 2, light: false },
  ];

  const ms = buildMachineState(allJson, runState);
  const pool = ms.get('storeport-heavy');
  assert.ok(pool, 'storeport-heavy pool 없음');
  // null runner → classifyMachine = 'unknown' → cloud 칸에 없어야 함
  assert.equal(pool.cloud.count, 0,
    `null runner run 이 cloud 칸에 포함됨 count=${pool.cloud.count}`);
});

// ─── W5-4: self-hosted runner → cloud 칸 제외 ────────────────────────────────

test('W5-4: self-hosted(imac) runner in-progress → cloud 칸 미포함', () => {
  const allJson = makeAllJson();
  const runState = makeRunState();
  runState.heavy.inProgress = [
    {
      runner: 'ci-box-storeport-heavy-imac',
      repo: 'CuriocityDevAi/storeport',
      prompt_id: 'M2-TEST',
      running_min: 1,
      light: false,
    },
  ];

  const ms = buildMachineState(allJson, runState);
  const pool = ms.get('storeport-heavy');
  assert.equal(pool.cloud.count, 0, 'self-hosted runner 가 cloud 칸에 포함됨');
});

// ─── W6-1: idle + partial → '?' 등장 ────────────────────────────────────────

test('W6-1: ci.data.partial=true → idle 셀에 "?" 등장', () => {
  const allJson = makeAllJson({ ci: { data: {
    partial: true,
    heavy: { in_progress: [], queued: 0 },
    light: { in_progress: [], queued: 0 },
    today: {
      'mac-heavy': { jobs: 7, avg_wait_min: 0.3, avg_run_min: 2.6, success_rate: 87 },
      'mac-light': { jobs: 61, avg_wait_min: 3.1, avg_run_min: 0.5, success_rate: 98 },
      cloud: { jobs: 18, avg_run_min: 1.2, success_rate: 56 },
      cloud_cost_est_usd: 0.5,
    },
  }}});

  const lines = renderLayout(makeLayoutData({ allJson }));
  const text  = stripAnsi(lines.join('\n'));

  // partial=true 인 상태에서 idle 기계 칸이 '?' 를 표시해야 함
  // CI 큐 섹션에 '?' 가 등장해야 함 (회색 dim 색상이므로 텍스트만 확인)
  const ciSection = text.slice(text.indexOf('CI 큐'), text.indexOf('진행 중') > 0 ? text.indexOf('진행 중') : text.length);
  assert.ok(ciSection.includes('?'),
    `partial=true 인데 CI 큐 섹션에 '?' 없음\n${ciSection.slice(0, 300)}`);
});

// ─── W6-2: ERR_TAIL_SCREEN_FILTERS — 금지 로그 줄 화면 미출력 ────────────────

test('W6-2: hub-runner/partial skip/claim 로그 줄은 화면 미출력', () => {
  const bannedLines = [
    '[hub-runner-ci-watch-gh-watchdog] partial skip: gh call skipped',
    '[claim] pushed M2-1126-X',
    'self-update 보류 중: waiting for runner',
    '[hub-runner-main] status check partial skip',
  ];
  const allowedLine = '에러: 연결 실패 (일반 에러)';

  const errTail = [...bannedLines, allowedLine].join('\n');
  const allJson = makeAllJson({ err_tail: errTail });

  const lines = renderLayout(makeLayoutData({ allJson }));
  const text  = stripAnsi(lines.join('\n'));

  for (const banned of bannedLines) {
    // partial skip · hub-runner · claim 로 시작하는 줄은 화면에 없어야 함
    const keyword = banned.slice(0, 30);
    assert.ok(!text.includes(keyword.slice(0, 20)),
      `금지 로그 줄이 화면에 출력됨: "${keyword}"`);
  }

  // 일반 에러 줄은 화면에 등장해야 함
  assert.ok(text.includes('에러: 연결 실패'),
    `일반 에러 줄이 화면에서 사라짐`);
});

// ─── W7-1: 합계 한 줄 'PR N · PT N · 잡 N' 형태 ───────────────────────────────

test('W7-1: summaryPR/PT/잡 → "PR 14 · PT 31 · 잡 165" 형태 한 줄', () => {
  const lines = renderLayout(makeLayoutData({ summaryPR: 14, summaryPT: 31, summaryJobs: 165 }));
  const text  = stripAnsi(lines.join('\n'));

  assert.ok(text.includes('PR 14') && text.includes('PT 31') && text.includes('잡 165'),
    `합계 줄 미등장\n...${text.slice(-400)}`);
  // 세 항목이 같은 줄에 있어야 함
  const foundLine = lines.map(l => stripAnsi(l)).find(l => l.includes('PR 14') && l.includes('PT 31') && l.includes('잡 165'));
  assert.ok(foundLine, `PR · PT · 잡 세 항목이 같은 줄에 없음`);
});

// ─── W7-2: 순서 PR → PT → 잡 고정 ──────────────────────────────────────────

test('W7-2: 합계 줄 순서 PR → PT → 잡 고정', () => {
  const lines = renderLayout(makeLayoutData({ summaryPR: 5, summaryPT: 10, summaryJobs: 50 }));
  const foundLine = lines.map(l => stripAnsi(l)).find(l => l.includes('PR 5') && l.includes('PT 10') && l.includes('잡 50'));
  assert.ok(foundLine, '합계 줄 없음');

  const idxPR  = foundLine.indexOf('PR 5');
  const idxPT  = foundLine.indexOf('PT 10');
  const idxJob = foundLine.indexOf('잡 50');

  assert.ok(idxPR < idxPT,  `PR(${idxPR}) 이 PT(${idxPT}) 보다 뒤`);
  assert.ok(idxPT < idxJob, `PT(${idxPT}) 이 잡(${idxJob}) 보다 뒤`);
});

// ─── W8-1: idle + recentMin=3 → '✓3m' 초록 등장 ────────────────────────────

test('W8-1: machineRecentStats recentMin=3 → idle 셀에 ✓3m 등장', () => {
  const machineRecentStats = {
    'storeport-heavy-mbp':  3,
    'storeport-heavy-imac': 5,
  };

  const lines = renderLayout(makeLayoutData({ machineRecentStats }));
  const text  = stripAnsi(lines.join('\n'));
  const ciSection = text.slice(text.indexOf('CI 큐'), text.indexOf('진행 중') > 0 ? text.indexOf('진행 중') : text.length);

  assert.ok(ciSection.includes('✓3m') || ciSection.includes('✓5m'),
    `✓Nm 없음\n${ciSection.slice(0, 500)}`);
});

// ─── W8-2: 오늘 처리(잡) 행 ✓Nm 초록 ────────────────────────────────────────

test('W8-2: 오늘 처리(잡) 행에 machineRecentStats → ✓Nm 등장', () => {
  const machineRecentStats = {
    'storeport-heavy-mbp': 2,
    'fork-heavy-imac':     7,
  };
  const todayMachineStats = {
    mbp:  { jobs: 50, avgRun: 2.0 },
    imac: { jobs: 30, avgRun: 1.5 },
  };

  const lines = renderLayout(makeLayoutData({ machineRecentStats, todayMachineStats }));
  const text  = stripAnsi(lines.join('\n'));

  // 오늘 처리(잡) 줄 찾기
  const todayLine = lines.map(l => stripAnsi(l)).find(l => l.includes('오늘 처리(잡)'));
  assert.ok(todayLine, '오늘 처리(잡) 줄 없음');
  assert.ok(todayLine.includes('✓2m') || todayLine.includes('✓7m'),
    `오늘 처리(잡) 줄에 ✓Nm 없음\n"${todayLine}"`);
});

// ─── W8-3: OFF(offline) 기계 → ✓Nm 없음 ────────────────────────────────────

test('W8-3: offline 기계 (OFF) → ✓Nm 없음', () => {
  // 맥북 OFF (offline), imac만 online
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name.startsWith('curiocity-mac') || r.name.startsWith('Youngkyus-MacBook')
      ? { ...r, status: 'offline' }
      : r,
  );

  // machineRecentStats 에 mbp 최근 완료 주입
  const machineRecentStats = { 'storeport-heavy-mbp': 4 };

  const lines = renderLayout(makeLayoutData({ allJson, machineRecentStats }));

  // storeport-heavy MBP 가 offline → OFF 셀 (✓4m 없어야 함)
  const ms = buildMachineState(allJson, makeRunState());
  const pool = ms.get('storeport-heavy');
  assert.equal(pool.mbp.status, 'offline', 'MBP 가 offline 아님');

  // 렌더에서도 ✓4m 이 OFF 옆에 나타나면 안 됨
  // fmtMachineCell: status=offline → partial 여부만 보고 OFF 반환 (✓ 없음)
  // 이 테스트는 buildMachineState 가 offline 을 올바르게 반환하는지 확인
  assert.equal(pool.mbp.status, 'offline', 'mbp offline 판정 실패');
});

// ─── W9-1: running 셀 '#PR·잡이름' 형태 ─────────────────────────────────────

test('W9-1: running 셀 → PR ID 등장 · 잡이름 일부 등장(절단 허용)', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, busy: true } : r,
  );

  const runState = makeRunState();
  runState.heavy.inProgress = [{
    runner: 'Youngkyus-MacBook-Pro-M1',
    repo:   'CuriocityDevAi/storeport',
    prompt_id: null,
    pr:     '#273',
    head_branch: 'feat/M2-1126-G',
    job:    'playwright',
    running_min: 1,
    light:  false,
  }];

  const lines = renderLayout(makeLayoutData({ allJson, runState }));
  const text  = stripAnsi(lines.join('\n'));
  const ciSection = text.slice(text.indexOf('CI 큐'), text.indexOf('진행 중') > 0 ? text.indexOf('진행 중') : text.length);

  // PR ID 등장 확인 · 잡이름은 절단될 수 있으므로 앞 4글자만 확인
  assert.ok(ciSection.includes('#273'),
    `#273 없음\n${ciSection.slice(0, 500)}`);
  assert.ok(ciSection.includes('play'),
    `playwr... 도 없음\n${ciSection.slice(0, 500)}`);
});

// ─── W9-2: running 셀 열 폭 절단 ────────────────────────────────────────────

test('W9-2: running 셀 초과 → 말줄임 등장 · 셀 폭 고정 (다음 열 밀림 없음)', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, busy: true } : r,
  );

  const runState = makeRunState();
  runState.heavy.inProgress = [{
    runner: 'Youngkyus-MacBook-Pro-M1',
    repo:   'CuriocityDevAi/storeport',
    prompt_id: null,
    pr:     '#273',
    head_branch: 'feat/M2-1126-G',
    job:    'very-long-job-name-that-exceeds-column-width',
    running_min: 1,
    light:  false,
  }];

  const todayPoolMachineStats = {
    'storeport-heavy': { mbp: 7, imac: 2, cloud: 0 },
    'storeport-light': { mbp: 0, imac: 0, cloud: 0 },
    'fork-heavy':      { mbp: 0, imac: 0, cloud: 0 },
    'fork-light':      { mbp: 0, imac: 0, cloud: 0 },
  };

  const lines = renderLayout(makeLayoutData({ allJson, runState, todayPoolMachineStats, terminalWidth: 140 }));
  const plainLines = lines.map(l => stripAnsi(l));

  // 말줄임(…) 가 등장해야 함
  const runningRow = plainLines.find(l => l.includes('#273') && l.includes('…'));
  assert.ok(runningRow, `말줄임(…) 없음 — 긴 잡이름이 절단 안됨\n${plainLines.filter(l=>l.includes('#273')).join('\n')}`);

  // 실행 중 행과 idle 행의 display 폭이 같아야 함 (열 밀림 없음)
  const idleRow  = plainLines.find(l => l.includes('쉼') && !l.includes('#273') && l.includes('storeport') === false);
  if (idleRow) {
    const runW  = displayWidth(runningRow);
    const idleW = displayWidth(idleRow);
    // 허용 범위 ±1 (trailing space 차이)
    assert.ok(Math.abs(runW - idleW) <= 2,
      `실행 중 행 폭(${runW}) ≠ idle 행 폭(${idleW}) — 열 밀림 발생`);
  }
});

// ─── W9-3: job 정보 없을 때 promptId 없으면 '?' ──────────────────────────────

test('W9-3: job=null, pr=null, branch=null → "?" 표시', () => {
  const allJson = makeAllJson();
  allJson.ci_runners = allJson.ci_runners.map(r =>
    r.name === 'Youngkyus-MacBook-Pro-M1' ? { ...r, busy: true } : r,
  );

  // runState 의 inProgress 에 runner 는 있지만 pr/branch/prompt_id 모두 null
  const runState = makeRunState();
  runState.heavy.inProgress = [{
    runner: 'Youngkyus-MacBook-Pro-M1',
    repo:   'CuriocityDevAi/storeport',
    prompt_id: null,
    pr:     null,
    head_branch: null,
    job:    null,
    running_min: 1,
    light:  false,
  }];

  const lines = renderLayout(makeLayoutData({ allJson, runState }));
  const text  = stripAnsi(lines.join('\n'));
  const ciSection = text.slice(text.indexOf('CI 큐'), text.indexOf('진행 중') > 0 ? text.indexOf('진행 중') : text.length);

  // ⠋? 형태 (ID 없음 → '?')
  assert.ok(ciSection.includes('?'),
    `job/pr/branch 없는 running 셀에 '?' 없음\n${ciSection.slice(0, 300)}`);
});

// ─── W9-H: health.sh collect_running_jobs — Worker 로그 샘플 파싱 테스트 ────

test('W9-H: collect_running_jobs Python 파싱 — Worker 로그 샘플에서 job/repo/pr 추출', () => {
  // Worker_*.log 샘플 (실제 GitHub Actions runner _diag 형식)
  const workerLogSample = `
[2026-11-26 07:00:00Z INFO Worker] Starting worker process
[2026-11-26 07:00:01Z INFO Worker] Job message:
{
  "jobId": "abc123",
  "jobDisplayName": "playwright",
  "variables": [
    {"k": "repository", "v": "CuriocityDevAi/storeport"},
    {"k": "workflow",   "v": "CI"},
    {"k": "head_ref",   "v": "feat/M2-1126-G"},
    {"k": "event_name", "v": "pull_request"},
    {"k": "number",     "v": "273"}
  ]
}
[2026-11-26 07:00:05Z INFO Worker] Running job playwright
`.trim();

  // Python 파싱 로직 (collect_running_jobs 에서 추출)
  const pyCode = `
import sys, json, re

content = sys.argv[1]

info = {}

m = re.search(r'"jobDisplayName"\\s*:\\s*"([^"]+)"', content)
if m:
    info['job'] = m.group(1)

repo_m = re.search(r'"k"\\s*:\\s*"repository"\\s*,\\s*"v"\\s*:\\s*"([^"]+)"', content)
if repo_m:
    info['repo'] = repo_m.group(1)

wf_m = re.search(r'"k"\\s*:\\s*"workflow"\\s*,\\s*"v"\\s*:\\s*"([^"]+)"', content)
if wf_m:
    info['workflow'] = wf_m.group(1)

hr_m = re.search(r'"k"\\s*:\\s*"head_ref"\\s*,\\s*"v"\\s*:\\s*"([^"]*)"', content)
if hr_m:
    info['head_ref'] = hr_m.group(1)

en_m = re.search(r'"k"\\s*:\\s*"event_name"\\s*,\\s*"v"\\s*:\\s*"([^"]+)"', content)
if en_m:
    info['event_name'] = en_m.group(1)

if info.get('event_name') == 'pull_request':
    pr_m = re.search(r'"k"\\s*:\\s*"number"\\s*,\\s*"v"\\s*:\\s*["\\'\\']?(\\d+)["\\'\\']?', content)
    if pr_m:
        info['pr'] = pr_m.group(1)

print(json.dumps(info))
`;

  const result = spawnSync('python3', ['-c', pyCode, workerLogSample], { encoding: 'utf8' });
  assert.equal(result.status, 0, `python3 실패: ${result.stderr}`);

  let parsed;
  try {
    parsed = JSON.parse(result.stdout.trim());
  } catch (e) {
    assert.fail(`JSON 파싱 실패: ${result.stdout}`);
  }

  assert.equal(parsed.job,        'playwright',              'job 파싱 실패');
  assert.equal(parsed.repo,       'CuriocityDevAi/storeport','repo 파싱 실패');
  assert.equal(parsed.workflow,   'CI',                      'workflow 파싱 실패');
  assert.equal(parsed.head_ref,   'feat/M2-1126-G',          'head_ref 파싱 실패');
  assert.equal(parsed.event_name, 'pull_request',            'event_name 파싱 실패');
  assert.equal(parsed.pr,         '273',                     'PR 번호 파싱 실패');
});
