#!/usr/bin/env node
// scripts/ci-watch-web/server.mjs  M2-1128-D — ci-watch 웹 서버 (Tailscale 전용)
// Usage: node ~/projects/curiocity-relay-web/scripts/ci-watch-web/server.mjs
// Bind: 100.82.115.70:7700 (Tailscale IP 전용 — 0.0.0.0 금지)
// M1-1128-D: CI_WATCH_WEB_DIR = 읽기 전용 clone — git fetch+reset 만 · 커밋 금지
// M2-1128-D: 스냅샷 push (ci-watch-state 브랜치 · 60초 · git plumbing) + 타임라인 · 클레임 수

import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { execFile, exec } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const TAILSCALE_IP = '100.82.115.70';
const PORT = 7700;
const STATE_DIR = join(homedir(), '.ci-watch-web');
const STATE_FILE = join(STATE_DIR, 'state.json');
const SNAPSHOT_MS = 60_000;

const execFileAsync = promisify(execFile);
const execAsync    = promisify(exec);
// M1-1128-D: 읽기 전용 clone 전용 경로 (heartbeat clone 과 완전 분리)
const RELAY_DIR = process.env.CI_WATCH_WEB_DIR || null;
// CI_WATCH_GIT_BRANCH: 추적할 브랜치 (기본 main · 머지 전 테스트 시 PR 브랜치명 지정)
const GIT_BRANCH = process.env.CI_WATCH_GIT_BRANCH || 'main';
// all.json 을 runner-status 브랜치에서 읽어 status-wt 로 동기화 (MacBook 러너 데이터)
const STATUS_WT_DIR = join(homedir(), '.hub-runner', 'status-wt');
const ALL_JSON_WT_PATH = join(STATUS_WT_DIR, 'all.json');
const GIT_REFRESH_MS = 30_000;

async function gitRefresh() {
  if (!RELAY_DIR) return;
  // GIT_BRANCH 를 origin 으로 강제 동기화 (read-only clone: 커밋 절대 안 함)
  try {
    await execFileAsync('git', ['fetch', 'origin', GIT_BRANCH, '--quiet'],
      { cwd: RELAY_DIR, timeout: 20_000 });
    await execFileAsync('git', ['reset', '--hard', `origin/${GIT_BRANCH}`],
      { cwd: RELAY_DIR, timeout: 10_000 });
  } catch (e) {
    console.error(`[ci-watch-web] ${GIT_BRANCH} 갱신 실패:`, e.message);
  }
  // runner-status 브랜치의 all.json(MacBook 러너 데이터)을 가져와 status-wt에 씀.
  try {
    await execFileAsync('git', ['fetch', 'origin', 'runner-status', '--quiet'],
      { cwd: RELAY_DIR, timeout: 20_000 });
    const { stdout } = await execFileAsync('git', ['show', 'FETCH_HEAD:all.json'],
      { cwd: RELAY_DIR, timeout: 10_000, maxBuffer: 2 * 1024 * 1024 });
    if (stdout && stdout.trim()) {
      if (!existsSync(STATUS_WT_DIR)) mkdirSync(STATUS_WT_DIR, { recursive: true });
      writeFileSync(ALL_JSON_WT_PATH, stdout);
    }
  } catch (e) {
    console.error('[ci-watch-web] runner-status 갱신 실패:', e.message);
  }
}

// 시작 시 즉시 1회 + 30초 주기 갱신
gitRefresh();
setInterval(gitRefresh, GIT_REFRESH_MS);

const { collectData } = await import(join(HERE, '..', 'ci-watch.mjs'));

