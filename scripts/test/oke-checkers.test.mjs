// scripts/test/oke-checkers.test.mjs  M2-1127-I — check-queue-prompt · merge-gate · check-report 단위 테스트

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const RELAY_ROOT = join(__dir, '..', '..');
const FIX = join(__dir, 'fixtures', 'oke');

function runScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
    cwd: RELAY_ROOT,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

const CQP = join(RELAY_ROOT, 'scripts', 'oke', 'check-queue-prompt.mjs');
const MG = join(RELAY_ROOT, 'scripts', 'oke', 'merge-gate.mjs');
const CR = join(RELAY_ROOT, 'scripts', 'oke', 'check-report.mjs');

// ===== check-queue-prompt =====

test('CQP-1: 실제 R0-1127-F.md → PASS', () => {
  const { exitCode, stdout } = runScript(CQP, [join(RELAY_ROOT, 'queue', 'r0', 'R0-1127-F.md')]);
  assert.equal(exitCode, 0, `stdout: ${stdout}`);
  assert.match(stdout, /^PASS/m);
});

test('CQP-2: fixture queue-pass.md → PASS', () => {
  const { exitCode, stdout } = runScript(CQP, [join(FIX, 'queue-pass.md')]);
  assert.equal(exitCode, 0, `stdout: ${stdout}`);
  assert.match(stdout, /^PASS/m);
});

test('CQP-3: 원장 대사 없음 → FAIL + 안내 메시지', () => {
  const { exitCode, stdout } = runScript(CQP, [join(FIX, 'queue-fail-no-ledger.md')]);
  assert.equal(exitCode, 1);
  assert.match(stdout, /원장 대사/);
  assert.match(stdout, /^FAIL/m);
});

test('CQP-4: 충돌 없음 확인 없음 → FAIL', () => {
  const { exitCode, stdout } = runScript(CQP, [join(FIX, 'queue-fail-no-conflict-check.md')]);
  assert.equal(exitCode, 1);
  assert.match(stdout, /충돌 없음 확인/);
});

test('CQP-5: 보존 요소 없음 → FAIL', () => {
  const { exitCode, stdout } = runScript(CQP, [join(FIX, 'queue-fail-no-preserve.md')]);
  assert.equal(exitCode, 1);
  assert.match(stdout, /보존 요소/);
});

test('CQP-6: [REPORT]에 /loop 없음 → FAIL', () => {
  const { exitCode, stdout } = runScript(CQP, [join(FIX, 'queue-fail-no-report-loop.md')]);
  assert.equal(exitCode, 1);
  assert.match(stdout, /\/loop/);
});

test('CQP-7: 가벼운 길 → 보존 요소 없어도 PASS', () => {
  const { exitCode, stdout } = runScript(CQP, [join(FIX, 'queue-light-path.md')]);
  assert.equal(exitCode, 0, `stdout: ${stdout}`);
  assert.match(stdout, /^PASS/m);
});

// ===== merge-gate (fixture JSON 주입) =====

test('MG-1: fixture PASS — 모든 조건 충족', () => {
  const { exitCode, stdout } = runScript(MG, [
    '--repo', 'owner/repo',
    '--pr', '285',
    '--fixture', join(FIX, 'merge-gate-pass.json'),
  ]);
  assert.equal(exitCode, 0, `stdout: ${stdout}`);
  assert.match(stdout, /^MERGE-GATE PASS/m);
});

test('MG-2: fixture FAIL — in_progress 1개', () => {
  const { exitCode, stdout } = runScript(MG, [
    '--repo', 'owner/repo',
    '--pr', '286',
    '--fixture', join(FIX, 'merge-gate-fail-inprogress.json'),
  ]);
  assert.equal(exitCode, 1);
  assert.match(stdout, /^MERGE-GATE FAIL/m);
  assert.match(stdout, /진행 중/);
});

test('MG-3: fixture FAIL — 주 워크플로 run 없음', () => {
  // CI_WORKFLOWS 에 등록된 storeport 리포 사용 — workflowRuns 비어있으면 FAIL
  const { exitCode, stdout } = runScript(MG, [
    '--repo', 'CuriocityDevAi/storeport',
    '--pr', '287',
    '--fixture', join(FIX, 'merge-gate-fail-no-ci.json'),
  ]);
  assert.equal(exitCode, 1);
  assert.match(stdout, /^MERGE-GATE FAIL/m);
  assert.match(stdout, /주 워크플로/);
});

