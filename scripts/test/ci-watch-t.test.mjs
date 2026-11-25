// scripts/test/ci-watch-t.test.mjs  M2-1125-T — 비동기 수집 · 데이터 원점 타이머 테스트
//
// 커버:
//   T-sha-1: buildExtendedViewAsync — dataOrigin.builtAt 과 sha 반환
//   T-sha-2: renderV2 — dataOrigin.builtAt 기반 live age 출력 (fetch-start 아님)
//   T-sha-3: renderDataOriginLine — builtAt 이 없으면 ageSec 폴백 표시
//   T-async-1: buildExtendedViewAsync — allJson 오버라이드로 정상 뷰 반환
//   T-async-2: buildExtendedViewAsync — skipGh=true 시 PR 상태 조회 없이 완료

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildExtendedViewAsync } from '../watch/collect-view.mjs';
import { renderV2, stripAnsi } from '../watch/render-v2.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = join(__dirname, '..', '..');

// ── T-sha-1: buildExtendedViewAsync — dataOrigin 구조 ──────────────────────

test('T-sha-1: buildExtendedViewAsync — dataOrigin.builtAt 필드 존재', async () => {
  const before = Date.now();
  const view = await buildExtendedViewAsync({
    repoRoot: REPO_ROOT,
    now: new Date(),
    skipFetch: true,
    skipGh: true,
  });
  const after = Date.now();

  assert.ok(view, 'view 반환');
  assert.ok(view.dataOrigin, 'dataOrigin 필드 존재');
  assert.ok(typeof view.dataOrigin.builtAt === 'number', 'builtAt 는 숫자');
  assert.ok(view.dataOrigin.builtAt >= before, 'builtAt >= 호출 전');
  assert.ok(view.dataOrigin.builtAt <= after, 'builtAt <= 호출 후');
});

// ── T-sha-2: renderV2 — builtAt 기반 live age 계산 ─────────────────────────

test('T-sha-2: renderV2 — builtAt 기반 경과 시간 "Ns 전" 출력', () => {
  const builtAt = Date.now() - 5000; // 5초 전
  const view = {
    cards: [],
    inProgress: [],
    caution: [],
    doneToday: 0,
    runnerVersion: '',
    ciRunnerPools: new Map(),
    ciPools: new Map(),
    hubQueue: new Map(),
    congestionAlerts: [],
    dataOrigin: { sha: 'abc1234', builtAt },
  };

  const lines = renderV2(view, {
    terminalWidth: 100,
    timeStr: '2026/11/25 12:00:00',
    version: '2.3.0',
    nowMs: Date.now(),
  });

  const originLine = lines.find(l => l.includes('origin/main'));
  assert.ok(originLine, 'data origin 줄 존재');
  const plain = stripAnsi(originLine);
  assert.ok(plain.includes('@abc1234'), 'SHA 표시');
  // "Ns 전" 형식 — fetch 아님
  assert.ok(/\d+s 전/.test(plain), `"Ns 전" 형식 출력 (got: "${plain}")`);
  assert.ok(!plain.includes('fetch 미완'), 'fetch 미완 아님');
  assert.ok(!plain.includes('전 fetch'), '"전 fetch" 아님 — builtAt 기반이어야 함');
});

// ── T-sha-3: renderV2 — builtAt 없을 때 ageSec 폴백 ───────────────────────

test('T-sha-3: renderV2 — builtAt 없이 ageSec 로 폴백', () => {
  const view = {
    cards: [],
    inProgress: [],
    caution: [],
    doneToday: 0,
    runnerVersion: '',
    ciRunnerPools: new Map(),
    ciPools: new Map(),
    hubQueue: new Map(),
    congestionAlerts: [],
    dataOrigin: { sha: 'def5678', ageSec: 42 }, // builtAt 없음
  };

  const lines = renderV2(view, { terminalWidth: 100, timeStr: 'T', version: '2.3.0' });
  const originLine = lines.find(l => l.includes('origin/main'));
  assert.ok(originLine, 'data origin 줄 존재');
  const plain = stripAnsi(originLine);
  assert.ok(plain.includes('42s 전 fetch'), `ageSec 폴백 출력 (got: "${plain}")`);
});

// ── T-async-1: buildExtendedViewAsync — allJson 오버라이드 정상 뷰 반환 ─────

test('T-async-1: buildExtendedViewAsync — allJson 오버라이드로 정상 뷰 반환', async () => {
  const view = await buildExtendedViewAsync({
    repoRoot: REPO_ROOT,
    now: new Date(),
    allJson: { runner: 'test-v1', hubs: {}, ci: { data: {} }, ci_runners: [] },
    skipFetch: true,
    skipGh: true,
  });
  assert.ok(view.cards !== undefined, 'cards 필드 존재');
  assert.ok(view.inProgress !== undefined, 'inProgress 필드 존재');
  assert.equal(view.runnerVersion, 'test-v1', 'runnerVersion allJson 반영');
  assert.ok(view.dataOrigin?.builtAt, 'dataOrigin.builtAt 존재');
});

// ── T-async-2: buildExtendedViewAsync — skipGh=true 시 성공 완료 ────────────

test('T-async-2: buildExtendedViewAsync — skipGh=true 시 PR API 없이 완료', async () => {
  let prCallCount = 0;
  const mockFetchPrState = async () => { prCallCount++; return null; };

  const view = await buildExtendedViewAsync({
    repoRoot: REPO_ROOT,
    now: new Date(),
    skipFetch: true,
    skipGh: true,
    fetchPrState: mockFetchPrState,
  });

  assert.ok(view, 'view 반환');
  // skipGh=true 이면 fetchPrState 는 호출되지 않아야 함
  assert.equal(prCallCount, 0, 'skipGh=true 시 PR API 미호출');
});
