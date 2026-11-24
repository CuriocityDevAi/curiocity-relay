// scripts/test/ci-watch-v2.test.mjs  M1-1124-P — ci-watch v2 단위 테스트
// 대상: 칸 융합 · 색 임계 · 숨김 규칙 · 성공률 재계산.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  classifyAge,
  shouldHideAfterMerge,
  recomputeSuccessRate,
  COLUMNS,
  COLUMN_LABELS,
} from '../watch/thresholds.mjs';
import { buildPipelineView, inRecentCodes, getIdDateCodes } from '../watch/pipeline-view.mjs';
import { renderV2, stripAnsi } from '../watch/render-v2.mjs';

// ---------- 임계 분류 ----------

test('T-1a: classifyAge — queue 2분 미만 녹●', () => {
  assert.deepEqual(classifyAge('queue', 1), { level: 'green', mark: '●' });
  assert.deepEqual(classifyAge('queue', 0), { level: 'green', mark: '●' });
});

test('T-1b: classifyAge — queue 2분 노▲ · 5분 빨■', () => {
  assert.deepEqual(classifyAge('queue', 2), { level: 'yellow', mark: '▲' });
  assert.deepEqual(classifyAge('queue', 4), { level: 'yellow', mark: '▲' });
  assert.deepEqual(classifyAge('queue', 5), { level: 'red', mark: '■' });
});

test('T-1c: classifyAge — hub 기본 노 28/빨 40', () => {
  assert.deepEqual(classifyAge('hub', 10), { level: 'green', mark: '●' });
  assert.deepEqual(classifyAge('hub', 28), { level: 'yellow', mark: '▲' });
  assert.deepEqual(classifyAge('hub', 41), { level: 'red', mark: '■' });
});

test('T-1d: classifyAge — thresholdOverride 로 상한 바꾸기', () => {
  // 허브 상한 25분 프롬프트일 때 17.5분(70%) 이상 노, 25분 이상 빨
  assert.deepEqual(classifyAge('hub', 10, { yellow: 18, red: 25 }), { level: 'green', mark: '●' });
  assert.deepEqual(classifyAge('hub', 20, { yellow: 18, red: 25 }), { level: 'yellow', mark: '▲' });
  assert.deepEqual(classifyAge('hub', 25, { yellow: 18, red: 25 }), { level: 'red', mark: '■' });
});

// ---------- 숨김 규칙 ----------

test('T-2a: shouldHideAfterMerge — 머지 10분 이상 숨김', () => {
  assert.equal(shouldHideAfterMerge('merge', 5), false);
  assert.equal(shouldHideAfterMerge('merge', 10), true);
  assert.equal(shouldHideAfterMerge('merge', 59), true);
});

test('T-2b: shouldHideAfterMerge — 머지 아닌 칸은 절대 숨기지 않음', () => {
  assert.equal(shouldHideAfterMerge('queue', 999), false);
  assert.equal(shouldHideAfterMerge('ci_result', 30), false);
  assert.equal(shouldHideAfterMerge('review', 100), false);
});

test('T-2c: shouldHideAfterMerge — 커스텀 hideMin', () => {
  assert.equal(shouldHideAfterMerge('merge', 3, 5), false);
  assert.equal(shouldHideAfterMerge('merge', 5, 5), true);
});

// ---------- 성공률 재계산 (Kyu 22:50 #3) ----------

test('T-3a: recomputeSuccessRate — 취소/건너뜀 제외', () => {
  const recs = [
    { conclusion: 'success' },
    { conclusion: 'success' },
    { conclusion: 'skipped' },
    { conclusion: 'cancelled' },
    { conclusion: 'failure' },
  ];
  const r = recomputeSuccessRate(recs);
  // 유효 3건 (성공 2 · 실패 1) → 66.7%
  assert.equal(r.total, 3);
  assert.equal(r.failCount, 1);
  assert.equal(r.successRate, 66.7);
});

test('T-3b: recomputeSuccessRate — 전원 성공', () => {
  const r = recomputeSuccessRate([{ conclusion: 'success' }, { conclusion: 'success' }]);
  assert.equal(r.successRate, 100);
  assert.equal(r.failCount, 0);
});

test('T-3c: recomputeSuccessRate — 레코드 없음', () => {
  const r = recomputeSuccessRate([]);
  assert.equal(r.successRate, null);
  assert.equal(r.total, 0);
});

