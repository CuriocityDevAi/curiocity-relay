// scripts/test/ci-watch-w115.test.mjs  M2-1126-Q — v1.15 집계 일관성 (Kyu 신뢰 회복)
//
// 커버:
//   W115-G1:   checkAggregateInvariants — 클라우드 top/bottom 불일치 감지
//   W115-G2:   전체 PR ≠ 세 줄 합 감지
//   W115-G3:   전체 PT ≠ 세 줄 합 감지
//   W115-G4:   전체 잡 ≠ 세 줄 합 감지
//   W115-OK:   올바른 집계 → msgs = []
//   W115-sum:  renderLayout — 전체 오늘 = 세 줄 단순 합
//   W115-cloud-unified: 오늘 처리(잡) 클라우드 셀 == 클라우드 오늘 줄 잡 (단일 소스)
//   W115-imac-쉼: online+idle+partial=true 여도 '쉼' (과거 '?' 버그)
//   W115-guard-screen: top==bottom(동일 변수) → 화면에 ⚠ 집계 불일치 없음
//   W115-jsonl: 실제 status/ci/2026-11-26.jsonl 손계산 == export 함수 출력

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  checkAggregateInvariants,
  renderLayout,
  buildMachineState,
  isCountableJob,
  classifyMachine,
} from '../watch/ci-watch-render.mjs';
import { stripAnsi } from '../watch/text-width.mjs';
// ci-watch.mjs 에서 export 된 함수들 — JSONL 손계산 검증용
import {
  computeCloudTodayPRStats,
  computeMachineTodayPRStats,
  readRealCloudData,
} from '../ci-watch.mjs';

// ─── 공통 헬퍼 (w113 과 동일한 shape) ─────────────────────────────────────────

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
    timeStr:     '2026/11/26 22:07:00',
    fullMode:    false,
    todayStats:  {
      // v1.15 이전 '162' 같은 값이 todayStats.cloud.jobs 에 들어와도
      // 전체 집계가 cd.realCount 로 고정돼야 함 (불일치 수치 주입 테스트)
      'mac-heavy': { jobs: 70, avg_run_min: 2.5 },
      'mac-light': { jobs: 60, avg_run_min: 0.5 },
      cloud: { jobs: 162, avg_run_min: 1.3 },
      cloud_cost_est_usd: 2.14,
    },
    cloudTodayCount: 0,
    cloudLimit:  5,
    lastCiByRepo: [],
    countdownSec: 30,
    hubReportStatus: {},
    hubPending:  {},
    spinnerFrame: 0,
    terminalWidth: 140,
    version:     '1.15',
    versionNote: '',
    poolWaitStats:        {},
    hubWaitStats:         {},
    todayMachineStats:    { mbp: { jobs: 82, avgRun: 2.5 }, imac: { jobs: 138, avgRun: 1.8 } },
    todayPoolMachineStats: null,
    machineRecentStats:   null,
    summaryPR:   22,   // 고유 PR (참고용)
    summaryPT:   null,
    summaryJobs: 244,  // 전수 잡 (참고용)
    cloudPR:     11,
    cloudPT:     14,
    mbpPR:       12,
    mbpPT:       13,
    imacPR:      15,
    imacPT:      19,
    ...overrides,
  };
}

// ─── W115-G1~G4: checkAggregateInvariants 가드 메시지 ───────────────────────

test('W115-G1: 클라우드 top ≠ bottom → 불일치 메시지', () => {
  const msgs = checkAggregateInvariants({
    topCloudJobs: 146, bottomCloudJobs: 24,
    mbpPRv: 12, imacPRv: 15, cloudPRv: 11, totalPR: 38,
    mbpPTv: 13, imacPTv: 19, cloudPTv: 14, totalPT: 46,
    mbpJobs: 82, imacJobs: 134, cloudJobs: 24, totalJobs: 240,
  });
  assert.ok(msgs.some(m => m.includes('클라우드 상단 146 ≠ 하단 24')),
    `클라우드 top/bottom 불일치 메시지 없음: ${JSON.stringify(msgs)}`);
});

test('W115-G2: 전체 PR ≠ 세 줄 합 → 불일치 메시지', () => {
  const msgs = checkAggregateInvariants({
    topCloudJobs: 24, bottomCloudJobs: 24,
    mbpPRv: 12, imacPRv: 15, cloudPRv: 11, totalPR: 22, // 22 ≠ 38
    mbpPTv: 13, imacPTv: 19, cloudPTv: 14, totalPT: 46,
    mbpJobs: 82, imacJobs: 134, cloudJobs: 24, totalJobs: 240,
  });
  assert.ok(msgs.some(m => m.includes('전체 PR 22 ≠')),
    `전체 PR 불일치 메시지 없음: ${JSON.stringify(msgs)}`);
});

