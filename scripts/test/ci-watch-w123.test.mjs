// scripts/test/ci-watch-w123.test.mjs  M0-1127-F — 리포별 main 최신 CI 경보
//
// 커버:
//   W123-success-no-alert:   success → 경보 없음
//   W123-failure-alert:      conclusion=failure (정상 duration) → main_ci_failure
//   W123-startup-alert:      conclusion=startup_failure → main_ci_start_failure ("워크플로 파일 오류 의심")
//   W123-zero-duration:      conclusion=failure · duration=0s → main_ci_start_failure
//   W123-no-run-15min:       latestRun=null · 커밋 16분 전 → main_ci_no_run
//   W123-no-run-fresh:       latestRun=null · 커밋 5분 전 (문턱 15분) → 경보 없음
//   W123-in-progress:        status=in_progress → 경보 없음 (아직 실행 중)
//   W123-multi-repo:         성공 + 실패 혼합 → 실패만 경보
//   W123-msg-format:         경보 메시지 = `<리포> main CI 실패 · <commit7> · <N분 전> — 다음 PR 머지 금지`
//   W123-verify-no-start-detect: detectStartFailure=false 이면 startup_failure 케이스는 "시작 실패" 라벨 소실
//                             (검증의 검증 — REQ-4)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMainCiAlerts,
  MAIN_CI_NO_RUN_MIN,
} from '../ci-watch.mjs';

const nowMs = Date.now();
const mkCommit = (minAgo, sha = 'abc1234deadbeef') => ({
  commit: sha,
  commitAtMs: nowMs - minAgo * 60_000,
});

// ─── W123-success-no-alert ──────────────────────────────────────────────────

test('W123-success-no-alert: conclusion=success → 경보 없음', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(5),
      latestRun: {
        status: 'completed', conclusion: 'success',
        durationMs: 1000 * 60 * 17, jobsCount: null,
      },
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 0, `success 는 경보 없어야 함 · got: ${JSON.stringify(alerts)}`);
});

// ─── W123-failure-alert ──────────────────────────────────────────────────────

test('W123-failure-alert: conclusion=failure (정상 duration) → main_ci_failure', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(10),
      latestRun: {
        status: 'completed', conclusion: 'failure',
        durationMs: 1000 * 60 * 17, jobsCount: null,
      },
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 1, `got: ${JSON.stringify(alerts)}`);
  assert.equal(alerts[0].type, 'main_ci_failure');
  assert.match(alerts[0].msg, /storeport main CI 실패/);
  assert.match(alerts[0].msg, /abc1234/);
  assert.doesNotMatch(alerts[0].msg, /워크플로 파일 오류 의심/,
    '정상 duration failure 는 "워크플로 파일 오류" 문구 없어야 함');
});

// ─── W123-startup-alert ──────────────────────────────────────────────────────

test('W123-startup-alert: conclusion=startup_failure → main_ci_start_failure', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(5),
      latestRun: {
        status: 'completed', conclusion: 'startup_failure',
        durationMs: 0, jobsCount: 0,
      },
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, 'main_ci_start_failure');
  assert.match(alerts[0].msg, /워크플로 파일 오류 의심/);
  assert.match(alerts[0].msg, /다음 PR 머지 금지/);
});

// ─── W123-zero-duration ──────────────────────────────────────────────────────

test('W123-zero-duration: conclusion=failure · duration=0s → main_ci_start_failure', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(3),
      latestRun: {
        status: 'completed', conclusion: 'failure',
        durationMs: 0, jobsCount: 0,
      },
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, 'main_ci_start_failure',
    `0초 실패는 start_failure 로 분류되어야 함 (storeport#467 뿌리) · got: ${JSON.stringify(alerts)}`);
});

// ─── W123-no-run-15min ───────────────────────────────────────────────────────

test('W123-no-run-15min: latestRun=null · 커밋 16분 전 → main_ci_no_run', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': { ...mkCommit(16), latestRun: null },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, 'main_ci_no_run');
  assert.match(alerts[0].msg, /실행 없음/);
  assert.match(alerts[0].msg, /다음 PR 머지 금지/);
});

