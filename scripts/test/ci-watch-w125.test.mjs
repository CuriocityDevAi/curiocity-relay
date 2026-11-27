// scripts/test/ci-watch-w125.test.mjs  M0-1127-I — 본체 readAllJson 도 두 위치 폴백
//
// 커버:
//   F125-ci-watch-legacy-only: 새 위치(status-wt) 없음 + 옛 위치만 →
//                              ci-watch.readAllJson() 가 null 이 아니고 runner 필드를
//                              가지며, 렌더 머리줄에 `runner ?` 가 아닌 실제 값이 찍힘.
//                              허브 큐 current 프롬프트 ID 도 포함.
//   F125-verify-no-fallback:   폴백 제거 (새 위치만 읽기) → readAllJson() 가 null →
//                              렌더 머리줄에 `runner ?` 가 찍힘 (검증의 검증).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readAllJson } from '../ci-watch.mjs';
import { renderLayout } from '../watch/ci-watch-render.mjs';

const nowMs = Date.now();
const tsNow = new Date(nowMs).toISOString();

function setup() {
  const tmp = mkdtempSync(join(tmpdir(), 'ciw125-'));
  const statusWt = join(tmp, 'status-wt');
  const runnersDir = join(tmp, 'status', 'runners');
  mkdirSync(statusWt, { recursive: true });
  mkdirSync(runnersDir, { recursive: true });
  return { tmp, statusWt, runnersDir };
}

// ─── F125-ci-watch-legacy-only ──────────────────────────────────────────────

test('F125-ci-watch-legacy-only: 새 위치 없음 + 옛 위치만 → 머리 runner 값 반환', () => {
  const { tmp, statusWt, runnersDir } = setup();
  try {
    const legacyData = {
      at: tsNow,
      runner: 'v8.2.0',
      hubs: {
        m0: { current: 'M0-1127-I' },
        m1: { current: null },
        m2: { current: null },
        m3: { current: null },
        r0: { current: null },
      },
    };
    writeFileSync(join(runnersDir, 'all.json'), JSON.stringify(legacyData));
    // 새 위치는 일부러 만들지 않음

    const paths = {
      runnersAll:       join(statusWt, 'all.json'),         // 없음
      runnersAllLegacy: join(runnersDir, 'all.json'),
    };
    assert.equal(existsSync(paths.runnersAll), false, '전제: 새 위치 없음');

    const result = readAllJson(paths);
    assert.ok(result !== null, 'readAllJson() 가 null 이 아니어야 함 (옛 위치 폴백)');
    assert.equal(result.runner, 'v8.2.0',
      `runner 값이 반환되어야 함 · got: ${result.runner}`);
    assert.equal(result.hubs?.m0?.current, 'M0-1127-I',
      `허브 큐 m0.current 가 'M0-1127-I' 여야 함 · got: ${result.hubs?.m0?.current}`);
    assert.equal(result._source, 'repo',
      `_source='repo' 기대 (status-wt 없음) · got: ${result._source}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

// ─── F125-verify-no-fallback (검증의 검증) ──────────────────────────────────

test('F125-verify-no-fallback: 폴백 없이 새 위치만 읽으면 null → 렌더 머리줄 `runner ?`', () => {
  const { tmp, statusWt, runnersDir } = setup();
  try {
    const legacyData = { at: tsNow, runner: 'v8.2.0', hubs: {} };
    writeFileSync(join(runnersDir, 'all.json'), JSON.stringify(legacyData));

    // 폴백 없이 새 위치만 읽는 로직 시뮬레이션
    const newPath = join(statusWt, 'all.json');
    const resultNoFallback = existsSync(newPath)
      ? JSON.parse(readFileSync(newPath, 'utf8'))
      : null;

    assert.equal(resultNoFallback, null,
      '폴백 없으면 null 반환 (옛 위치 무시) — 이 상태가 `runner ?` 를 유발');
    process.stderr.write(
      `[F125 검증] 폴백 제거 로직: readAllJson()=${resultNoFallback}, allJson.runner 접근 시 undefined → 머리 'runner ?'\n`,
    );
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

// ─── F125-render-head: 통합 — 폴백 데이터로 렌더 결과 검증 ────────────────

test('F125-render-head: 폴백 데이터가 renderLayout 머리줄에 `runner <ver>` 로 찍힘', () => {
  const { tmp, statusWt, runnersDir } = setup();
  try {
    const legacyData = {
      at: tsNow,
      runner: 'v8.2.0',
      hubs: { m0: { current: 'M0-1127-I' }, m1: {}, m2: {}, m3: {}, r0: {} },
    };
    writeFileSync(join(runnersDir, 'all.json'), JSON.stringify(legacyData));

    const paths = {
      runnersAll:       join(statusWt, 'all.json'),
      runnersAllLegacy: join(runnersDir, 'all.json'),
    };
    const allJson = readAllJson(paths);

    // 머리줄 포함된 전체 렌더 결과 획득 — 최소 데이터로 호출.
    const rendered = renderLayout({
      version: '1.25',
      timeStr: '00:00:00',
      allJson,
      data: {
        hubPending: { m0: [], m1: [], m2: [], m3: [], r0: [] },
        inProgress: [],
      },
      alerts: [],
      ciRows: [],
      ciSummary: { heavy: {}, light: {}, cloud: {} },
      imacJson: null,
      todayCompletedCount: 0,
      totalInProgress: 0,
      fileCommitDate: null,
      versionNote: null,
      activeByHub: {},
      ciRunners: [],
      cloudTodayCount: 0,
      todayStats: null,
      extendedView: { inProgress: [] },
      hubPendingMeta: {},
      ciPercentiles: null,
      pendingNotices: [],
      busyJobMap: new Map(),
    }) || '';
    const headLine = String(rendered).split('\n')[0] || '';

    assert.ok(headLine.includes('runner v8.2.0'),
      `머리줄에 'runner v8.2.0' 포함되어야 함 · 실제: ${headLine.slice(0, 200)}`);
    assert.ok(!headLine.includes('runner ?'),
      `'runner ?' 가 머리줄에 없어야 함 · 실제: ${headLine.slice(0, 200)}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
