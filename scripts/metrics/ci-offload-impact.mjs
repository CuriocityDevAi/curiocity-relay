#!/usr/bin/env node
// scripts/metrics/ci-offload-impact.mjs · M1-1126-N
// CI 아이맥 오프로드 전/후 임팩트 비교 표
//
// 사용:
//   node scripts/metrics/ci-offload-impact.mjs --cutover 2026-11-26T08:01:00Z
//   node scripts/metrics/ci-offload-impact.mjs --cutover 2026-11-26T08:01:00Z \
//     --before-from 2026-11-25T00:00:00Z --after-to 2026-11-27T00:00:00Z
//
// 출력: stdout 에 markdown 표

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

// ---- CLI 파싱 ----

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cutover') args.cutover = argv[++i];
    else if (argv[i] === '--before-from') args.beforeFrom = argv[++i];
    else if (argv[i] === '--after-to') args.afterTo = argv[++i];
    else if (argv[i] === '--relay-root') args.relayRoot = argv[++i];
  }
  if (!args.cutover) throw new Error('--cutover <ISO timestamp> 필수');
  return args;
}

// ---- 마커/요약 잡 필터 (ci-watch W2 와 동일 규칙) ----

const MARKER_JOBS = new Set(['route', 'heavy-cloud', 'ci-summary', 'feature-map-route', 'changes-filter', 'markers-and-forbidden']);

export function isMarkerJob(jobName) {
  if (!jobName) return false;
  const n = String(jobName).toLowerCase();
  return MARKER_JOBS.has(n) || n.startsWith('ci-summary');
}

export function isCountableJob(record) {
  if (!record) return false;
  if (isMarkerJob(record.job)) return false;
  const c = record.conclusion;
  if (c === 'skipped' || c === 'cancelled') return false;
  return true;
}

// ---- JSONL 로더 ----

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function readNdjson(path) {
  return readJsonl(path);
}

// ---- CI JSONL 수집 (날짜 범위 커버) ----

function collectCiJobs(relayRoot, fromMs, toMs) {
  const ciDir = join(relayRoot, 'status', 'ci');
  if (!existsSync(ciDir)) return [];
  const files = readdirSync(ciDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
    .sort();

  const jobs = [];
  for (const f of files) {
    const dateMs = new Date(f.replace('.jsonl', '') + 'T00:00:00Z').getTime();
    // ±1일 여유를 두고 파일을 열기
    if (dateMs < fromMs - 86_400_000 || dateMs > toMs + 86_400_000) continue;
    const recs = readJsonl(join(ciDir, f));
    for (const r of recs) {
      const ts = r.created_at || r.started_at;
      if (!ts) continue;
      const ms = new Date(ts).getTime();
      if (ms >= fromMs && ms < toMs) jobs.push(r);
    }
  }
  return jobs;
}

// ---- mem-log 수집 ----

function collectMemLog(relayRoot, fromMs, toMs) {
  const path = join(relayRoot, 'status', 'runners', 'mem-log.ndjson');
  const recs = readNdjson(path);
  return recs.filter((r) => {
    const ms = new Date(r.at).getTime();
    return ms >= fromMs && ms < toMs;
  });
}

// ---- pipeline/claims 수집 ----

function collectPipeline(relayRoot, fromMs, toMs) {
  const pipelineDir = join(relayRoot, 'status', 'pipeline');
  const claimsDir = join(relayRoot, 'status', 'claims');
  if (!existsSync(pipelineDir)) return [];

  const files = readdirSync(pipelineDir).filter((f) => f.endsWith('.jsonl'));
  const byId = new Map();

  for (const f of files) {
    const events = readJsonl(join(pipelineDir, f));
    if (!events.length) continue;
    const id = events[0].id || f.replace('.jsonl', '');
    let queued = null, started = null, done = null;
    for (const e of events) {
      if (e.event === 'queued') queued = e.ts;
      else if (e.event === 'started') started = e.ts;
      else if (e.event === 'done' || e.event === 'report') done = e.ts;
    }
    if (!started) continue;
    const startedMs = new Date(started).getTime();
    if (startedMs < fromMs || startedMs >= toMs) continue;

    // hub 정보를 claim 에서 보완
    let hub = events[0]?.hub || '?';
    if (existsSync(join(claimsDir, `${id}.json`))) {
      try {
        const claim = JSON.parse(readFileSync(join(claimsDir, `${id}.json`), 'utf8'));
        hub = claim.hub || hub;
      } catch { /* noop */ }
    }

    byId.set(id, {
      id,
      hub,
      queued,
      started,
      done,
      startedMs,
      doneMs: done ? new Date(done).getTime() : null,
      queuedMs: queued ? new Date(queued).getTime() : null,
    });
  }
  return [...byId.values()];
}

// ---- 통계 헬퍼 ----

export function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function p90(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.9) - 1;
  return sorted[Math.max(0, idx)];
}

