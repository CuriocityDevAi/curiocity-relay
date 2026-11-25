// scripts/watch/sources-git.mjs  M2-1125-Q — 배치 읽기 + 날짜 필터로 부팅 가속
// relay 작업 트리 대신 origin/main git 오브젝트에서 데이터를 읽어 stale 방지.
// 러너 폴더(~/projects/curiocity-relay)가 origin/main 보다 뒤처져도 최신 데이터를 보장.

import { execFileSync, spawn } from 'node:child_process';

// ── 모듈 레벨 fetch 상태 ─────────────────────────────────────────────────
const _fs = {
  sha: null,
  fetchedAt: 0,
  repoRoot: null,
};

const FETCH_INTERVAL_MS = 30_000;

/**
 * 30초 최소 간격으로 git fetch origin main 을 실행한다.
 * 실패해도 계속 (fetch 불가 환경에서도 작동).
 */
export function maybeGitFetch(repoRoot, nowMs = Date.now()) {
  if (nowMs - _fs.fetchedAt < FETCH_INTERVAL_MS && _fs.repoRoot === repoRoot) return;
  _fs.repoRoot = repoRoot;
  _fs.fetchedAt = nowMs; // 실패 시 연속 재시도 방지
  try {
    execFileSync('git', ['-C', repoRoot, 'fetch', 'origin', 'main', '--quiet'], {
      timeout: 10_000, stdio: 'ignore',
    });
    const sha = execFileSync('git', ['-C', repoRoot, 'rev-parse', 'origin/main'], {
      timeout: 5_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().slice(0, 7);
    _fs.sha = sha;
  } catch {
    // fetch 실패해도 기존 origin/main ref 로 계속 읽기 시도
  }
}

/**
 * 비동기 git fetch: 타임아웃 보장, 실패해도 resolve.
 * @returns {Promise<void>}
 */
export function maybeGitFetchAsync(repoRoot, nowMs = Date.now(), timeoutMs = 10_000) {
  if (nowMs - _fs.fetchedAt < FETCH_INTERVAL_MS && _fs.repoRoot === repoRoot) {
    return Promise.resolve();
  }
  _fs.repoRoot = repoRoot;
  _fs.fetchedAt = nowMs;
  return new Promise(resolve => {
    const child = spawn('git', ['-C', repoRoot, 'fetch', 'origin', 'main', '--quiet'], {
      stdio: 'ignore',
    });
    const timer = setTimeout(() => { try { child.kill(); } catch {} resolve(); }, timeoutMs);
    child.on('close', () => {
      clearTimeout(timer);
      try {
        const sha = execFileSync('git', ['-C', repoRoot, 'rev-parse', 'origin/main'], {
          timeout: 3_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
        }).trim().slice(0, 7);
        _fs.sha = sha;
      } catch {}
      resolve();
    });
    child.on('error', () => { clearTimeout(timer); resolve(); });
  });
}

/**
 * 마지막 fetch 기준 데이터 출처 정보.
 */
export function getDataOrigin(nowMs = Date.now()) {
  return {
    sha: _fs.sha,
    ageSec: _fs.fetchedAt ? Math.round((nowMs - _fs.fetchedAt) / 1000) : null,
  };
}

// ── 저수준 git 읽기 ──────────────────────────────────────────────────────

export function gitShowText(repoRoot, relPath) {
  try {
    return execFileSync(
      'git', ['-C', repoRoot, 'show', `origin/main:${relPath}`],
      { timeout: 5_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch { return null; }
}

export function gitShowJson(repoRoot, relPath) {
  const txt = gitShowText(repoRoot, relPath);
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return null; }
}

export function gitShowJsonl(repoRoot, relPath) {
  const txt = gitShowText(repoRoot, relPath);
  if (!txt) return [];
  return txt.split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

export function gitListPaths(repoRoot, prefix) {
  try {
    const out = execFileSync(
      'git', ['-C', repoRoot, 'ls-tree', '-r', '--name-only', 'origin/main', prefix],
      { timeout: 5_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return out.split('\n').filter(Boolean);
  } catch { return []; }
}

/**
 * git cat-file --batch 로 여러 경로를 프로세스 1개로 한 번에 읽기.
 * @param {string} repoRoot
 * @param {string[]} relPaths  'status/claims/X.json' 형태
 * @returns {Map<string, string|null>}  path → 내용 or null
 */
export function gitCatFileBatch(repoRoot, relPaths) {
  const result = new Map();
  if (relPaths.length === 0) return result;
  const input = relPaths.map(p => `origin/main:${p}`).join('\n') + '\n';
  let raw;
  try {
    raw = execFileSync('git', ['-C', repoRoot, 'cat-file', '--batch'], {
      input,
      timeout: 15_000,
      maxBuffer: 32 * 1024 * 1024,
    }); // Buffer
  } catch {
    for (const p of relPaths) result.set(p, null);
    return result;
  }
  let pos = 0;
  for (const p of relPaths) {
    const nl = raw.indexOf(0x0a, pos);
    if (nl < 0) { result.set(p, null); continue; }
    const header = raw.slice(pos, nl).toString('utf8');
    pos = nl + 1;
    const parts = header.split(' ');
    if (parts[1] === 'missing' || parts.length < 3) {
      result.set(p, null);
      continue;
    }
    const size = parseInt(parts[2], 10);
    if (isNaN(size) || size < 0) { result.set(p, null); continue; }
    result.set(p, raw.slice(pos, pos + size).toString('utf8'));
    pos += size + 1; // +1 for trailing \n after content
  }
  return result;
}

// ── 고수준 relay 데이터 접근 ─────────────────────────────────────────────

export function readAllJsonGit(repoRoot) {
  return gitShowJson(repoRoot, 'status/runners/all.json');
}

export function readClaimGit(repoRoot, id) {
  return gitShowJson(repoRoot, `status/claims/${id}.json`);
}

const _PROMPT_ID_RE = /^[MRTNK]\d-\d{4}-[A-Z]+$/;

/** 현재 날짜 기준 WIB MMDD 집합 반환 (오늘 + daysBack 일) */
export function getRecentMmddSet(now = new Date(), daysBack = 1) {
  const codes = new Set();
  for (let d = 0; d <= daysBack; d++) {
    // UTC
    const t = new Date(now);
    t.setUTCDate(t.getUTCDate() - d);
    codes.add(
      String(t.getUTCMonth() + 1).padStart(2, '0') +
      String(t.getUTCDate()).padStart(2, '0'),
    );
    // WIB (UTC+7)
    const tw = new Date(now.getTime() + 7 * 3600_000);
    tw.setUTCDate(tw.getUTCDate() - d);
    codes.add(
      String(tw.getUTCMonth() + 1).padStart(2, '0') +
      String(tw.getUTCDate()).padStart(2, '0'),
    );
  }
  return codes;
}

/**
 * 날짜 필터 + 배치 읽기로 claims 를 빠르게 스캔.
 * - mmddSet: 허용할 MMDD 집합 (null 이면 필터 없음 — 전체)
 * - 프로세스 수: ls-tree 1 + cat-file 1 = 최대 2
 */
export function scanClaimsDirGitFast(repoRoot, mmddSet = null) {
  const paths = gitListPaths(repoRoot, 'status/claims');
  const filtered = paths.filter(p => {
    if (!p.endsWith('.json')) return false;
    const id = p.split('/').pop().replace(/\.json$/, '');
    if (!_PROMPT_ID_RE.test(id)) return false;
    if (mmddSet) {
      const m = id.match(/-(\d{4})-/);
      if (!m || !mmddSet.has(m[1])) return false;
    }
    return true;
  });
  if (filtered.length === 0) return [];
  const contents = gitCatFileBatch(repoRoot, filtered);
  const out = [];
  for (const [, text] of contents) {
    if (!text) continue;
    try {
      const data = JSON.parse(text);
      if (data) out.push(data);
    } catch {}
  }
  return out;
}

export function scanClaimsDirGit(repoRoot) {
  return scanClaimsDirGitFast(repoRoot, null);
}
