// scripts/test/ci-watch-w126.test.mjs  M0-1127-K — CW-HEAD 머리줄 진행/주의/오늘 출처 일치
//
// 뿌리: v1.25 머리줄 `●진행 74` — 같은 시각 진행 중 섹션(CW-PROG)에는 4~5줄 뿐.
// 원칙(Kyu 11-19 "잘못된 정보 주느니 없앰"): 머리줄 세 숫자는 각각 **대응되는 섹션과 같은 출처**.
//
// 커버 (REQ 1~3):
//   F126-prog-source: pipelinePrompts 4건 → 머리 `●진행 4` · 섹션 제목 `(4)` · 본문 4줄 (CW-PROG)
//   F126-prog-isolation: runState CI 잡 수를 늘려도 pipelinePrompts 가 진짜 출처
//   F126-alert-source: runnerAlerts+ciAlerts 가 머리 ■주의 N 과 섹션 `─ 주의 (N) ─` 공통 출처
//   F126-today-source: todayStats 세 풀 합 = 머리 ✔오늘 N = 섹션 `─ 오늘 완료 N` 공통 출처
//   F126-meta-prog (검증의 검증): 머리를 pipelinePrompts 대신 runState 로 계산하도록 되돌리면 빨강
//
// 파일/줄 (현재 v1.26):
//   scripts/watch/ci-watch-render.mjs:797  const pipelinePrompts = ...; totalInProgress = pipelinePrompts.length
//   scripts/watch/ci-watch-render.mjs:810  allAlerts.length (머리 ■주의)
//   scripts/watch/ci-watch-render.mjs:816  todayCompletedCount (머리 ✔오늘 = 세 풀 합)
//   scripts/watch/ci-watch-render.mjs:990  진행 중 섹션 제목 = totalInProgress
//   scripts/watch/ci-watch-render.mjs:1140 주의 섹션 제목 = allAlerts.length
//   scripts/watch/ci-watch-render.mjs:1026 오늘 완료 섹션 제목 = todayCompletedCount

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderLayout } from '../watch/ci-watch-render.mjs';
import { stripAnsi } from '../watch/text-width.mjs';

function makePrompt(id, column, ageMin = 5, level = 'green', prNum = null) {
  return {
    id, hub: id.slice(0, 2).toLowerCase(), column, ageMin, level,
    mark: level === 'red' ? '■' : level === 'yellow' ? '▲' : '●',
    title: `${id} 제목`,
    extra: prNum ? { pr: { number: prNum } } : {},
  };
}

function makeLayoutData(overrides = {}) {
  return {
    allJson: {
      at: new Date().toISOString(),
      runner: 'v8.3.2',
      pid: 1,
      ci_runners: [],
      ci: { data: { heavy: { in_progress: [] }, light: { in_progress: [] } } },
      hubs: { m0: { current: null }, m1: { current: null }, m2: { current: null }, m3: { current: null }, r0: { current: null } },
      git_state: { ahead: 0, behind: 0, rebase_in_progress: false, needs_human: false },
    },
    runState: { heavy: { inProgress: [], queued: [] }, light: { inProgress: [], queued: [] } },
    cloudData: { realCount: 0, limit: 5, totalMin: 0, last3: [] },
    runnerAlerts: [],
    ciAlerts: [],
    ciDimAlerts: [],
    timeStr: '2026/11/27 14:15:00',
    fullMode: false,
    todayStats: { 'mac-heavy': { jobs: 0, avg_run_min: 0 }, 'mac-light': { jobs: 0, avg_run_min: 0 }, cloud: { jobs: 0 } },
    cloudTodayCount: 0,
    cloudLimit: 5,
    lastCiByRepo: [],
    countdownSec: 30,
    hubReportStatus: {},
    hubPending: { m0: [], m1: [], m2: [], m3: [], r0: [] },
    spinnerFrame: 0,
    terminalWidth: 140,
    version: '1.26',
    versionNote: '',
    fileCommitDate: '2026-11-27',
    poolWaitStats: {},
    hubWaitStats: {},
    todayMachineStats: { mbp: { jobs: 0, avgRun: 0 }, imac: { jobs: 0, avgRun: 0 } },
    todayPoolMachineStats: null,
    machineRecentStats: null,
    pipelinePrompts: [],
    ...overrides,
  };
}

