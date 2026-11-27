// scripts/test/ci-watch-w121.test.mjs  M2-1127-F — iMac heartbeat 거짓 경보 · 문턱 보정
//
// 커버:
//   F121-no-alert-4min:  4분 전 ts → 12분 threshold → 경보 없음
//   F121-alert-13min:    13분 전 ts → 12분 threshold → imac_heartbeat_stale 경보
//   F121-alert-wib:      경보 msg 에 WIB 시각(HH:MM) 포함
//   F121-missing:        파일 없음(null) → imac_heartbeat_missing 경보 유지
//   F121-verify-3min:    threshold=3분으로 낮추면 4분 케이스 경보 발생 (검증의 검증)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeImacHbAlerts, HB_STALE_MIN } from '../ci-watch.mjs';

const nowMs = Date.now();
const ts4min  = new Date(nowMs -  4 * 60_000).toISOString();
const ts13min = new Date(nowMs - 13 * 60_000).toISOString();

// ─── F121-no-alert-4min ──────────────────────────────────────────────────────

test('F121-no-alert-4min: 4분 전 ts → HB_STALE_MIN(12분) threshold → 경보 없음', () => {
  const alerts = computeImacHbAlerts({ ts: ts4min }, nowMs);
  assert.equal(alerts.length, 0,
    `4분 전은 경보 없어야 함 · threshold=${HB_STALE_MIN}분 · got: ${JSON.stringify(alerts)}`);
});

// ─── F121-alert-13min ────────────────────────────────────────────────────────

test('F121-alert-13min: 13분 전 ts → imac_heartbeat_stale 경보 1개', () => {
  const alerts = computeImacHbAlerts({ ts: ts13min }, nowMs);
  assert.equal(alerts.length, 1,
    `13분 전은 경보 1개여야 함 · got: ${JSON.stringify(alerts)}`);
  assert.equal(alerts[0].type, 'imac_heartbeat_stale',
    `type=imac_heartbeat_stale 기대 · got: ${alerts[0]?.type}`);
});

// ─── F121-alert-wib ──────────────────────────────────────────────────────────

test('F121-alert-wib: 경보 msg 에 WIB 시각(HH:MM) 포함', () => {
  const alerts = computeImacHbAlerts({ ts: ts13min }, nowMs);
  assert.ok(alerts.length > 0, '경보 1개 이상 필요');
  assert.ok(/\d{2}:\d{2} WIB/.test(alerts[0].msg),
    `msg 에 "HH:MM WIB" 포함 기대 · got: "${alerts[0]?.msg}"`);
});

// ─── F121-missing ────────────────────────────────────────────────────────────

test('F121-missing: imacJson=null → imac_heartbeat_missing 경보 유지', () => {
  const alerts = computeImacHbAlerts(null, nowMs);
  assert.equal(alerts.length, 1,
    `파일 없음 → 경보 1개 기대 · got: ${JSON.stringify(alerts)}`);
  assert.equal(alerts[0].type, 'imac_heartbeat_missing',
    `type=imac_heartbeat_missing 기대 · got: ${alerts[0]?.type}`);
});

// ─── F121-verify-3min ────────────────────────────────────────────────────────

test('F121-verify-3min: threshold=3분으로 낮추면 4분 케이스 경보 발생 (검증의 검증)', () => {
  const alerts = computeImacHbAlerts({ ts: ts4min }, nowMs, { thresholdMin: 3 });
  process.stderr.write(
    `[F121 검증] threshold=3분 · 4분 케이스 경보 수: ${alerts.length} (1 이어야 함)\n`,
  );
  assert.equal(alerts.length, 1,
    `threshold=3분으로 낮추면 4분 케이스는 경보 발생해야 함 · got: ${JSON.stringify(alerts)}`);
});
