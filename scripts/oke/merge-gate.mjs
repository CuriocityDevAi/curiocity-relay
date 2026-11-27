#!/usr/bin/env node
// scripts/oke/merge-gate.mjs  M1-1127-J — storeport FLOW_PATHS ask-phone 추가 · 포크 리허설 조회

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---- 주 워크플로 목록 (리포 → .github/workflows 경로) ----
const CI_WORKFLOWS = {
  'CuriocityDevAi/storeport':            '.github/workflows/ci.yml',
  'narisolutions/medusa-pos':            '.github/workflows/ci.yml',
  'narisolutions/agilo-medusa-pos-fork': '.github/workflows/ci.yml',
  'CuriocityDevAi/agilo-medusa-pos-fork': '.github/workflows/ci.yml',
};

// ---- 리허설 워크플로 경로 ----
const REHEARSAL_WORKFLOW = '.github/workflows/e2e-cd-pos.yml';

// ---- storeport 리허설은 포크 리포에서 sha 로 조회 (갭 2 — M1-1127-J) ----
// storeport PR 흐름 체크 시 포크의 e2e-cd-pos.yml 런 목록에서 run-name 에 storeport sha 포함된 런을 찾음
const REHEARSAL_FORK = {
  'CuriocityDevAi/storeport': 'CuriocityDevAi/agilo-medusa-pos-fork',
};

// ---- "흐름 PR" 경로 패턴 (repo → glob 목록) ----
// 이 경로 중 하나라도 변경된 PR 은 아이맥 리허설 초록이어야 머지 가능
// (decision-rehearsal-gate-20261127 · 3원칙 "관문 먼저")
const FLOW_PATHS = {
  'CuriocityDevAi/storeport': [
    'apps/customer-display/**',
    'apps/commerce-core/src/modules/register_session/**',
    'apps/commerce-core/src/lib/customer-flow/**',
    'apps/commerce-core/src/api/**/customer-display/**',
    '**/phone-entry/**',
    // 번호 입력 흐름 admin API 라우트 (갭 1 — M1-1127-J)
    'apps/commerce-core/src/api/admin/pos/orders/**/ask-phone-on-display/**',
    'apps/commerce-core/src/api/admin/pos/orders/**/phone-entry/**',
    'apps/commerce-core/src/api/admin/pos/orders/**/customer-flow/**',
  ],
  'narisolutions/medusa-pos': [
    'apps/customer-display/**',
    'apps/commerce-core/src/modules/register_session/**',
    'apps/commerce-core/src/lib/customer-flow/**',
    'apps/commerce-core/src/api/**/customer-display/**',
    '**/phone-entry/**',
    'apps/commerce-core/src/api/admin/pos/orders/**/ask-phone-on-display/**',
    'apps/commerce-core/src/api/admin/pos/orders/**/phone-entry/**',
    'apps/commerce-core/src/api/admin/pos/orders/**/customer-flow/**',
  ],
  'narisolutions/agilo-medusa-pos-fork': [
    'components/customer-display/**',
    'components/cd-preview/**',
    'components/order-chips/**',
    'components/loyalty/**',
    'app/checkout/**',
    'app/customer-lookup*',
    'api/hooks/ask-phone-on-display.ts',
    'api/hooks/register-session.ts',
    'lib/ask-phone-on-display.ts',
    'lib/loyalty-snapshot.ts',
    'lib/phone-id.ts',
  ],
  'CuriocityDevAi/agilo-medusa-pos-fork': [
    'components/customer-display/**',
    'components/cd-preview/**',
    'components/order-chips/**',
    'components/loyalty/**',
    'app/checkout/**',
    'app/customer-lookup*',
    'api/hooks/ask-phone-on-display.ts',
    'api/hooks/register-session.ts',
    'lib/ask-phone-on-display.ts',
    'lib/loyalty-snapshot.ts',
    'lib/phone-id.ts',
  ],
};

// ---- CLI 파싱 ----
const args = process.argv.slice(2);
let repo = null;
let prNum = null;
let jsonOut = false;
let fixtureFile = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo') repo = args[++i];
  else if (args[i] === '--pr') prNum = args[++i];
  else if (args[i] === '--json') jsonOut = true;
  else if (args[i] === '--fixture') fixtureFile = args[++i];
}

if (!repo || !prNum) {
  console.error('사용법: node scripts/oke/merge-gate.mjs --repo <owner/name> --pr <N> [--json]');
  process.exit(1);
}

function ghJson(...ghArgs) {
  if (fixtureFile) return null;
  return JSON.parse(execFileSync('gh', ghArgs, { encoding: 'utf8' }));
}

// ---- 픽스처 주입 (테스트용) ----
let fixtureData = null;
if (fixtureFile) {
  fixtureData = JSON.parse(readFileSync(fixtureFile, 'utf8'));
}

