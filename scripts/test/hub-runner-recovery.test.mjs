// scripts/test/hub-runner-recovery.test.mjs — #6 재시작 복구 단위 테스트 (M2-1105-AO v7.1)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRecoverStartedClaim } from '../lib/recovery.mjs';

// ─── done/cancelled/blocked claim 보존 (#6 — 덮어쓰기 금지) ───

test('done claim + shell pane → skip-state (덮어쓰기 금지)', () => {
  assert.equal(shouldRecoverStartedClaim({ claimState: 'done', paneState: 'shell' }), 'skip-state');
});

test('done claim + claude pane → skip-state (pane 무관하게 보존)', () => {
  assert.equal(shouldRecoverStartedClaim({ claimState: 'done', paneState: 'claude' }), 'skip-state');
});

test('cancelled claim → skip-state', () => {
  assert.equal(shouldRecoverStartedClaim({ claimState: 'cancelled', paneState: 'shell' }), 'skip-state');
});

test('blocked claim → skip-state', () => {
  assert.equal(shouldRecoverStartedClaim({ claimState: 'blocked', paneState: 'shell' }), 'skip-state');
});

test('null(claim 없음) → skip-state', () => {
  assert.equal(shouldRecoverStartedClaim({ claimState: null, paneState: 'shell' }), 'skip-state');
});

// ─── started + 빈 pane 복구 (#6 — 재시작 복구 대상) ───

test('started + shell pane → recover (빈 pane · 복구 대상)', () => {
  assert.equal(shouldRecoverStartedClaim({ claimState: 'started', paneState: 'shell' }), 'recover');
});

test('started + unknown pane → recover (cmux 불가 · 복구 대상)', () => {
  assert.equal(shouldRecoverStartedClaim({ claimState: 'started', paneState: 'unknown' }), 'recover');
});

// ─── started + claude pane 미개입 (#6 — 작업 중이면 개입 금지) ───

test('started + claude pane → skip-claude (작업 중 · 미개입)', () => {
  assert.equal(shouldRecoverStartedClaim({ claimState: 'started', paneState: 'claude' }), 'skip-claude');
});
