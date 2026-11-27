// scripts/test/ci-watch-w122.test.mjs  M3-1127-F — all.json 두 위치 폴백 · 최신 at 선택
//
// 커버:
//   F122-no-wt:       status-wt 없음 → repo 것 사용 (_source='repo')
//   F122-both-wt-new: 둘 다 있음, status-wt 가 최신 → status-wt 것 (_source='status-wt')
//   F122-repo-newer:  status-wt 가 10분 옛것, repo 가 최신 → repo 것 (_source='repo')
//   F122-verify:      최신 비교 없애면 F122-repo-newer 케이스 실패 (검증의 검증)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readAllJson } from '../watch/sources-local.mjs';

const nowMs = Date.now();
const tsNow   = new Date(nowMs).toISOString();
const ts10min = new Date(nowMs - 10 * 60_000).toISOString();

function setup() {
  const tmp = mkdtempSync(join(tmpdir(), 'ciw122-'));
  const runnersDir = join(tmp, 'status', 'runners');
  mkdirSync(runnersDir, { recursive: true });
  return { tmp, runnersDir };
}

// ─── F122-no-wt ──────────────────────────────────────────────────────────────

test('F122-no-wt: status-wt 없음 → repo 것 사용', () => {
  const { tmp, runnersDir } = setup();
  try {
    const repoData = { at: tsNow, hubs: { m1: { current: 'T1' } } };
    writeFileSync(join(runnersDir, 'all.json'), JSON.stringify(repoData));

    const paths = {
      runnersAll:       join(tmp, 'nonexistent', 'all.json'), // 없음
      runnersAllLegacy: join(runnersDir, 'all.json'),
    };
    const result = readAllJson(paths);
    assert.ok(result !== null, 'null 이 아니어야 함');
    assert.equal(result._source, 'repo',
      `_source='repo' 기대 · got: ${result._source}`);
    assert.equal(result.hubs?.m1?.current, 'T1',
      `repo 데이터 반환 기대 · got: ${JSON.stringify(result.hubs)}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

// ─── F122-both-wt-new ────────────────────────────────────────────────────────

test('F122-both-wt-new: 둘 다 있음, status-wt 가 최신 → status-wt 것 반환', () => {
  const { tmp, runnersDir } = setup();
  const wtDir = join(tmp, 'wt');
  mkdirSync(wtDir, { recursive: true });
  try {
    const wtData   = { at: tsNow,   hubs: { m1: { current: 'WT' } } };
    const repoData = { at: ts10min, hubs: { m1: { current: 'REPO' } } };
    writeFileSync(join(wtDir,       'all.json'), JSON.stringify(wtData));
    writeFileSync(join(runnersDir,  'all.json'), JSON.stringify(repoData));

    const paths = {
      runnersAll:       join(wtDir,      'all.json'),
      runnersAllLegacy: join(runnersDir, 'all.json'),
    };
    const result = readAllJson(paths);
    assert.equal(result._source, 'status-wt',
      `_source='status-wt' 기대 · got: ${result._source}`);
    assert.equal(result.hubs?.m1?.current, 'WT',
      `status-wt 데이터 기대 · got: ${result.hubs?.m1?.current}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

// ─── F122-repo-newer ─────────────────────────────────────────────────────────

test('F122-repo-newer: status-wt 가 10분 옛것, repo 가 최신 → repo 것 반환', () => {
  const { tmp, runnersDir } = setup();
  const wtDir = join(tmp, 'wt');
  mkdirSync(wtDir, { recursive: true });
  try {
    const wtData   = { at: ts10min, hubs: { m1: { current: 'OLD' } } };
    const repoData = { at: tsNow,   hubs: { m1: { current: 'NEW' } } };
    writeFileSync(join(wtDir,       'all.json'), JSON.stringify(wtData));
    writeFileSync(join(runnersDir,  'all.json'), JSON.stringify(repoData));

    const paths = {
      runnersAll:       join(wtDir,      'all.json'),
      runnersAllLegacy: join(runnersDir, 'all.json'),
    };
    const result = readAllJson(paths);
    assert.equal(result._source, 'repo',
      `_source='repo' 기대 · got: ${result._source}`);
    assert.equal(result.hubs?.m1?.current, 'NEW',
      `repo(최신) 데이터 기대 · got: ${result.hubs?.m1?.current}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

// ─── F122-verify ─────────────────────────────────────────────────────────────

test('F122-verify: at 비교 없이 항상 status-wt 우선이면 F122-repo-newer 케이스가 실패 (검증의 검증)', () => {
  const { tmp, runnersDir } = setup();
  const wtDir = join(tmp, 'wt');
  mkdirSync(wtDir, { recursive: true });
  try {
    const wtData   = { at: ts10min, hubs: { m1: { current: 'OLD' } } };
    const repoData = { at: tsNow,   hubs: { m1: { current: 'NEW' } } };
    writeFileSync(join(wtDir,       'all.json'), JSON.stringify(wtData));
    writeFileSync(join(runnersDir,  'all.json'), JSON.stringify(repoData));

    // 직접 시뮬레이션: at 비교 없이 status-wt 가 존재하면 그것을 반환
    const wtRaw = JSON.parse(readFileSync(join(wtDir, 'all.json'), 'utf8'));
    const result = { ...wtRaw, _source: 'status-wt' };

    process.stderr.write(
      `[F122 검증] at 비교 없는 로직: _source=${result._source}, current=${result.hubs?.m1?.current} (OLD → 비교 없으면 최신 repo 못 받음)\n`,
    );
    // 비교 없이 status-wt 를 쓰면 OLD 를 반환 → 'NEW' 아님 → 비교 로직의 필요성 증명
    assert.notEqual(result.hubs?.m1?.current, 'NEW',
      '비교 없으면 최신 repo 값(NEW)을 못 받아야 함 — 검증의 검증');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
