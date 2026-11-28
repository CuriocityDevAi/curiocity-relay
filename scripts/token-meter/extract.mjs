#!/usr/bin/env node
/**
 * token-meter/extract.mjs
 * hub prompt 별 토큰·비용을 status/tokens/<date>.jsonl 에 기록한다.
 *
 * Usage:
 *   node extract.mjs [--date YYYY-MM-DD] [--since YYYY-MM-DD] [--until YYYY-MM-DD]
 *   node extract.mjs --date 2026-11-27
 *   node extract.mjs --since 2026-11-25 --until 2026-11-28
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELAY_ROOT = path.resolve(__dirname, '..', '..');
const CLAIMS_DIR = path.join(RELAY_ROOT, 'status', 'claims');
const TOKENS_DIR = path.join(RELAY_ROOT, 'status', 'tokens');
const RUNNER_LOG_ROOT = path.join(process.env.HOME, '.hub-runner');
const CLAUDE_PROJECTS = path.join(process.env.HOME, '.claude', 'projects');

// Pricing per million tokens (Anthropic public rates)
const PRICING = {
  'claude-opus-4-7': { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 1.875, cacheRead: 1.5 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 0.375, cacheRead: 0.3 },
  'claude-sonnet-4-5': { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 0.375, cacheRead: 0.3 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4, cacheWrite5m: 1.0, cacheWrite1h: 0.1, cacheRead: 0.08 },
  'claude-haiku-4-5': { input: 0.8, output: 4, cacheWrite5m: 1.0, cacheWrite1h: 0.1, cacheRead: 0.08 },
};

function getPrice(modelName) {
  for (const [k, v] of Object.entries(PRICING)) {
    if (modelName.includes(k) || k.includes(modelName)) return v;
  }
  // fallback: sonnet pricing
  return PRICING['claude-sonnet-4-6'];
}

function computeCost(modelUsage) {
  let total = 0;
  for (const [model, u] of Object.entries(modelUsage)) {
    const p = getPrice(model);
    const M = 1_000_000;
    const cache = u.cacheCreation || {};
    total += (u.inputTokens || 0) / M * p.input;
    total += (u.outputTokens || 0) / M * p.output;
    total += ((cache.ephemeral_5m_input_tokens || 0) / M) * p.cacheWrite5m;
    total += ((cache.ephemeral_1h_input_tokens || u.cacheCreationInputTokens || 0) / M) * p.cacheWrite1h;
    total += (u.cacheReadInputTokens || 0) / M * p.cacheRead;
  }
  return total;
}

function encodeCwd(cwd) {
  // /Users/kyu.lee/projects/pos-m1 → -Users-kyu-lee-projects-pos-m1
  // macOS replaces all non-alphanumeric chars (/, .) with hyphens
  return cwd.replace(/[^a-zA-Z0-9]/g, '-');
}

function parseRunnerLogHeader(logPath) {
  if (!fs.existsSync(logPath)) return null;
  const lines = fs.readFileSync(logPath, 'utf8').split('\n').slice(0, 20);
  const result = {};
  for (const line of lines) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) result[m[1]] = m[2].trim();
    if (line.startsWith('--- stream ---')) break;
  }
  return result;
}

function extractLogPath(note) {
  const m = note && note.match(/로그:\s*([^\s·]+\.log)/);
  return m ? m[1] : null;
}

function classifyPromptType(promptPath, hub) {
  if (hub === 'r0') return '리뷰';
  if (!promptPath || !fs.existsSync(promptPath)) return '코딩';
  const firstLine = fs.readFileSync(promptPath, 'utf8').split('\n')[0] || '';
  if (/진단|diagnos|debug|원인/.test(firstLine)) return '진단';
  if (/재작업|CHANGES|R0.CHANGES|수정 요청/.test(firstLine)) return '재작업';
  if (/리뷰|review/.test(firstLine)) return '리뷰';
  return '코딩';
}

function readCcusageSessions(since, until) {
  try {
    const untilArg = until ? `--until ${until}` : '';
    const raw = execSync(
      `npx --yes ccusage session --json --since ${since} ${untilArg} 2>/dev/null`,
      { timeout: 30000, encoding: 'utf8' }
    );
    const parsed = JSON.parse(raw);
    const sessions = parsed.session || [];
    const byUuid = {};
    for (const s of sessions) {
      byUuid[s.period] = s;
    }
    return byUuid;
  } catch {
    return {};
  }
}

function findMatchingSessionFile(encodedCwd, startedAtMs, doneAtMs) {
  const projectDir = path.join(CLAUDE_PROJECTS, encodedCwd);
  if (!fs.existsSync(projectDir)) return null;

  const SLACK_MS = 3 * 60 * 1000; // 3 minutes slack
  const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));

  for (const fname of files) {
    const fpath = path.join(projectDir, fname);
    const st = fs.statSync(fpath);
    // Quick mtime pre-filter: skip files modified long before started or long after done
    if (st.mtimeMs < startedAtMs - 10 * 60 * 1000) continue;
    if (st.mtimeMs > doneAtMs + 20 * 60 * 1000) continue;

    // Check first timestamp in file
    let firstTs = null;
    try {
      const content = fs.readFileSync(fpath, 'utf8');
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        const d = JSON.parse(line);
        const ts = d.timestamp;
        if (ts) {
          firstTs = new Date(ts).getTime();
          break;
        }
      }
    } catch { continue; }

    if (firstTs !== null) {
      if (firstTs >= startedAtMs - SLACK_MS && firstTs <= doneAtMs + SLACK_MS) {
        return { uuid: path.basename(fname, '.jsonl'), fpath };
      }
    }
  }
  return null;
}

function aggregateUsageFromSession(fpath) {
  const totals = {};
  try {
    const content = fs.readFileSync(fpath, 'utf8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      let d;
      try { d = JSON.parse(line); } catch { continue; }
      if (d.type !== 'assistant') continue;
      const msg = d.message || {};
      const model = msg.model;
      if (!model) continue;
      const usage = msg.usage || {};
      if (!totals[model]) totals[model] = {
        inputTokens: 0, outputTokens: 0,
        cacheReadInputTokens: 0, cacheCreationInputTokens: 0,
        cacheCreation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 }
      };
      const t = totals[model];
      t.inputTokens += usage.input_tokens || 0;
      t.outputTokens += usage.output_tokens || 0;
      t.cacheReadInputTokens += usage.cache_read_input_tokens || 0;
      t.cacheCreationInputTokens += usage.cache_creation_input_tokens || 0;
      const cc = usage.cache_creation || {};
      t.cacheCreation.ephemeral_5m_input_tokens += cc.ephemeral_5m_input_tokens || 0;
      t.cacheCreation.ephemeral_1h_input_tokens += cc.ephemeral_1h_input_tokens || 0;
    }
  } catch { /* silent */ }
  return totals;
}