function fmt(val, unit = '') {
  if (val === null || val === undefined) return 'N/A';
  return Number(val).toFixed(2) + unit;
}

function fmtMin(valMin) {
  if (valMin === null || valMin === undefined) return 'N/A';
  return Number(valMin).toFixed(1) + 'min';
}

// ---- 표 렌더링 ----

function tableRow(label, before, after) {
  return `| ${label.padEnd(30)} | ${String(before).padEnd(18)} | ${String(after).padEnd(18)} |`;
}

function tableHeader() {
  return [
    `| ${'항목'.padEnd(30)} | ${'전(맥북 CI 포함)'.padEnd(18)} | ${'후(iMac 전용)'.padEnd(18)} |`,
    `|${'-'.repeat(32)}|${'-'.repeat(20)}|${'-'.repeat(20)}|`,
  ].join('\n');
}

// ---- 메인 비교 로직 ----

export function computeImpact(opts) {
  const {
    relayRoot = REPO_ROOT,
    cutoverMs,
    beforeFromMs,
    afterToMs,
  } = opts;

  const afterDurationMs = afterToMs - cutoverMs;
  const beforeFromMsActual = beforeFromMs ?? cutoverMs - afterDurationMs;

  const LOW_SAMPLE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2시간

  const warnings = [];
  if (afterDurationMs < LOW_SAMPLE_THRESHOLD_MS) {
    warnings.push('> ⚠️  **표본 부족 — 판단 보류** (후 구간 ' + (afterDurationMs / 60_000).toFixed(0) + '분 < 2시간 · 수치는 참고용)');
  }

  // ---- 맥북 메모리 비교 ----
  const memBefore = collectMemLog(relayRoot, beforeFromMsActual, cutoverMs);
  const memAfter = collectMemLog(relayRoot, cutoverMs, afterToMs);

  const memUsedBefore = memBefore.map((r) => r.used_gb).filter((v) => v != null);
  const memSwapBefore = memBefore.map((r) => r.swap_used_gb).filter((v) => v != null);
  const memCompBefore = memBefore.map((r) => r.compressed_gb).filter((v) => v != null);

  const memUsedAfter = memAfter.map((r) => r.used_gb).filter((v) => v != null);
  const memSwapAfter = memAfter.map((r) => r.swap_used_gb).filter((v) => v != null);
  const memCompAfter = memAfter.map((r) => r.compressed_gb).filter((v) => v != null);

  // ---- CI 비교 ----
  const ciJobsBefore = collectCiJobs(relayRoot, beforeFromMsActual, cutoverMs);
  const ciJobsAfter = collectCiJobs(relayRoot, cutoverMs, afterToMs);

  const countableBefore = ciJobsBefore.filter(isCountableJob);
  const countableAfter = ciJobsAfter.filter(isCountableJob);

  const waitBefore = countableBefore.map((r) => r.wait_min).filter((v) => v != null);
  const waitAfter = countableAfter.map((r) => r.wait_min).filter((v) => v != null);
  const runBefore = countableBefore.map((r) => r.run_min).filter((v) => v != null);
  const runAfter = countableAfter.map((r) => r.run_min).filter((v) => v != null);

  // 기계별 처리 수
  const machineBefore = { mbp: 0, imac: 0, cloud: 0 };
  const machineAfter = { mbp: 0, imac: 0, cloud: 0 };
  for (const r of countableBefore) {
    const name = r.runner_name || '';
    if (/imac/i.test(name)) machineBefore.imac++;
    else if (/mac/i.test(name) || /curiocity-mac|Youngkyus/i.test(name)) machineBefore.mbp++;
    else machineBefore.cloud++;
  }
  for (const r of countableAfter) {
    const name = r.runner_name || '';
    if (/imac/i.test(name)) machineAfter.imac++;
    else if (/mac/i.test(name) || /curiocity-mac|Youngkyus/i.test(name)) machineAfter.mbp++;
    else machineAfter.cloud++;
  }

  const cloudBefore = ciJobsBefore.filter((r) => r.runner_kind === 'cloud' && !isMarkerJob(r.job) && r.conclusion !== 'skipped' && r.conclusion !== 'cancelled').length;
  const cloudAfter = ciJobsAfter.filter((r) => r.runner_kind === 'cloud' && !isMarkerJob(r.job) && r.conclusion !== 'skipped' && r.conclusion !== 'cancelled').length;

  // ---- 프롬프트 비교 ----
  const promptBefore = collectPipeline(relayRoot, beforeFromMsActual, cutoverMs);
  const promptAfter = collectPipeline(relayRoot, cutoverMs, afterToMs);

  const doneBefore = promptBefore.filter((p) => p.doneMs != null);
  const doneAfter = promptAfter.filter((p) => p.doneMs != null);

  const durationsBefore = doneBefore
    .map((p) => (p.doneMs - p.startedMs) / 60_000).filter((v) => v > 0);
  const durationsAfter = doneAfter
    .map((p) => (p.doneMs - p.startedMs) / 60_000).filter((v) => v > 0);

  const beforeHours = (cutoverMs - beforeFromMsActual) / 3_600_000;
  const afterHours = afterDurationMs / 3_600_000;
  const ptBefore = beforeHours > 0 ? doneBefore.length / beforeHours : null;
  const ptAfter = afterHours > 0 ? doneAfter.length / afterHours : null;

  return {
    warnings,
    window: {
      beforeFrom: new Date(beforeFromMsActual).toISOString(),
      cutover: new Date(cutoverMs).toISOString(),
      afterTo: new Date(afterToMs).toISOString(),
      beforeHours: +beforeHours.toFixed(2),
      afterHours: +afterHours.toFixed(2),
    },
    mem: {
      used: {
        avgBefore: avg(memUsedBefore), maxBefore: memUsedBefore.length ? Math.max(...memUsedBefore) : null,
        avgAfter: avg(memUsedAfter), maxAfter: memUsedAfter.length ? Math.max(...memUsedAfter) : null,
        nBefore: memUsedBefore.length, nAfter: memUsedAfter.length,
      },
      swap: {
        avgBefore: avg(memSwapBefore), maxBefore: memSwapBefore.length ? Math.max(...memSwapBefore) : null,
        avgAfter: avg(memSwapAfter), maxAfter: memSwapAfter.length ? Math.max(...memSwapAfter) : null,
        nBefore: memSwapBefore.length, nAfter: memSwapAfter.length,
      },
      compressed: {
        avgBefore: avg(memCompBefore), maxBefore: memCompBefore.length ? Math.max(...memCompBefore) : null,
        avgAfter: avg(memCompAfter), maxAfter: memCompAfter.length ? Math.max(...memCompAfter) : null,
        nBefore: memCompBefore.length, nAfter: memCompAfter.length,
      },
    },
    ci: {
      waitAvgBefore: avg(waitBefore), waitP90Before: p90(waitBefore),
      waitAvgAfter: avg(waitAfter), waitP90After: p90(waitAfter),
      runAvgBefore: avg(runBefore), runAvgAfter: avg(runAfter),
      machineBefore, machineAfter,
      cloudOverflowBefore: cloudBefore,
      cloudOverflowAfter: cloudAfter,
      nBefore: countableBefore.length, nAfter: countableAfter.length,
    },
    prompt: {
      durationAvgBefore: avg(durationsBefore), durationMedBefore: median(durationsBefore),
      durationAvgAfter: avg(durationsAfter), durationMedAfter: median(durationsAfter),
      ptBefore, ptAfter,
      nBefore: doneBefore.length, nAfter: doneAfter.length,
    },
  };
}

