// scripts/test/ci-watch-v2.test.mjs  M2-1125-K — ci-watch v2 단위 테스트
// 대상: 칸 융합 · 색 임계 · 숨김 규칙 · 성공률 재계산 · 새 섹션 레이아웃 · EAW 폭 · PR 매핑 · R0 완료.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  classifyAge,
  shouldHideAfterMerge,
  recomputeSuccessRate,
  COLUMNS,
  COLUMN_LABELS,
} from '../watch/thresholds.mjs';
import { buildPipelineView, inRecentCodes, getIdDateCodes } from '../watch/pipeline-view.mjs';
import { buildExtendedView, stageStrip, stageLabel, HUB_PICKUP_RED_SEC, CI_PICKUP_RED_SEC } from '../watch/collect-view.mjs';
import { renderV2, stripAnsi, renderDetailPanel, spinnerChar } from '../watch/render-v2.mjs';
import { displayWidth, truncateWidth, padEndWidth } from '../watch/text-width.mjs';
import { extractPrUrl } from '../watch/sources-local.mjs';

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
  const now = new Date('2026-11-24T05:00:00Z');
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

const NOW_MS = new Date('2026-11-24T12:00:00Z').getTime();
const NOW    = new Date(NOW_MS);

// M2-1125-L 테스트용 Nov 25 기준 (1125 날짜 코드 ID)
const L_NOW_MS = new Date('2026-11-25T05:00:00Z').getTime(); // WIB 12:00 Nov 25
const L_NOW    = new Date(L_NOW_MS);

function stamp(path, mtimeMs) {
  const t = new Date(mtimeMs);
  utimesSync(path, t, t);
}

test('T-5a: buildPipelineView — queue 미착수 카드', () => {
  const root  = makeFixture();
  const qPath = join(root, 'queue', 'm1', 'M1-1124-Z.md');
  writeFileSync(qPath, 'M1-1124-Z 작업 제목\n내용');
  stamp(qPath, NOW_MS - 90_000);

  const view  = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const queue = view.cards.filter(c => c.column === 'queue');
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, 'M1-1124-Z');
  assert.equal(queue[0].ageMin, 2);
  assert.equal(queue[0].mark, '▲');
});

test('T-5b: buildPipelineView — claim started → queue 에서 밀려남', () => {
  const root = makeFixture();
  writeFileSync(join(root, 'queue', 'm1', 'M1-1124-Y.md'), '제목');
  writeFileSync(join(root, 'status', 'claims', 'M1-1124-Y.json'),
    JSON.stringify({ id: 'M1-1124-Y', hub: 'm1', state: 'started' }));
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
  assert.equal(view.cards.find(c => c.id === 'M1-1105-AA'), undefined);
});

test('T-5d: buildPipelineView — 리포트 PR URL → pr 칸, CI jsonl → ci_result', () => {
  const root    = makeFixture();
  const rptPath = join(root, 'm1', 'M1-1124-Q-report.md');
  writeFileSync(rptPath, 'PASS\n# M1-1124-Q 제목\nPR: https://github.com/CuriocityDevAi/storeport/pull/9999\n');
  stamp(rptPath, NOW_MS - 5 * 60_000);
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
  const root    = makeFixture();
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
  const root    = makeFixture();
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
  const r0   = join(root, 'r0', 'R0-1124-K-report.md');
  writeFileSync(r0, 'APPROVE\n\nR0-1124-K — M1-1124-Q 리뷰\nPR: x');
  stamp(r0, NOW_MS - 30 * 60_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const card = view.cards.find(c => c.id === 'M1-1124-Q');
  assert.ok(card);
  assert.equal(card.column, 'review');
  assert.equal(card.ageMin, 30);
});

// ---------- 렌더 스모크 (새 섹션 레이아웃) ----------

test('T-6a: renderV2 — 빈 뷰에서도 주요 섹션 헤더 포함', () => {
  const view = {
    cards: [], hubCurrents: {}, hubOrder: {},
    doneToday: 0, anomalies: [], today: null, todaySuccess: null, stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: '2026-11-24 23:00:00' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('ci-watch'), '헤더 포함');
  assert.ok(text.includes('주의 없음'), '주의 없음 섹션');
  assert.ok(text.includes('허브 큐'), '허브 큐 섹션');
  assert.ok(text.includes('진행 중'), '진행 중 섹션');
  assert.ok(text.includes('j/k'), '키 안내');
});

test('T-6b: renderV2 board narrow (< 60) — 세로 쌓기 (빈 칸 "--")', () => {
  const view = {
    cards: [{ id: 'M1-1124-Z', hub: 'm1', column: 'queue', ageMin: 1, mark: '●', level: 'green', title: '테스트 제목' }],
    hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 55, timeStr: 't', board: true });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('큐(1)'));
  assert.ok(text.includes('M1-1124-Z'));
  assert.ok(text.includes('허브작업(0)  --'));
});

test('T-6c: renderV2 — 주의 카드 이유 줄 포함', () => {
  const view = {
    cards: [
      { id: 'M1-1124-Z', column: 'hub', hub: 'm1', ageMin: 45, mark: '■', level: 'red',
        title: '허브 과업', reason: '허브작업 45분 (상한 초과)' },
    ],
    hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('주의 (1)'), '주의 1건');
  assert.ok(text.includes('M1-1124-Z'), 'ID 포함');
  assert.ok(text.includes('허브작업 45분'), '이유 포함');
});

// ---------- predicted review 경보 집계 제외 ----------

