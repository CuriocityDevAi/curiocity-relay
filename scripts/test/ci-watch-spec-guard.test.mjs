// scripts/test/ci-watch-spec-guard.test.mjs  M0-1127-A — specs/screens/ci-watch.md 보존 테스트
//
// 이 테스트가 깨지면 ci-watch 기본 화면이 명세와 어긋났다는 뜻 — 코드가 아니라 명세부터 확인.
// 커버 (REQ 5):
//   G-SECT:   구역 6개 (머리줄·허브 큐·CI 큐·진행 중·오늘 완료 + 주의) 가 순서대로 있음
//   G-PROG:   진행 중 줄에 9칸 띠 (●/◐/○ 합 == 9) 와 단계 이름이 있음
//   G-HEAD:   머리줄 ●진행 N  (N == 진행 중 구역 줄 수)
//   G-RENDER: 화면에 [build-hubs]·[claim] 같은 러너 로그 접두 없음
//   G-CIQ:    CI 큐 열 제목 6개 (풀·대기·MBP M1·iMAC M1·클라우드·평균대기)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderLayout } from '../watch/ci-watch-render.mjs';
import { stripAnsi } from '../watch/text-width.mjs';

// ─── 픽스처 ─────────────────────────────────────────────────────────────────

function makeAllJson() {
  return {
    at: new Date().toISOString(),
    runner: 'v8.3.2',
    pid: 12345,
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
      m0: { current: 'M0-1127-A', started_at: new Date(Date.now() - 5 * 60_000).toISOString() },
      m1: { current: null },
      m2: { current: null },
      m3: { current: null },
      r0: { current: null },
    },
    git_state: { ahead: 0, behind: 0, rebase_in_progress: false, needs_human: false },
    // CW-RENDER: 러너 로그가 err_tail 에 섞여 있어도 화면에 노출되면 안 됨
    err_tail: [
      '[build-hubs] scanned hubs (10): k0, k1, k2, m0, m1, m2, m3, n0, r0, t0',
      '[build-hubs] status/hubs.json rewritten (10 hubs)',
      '[claim] wrote status/claims/M0-1127-A.json',
      '[hub-runner-v8.3.2:m0 2026-11-26T22:40:51.702Z] pick · M0-1127-A',
    ].join('\n'),
  };
}

// CW-PROG: 3 개 프롬프트 (큐·CI실행·리뷰). 각 단계 띠가 서로 달라야 함.
function makePrompts() {
  return [
    { id: 'M1-1127-A', hub: 'm1', column: 'hub',        ageMin: 5,
      level: 'green',  mark: '●', title: '예시 프롬프트 1',
      extra: { pr: { number: 101 } } },
    { id: 'M2-1127-A', hub: 'm2', column: 'ci_running', ageMin: 12,
      level: 'yellow', mark: '▲', title: '예시 프롬프트 2',
      extra: { pr: { number: 202 } } },
    { id: 'M3-1127-A', hub: 'm3', column: 'review',     ageMin: 35,
      level: 'red',    mark: '■', title: '예시 프롬프트 3', reason: '리뷰 체류 35분',
      extra: { pr: { number: 303 } } },
  ];
}

function makeLayoutData(overrides = {}) {
  return {
    allJson: makeAllJson(),
    runState: { heavy: { inProgress: [], queued: [] }, light: { inProgress: [], queued: [] } },
    cloudData: { realCount: 0, limit: 5, totalMin: 0, last3: [] },
    runnerAlerts: [],
    ciAlerts:    [],
    ciDimAlerts: [],
    timeStr: '2026/11/27 05:32:00',
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
    version: '1.18',
    versionNote: '',
    fileCommitDate: '2026-11-27',
    poolWaitStats: {},
    hubWaitStats: {},
    todayMachineStats: { mbp: { jobs: 0, avgRun: 0 }, imac: { jobs: 0, avgRun: 0 } },
    todayPoolMachineStats: null,
    machineRecentStats: null,
    pipelinePrompts: makePrompts(),
    ...overrides,
  };
}

