import assert from 'node:assert/strict';
import { computeRunnerAlerts } from '../watch/runner-alerts.mjs';

const NOW = Date.now();
const min = (n) => NOW - n * 60000;

// 가짜 all.json 헬퍼
function base(overrides = {}) {
  return {
    at: new Date(NOW - 1 * 60000).toISOString(), // 1분 전 (정상)
    git_state: { ahead: 0, behind: 0, needs_human: false, conflicted: [] },
    err_tail: 'line-a\nline-b\nline-c',
    ...overrides,
  };
}

let pass = 0;
let fail = 0;

function check(label, got, expected) {
  try {
    assert.deepEqual(got, expected);
    console.log(`PASS  ${label}`);
    pass++;
  } catch (e) {
    console.error(`FAIL  ${label}`);
    console.error(`      got:      ${JSON.stringify(got)}`);
    console.error(`      expected: ${JSON.stringify(expected)}`);
    fail++;
  }
}

// 1. 정상 — 경보 없음
{
  const { alerts } = computeRunnerAlerts(base(), { nowMs: NOW });
  check('정상 · 경보 없음', alerts.length, 0);
}

// 2. needs_human=true → git_conflict 경보
{
  const { alerts } = computeRunnerAlerts(
    base({ git_state: { ahead: 0, needs_human: true, conflicted: [] } }),
    { nowMs: NOW },
  );
  check('needs_human · 경보 1개', alerts.length, 1);
  check('needs_human · type=git_conflict', alerts[0]?.type, 'git_conflict');
  check('needs_human · msg 포함', alerts[0]?.msg.includes('사람 필요'), true);
}

// 3. ahead 지속 — aheadSinceMs = 6분 전
{
  const { alerts } = computeRunnerAlerts(
    base({ git_state: { ahead: 2, needs_human: false, conflicted: [] } }),
    { nowMs: NOW, aheadSinceMs: min(6) },
  );
  check('ahead 지속 · 경보 1개', alerts.length, 1);
  check('ahead 지속 · type=git_ahead', alerts[0]?.type, 'git_ahead');
  check('ahead 지속 · msg에 2개 포함', alerts[0]?.msg.includes('2개'), true);
}

// 3b. ahead 지속이지만 4분 — 경보 없음 (5분 미만)
{
  const { alerts } = computeRunnerAlerts(
    base({ git_state: { ahead: 1, needs_human: false, conflicted: [] } }),
    { nowMs: NOW, aheadSinceMs: min(4) },
  );
  check('ahead 4분 미만 · 경보 없음', alerts.length, 0);
}

// 4. 반복 오류 — 같은 줄 3회
{
  const repeatedLine = '[runner] push 실패: error: unmerged files';
  const errTail = [repeatedLine, repeatedLine, repeatedLine, 'other-line'].join('\n');
  const { alerts } = computeRunnerAlerts(base({ err_tail: errTail }), { nowMs: NOW });
  check('반복 오류 · 경보 1개 이상', alerts.length >= 1, true);
  check('반복 오류 · type=err_repeat', alerts[0]?.type, 'err_repeat');
  check('반복 오류 · msg에 3회 포함', alerts[0]?.msg.includes('3회'), true);
}

// 5. heartbeat 지연 — at = 11분 전
{
  const { alerts } = computeRunnerAlerts(
    base({ at: new Date(min(11)).toISOString() }),
    { nowMs: NOW },
  );
  check('heartbeat 지연 · 경보 1개', alerts.length, 1);
  check('heartbeat 지연 · type=heartbeat_timeout', alerts[0]?.type, 'heartbeat_timeout');
  check('heartbeat 지연 · msg에 응답없음 포함', alerts[0]?.msg.includes('응답 없음'), true);
}

// 6. 미투입 — ageMin=5 → unclaimed 경보
{
  const { alerts } = computeRunnerAlerts(
    base(),
    { nowMs: NOW, unclaimedIds: [{ id: 'M1-1123-X', ageMin: 5 }] },
  );
  check('미투입 · 경보 1개', alerts.length, 1);
  check('미투입 · type=unclaimed', alerts[0]?.type, 'unclaimed');
  check('미투입 · msg에 ID 포함', alerts[0]?.msg.includes('M1-1123-X'), true);
}

// 6b. ageMin=2 → 경보 없음 (3분 미만)
{
  const { alerts } = computeRunnerAlerts(
    base(),
    { nowMs: NOW, unclaimedIds: [{ id: 'M1-1123-Y', ageMin: 2 }] },
  );
  check('미투입 2분 · 경보 없음', alerts.length, 0);
}

// aheadSinceMs 상태 추적 — ahead 처음 감지 시 null→설정
{
  const { aheadSinceMs } = computeRunnerAlerts(
    base({ git_state: { ahead: 1, needs_human: false, conflicted: [] } }),
    { nowMs: NOW, aheadSinceMs: null },
  );
  check('ahead 첫 감지 · aheadSinceMs 설정됨', typeof aheadSinceMs === 'number', true);
}

// aheadSinceMs 상태 추적 — ahead 해소 시 null 반환
{
  const { aheadSinceMs } = computeRunnerAlerts(
    base({ git_state: { ahead: 0, needs_human: false, conflicted: [] } }),
    { nowMs: NOW, aheadSinceMs: min(10) },
  );
  check('ahead 해소 · aheadSinceMs null', aheadSinceMs, null);
}

console.log(`\n${pass} passed · ${fail} failed`);
if (fail > 0) process.exit(1);
