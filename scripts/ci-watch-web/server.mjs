#!/usr/bin/env node
// scripts/ci-watch-web/server.mjs  M2-1128-B — ci-watch 웹 서버 (Tailscale 전용)
// Usage: node ~/projects/curiocity-relay/scripts/ci-watch-web/server.mjs
// Bind: 100.82.115.70:7700 (Tailscale IP 전용 — 0.0.0.0 금지)

import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const TAILSCALE_IP = '100.82.115.70';
const PORT = 7700;
const STATE_DIR = join(homedir(), '.ci-watch-web');
const STATE_FILE = join(STATE_DIR, 'state.json');

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