const ANSI_RE = /\x1b\[[0-9;]*m/g;

function deepStripAnsi(val) {
  if (typeof val === 'string') return val.replace(ANSI_RE, '');
  if (Array.isArray(val)) return val.map(deepStripAnsi);
  if (val instanceof Map) {
    const obj = {};
    for (const [k, v] of val) obj[String(k)] = deepStripAnsi(v);
    return obj;
  }
  if (val && typeof val === 'object') {
    const obj = {};
    for (const [k, v] of Object.entries(val)) {
      if (k.startsWith('_')) continue;
      obj[k] = deepStripAnsi(v);
    }
    return obj;
  }
  return val;
}

// WIB 오늘 날짜 "2026-11-28" → "1128" 형식 추출
function todayMmdd() {
  const wibMs = Date.now() + 7 * 3600_000;
  const d = new Date(wibMs);
  return String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
}

// 오늘 타임라인: pipeline JSONL + claims 로 허브별 프롬프트 세그먼트 구성
function buildTodayTimeline(relayDir) {
  if (!relayDir) return {};
  const mmdd = todayMmdd();
  const pipelineDir = join(relayDir, 'status', 'pipeline');
  const claimsDir  = join(relayDir, 'status', 'claims');
  if (!existsSync(pipelineDir)) return {};

  let files;
  try { files = readdirSync(pipelineDir).filter(f => f.endsWith('.jsonl')); }
  catch { return {}; }

  const entries = {}; // id → { id, hub, startMs, endMs, model, title }

  for (const file of files) {
    const id = file.replace('.jsonl', '');
    // 오늘 날짜 파일만 처리 (ID 패턴 M2-1128-D → 1128)
    const dateMatch = id.match(/^[A-Za-z]\d+-(\d{4})-/);
    if (!dateMatch || dateMatch[1] !== mmdd) continue;

    let lines;
    try { lines = readFileSync(join(pipelineDir, file), 'utf8').split('\n').filter(Boolean); }
    catch { continue; }

    const entry = { id, hub: null, startMs: null, endMs: null, model: null, title: null };
    for (const line of lines) {
      try {
        const ev = JSON.parse(line);
        if (ev.event === 'queued') {
          if (!entry.hub || entry.hub === '?') entry.hub = ev.hub;
          if (!entry.model) entry.model = ev.model;
        }
        if (ev.event === 'started' && !entry.startMs) {
          entry.startMs = new Date(ev.ts).getTime();
          if (ev.hub && ev.hub !== '?') entry.hub = ev.hub;
        }
      } catch {}
    }
    if (entry.id) entries[id] = entry;
  }

  // claims 로 endMs · hub 보완
  if (existsSync(claimsDir)) {
    for (const id of Object.keys(entries)) {
      const claimPath = join(claimsDir, `${id}.json`);
      if (!existsSync(claimPath)) continue;
      try {
        const claim = JSON.parse(readFileSync(claimPath, 'utf8'));
        if (claim.state === 'done' && claim.at) {
          entries[id].endMs = new Date(claim.at).getTime();
        }
        if (!entries[id].hub && claim.hub) entries[id].hub = claim.hub;
      } catch {}
    }
  }

  // 허브별 그룹화
  const result = {};
  for (const e of Object.values(entries)) {
    if (!e.hub || !e.startMs) continue;
    if (!result[e.hub]) result[e.hub] = [];
    result[e.hub].push({ id: e.id, startMs: e.startMs, endMs: e.endMs, model: e.model });
  }
  // 각 허브 내 시작 시간 순 정렬
  for (const hub of Object.keys(result)) {
    result[hub].sort((a, b) => a.startMs - b.startMs);
  }
  return result;
}

// 현재 started(미완료) claim 수 — 진행 중 N 정합성 검증용
function countStartedClaims(relayDir) {
  if (!relayDir) return null;
  const claimsDir = join(relayDir, 'status', 'claims');
  if (!existsSync(claimsDir)) return null;
  let files;
  try { files = readdirSync(claimsDir).filter(f => f.endsWith('.json')); }
  catch { return null; }
  let count = 0;
  for (const file of files) {
    try {
      const claim = JSON.parse(readFileSync(join(claimsDir, file), 'utf8'));
      if (claim.state === 'started') count++;
    } catch {}
  }
  return count;
}

// 큐 파일에서 "N분 상한" 파싱 — 없으면 60
function parseQueueLimit(relayDir, hub, id) {
  if (!relayDir || !hub || !id) return 60;
  const qPath = join(relayDir, 'queue', hub, `${id}.md`);
  if (!existsSync(qPath)) return 60;
  try {
    const text = readFileSync(qPath, 'utf8');
    const m = text.match(/(\d+)분\s*상한/);
    return m ? parseInt(m[1], 10) : 60;
  } catch { return 60; }
}

// pipelinePrompts 에서 각 ID 의 큐 상한 맵 구성
function buildQueueLimits(relayDir, pipelinePrompts) {
  if (!relayDir || !Array.isArray(pipelinePrompts)) return {};
  const limits = {};
  for (const p of pipelinePrompts) {
    if (p.id && p.hub) {
      limits[p.id] = parseQueueLimit(relayDir, p.hub, p.id);
    }
  }
  return limits;
}

// ── 스냅샷 push (ci-watch-state 브랜치 · git plumbing · main 오염 금지) ─────────
// RELAY_DIR 의 git 오브젝트 DB 를 사용하되 로컬 브랜치 전환 없음.
const SNAP_TMP   = '/tmp/ci-watch-snap-state.json';
const TREE_TMP   = '/tmp/ci-watch-snap-tree.txt';

async function pushSnapshot(state) {
  if (!RELAY_DIR) return;
  try {
    const content = JSON.stringify(state, null, 2);

    // 1) blob 생성 (temp file 경유 — SSH 환경에서 stdin pipe 불안정)
    writeFileSync(SNAP_TMP, content);
    const { stdout: blobOut } = await execFileAsync(
      'git', ['hash-object', '-w', SNAP_TMP],
      { cwd: RELAY_DIR, timeout: 10_000 },
    );
    const blobSha = blobOut.trim();

    // 2) tree 생성 (temp file 경유)
    const treeInput = `100644 blob ${blobSha}\tstate.json`;
    writeFileSync(TREE_TMP, treeInput);
    const { stdout: treeOut } = await execAsync(
      `git mktree < ${TREE_TMP}`,
      { cwd: RELAY_DIR, timeout: 10_000 },
    );
    const treeSha = treeOut.trim();

    // 3) commit 생성 (parent 없음 → 항상 1-commit 브랜치)
    const gitEnv = {
      ...process.env,
      GIT_AUTHOR_NAME: 'ci-watch-web',
      GIT_AUTHOR_EMAIL: 'ci-watch@local',
      GIT_COMMITTER_NAME: 'ci-watch-web',
      GIT_COMMITTER_EMAIL: 'ci-watch@local',
      GIT_AUTHOR_DATE: new Date().toISOString(),
      GIT_COMMITTER_DATE: new Date().toISOString(),
    };
    const { stdout: commitOut } = await execFileAsync(
      'git', ['commit-tree', treeSha, '-m', `snapshot ${new Date().toISOString()}`],
      { cwd: RELAY_DIR, timeout: 10_000, env: gitEnv },
    );
    const commitSha = commitOut.trim();

    // 4) force push — main 에는 전혀 영향 없음
    await execFileAsync(
      'git', ['push', 'origin', `${commitSha}:refs/heads/ci-watch-state`, '--force'],
      { cwd: RELAY_DIR, timeout: 20_000 },
    );
    console.log(`[ci-watch-web] snapshot pushed → ci-watch-state @ ${commitSha.slice(0, 7)}`);
  } catch (e) {
    console.error('[ci-watch-web] snapshot push 실패:', e.message);
  }
}

// ── state 캐시 ───────────────────────────────────────────────────────────────
let cachedState = null;
let cachedAt = 0;
const CACHE_MS = 4000;

async function getState() {
  const now = Date.now();
  if (cachedState && now - cachedAt < CACHE_MS) return cachedState;
  try {
    const data = await collectData({ fullMode: false, skipNotify: true });
    cachedState = deepStripAnsi(data);
    cachedState._fetchedAt = new Date().toISOString();
    cachedAt = now;

    // M2-1128-D: 타임라인 · 클레임 수 · 큐 상한 — RELAY_DIR 에서 직접 읽음
    if (RELAY_DIR) {
      cachedState.todayTimeline    = buildTodayTimeline(RELAY_DIR);
      cachedState.claimStartedCount = countStartedClaims(RELAY_DIR);
      cachedState.queueLimits      = buildQueueLimits(RELAY_DIR, cachedState.pipelinePrompts);
    }

    try {
      if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
      writeFileSync(STATE_FILE, JSON.stringify(cachedState, null, 2));
    } catch {}
  } catch (e) {
    console.error('[ci-watch-web] collectData 실패:', e.message);
  }
  return cachedState;
}

// 60초마다 스냅샷 push — 실패해도 웹 서빙 계속
setInterval(async () => {
  const state = await getState().catch(() => null);
  if (state) await pushSnapshot(state);
}, SNAPSHOT_MS);

const HTML_PATH = join(HERE, 'index.html');
const UI_PATH   = join(HERE, 'ui.js');

const server = createServer(async (req, res) => {
  if (req.method !== 'GET') { res.writeHead(405); res.end('Method Not Allowed'); return; }

  if (req.url === '/api/state') {
    try {
      const state = await getState();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(JSON.stringify(state || {}));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    try {
      const html = readFileSync(HTML_PATH, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) {
      res.writeHead(500); res.end('index.html 로드 실패');
    }
    return;
  }

  if (req.url === '/ui.js') {
    try {
      const js = readFileSync(UI_PATH, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(js);
    } catch (e) {
      res.writeHead(500); res.end('ui.js 로드 실패');
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, TAILSCALE_IP, () => {
  console.log(`[ci-watch-web] 서버 시작 http://${TAILSCALE_IP}:${PORT}`);
  console.log(`[ci-watch-web] 상태 파일 ${STATE_FILE}`);
  if (!RELAY_DIR) console.warn('[ci-watch-web] CI_WATCH_WEB_DIR 미설정 — 타임라인·스냅샷 비활성');
});

process.on('SIGINT', () => { server.close(); process.exit(0); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
