// scripts/test/hub-runner-landing.test.mjs — #8 착지 감지 단위 테스트 (M2-1105-AO v7.1)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { waitForLandingWith } from '../lib/land-detect.mjs';

// ─── #8: 가짜 폴더에 리포트 생성 → 5초 주기(pollMs=5000) 안 감지 ───

test('리포트 파일 생성 → 5초 주기 안 감지 (≤7s)', { timeout: 12_000 }, async () => {
  const dir = join(tmpdir(), `land-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const reportFile = join(dir, 'report.md');

  // 2초 후 report 파일 작성 — 첫 번째 5s poll 에서 감지 → 총 ~5s
  const timer = setTimeout(() => {
    writeFileSync(reportFile, '# test report\n');
  }, 2000);

  const startMs = Date.now();
  const result = await waitForLandingWith({
    reportExists: () => existsSync(reportFile),
    readClaim: () => null,
    getHead: () => { throw new Error('no git'); },
    fetchOriginReport: () => false,
    timeoutMs: 30_000,
    pollMs: 5000,            // 실제 5초 주기
    originPollInterval: 999, // origin 체크 비활성화 (네트워크 0)
    sigkillGraceMs: 100,
  });
  const elapsed = Date.now() - startMs;

  clearTimeout(timer);
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* noop */ }

  assert.equal(result.reason, 'report-local', `착지 이유 = ${result.reason} (기대: report-local)`);
  assert.ok(elapsed <= 7000, `${elapsed}ms (기대 ≤7000ms · 5초 주기 1회)`);
});

// ─── claim done 즉시 감지 ───

test('claim done → 1회 poll 안 감지', { timeout: 8_000 }, async () => {
  let done = false;
  const timer = setTimeout(() => { done = true; }, 500);

  const startMs = Date.now();
  const result = await waitForLandingWith({
    reportExists: () => false,
    readClaim: () => done ? { state: 'done', note: 'test' } : null,
    getHead: () => { throw new Error('no git'); },
    fetchOriginReport: () => false,
    timeoutMs: 15_000,
    pollMs: 1000,
    originPollInterval: 999,
    sigkillGraceMs: 100,
  });
  const elapsed = Date.now() - startMs;

  clearTimeout(timer);
  assert.equal(result.reason, 'claim-done', `착지 이유 = ${result.reason}`);
  assert.ok(elapsed <= 3000, `${elapsed}ms (기대 ≤3000ms)`);
});

// ─── 타임아웃 ───

test('report/claim 없음 → timeout', { timeout: 5_000 }, async () => {
  const result = await waitForLandingWith({
    reportExists: () => false,
    readClaim: () => null,
    getHead: () => { throw new Error('no git'); },
    fetchOriginReport: () => false,
    timeoutMs: 800,
    pollMs: 300,
    originPollInterval: 999,
    sigkillGraceMs: 50,
  });

  assert.equal(result.reason, 'timeout');
  assert.equal(result.timedOut, true);
});