test('T-3d: recomputeSuccessRate — 전원 건너뜀', () => {
  const r = recomputeSuccessRate([{ conclusion: 'skipped' }, { conclusion: 'skipped' }]);
  assert.equal(r.total, 0);
  assert.equal(r.successRate, null);
});

// ---------- 날짜 코드 필터 ----------

test('T-4a: getIdDateCodes — 오늘/어제 MMDD 를 포함', () => {
  const now = new Date('2026-11-24T05:00:00Z'); // UTC
  const codes = getIdDateCodes(now);
  assert.ok(codes.has('1124'));
  assert.ok(codes.has('1123'));
});

test('T-4b: inRecentCodes — 오래된 ID 제외', () => {
  const codes = new Set(['1124', '1123']);
  assert.equal(inRecentCodes('M1-1124-P', codes), true);
  assert.equal(inRecentCodes('M1-1123-K', codes), true);
  assert.equal(inRecentCodes('M1-1105-BU', codes), false);
  assert.equal(inRecentCodes('R0-1118-AF', codes), false);
});

// ---------- buildPipelineView — mkdtemp 격리 테스트 ----------

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ci-watch-v2-'));
  mkdirSync(join(root, 'queue', 'm1'), { recursive: true });
  mkdirSync(join(root, 'queue', 'm2'), { recursive: true });
  mkdirSync(join(root, 'status', 'claims'), { recursive: true });
  mkdirSync(join(root, 'status', 'runners'), { recursive: true });
  mkdirSync(join(root, 'status', 'ci'), { recursive: true });
  mkdirSync(join(root, 'status', 'pipeline'), { recursive: true });
  mkdirSync(join(root, 'm1'), { recursive: true });
  mkdirSync(join(root, 'r0'), { recursive: true });
  return root;
}

// 테스트 기준일: 2026-11-24 UTC (MMDD=1124), WIB 는 +7h 로 같은 날짜 "1124".
const NOW_MS = new Date('2026-11-24T12:00:00Z').getTime();
const NOW = new Date(NOW_MS);

function stamp(path, mtimeMs) {
  const t = new Date(mtimeMs);
  utimesSync(path, t, t);
}

test('T-5a: buildPipelineView — queue 미착수 카드', () => {
  const root = makeFixture();
  const qPath = join(root, 'queue', 'm1', 'M1-1124-Z.md');
  writeFileSync(qPath, 'M1-1124-Z 작업 제목\n내용');
  stamp(qPath, NOW_MS - 90_000); // 90초 전

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const queue = view.cards.filter(c => c.column === 'queue');
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, 'M1-1124-Z');
  assert.equal(queue[0].ageMin, 2); // 90초 → 올림 2분
  assert.equal(queue[0].mark, '▲'); // 2분 → 노
});

test('T-5b: buildPipelineView — claim started → queue 에서 밀려남', () => {
  const root = makeFixture();
  writeFileSync(join(root, 'queue', 'm1', 'M1-1124-Y.md'), '제목');
  writeFileSync(join(root, 'status', 'claims', 'M1-1124-Y.json'),
    JSON.stringify({ id: 'M1-1124-Y', hub: 'm1', state: 'started' }));
  // hubs.m1.current 를 M1-1124-Y 로
  writeFileSync(join(root, 'status', 'runners', 'all.json'),
    JSON.stringify({ hubs: { m1: { current: 'M1-1124-Y', started_at: new Date(NOW_MS - 10 * 60_000).toISOString() } } }));

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  assert.equal(view.cards.filter(c => c.column === 'queue').length, 0);
  const hub = view.cards.find(c => c.column === 'hub');
  assert.equal(hub.id, 'M1-1124-Y');
  assert.equal(hub.ageMin, 10);
});

test('T-5c: buildPipelineView — 오래된 ID 는 큐에서 제외', () => {
  const root = makeFixture();
  writeFileSync(join(root, 'queue', 'm1', 'M1-1105-AA.md'), '오래된 작업');
  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  assert.equal(view.cards.length, 0);
});

