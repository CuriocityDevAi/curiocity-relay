// scripts/test/hub-runner-usage-limit.test.mjs — M1-1128-F: resets_at ISO 변환 검증
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectUsageLimitInScreen, parseResetsIso } from '../lib/usage-limit.mjs';

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

// ─── 1. 실제 fixture 3건 모두 감지 + resets_at = 2026-11-30T02:00:00.000Z ─
test('M0-1128-D fixture — 감지 + resets_at ISO', () => {
  const result = detectUsageLimitInScreen(FIXTURE_M0);
  assert.ok(result !== null, '감지 실패');
  assert.ok(result.resetsText.includes('Nov 30'), `resetsText에 날짜 없음: ${result.resetsText}`);
  // Asia/Jakarta UTC+7 → Nov 30 09:00+07:00 = 2026-11-30T02:00:00.000Z
  assert.equal(result.resetsAt, '2026-11-30T02:00:00.000Z', `resetsAt 불일치: ${result.resetsAt}`);
});

test('M2-1128-D fixture — 감지 + resets_at ISO', () => {
  const result = detectUsageLimitInScreen(FIXTURE_M2);
  assert.ok(result !== null, '감지 실패');
  assert.ok(result.resetsText.includes('Nov 30'), `resetsText에 날짜 없음: ${result.resetsText}`);
  assert.equal(result.resetsAt, '2026-11-30T02:00:00.000Z', `resetsAt 불일치: ${result.resetsAt}`);
});

test('M3-1128-H fixture — 감지 + resets_at ISO', () => {
  const result = detectUsageLimitInScreen(FIXTURE_M3);
  assert.ok(result !== null, '감지 실패');
  assert.ok(result.resetsText.includes('Nov 30'), `resetsText에 날짜 없음: ${result.resetsText}`);
  assert.equal(result.resetsAt, '2026-11-30T02:00:00.000Z', `resetsAt 불일치: ${result.resetsAt}`);
});

// ─── 2. 경과 시 자동 해제: nowMs > resets_at → 다음 해로 추론 ─────────────
test('경과 시 자동 해제: resets_at 경과 → 다음 해 추론', () => {
  const afterReset = new Date('2026-11-30T03:00:00Z').getTime();
  const iso = parseResetsIso('Nov 30 at 9am (Asia/Jakarta)', afterReset);
  // Nov 30 2026 경과 → 2027-11-30T02:00:00.000Z
  assert.equal(iso, '2027-11-30T02:00:00.000Z', `다음 해 추론 실패: ${iso}`);
  // 자동 해제 조건: Date.parse(resets_at) > nowMs → 항상 미래여야 함
  assert.ok(Date.parse(iso) > afterReset, '경과 후 추론 ISO가 여전히 과거');
});

// ─── 3. 일반 화면 — 오판 없음 ──────────────────────────────────────────────
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

test('/rate-limit-options 경로 문자열만 (You 패턴 없음) — 오판 없음', () => {
  const codeOutput = `Writing file /scripts/rate-limit-options/index.js\n done.\n❯ /rate-limit-options\n`;
  assert.equal(detectUsageLimitInScreen(codeOutput), null, '/rate-limit-options 단독 오판');
});

// ─── 4. 검증의 검증: 문구 변경 → 미감지 ───────────────────────────────────
test("문구 1글자 변경 — limit → limix · /rate-limit-options 제거 → 미감지", () => {
  const tweaked = FIXTURE_M0
    .replace("You've hit your limit", "You've hit your limix")
    .replace('/rate-limit-options', '/rate-limit-optionz');
  assert.equal(detectUsageLimitInScreen(tweaked), null, '문구 변경 후 여전히 감지됨');
});

test('/rate-limit-options 한 글자 변경 (You 패턴 제거) — 미감지', () => {
  const tweaked = FIXTURE_M0
    .replace("You've hit your limit", 'Usage limit reached')
    .replace('/rate-limit-options', '/rate-limit-optionX');
  assert.equal(detectUsageLimitInScreen(tweaked), null, '문구 변경 후 여전히 감지됨');
});