test('T-8a: buildPipelineView — review predicted=true: level green, 경보 집계 제외', () => {
  const root = makeFixture();
  const r0   = join(root, 'r0', 'R0-1124-KK-report.md');
  writeFileSync(r0, 'APPROVE\n\nR0-1124-KK — M1-1124-ZZ 리뷰\nPR: x');
  stamp(r0, NOW_MS - 45 * 60_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const card = view.cards.find(c => c.id === 'M1-1124-ZZ');
  assert.ok(card, 'review card should exist');
  assert.equal(card.column, 'review');
  assert.equal(card.predicted, true);
  assert.equal(card.level, 'green');
  assert.equal(card.mark, '●');
  assert.equal(card.reason, '예측·머지 여부 모름');
});

test('T-8b: buildPipelineView — review APPROVE 90분+ → 숨김 (doneToday 증가)', () => {
  const root = makeFixture();
  const r0   = join(root, 'r0', 'R0-1124-KM-report.md');
  writeFileSync(r0, 'APPROVE\n\nR0-1124-KM — M1-1124-ZM 리뷰\nPR: x');
  stamp(r0, NOW_MS - 95 * 60_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  assert.equal(view.cards.find(c => c.id === 'M1-1124-ZM'), undefined);
  assert.equal(view.doneToday, 1);
});

// ---------- COLUMNS/LABELS 안전 ----------

test('T-7a: COLUMNS 9칸 순서 일관', () => {
  assert.deepEqual(COLUMNS, ['queue','hub','report','pr','ci_pending','ci_running','ci_result','review','merge']);
});

test('T-7b: COLUMN_LABELS 전체 한국어', () => {
  for (const c of COLUMNS) assert.ok(COLUMN_LABELS[c], `missing label for ${c}`);
});

// ---------- EAW 표시 폭 함수 ----------

test('T-W1: displayWidth — 한글·이모지·●■▲·… 폭 계산', () => {
  assert.equal(displayWidth('abc'), 3);
  assert.equal(displayWidth('한글'), 4);
  assert.equal(displayWidth('a한b'), 4);
  assert.equal(displayWidth('●'), 2);
  assert.equal(displayWidth('■'), 2);
  assert.equal(displayWidth('▲'), 2);
  assert.equal(displayWidth('…'), 2);
  assert.equal(displayWidth('\x1b[32m한\x1b[0m'), 2, 'ANSI 코드 0칸');
  assert.equal(displayWidth('🎉'), 2);
  assert.equal(displayWidth('│'), 1);
  assert.equal(displayWidth('─'), 1);
});

test('T-W2: truncateWidth — 한글 포함 자르기', () => {
  assert.equal(truncateWidth('한글abcd', 7), '한글a…');
  assert.equal(truncateWidth('한글abc', 7), '한글abc');
  assert.equal(truncateWidth('한글한', 5), '한…');
  assert.equal(truncateWidth('', 10), '');
  assert.equal(truncateWidth('abc', 0), '');
});

test('T-W5: displayWidth — 경계 케이스 (VS-16 · ZWJ · 결합문자 · 피부색)', () => {
  // U+FE0F 변형선택자 → 0칸 · ☎️(☎+VS-16) = 2
  assert.equal(displayWidth('☎️'), 2, '☎️(☎+VS-16)=2 (현재 3이면 버그)');
  // U+200D ZWJ 단독 → 0칸
  assert.equal(displayWidth('‍'), 0, 'ZWJ 단독 0');
  // 결합 발음 부호 U+0300 → 0칸 · 'è'(e+U+0300) = 1
  assert.equal(displayWidth('è'), 1, 'è(e+U+0300)=1');
  // 피부색 수식어 U+1F3FB → 0칸 · 👋🏾 = 2
  assert.equal(displayWidth('\u{1F44B}\u{1F3FB}'), 2, '👋🏾=2 (skin tone 0칸)');
  // ZWJ 이모지 묶음 → 2칸 한 덩어리
  assert.equal(displayWidth('\u{1F468}‍\u{1F469}‍\u{1F467}'), 2, '👨‍👩‍👧=2 (ZWJ 묶음)');
  // 추가 결합 범위 1AB0·20D0·FE20
  assert.equal(displayWidth('a\u{1AB0}'), 1, 'U+1AB0 결합 0칸');
  assert.equal(displayWidth('a⃐'), 1, 'U+20D0 Combining Enclosing 0칸');
  assert.equal(displayWidth('a︠'), 1, 'U+FE20 Combining Half Mark 0칸');
});

test('T-W6: truncateWidth — grapheme cluster 경계 보존', () => {
  const family = '\u{1F468}‍\u{1F469}‍\u{1F467}'; // 👨‍👩‍👧 width=2
  // a(1)+family(2)+b(1) total=4, maxCols=3
  // a fits(1), family fits(3), b overflows → pop family(2)→w=1, 1+2=3≤3 → 'a…'
  assert.equal(truncateWidth('a' + family + 'b', 3), 'a…', 'ZWJ 묶음 통째로 팝');
  // decomposed è: grapheme boundary 보존
  const eGrave = 'è'; // è (e + combining grave)
  // ab+è+cd total displayWidth=5, maxCols=4
  // a(1)+b(1)+è(1→e는 첫cp)=3+c(1)=4, d overflows → 4+2=6>4 pop c(1)→3, 3+2=5>4 pop è(1)→2, 2+2=4 → 'ab…'
  assert.equal(truncateWidth('ab' + eGrave + 'cd', 4), 'ab…', 'è grapheme 통째로 팝');
});

test('T-W3: padEndWidth — EAW 기준 패딩', () => {
  const p1 = padEndWidth('한', 5);
  assert.equal(displayWidth(p1), 5);
  assert.ok(p1.endsWith('   '));

  const p2 = padEndWidth('abc', 5);
  assert.equal(displayWidth(p2), 5);

  const p3 = padEndWidth('\x1b[32m한\x1b[0m', 5);
  assert.equal(displayWidth(p3), 5);

  assert.equal(padEndWidth('한글', 4), '한글');
  assert.equal(padEndWidth('한글한', 4), '한글한');
});

// ---------- 박스 테두리 정렬 (board 모드) ----------

test('T-W4: renderV2 board — 한글 카드 포함 시 각 줄 표시 폭 동일', () => {
  const view = {
    cards: [
      { id: 'M1-1124-Z', column: 'queue', hub: 'm1', ageMin: 2, mark: '▲', level: 'yellow', title: '한글 카드 제목 테스트' },
      { id: 'M1-1124-A', column: 'hub',   hub: 'm1', ageMin: 10, mark: '●', level: 'green',  title: 'ASCII title only' },
    ],
    hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines    = renderV2(view, { terminalWidth: 100, timeStr: 't', board: true });
  const stripped = lines.map(l => stripAnsi(l));

  const topRows = stripped.filter(l => /^┌/.test(l));
  const botRows = stripped.filter(l => /^└/.test(l));
  assert.ok(topRows.length > 0);
  assert.ok(botRows.length > 0);

  const refWidth = displayWidth(topRows[0]);
  for (const row of botRows)  assert.equal(displayWidth(row), refWidth);
  for (const row of stripped.filter(l => /^│/.test(l))) {
    assert.equal(displayWidth(row), refWidth);
  }
});

// ---------- 단계 띠 (stageStrip) ----------

test('T-S1: stageStrip — 9단계 띠 올바른 기호', () => {
  assert.equal(stageStrip('queue'),      '◐○○○○○○○○', 'queue = 단계 0');
  assert.equal(stageStrip('hub'),        '●◐○○○○○○○', 'hub = 단계 1');
  assert.equal(stageStrip('report'),     '●●◐○○○○○○', 'report = 단계 2');
  assert.equal(stageStrip('pr'),         '●●●◐○○○○○', 'pr = 단계 3');
  assert.equal(stageStrip('ci_pending'), '●●●●◐○○○○', 'ci_pending = 단계 4');
  assert.equal(stageStrip('ci_running'), '●●●●●◐○○○', 'ci_running = 단계 5');
  assert.equal(stageStrip('ci_result'),  '●●●●●●◐○○', 'ci_result = 단계 6');
  assert.equal(stageStrip('review'),     '●●●●●●●◐○', 'review = 단계 7');
  assert.equal(stageStrip('merge'),      '●●●●●●●●◐', 'merge = 단계 8');
  assert.equal(stageStrip('unknown'),    '○○○○○○○○○', '알 수 없는 단계');
});

test('T-S2: stageLabel — 단계명 한국어', () => {
  assert.equal(stageLabel('queue'),      '큐');
  assert.equal(stageLabel('hub'),        '작업');
  assert.equal(stageLabel('report'),     '리포트');
  assert.equal(stageLabel('pr'),         'PR');
  assert.equal(stageLabel('ci_pending'), 'CI대기');
  assert.equal(stageLabel('ci_running'), 'CI실행');
  assert.equal(stageLabel('ci_result'),  'CI결과');
  assert.equal(stageLabel('review'),     '리뷰');
  assert.equal(stageLabel('merge'),      '머지');
});

// ---------- buildExtendedView ----------

function makeFullFixture() {
  const root = makeFixture();
  mkdirSync(join(root, 'queue', 'm0'), { recursive: true });
  mkdirSync(join(root, 'queue', 'm3'), { recursive: true });
  mkdirSync(join(root, 'queue', 'r0'), { recursive: true });
  return root;
}

test('T-E1: buildExtendedView — 허브 큐 미착수 항목 허브별 집계', () => {
  const root = makeFullFixture();
  const q1   = join(root, 'queue', 'm1', 'M1-1124-XA.md');
  const q2   = join(root, 'queue', 'm2', 'M2-1124-XB.md');
  writeFileSync(q1, '원장 대사: "작업 A 제목"\n내용');
  writeFileSync(q2, '원장 대사: "작업 B 제목"\n내용');
  stamp(q1, NOW_MS - 3 * 60_000);
  stamp(q2, NOW_MS - 1 * 60_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const m1q  = view.hubQueue.get('m1') || [];
  const m2q  = view.hubQueue.get('m2') || [];
  assert.equal(m1q.length, 1, 'm1에 1건');
  assert.equal(m1q[0].id, 'M1-1124-XA');
  assert.equal(m2q.length, 1, 'm2에 1건');
  assert.equal(m2q[0].id, 'M2-1124-XB');
  assert.equal((view.hubQueue.get('m3') || []).length, 0, 'm3 비어있음');
});

test('T-E2: buildExtendedView — inProgress = hub 카드, caution = red/yellow 항목', () => {
  const root = makeFullFixture();
  writeFileSync(join(root, 'queue', 'm1', 'M1-1124-XC.md'), '제목');
  writeFileSync(join(root, 'status', 'claims', 'M1-1124-XC.json'),
    JSON.stringify({ id: 'M1-1124-XC', hub: 'm1', state: 'started' }));
  writeFileSync(join(root, 'status', 'runners', 'all.json'),
    JSON.stringify({ hubs: { m1: {
      current: 'M1-1124-XC',
      started_at: new Date(NOW_MS - 45 * 60_000).toISOString(), // 45분 → red
    }}}));

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  // 특정 카드 M1-1124-XC 가 inProgress 와 caution 에 있는지 확인
  // (실제 ~/.hub-runner/reports 에 1124 날짜 리포트가 있으면 추가 카드가 생길 수 있어 exact count 미확인)
  const hubCard = view.inProgress.find(c => c.id === 'M1-1124-XC');
  assert.ok(hubCard, 'M1-1124-XC 가 inProgress 에 존재');
  assert.equal(hubCard.column, 'hub', 'hub 칼럼');
  const cauCard = view.caution.find(c => c.id === 'M1-1124-XC');
  assert.ok(cauCard, 'M1-1124-XC 가 caution 에 존재 (45분 → red)');
  assert.equal(cauCard.level, 'red');
});

test('T-E3: buildExtendedView — CI 러너 풀 상태 집계', () => {
  const root = makeFullFixture();
  writeFileSync(join(root, 'status', 'runners', 'all.json'),
    JSON.stringify({
      ci_runners: [
        { name: 'curiocity-mac-light', status: 'online', busy: false },
        { name: 'Youngkyus-MacBook-Pro-M1', status: 'online', busy: true },
        { name: 'curiocity-mac-fork', status: 'offline', busy: false },
        { name: 'curiocity-mac-fork-light', status: 'online', busy: false },
      ],
    }));

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  assert.equal(view.ciRunnerPools.get('storeport-light')?.status, 'online');
  assert.equal(view.ciRunnerPools.get('storeport-heavy')?.status, 'busy');
  assert.equal(view.ciRunnerPools.get('fork-heavy')?.status, 'offline');
  assert.equal(view.ciRunnerPools.get('fork-light')?.status, 'online');
});

// ---------- 새 섹션 렌더 — 0건 접힘 · 주의 · 허브큐 칩 · 진행중 띠 ----------

test('T-R1: renderV2 — 0건 주의 섹션 접힘(한 줄)', () => {
  const view = { cards: [], hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {} };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  // 주의 없음: 한 줄만 (헤더), 그 아래에 개별 카드 줄 없어야 함
  assert.ok(text.includes('주의 없음'), '주의 없음 헤더');
  assert.ok(!text.includes('주의 ('), '주의 (N) 없음');
});

test('T-R2: renderV2 — 0건 진행 중 섹션 접힘(한 줄)', () => {
  const view = { cards: [], hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {} };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('진행 중 (없음)'), '진행 중 없음 한 줄');
});

test('T-R3: renderV2 — 허브 큐 chip 표시 (ID + 대기분)', () => {
  const view = {
    cards: [],
    hubQueue: new Map([
      ['m0', []],
      ['m1', [{ id: 'M1-1124-XP', ageMin: 7, title: '어떤 제목' }]],
      ['m2', []],
      ['m3', []],
      ['r0', []],
    ]),
    hubCurrents: { m1: 'M1-1124-XQ' },
    hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('[M1-1124-XP 7분]'), '허브 큐 칩 ID+분');
  assert.ok(text.includes('m0'), 'm0 허브 줄');
  assert.ok(text.includes('m1'), 'm1 허브 줄');
});

test('T-R4: renderV2 — 진행 중 카드에 9단계 띠 포함', () => {
  const view = {
    cards: [
      { id: 'M2-1124-XQ', column: 'ci_pending', hub: 'm2', ageMin: 8, mark: '●', level: 'green',
        title: 'CI 대기 중' },
    ],
    hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  // ci_pending = 단계 4 → ●●●●◐○○○○
  assert.ok(text.includes('●●●●◐○○○○'), '9단계 띠 (ci_pending)');
  assert.ok(text.includes('M2-1124-XQ'), 'ID 포함');
});

test('T-R5: renderV2 — 폭 80 에서 주요 섹션 헤더가 깨지지 않음', () => {
  const view = {
    cards: [
      { id: 'M1-1124-XR', column: 'hub', hub: 'm1', ageMin: 10, mark: '●', level: 'green',
        title: '한글 제목 테스트 EAW 폭 80' },
    ],
    hubCurrents: { m1: 'M1-1124-XR' },
    hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 80, timeStr: '2026-11-25 10:47:00' });
  const stripped = lines.map(l => stripAnsi(l));

  // 섹션 헤더 줄은 "─ " 로 시작
  const headers = stripped.filter(l => l.startsWith('─ '));
  assert.ok(headers.length >= 3, '섹션 헤더 3개 이상');

  // 각 헤더 줄의 표시 폭이 80 이하인지 확인 (80 초과는 깨짐)
  for (const h of headers) {
    const w = displayWidth(h);
    assert.ok(w <= 82, `헤더 폭 ${w} 이 80±2 초과: "${h}"`);
  }

  // 진행 중 항목 줄도 폭 80 이하
  const inProgLines = lines.filter(l => stripAnsi(l).includes('M1-1124-XR'));
  assert.ok(inProgLines.length > 0, '진행 중 항목 줄 존재');
  for (const l of inProgLines) {
    const w = displayWidth(stripAnsi(l));
    assert.ok(w <= 82, `진행 중 줄 폭 ${w} 이 80±2 초과`);
  }
});

test('T-R6: renderV2 — CI 풀 OFF 경고 섹션 표시', () => {
  const ciPools = new Map([
    ['storeport-heavy', { queued: 0, queuedPrs: [], oldestMin: null, offlineReason: null }],
    ['storeport-light', { queued: 0, queuedPrs: [], oldestMin: null, offlineReason: null }],
    ['fork-heavy',      { queued: 0, queuedPrs: [], oldestMin: null, offlineReason: 'fork-heavy 러너 OFF — 클라우드로 넘기기 필요' }],
    ['fork-light',      { queued: 0, queuedPrs: [], oldestMin: null, offlineReason: null }],
  ]);
  const view = {
    cards: [], hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
    ciPools,
  };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('fork-heavy'), 'fork-heavy 풀 줄');
  assert.ok(text.includes('클라우드'), '오프라인 이유 포함');
});

// ---------- 상세 창 렌더 ----------

test('T-D1: renderDetailPanel — 카드 상세 창 출력', () => {
  const card = {
    id: 'M2-1124-XS', column: 'ci_running', hub: 'm2', ageMin: 15,
    mark: '▲', level: 'yellow', title: 'CI 실행 중 테스트',
    reason: 'CI 실행 15분 경과',
    extra: { pr: { number: 428 } },
  };
  const lines = renderDetailPanel(card, { terminalWidth: 80 });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('M2-1124-XS'), 'ID');
  assert.ok(text.includes('CI실행'), '단계명');
  assert.ok(text.includes('15분'), '경과 분');
  assert.ok(text.includes('#428'), 'PR 번호');
  // ci_running = 단계 5 → ●●●●●◐○○○
  assert.ok(text.includes('●●●●●◐○○○'), '9단계 띠 (ci_running)');
});

// ---------- --once 출력 캐처 (새 섹션) ----------

test('T-9a: renderV2 새 섹션 — hub 카드 포함 시 진행 중 섹션 표시', () => {
  const root = makeFullFixture();
  writeFileSync(join(root, 'status', 'runners', 'all.json'),
    JSON.stringify({ hubs: { m1: {
      current: 'M1-1124-QA',
      started_at: new Date(NOW_MS - 5 * 60_000).toISOString(),
    }}}));
  writeFileSync(join(root, 'status', 'claims', 'M1-1124-QA.json'),
    JSON.stringify({ id: 'M1-1124-QA', hub: 'm1', state: 'started' }));
  writeFileSync(join(root, 'queue', 'm1', 'M1-1124-QA.md'), '원장 대사: "한글 제목 테스트"\n내용');

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });

  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');

  assert.ok(text.includes('M1-1124-QA'), 'ID 포함');
  assert.ok(text.includes('ci-watch'), '헤더 포함');
  assert.ok(text.includes('진행 중'), '진행 중 섹션');

  // hr 줄 폭 확인
  for (const l of lines) {
    const plain = stripAnsi(l);
    if (plain.startsWith('─ ')) {
      const w = displayWidth(plain);
      assert.ok(w <= 102, `헤더 폭 ${w} 이 100±2 초과`);
    }
  }
});

