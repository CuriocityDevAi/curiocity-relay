// scripts/test/hub-runner-usage-limit.test.mjs — M1-1128-E: 사용량 한도 화면 감지 검증
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectUsageLimitInScreen, USAGE_LIMIT_RE } from '../lib/usage-limit.mjs';

// ─── fixture: 오늘 로그 3개에서 추출한 실제 화면 텍스트 ───────────────────
const FIXTURE_M0 = `\
     ⎿  You've hit your limit · resets Nov 30 at 9am \n\
        (Asia/Jakarta)               \n\
                                               \n\
✻ Cooked for 19m 0s                        \n\
                                     \n\
❯ /rate-limit-options                              \n\
                                        \n\
───────────────────────────────────────────────────\n\
  What do you want to do?         \n\
                                                   \n\
  ❯ 1. Stop and wait for limit to reset\n`;

const FIXTURE_M2 = `\
  ⎿  claimStartedCount: 52                                   \n\
     pipelinePrompts count: 7     \n\
  ⎿  You've hit your limit · resets Nov 30 at 9am            \n\
     (Asia/Jakarta)                                        \n\
                                                        \n\
✻ Sautéed for 27m 21s                  \n\
                                                             \n\
❯ /rate-limit-options                                        \n\
                                                             \n\
─────────────────────────────────────────────────────────────\n\
  What do you want to do?                                  \n\
\n\
  ❯ 1. Stop and wait for limit to reset\n`;

const FIXTURE_M3 = `\
  ⎿  You've hit your limit · resets Nov 30 at 9am  \n\
     (Asia/Jakarta)                      \n\
                                                   \n\
✻ Cogitated for 3m 22s                           \n\
\n\
❯ /rate-limit-options                              \n\
  \n\
───────────────────────────────────────────────────\n\
  What do you want to do?                        \n\
\n\
  ❯ 1. Stop and wait for limit to reset\n`;

// ─── 1. 실제 fixture 3건 모두 감지 ───────────────────────────────────────
test('M0-1128-D fixture — usage-limit 감지', () => {
  const result = detectUsageLimitInScreen(FIXTURE_M0);
  assert.ok(result !== null, '감지 실패');
  assert.ok(result.resetsText.includes('Nov 30'), `resetsText에 날짜 없음: ${result.resetsText}`);
});

test('M2-1128-D fixture — usage-limit 감지', () => {
  const result = detectUsageLimitInScreen(FIXTURE_M2);
  assert.ok(result !== null, '감지 실패');
  assert.ok(result.resetsText.includes('Nov 30'), `resetsText에 날짜 없음: ${result.resetsText}`);
});

test('M3-1128-H fixture — usage-limit 감지', () => {
  const result = detectUsageLimitInScreen(FIXTURE_M3);
  assert.ok(result !== null, '감지 실패');
  assert.ok(result.resetsText.includes('Nov 30'), `resetsText에 날짜 없음: ${result.resetsText}`);
});

// ─── 2. 일반 화면 — 오판 없음 ──────────────────────────────────────────
test('일반 작업 화면 — 오판 없음', () => {
  const normalScreen = `\
✔ Bash(git status) · 0.3s\n\
  ⎿  On branch feat/M1-1128-E\n\
     nothing to commit, working tree clean\n\
\n\
✔ Write(/scripts/test/hub-runner-usage-limit.test.mjs) · 0.1s\n\
❯ 작업 계속 중...\n`;
  assert.equal(detectUsageLimitInScreen(normalScreen), null, '일반 화면에서 오판');
});

test('빈 화면 — 오판 없음', () => {
  assert.equal(detectUsageLimitInScreen(''), null);
  assert.equal(detectUsageLimitInScreen(null), null);
});

test('API error 화면 (rate.limit 아님) — 오판 없음', () => {
  const apiErrScreen = `API Error: 500 Internal Server Error\nretrying...\n`;
  assert.equal(detectUsageLimitInScreen(apiErrScreen), null, 'api-error 화면에서 오판');
});

// ─── 3. 검증의 검증: 문구 한 글자 바꾸면 감지 안 됨 ───────────────────
test("문구 1글자 변경 — limit → limix → 미감지", () => {
  // "You've hit your limit" 에서 't' → 'x', '/rate-limit-options' 도 제거 → regex 완전 불일치
  const tweaked = FIXTURE_M0
    .replace("You've hit your limit", "You've hit your limix")
    .replace('/rate-limit-options', '/rate-limit-optionz');
  assert.equal(detectUsageLimitInScreen(tweaked), null, '문구 변경 후 여전히 감지됨');
});

test('/rate-limit-options 한 글자 변경 (You 패턴 제거) — 미감지', () => {
  // "/rate-limit-options" 에서 's' → 'X', "You've hit your limit" 도 완전히 치환
  const tweaked = FIXTURE_M0
    .replace("You've hit your limit", 'Usage limit reached')
    .replace('/rate-limit-options', '/rate-limit-optionX');
  assert.equal(detectUsageLimitInScreen(tweaked), null, '문구 변경 후 여전히 감지됨');
});
