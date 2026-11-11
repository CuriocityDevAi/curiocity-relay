import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateIdleNoLanding, hasProgressMarkers } from '../lib/detect-stuck.mjs';

const MIN_MS = 5 * 60_000;

test('활발 출력 — 화면 변화 있으면 미판정', () => {
  const now = Date.now();
  const r1 = evaluateIdleNoLanding({
    paneState: 'shell', currentScreen: 'screen-A', history: null, now, minUnchangedMs: MIN_MS,
  });
  assert.equal(r1.result, false);

  const r2 = evaluateIdleNoLanding({
    paneState: 'shell', currentScreen: 'screen-B', history: r1.history, now: now + 60_000, minUnchangedMs: MIN_MS,
  });
  assert.equal(r2.result, false, '화면 변화 → 미판정');
});

test('불변 4분 — 아직 미판정', () => {
  const start = Date.now();
  const r1 = evaluateIdleNoLanding({
    paneState: 'shell', currentScreen: 'idle-screen', history: null, now: start, minUnchangedMs: MIN_MS,
  });
  const r2 = evaluateIdleNoLanding({
    paneState: 'shell', currentScreen: 'idle-screen', history: r1.history, now: start + 4 * 60_000, minUnchangedMs: MIN_MS,
  });
  assert.equal(r2.result, false, '4분 미달 → 미판정');
});

test('불변 5분+스피너 있음 — 미판정', () => {
  const start = Date.now();
  const screenWithSpinner = 'working ⠋ processing...';
  const r1 = evaluateIdleNoLanding({
    paneState: 'shell', currentScreen: screenWithSpinner, history: null, now: start, minUnchangedMs: MIN_MS,
  });
  const r2 = evaluateIdleNoLanding({
    paneState: 'shell', currentScreen: screenWithSpinner, history: r1.history, now: start + 6 * 60_000, minUnchangedMs: MIN_MS,
  });
  assert.equal(r2.result, false, '진행 표식 있음 → 미판정');
});

test('불변 5분+스피너 없음 — 판정 1회', () => {
  const start = Date.now();
  const idleScreen = '$ echo done\ndone\n$';
  const r1 = evaluateIdleNoLanding({
    paneState: 'shell', currentScreen: idleScreen, history: null, now: start, minUnchangedMs: MIN_MS,
  });
  const r2 = evaluateIdleNoLanding({
    paneState: 'shell', currentScreen: idleScreen, history: r1.history, now: start + 6 * 60_000, minUnchangedMs: MIN_MS,
  });
  assert.equal(r2.result, true, '5분 불변+진행표식없음 → 판정');
});

test('같은 상태 재폴링 — history 유지되어 반복 true 반환', () => {
  const start = Date.now();
  const idleScreen = '$ idle';
  const r1 = evaluateIdleNoLanding({ paneState: 'shell', currentScreen: idleScreen, history: null, now: start, minUnchangedMs: MIN_MS });
  const r2 = evaluateIdleNoLanding({ paneState: 'shell', currentScreen: idleScreen, history: r1.history, now: start + 6 * 60_000, minUnchangedMs: MIN_MS });
  assert.equal(r2.result, true);
  const r3 = evaluateIdleNoLanding({ paneState: 'shell', currentScreen: idleScreen, history: r2.history, now: start + 7 * 60_000, minUnchangedMs: MIN_MS });
  assert.equal(r3.result, true, '같은 상태 재폴링 → 여전히 true (history 유지)');
});

test('상태 해제 후 재판정 — 화면 바뀌면 history 리셋', () => {
  const start = Date.now();
  const idleScreen = '$ idle';
  const r1 = evaluateIdleNoLanding({ paneState: 'shell', currentScreen: idleScreen, history: null, now: start, minUnchangedMs: MIN_MS });
  const r2 = evaluateIdleNoLanding({ paneState: 'shell', currentScreen: idleScreen, history: r1.history, now: start + 6 * 60_000, minUnchangedMs: MIN_MS });
  assert.equal(r2.result, true);

  const newScreen = '$ running...';
  const r3 = evaluateIdleNoLanding({ paneState: 'shell', currentScreen: newScreen, history: r2.history, now: start + 7 * 60_000, minUnchangedMs: MIN_MS });
  assert.equal(r3.result, false, '화면 변화로 리셋 → 미판정');
  assert.equal(r3.history?.screen, newScreen, 'history 가 새 screen 으로 리셋');
});

test('claude 상태이면 미판정', () => {
  const r = evaluateIdleNoLanding({
    paneState: 'claude', currentScreen: '$ idle', history: null, now: Date.now(), minUnchangedMs: MIN_MS,
  });
  assert.equal(r.result, false);
  assert.equal(r.history, null);
});

test('hasProgressMarkers — 스피너 감지', () => {
  assert.equal(hasProgressMarkers('working ⠋ please wait'), true);
  assert.equal(hasProgressMarkers('esc to interrupt the process'), true);
  assert.equal(hasProgressMarkers('used 1234 tokens: 500 input'), true);
  assert.equal(hasProgressMarkers('$ echo hello\nhello\n$'), false);
});