// ─── G-SECT: 구역 6개 순서 ──────────────────────────────────────────────────

test('G-SECT: 머리줄→허브 큐→CI 큐→진행 중→오늘 완료→주의 순서 (주의 있을 때)', () => {
  const data = makeLayoutData({ runnerAlerts: [{ msg: 'iMac heartbeat 끊김' }] });
  const text = renderLayout(data).map(stripAnsi).join('\n');
  const indexes = {
    head:    text.indexOf('ci-watch v1.18'),
    hubq:    text.indexOf('─ 허브 큐 ('),
    ciq:     text.indexOf('─ CI 큐 ('),
    prog:    text.indexOf('─ 진행 중 ('),
    done:    text.indexOf('─ 오늘 완료 '),
    alert:   text.indexOf('─ 주의 ('),
  };
  for (const [k, v] of Object.entries(indexes)) {
    assert.ok(v >= 0, `${k} 구역 없음`);
  }
  assert.ok(indexes.head < indexes.hubq, 'head < hubq');
  assert.ok(indexes.hubq < indexes.ciq, 'hubq < ciq');
  assert.ok(indexes.ciq  < indexes.prog, 'ciq < prog');
  assert.ok(indexes.prog < indexes.done, 'prog < done');
  assert.ok(indexes.done < indexes.alert, 'done < alert');
});

test('G-SECT-5: 주의 없으면 5개 구역만 (머리줄·허브 큐·CI 큐·진행 중·오늘 완료)', () => {
  const data = makeLayoutData();
  const text = renderLayout(data).map(stripAnsi).join('\n');
  assert.ok(text.includes('─ 허브 큐 ('), '허브 큐 없음');
  assert.ok(text.includes('─ CI 큐 ('), 'CI 큐 없음');
  assert.ok(text.includes('─ 진행 중 ('), '진행 중 없음');
  assert.ok(text.includes('─ 오늘 완료 '), '오늘 완료 없음');
});

// ─── G-PROG: 9칸 띠 + 단계 이름 ─────────────────────────────────────────────

test('G-PROG: 진행 중 줄에 9칸 띠 (●/◐/○ 합 = 9) 와 단계 이름', () => {
  const data = makeLayoutData();
  const lines = renderLayout(data).map(stripAnsi);
  // 진행 중 제목 아래 3 줄 (프롬프트 수) 확인
  const progIdx = lines.findIndex(l => l.startsWith('─ 진행 중 ('));
  assert.ok(progIdx >= 0, '진행 중 제목 없음');
  const promptLines = lines.slice(progIdx + 1).filter(l => /^\s*[●▲■○]/.test(l) && !l.startsWith('    └'));
  assert.ok(promptLines.length >= 3, `프롬프트 줄 ≥3 기대 · 받음=${promptLines.length}`);

  const stageLabels = ['큐', '작업', '리포트', 'PR', 'CI대기', 'CI실행', 'CI결과', '리뷰', '머지'];
  for (let i = 0; i < 3; i++) {
    const line = promptLines[i];
    // 9칸 띠만 추출 — 선행 mark(●/▲/■) 는 제외하기 위해 "연속 9칸" 패턴 매치
    const stripMatch = line.match(/[●◐○]{9}/);
    assert.ok(stripMatch, `진행 중 줄 [${i}] 9칸 띠 패턴 없음: "${line}"`);
    const strip = stripMatch[0];
    // ● + ◐ + ○ 합 = 9 (한 번만 등장)
    const total = (strip.match(/[●◐○]/g) || []).length;
    assert.strictEqual(total, 9,
      `진행 중 줄 [${i}] 띠 칸 ≠ 9 (실제 ${total}): "${line}"`);
    // ◐ 는 정확히 하나 (현재 단계)
    const currentDots = (strip.match(/◐/g) || []).length;
    assert.strictEqual(currentDots, 1,
      `진행 중 줄 [${i}] ◐(현재) 1 개 아님 (실제 ${currentDots}): "${line}"`);
    const hasStageLabel = stageLabels.some(lbl => line.includes(lbl));
    assert.ok(hasStageLabel, `진행 중 줄 [${i}] 단계 이름 없음: "${line}"`);
  }

  // red 줄 뒤에 └ 이유 (M3-1127-A)
  const reasonLine = lines.find(l => l.includes('└ 리뷰 체류 35분'));
  assert.ok(reasonLine, 'red 줄 다음 └ 이유 줄 없음');
});

