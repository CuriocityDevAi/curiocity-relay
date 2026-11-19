// scripts/lib/ci-history.mjs · M0-1119-I — CI 이력 jsonl 기록 + today 요약 + 비용 추정
//
// 사용:
//   import { appendJobs, readToday, summarizeToday } from './ci-history.mjs';
//
// jsonl 경로: status/ci/<YYYY-MM-DD WIB>.jsonl  (append-only · 중복 방지: job id 기준)
// runner_kind: mac-heavy | mac-light | cloud
// 비용: cloud_cost_est_usd = Σ ceil(run_min) × CLOUD_COST_PER_MIN_USD.
//       CLOUD_COST_PER_MIN_USD = $0.008/min (GitHub 공시 Linux 2-core 추정 · 무료분/
//       저장소 설정 미반영 · 상대 비교용 추정치).

import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

// ---- 상수 (단가는 한 곳에서만 관리) ----
export const CLOUD_COST_PER_MIN_USD = 0.008; // GitHub-hosted Linux 2-core 추정 단가
export const CLOUD_COST_NOTE = 'estimate (GitHub Linux 2-core default · 무료분/저장소 설정 미반영)';

// ---- WIB (Asia/Jakarta UTC+7) 날짜 헬퍼 ----

export function getWibDateStr(now = new Date()) {
  // epoch(UTC) + 7h → wib "wall clock" 을 UTC 로 풀기 (localTz 영향 없음)
  const wibMs = now.getTime() + 7 * 3600_000;
  const wib = new Date(wibMs);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// WIB 오늘 00:00:00 → UTC Date 반환
export function getWibDayBoundary(now = new Date()) {
  const wibMs = now.getTime() + 7 * 3600_000;
  const wib = new Date(wibMs);
  wib.setUTCHours(0, 0, 0, 0);
  return new Date(wib.getTime() - 7 * 3600_000);
}

export function getJsonlPath(repoRoot, dateStr = null) {
  const date = dateStr || getWibDateStr();
  const dir = join(repoRoot, 'status', 'ci');
  mkdirSync(dir, { recursive: true });
  return join(dir, `${date}.jsonl`);
}

// ---- runner_kind 분류 ----

function labelName(l) {
  return typeof l === 'string' ? l : (l && l.name) || '';
}

// 우선순위: labels (job API 의 labels 필드) · 보조: runner_name (실제 러너 이름)
export function classifyRunnerKind(labels, runnerName = null) {
  const names = Array.isArray(labels) ? labels.map(labelName) : [];

  // cloud: ubuntu / windows / macos (GitHub-hosted)
  if (names.some((n) =>
    n === 'ubuntu-latest' || n.startsWith('ubuntu-')
    || n === 'windows-latest' || n.startsWith('windows-')
    || n === 'macos-latest' || n.startsWith('macos-'))) return 'cloud';

  // mac-light: curiocity-mac-light
  if (names.includes('curiocity-mac-light')) return 'mac-light';

  // mac-heavy: curiocity-mac · curiocity-mac-heavy · self-hosted + curiocity-mac-*
  if (names.some((n) => n === 'curiocity-mac' || n === 'curiocity-mac-heavy')) return 'mac-heavy';
  if (names.includes('self-hosted') && names.some((n) => n.startsWith('curiocity-mac'))) return 'mac-heavy';

  // runner_name 보조 판정 (labels 비어있거나 모호한 경우)
  if (runnerName) {
    const rn = String(runnerName).toLowerCase();
    if (rn.includes('mac-light')) return 'mac-light';
    if (rn.includes('mac-heavy') || rn.includes('curiocity-mac')
        || rn.includes('macbook') || /[- ]m[1-9]\b/.test(rn)) return 'mac-heavy';
  }

  return 'cloud';
}

// ---- jsonl 읽기 ----

export function readJsonlFile(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim());
  const records = [];
  for (const line of lines) {
    try { records.push(JSON.parse(line)); } catch { /* 손상 라인 skip */ }
  }
  return records;
}

// ---- jsonl append (중복 방지 + WIB per-job date) ----

function appendForDate(repoRoot, jobs, dateStr) {
  if (!jobs.length) return 0;
  const path = getJsonlPath(repoRoot, dateStr);
  const existing = readJsonlFile(path);
  const existingIds = new Set(existing.map((r) => String(r.id)));
  let added = 0;
  for (const job of jobs) {
    const id = String(job.id);
    if (existingIds.has(id)) continue;
    existingIds.add(id);
    appendFileSync(path, JSON.stringify(job) + '\n', 'utf8');
    added++;
  }
  return added;
}