test('T-9b: --once 박스 출력 캐처 — 한글/이모지 카드 포함', () => {
  const root = makeFixture();
  writeFileSync(join(root, 'queue', 'm1', 'M1-1124-QB.md'), '한글박스테스트\n내용');
  stamp(join(root, 'queue', 'm1', 'M1-1124-QB.md'), NOW_MS - 120_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });

  const boardLines = renderV2(view, { terminalWidth: 100, timeStr: 't', board: true });
  const boardText  = boardLines.map(l => stripAnsi(l)).join('\n');

  assert.ok(boardText.includes('M1-1124-QB'));
  assert.ok(boardText.includes('한글박스테스트'));

  const stripped   = boardLines.map(l => stripAnsi(l));
  const borderRows = stripped.filter(l => /^[┌└]/.test(l));
  if (borderRows.length > 1) {
    const ws = borderRows.map(l => displayWidth(l));
    assert.ok(ws.every(w => w === ws[0]), `테두리 폭 불일치: [${ws}]`);
  }

  const cardRows = stripped.filter(l => /^│/.test(l) && l.includes('M1-1124-QB'));
  if (borderRows.length > 0) {
    const refW = displayWidth(borderRows[0]);
    for (const row of cardRows) assert.equal(displayWidth(row), refW);
  }
});

