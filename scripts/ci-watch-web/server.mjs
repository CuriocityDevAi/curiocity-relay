#!/usr/bin/env node
// scripts/ci-watch-web/server.mjs  M2-1128-C — ci-watch 웹 서버 (Tailscale 전용)
// Usage: node ~/projects/curiocity-relay-heartbeat/scripts/ci-watch-web/server.mjs
// Bind: 100.82.115.70:7700 (Tailscale IP 전용 — 0.0.0.0 금지)
// M2-1128-C: CI_WATCH_RELAY_DIR = heartbeat clone → 30초 pull + runner-status fetch

import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const TAILSCALE_IP = '100.82.115.70';
const PORT = 7700;
const STATE_DIR = join(homedir(), '.ci-watch-web');
const STATE_FILE = join(STATE_DIR, 'state.json');

const execFileAsync = promisify(execFile);
// M2-1128-C: heartbeat clone 경로 (CI_WATCH_RELAY_DIR 로 전달됨)
const RELAY_DIR = process.env.CI_WATCH_RELAY_DIR || null;
// all.json 을 runner-status 브랜치에서 읽어 status-wt 로 동기화 (MacBook 러너 데이터)
const STATUS_WT_DIR = join(homedir(), '.hub-runner', 'status-wt');
const ALL_JSON_WT_PATH = join(STATUS_WT_DIR, 'all.json');
const GIT_REFRESH_MS = 30_000;

async function gitRefresh() {
  if (!RELAY_DIR) return;
  try {
    await execFileAsync('git', ['pull', '--ff-only', '--quiet'], { cwd: RELAY_DIR, timeout: 20_000 });
  } catch (e) {
    console.error('[ci-watch-web] git pull 실패:', e.message);
  }
  try {
    await execFileAsync('git', ['fetch', 'origin', 'runner-status:refs/remotes/origin/runner-status', '--quiet'],
      { cwd: RELAY_DIR, timeout: 20_000 });
    const { stdout } = await execFileAsync('git', ['show', 'origin/runner-status:all.json'],
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
    try {
      if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
      writeFileSync(STATE_FILE, JSON.stringify(cachedState, null, 2));
    } catch {}
  } catch (e) {
    console.error('[ci-watch-web] collectData 실패:', e.message);
  }
  return cachedState;
}

const HTML_PATH = join(HERE, 'index.html');
let HTML = '';
try { HTML = readFileSync(HTML_PATH, 'utf8'); } catch (e) {
  console.error('[ci-watch-web] index.html 로드 실패:', e.message);
}

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
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, TAILSCALE_IP, () => {
  console.log(`[ci-watch-web] 서버 시작 http://${TAILSCALE_IP}:${PORT}`);
  console.log(`[ci-watch-web] 상태 파일 ${STATE_FILE}`);
});

process.on('SIGINT', () => { server.close(); process.exit(0); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