// ─── G-HEAD: ●진행 N = 줄 수 ───────────────────────────────────────────────

test('G-HEAD: 머리줄 ●진행 N 이 진행 중 줄 수와 일치', () => {
  const data = makeLayoutData();
  const lines = renderLayout(data).map(stripAnsi);
  const head = lines[0];
  const m = head.match(/●진행\s+(\d+)/);
  assert.ok(m, `머리줄 ●진행 N 패턴 없음: "${head}"`);
  const headN = Number(m[1]);
  assert.strictEqual(headN, 3, `머리줄 ●진행 ${headN} ≠ 프롬프트 3`);

  // 진행 중 구역 제목 N 도 3
  const titleLine = lines.find(l => l.startsWith('─ 진행 중 ('));
  assert.ok(titleLine.includes('(3)'),
    `진행 중 제목에 (3) 없음: "${titleLine}"`);
});

test('G-HEAD-0: 프롬프트 0 건이면 ●진행 0 (CI 잡 수 아님)', () => {
  // runState 에 CI 잡 을 넣어도 pipelinePrompts=[] 이면 ●진행 0
  const data = makeLayoutData({
    pipelinePrompts: [],
    runState: {
      heavy: { inProgress: [{ runner: 'x', job: 'y', running_min: 3 }], queued: [] },
      light: { inProgress: [], queued: [] },
    },
  });
  const lines = renderLayout(data).map(stripAnsi);
  const head = lines[0];
  const m = head.match(/●진행\s+(\d+)/);
  assert.ok(m, `머리줄 ●진행 N 패턴 없음: "${head}"`);
  assert.strictEqual(Number(m[1]), 0,
    `CI 잡은 있지만 프롬프트 0 → ●진행 0 이어야 함 (CI 잡 수를 세면 안 됨): "${head}"`);
});

// ─── G-RENDER: 러너 로그 접두 없음 ──────────────────────────────────────────

test('G-RENDER: 화면에 [build-hubs]·[claim]·[hub-runner-*] 접두 없음', () => {
  const data = makeLayoutData();
  const text = renderLayout(data).map(stripAnsi).join('\n');
  for (const prefix of ['[build-hubs]', '[claim]', '[hub-runner-v8']) {
    assert.ok(!text.includes(prefix),
      `화면에 러너 로그 접두 "${prefix}" 노출됨 — err_tail 필터 누락`);
  }
});

// ─── G-CIQ: CI 큐 열 제목 6개 ──────────────────────────────────────────────

test('G-CIQ: CI 큐 열 제목 6개 (풀·대기·MBP M1·iMAC M1·클라우드·평균대기)', () => {
  const data = makeLayoutData();
  const lines = renderLayout(data).map(stripAnsi);
  const ciqIdx = lines.findIndex(l => l.startsWith('─ CI 큐 ('));
  assert.ok(ciqIdx >= 0, 'CI 큐 제목 없음');
  // 바로 다음 줄이 열 제목
  const hdr = lines[ciqIdx + 1];
  for (const title of ['풀', '대기', 'MBP M1', 'iMAC M1', '클라우드', '평균대기']) {
    assert.ok(hdr.includes(title), `CI 큐 열 제목 "${title}" 없음: "${hdr}"`);
  }
});