test('W115-G3: 전체 PT ≠ 세 줄 합 → 불일치 메시지', () => {
  const msgs = checkAggregateInvariants({
    topCloudJobs: 24, bottomCloudJobs: 24,
    mbpPRv: 12, imacPRv: 15, cloudPRv: 11, totalPR: 38,
    mbpPTv: 13, imacPTv: 19, cloudPTv: 14, totalPT: 110, // 110 ≠ 46
    mbpJobs: 82, imacJobs: 134, cloudJobs: 24, totalJobs: 240,
  });
  assert.ok(msgs.some(m => m.includes('전체 PT 110 ≠')),
    `전체 PT 불일치 메시지 없음: ${JSON.stringify(msgs)}`);
});

test('W115-G4: 전체 잡 ≠ 세 줄 합 → 불일치 메시지', () => {
  const msgs = checkAggregateInvariants({
    topCloudJobs: 24, bottomCloudJobs: 24,
    mbpPRv: 12, imacPRv: 15, cloudPRv: 11, totalPR: 38,
    mbpPTv: 13, imacPTv: 19, cloudPTv: 14, totalPT: 46,
    mbpJobs: 82, imacJobs: 134, cloudJobs: 24, totalJobs: 250, // 250 ≠ 240
  });
  assert.ok(msgs.some(m => m.includes('전체 잡 250 ≠')),
    `전체 잡 불일치 메시지 없음: ${JSON.stringify(msgs)}`);
});

test('W115-OK: 모든 집계 일치 → msgs = []', () => {
  const msgs = checkAggregateInvariants({
    topCloudJobs: 24, bottomCloudJobs: 24,
    mbpPRv: 12, imacPRv: 15, cloudPRv: 11, totalPR: 38,
    mbpPTv: 13, imacPTv: 19, cloudPTv: 14, totalPT: 46,
    mbpJobs: 82, imacJobs: 138, cloudJobs: 24, totalJobs: 244,
  });
  assert.deepEqual(msgs, [], `일치인데 메시지 뜸: ${JSON.stringify(msgs)}`);
});

// ─── W115-sum: 전체 오늘 = 세 줄 합 ─────────────────────────────────────────

