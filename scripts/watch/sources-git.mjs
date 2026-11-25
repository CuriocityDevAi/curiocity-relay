// scripts/watch/sources-git.mjs  M2-1125-N — git 오브젝트 기반 relay 데이터 읽기
// relay 작업 트리 대신 origin/main git 오브젝트에서 데이터를 읽어 stale 방지.
// 러너 폴더(~/projects/curiocity-relay)가 origin/main 보다 뒤처져도 최신 데이터를 보장.

import { execFileSync } from 'node:child_process';

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

// ── 고수준 relay 데이터 접근 ─────────────────────────────────────────────

export function readAllJsonGit(repoRoot) {
  return gitShowJson(repoRoot, 'status/runners/all.json');
}

export function readClaimGit(repoRoot, id) {
  return gitShowJson(repoRoot, `status/claims/${id}.json`);
}

const _PROMPT_ID_RE = /^[MRTNK]\d-\d{4}-[A-Z]+$/;

export function scanClaimsDirGit(repoRoot) {
  const paths = gitListPaths(repoRoot, 'status/claims');
  const out = [];
  for (const p of paths) {
    if (!p.endsWith('.json')) continue;
    const id = p.split('/').pop().replace(/\.json$/, '');
    if (!_PROMPT_ID_RE.test(id)) continue;
    const data = gitShowJson(repoRoot, p);
    if (data) out.push(data);
  }
  return out;
}