test('MG-4: storeport#472 구조 — 잡 이름 ci/ci.yml 없이 workflowRun 으로 PASS', () => {
  // 핵심: check runs 에 "ci"/"ci.yml" 이름 없어도 workflowRuns 에 ci.yml success 있으면 PASS
  const { exitCode, stdout } = runScript(MG, [
    '--repo', 'CuriocityDevAi/storeport',
    '--pr', '472',
    '--fixture', join(FIX, 'merge-gate-pass-storeport.json'),
  ]);
  assert.equal(exitCode, 0, `stdout: ${stdout}`);
  assert.match(stdout, /^MERGE-GATE PASS/m);
});

test('MG-5: 허용 목록 밖 skipped → FAIL', () => {
  // flakey-integration 은 ALLOWED_SKIPPED 에 없으므로 skipped → FAIL
  const { exitCode, stdout } = runScript(MG, [
    '--repo', 'CuriocityDevAi/storeport',
    '--pr', '290',
    '--fixture', join(FIX, 'merge-gate-fail-skipped.json'),
  ]);
  assert.equal(exitCode, 1);
  assert.match(stdout, /^MERGE-GATE FAIL/m);
  assert.match(stdout, /허용 목록 외|skipped/);
});

test('MG-6: check run 0 개 → FAIL', () => {
  // CI 한 번도 실행 안 된 상태 — workflowRuns 도 없음
  const { exitCode, stdout } = runScript(MG, [
    '--repo', 'CuriocityDevAi/storeport',
    '--pr', '291',
    '--fixture', join(FIX, 'merge-gate-fail-no-runs.json'),
  ]);
  assert.equal(exitCode, 1);
  assert.match(stdout, /^MERGE-GATE FAIL/m);
});

// 검증의 검증: MG-5 의 skipped 판정 로직(Issue 2 수정)이 살아있어야만 MG-5 가 FAIL
// 이 수정을 되돌리면(skipped → conclusion !== 'success' && conclusion !== 'skipped' 로 돌림)
// flakey-integration(skipped) 이 ALLOWED_SKIPPED 검사를 통과해 MG-5 가 PASS 되어버림
test('MG-skipped-검증: 허용 목록 밖 skipped 판정 로직 필수 확인', () => {
  const { exitCode } = runScript(MG, [
    '--repo', 'CuriocityDevAi/storeport',
    '--pr', '290',
    '--fixture', join(FIX, 'merge-gate-fail-skipped.json'),
  ]);
  // skipped 판정이 올바르면 exitCode=1; 로직 되돌리면 PASS 되어 이 테스트가 빨강
  assert.equal(exitCode, 1, 'skipped 허용 목록 판정 로직이 제거되면 이 테스트가 실패함 — 검증의 검증');
});

test('MG-검증: in_progress fixture 가 PASS 되지 않음(로직 필수 확인)', () => {
  const { exitCode } = runScript(MG, [
    '--repo', 'owner/repo',
    '--pr', '286',
    '--fixture', join(FIX, 'merge-gate-fail-inprogress.json'),
  ]);
  // in_progress 판정이 있어야만 exitCode=1; 없으면 PASS 되어버림
  assert.equal(exitCode, 1, 'in_progress 판정 로직이 제거되면 이 테스트가 실패함 — 검증의 검증');
});

test('MG-JSON: --json 옵션 출력 파싱 가능', () => {
  const { exitCode, stdout } = runScript(MG, [
    '--repo', 'owner/repo',
    '--pr', '285',
    '--fixture', join(FIX, 'merge-gate-pass.json'),
    '--json',
  ]);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.verdict, 'PASS');
  assert.equal(parsed.pr, '285');
});

// ===== check-report =====

test('CR-1: 실제 R0-1127-F-report.md → PASS', () => {
  const { exitCode, stdout } = runScript(CR, [join(RELAY_ROOT, 'r0', 'R0-1127-F-report.md')]);
  assert.equal(exitCode, 0, `stdout: ${stdout}`);
  assert.match(stdout, /^PASS/m);
});

test('CR-2: fixture report-pass.md → PASS', () => {
  const { exitCode, stdout } = runScript(CR, [join(FIX, 'report-pass.md')]);
  assert.equal(exitCode, 0, `stdout: ${stdout}`);
  assert.match(stdout, /^PASS/m);
});

test('CR-3: 판정 없음 → FAIL', () => {
  const { exitCode, stdout } = runScript(CR, [join(FIX, 'report-fail-no-verdict.md')]);
  assert.equal(exitCode, 1);
  assert.match(stdout, /판정/);
});

test('CR-4: 초록+진행 중 혼재 → 경고(WARN)', () => {
  const { exitCode, stdout } = runScript(CR, [join(FIX, 'report-warn-mixed-ci.md')]);
  // 경고만이면 exitCode=0, 경고 메시지 포함
  assert.match(stdout, /⚠|혼재/);
});