function parseDateArg(s) {
  const m = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  return m ? m[1] : null;
}

function idToDate(id) {
  // M1-1127-H → "1127" → need year prefix, assume 2026
  const m = id.match(/\d+-(\d{4})-[A-Z]+/);
  if (!m) return null;
  const mmdd = m[1];
  return `2026-${mmdd.slice(0, 2)}-${mmdd.slice(2, 4)}`;
}

async function processDate(dateStr, ccusageSessions) {
  const mmdd = dateStr.replace(/-/g, '').slice(4); // "1127"
  const pattern = new RegExp(`[A-Z][0-9]+-${mmdd}-`);

  const claimFiles = fs.readdirSync(CLAIMS_DIR).filter(f => pattern.test(f) && f.endsWith('.json'));
  if (claimFiles.length === 0) {
    console.log(`[${dateStr}] no claims found`);
    return [];
  }

  const records = [];

  for (const fname of claimFiles) {
    const claim = JSON.parse(fs.readFileSync(path.join(CLAIMS_DIR, fname), 'utf8'));
    const id = claim.id;
    const hub = claim.hub;

    // Skip non-done states and OKE-only claims
    if (!['done', 'blocked', 'cancelled'].includes(claim.state)) continue;
    // Skip claims without log reference (cloud/oke sessions = unmeasurable)
    const logPath = extractLogPath(claim.note || '');
    if (!logPath) {
      records.push({
        id, hub, model: null, started: null, done: claim.at,
        input: null, output: null, cache_read: null, cache_write: null,
        cost_usd_est: null, note: 'oke-cloud: 측정 불가'
      });
      continue;
    }

    const header = parseRunnerLogHeader(logPath);
    if (!header || !header.started_at) {
      records.push({ id, hub, model: null, started: null, done: claim.at,
        input: null, output: null, cache_read: null, cache_write: null,
        cost_usd_est: null, note: 'log-not-found' });
      continue;
    }

    const startedAtMs = new Date(header.started_at).getTime();
    const doneAtMs = new Date(claim.at).getTime();
    const cwd = header.cwd;
    const model = header.model || 'sonnet';
    const promptPath = header.prompt || null;
    const promptType = classifyPromptType(promptPath, hub);
    const encodedCwd = encodeCwd(cwd);

    const sessionMatch = findMatchingSessionFile(encodedCwd, startedAtMs, doneAtMs);

    if (!sessionMatch) {
      records.push({
        id, hub, model, started: header.started_at, done: claim.at,
        input: null, output: null, cache_read: null, cache_write: null,
        cost_usd_est: null, prompt_type: promptType, note: 'session-not-found'
      });
      continue;
    }

    const { uuid, fpath } = sessionMatch;

    // Prefer ccusage cost (accurate), fallback to our estimate
    let costUsd = null;
    let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0;

    const ccSession = ccusageSessions[uuid];
    if (ccSession) {
      costUsd = ccSession.totalCost;
      totalInput = ccSession.inputTokens;
      totalOutput = ccSession.outputTokens;
      totalCacheRead = ccSession.cacheReadTokens;
      totalCacheWrite = ccSession.cacheCreationTokens;
    } else {
      // Fallback: aggregate from JSONL and estimate cost
      const modelUsage = aggregateUsageFromSession(fpath);
      for (const u of Object.values(modelUsage)) {
        totalInput += u.inputTokens;
        totalOutput += u.outputTokens;
        totalCacheRead += u.cacheReadInputTokens;
        totalCacheWrite += u.cacheCreationInputTokens;
      }
      costUsd = computeCost(modelUsage);
    }

    records.push({
      id, hub,
      model: ccSession?.modelsUsed?.join('+') || model,
      started: header.started_at,
      done: claim.at,
      input: totalInput || null,
      output: totalOutput || null,
      cache_read: totalCacheRead || null,
      cache_write: totalCacheWrite || null,
      cost_usd_est: costUsd !== null ? Math.round(costUsd * 1e6) / 1e6 : null,
      prompt_type: promptType,
    });
  }

  return records;
}