export function appendJobs(repoRoot, jobs, dateStr = null) {
  if (!jobs || jobs.length === 0) return 0;
  if (dateStr) return appendForDate(repoRoot, jobs, dateStr);
  // dateStr 없으면 job.completed_at WIB 로 그룹화
  const byDate = new Map();
  for (const job of jobs) {
    const d = job.completed_at
      ? getWibDateStr(new Date(job.completed_at))
      : getWibDateStr();
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(job);
  }
  let added = 0;
  for (const [d, list] of byDate) {
    added += appendForDate(repoRoot, list, d);
  }
  return added;
}

// ---- 비용/낭비 ----

export function calcCloudCost(jobs) {
  let total = 0;
  for (const j of jobs) {
    if (j.runner_kind !== 'cloud') continue;
    const run_min = j.run_min || 0;
    total += Math.ceil(run_min) * CLOUD_COST_PER_MIN_USD;
  }
  return Math.round(total * 10_000) / 10_000;
}

export function calcWastedMin(jobs) {
  return jobs
    .filter((j) => j.conclusion === 'cancelled')
    .reduce((s, j) => s + (j.run_min || 0), 0);
}

// ---- today 요약 ----

function groupByKind(jobs) {
  const groups = { 'mac-heavy': [], 'mac-light': [], cloud: [] };
  for (const j of jobs) {
    const k = j.runner_kind || 'cloud';
    if (groups[k]) groups[k].push(j);
    else groups.cloud.push(j);
  }
  return groups;
}

function avg(arr, key) {
  if (arr.length === 0) return 0;
  const sum = arr.reduce((s, j) => s + (j[key] || 0), 0);
  return Math.round((sum / arr.length) * 10) / 10;
}

function successRate(jobs) {
  if (jobs.length === 0) return null;
  const success = jobs.filter(
    (j) => j.conclusion === 'success' || j.conclusion === 'completed',
  ).length;
  return Math.round((success / jobs.length) * 1000) / 10;
}

export function summarizeToday(repoRoot, dateStr = null) {
  const path = getJsonlPath(repoRoot, dateStr);
  const jobs = readJsonlFile(path);
  const groups = groupByKind(jobs);

  const result = {};
  for (const [kind, list] of Object.entries(groups)) {
    result[kind] = {
      jobs: list.length,
      avg_wait_min: avg(list, 'wait_min'),
      avg_run_min: avg(list, 'run_min'),
      success_rate: successRate(list),
      run_min_total: list.reduce((s, j) => s + (j.run_min || 0), 0),
    };
  }
  result.cloud_cost_est_usd = calcCloudCost(jobs);
  result.cloud_cost_note = CLOUD_COST_NOTE;
  result.wasted_min = calcWastedMin(jobs);
  return result;
}

// ---- GitHub API job → 저장 레코드 ----
// wait_min = job.created_at → job.started_at.  이게 "GitHub API 가 러너에 할당하기까지" 걸린 시간.
// run_min  = job.started_at → job.completed_at.  실제 실행 시간.

export function jobToRecord(job, run = {}) {
  const runner_kind = classifyRunnerKind(job.labels || [], job.runner_name || null);
  const created_at = job.created_at || run.created_at || null;
  const started_at = job.started_at || null;
  const completed_at = job.completed_at || null;

  let wait_min = null;
  let run_min = null;
  if (created_at && started_at) {
    wait_min = Math.round((new Date(started_at) - new Date(created_at)) / 60_000);
  }
  if (started_at && completed_at) {
    run_min = Math.round((new Date(completed_at) - new Date(started_at)) / 60_000 * 10) / 10;
  }

  return {
    id: job.id,
    repo: run.repository?.full_name || run.head_repository?.full_name || null,
    pr: (run.pull_requests && run.pull_requests[0]?.number) || null,
    workflow: run.name || run.workflow_id || null,
    job: job.name,
    runner_kind,
    runner_name: job.runner_name || null,
    labels: Array.isArray(job.labels) ? job.labels : [],
    created_at,
    started_at,
    completed_at,
    wait_min,
    run_min,
    conclusion: job.conclusion || run.conclusion || null,
  };
}