function getPrData() {
  if (fixtureData) return fixtureData.pr;
  return ghJson('pr', 'view', prNum, '--repo', repo, '--json', 'headRefOid,number,title,mergedAt,state');
}

function getCheckRuns(sha) {
  if (fixtureData) return fixtureData.checkRuns;
  return ghJson('api', `repos/${repo}/commits/${sha}/check-runs`, '--paginate');
}

function getWorkflowRuns(sha) {
  if (fixtureData) return fixtureData.workflowRuns ?? [];
  const result = ghJson('api', `repos/${repo}/actions/runs?head_sha=${sha}`);
  return result?.workflow_runs ?? [];
}

function getPrReviews(prN) {
  if (fixtureData) return fixtureData.reviews ?? [];
  return ghJson('api', `repos/${repo}/pulls/${prN}/reviews`);
}

function getPrComments(prN) {
  if (fixtureData) return fixtureData.comments ?? [];
  return ghJson('api', `repos/${repo}/issues/${prN}/comments`);
}

function getPrFiles(prN) {
  if (fixtureData) return fixtureData.changedFiles ?? [];
  const result = ghJson('api', `repos/${repo}/pulls/${prN}/files`);
  return Array.isArray(result) ? result : [];
}

function getRehearsalForkRuns(forkRepo) {
  if (fixtureData) return fixtureData.rehearsalForkRuns ?? [];
  const result = ghJson('api', `repos/${forkRepo}/actions/workflows/e2e-cd-pos.yml/runs?per_page=20`);
  return result?.workflow_runs ?? [];
}

// ---- 아이맥 heavy 통계 (판정에 사용 안 함 · 오케 참고용) ----
function getImacStats() {
  if (fixtureData?.imacStats !== undefined) return fixtureData.imacStats;
  try {
    const __dir = dirname(fileURLToPath(import.meta.url));
    const imacPath = join(__dir, '..', '..', 'status', 'ci-box', 'imac.json');
    if (!existsSync(imacPath)) return null;
    const data = JSON.parse(readFileSync(imacPath, 'utf8'));
    return {
      swap_used_mb: data.memory?.swap_used_mb ?? null,
      load_15: data.uptime?.load_15 ?? null,
      ts: data.ts ?? null,
    };
  } catch {
    return null;
  }
}

// ---- glob 매칭 ----
function matchGlob(filename, pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\x00')
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*');
  return new RegExp(`^${escaped}$`).test(filename);
}

function isFlowPr(files) {
  const patterns = FLOW_PATHS[repo] ?? [];
  if (patterns.length === 0) return false;
  return files.some(f => patterns.some(p => matchGlob(f.filename ?? f, p)));
}

// ---- 검사 ----
const reasons = [];
let pass = true;

const prData = getPrData();
const sha = prData.headRefOid ?? prData.head?.sha ?? prData.sha;
const sha7 = sha ? sha.slice(0, 7) : 'unknown';
const isMerged = !!(prData.mergedAt || prData.state === 'MERGED');

const runsData = getCheckRuns(sha);
const runs = runsData?.check_runs ?? runsData ?? [];

const ALLOWED_SKIPPED = ['heavy-cloud'];
const incomplete = [];
const failed = [];

for (const run of runs) {
  const name = run.name ?? '';
  const status = run.status ?? '';
  const conclusion = run.conclusion ?? '';

  if (status !== 'completed') {
    incomplete.push(`${name}(${status})`);
  } else if (conclusion === 'failure') {
    failed.push(`${name}(failure)`);
  } else if (conclusion === 'skipped') {
    if (!ALLOWED_SKIPPED.some(a => name.includes(a))) {
      failed.push(`${name}(skipped — 허용 목록 외)`);
    }
  } else if (conclusion !== 'success') {
    if (!ALLOWED_SKIPPED.some(a => name.includes(a))) {
      failed.push(`${name}(${conclusion})`);
    }
  }
}

if (incomplete.length > 0) {
  pass = false;
  reasons.push(`CI 미시작·진행 중 ≠ 초록: ${incomplete.join(', ')}`);
}
if (failed.length > 0) {
  pass = false;
  reasons.push(`CI 실패: ${failed.join(', ')}`);
}

// 주 워크플로 판정 (workflow run 단위)
const primaryPath = CI_WORKFLOWS[repo];
const workflowRuns = getWorkflowRuns(sha);

if (primaryPath) {
  const primaryRun = workflowRuns.find(r => r.path === primaryPath);
  if (!primaryRun) {
    pass = false;
    reasons.push(`주 워크플로(${primaryPath}) 이 head 에서 실행 기록 없음 — CI 가 한 번도 실행되지 않은 상태`);
  } else if (primaryRun.status !== 'completed') {
    pass = false;
    reasons.push(`주 워크플로(${primaryRun.workflow_name ?? primaryPath}) 미완료: status=${primaryRun.status}`);
  } else if (primaryRun.conclusion !== 'success') {
    pass = false;
    reasons.push(`주 워크플로(${primaryRun.workflow_name ?? primaryPath}) 실패: conclusion=${primaryRun.conclusion}`);
  }
}

