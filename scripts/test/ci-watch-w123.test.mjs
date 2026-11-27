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
  MAIN_CI_WORKFLOWS,
  loadMainCiWorkflows,
  isCommitFullyPathsIgnored,
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

// ─── W123-fork-repo-owner (M0-1127-H 필수-1) ──────────────────────────────────
// 검증의 검증: fork 리포 소유자가 CuriocityDevAi 로 맞춰져 있어야 한다.
// 리뷰 뿌리(R0-1127-J 필수-1): 소유자가 `narisolutions` 이면 GitHub API 404 → fork CI 경보 영구 묵음.
// 리포 이름을 다시 `narisolutions/...` 로 되돌리면 이 테스트가 빨강이 된다.

test('W123-fork-repo-owner: fork 소유자 = CuriocityDevAi (narisolutions 아님)', () => {
  const repos = Object.keys(MAIN_CI_WORKFLOWS);
  const forkRepo = repos.find(r => r.endsWith('/agilo-medusa-pos-fork'));
  assert.ok(forkRepo, 'fork 리포가 MAIN_CI_WORKFLOWS 에 있어야 함');
  assert.equal(
    forkRepo,
    'CuriocityDevAi/agilo-medusa-pos-fork',
    `fork 소유자는 CuriocityDevAi 이어야 함 (narisolutions 는 404 묵음 원인) · got: ${forkRepo}`,
  );
  // 명시적 negative check: narisolutions 로 재발 금지
  assert.ok(
    !repos.some(r => r.startsWith('narisolutions/')),
    'narisolutions/* 가 MAIN_CI_WORKFLOWS 에 있으면 안 됨 (영구 묵음 원인)',
  );
});

// ─── W123-fork-branch (M0-1127-H 필수-2) ──────────────────────────────────────
// fork 의 기본 브랜치는 master — main 이 아님. 하드코딩 되돌리면 404 → 묵음.

test('W123-fork-branch: fork 기본 브랜치 = master', () => {
  const cfg = MAIN_CI_WORKFLOWS['CuriocityDevAi/agilo-medusa-pos-fork'];
  assert.ok(cfg, 'fork 엔트리 존재');
  assert.equal(cfg.branch, 'master', `fork 기본 브랜치는 master · got: ${cfg.branch}`);
});

test('W123-storeport-branch: storeport 기본 브랜치 = main', () => {
  const cfg = MAIN_CI_WORKFLOWS['CuriocityDevAi/storeport'];
  assert.ok(cfg, 'storeport 엔트리 존재');
  assert.equal(cfg.branch, 'main', `storeport 기본 브랜치는 main · got: ${cfg.branch}`);
});

// ─── W123-fork-failure-alert (M0-1127-H 필수-2 간접 검증) ────────────────────
// fork 픽스처(master 브랜치 가정) 실패 → 경보 — fullRepo 가 'agilo-medusa-pos-fork' 접미사이고
// conclusion=failure 이면 computeMainCiAlerts 가 올바른 경보 1건 발사.

test('W123-fork-failure-alert: fork(master) 실패 커밋 → main_ci_failure 경보', () => {
  const statusMap = {
    'CuriocityDevAi/agilo-medusa-pos-fork': {
      ...mkCommit(30, 'forkbad1'),
      latestRun: { status: 'completed', conclusion: 'failure', durationMs: 120_000 },
      commitIsPathsIgnored: false,
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 1, `got: ${JSON.stringify(alerts)}`);
  assert.equal(alerts[0].type, 'main_ci_failure');
  assert.match(alerts[0].msg, /agilo-medusa-pos-fork main CI 실패/);
  assert.match(alerts[0].msg, /forkbad/);
});

// ─── W123-docs-only-no-alert (M0-1127-H 권고-1) ──────────────────────────────
// docs-only 커밋(paths_ignore 전부 매칭) 이면 run 이 생성되지 않는 것이 정상 → no_run 경보 억제.

test('W123-docs-only-no-alert: commitIsPathsIgnored=true · 커밋 30분 전 · latestRun=null → 경보 없음', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(30, 'docsonly'),
      latestRun: null,
      commitIsPathsIgnored: true,
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(
    alerts.length, 0,
    `docs-only 커밋은 no_run 경보 없어야 함 · got: ${JSON.stringify(alerts)}`,
  );
});

test('W123-non-docs-no-run-still-alerts: commitIsPathsIgnored=false · 커밋 30분 전 · null → main_ci_no_run', () => {
  const statusMap = {
    'CuriocityDevAi/storeport': {
      ...mkCommit(30, 'realcode'),
      latestRun: null,
      commitIsPathsIgnored: false,
    },
  };
  const alerts = computeMainCiAlerts(statusMap, nowMs);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].type, 'main_ci_no_run',
    `실코드 커밋 미실행은 여전히 경보 · got: ${JSON.stringify(alerts)}`);
});

// ─── W123-paths-ignore-matcher (isCommitFullyPathsIgnored pure) ──────────────

test('W123-paths-ignore-matcher: **/*.md · docs/** 전부 매칭 → true', () => {
  const files = ['README.md', 'docs/EPIC-STATE.md', 'docs/sub/x.md'];
  assert.equal(
    isCommitFullyPathsIgnored(files, ['**/*.md', 'docs/**']),
    true,
  );
});

test('W123-paths-ignore-matcher-mixed: 코드 파일 1개라도 포함 → false', () => {
  const files = ['README.md', 'scripts/ci-watch.mjs'];
  assert.equal(
    isCommitFullyPathsIgnored(files, ['**/*.md', 'docs/**']),
    false,
  );
});

test('W123-paths-ignore-matcher-empty: 빈 리스트 → false (판정 보류)', () => {
  assert.equal(isCommitFullyPathsIgnored([], ['**/*.md']), false);
  assert.equal(isCommitFullyPathsIgnored(['README.md'], []), false);
  assert.equal(isCommitFullyPathsIgnored(null, ['**/*.md']), false);
});

// ─── W123-load-main-ci-workflows (config 오버라이드) ────────────────────────
// loadMainCiWorkflows() 는 MAIN_CI_WORKFLOWS 를 base 로 돌려주고, runner-config.json 의
// ci_watch.main_ci_workflows 가 있으면 리포별 merge. (여기선 default 만 확인.)

test('W123-load-main-ci-workflows: 두 리포 모두 존재 + branch 지정됨', () => {
  const wf = loadMainCiWorkflows({ force: true });
  assert.ok(wf['CuriocityDevAi/storeport'], 'storeport 엔트리 존재');
  assert.ok(wf['CuriocityDevAi/agilo-medusa-pos-fork'], 'fork 엔트리 존재');
  assert.equal(wf['CuriocityDevAi/storeport'].branch, 'main');
  assert.equal(wf['CuriocityDevAi/agilo-medusa-pos-fork'].branch, 'master');
});