// ========== M2-1125-J 신규 테스트 ==========

// ---------- 허브 큐 layout: 대기만 / 실행만 / 둘 다 / 둘 다 없음 ----------

function makeJ1Fixture() {
  const root = makeFullFixture();
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');
  return root;
}

test('T-Q1: 허브 큐 — 대기만 (실행 없음): └ 줄 없음', () => {
  const root = makeJ1Fixture();
  const q1   = join(root, 'queue', 'm1', 'M1-1124-QW.md');
  writeFileSync(q1, '원장 대사: "대기 작업 제목"\n내용');
  stamp(q1, NOW_MS - 2 * 60_000);

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const stripped = lines.map(stripAnsi);

  // 허브 큐 m1 행 찾기
  const hqStart = stripped.findIndex(l => l.startsWith('─ 허브 큐'));
  const hqEnd   = stripped.findIndex((l, i) => i > hqStart && l.startsWith('─ '));
  const hqLines = stripped.slice(hqStart, hqEnd === -1 ? undefined : hqEnd);

  const m1Idx = hqLines.findIndex(l => /^\s+m1\s/.test(l));
  assert.ok(m1Idx >= 0, 'm1 허브 행 존재');
  assert.ok(hqLines[m1Idx].includes('[M1-1124-QW 2분]'), '대기 칩 포함');
  // 실행 없으면 m1 다음 줄이 └ 아님
  if (m1Idx + 1 < hqLines.length) {
    const nextLine = hqLines[m1Idx + 1];
    assert.ok(!nextLine.includes('└') || /^\s+m/.test(nextLine), 'm1 아래 └ 줄 없음');
  }
});

test('T-Q2: 허브 큐 — 실행만 (대기 없음): └ 줄 있음, 칩 없음', () => {
  const root = makeJ1Fixture();
  writeFileSync(join(root, 'status', 'runners', 'all.json'),
    JSON.stringify({ hubs: { m1: {
      current: 'M1-1124-QX',
      started_at: new Date(NOW_MS - 5 * 60_000).toISOString(),
    }}}));
  writeFileSync(join(root, 'status', 'claims', 'M1-1124-QX.json'),
    JSON.stringify({ id: 'M1-1124-QX', hub: 'm1', state: 'started' }));
  writeFileSync(join(root, 'queue', 'm1', 'M1-1124-QX.md'), '제목');

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('└'), '└ 실행 줄 있음');
  assert.ok(text.includes('M1-1124-QX'), 'ID 포함');
});

test('T-Q3: 허브 큐 — 대기+실행 둘 다: 칩+└ 모두', () => {
  const root = makeJ1Fixture();
  const q1   = join(root, 'queue', 'm1', 'M1-1124-QY.md');
  writeFileSync(q1, '원장 대사: "대기 중"\n');
  stamp(q1, NOW_MS - 3 * 60_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'),
    JSON.stringify({ hubs: { m1: {
      current: 'M1-1124-QZ',
      started_at: new Date(NOW_MS - 7 * 60_000).toISOString(),
    }}}));
  writeFileSync(join(root, 'status', 'claims', 'M1-1124-QZ.json'),
    JSON.stringify({ id: 'M1-1124-QZ', hub: 'm1', state: 'started' }));
  writeFileSync(join(root, 'queue', 'm1', 'M1-1124-QZ.md'), '제목');

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('[M1-1124-QY 3분]'), '대기 칩');
  assert.ok(text.includes('└'), '└ 실행 줄');
});

test('T-Q4: 허브 큐 — 둘 다 없음: "—" 표시', () => {
  const root = makeJ1Fixture();
  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('—'), '빈 허브에 — 표시');
});

// ---------- 큐 정체 빨강 ----------

test('T-C1: 허브 큐 정체 — 59초(빨강 아님)', () => {
  const root = makeJ1Fixture();
  const q1   = join(root, 'queue', 'm2', 'M2-1124-CA.md');
  writeFileSync(q1, '제목');
  stamp(q1, NOW_MS - 59_000);  // 59초 — 60초 미만

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  assert.equal(
    view.congestionAlerts.filter(a => a.kind === 'hub_queue' && a.hub === 'm2').length,
    0, '59초 → 정체 아님'
  );
});

test('T-C2: 허브 큐 정체 — 61초(빨강)', () => {
  const root = makeJ1Fixture();
  const q1   = join(root, 'queue', 'm2', 'M2-1124-CB.md');
  writeFileSync(q1, '제목');
  stamp(q1, NOW_MS - 61_000);  // 61초 — 60초 초과

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const alerts = view.congestionAlerts.filter(a => a.kind === 'hub_queue' && a.hub === 'm2');
  assert.equal(alerts.length, 1, '61초 → 정체 1건');
  assert.ok(alerts[0].ageSec > HUB_PICKUP_RED_SEC, 'ageSec > 60');
});