// ─── F126-prog-source: 머리 ●진행 N · 섹션 제목 (N) · 본문 N 줄 모두 같은 출처 ──
test('F126-prog-source: pipelinePrompts 4건 → 머리 `●진행 4` · 섹션 제목 (4) · 본문 4줄', () => {
  const prompts = [
    makePrompt('M0-1127-K', 'hub', 4),
    makePrompt('M1-1127-G', 'hub', 44),
    makePrompt('M2-1127-J', 'hub', 20),
    makePrompt('R0-1127-K', 'review', 20, 'green', 111),
  ];
  const data = makeLayoutData({ pipelinePrompts: prompts });
  const lines = renderLayout(data).map(stripAnsi);

  // 머리
  const head = lines[0];
  const m = head.match(/●진행\s+(\d+)/);
  assert.ok(m, `머리 ●진행 N 패턴 없음: "${head}"`);
  assert.strictEqual(Number(m[1]), 4, `머리 ●진행 ${m[1]} ≠ 4 (pipelinePrompts.length)`);

  // 섹션 제목
  const progTitleIdx = lines.findIndex(l => l.startsWith('─ 진행 중 ('));
  assert.ok(progTitleIdx >= 0, '진행 중 섹션 제목 없음');
  const progTitle = lines[progTitleIdx];
  assert.ok(progTitle.includes('(4)'), `진행 중 제목에 (4) 없음: "${progTitle}"`);

  // 본문 (제목 다음 줄부터 "─" 로 시작하는 다음 섹션 전까지 · mark 로 시작하는 줄)
  const progBody = [];
  for (let i = progTitleIdx + 1; i < lines.length; i++) {
    const s = lines[i];
    if (s.startsWith('─')) break;
    if (/^\s*[●▲■○]/.test(s) && !s.startsWith('    └')) progBody.push(s);
  }
  assert.strictEqual(progBody.length, 4,
    `진행 중 본문 줄 수 ${progBody.length} ≠ 4 (머리/제목 N 과 어긋남)`);
});

// ─── F126-prog-isolation: runState CI 잡 수가 진행 N 을 흔들지 않는다 ────────
test('F126-prog-isolation: runState CI 잡 많아도 머리 ●진행 N 은 pipelinePrompts 수', () => {
  // 과거(v1.17 이하)는 CI 잡 수를 셌음 — 그 회귀를 막는 가드.
  const data = makeLayoutData({
    pipelinePrompts: [
      makePrompt('M0-1127-K', 'hub', 4),
      makePrompt('M1-1127-G', 'ci_running', 10, 'green', 101),
    ],
    runState: {
      heavy: {
        inProgress: Array.from({ length: 10 }, (_, i) => ({ runner: `r${i}`, job: `j${i}`, running_min: 3 })),
        queued: [],
      },
      light: { inProgress: [], queued: [] },
    },
  });
  const head = renderLayout(data).map(stripAnsi)[0];
  const m = head.match(/●진행\s+(\d+)/);
  assert.ok(m);
  assert.strictEqual(Number(m[1]), 2,
    `runState 10개 있어도 머리는 pipelinePrompts=2 여야 함: "${head}"`);
});