function writeDateJsonl(dateStr, records) {
  if (!fs.existsSync(TOKENS_DIR)) fs.mkdirSync(TOKENS_DIR, { recursive: true });
  const outPath = path.join(TOKENS_DIR, `${dateStr}.jsonl`);
  const lines = records.map(r => JSON.stringify(r)).join('\n');
  fs.writeFileSync(outPath, lines + '\n');
  console.log(`[${dateStr}] wrote ${records.length} records → ${outPath}`);
  return outPath;
}

// --- main ---
const args = process.argv.slice(2);
let since = null, until = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--date') { since = until = parseDateArg(args[i + 1]); i++; }
  else if (args[i] === '--since') { since = parseDateArg(args[i + 1]); i++; }
  else if (args[i] === '--until') { until = parseDateArg(args[i + 1]); i++; }
}
if (!since) {
  const today = new Date().toISOString().slice(0, 10);
  since = until = today;
}
if (!until) until = since;

console.log(`token-meter/extract: ${since} ~ ${until}`);

// Load ccusage sessions for the range (single call, keyed by uuid)
const ccusageSessions = readCcusageSessions(since, until);
console.log(`ccusage sessions loaded: ${Object.keys(ccusageSessions).length}`);

// Enumerate dates
const dates = [];
let cur = new Date(since + 'T00:00:00Z');
const end = new Date(until + 'T00:00:00Z');
while (cur <= end) {
  dates.push(cur.toISOString().slice(0, 10));
  cur = new Date(cur.getTime() + 86400000);
}

for (const dateStr of dates) {
  const records = await processDate(dateStr, ccusageSessions);
  if (records.length > 0) writeDateJsonl(dateStr, records);
}