test('T-C3: CI 러너 busy 일 때 대기 3분 → 빨강 아님', () => {
  const root = makeJ1Fixture();
  writeFileSync(join(root, 'status', 'runners', 'all.json'),
    JSON.stringify({
      ci_runners: [
        { name: 'Youngkyus-MacBook-Pro-M1', status: 'online', busy: true },
      ],
      ci: { data: {
        heavy: { queued: 1, queued_prs: [42], oldest_queued_min: 3, in_progress: [] },
        light: { queued: 0, queued_prs: [], oldest_queued_min: null, in_progress: [] },
      }},
    }));

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  // storeport-heavy busy → 대기 3분이어도 정체 아님
  const alerts = view.congestionAlerts.filter(a => a.kind === 'ci_queue' && a.pool === 'storeport-heavy');
  assert.equal(alerts.length, 0, 'busy 상태에서 대기 → 정체 아님');
});

test('T-C4: CI 러너 offline → 즉시 빨강 경보', () => {
  const root = makeJ1Fixture();
  writeFileSync(join(root, 'status', 'runners', 'all.json'),
    JSON.stringify({
      ci_runners: [
        { name: 'Youngkyus-MacBook-Pro-M1', status: 'offline', busy: false },
      ],
    }));

  const view = buildExtendedView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const alerts = view.congestionAlerts.filter(a => a.kind === 'ci_queue' && a.pool === 'storeport-heavy');
  assert.ok(alerts.length > 0, 'offline → 즉시 경보');
  assert.ok(alerts[0].reason.includes('OFF'), 'offline 이유 포함');
});

// ---------- 머지된 PR 카드 → 오늘 완료 ----------

test('T-M1: 머지된 PR 카드 → merge 단계로 이동 (오늘 완료)', () => {
  const root = makeFullFixture();

  // M1-1124-TM 자체 리포트 (PR URL 포함) → pipeline-view 가 extra.pr.number 를 세팅
  const m1rpt = join(root, 'm1', 'M1-1124-TM-report.md');
  writeFileSync(m1rpt, '# M1-1124-TM 리뷰 대상\nPR: https://github.com/CuriocityDevAi/storeport/pull/9000\n');
  stamp(m1rpt, NOW_MS - 10 * 60_000);

  // R0 리뷰 리포트 → review 단계 트리거
  const r0rpt = join(root, 'r0', 'R0-1124-TM-report.md');
  writeFileSync(r0rpt, 'APPROVE\n\nR0-1124-TM — M1-1124-TM 리뷰\nPR: https://github.com/CuriocityDevAi/storeport/pull/9000\n');
  stamp(r0rpt, NOW_MS - 10 * 60_000);

  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  // fetchPrState mock: PR 9000 → merged 5분 전
  const mergedAt = new Date(NOW_MS - 5 * 60_000).toISOString();
  const mockFetch = (prNum) => Number(prNum) === 9000
    ? { state: 'merged', mergedAt, cachedAt: NOW_MS }
    : null;

  const view = buildExtendedView({
    repoRoot: root, now: NOW, nowMs: NOW_MS,
    fetchPrState: mockFetch,
  });

  // 5분 머지 → shouldHideAfterMerge(10분) 미적용 → 카드가 merge 단계로 존재해야 함
  const card = view.cards.find(c => c.id === 'M1-1124-TM');
  assert.ok(card, 'M1-1124-TM 카드 존재');
  assert.equal(card.column, 'merge', 'PR merged → merge 단계');
});

// ---------- CI 큐 제목 형식 ----------

test('T-CI1: renderV2 — CI 큐 섹션 제목 SH/SL/FH/FL 형식', () => {
  const view = {
    cards: [], hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
    ciPools: new Map([
      ['storeport-heavy', { queued: 2, queuedPrs: [10, 11], oldestMin: 3, oldestSec: 180, inProgressItems: [], offlineReason: null, congested: false }],
      ['storeport-light', { queued: 0, queuedPrs: [], oldestMin: null, oldestSec: null, inProgressItems: [], offlineReason: null, congested: false }],
      ['fork-heavy',      { queued: 0, queuedPrs: [], oldestMin: null, oldestSec: null, inProgressItems: [], offlineReason: null, congested: false }],
      ['fork-light',      { queued: 0, queuedPrs: [], oldestMin: null, oldestSec: null, inProgressItems: [], offlineReason: null, congested: false }],
    ]),
    ciRunnerPools: new Map([
      ['storeport-heavy', { status: 'online', runners: [] }],
      ['storeport-light', { status: 'online', runners: [] }],
      ['fork-heavy',      { status: 'online', runners: [] }],
      ['fork-light',      { status: 'online', runners: [] }],
    ]),
  };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('CI 큐'), 'CI 큐 섹션명');
  assert.ok(text.includes('SH 2'), 'SH 카운트');
  assert.ok(text.includes('SL 0'), 'SL 카운트');
  assert.ok(text.includes('FH 0'), 'FH 카운트');
  assert.ok(text.includes('FL 0'), 'FL 카운트');
});

// ---------- 폭 80 모든 줄 ≤ 80 ----------

test('T-W6: renderV2 — 폭 80 에서 모든 줄 표시폭 ≤ 80', () => {
  const root = makeFullFixture();
  writeFileSync(join(root, 'status', 'runners', 'all.json'),
    JSON.stringify({ hubs: { m2: {
      current: 'M2-1124-WA',
      started_at: new Date(NOW_MS - 12 * 60_000).toISOString(),
    }}}));
  writeFileSync(join(root, 'status', 'claims', 'M2-1124-WA.json'),
    JSON.stringify({ id: 'M2-1124-WA', hub: 'm2', state: 'started' }));
  writeFileSync(join(root, 'queue', 'm2', 'M2-1124-WA.md'), '원장 대사: "폭 80 테스트 작업"\n내용');
  const q1 = join(root, 'queue', 'm1', 'M1-1124-WB.md');
  writeFileSync(q1, '원장 대사: "대기 중인 한글 작업 테스트"\n내용');
  stamp(q1, NOW_MS - 90_000);

  const view = buildExtendedView({
    repoRoot: root, now: NOW, nowMs: NOW_MS,
    fetchPrState: () => null,
  });
  const lines   = renderV2(view, { terminalWidth: 80, timeStr: '2026-11-25 11:00:00' });
  const stripped = lines.map(l => stripAnsi(l));

  for (const l of stripped) {
    const w = displayWidth(l);
    assert.ok(w <= 82, `줄 폭 ${w} > 82 (허용 오차 2): "${l.slice(0, 40)}..."`);
  }
});

// ========== M2-1125-K 신규 테스트 ==========

// ---------- extractPrUrl — 3개 리포 URL 파싱 ----------

test('T-URL1: extractPrUrl — storeport URL owner/repo/number 추출', () => {
  const root = mkdtempSync(join(tmpdir(), 'pr-url-'));
  const rpt  = join(root, 'report.md');
  writeFileSync(rpt, 'PASS\nPR: https://github.com/CuriocityDevAi/storeport/pull/428\n');
  const r = extractPrUrl(rpt);
  assert.ok(r, 'pr url 추출 성공');
  assert.equal(r.number, 428);
  assert.equal(r.owner,  'CuriocityDevAi');
  assert.equal(r.repo,   'storeport');
  assert.ok(r.url.includes('/pull/428'));
});

test('T-URL2: extractPrUrl — relay URL owner/repo/number 추출', () => {
  const root = mkdtempSync(join(tmpdir(), 'pr-url-'));
  const rpt  = join(root, 'report.md');
  writeFileSync(rpt, 'PASS\nPR: https://github.com/CuriocityDevAi/curiocity-relay/pull/31\n');
  const r = extractPrUrl(rpt);
  assert.ok(r);
  assert.equal(r.number, 31);
  assert.equal(r.owner,  'CuriocityDevAi');
  assert.equal(r.repo,   'curiocity-relay');
});

