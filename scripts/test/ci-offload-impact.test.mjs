// scripts/test/ci-offload-impact.test.mjs · M1-1126-N
// 커버:
//   OI-1: isCountableJob — marker·skipped·cancelled 제외
//   OI-2: avg / median / p90 — 고정 fixture
//   OI-3: 표본 부족 경고 (후 구간 < 2시간)
//   OI-4: 전/후 분리 — cutover 경계로 mem/CI/prompt 각각 분리
//   OI-5: 전/후 평균 정확도 — fixture 수동 계산과 일치

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  isCountableJob,
  isMarkerJob,
  avg,
  median,
  p90,
  computeImpact,
  renderMarkdown,
} from '../metrics/ci-offload-impact.mjs';

// ---- OI-1: isCountableJob ----

test('OI-1a: route → marker → not countable', () => {
  assert.equal(isCountableJob({ job: 'route', conclusion: 'success' }), false);
});

test('OI-1b: heavy-cloud → not countable', () => {
  assert.equal(isCountableJob({ job: 'heavy-cloud', conclusion: 'success' }), false);
});

test('OI-1c: ci-summary → not countable', () => {
  assert.equal(isCountableJob({ job: 'ci-summary', conclusion: 'success' }), false);
});

test('OI-1d: skipped → not countable', () => {
  assert.equal(isCountableJob({ job: 'lint', conclusion: 'skipped' }), false);
});

test('OI-1e: cancelled → not countable', () => {
  assert.equal(isCountableJob({ job: 'test', conclusion: 'cancelled' }), false);
});

test('OI-1f: success normal job → countable', () => {
  assert.equal(isCountableJob({ job: 'test', conclusion: 'success' }), true);
});

test('OI-1g: null/undefined → not countable', () => {
  assert.equal(isCountableJob(null), false);
  assert.equal(isCountableJob(undefined), false);
});

// ---- OI-2: 통계 함수 ----

test('OI-2a: avg — 빈 배열 null', () => {
  assert.equal(avg([]), null);
});

test('OI-2b: avg — [1, 3, 5] = 3', () => {
  assert.equal(avg([1, 3, 5]), 3);
});

test('OI-2c: median — 홀수 배열', () => {
  assert.equal(median([3, 1, 2]), 2);
});

