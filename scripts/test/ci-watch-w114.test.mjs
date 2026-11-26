// scripts/test/ci-watch-w114.test.mjs  M2-1126-N — heavy-cloud fork-only 마커 판정 테스트
//
// 커버:
//   W114-hc-sp:     storeport heavy-cloud 는 실제 잡 (마커 아님)
//   W114-hc-fork:   fork heavy-cloud 는 마커
//   W114-hc-norepo: repo 미전달 heavy-cloud → 보수적 마커 취급 (backward-compat)
//   W114-count-sp:  countRealCloud — storeport heavy-cloud 포함 카운트
//   W114-count-fork: countRealCloud — fork heavy-cloud 여전히 제외
//   W114-countable:  isCountableJob — repo 포함 record 로 판정
//   W114-jsonl-delta: 픽스처 JSONL 로 countRealCloud 전/후 실측 (fixtures/ci-watch-w114-sample.jsonl)

import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isMarkerJob,
  isCountableJob,
  countRealCloud,
} from '../watch/ci-watch-render.mjs';

const STOREPORT = 'CuriocityDevAi/storeport';
const FORK = 'CuriocityDevAi/agilo-medusa-pos-fork';

// ─── W114: heavy-cloud repo 판정 ─────────────────────────────────────────────

test('W114-hc-sp: storeport heavy-cloud 는 마커 아님', () => {
  assert.equal(isMarkerJob('heavy-cloud', STOREPORT), false,
    'storeport heavy-cloud 는 실제 24분 잡 — 마커 취급 금지');
});

test('W114-hc-fork: fork heavy-cloud 는 마커', () => {
  assert.equal(isMarkerJob('heavy-cloud', FORK), true,
    'fork heavy-cloud 는 echo 마커');
  // 대소문자 무관
  assert.equal(isMarkerJob('Heavy-Cloud', FORK), true);
});

test('W114-hc-norepo: repo 미전달 heavy-cloud → 보수적 마커 (기존 동작 유지)', () => {
  assert.equal(isMarkerJob('heavy-cloud'), true,
    'repo 없으면 보수적으로 마커 취급 — backward-compat');
  assert.equal(isMarkerJob('heavy-cloud', undefined), true);
});

test('W114-기존잡-불변: route · changes-filter · cancel-on-close 여전히 마커', () => {
  for (const job of ['route', 'changes-filter', 'markers-and-forbidden', 'cancel-on-close', 'ci-summary']) {
    assert.equal(isMarkerJob(job, STOREPORT), true, `${job} 는 storeport 에서도 마커`);
    assert.equal(isMarkerJob(job, FORK), true, `${job} 는 fork 에서도 마커`);
  }
});

test('W114-heavy-mac-불변: heavy-mac 는 항상 실제 잡', () => {
  assert.equal(isMarkerJob('heavy-mac'), false);
  assert.equal(isMarkerJob('heavy-mac', STOREPORT), false);
  assert.equal(isMarkerJob('heavy-mac', FORK), false);
});

// ─── W114: countRealCloud repo 인식 ─────────────────────────────────────────

test('W114-count-sp: countRealCloud — storeport heavy-cloud 포함', () => {
  const records = [
    { runner_kind: 'cloud', job: 'heavy-cloud', repo: STOREPORT, conclusion: 'success' }, // 포함
    { runner_kind: 'cloud', job: 'heavy-cloud', repo: FORK, conclusion: 'success' },      // 제외(fork)
    { runner_kind: 'cloud', job: 'route',       repo: STOREPORT, conclusion: 'success' }, // 제외(마커)
    { runner_kind: 'cloud', job: 'assertions',  repo: STOREPORT, conclusion: 'success' }, // 포함
  ];
  assert.equal(countRealCloud(records), 2,
    'storeport heavy-cloud + assertions = 2 (fork heavy-cloud 는 제외)');
});

test('W114-count-fork: countRealCloud — fork heavy-cloud 여전히 제외', () => {
  const records = [
    { runner_kind: 'cloud', job: 'heavy-cloud', repo: FORK, conclusion: 'success' },
    { runner_kind: 'cloud', job: 'heavy-cloud', repo: FORK, conclusion: 'success' },
  ];
  assert.equal(countRealCloud(records), 0, 'fork heavy-cloud 는 항상 제외');
});

test('W114-count-norepo: countRealCloud — repo 없는 heavy-cloud → 보수적 제외', () => {
  const records = [
    { runner_kind: 'cloud', job: 'heavy-cloud', conclusion: 'success' }, // repo 없음
    { runner_kind: 'cloud', job: 'lint',        conclusion: 'success' },
  ];
  assert.equal(countRealCloud(records), 1, 'repo 없는 heavy-cloud 는 보수적 제외, lint 만 포함');
});

// ─── W114: isCountableJob ────────────────────────────────────────────────────

test('W114-countable: isCountableJob — storeport heavy-cloud success → countable', () => {
  assert.equal(
    isCountableJob({ job: 'heavy-cloud', repo: STOREPORT, conclusion: 'success' }),
    true,
  );
  assert.equal(
    isCountableJob({ job: 'heavy-cloud', repo: FORK, conclusion: 'success' }),
    false,
  );
  // skipped 는 제외
  assert.equal(
    isCountableJob({ job: 'heavy-cloud', repo: STOREPORT, conclusion: 'skipped' }),
    false,
  );
});

// ─── W114: 픽스처 JSONL 전/후 countRealCloud 실측 ────────────────────────────

test('W114-jsonl-delta: 픽스처 JSONL — countRealCloud 전/후 실측', () => {
  // fixtures/ci-watch-w114-sample.jsonl:
  //   storeport heavy-cloud × 3 (success×2 + skipped×1)
  //   fork heavy-cloud × 2 (success×2)
  //   route × 1 (marker)
  //   assertions × 3 (success×2 + skipped×1)
  //   self-hosted heavy-mac × 1 (runner_kind != cloud → 미카운트)
  const fixtureText = readFileSync(
    new URL('./fixtures/ci-watch-w114-sample.jsonl', import.meta.url), 'utf8',
  );
  const records = fixtureText.trim().split('\n').map(l => JSON.parse(l));

  // "after": repo 포함 → storeport heavy-cloud 는 실제 잡으로 카운트
  const countAfter = countRealCloud(records);

  // "before" 시뮬레이션: heavy-cloud 에서 repo 제거 → backward-compat 마커 취급
  const recordsBefore = records.map(r =>
    r.job === 'heavy-cloud' ? { ...r, repo: undefined } : r,
  );
  const countBefore = countRealCloud(recordsBefore);

  assert.equal(countBefore, 3, 'before: assertions 3건만 (heavy-cloud 전부 마커)');
  assert.equal(countAfter, 6, 'after: assertions 3건 + storeport heavy-cloud 3건');
  assert.equal(countAfter - countBefore, 3, 'delta = storeport heavy-cloud 3건');
});
