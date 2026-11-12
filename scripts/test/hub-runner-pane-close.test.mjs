// scripts/test/hub-runner-pane-close.test.mjs — 끝난 Claude 세션 자동 닫기 단위 테스트
// M1-1105-BC · 장치 사건 #19 (R0 3회 · M1 1회) 재발 방지.
//
// [REQ] 3 의 5종 + 추가 가드:
//   ① 정상 닫힘           — 첫 시도 /exit → 15초 안 shell
//   ② 첫 시도 무시→재시도 — 1회차 claude 유지 · 2회차 shell
//   ③ 3회 실패→보고       — 3회 전부 claude 유지 → report-failure
//   ④ 쉘 프롬프트에선 미송신 — state=shell 이면 'done' (exit 미송신)
//   ⑤ done 아닌 세션 안 닫음 — isDone=false → skip
//
// decideCloseAction 은 순수 함수라 fake pane 없이 attempt/state 조합만으로 전수 검증.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideCloseAction, PANE_CLOSE_MAX_ATTEMPTS } from '../lib/pane-close.mjs';

// ─── ① 정상 닫힘 (초회 → shell 복귀) ───

test('① 정상 닫힘 — attempt=0 · claude → ctrl-u-exit (first-try)', () => {
  const d = decideCloseAction({ hub: 'm1', state: 'claude', attempt: 0, isDone: true });
  assert.equal(d.action, 'ctrl-u-exit');
  assert.equal(d.reason, 'first-try');
});

test('① 정상 닫힘 — ctrl-u-exit 뒤 state=shell 재호출 → done', () => {
  const d = decideCloseAction({ hub: 'm1', state: 'shell', attempt: 1, isDone: true });
  assert.equal(d.action, 'done');
  assert.equal(d.reason, 'already-shell');
});

// ─── ② 첫 시도 무시→재시도 성공 ───

test('② 재시도 1 — attempt=1 · claude → ctrl-u-exit (같은 시퀀스 재시도)', () => {
  const d = decideCloseAction({ hub: 'r0', state: 'claude', attempt: 1, isDone: true });
  assert.equal(d.action, 'ctrl-u-exit');
  assert.equal(d.reason, 'retry-1');
});

test('② 재시도 2 — attempt=2 · claude → escape-ctrl-u-exit (Escape 추가)', () => {
  const d = decideCloseAction({ hub: 'r0', state: 'claude', attempt: 2, isDone: true });
  assert.equal(d.action, 'escape-ctrl-u-exit');
  assert.equal(d.reason, 'retry-2-escape');
});

test('② 재시도 중 state=shell 이면 즉시 done (다음 액션 불필요)', () => {
  const d = decideCloseAction({ hub: 'r0', state: 'shell', attempt: 2, isDone: true });
  assert.equal(d.action, 'done');
});

// ─── ③ 3회 실패→report-failure ───

test('③ 3회 실패 — attempt=3 · claude → report-failure', () => {
  const d = decideCloseAction({ hub: 'm1', state: 'claude', attempt: 3, isDone: true });
  assert.equal(d.action, 'report-failure');
  assert.equal(d.reason, 'exhausted');
});

test('③ PANE_CLOSE_MAX_ATTEMPTS 는 3 (초회+재시도 2 = 3)', () => {
  assert.equal(PANE_CLOSE_MAX_ATTEMPTS, 3);
});

// ─── ④ 쉘 프롬프트에서는 아무것도 안 보냄 (⛔ exit → cmux 칸 닫힘) ───

test('④ shell + attempt=0 → done (초회부터 shell 이면 미송신)', () => {
  const d = decideCloseAction({ hub: 'm0', state: 'shell', attempt: 0, isDone: true });
  assert.equal(d.action, 'done');
  assert.equal(d.reason, 'already-shell');
  // 액션 이름에 exit/send 포함 금지 (regression guard).
  assert.ok(!/exit|send/.test(d.action));
});

// ─── ⑤ done 아닌 세션 안 닫음 ───

test('⑤ isDone=false · claude → skip (작업 중 세션 미개입)', () => {
  const d = decideCloseAction({ hub: 'm1', state: 'claude', attempt: 0, isDone: false });
  assert.equal(d.action, 'skip');
  assert.equal(d.reason, 'not-done');
});

test('⑤ isDone=false · 재시도 중이어도 skip (상태 무관)', () => {
  const d = decideCloseAction({ hub: 'm3', state: 'claude', attempt: 2, isDone: false });
  assert.equal(d.action, 'skip');
  assert.equal(d.reason, 'not-done');
});

// ─── 가드: M2 는 수동 투입 칸 · 영원히 안 닫음 ───

test('가드 — hub=m2 는 state 무관 · isDone 무관 · skip (수동 투입)', () => {
  assert.equal(decideCloseAction({ hub: 'm2', state: 'claude', attempt: 0, isDone: true }).action, 'skip');
  assert.equal(decideCloseAction({ hub: 'm2', state: 'shell', attempt: 0, isDone: true }).action, 'skip');
  assert.equal(decideCloseAction({ hub: 'm2', state: 'claude', attempt: 3, isDone: true }).action, 'skip');
});

// ─── 가드: unknown 상태 → skip (vim/less 등 미개입) ───

test('가드 — state=unknown → skip (vim/less 등 안전 보호)', () => {
  const d = decideCloseAction({ hub: 'm1', state: 'unknown', attempt: 0, isDone: true });
  assert.equal(d.action, 'skip');
  assert.equal(d.reason, 'unknown-state');
});

// ─── 가드: 우선순위 (m2 > isDone > state) ───

test('우선순위 — m2 는 isDone=false 보다 먼저 체크', () => {
  assert.equal(decideCloseAction({ hub: 'm2', state: 'claude', attempt: 0, isDone: false }).action, 'skip');
});

test('우선순위 — isDone=false 는 state=claude 보다 먼저 체크', () => {
  const d = decideCloseAction({ hub: 'r0', state: 'claude', attempt: 2, isDone: false });
  assert.equal(d.reason, 'not-done');
});