test('W115-sum: renderLayout — 전체 오늘 = MBP + iMAC + 클라우드 단순 합', () => {
  const lines = renderLayout(makeLayoutData());
  const foundLine = lines.map(l => stripAnsi(l)).find(l => l.includes('전체 오늘'));
  assert.ok(foundLine, '전체 오늘 줄 없음');
  // mbpPR=12 + imacPR=15 + cloudPR=11 = 38
  // mbpPT=13 + imacPT=19 + cloudPT=14 = 46
  // mbp.jobs=82 + imac.jobs=138 + cd.realCount=24 = 244
  assert.ok(foundLine.includes('PR 38'),  `전체 PR 38 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('PT 46'),  `전체 PT 46 없음: "${foundLine}"`);
  assert.ok(foundLine.includes('잡 244'), `전체 잡 244 없음: "${foundLine}"`);
});

// ─── W115-cloud-unified: 상/하 클라우드 잡 동일 ──────────────────────────────

test('W115-cloud-unified: 오늘 처리(잡) 클라우드 셀 == 클라우드 오늘 잡 (단일 소스)', () => {
  // todayStats.cloud.jobs = 162 (옛 집계, 다른 값 주입) · cd.realCount = 24
  // v1.15: 둘 다 cd.realCount(24) 를 써야 함
  const lines = renderLayout(makeLayoutData());
  const text = stripAnsi(lines.join('\n'));
  // "오늘 처리(잡)" 행
  const todayLine = lines.map(l => stripAnsi(l)).find(l => l.includes('오늘 처리(잡)'));
  assert.ok(todayLine, '오늘 처리(잡) 행 없음');
  // 클라우드 셀에 24건 (cd.realCount), 162 아님
  assert.ok(todayLine.includes('24건'),
    `오늘 처리(잡) 클라우드 셀 24건 없음: "${todayLine}"`);
  assert.ok(!todayLine.includes('162건'),
    `오늘 처리(잡) 클라우드 셀 162건 (옛 소스) 여전히 등장: "${todayLine}"`);
  // 클라우드 오늘 줄 잡 24
  const cloudLine = lines.map(l => stripAnsi(l)).find(l => l.includes('클라우드 오늘'));
  assert.ok(cloudLine?.includes('잡 24'),
    `클라우드 오늘 줄 잡 24 없음: "${cloudLine}"`);
});

// ─── W115-imac-쉼: online+idle+partial → '쉼' ──────────────────────────────

test('W115-imac-쉼: online 러너 + partial=true 여도 idle → "쉼" (과거 "?" 버그)', () => {
  const allJson = makeAllJson({ ci: { data: {
    partial: true, // 다른 repo 조회 실패로 켜진 전역 플래그
    heavy: { in_progress: [], queued: 0 },
    light: { in_progress: [], queued: 0 },
    repos_failed: [],
  }}});

  // buildMachineState 로 직접 확인
  const ms = buildMachineState(allJson, { heavy: { inProgress: [], queued: [] }, light: { inProgress: [], queued: [] } });
  const sh = ms.get('storeport-heavy');
  assert.equal(sh.imac.status, 'idle', 'iMAC status 가 idle 아님');
  assert.equal(sh.imac.partial, false,
    `iMAC online+idle 인데 partial=true — "?" 버그 재발\n${JSON.stringify(sh.imac)}`);
});

// ─── W115-guard-screen: 정상 입력 → 화면에 ⚠ 집계 불일치 없음 ────────────────

test('W115-guard-screen: 정상 집계 → 화면에 ⚠ 집계 불일치 메시지 없음', () => {
  const lines = renderLayout(makeLayoutData());
  const text = stripAnsi(lines.join('\n'));
  assert.ok(!text.includes('⚠ 집계 불일치'),
    `정상 집계인데 ⚠ 집계 불일치 등장:\n${text}`);
});

// ─── W115-jsonl: 실제 2026-11-26.jsonl 손계산 == export 함수 ──────────────

test('W115-jsonl: 실제 status/ci/2026-11-26.jsonl 손계산 == 함수 출력', () => {
  const jsonlPath = join(homedir(), 'projects', 'curiocity-relay', 'status', 'ci', '2026-11-26.jsonl');
  if (!existsSync(jsonlPath)) {
    // 테스트 환경에 실제 파일 없으면 skip (회귀 안전망)
    return;
  }
  const records = readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  // 손계산: isCountableJob + classifyMachine(runner_name) === 'mbp'
  const handMbpPRs = new Set();
  let handMbpJobs = 0;
  const handImacPRs = new Set();
  let handImacJobs = 0;
  const handCloudPRs = new Set();
  let handCloudJobs = 0; // classifyMachine 기준
  let handCloudJobsRK = 0; // runner_kind 기준
  for (const r of records) {
    if (!isCountableJob(r)) continue;
    const pr = r.pr;
    const prKey = (pr && String(pr) !== '-' && String(pr) !== '0') ? `${r.repo}:${pr}` : null;
    const kind = classifyMachine(r.runner_name);
    if (kind === 'mbp') { handMbpJobs++; if (prKey) handMbpPRs.add(prKey); }
    else if (kind === 'imac') { handImacJobs++; if (prKey) handImacPRs.add(prKey); }
    else if (kind === 'cloud') { handCloudJobs++; if (prKey) handCloudPRs.add(prKey); }
    if (r.runner_kind === 'cloud') handCloudJobsRK++;
  }

  // 함수 출력
  const DATE = '2026-11-26';
  const mbpStats = computeMachineTodayPRStats(DATE, 'mbp');
  const imacStats = computeMachineTodayPRStats(DATE, 'imac');
  const cloudPrStats = computeCloudTodayPRStats(DATE);
  const cloudData = readRealCloudData(DATE, 5);

  // computeMachineTodayPRStats 는 ci-watch.mjs 쪽인데 import 를 위에서 못 했으니 재선언:
  // (v1.15: computeMachineTodayPRStats 는 ci-watch.mjs export)
  // 실측값 비교
  assert.equal(mbpStats.count, handMbpPRs.size,
    `MBP 고유 PR: 함수=${mbpStats.count} vs 손계산=${handMbpPRs.size}`);
  assert.equal(imacStats.count, handImacPRs.size,
    `iMAC 고유 PR: 함수=${imacStats.count} vs 손계산=${handImacPRs.size}`);
  assert.equal(cloudPrStats.count, handCloudPRs.size,
    `클라우드 고유 PR(classify): 함수=${cloudPrStats.count} vs 손계산=${handCloudPRs.size}`);
  // readRealCloudData 는 runner_kind === 'cloud' 기준 (classifyMachine 과 다를 수 있음)
  assert.equal(cloudData.realCount, handCloudJobsRK,
    `클라우드 잡(runner_kind): 함수=${cloudData.realCount} vs 손계산=${handCloudJobsRK}`);
});

// ─── W115-jsonl-print: 손계산 테이블 표시 (리포트용 참고) ──────────────────

test('W115-jsonl-print: 실제 jsonl 손계산 테이블 (리포트용 디버그 출력)', () => {
  const jsonlPath = join(homedir(), 'projects', 'curiocity-relay', 'status', 'ci', '2026-11-26.jsonl');
  if (!existsSync(jsonlPath)) return;
  const records = readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const stats = { mbp: {j:0,p:new Set()}, imac: {j:0,p:new Set()}, cloud: {j:0,p:new Set()}, unknown: {j:0,p:new Set()} };
  for (const r of records) {
    if (!isCountableJob(r)) continue;
    const kind = classifyMachine(r.runner_name);
    stats[kind].j++;
    const pr = r.pr; if (pr && String(pr) !== '-' && String(pr) !== '0') stats[kind].p.add(`${r.repo}:${pr}`);
  }
  console.log('\n[W115-handcalc] 2026-11-26.jsonl isCountableJob + classifyMachine:');
  for (const k of ['mbp','imac','cloud','unknown']) {
    console.log(`  ${k}: jobs=${stats[k].j}, unique PRs=${stats[k].p.size}`);
  }
  console.log(`  sum3 jobs = ${stats.mbp.j + stats.imac.j + stats.cloud.j}`);
  // 항상 통과 (디버그용)
  assert.ok(true);
});