test('T-5d: buildPipelineView — 리포트 PR URL → pr 칸, CI jsonl → ci_result', () => {
  const root = makeFixture();
  // 리포트 (최근 5분)
  const rptPath = join(root, 'm1', 'M1-1124-Q-report.md');
  writeFileSync(rptPath, 'PASS\n# M1-1124-Q 제목\nPR: https://github.com/CuriocityDevAi/storeport/pull/9999\n');
  stamp(rptPath, NOW_MS - 5 * 60_000);
  // CI jsonl 매칭 (3분 전 완료)
  writeFileSync(join(root, 'status', 'ci', '2026-11-24.jsonl'),
    JSON.stringify({ id: 1, repo: 'r', pr: 9999, workflow: 'ci', job: 'lint',
      runner_kind: 'mac-light', created_at: new Date(NOW_MS - 10 * 60_000).toISOString(),
      started_at: new Date(NOW_MS - 10 * 60_000).toISOString(),
      completed_at: new Date(NOW_MS - 3 * 60_000).toISOString(), conclusion: 'success' }) + '\n');
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const card = view.cards.find(c => c.id === 'M1-1124-Q');
  assert.ok(card, 'card should exist');
  assert.equal(card.column, 'ci_result');
  assert.equal(card.extra.ci.conclusion, 'success');
});

test('T-5e: buildPipelineView — PR URL 있고 CI 매칭 없음 → ci_pending (예측)', () => {
  const root = makeFixture();
  const rptPath = join(root, 'm1', 'M1-1124-R-report.md');
  writeFileSync(rptPath, 'PASS\n# M1-1124-R\nPR: https://github.com/CuriocityDevAi/storeport/pull/8888\n');
  stamp(rptPath, NOW_MS - 2 * 60_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const card = view.cards.find(c => c.id === 'M1-1124-R');
  assert.ok(card);
  assert.equal(card.column, 'ci_pending');
  assert.equal(card.predicted, true);
});

test('T-5f: buildPipelineView — pipeline.jsonl merged + 11분 전 → 숨김, doneToday 증가', () => {
  const root = makeFixture();
  const rptPath = join(root, 'm1', 'M1-1124-S-report.md');
  writeFileSync(rptPath, '# S\nPR: https://github.com/CuriocityDevAi/storeport/pull/7777');
  stamp(rptPath, NOW_MS - 15 * 60_000);
  writeFileSync(join(root, 'status', 'pipeline', 'M1-1124-S.jsonl'),
    JSON.stringify({ type: 'merged', at: new Date(NOW_MS - 11 * 60_000).toISOString() }) + '\n');
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  assert.equal(view.cards.find(c => c.id === 'M1-1124-S'), undefined);
  assert.equal(view.doneToday, 1);
});

test('T-5g: buildPipelineView — r0 review mtime < 2h → review 칸', () => {
  const root = makeFixture();
  const r0 = join(root, 'r0', 'R0-1124-K-report.md');
  writeFileSync(r0, 'APPROVE\n\nR0-1124-K — M1-1124-Q 리뷰\nPR: x');
  stamp(r0, NOW_MS - 30 * 60_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const card = view.cards.find(c => c.id === 'M1-1124-Q');
  assert.ok(card);
  assert.equal(card.column, 'review');
  assert.equal(card.ageMin, 30);
});

// ---------- 렌더 스모크 ----------

test('T-6a: renderV2 — 빈 뷰에서도 상단/하단 라인 포함', () => {
  const view = {
    cards: [], hubCurrents: {}, hubOrder: {},
    doneToday: 0, anomalies: [], today: null, todaySuccess: null, stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: '2026-11-24 23:00:00' });
  const text = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('ci-watch v2'));
  assert.ok(text.includes('경보 없음'));
});

test('T-6b: renderV2 narrow (< 60) — 세로 쌓기 (빈 칸 "--")', () => {
  const view = {
    cards: [{ id: 'M1-1124-Z', hub: 'm1', column: 'queue', ageMin: 1, mark: '●', level: 'green', title: '테스트 제목' }],
    hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 55, timeStr: 't' });
  const text = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('큐(1)'));
  assert.ok(text.includes('M1-1124-Z'));
  assert.ok(text.includes('허브작업(0)  --'));
});

test('T-6c: renderV2 — 노/빨 카드는 이유 줄 포함', () => {
  const view = {
    cards: [
      { id: 'M1-1124-Z', column: 'hub', hub: 'm1', ageMin: 45, mark: '■', level: 'red', title: '허브 과업', reason: '허브작업 45분 (상한 초과)' },
    ],
    hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('허브작업 45분'));
});

// ---------- COLUMNS/LABELS 안전 ----------

test('T-7a: COLUMNS 9칸 순서 일관', () => {
  assert.deepEqual(COLUMNS, ['queue','hub','report','pr','ci_pending','ci_running','ci_result','review','merge']);
});

test('T-7b: COLUMN_LABELS 전체 한국어', () => {
  for (const c of COLUMNS) {
    assert.ok(COLUMN_LABELS[c], `missing label for ${c}`);
  }
});
