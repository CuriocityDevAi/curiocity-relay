// req-audit.test.mjs — M1-1124-M
// node --test scripts/test/req-audit.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractKyuQuotes,
  extractPromptIds,
  extractPrNumbers,
  readinessFlag,
  matchPrsForId,
  judgeItem,
} from '../req-audit.mjs';

test('원문 추출: inline "..." · quote block · numbered · 표', () => {
  const md = [
    '# 결정 — 샘플',
    '',
    'Kyu 원문(11-24 10:52): "View Cart Pay 버튼 명칭이 잘못됨"',
    '',
    '## 배경 (Kyu 18:47 원문)',
    '> 혹시 이것을 잊어버렸어?, 그렇다면 너가내가 말하는 요구사항을 기록을 안하고 있다는 말로 들리는게 그게 맞아? 나의 요구사항을 누락했다는 말로 들리거든.',
    '',
    '## Kyu 원문',
    '1. "Sell 화면 스크롤 다운 안됨"',
    '2. "View Cart x 버튼이 작음"',
    '',
    '| # | Kyu 원문 요지 | 소유 |',
    '|---|---|---|',
    '| K1 | QRIS 재실기 | M0 |',
    '| N1 | 영수증 화면 → Orders 화면으로 | M3 |',
  ].join('\n');
  const got = extractKyuQuotes(md);
  const texts = got.map(g => g.text);
  assert.ok(texts.some(t => t.includes('Pay 버튼 명칭이 잘못됨')), 'inline 원문');
  assert.ok(texts.some(t => t.includes('누락했다는 말로 들리거든')), 'quote block 원문');
  assert.ok(texts.some(t => t.includes('Sell 화면 스크롤 다운 안됨')), 'numbered 원문');
  assert.ok(texts.some(t => t.includes('QRIS 재실기')), '표 cell 원문');
  assert.ok(texts.some(t => t.includes('Orders 화면으로')), '표 cell 원문 2');
});

test('ID 추출: window 안의 프롬프트 ID 모음', () => {
  const md = [
    '## Kyu 18:50 원문',
    '> 전수 정리 가자.',
    '',
    '발부: M1-1124-M · R0-1124-AA 와 M0-1117-A 참고.',
    '관련 PR #247 #250',
  ].join('\n');
  const quotes = extractKyuQuotes(md);
  assert.equal(quotes.length, 1);
  const ids = extractPromptIds(md, quotes[0].line);
  assert.deepEqual(ids.sort(), ['M0-1117-A', 'M1-1124-M', 'R0-1124-AA']);
  const prs = extractPrNumbers(md, quotes[0].line);
  assert.deepEqual(prs.sort((a, b) => a - b), [247, 250]);
});

test('실기 플래그: ✅ 실기 / 실기 통과 → 통과, 없으면 기록 없음', () => {
  const a = [
    'Kyu 원문(11-14): "QRIS 기본 결제 재실기"',
    '| K1 | QRIS | ✅ 실기 통과 11-14 |',
  ].join('\n');
  const q = extractKyuQuotes(a);
  assert.ok(q.length >= 1, 'quote extracted');
  assert.equal(readinessFlag(a, q[0].line), '통과');

  const b = [
    'Kyu 원문(11-24): "영수증 번호 PIM26B1000 표시"',
    '| K2 | 영수증 | 대기 |',
  ].join('\n');
  const q2 = extractKyuQuotes(b);
  assert.ok(q2.length >= 1, 'quote extracted');
  assert.equal(readinessFlag(b, q2[0].line), '기록 없음');
});

test('ID→PR 연결: branch · title · pr-number', () => {
  const prLists = {
    'CuriocityDevAi/curiocity-relay': [
      { number: 25, title: 'feat(runner): self-update PR #25', state: 'OPEN', headRefName: 'feat/M1-1124-H-v8-r2-self-update', mergedAt: null },
    ],
    'CuriocityDevAi/agilo-medusa-pos-fork': [
      { number: 247, title: 'feat(cd-phone-status): M1-1124-C', state: 'MERGED', headRefName: 'feat/cd-phone-status', mergedAt: '2026-11-24T05:00:00Z' },
    ],
    'CuriocityDevAi/storeport': [],
  };
  // by branch
  let hits = matchPrsForId(prLists, 'M1-1124-H', []);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].matchedBy, 'branch');
  // by title
  hits = matchPrsForId(prLists, 'M1-1124-C', []);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].matchedBy, 'title');
  // by pr-number
  hits = matchPrsForId(prLists, 'NOMATCH', [247]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].matchedBy, 'pr-number');
  assert.equal(hits[0].state, 'MERGED');
});

test('판정 4종: 구현됨 · 발부됨·미머지 · 기록만 · 증거 없음', () => {
  // 구현됨
  assert.equal(
    judgeItem({ ids: ['M1-1124-C'], prs: [{ state: 'MERGED', mergedAt: 'x' }], queueIssued: true }),
    '구현됨(머지 PR)',
  );
  // 발부됨·미머지 (PR open · 머지 안됨)
  assert.equal(
    judgeItem({ ids: ['M1-1124-M'], prs: [{ state: 'OPEN', mergedAt: null }], queueIssued: true }),
    '발부됨·미머지',
  );
  // 발부됨·미머지 (queue 만 있고 PR 전무)
  assert.equal(
    judgeItem({ ids: ['M1-1124-M'], prs: [], queueIssued: true }),
    '발부됨·미머지',
  );
  // 기록만 (ID 있고 queue·PR 없음)
  assert.equal(
    judgeItem({ ids: ['M1-1124-Z'], prs: [], queueIssued: false }),
    '기록만(발부 없음)',
  );
  // 증거 없음
  assert.equal(
    judgeItem({ ids: [], prs: [], queueIssued: false }),
    '증거 없음',
  );
});

test('원문 추출: 서로 다른 줄의 서로 다른 원문은 각각 1건', () => {
  const md = [
    'Kyu 원문(10:00): "첫 번째 요구사항 원문입니다"',
    '',
    'Kyu 원문(10:05): "두 번째 요구사항 원문입니다"',
  ].join('\n');
  const q = extractKyuQuotes(md);
  assert.equal(q.length, 2);
  assert.ok(q[0].text.includes('첫 번째'));
  assert.ok(q[1].text.includes('두 번째'));
});
