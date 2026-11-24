#!/usr/bin/env node
// req-audit.mjs — M1-1124-M
// ledger 의 Kyu 원문을 뽑아 구현 증거(queue 발부·claims done·PR 머지)와 대사.
// Node 22 · ESM · 의존성 없음. 읽기 전용 + 출력 1개(ledger/requirements-index.md).

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const LEDGER_DIR = path.join(REPO_ROOT, 'ledger');
const QUEUE_DIR = path.join(REPO_ROOT, 'queue');
const CLAIMS_DIR = path.join(REPO_ROOT, 'status', 'claims');

const PR_REPOS = [
  'CuriocityDevAi/curiocity-relay',
  'CuriocityDevAi/agilo-medusa-pos-fork',
  'CuriocityDevAi/storeport',
];

// 프롬프트 ID: M0-1124-A · R0-1124-AA · K1-0914-A 등
const ID_RE = /\b([MRKTN]\d-\d{4}-[A-Z]+[0-9]*)\b/g;
const PR_NUM_RE = /#(\d{2,5})\b/g;

function parseArgs(argv) {
  const args = { since: null, json: false, ledgerDir: LEDGER_DIR, _prListFn: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--since') args.since = argv[++i];
    else if (a.startsWith('--since=')) args.since = a.slice('--since='.length);
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') {
      console.log('usage: node scripts/req-audit.mjs [--since YYYY-MM-DD] [--json]');
      process.exit(0);
    }
  }
  return args;
}

function listLedgerFiles(dir) {
  const names = fs.readdirSync(dir);
  return names
    .filter(n => n.endsWith('.md'))
    .filter(n => /^(decision-.*|decisions-\d{8}|handoff-.*|open-requirements)\.md$/.test(n))
    .map(n => path.join(dir, n));
}