// ─── F126-alert-source: ■주의 N 과 ─ 주의 (N) 섹션 제목이 같은 출처 ──────────
test('F126-alert-source: runnerAlerts+ciAlerts 가 머리 주의와 섹션 제목 공통 출처', () => {
  const data = makeLayoutData({
    runnerAlerts: [{ msg: 'iMac heartbeat 끊김' }],
    ciAlerts: [{ msg: 'storeport main CI 실패' }],
  });
  const lines = renderLayout(data).map(stripAnsi);

  const head = lines[0];
  const hm = head.match(/■주의\s+(\d+)/);
  assert.ok(hm, `머리 ■주의 N 패턴 없음: "${head}"`);
  assert.strictEqual(Number(hm[1]), 2, `머리 ■주의 ${hm[1]} ≠ 2 (runnerAlerts+ciAlerts)`);

  const alertTitle = lines.find(l => l.startsWith('─ 주의 ('));
  assert.ok(alertTitle, '주의 섹션 제목 없음');
  assert.ok(alertTitle.includes('(2)'), `주의 제목에 (2) 없음: "${alertTitle}"`);
});

// ─── F126-today-source: 머리 ✔오늘 N = 오늘 완료 섹션 제목 = 세 풀 합 ─────────
test('F126-today-source: todayStats 세 풀 합이 머리 ✔오늘 과 섹션 제목 공통 출처', () => {
  const data = makeLayoutData({
    todayStats: {
      'mac-heavy': { jobs: 12, avg_run_min: 5 },
      'mac-light': { jobs: 34, avg_run_min: 2 },
      cloud: { jobs: 7 },
    },
  });
  const lines = renderLayout(data).map(stripAnsi);

  const head = lines[0];
  const tm = head.match(/✔오늘\s+(\d+)/);
  assert.ok(tm, `머리 ✔오늘 N 패턴 없음: "${head}"`);
  assert.strictEqual(Number(tm[1]), 53, `머리 ✔오늘 ${tm[1]} ≠ 12+34+7`);

  const doneTitle = lines.find(l => l.startsWith('─ 오늘 완료 '));
  assert.ok(doneTitle, '오늘 완료 섹션 제목 없음');
  assert.ok(/오늘 완료 53\b/.test(doneTitle), `오늘 완료 제목에 53 없음: "${doneTitle}"`);
});

// ─── F126-meta-prog (검증의 검증): 옛 출처로 되돌리면 F126-prog-source 가 깨진다 ──
// 아래 "되돌림 시뮬레이션" 은 renderLayout 가 CI 잡 수를 세도록 바꾼 가상의 코드를
// 재현해 머리 N 을 계산한다. 그 숫자가 pipelinePrompts.length 와 다르면
// F126-prog-source 가 빨강이 되는 것을 확인한다.
test('F126-meta-prog: 옛 출처(runState CI 잡 수)로 되돌리면 숫자 어긋남 확인', () => {
  const prompts = [
    makePrompt('M0-1127-K', 'hub', 4),
    makePrompt('M1-1127-G', 'hub', 44),
    makePrompt('M2-1127-J', 'hub', 20),
    makePrompt('R0-1127-K', 'review', 20, 'green', 111),
  ];
  const heavyCiJobs = Array.from({ length: 74 }, (_, i) => ({ runner: `r${i}`, job: `j${i}`, running_min: 3 }));
  const data = makeLayoutData({
    pipelinePrompts: prompts,
    runState: { heavy: { inProgress: heavyCiJobs, queued: [] }, light: { inProgress: [], queued: [] } },
  });

  // 현 출처 = pipelinePrompts.length = 4
  const current = data.pipelinePrompts.length;
  // 옛 출처(가상) = runState heavy+light inProgress 수 = 74
  const old = data.runState.heavy.inProgress.length + data.runState.light.inProgress.length;

  assert.notStrictEqual(current, old,
    `되돌림 시뮬레이션에서 두 출처가 같으면 검증의 검증이 무의미: current=${current} old=${old}`);

  // 현 출처가 실제 머리에 반영되는지 재확인
  const head = renderLayout(data).map(stripAnsi)[0];
  const m = head.match(/●진행\s+(\d+)/);
  assert.strictEqual(Number(m[1]), current,
    `머리가 현 출처(pipelinePrompts)를 쓰지 않으면 F126-meta-prog 빨강 — 어떤 변경이든 pipelinePrompts.length 로 복귀시킬 것`);
});