// ---- 리허설 관문 (흐름 PR 한정) ----
// 손님 화면·번호 입력 흐름 경로 변경 PR → 아이맥 리허설 초록 필수
// storeport PR: 리허설은 포크(agilo-medusa-pos-fork)의 e2e-cd-pos.yml 런에서 sha 로 찾음
const prFiles = getPrFiles(prNum);
const flowPr = isFlowPr(prFiles);

if (flowPr) {
  const forkRepo = REHEARSAL_FORK[repo];
  let rehearsalRun;

  if (forkRepo) {
    // storeport → 포크 e2e-cd-pos.yml 런 목록에서 run-name 에 storeport sha 포함된 런 조회
    const forkRuns = getRehearsalForkRuns(forkRepo);
    rehearsalRun = forkRuns.find(r => {
      const name = r.name ?? r.display_title ?? '';
      return name.includes(sha7) || name.includes(sha);
    });
    if (!rehearsalRun) {
      pass = false;
      reasons.push(`rehearsal: pending — 흐름 PR 이지만 fork(${forkRepo}) e2e-cd-pos 에 storeport/${sha7} 포함 run 없음 · rehearsal-dispatch 또는 workflow_dispatch 로 트리거 필요`);
    } else if (rehearsalRun.status !== 'completed') {
      pass = false;
      reasons.push(`rehearsal: pending — fork e2e-cd-pos 진행 중: status=${rehearsalRun.status}`);
    } else if (rehearsalRun.conclusion !== 'success') {
      pass = false;
      reasons.push(`rehearsal: fail — fork e2e-cd-pos 빨강: conclusion=${rehearsalRun.conclusion} · 흐름 PR 은 리허설 초록 없이 머지 불가`);
    }
  } else {
    rehearsalRun = workflowRuns.find(r => r.path === REHEARSAL_WORKFLOW);
    if (!rehearsalRun) {
      pass = false;
      reasons.push(`rehearsal: pending — 흐름 PR 이지만 리허설(${REHEARSAL_WORKFLOW}) 실행 기록 없음 · 아이맥에서 e2e-cd-pos 초록 필요`);
    } else if (rehearsalRun.status !== 'completed') {
      pass = false;
      reasons.push(`rehearsal: pending — 리허설(${rehearsalRun.workflow_name ?? REHEARSAL_WORKFLOW}) 진행 중: status=${rehearsalRun.status}`);
    } else if (rehearsalRun.conclusion !== 'success') {
      pass = false;
      reasons.push(`rehearsal: fail — 리허설(${rehearsalRun.workflow_name ?? REHEARSAL_WORKFLOW}) 빨강: conclusion=${rehearsalRun.conclusion} · 흐름 PR 은 리허설 초록 없이 머지 불가`);
    }
  }
}

// R0 APPROVE 조건
if (!isMerged) {
  const reviews = getPrReviews(prNum);
  const comments = getPrComments(prNum);

  let headCommitTime = null;
  if (fixtureData?.headCommitTime) {
    headCommitTime = new Date(fixtureData.headCommitTime);
  }

  const r0ApproveFound = reviews.some(r => r.state === 'APPROVED') ||
    comments.some(c => {
      const body = (c.body ?? '').toUpperCase();
      return body.includes('APPROVE') && (
        !headCommitTime || new Date(c.created_at) >= headCommitTime
      );
    });

  if (!r0ApproveFound) {
    pass = false;
    reasons.push('R0 APPROVE 코멘트가 이 head 이후에 없음 — R0 의 head 기준 승인 필요');
  }
}

// ---- 출력 ----
const verdict = pass ? 'PASS' : 'FAIL';
const firstLine = `MERGE-GATE ${verdict} ${repo}#${prNum} ${sha7}`;
const imacStats = getImacStats();

if (jsonOut) {
  console.log(JSON.stringify({
    verdict,
    repo,
    pr: prNum,
    sha: sha7,
    flowPr,
    reasons,
    imacStats,  // 판정에 사용 안 함 · 오케 참고용
  }, null, 2));
} else {
  console.log(firstLine);
  if (flowPr) console.log('  ℹ 흐름 PR — 리허설 관문 적용');
  if (reasons.length > 0) {
    for (const r of reasons) console.log(`  ✗ ${r}`);
  } else {
    console.log('  ✓ 모든 조건 충족');
  }
  if (imacStats) {
    console.log(`  ℹ iMac swap=${imacStats.swap_used_mb ?? '?'}MB load15=${imacStats.load_15 ?? '?'}`);
  }
}

process.exit(pass ? 0 : 1);