// Date from filename YYYYMMDD → YYYY-MM-DD, else null.
function dateFromFilename(file) {
  const base = path.basename(file);
  const m = base.match(/(20\d{6})/);
  if (!m) return null;
  const s = m[1];
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function fileMtimeDate(file) {
  const st = fs.statSync(file);
  const d = st.mtime.toISOString().slice(0, 10);
  return d;
}

function effectiveDate(file) {
  return dateFromFilename(file) || fileMtimeDate(file);
}

function trimQuote(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function excerpt(s, n = 120) {
  const t = trimQuote(s);
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + '…';
}

// Kyu 원문 추출.
// 반환: [{line, text, kind}] — line = 1-based 파일 안 줄 번호.
export function extractKyuQuotes(content) {
  const lines = content.split(/\r?\n/);
  const items = [];
  const seen = new Set();

  const push = (line, text, kind) => {
    const t = trimQuote(text);
    if (t.length < 4) return;
    const key = `${line}|${t.slice(0, 40)}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ line, text: t, kind });
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // (A) Kyu HH:MM "..." or Kyu HH:MM 원문: "..." or Kyu 원문(...): "..."
    //     Capture everything inside the first double-quoted block on the line.
    const kyuQuote = l.match(/Kyu[^"]*"([^"]{4,})"/);
    if (kyuQuote) {
      push(i + 1, kyuQuote[1], 'kyu-inline');
      continue;
    }

    // (B) "## Kyu HH:MM — <text>"  or "## 배경 (Kyu HH:MM 원문)" header → next quote block
    const header = l.match(/^#{1,6}\s+.*Kyu[^\n]*/);
    if (header) {
      // Look ahead for '>' block or N. "..."
      let j = i + 1;
      // skip blanks
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length) {
        const nxt = lines[j];
        const qm = nxt.match(/^>\s?(.+)/);
        if (qm) {
          // accumulate following '> ' lines
          let acc = qm[1];
          let k = j + 1;
          while (k < lines.length && /^>\s?/.test(lines[k])) {
            acc += ' ' + lines[k].replace(/^>\s?/, '');
            k++;
          }
          push(j + 1, acc, 'kyu-quote-block');
          continue;
        }
      }
    }

    // (C) '> ' quote block that comes right after a "Kyu" bearing paragraph
    //     — handled implicitly by (B) for header; also catch loose:
    if (/^>\s/.test(l)) {
      // Look backwards up to 3 lines for a 'Kyu' token.
      let hasKyu = false;
      for (let b = i - 1; b >= Math.max(0, i - 4); b--) {
        if (/Kyu/.test(lines[b])) { hasKyu = true; break; }
        if (lines[b].trim() === '') continue;
        break;
      }
      if (hasKyu) {
        // accumulate full block
        let acc = l.replace(/^>\s?/, '');
        let k = i + 1;
        while (k < lines.length && /^>\s?/.test(lines[k])) {
          acc += ' ' + lines[k].replace(/^>\s?/, '');
          k++;
        }
        push(i + 1, acc, 'kyu-quote-block');
        i = k - 1;
        continue;
      }
    }

    // (D) Numbered quote line under "## Kyu 원문" / "## Kyu 원문 ..." section.
    // Detect by scanning current section header (nearest preceding #heading).
    if (/^\s*\d+\.\s+"[^"]{4,}"/.test(l)) {
      // find nearest preceding heading
      let section = '';
      for (let b = i - 1; b >= 0; b--) {
        if (/^#{1,6}\s+/.test(lines[b])) { section = lines[b]; break; }
      }
      if (/Kyu\s*원문/.test(section)) {
        const m2 = l.match(/^\s*\d+\.\s+"([^"]{4,})"/);
        if (m2) push(i + 1, m2[1], 'kyu-numbered');
        continue;
      }
    }

    // (E) Table row with "Kyu 원문" column text.
    //     If a table has a "Kyu 원문" header, each row's matching cell gets captured.
    //     We detect the header row and capture subsequent rows until a blank line.
    if (/^\|\s*.*Kyu\s*원문/.test(l) && /\|/.test(l)) {
      const headers = l.split('|').map(s => s.trim());
      const colIdx = headers.findIndex(h => /Kyu\s*원문/.test(h));
      if (colIdx > 0) {
        // skip separator row
        let k = i + 1;
        if (k < lines.length && /^\|\s*[-: ]+\|/.test(lines[k])) k++;
        while (k < lines.length && /^\|/.test(lines[k])) {
          const cells = lines[k].split('|').map(s => s.trim());
          const cell = cells[colIdx] || '';
          if (cell && cell !== '—') push(k + 1, cell, 'kyu-table');
          k++;
        }
        i = k - 1;
      }
    }
  }

  return items;
}

// Extract prompt IDs in a local window around the Kyu line.
export function extractPromptIds(content, kyuLine, windowLines = 40) {
  const lines = content.split(/\r?\n/);
  const a = Math.max(0, kyuLine - 1 - 4);
  const b = Math.min(lines.length, kyuLine - 1 + windowLines);
  const slab = lines.slice(a, b).join('\n');
  const ids = new Set();
  for (const m of slab.matchAll(ID_RE)) ids.add(m[1]);
  return Array.from(ids);
}

export function extractPrNumbers(content, kyuLine, windowLines = 40) {
  const lines = content.split(/\r?\n/);
  const a = Math.max(0, kyuLine - 1 - 4);
  const b = Math.min(lines.length, kyuLine - 1 + windowLines);
  const slab = lines.slice(a, b).join('\n');
  const nums = new Set();
  for (const m of slab.matchAll(PR_NUM_RE)) nums.add(Number(m[1]));
  return Array.from(nums);
}

// 실기 신호: 가까운 문맥에 "✅ 실기" 또는 "실기 통과" 가 있으면 "통과", 없으면 "기록 없음".
export function readinessFlag(content, kyuLine, windowLines = 20) {
  const lines = content.split(/\r?\n/);
  const a = Math.max(0, kyuLine - 1);
  const b = Math.min(lines.length, kyuLine - 1 + windowLines);
  const slab = lines.slice(a, b).join('\n');
  if (/(✅\s*실기|실기\s*통과|실기\s*✅)/.test(slab)) return '통과';
  return '기록 없음';
}

function queueIssued(id, queueDir) {
  // queue/<hub>/<ID>.md ; hub prefix derivable from id first char+digit.
  // Scan all subdirs.
  if (!fs.existsSync(queueDir)) return false;
  for (const hub of fs.readdirSync(queueDir)) {
    const p = path.join(queueDir, hub, `${id}.md`);
    if (fs.existsSync(p)) return true;
  }
  return false;
}

function claimDone(id, claimsDir) {
  const p = path.join(claimsDir, `${id}.json`);
  if (!fs.existsSync(p)) return false;
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return j && j.state === 'done';
  } catch {
    return false;
  }
}

// gh pr list cache by repo.
async function fetchPrList(repo) {
  // One call per repo, cached.
  try {
    const out = execFileSync('gh', [
      'pr', 'list', '-R', repo, '--state', 'all', '--limit', '400',
      '--json', 'number,title,state,headRefName,mergedAt',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch (e) {
    process.stderr.write(`[warn] gh pr list failed for ${repo}: ${e.message || e}\n`);
    return [];
  }
}

export function matchPrsForId(prLists, id, prNumbers) {
  const hits = [];
  for (const [repo, prs] of Object.entries(prLists)) {
    for (const pr of prs) {
      const inBranch = pr.headRefName && pr.headRefName.includes(id);
      const inTitle = pr.title && pr.title.includes(id);
      const inNumbers = prNumbers.includes(pr.number);
      if (inBranch || inTitle || inNumbers) {
        hits.push({ repo, number: pr.number, state: pr.state, title: pr.title, mergedAt: pr.mergedAt, matchedBy: inBranch ? 'branch' : inTitle ? 'title' : 'pr-number' });
      }
    }
  }
  return hits;
}

export function judgeItem({ ids, prs, queueIssued: qi }) {
  const anyMerged = prs.some(p => p.state === 'MERGED' || p.mergedAt);
  if (anyMerged) return '구현됨(머지 PR)';
  if (qi || prs.length > 0) return '발부됨·미머지';
  if (ids.length > 0) return '기록만(발부 없음)';
  return '증거 없음';
}

function verdictRank(v) {
  // Top: 미구현·기록만·증거 없음
  return {
    '증거 없음': 0,
    '기록만(발부 없음)': 1,
    '발부됨·미머지': 2,
    '구현됨(머지 PR)': 3,
  }[v] ?? 9;
}

function fmtPr(p) {
  const tag = p.state === 'MERGED' ? '머지' : p.state === 'OPEN' ? 'OPEN' : p.state;
  return `${p.repo.split('/')[1]}#${p.number}(${tag})`;
}

function renderMarkdown(items, since) {
  items = [...items].sort((a, b) => {
    const r = verdictRank(a.verdict) - verdictRank(b.verdict);
    if (r !== 0) return r;
    return b.date.localeCompare(a.date); // 날짜 역순
  });

  const counts = items.reduce((acc, it) => {
    acc[it.verdict] = (acc[it.verdict] || 0) + 1;
    return acc;
  }, {});

  const out = [];
  out.push('# requirements-index — Kyu 원문 ↔ 구현 증거 대사');
  out.push('');
  out.push(`생성: ${new Date().toISOString().slice(0, 19)}Z · 스크립트 = scripts/req-audit.mjs${since ? ` · --since ${since}` : ''}`);
  out.push('');
  out.push('> ⚠ 자동 판정. **추정 금지** — 증거 없으면 없다고. 애매한 항목은 리포트의 사람 판정 표 참조.');
  out.push('');
  out.push('## 판정별 건수');
  out.push('');
  out.push('| 판정 | 건수 |');
  out.push('|---|---|');
  for (const v of ['증거 없음', '기록만(발부 없음)', '발부됨·미머지', '구현됨(머지 PR)']) {
    out.push(`| ${v} | ${counts[v] || 0} |`);
  }
  out.push(`| **합계** | **${items.length}** |`);
  out.push('');
  out.push('## 항목 (미구현·기록만·증거 없음을 맨 위 · 날짜 역순)');
  out.push('');
  out.push('| # | 날짜 | 판정 | 실기 | 원문(120자) | 출처 | ID / PR |');
  out.push('|---|---|---|---|---|---|---|');
  items.forEach((it, i) => {
    const idStr = it.ids.join(' ') || '—';
    const prStr = it.prs.length ? it.prs.map(fmtPr).join(' ') : '—';
    const src = `${path.basename(it.file)}:${it.line}`;
    const text = excerpt(it.text, 120).replace(/\|/g, '\\|');
    out.push(`| ${i + 1} | ${it.date} | ${it.verdict} | ${it.readiness} | ${text} | ${src} | ${idStr} / ${prStr} |`);
  });
  out.push('');
  return out.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const ledgerDir = args.ledgerDir;
  const files = listLedgerFiles(ledgerDir);

  // Collect raw items
  const rawItems = [];
  for (const file of files) {
    const date = effectiveDate(file);
    if (args.since && date < args.since) continue;
    const content = fs.readFileSync(file, 'utf8');
    const quotes = extractKyuQuotes(content);
    for (const q of quotes) {
      const ids = extractPromptIds(content, q.line);
      const prNumbers = extractPrNumbers(content, q.line);
      const readiness = readinessFlag(content, q.line);
      rawItems.push({ file, date, line: q.line, text: q.text, kind: q.kind, ids, prNumbers, readiness });
    }
  }

  // Dedup near-identical quotes on same file & nearby lines.
  const dedup = [];
  const seen = new Map();
  for (const it of rawItems) {
    const key = `${it.file}|${it.text.slice(0, 60)}`;
    if (seen.has(key)) continue;
    seen.set(key, true);
    dedup.push(it);
  }

  // Fetch PR lists once per repo.
  const prLists = {};
  for (const repo of PR_REPOS) {
    prLists[repo] = args._prListFn ? await args._prListFn(repo) : await fetchPrList(repo);
  }

  // Judge
  const items = dedup.map(it => {
    const prs = matchPrsForId(prLists, it.ids.join('|'), it.prNumbers);
    // Also try each id separately
    const extra = [];
    for (const id of it.ids) {
      for (const hit of matchPrsForId(prLists, id, [])) {
        if (!prs.some(p => p.repo === hit.repo && p.number === hit.number)) extra.push(hit);
      }
    }
    const allPrs = [...prs, ...extra];
    const qi = it.ids.some(id => queueIssued(id, QUEUE_DIR));
    const cd = it.ids.some(id => claimDone(id, CLAIMS_DIR));
    const verdict = judgeItem({ ids: it.ids, prs: allPrs, queueIssued: qi });
    return { ...it, prs: allPrs, queueIssued: qi, claimDone: cd, verdict };
  });

  if (args.json) {
    process.stdout.write(JSON.stringify({ since: args.since, items }, null, 2) + '\n');
  }

  const md = renderMarkdown(items, args.since);
  const outPath = path.join(ledgerDir, 'requirements-index.md');
  fs.writeFileSync(outPath, md, 'utf8');

  // Terminal summary
  const counts = items.reduce((acc, it) => {
    acc[it.verdict] = (acc[it.verdict] || 0) + 1;
    return acc;
  }, {});
  process.stderr.write(`# req-audit summary (since=${args.since || 'all'})\n`);
  for (const v of ['증거 없음', '기록만(발부 없음)', '발부됨·미머지', '구현됨(머지 PR)']) {
    process.stderr.write(`${v}\t${counts[v] || 0}\n`);
  }
  process.stderr.write(`total\t${items.length}\n`);
  process.stderr.write(`out\t${outPath}\n`);
}

// Only run if invoked directly (not under node --test).
const invokedDirectly = (() => {
  try {
    return path.resolve(process.argv[1]) === path.resolve(__filename);
  } catch { return false; }
})();

if (invokedDirectly) {
  main().catch(e => {
    process.stderr.write(`[fatal] ${e && e.stack || e}\n`);
    process.exit(2);
  });
}

export { parseArgs, listLedgerFiles, dateFromFilename, effectiveDate, fetchPrList, main };
