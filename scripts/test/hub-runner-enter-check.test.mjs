import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasSessionStarted,
  hasApiErrorInTail,
  shouldSendEnterRetry,
  shouldSendContinue,
} from '../lib/enter-check.mjs';

// ── REQ(a) Enter 누락 ──────────────────────────────────────────────────────

test('정상 시작 — esc to interrupt 감지', () => {
  assert.equal(hasSessionStarted('Running tool... esc to interrupt'), true);
});

test('정상 시작 — ⏵⏵ bypass permissions 감지', () => {
  assert.equal(hasSessionStarted('⏵⏵ bypass permissions on (shift+tab to cycle) · esc to interrupt'), true);
});

test('시작 미감지 — 쉘 프롬프트만', () => {
  assert.equal(hasSessionStarted('$ echo hello\nhello\n$'), false);
});

test('시작 미감지 — 빈 화면', () => {
  assert.equal(hasSessionStarted(''), false);
  assert.equal(hasSessionStarted(null), false);
});

test('Enter 재전송 불필요 — 세션 시작됨', () => {
  assert.equal(shouldSendEnterRetry({ sessionStarted: true, retriesSent: 0 }), false);
});

test('Enter 재전송 허용 — 1회차', () => {
  assert.equal(shouldSendEnterRetry({ sessionStarted: false, retriesSent: 0 }), true);
});

test('Enter 재전송 허용 — 2회차', () => {
  assert.equal(shouldSendEnterRetry({ sessionStarted: false, retriesSent: 1 }), true);
});

test('Enter 재전송 불가 — 2회 소진 후 blocked', () => {
  assert.equal(shouldSendEnterRetry({ sessionStarted: false, retriesSent: 2 }), false);
});

test('Enter 재전송 불가 — maxRetries 초과', () => {
  assert.equal(shouldSendEnterRetry({ sessionStarted: false, retriesSent: 3, maxRetries: 2 }), false);
});

// ── REQ(b) 네트워크/API 오류 복구 ─────────────────────────────────────────

test('API Error 마지막 줄 — 감지', () => {
  const screen = 'processing...\nAPI Error: rate limit exceeded';
  assert.equal(hasApiErrorInTail(screen, 5), true);
});

test('Connection 오류 마지막 줄 — 감지', () => {
  assert.equal(hasApiErrorInTail('output\nCould not resolve host: api.anthropic.com', 5), true);
});

test('정상 출력 오탐 없음 — 오류 언급이 앞쪽 줄에만', () => {
  const lines = Array.from({ length: 20 }, (_, i) => `line ${i}: normal output`);
  lines[0] = 'The error was: API Error from earlier report';
  const screen = [...lines, 'Task completed successfully', '$ '].join('\n');
  assert.equal(hasApiErrorInTail(screen, 5), false, '마지막 5줄에 오류 없음 → false');
});

test('API Error 없음 — 쉘 프롬프트', () => {
  assert.equal(hasApiErrorInTail('$ echo ok\nok\n$ ', 5), false);
});

test('빈 화면 — false', () => {
  assert.equal(hasApiErrorInTail('', 5), false);
  assert.equal(hasApiErrorInTail(null, 5), false);
});

test('계속 1회 — 오류 감지 후 60초 경과', () => {
  const firstSeenAt = 0;
  const now = 65_000;
  assert.equal(
    shouldSendContinue({ apiErrorInTail: true, retriesSent: 0, firstSeenAt, now }),
    true,
  );
});

test('계속 2회 상한 — 초과 시 false', () => {
  assert.equal(
    shouldSendContinue({ apiErrorInTail: true, retriesSent: 2, firstSeenAt: 0, now: 200_000 }),
    false,
  );
});

test('같은 상태 재폴링 — 60초 미달 시 중복 전송 없음', () => {
  const firstSeenAt = 1000;
  const now = 10_000;
  assert.equal(
    shouldSendContinue({ apiErrorInTail: true, retriesSent: 0, firstSeenAt, now }),
    false,
    '60초 미달 → false',
  );
});

test('오류 없음 — false', () => {
  assert.equal(
    shouldSendContinue({ apiErrorInTail: false, retriesSent: 0, firstSeenAt: 0, now: 100_000 }),
    false,
  );
});

test('firstSeenAt null — 최초 감지 시점 미등록 → false', () => {
  assert.equal(
    shouldSendContinue({ apiErrorInTail: true, retriesSent: 0, firstSeenAt: null, now: 100_000 }),
    false,
    'firstSeenAt null → 아직 대기 시작 전',
  );
});

test('2회차 — 첫 전송 후 60초 경과 → 허용', () => {
  const firstSeenAt = 0;
  const now = 65_000;
  assert.equal(
    shouldSendContinue({ apiErrorInTail: true, retriesSent: 1, firstSeenAt, now }),
    true,
    '2회차 허용',
  );
  assert.equal(
    shouldSendContinue({ apiErrorInTail: true, retriesSent: 2, firstSeenAt, now }),
    false,
    '3회차 불가',
  );
});
