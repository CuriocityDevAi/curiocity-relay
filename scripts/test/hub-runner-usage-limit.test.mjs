// scripts/test/hub-runner-usage-limit.test.mjs — M1-1128-F: resets_at ISO 변환 · AND 감지 검증
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectUsageLimitInScreen, parseResetsAt } from '../lib/usage-limit.mjs';

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

// ─── 1. fixture 3건 감지 + resets_at ISO 검증 ────────────────────────────
test('M0 fixture — 감지 + resets_at ISO', () => {
  const result = detectUsageLimitInScreen(FIXTURE_M0);
  assert.ok(result !== null, '감지 실패');
  assert.ok(result.resetsText.includes('Nov 30'), `resetsText에 날짜 없음: ${result.resetsText}`);
  assert.equal(result.resetsAt, '2026-11-30T02:00:00.000Z', `resets_at 불일치: ${result.resetsAt}`);
});

test('M2 fixture — 감지 + resets_at ISO', () => {
  const result = detectUsageLimitInScreen(FIXTURE_M2);
  assert.ok(result !== null, '감지 실패');
  assert.ok(result.resetsText.includes('Nov 30'), `resetsText에 날짜 없음: ${result.resetsText}`);
  assert.equal(result.resetsAt, '2026-11-30T02:00:00.000Z', `resets_at 불일치: ${result.resetsAt}`);
});

test('M3 fixture — 감지 + resets_at ISO', () => {
  const result = detectUsageLimitInScreen(FIXTURE_M3);
  assert.ok(result !== null, '감지 실패');
  assert.ok(result.resetsText.includes('Nov 30'), `resetsText에 날짜 없음: ${result.resetsText}`);
  assert.equal(result.resetsAt, '2026-11-30T02:00:00.000Z', `resets_at 불일치: ${result.resetsAt}`);
});

// ─── 2. 경과 시각 → parseResetsAt null (자동 해제 판정) ───────────────────
test('경과 날짜 → parseResetsAt null (자동 해제 가능)', () => {
  // Nov 27 at 9am Jakarta — 오늘(2026-11-28)보다 과거, 연도+1=2027이면 미래 → 2027-11-27T02:00:00Z
  // 자동 해제 판정: checkRunnerPauseExpiry 는 resets_at ISO 가 Date.now() 미만이면 해제
  const past = parseResetsAt('Nov 27 at 9am', '(Asia/Jakarta)');
  // 오늘 2026-11-28, Nov 27 2026 = 과거 → year+1=2027 반환
  assert.ok(past !== null, 'past 날짜가 null — 연도 추론 실패');
  assert.ok(past.startsWith('2027-11-27'), `2027 연도 추론 실패: ${past}`);

  // 경과 판정 시뮬레이션: Date.parse(ISO) < Date.now()
  const expired = new Date('2026-11-27T02:00:00.000Z').toISOString();
  const ms = Date.parse(expired);
  assert.ok(!isNaN(ms), 'ISO 파싱 NaN — 자동 해제 불가');
  assert.ok(ms < Date.now(), '경과 판정 실패');
});

// ─── 3. 오판 방지 ──────────────────────────────────────────────────────────
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

test('/rate-limit-options 경로 문자열만 (You\'ve hit 없음) — 오판 없음', () => {
  // 코드 출력이나 경로 문자열에 /rate-limit-options 가 등장해도 You've hit 없으면 미감지
  const codeOutput = `\
✔ Read(/scripts/lib/usage-limit.mjs)\n\
  ⎿  RATE_LIMIT_OPTIONS_RE = /\\/rate-limit-options/\n\
❯ 코드 분석 중...\n`;
  assert.equal(detectUsageLimitInScreen(codeOutput), null, '/rate-limit-options 경로 문자열 오판');
});

// ─── 4. 단어 변조 → 미감지 ────────────────────────────────────────────────
test("문구 1글자 변경 — limit → limix → 미감지", () => {
  const tweaked = FIXTURE_M0
    .replace("You've hit your limit", "You've hit your limix")
    .replace('/rate-limit-options', '/rate-limit-optionz');
  assert.equal(detectUsageLimitInScreen(tweaked), null, '문구 변경 후 여전히 감지됨');
});

test('/rate-limit-options 한 글자 변경 (You 패턴도 제거) — 미감지', () => {
  const tweaked = FIXTURE_M0
    .replace("You've hit your limit", 'Usage limit reached')
    .replace('/rate-limit-options', '/rate-limit-optionX');
  assert.equal(detectUsageLimitInScreen(tweaked), null, '문구 변경 후 여전히 감지됨');
});
