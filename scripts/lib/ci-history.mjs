// scripts/lib/ci-history.mjs · M0-1119-H — CI 이력 jsonl 기록 + today 요약 + 비용 계산
//
// 사용:
//   import { appendJobs, readToday, summarizeToday } from './ci-history.mjs';
//
// jsonl 경로: status/ci/<YYYY-MM-DD WIB>.jsonl  (append-only · 중복 방지: job id 기준)
// runner_kind: mac-heavy | mac-light | cloud
// 비용: ubuntu $0.008/min · ceil per job

import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

// ---- 경로 헬퍼 ----

export function getWibDateStr(now = new Date()) {
  const wibOffset = 7 * 60; // minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const wibMs = utcMs + wibOffset * 60_000;
  const wibDate = new Date(wibMs);
  const y = wibDate.getFullYear();
  const m = String(wibDate.getMonth() + 1).padStart(2, '0');
  const d = String(wibDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

export function classifyRunnerKind(labels, runnerName = null) {
  // runner_name 기반 분류 (GitHub job 의 runner_name 필드 — 실제 실행 러너 이름)
  if (runnerName) {
    const rn = runnerName.toLowerCase();
    if (rn.includes('mac-light') || rn === 'curiocity-mac-light') return 'mac-light';
    if (rn.includes('mac-heavy') || rn.includes('mac-m1') || rn.includes('macbook')
        || rn.includes('curiocity-mac')) return 'mac-heavy';
    // Youngkyus-MacBook-Pro-M1 → mac-heavy (실제 mac 호스트)
    if (rn.includes('macbook') || rn.includes('-m1') || rn.includes('-m2') || rn.includes('-m3')) return 'mac-heavy';
  }

  if (!Array.isArray(labels)) return 'cloud';
  const names = labels.map(labelName);
  // mac-light: curiocity-mac-light label (check before mac-heavy since it's a subset match)
  if (names.includes('curiocity-mac-light')) return 'mac-light';
  // mac-heavy: curiocity-mac or curiocity-mac-heavy (or self-hosted + any curiocity-mac-*)
  if (names.some((n) => n === 'curiocity-mac' || n === 'curiocity-mac-heavy')) return 'mac-heavy';
  if (names.includes('self-hosted') && names.some((n) => n.startsWith('curiocity-mac'))) return 'mac-heavy';
  return 'cloud';
}

// ---- jsonl 읽기 ----

export function readJsonlFile(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim());
  const records = [];
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {
      // 손상 라인 무시
    }
  }
  return records;
}

// ---- jsonl append (중복 방지: job id 기준) ----

export function appendJobs(repoRoot, jobs, dateStr = null) {
  if (!jobs || jobs.length === 0) return 0;
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

// ---- today 요약 계산 ----

// GitHub Actions 클라우드 비용 계산 (ubuntu-latest $0.008/min · ceil per job)
export function calcCloudCost(jobs) {
  let total = 0;
  for (const j of jobs) {
    if (j.runner_kind !== 'cloud') continue;
    const run_min = j.run_min || 0;
    const ceiled = Math.ceil(run_min);
    total += ceiled * 0.008;
  }
  // 소수점 4자리 반올림
  return Math.round(total * 10_000) / 10_000;
}

export function calcWastedMin(jobs) {
  return jobs
    .filter((j) => j.conclusion === 'cancelled')
    .reduce((s, j) => s + (j.run_min || 0), 0);
}

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
  return Math.round((success / jobs.length) * 1000) / 10; // percent, 1 decimal
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
  result.cloud_cost_usd = calcCloudCost(jobs);
  result.wasted_min = calcWastedMin(jobs);
  return result;
}

// ---- GitHub API completed jobs → history record 변환 ----
// jobs: GitHub API job 배열 (steps 포함)
// run: 해당 workflow_run

export function jobToRecord(job, run) {
  const labels = run.runner_labels || run.labels || [];
  const runner_kind = classifyRunnerKind(labels);
  const queued_at = run.created_at || null;
  const started_at = job.started_at || run.run_started_at || null;
  const completed_at = job.completed_at || null;

  let wait_min = null;
  let run_min = null;
  if (queued_at && started_at) {
    wait_min = Math.round((new Date(started_at) - new Date(queued_at)) / 60_000);
  }
  if (started_at && completed_at) {
    run_min = Math.round((new Date(completed_at) - new Date(started_at)) / 60_000 * 10) / 10;
  }

  return {
    id: job.id,
    repo: run.repository?.full_name || run.head_repository?.full_name || 'unknown',
    pr: (run.pull_requests && run.pull_requests[0]?.number) || null,
    workflow: run.name || run.workflow_id || null,
    job: job.name,
    runner_kind,
    runner_name: job.runner_name || null,
    queued_at,
    started_at,
    completed_at,
    wait_min,
    run_min,
    conclusion: job.conclusion || run.conclusion || null,
  };
}