export function renderMarkdown(r) {
  const { warnings, window: w, mem, ci, prompt } = r;

  const lines = [];

  lines.push(`## CI 아이맥 오프로드 임팩트 비교`);
  lines.push('');
  lines.push(`- 전 구간: ${w.beforeFrom} → ${w.cutover} (${w.beforeHours}h)`);
  lines.push(`- 후 구간: ${w.cutover} → ${w.afterTo} (${w.afterHours}h)`);
  lines.push('');

  if (warnings.length) {
    for (const warn of warnings) lines.push(warn);
    lines.push('');
  }

  // 맥북 메모리 섹션
  lines.push('### 맥북 자원 (mem-log)');
  lines.push('');
  lines.push(tableHeader());

  function memRow(label, field) {
    const f = mem[field];
    const before = f.nBefore === 0 ? 'N/A' : `avg ${fmt(f.avgBefore,'GB')} / max ${fmt(f.maxBefore,'GB')} (n=${f.nBefore})`;
    const after = f.nAfter === 0 ? 'N/A' : `avg ${fmt(f.avgAfter,'GB')} / max ${fmt(f.maxAfter,'GB')} (n=${f.nAfter})`;
    return tableRow(label, before, after);
  }

  lines.push(memRow('used_gb', 'used'));
  lines.push(memRow('swap_used_gb', 'swap'));
  lines.push(memRow('compressed_gb', 'compressed'));
  lines.push('');

  // CI 섹션
  lines.push('### CI (status/ci/*.jsonl)');
  lines.push(`> marker·skipped·cancelled 제외 (W2 규칙) · 전 ${ci.nBefore}잡 / 후 ${ci.nAfter}잡`);
  lines.push('');
  lines.push(tableHeader());
  lines.push(tableRow('대기시간 평균 (queued→started)', fmtMin(ci.waitAvgBefore), fmtMin(ci.waitAvgAfter)));
  lines.push(tableRow('대기시간 p90', fmtMin(ci.waitP90Before), fmtMin(ci.waitP90After)));
  lines.push(tableRow('잡 실행시간 평균', fmtMin(ci.runAvgBefore), fmtMin(ci.runAvgAfter)));
  lines.push(tableRow('MBP 처리 수', String(ci.machineBefore.mbp), String(ci.machineAfter.mbp)));
  lines.push(tableRow('iMac 처리 수', String(ci.machineBefore.imac), String(ci.machineAfter.imac)));
  lines.push(tableRow('cloud overflow 수', String(ci.cloudOverflowBefore), String(ci.cloudOverflowAfter)));
  lines.push('');

  // 프롬프트 섹션
  lines.push('### 프롬프트 처리량 (status/claims + pipeline)');
  lines.push(`> 전 ${prompt.nBefore}건 완료 / 후 ${prompt.nAfter}건 완료`);
  lines.push('');
  lines.push(tableHeader());
  lines.push(tableRow('started→done 평균', fmtMin(prompt.durationAvgBefore), fmtMin(prompt.durationAvgAfter)));
  lines.push(tableRow('started→done 중앙값', fmtMin(prompt.durationMedBefore), fmtMin(prompt.durationMedAfter)));
  lines.push(tableRow('시간당 완료 프롬프트 (PT/h)', fmt(prompt.ptBefore), fmt(prompt.ptAfter)));
  lines.push('');

  return lines.join('\n');
}

// ---- standalone 실행 ----

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const relayRoot = args.relayRoot || REPO_ROOT;
  const cutoverMs = new Date(args.cutover).getTime();
  if (isNaN(cutoverMs)) { console.error('--cutover 날짜 파싱 실패'); process.exit(1); }
  const afterToMs = args.afterTo ? new Date(args.afterTo).getTime() : Date.now();
  const beforeFromMs = args.beforeFrom ? new Date(args.beforeFrom).getTime() : undefined;

  const result = computeImpact({ relayRoot, cutoverMs, beforeFromMs, afterToMs });
  console.log(renderMarkdown(result));
}
