import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldQueueCheckout, blockedLogKey } from '../lib/queue-update.mjs';

test('outOfScope 파일 있으면 queue checkout 필요', () => {
  assert.equal(shouldQueueCheckout(['scripts/hub-runner-v6.8.mjs']), true);
});

test('outOfScope 파일 없으면 queue checkout 불필요', () => {
  assert.equal(shouldQueueCheckout([]), false);
});

test('같은 파일 집합 → 동일 key (1회만 로그)', () => {
  const files = ['scripts/hub-runner-v6.8.mjs', 'scripts/hub-runner-v6.9.mjs'];
  const k1 = blockedLogKey(files);
  const k2 = blockedLogKey(files);
  assert.equal(k1, k2, '동일 파일 집합은 같은 key');
});

test('다른 파일 집합 → 다른 key (재로그 허용)', () => {
  const k1 = blockedLogKey(['scripts/hub-runner-v6.8.mjs']);
  const k2 = blockedLogKey(['scripts/hub-runner-v6.9.mjs']);
  assert.notEqual(k1, k2, '파일 집합 변경 → key 변경');
});

test('정렬 순서 무관하게 동일 key', () => {
  const k1 = blockedLogKey(['b.mjs', 'a.mjs']);
  const k2 = blockedLogKey(['a.mjs', 'b.mjs']);
  assert.equal(k1, k2, '정렬 후 비교');
});