test('T-URL3: extractPrUrl — fork URL owner/repo/number 추출', () => {
  const root = mkdtempSync(join(tmpdir(), 'pr-url-'));
  const rpt  = join(root, 'report.md');
  writeFileSync(rpt, 'PASS\nPR: https://github.com/narisolutions/agilo-medusa-pos-fork/pull/257\n');
  const r = extractPrUrl(rpt);
  assert.ok(r);
  assert.equal(r.number, 257);
  assert.equal(r.owner,  'narisolutions');
  assert.equal(r.repo,   'agilo-medusa-pos-fork');
});

// ---------- R0 no-PR 완료 → 오늘 완료 ----------

test('T-K1: R0 done claim + APPROVE 리포트 → doneToday 증가, inProgress 제외', () => {
  const root = makeFullFixture();
  mkdirSync(join(root, 'r0'), { recursive: true });
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  // R0 큐 파일
  const qPath = join(root, 'queue', 'r0', 'R0-1124-KD.md');
  writeFileSync(qPath, 'R0-1124-KD\n원장 대사: "리뷰 프롬프트 완료 테스트"\n');
  stamp(qPath, NOW_MS - 60 * 60_000);

  // R0 done claim
  writeFileSync(join(root, 'status', 'claims', 'R0-1124-KD.json'),
    JSON.stringify({ id: 'R0-1124-KD', hub: 'r0', state: 'done' }));

  // R0 리포트 (최근 — reportRecentMin 이내 — 에서 감지되려면 최근이어야 함)
  mkdirSync(join(root, 'r0'), { recursive: true });
  const rptPath = join(root, 'r0', 'R0-1124-KD-report.md');
  writeFileSync(rptPath, 'APPROVE\n\nR0-1124-KD — M1-1124-ZZ 리뷰 완료\n');
  stamp(rptPath, NOW_MS - 5 * 60_000);

  const view = buildExtendedView({
    repoRoot: root, now: NOW, nowMs: NOW_MS,
    fetchPrState: () => null,
  });

  assert.equal(view.inProgress.find(c => c.id === 'R0-1124-KD'), undefined,
    'R0 done 카드가 inProgress 에 없어야 함');
  assert.ok(view.doneToday >= 1, `doneToday ${view.doneToday} >= 1`);
});

// ---------- 다중 소스 PR 매핑 — 오래된 리포트에서 PR URL 추출 ----------

test('T-K2: review 카드에 PR# 없음 + 25분 된 리포트 → step1.5 가 PR URL 추출 → merge 로 이동', () => {
  const root = makeFullFixture();
  mkdirSync(join(root, 'm1'), { recursive: true });
  mkdirSync(join(root, 'r0'), { recursive: true });
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  // 대상 리포트: 25분 전 (recentReports 20분 창 밖) — PR URL 포함
  const tgtRpt = join(root, 'm1', 'M1-1124-KT-report.md');
  writeFileSync(tgtRpt, 'PASS\nPR: https://github.com/CuriocityDevAi/storeport/pull/8001\n');
  stamp(tgtRpt, NOW_MS - 25 * 60_000);

  // R0 리뷰 → M1-1124-KT review 단계 트리거
  const r0Rpt = join(root, 'r0', 'R0-1124-KR-report.md');
  writeFileSync(r0Rpt, 'APPROVE\n\nR0-1124-KR — M1-1124-KT 리뷰\nPR: x\n');
  stamp(r0Rpt, NOW_MS - 5 * 60_000);

  // PR 8001 머지 15분 전 → HIDE_MIN(10) 초과 → doneToday 편입
  const mergedAt = new Date(NOW_MS - 15 * 60_000).toISOString();
  const mockFetch = (prNum) => Number(prNum) === 8001
    ? { state: 'merged', mergedAt, cachedAt: NOW_MS }
    : null;

  const view = buildExtendedView({
    repoRoot: root, now: NOW, nowMs: NOW_MS,
    fetchPrState: mockFetch,
  });

  // M1-1124-KT 는 inProgress 에 없어야 함 (15분 머지 → doneToday 편입)
  assert.equal(view.inProgress.find(c => c.id === 'M1-1124-KT'), undefined,
    'M1-1124-KT: 15분 머지 → inProgress 제외');
  assert.ok(view.doneToday >= 1, `doneToday ${view.doneToday} >= 1`);
});

// ---------- 스냅샷 픽스처: inProgress 에 머지된 카드 0건 ----------

test('T-K3: 스냅샷 픽스처 — 머지된 카드가 inProgress 에 남지 않음', () => {
  const root = makeFullFixture();
  mkdirSync(join(root, 'm1'), { recursive: true });
  mkdirSync(join(root, 'm2'), { recursive: true });
  mkdirSync(join(root, 'r0'), { recursive: true });
  writeFileSync(join(root, 'status', 'runners', 'all.json'),
    JSON.stringify({ hubs: { m0: {
      current: 'M0-1124-KA',
      started_at: new Date(NOW_MS - 5 * 60_000).toISOString(),
    }}}));
  writeFileSync(join(root, 'status', 'claims', 'M0-1124-KA.json'),
    JSON.stringify({ id: 'M0-1124-KA', hub: 'm0', state: 'started' }));
  writeFileSync(join(root, 'queue', 'm0', 'M0-1124-KA.md'), '원장 대사: "진행 중 작업"\n');

  // 머지된 카드 1: 오래된 리포트 → step1.5 PR 매핑
  const rpt1 = join(root, 'm1', 'M1-1124-KB-report.md');
  writeFileSync(rpt1, 'PASS\nPR: https://github.com/CuriocityDevAi/storeport/pull/5001\n');
  stamp(rpt1, NOW_MS - 30 * 60_000);
  const r0a = join(root, 'r0', 'R0-1124-KA-report.md');
  writeFileSync(r0a, 'APPROVE\n\nR0-1124-KA — M1-1124-KB 리뷰\nPR: x\n');
  stamp(r0a, NOW_MS - 10 * 60_000);

  // 머지된 카드 2: 최근 리포트 → pipeline-view PR 매핑
  const rpt2 = join(root, 'm2', 'M2-1124-KC-report.md');
  writeFileSync(rpt2, 'PASS\nPR: https://github.com/CuriocityDevAi/curiocity-relay/pull/5002\n');
  stamp(rpt2, NOW_MS - 8 * 60_000);

  // mock: 두 PR 모두 머지 완료 (20분 전 → doneToday)
  const mockFetch = (prNum) => {
    if (Number(prNum) === 5001 || Number(prNum) === 5002) {
      return { state: 'merged', mergedAt: new Date(NOW_MS - 20 * 60_000).toISOString(), cachedAt: NOW_MS };
    }
    return null;
  };

  const view = buildExtendedView({
    repoRoot: root, now: NOW, nowMs: NOW_MS,
    fetchPrState: mockFetch,
  });

  // 머지된 카드가 inProgress 에 남아있으면 안 됨
  const mergedInProgress = view.inProgress.filter(c => c.column === 'merge' && c.ageMin >= 10);
  assert.equal(mergedInProgress.length, 0,
    `머지 10분+ 카드가 inProgress 에 ${mergedInProgress.length}건 남아있음: ${mergedInProgress.map(c => c.id).join(',')}`);

  // M0-1124-KA 는 여전히 inProgress 에 있어야 함 (5분 작업중)
  assert.ok(view.inProgress.find(c => c.id === 'M0-1124-KA'), 'M0-1124-KA 진행 중 유지');
});

// ---------- 스피너 ----------

test('T-SP1: spinnerChar — 10프레임 순환', () => {
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  for (let i = 0; i < 10; i++) {
    assert.equal(spinnerChar(i), frames[i], `프레임 ${i}`);
  }
  assert.equal(spinnerChar(10), frames[0], '10 → 0 순환');
  assert.equal(spinnerChar(0), frames[0], '--once 첫 프레임');
});

