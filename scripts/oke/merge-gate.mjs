#!/usr/bin/env node
// scripts/oke/merge-gate.mjs  M2-1127-G — PR 머지 게이트 검사기

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// ---- CLI 파싱 ----
const args = process.argv.slice(2);
let repo = null;
let prNum = null;
let jsonOut = false;
let fixtureFile = null; // 테스트 주입용

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo') repo = args[++i];
  else if (args[i] === '--pr') prNum = args[++i];
  else if (args[i] === '--json') jsonOut = true;
  else if (args[i] === '--fixture') fixtureFile = args[++i]; // 테스트용
}

if (!repo || !prNum) {
  console.error('사용법: node scripts/oke/merge-gate.mjs --repo <owner/name> --pr <N> [--json]');
  process.exit(1);
}

function gh(...ghArgs) {
  if (fixtureFile) return null; // fixture 모드에서는 사용 안 함
  const result = execFileSync('gh', ghArgs, { encoding: 'utf8' });
  return result.trim();
}

function ghJson(...ghArgs) {
  if (fixtureFile) return null;
  const result = execFileSync('gh', ghArgs, { encoding: 'utf8' });
  return JSON.parse(result);
}

// ---- 픽스처 주입 (테스트용) ----
let fixtureData = null;
if (fixtureFile) {
  fixtureData = JSON.parse(readFileSync(fixtureFile, 'utf8'));
}

function getPrData() {
  if (fixtureData) return fixtureData.pr;
  return ghJson('pr', 'view', prNum, '--repo', repo, '--json', 'headRefOid,number,title');
}

function getCheckRuns(sha) {
  if (fixtureData) return fixtureData.checkRuns;
  return ghJson('api', `repos/${repo}/commits/${sha}/check-runs`, '--paginate');
}

function getPrReviews(prN) {
  if (fixtureData) return fixtureData.reviews ?? [];
  return ghJson('api', `repos/${repo}/pulls/${prN}/reviews`);
}

function getPrComments(prN) {
  if (fixtureData) return fixtureData.comments ?? [];
  return ghJson('api', `repos/${repo}/issues/${prN}/comments`);
}

// ---- 검사 ----
const reasons = [];
let pass = true;

// PR head SHA
const prData = getPrData();
const sha = prData.headRefOid ?? prData.head?.sha ?? prData.sha;
const sha7 = sha ? sha.slice(0, 7) : 'unknown';

// check runs
const runsData = getCheckRuns(sha);
const runs = runsData?.check_runs ?? runsData ?? [];

// CI 완료 여부
const ALLOWED_SKIPPED = ['heavy-cloud'];
const incomplete = [];
const failed = [];

for (const run of runs) {
  const name = run.name ?? '';
  const status = run.status ?? '';   // queued | in_progress | completed
  const conclusion = run.conclusion ?? ''; // success | failure | skipped | null

  if (status !== 'completed') {
    incomplete.push(`${name}(${status})`);
  } else if (conclusion === 'failure') {
    failed.push(`${name}(failure)`);
  } else if (conclusion !== 'success' && conclusion !== 'skipped') {
    // neutral, cancelled 등
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

// 주 워크플로(ci.yml 또는 CI)가 이 head에서 실제 실행됐는지
const ciRun = runs.find(r => {
  const n = (r.name ?? '').toLowerCase();
  return n === 'ci' || n.includes('ci.yml') || n === 'ci / ci';
});
if (!ciRun) {
  pass = false;
  reasons.push('주 워크플로(ci.yml 또는 CI)가 이 head 에서 실행된 기록 없음 — CI 가 한 번도 실행되지 않은 상태');
} else if (ciRun.status !== 'completed') {
  pass = false;
  reasons.push(`주 워크플로(${ciRun.name}) 미완료: status=${ciRun.status}`);
}

// R0 APPROVE 코멘트가 head 커밋 이후에 있는지
// PR 리뷰 중 APPROVED
const reviews = getPrReviews(prNum);
const comments = getPrComments(prNum);

// PR 커밋 시각 얻기 (head commit)
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

// ---- 출력 ----
const verdict = pass ? 'PASS' : 'FAIL';
const firstLine = `MERGE-GATE ${verdict} ${repo}#${prNum} ${sha7}`;

if (jsonOut) {
  console.log(JSON.stringify({ verdict, repo, pr: prNum, sha: sha7, reasons }, null, 2));
} else {
  console.log(firstLine);
  if (reasons.length > 0) {
    for (const r of reasons) console.log(`  ✗ ${r}`);
  } else {
    console.log('  ✓ 모든 조건 충족');
  }
}

process.exit(pass ? 0 : 1);