test('OI-2d: median — 짝수 배열', () => {
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test('OI-2e: p90 — 10개 배열', () => {
  // 1~10, 90번째 백분위 = 9
  assert.equal(p90([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 9);
});

test('OI-2f: p90 — 빈 배열 null', () => {
  assert.equal(p90([]), null);
});

// ---- fixture 빌더 ----

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ci-offload-test-'));
  mkdirSync(join(root, 'status', 'ci'), { recursive: true });
  mkdirSync(join(root, 'status', 'runners'), { recursive: true });
  mkdirSync(join(root, 'status', 'pipeline'), { recursive: true });
  mkdirSync(join(root, 'status', 'claims'), { recursive: true });
  return root;
}

function writeLine(path, obj) {
  writeFileSync(path, JSON.stringify(obj) + '\n', { flag: 'a' });
}

// ---- OI-3: 표본 부족 경고 ----

test('OI-3: 후 구간 < 2시간 → 경고 포함', () => {
  const root = makeFixture();
  const cutover = new Date('2026-11-26T08:00:00Z').getTime();
  const afterTo = cutover + 30 * 60_000; // 30분 후
  const result = computeImpact({ relayRoot: root, cutoverMs: cutover, afterToMs: afterTo });
  assert.ok(result.warnings.length > 0, '경고 없음');
  assert.ok(result.warnings[0].includes('표본 부족'), '표본 부족 경고 없음');
});

test('OI-3b: 후 구간 ≥ 2시간 → 경고 없음', () => {
  const root = makeFixture();
  const cutover = new Date('2026-11-26T08:00:00Z').getTime();
  const afterTo = cutover + 3 * 60 * 60_000; // 3시간 후
  const result = computeImpact({ relayRoot: root, cutoverMs: cutover, afterToMs: afterTo });
  assert.equal(result.warnings.length, 0, '경고가 있으면 안 됨');
});

// ---- OI-4: 전/후 분리 ----

test('OI-4: CI 잡이 cutover 기준 전/후로 분리됨', () => {
  const root = makeFixture();
  const cutover = new Date('2026-11-26T08:00:00Z').getTime();
  const afterTo = cutover + 3 * 60 * 60_000;

  const ciFile = join(root, 'status', 'ci', '2026-11-26.jsonl');
  // 전: created_at = 07:00
  writeLine(ciFile, {
    id: 1, job: 'test', runner_kind: 'mac-heavy', runner_name: 'curiocity-mac-light',
    created_at: '2026-11-26T07:00:00Z', started_at: '2026-11-26T07:01:00Z',
    completed_at: '2026-11-26T07:06:00Z', wait_min: 1, run_min: 5, conclusion: 'success',
  });
  // 후: created_at = 09:00
  writeLine(ciFile, {
    id: 2, job: 'test', runner_kind: 'mac-heavy', runner_name: 'ci-box-storeport-heavy-imac',
    created_at: '2026-11-26T09:00:00Z', started_at: '2026-11-26T09:01:00Z',
    completed_at: '2026-11-26T09:06:00Z', wait_min: 1, run_min: 5, conclusion: 'success',
  });

  const result = computeImpact({ relayRoot: root, cutoverMs: cutover, afterToMs: afterTo });
  assert.equal(result.ci.nBefore, 1, `전 CI 잡 수 오류: ${result.ci.nBefore}`);
  assert.equal(result.ci.nAfter, 1, `후 CI 잡 수 오류: ${result.ci.nAfter}`);
});

test('OI-4b: mem-log 가 cutover 로 분리됨', () => {
  const root = makeFixture();
  const cutover = new Date('2026-11-26T08:00:00Z').getTime();
  const afterTo = cutover + 3 * 60 * 60_000;

  const memPath = join(root, 'status', 'runners', 'mem-log.ndjson');
  writeLine(memPath, { used_gb: 14, swap_used_gb: 1, compressed_gb: 2, at: '2026-11-26T07:00:00Z' });
  writeLine(memPath, { used_gb: 12, swap_used_gb: 0, compressed_gb: 1, at: '2026-11-26T09:00:00Z' });

  const result = computeImpact({ relayRoot: root, cutoverMs: cutover, afterToMs: afterTo });
  assert.equal(result.mem.used.nBefore, 1);
  assert.equal(result.mem.used.nAfter, 1);
});

// ---- OI-5: 전/후 평균 정확도 ----

test('OI-5: 전/후 평균 수치가 fixture 와 일치', () => {
  const root = makeFixture();
  const cutover = new Date('2026-11-26T08:00:00Z').getTime();
  const afterTo = cutover + 3 * 60 * 60_000;
  const beforeFrom = cutover - 3 * 60 * 60_000;

  const memPath = join(root, 'status', 'runners', 'mem-log.ndjson');
  // 전: used_gb 10, 12 → avg 11
  writeLine(memPath, { used_gb: 10, swap_used_gb: 1, compressed_gb: 2, at: '2026-11-26T05:00:00Z' });
  writeLine(memPath, { used_gb: 12, swap_used_gb: 2, compressed_gb: 3, at: '2026-11-26T06:00:00Z' });
  // 후: used_gb 8, 6 → avg 7
  writeLine(memPath, { used_gb: 8, swap_used_gb: 0, compressed_gb: 1, at: '2026-11-26T09:00:00Z' });
  writeLine(memPath, { used_gb: 6, swap_used_gb: 0, compressed_gb: 0, at: '2026-11-26T10:00:00Z' });

  const result = computeImpact({ relayRoot: root, cutoverMs: cutover, beforeFromMs: beforeFrom, afterToMs: afterTo });
  assert.equal(result.mem.used.avgBefore, 11, `전 avg=${result.mem.used.avgBefore} (기대: 11)`);
  assert.equal(result.mem.used.avgAfter, 7, `후 avg=${result.mem.used.avgAfter} (기대: 7)`);
});

test('OI-5b: CI 대기시간 p90 fixture 검증', () => {
  const root = makeFixture();
  const cutover = new Date('2026-11-26T08:00:00Z').getTime();
  const afterTo = cutover + 3 * 60 * 60_000;
  const beforeFrom = cutover - 3 * 60 * 60_000;

  const ciFile = join(root, 'status', 'ci', '2026-11-26.jsonl');
  // 전: wait_min 1~5 (5개) → p90 = 5
  for (let i = 1; i <= 5; i++) {
    writeLine(ciFile, {
      id: i, job: 'test', runner_kind: 'mac-heavy', runner_name: 'curiocity-mac-light',
      created_at: `2026-11-26T05:0${i}:00Z`,
      started_at: `2026-11-26T05:0${i + 1}:00Z`,
      completed_at: `2026-11-26T05:${10 + i}:00Z`,
      wait_min: i, run_min: 10 - i, conclusion: 'success',
    });
  }

  const result = computeImpact({ relayRoot: root, cutoverMs: cutover, beforeFromMs: beforeFrom, afterToMs: afterTo });
  assert.equal(result.ci.nBefore, 5);
  assert.equal(result.ci.waitP90Before, 5);
});

test('OI-5c: renderMarkdown — 경고 텍스트 포함 확인', () => {
  const root = makeFixture();
  const cutover = new Date('2026-11-26T08:00:00Z').getTime();
  const afterTo = cutover + 10 * 60_000; // 10분 후 → 표본 부족
  const result = computeImpact({ relayRoot: root, cutoverMs: cutover, afterToMs: afterTo });
  const md = renderMarkdown(result);
  assert.ok(md.includes('표본 부족'), `renderMarkdown 에 경고 없음:\n${md}`);
  assert.ok(md.includes('##'), 'markdown 헤더 없음');
});