// ---------- PR# 포맷: #257 (공백 없음) ----------

test('T-PR1: renderV2 — PR# 포맷 #257 (# 뒤 공백 없음)', () => {
  const view = {
    cards: [
      { id: 'M2-1124-PR', column: 'ci_pending', hub: 'm2', ageMin: 5,
        mark: '●', level: 'green', title: 'PR# 포맷 테스트',
        extra: { pr: { number: 257 } } },
    ],
    hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('#257'), '#257 포함');
  assert.ok(!text.includes('# 257'), '# 257 (공백) 없음');
});

// ========== M2-1125-L 신규 테스트 ==========

// ---------- done claim + 무PR → inProgress 미포함 (전 허브) ----------

test('T-L1: done+무PR (R0·m0, 리포트 첫 줄 "#N CHANGES") → inProgress 미포함', () => {
  const root = makeFullFixture();
  mkdirSync(join(root, 'r0'), { recursive: true });
  mkdirSync(join(root, 'm0'), { recursive: true });
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  // R0: done claim, no PR, 리포트 첫 줄 "#431 CHANGES" (기존 regex 불일치 버그 재현)
  const qR0 = join(root, 'queue', 'r0', 'R0-1125-XA.md');
  writeFileSync(qR0, 'R0-1125-XA\n원장 대사: "리뷰 프롬프트 완료"\n');
  stamp(qR0, L_NOW_MS - 60 * 60_000);
  writeFileSync(join(root, 'status', 'claims', 'R0-1125-XA.json'),
    JSON.stringify({ id: 'R0-1125-XA', hub: 'r0', state: 'done',
      at: new Date(L_NOW_MS - 10 * 60_000).toISOString() }));
  const rptR0 = join(root, 'r0', 'R0-1125-XA-report.md');
  writeFileSync(rptR0, '#431 CHANGES\n내용\n');
  stamp(rptR0, L_NOW_MS - 5 * 60_000);

  // m0: done claim, no PR, report
  const qM0 = join(root, 'queue', 'm0', 'M0-1125-XB.md');
  writeFileSync(qM0, 'M0-1125-XB\n원장 대사: "조사만 수행"\n');
  stamp(qM0, L_NOW_MS - 60 * 60_000);
  writeFileSync(join(root, 'status', 'claims', 'M0-1125-XB.json'),
    JSON.stringify({ id: 'M0-1125-XB', hub: 'm0', state: 'done',
      at: new Date(L_NOW_MS - 15 * 60_000).toISOString() }));
  const rptM0 = join(root, 'm0', 'M0-1125-XB-report.md');
  writeFileSync(rptM0, 'PASS\n내용\n');
  stamp(rptM0, L_NOW_MS - 10 * 60_000);

  const view = buildExtendedView({
    repoRoot: root, now: L_NOW, nowMs: L_NOW_MS,
    fetchPrState: () => null,
  });

  assert.equal(view.inProgress.find(c => c.id === 'R0-1125-XA'), undefined,
    'R0 done+무PR → inProgress 미포함');
  assert.equal(view.inProgress.find(c => c.id === 'M0-1125-XB'), undefined,
    'm0 done+무PR → inProgress 미포함');
});

// ---------- done claim + open PR → inProgress 유지 ----------

