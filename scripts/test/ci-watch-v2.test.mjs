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
import { displayWidth, truncateWidth, padEndWidth } from '../watch/text-width.mjs';

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
  // 날짜 코드 1105 ≠ {1124, 1123} → M1-1105-AA 는 카드로 출현하지 않아야 함.
  assert.equal(view.cards.find(c => c.id === 'M1-1105-AA'), undefined);
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

test('T-6b: renderV2 board narrow (< 60) — 세로 쌓기 (빈 칸 "--")', () => {
  const view = {
    cards: [{ id: 'M1-1124-Z', hub: 'm1', column: 'queue', ageMin: 1, mark: '●', level: 'green', title: '테스트 제목' }],
    hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 55, timeStr: 't', board: true });
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

// ---------- predicted review 경보 집계 제외 ----------

test('T-8a: buildPipelineView — review predicted=true: level green, 경보 집계 제외', () => {
  const root = makeFixture();
  const r0 = join(root, 'r0', 'R0-1124-KK-report.md');
  // APPROVE 리뷰 리포트, 45분 전 (review 창 2h 이내, 90분 미만)
  writeFileSync(r0, 'APPROVE\n\nR0-1124-KK — M1-1124-ZZ 리뷰\nPR: x');
  stamp(r0, NOW_MS - 45 * 60_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  const card = view.cards.find(c => c.id === 'M1-1124-ZZ');
  assert.ok(card, 'review card should exist');
  assert.equal(card.column, 'review');
  assert.equal(card.predicted, true, 'predicted should be true');
  assert.equal(card.level, 'green', 'level must be green (경보 집계 제외)');
  assert.equal(card.mark, '●');
  assert.equal(card.reason, '예측·머지 여부 모름');
});

test('T-8b: buildPipelineView — review APPROVE 90분+ → 숨김 (doneToday 증가)', () => {
  const root = makeFixture();
  const r0 = join(root, 'r0', 'R0-1124-KM-report.md');
  // 95분 전 — reviewRecentHr=2 창 안이지만 APPROVE + 90분 초과
  writeFileSync(r0, 'APPROVE\n\nR0-1124-KM — M1-1124-ZM 리뷰\nPR: x');
  stamp(r0, NOW_MS - 95 * 60_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });
  assert.equal(view.cards.find(c => c.id === 'M1-1124-ZM'), undefined, 'card should be hidden');
  assert.equal(view.doneToday, 1, 'doneToday should increment');
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

// ---------- EAW 표시 폭 함수 ----------

test('T-W1: displayWidth — 한글·이모지·●■▲·… 폭 계산', () => {
  assert.equal(displayWidth('abc'), 3, 'ASCII 1칸');
  assert.equal(displayWidth('한글'), 4, 'Korean 2칸×2');
  assert.equal(displayWidth('a한b'), 4, 'mixed 1+2+1');
  assert.equal(displayWidth('●'), 2, '● Geometric Shape 2칸');
  assert.equal(displayWidth('■'), 2, '■ 2칸');
  assert.equal(displayWidth('▲'), 2, '▲ 2칸');
  assert.equal(displayWidth('…'), 2, '… HORIZONTAL ELLIPSIS 2칸');
  assert.equal(displayWidth('\x1b[32m한\x1b[0m'), 2, 'ANSI 코드 0칸');
  assert.equal(displayWidth('🎉'), 2, '이모지 2칸');
  assert.equal(displayWidth('│'), 1, '박스 그리기 문자 1칸');
  assert.equal(displayWidth('─'), 1, '가로선 1칸');
});

test('T-W2: truncateWidth — 한글 포함 자르기', () => {
  // '한글abcd' = 2+2+1+1+1+1=8, maxCols=7
  // 7-2(ellipsis)=5, '한글a'=2+2+1=5 → '한글a…'
  assert.equal(truncateWidth('한글abcd', 7), '한글a…');
  // 꼭 맞는 경우 — 자르기 없음
  assert.equal(truncateWidth('한글abc', 7), '한글abc'); // 2+2+1+1+1=7 ≤ 7
  // 한글만
  assert.equal(truncateWidth('한글한', 5), '한…'); // 2+2>5-2=3이므로 '한'(2)+…(2)=4
  // 빈 문자열
  assert.equal(truncateWidth('', 10), '');
  // maxCols=0
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
  const p1 = padEndWidth('한', 5); // 2 → 3 spaces
  assert.equal(displayWidth(p1), 5, '한(2)+3spaces=5');
  assert.ok(p1.endsWith('   '), '3 trailing spaces');

  const p2 = padEndWidth('abc', 5); // 3 → 2 spaces
  assert.equal(displayWidth(p2), 5, 'abc(3)+2spaces=5');

  // ANSI 포함
  const p3 = padEndWidth('\x1b[32m한\x1b[0m', 5);
  assert.equal(displayWidth(p3), 5, 'ANSI+한(2)+3spaces=5');

  // 이미 충분
  assert.equal(padEndWidth('한글', 4), '한글', 'no pad when at target');
  assert.equal(padEndWidth('한글한', 4), '한글한', 'no pad when over target');
});

// ---------- 박스 테두리 정렬 ----------

test('T-W4: renderV2 board — 한글 카드 포함 시 각 줄 표시 폭 동일', () => {
  const view = {
    cards: [
      { id: 'M1-1124-Z', column: 'queue', hub: 'm1', ageMin: 2, mark: '▲', level: 'yellow',
        title: '한글 카드 제목 테스트' },
      { id: 'M1-1124-A', column: 'hub', hub: 'm1', ageMin: 10, mark: '●', level: 'green',
        title: 'ASCII title only' },
    ],
    hubCurrents: {}, hubOrder: {}, doneToday: 0, anomalies: [], stats: {},
  };
  const lines = renderV2(view, { terminalWidth: 100, timeStr: 't', board: true });
  const stripped = lines.map(l => stripAnsi(l));

  // 상단/하단 테두리 줄 (┌/└ 로 시작하는 전체 행)
  const topRows = stripped.filter(l => /^┌/.test(l));
  const botRows = stripped.filter(l => /^└/.test(l));
  assert.ok(topRows.length > 0, '상단 테두리 존재');
  assert.ok(botRows.length > 0, '하단 테두리 존재');

  const refWidth = displayWidth(topRows[0]);
  assert.ok(refWidth > 0, '기준 폭 > 0');

  // 하단 테두리도 같은 폭
  for (const row of botRows) {
    assert.equal(displayWidth(row), refWidth, `하단 테두리 폭 불일치: "${row}"`);
  }

  // │ 로 시작하는 카드 줄도 같은 폭
  const cardRows = stripped.filter(l => /^│/.test(l));
  for (const row of cardRows) {
    assert.equal(displayWidth(row), refWidth, `카드 줄 폭 불일치: "${row.slice(0, 30)}…"`);
  }
});

// ---------- --once 출력 캐처 (줄형 · 박스) ----------

test('T-9a: --once 줄형 출력 캐처 — 한글/이모지 카드 포함', () => {
  const root = makeFixture();
  // 접미사는 [A-Z]+ 패턴만 허용 (숫자 불가) → QA 사용
  writeFileSync(join(root, 'queue', 'm1', 'M1-1124-QA.md'), '🎉 한글 제목 테스트\n내용');
  stamp(join(root, 'queue', 'm1', 'M1-1124-QA.md'), NOW_MS - 60_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });

  // 줄형 (기본, board 없음)
  const lineLines = renderV2(view, { terminalWidth: 100, timeStr: 't' });
  const lineText = lineLines.map(l => stripAnsi(l)).join('\n');

  assert.ok(lineText.includes('M1-1124-QA'), 'ID 포함');
  assert.ok(lineText.includes('한글 제목 테스트'), '한글 제목 포함');
  assert.ok(lineText.includes('ci-watch'), '헤더 포함');

  // hr 줄은 terminalWidth(100) 과 같은 표시 폭이어야 함
  for (const l of lineLines) {
    const plain = stripAnsi(l);
    if (plain.startsWith('━')) {
      assert.equal(displayWidth(plain), 100, 'hr 줄 폭 = 100');
    }
  }

  // ID 가 줄 보기에 나타나는지 (줄형은 한 줄당 1카드)
  const cardLine = lineLines.find(l => stripAnsi(l).includes('M1-1124-QA'));
  assert.ok(cardLine, '줄형에 카드 줄 존재');
});

test('T-9b: --once 박스 출력 캐처 — 한글/이모지 카드 포함', () => {
  const root = makeFixture();
  // 제목만 적어 박스 내 truncation 없이 한글이 표시되도록
  writeFileSync(join(root, 'queue', 'm1', 'M1-1124-QB.md'), '한글박스테스트\n내용');
  stamp(join(root, 'queue', 'm1', 'M1-1124-QB.md'), NOW_MS - 120_000);
  writeFileSync(join(root, 'status', 'runners', 'all.json'), '{}');

  const view = buildPipelineView({ repoRoot: root, now: NOW, nowMs: NOW_MS });

  // 박스 (board=true)
  const boardLines = renderV2(view, { terminalWidth: 100, timeStr: 't', board: true });
  const boardText = boardLines.map(l => stripAnsi(l)).join('\n');

  assert.ok(boardText.includes('M1-1124-QB'), 'ID 포함');
  assert.ok(boardText.includes('한글박스테스트'), '한글 제목 포함 — 박스 내 2칸 폭 올바르게 표시');

  // 테두리 정렬: ┌/└ 행 모두 같은 폭
  const stripped = boardLines.map(l => stripAnsi(l));
  const borderRows = stripped.filter(l => /^[┌└]/.test(l));
  if (borderRows.length > 1) {
    const ws = borderRows.map(l => displayWidth(l));
    assert.ok(ws.every(w => w === ws[0]), `테두리 폭 불일치: [${ws}]`);
  }

  // 카드 줄(│ 시작, 해당 ID 포함)도 같은 폭
  const cardRows = stripped.filter(l => /^│/.test(l) && l.includes('M1-1124-QB'));
  if (borderRows.length > 0) {
    const refW = displayWidth(borderRows[0]);
    for (const row of cardRows) {
      assert.equal(displayWidth(row), refW, `카드 줄 폭 불일치`);
    }
  }
});
