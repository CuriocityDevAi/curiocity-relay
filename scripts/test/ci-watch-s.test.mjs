// scripts/test/ci-watch-s.test.mjs  M2-1125-S — 스피너 · --once 실데이터 테스트
//
// 커버:
//   S-1: spinnerChar — 10 프레임 고유값 순환
//   S-2: --once 실출력 — rl# 아이템 CI 큐 미노출
//   S-3: --once 실출력 — 주의 줄 사유 문구 포함 (타이틀 아님)
//   S-4: --once 실출력 — CI 큐 in-progress 에 sp#/fk#/rl# 접두어

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { spinnerChar, stripAnsi } from '../watch/render-v2.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = join(__dirname, '..', '..');
const ENTRY      = join(REPO_ROOT, 'scripts', 'ci-watch-v2.mjs');

// ── 헬퍼 ────────────────────────────────────────────────────────────────────

function runOnce(width = 120) {
  const raw = execFileSync(process.execPath, [ENTRY, '--once', `--width=${width}`], {
    timeout: 15_000,
    encoding: 'utf8',
    env: { ...process.env, CI_WATCH_RELAY_ROOT: REPO_ROOT },
  });
  return raw.split('\n').map(l => stripAnsi(l));
}

// ── S-1: spinnerChar 단위 테스트 ─────────────────────────────────────────────

test('S-1a: spinnerChar — 10 프레임 고유값', () => {
  const frames = Array.from({ length: 10 }, (_, i) => spinnerChar(i));
  const unique = new Set(frames);
  assert.equal(unique.size, 10, `10개 고유 프레임이어야 함 (got: ${frames.join('')})`);
});

test('S-1b: spinnerChar — 10번째 프레임은 0번째와 같음 (순환)', () => {
  assert.equal(spinnerChar(10), spinnerChar(0), '프레임 10 = 프레임 0 (10 mod 10)');
});

test('S-1c: spinnerChar — 20번째 프레임은 0번째와 같음', () => {
  assert.equal(spinnerChar(20), spinnerChar(0), '프레임 20 = 프레임 0 (20 mod 10)');
});

test('S-1d: spinnerChar — 음수 입력 안전', () => {
  const f = spinnerChar(-1);
  assert.equal(typeof f, 'string', '음수 입력에도 문자열 반환');
  assert.ok(f.length > 0, '빈 문자열 아님');
});

// ── S-2: --once 실데이터 — relay PR CI 큐 미노출 ─────────────────────────────

test('S-2: --once — rl# 아이템이 CI 큐(storeport-heavy)에 없음', () => {
  let lines;
  try { lines = runOnce(); } catch (e) { assert.fail(`--once 실행 실패: ${e.message}`); }

  // CI 큐 섹션만 추출 (─ CI 큐 ~ 다음 ─ 섹션 전까지)
  const ciStart = lines.findIndex(l => /─ CI 큐/.test(l));
  const ciEnd   = lines.findIndex((l, i) => i > ciStart && /^─/.test(l));
  const ciSection = ciStart >= 0
    ? lines.slice(ciStart, ciEnd > ciStart ? ciEnd : undefined)
    : [];

  const hasRl = ciSection.some(l => /rl#\d/.test(l));
  assert.equal(hasRl, false, `CI 큐 섹션에 rl# 아이템이 없어야 함\n관련 줄:\n${ciSection.filter(l => /rl#/.test(l)).join('\n')}`);
});

// ── S-3: --once 실데이터 — 주의 줄 사유 문구 ─────────────────────────────────

test('S-3: --once — 주의 줄에 사유 문구가 포함됨 (타이틀 대신)', () => {
  let lines;
  try { lines = runOnce(); } catch (e) { assert.fail(`--once 실행 실패: ${e.message}`); }

  // 주의 섹션 추출
  const cautStart = lines.findIndex(l => /─ 주의/.test(l));
  const cautEnd   = lines.findIndex((l, i) => i > cautStart && /^─/.test(l));
  const cautSection = cautStart >= 0
    ? lines.slice(cautStart + 1, cautEnd > cautStart ? cautEnd : undefined)
    : [];

  if (cautSection.length === 0) return; // 주의 항목 없으면 패스

  // 사유 패턴: "N분", "N분 전", "N일" 등 시간 표현이 포함된 줄
  const timePattern = /\d+분|\d+초|\d+일|\d+시간/;
  const hasReason = cautSection.some(l => l.trim() && timePattern.test(l));
  assert.ok(hasReason, `주의 줄에 시간 기반 사유 문구가 있어야 함\n주의 섹션:\n${cautSection.join('\n')}`);
});

// ── S-4: --once 실데이터 — CI 큐 in-progress sp#/fk#/rl# 접두어 ──────────────

test('S-4: --once — CI 큐 진행 중 항목에 repo 접두어(sp#/fk#/rl#) 형식', () => {
  let lines;
  try { lines = runOnce(); } catch (e) { assert.fail(`--once 실행 실패: ${e.message}`); }

  // CI 큐 섹션 추출
  const ciStart = lines.findIndex(l => /─ CI 큐/.test(l));
  const ciEnd   = lines.findIndex((l, i) => i > ciStart && /^─/.test(l));
  const ciSection = ciStart >= 0
    ? lines.slice(ciStart, ciEnd > ciStart ? ciEnd : undefined)
    : [];

  // "└ ⠋" 또는 "[머지 후 실행]" 로 시작하는 in-progress 줄
  const inProgressLines = ciSection.filter(l => /└/.test(l) && (
    /[spfkrl]{2}#\d/.test(l) || /머지 후 실행/.test(l)
  ));

  if (inProgressLines.length === 0) return; // 진행 중 없으면 패스

  for (const line of inProgressLines) {
    if (/머지 후 실행/.test(line)) continue; // 머지 후 실행은 접두어 없어도 OK
    const hasPrefix = /[spfkrl]{2}#\d/.test(line);
    assert.ok(hasPrefix, `CI 진행 중 줄에 sp#/fk#/rl# 접두어 없음:\n  ${line}`);
  }
});