test('T-L2: done+open PR → inProgress 유지', () => {
  const root = makeFullFixture();
  mkdirSync(join(root, 'm2'), { recursive: true });
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const rpt = join(root, 'm2', 'M2-1125-XC-report.md');
  writeFileSync(rpt, 'PASS\nPR: https://github.com/CuriocityDevAi/storeport/pull/9999\n');
  stamp(rpt, L_NOW_MS - 5 * 60_000);
  writeFileSync(join(root, 'status', 'claims', 'M2-1125-XC.json'),
    JSON.stringify({ id: 'M2-1125-XC', hub: 'm2', state: 'done',
      at: new Date(L_NOW_MS - 5 * 60_000).toISOString() }));

  const view = buildExtendedView({
    repoRoot: root, now: L_NOW, nowMs: L_NOW_MS,
    fetchPrState: (prNum) => Number(prNum) === 9999
      ? { state: 'OPEN', mergedAt: null, mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN', cachedAt: L_NOW_MS }
      : null,
  });

  const card = view.inProgress.find(c => c.id === 'M2-1125-XC');
  assert.ok(card, 'done+open PR 카드는 inProgress 에 유지');
});

// ---------- 오늘 완료 집계 (claims 기반) ----------

test('T-L3: 오늘 done claim → doneToday 집계', () => {
  const root = makeFullFixture();
  mkdirSync(join(root, 'm1'), { recursive: true });
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  for (let i = 0; i < 4; i++) {
    const id = `M1-1125-X${String.fromCharCode(65 + i)}`;
    const qPath = join(root, 'queue', 'm1', `${id}.md`);
    writeFileSync(qPath, `원장 대사: "완료 테스트 ${i}"\n`);
    stamp(qPath, L_NOW_MS - 60 * 60_000);
    writeFileSync(join(root, 'status', 'claims', `${id}.json`),
      JSON.stringify({ id, hub: 'm1', state: 'done',
        at: new Date(L_NOW_MS - (i + 1) * 60_000).toISOString() }));
    const rpt = join(root, 'm1', `${id}-report.md`);
    writeFileSync(rpt, 'PASS\n');
    stamp(rpt, L_NOW_MS - (i + 1) * 60_000 + 30_000);
  }

  const view = buildExtendedView({
    repoRoot: root, now: L_NOW, nowMs: L_NOW_MS,
    fetchPrState: () => null,
  });

  assert.ok(view.doneToday >= 4, `doneToday ${view.doneToday} >= 4`);
});

// ---------- ci_pending + DIRTY merge → 충돌 reason ----------

test('T-L4: ci_pending + DIRTY merge → 주의에 "충돌 — rebase 필요" 표시', () => {
  const root = makeFullFixture();
  mkdirSync(join(root, 'm1'), { recursive: true });
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const rpt = join(root, 'm1', 'M1-1125-XD-report.md');
  writeFileSync(rpt, 'PASS\nPR: https://github.com/CuriocityDevAi/storeport/pull/9998\n');
  stamp(rpt, L_NOW_MS - 5 * 60_000);

  const mockFetch = (prNum) => Number(prNum) === 9998
    ? { state: 'OPEN', mergedAt: null, mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY', cachedAt: L_NOW_MS }
    : null;

  const view = buildExtendedView({
    repoRoot: root, now: L_NOW, nowMs: L_NOW_MS,
    fetchPrState: mockFetch,
  });

  const card = view.cards.find(c => c.id === 'M1-1125-XD');
  assert.ok(card, 'M1-1125-XD 카드 존재');
  assert.ok(card.reason?.includes('충돌'), `reason 에 충돌 포함: "${card.reason}"`);
  assert.equal(card.level, 'red', 'level = red');
  assert.equal(card.mark, '■', 'mark = ■');
  assert.ok(card.mergeConflict, 'mergeConflict = true');

  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const text  = lines.map(stripAnsi).join('\n');
  assert.ok(text.includes('충돌'), '렌더에 충돌 표시');
});

// ========== M2-1125-N 신규 테스트 — git origin/main 오브젝트 stale 방지 ==========

// git 리포 픽스처: bare remote + local clone
// 러너가 뒤처진 worktree 에서 ci-watch 를 실행하는 상황을 재현한다.
function makeGitRepoFixture() {
  const root     = mkdtempSync(join(tmpdir(), 'ci-watch-gitfix-'));
  const bareDir  = join(root, 'origin.git');
  const initDir  = join(root, 'init');
  const localDir = join(root, 'local');

  // 1. bare remote
  execFileSync('git', ['init', '--bare', bareDir], { stdio: 'ignore' });

  // 2. initDir: working copy → initial commit → push to bare
  mkdirSync(initDir, { recursive: true });
  execFileSync('git', ['init', initDir], { stdio: 'ignore' });
  execFileSync('git', ['-C', initDir, 'symbolic-ref', 'HEAD', 'refs/heads/main']);
  execFileSync('git', ['-C', initDir, 'config', 'user.email', 'test@test.com']);
  execFileSync('git', ['-C', initDir, 'config', 'user.name', 'Test']);
  for (const d of [
    'queue/m0','queue/m1','queue/m2','queue/m3','queue/r0',
    'status/claims','status/runners','status/ci','status/pipeline',
    'm0','m1','m2','r0',
  ]) mkdirSync(join(initDir, d), { recursive: true });
  writeFileSync(join(initDir, 'status/runners/all.json'), '{}');
  execFileSync('git', ['-C', initDir, 'add', '-A'], { stdio: 'ignore' });
  execFileSync('git', ['-C', initDir, 'commit', '-m', 'init'], { stdio: 'ignore' });
  execFileSync('git', ['-C', initDir, 'remote', 'add', 'origin', bareDir]);
  execFileSync('git', ['-C', initDir, 'push', '-u', 'origin', 'main'], { stdio: 'ignore' });

  // 3. localDir: clone (simulates ~/projects/curiocity-relay)
  execFileSync('git', ['clone', bareDir, localDir], { stdio: 'ignore' });
  execFileSync('git', ['-C', localDir, 'config', 'user.email', 'test@test.com']);
  execFileSync('git', ['-C', localDir, 'config', 'user.name', 'Test']);

  return { bareDir, localDir };
}

function makeSecondClone(bareDir) {
  const dir = mkdtempSync(join(tmpdir(), 'ci-watch-git2-'));
  execFileSync('git', ['clone', bareDir, dir], { stdio: 'ignore' });
  execFileSync('git', ['-C', dir, 'config', 'user.email', 'test@test.com']);
  execFileSync('git', ['-C', dir, 'config', 'user.name', 'Test']);
  return dir;
}

function gitCommitPush(dir, msg) {
  execFileSync('git', ['-C', dir, 'add', '-A'], { stdio: 'ignore' });
  execFileSync('git', ['-C', dir, 'commit', '-m', msg], { stdio: 'ignore' });
  execFileSync('git', ['-C', dir, 'push', 'origin', 'main'], { stdio: 'ignore' });
}

// (a) origin/main done 클레임 → doneToday 반영 (local worktree 는 뒤처진 상태)
test('T-N1: buildExtendedView — origin/main done claim → doneToday 반영 (stale 방지)', () => {
  const { bareDir, localDir } = makeGitRepoFixture();

  // 2nd clone: add 2 done claims for today (WIB) → push to origin
  const secondDir = makeSecondClone(bareDir);
  mkdirSync(join(secondDir, 'status', 'claims'), { recursive: true });
  const claimAt = new Date(L_NOW_MS - 60_000).toISOString();
  for (const id of ['M2-1125-NA', 'M2-1125-NB']) {
    writeFileSync(join(secondDir, 'status', 'claims', `${id}.json`),
      JSON.stringify({ id, hub: 'm2', state: 'done', at: claimAt }));
  }
  gitCommitPush(secondDir, 'add done claims');

  // local is behind — claims do NOT exist in localDir worktree
  // buildExtendedView fetches origin/main and reads claims via git objects
  const view = buildExtendedView({
    repoRoot: localDir, now: L_NOW, nowMs: L_NOW_MS,
    fetchPrState: () => null,
  });

  assert.equal(view.doneToday, 2,
    `origin/main done claim 2건 → doneToday=2 (실제: ${view.doneToday})`);
});

// (b) done claim + PR 없음 → inProgress 에 0건 (local은 started 로 뒤처짐)
test('T-N2: buildExtendedView — origin/main done+no-PR → inProgress 0건 (stale 방지)', () => {
  const { bareDir, localDir } = makeGitRepoFixture();

  const startedAt = new Date(L_NOW_MS - 5 * 60_000).toISOString();

  // local: pick up task (started claim) → push to origin (both in sync)
  mkdirSync(join(localDir, 'queue', 'm2'), { recursive: true });
  mkdirSync(join(localDir, 'status', 'claims'), { recursive: true });
  mkdirSync(join(localDir, 'status', 'runners'), { recursive: true });
  writeFileSync(join(localDir, 'queue', 'm2', 'M2-1125-ND.md'), '원장 대사: "완료된 작업"\n내용');
  writeFileSync(join(localDir, 'status', 'runners', 'all.json'),
    JSON.stringify({ hubs: { m2: { current: 'M2-1125-ND', started_at: startedAt }}}));
  writeFileSync(join(localDir, 'status', 'claims', 'M2-1125-ND.json'),
    JSON.stringify({ id: 'M2-1125-ND', hub: 'm2', state: 'started', started_at: startedAt }));
  gitCommitPush(localDir, 'start task');

  // 2nd clone: mark claim done → push to origin (origin is now 1 commit ahead of local)
  const secondDir = makeSecondClone(bareDir);
  mkdirSync(join(secondDir, 'status', 'claims'), { recursive: true });
  writeFileSync(join(secondDir, 'status', 'claims', 'M2-1125-ND.json'),
    JSON.stringify({ id: 'M2-1125-ND', hub: 'm2', state: 'done',
      at: new Date(L_NOW_MS - 60_000).toISOString() }));
  gitCommitPush(secondDir, 'claim done');

  // local worktree still has state='started' — behind by 1 commit
  // buildExtendedView fetches → reads done claim from origin/main git objects
  const view = buildExtendedView({
    repoRoot: localDir, now: L_NOW, nowMs: L_NOW_MS,
    fetchPrState: () => null,
  });

  const inProgCard = view.inProgress.find(c => c.id === 'M2-1125-ND');
  assert.equal(inProgCard, undefined,
    'done claim + no PR → inProgress 에 없어야 함 (origin/main 에서 읽어야 함)');
  assert.ok(view.doneToday >= 1, `doneToday ${view.doneToday} >= 1`);
});

// ---------- R0 카드 제목 폴백 (큐 파일 원장 대사) ----------

test('T-L5: R0 타겟 카드 제목 없을 때 → 큐 파일 원장 대사 폴백', () => {
  const root = makeFullFixture();
  mkdirSync(join(root, 'r0'), { recursive: true });
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  // R0-1125-XT: 리뷰어 역할 (다른 R0를 타겟으로)
  const r0Rpt = join(root, 'r0', 'R0-1125-XT-report.md');
  writeFileSync(r0Rpt, 'APPROVE\n\nR0-1125-XT — R0-1125-XU 리뷰\n');
  stamp(r0Rpt, L_NOW_MS - 30 * 60_000);

  // R0-1125-XU: 타겟 (큐 파일에 원장 대사 있음)
  const qXU = join(root, 'queue', 'r0', 'R0-1125-XU.md');
  writeFileSync(qXU, 'R0-1125-XU\n원장 대사: "R0 리뷰 큐 대사 테스트"\n');
  stamp(qXU, L_NOW_MS - 60 * 60_000);
  writeFileSync(join(root, 'status', 'claims', 'R0-1125-XU.json'),
    JSON.stringify({ id: 'R0-1125-XU', hub: 'r0', state: 'done',
      at: new Date(L_NOW_MS - 20 * 60_000).toISOString() }));

  const view = buildExtendedView({
    repoRoot: root, now: L_NOW, nowMs: L_NOW_MS,
    fetchPrState: () => null,
  });

  // R0-1125-XU: done+무PR → inProgress 미포함 (오늘 완료)
  assert.equal(view.inProgress.find(c => c.id === 'R0-1125-XU'), undefined,
    'R0-1125-XU done+무PR → inProgress 미포함');
});