// ─── W123-no-run-fresh ───────────────────────────────────────────────────────

test('W123-no-run-fresh: latestRun=null · 커밋 5분 전 (문턱 15분) → 경보 없음', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': { ...mkCommit(5), latestRun: null },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 0, `문턱 미만 미실행은 조용 · got: ${JSON.stringify(alerts)}`);
});

// ─── W123-in-progress ────────────────────────────────────────────────────────

test('W123-in-progress: status=in_progress → 경보 없음', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(2),
      latestRun: {
        status: 'in_progress', conclusion: null,
        durationMs: null, jobsCount: null,
      },
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 0);
});

// ─── W123-multi-repo ─────────────────────────────────────────────────────────

test('W123-multi-repo: 성공 + 실패 혼합 → 실패 리포만 경보', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(10, 'good1234'),
      latestRun: { status: 'completed', conclusion: 'success', durationMs: 60_000 },
    },
    'narisolutions/agilo-medusa-pos-fork': {
      ...mkCommit(20, 'bad5678'),
      latestRun: { status: 'completed', conclusion: 'failure', durationMs: 120_000 },
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].msg, /agilo-medusa-pos-fork main CI 실패/);
  assert.match(alerts[0].msg, /bad5678/);
});

// ─── W123-msg-format ─────────────────────────────────────────────────────────

test('W123-msg-format: `<리포> main CI 실패 · <commit7> · <N분 전> — 다음 PR 머지 금지`', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(42, '1234567890abcdef'),
      latestRun: { status: 'completed', conclusion: 'failure', durationMs: 1000 * 60 * 10 },
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 1);
  // 리포명 = fullRepo 의 마지막 세그먼트
  // commit7 = 첫 7자
  // age = 약 42분 전
  assert.match(alerts[0].msg,
    /^storeport main CI 실패 · 1234567 · \d+분 전 — 다음 PR 머지 금지$/,
    `format mismatch · got: "${alerts[0].msg}"`);
});

// ─── W123-verify-no-start-detect ─────────────────────────────────────────────

test('W123-verify-no-start-detect: detectStartFailure=false 면 startup_failure 분류 소실 (검증의 검증)', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(5),
      latestRun: {
        status: 'completed', conclusion: 'startup_failure',
        durationMs: 0, jobsCount: 0,
      },
    },
  };
  const withDetect = computeMainCiAlerts(statusMap, nowMs, { detectStartFailure: true });
  const withoutDetect = computeMainCiAlerts(statusMap, nowMs, { detectStartFailure: false });

  assert.equal(withDetect.length, 1);
  assert.equal(withDetect[0].type, 'main_ci_start_failure',
    'detectStartFailure=true 면 start_failure 로 분류');

  process.stderr.write(
    `[W123 검증] detectStartFailure=false · startup_failure 케이스 · ` +
    `alerts=${JSON.stringify(withoutDetect)} (type!=main_ci_start_failure 이어야 함)\n`,
  );
  // conclusion='startup_failure' 는 "failure/cancelled/timed_out" 집합에 없으므로 폴스루 → 경보 없음.
  // 즉, 시작 실패 판정이 꺼지면 이 사건은 묵음 — 아무도 모름 (storeport#468 재발 시나리오).
  assert.notEqual(
    withoutDetect[0]?.type,
    'main_ci_start_failure',
    '시작 실패 판정 OFF 시 startup_failure 를 start_failure 로 분류하면 안 됨 (negative check)',
  );
});

// ─── W123-missing-latest-run-field ────────────────────────────────────────────

test('W123-missing-latest-run-field: latestRun undefined (0 커밋 뒤) → 문턱 미만 → 경보 없음', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(1),
      latestRun: null,
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 0);
});

// ─── W123-threshold-boundary ─────────────────────────────────────────────────

test('W123-threshold-boundary: MAIN_CI_NO_RUN_MIN 경계값 확인 (기본 15)', () => {
  assert.equal(MAIN_CI_NO_RUN_MIN, 15, '기본 문턱은 15분 (REQ-1)');
});
