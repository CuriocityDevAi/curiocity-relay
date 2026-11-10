#!/usr/bin/env node
// scripts/claim.mjs · 라운드 claim CLI (방법론 ⑦ 감시 신호 · M2-1105-N)
//
// Usage:
//   node scripts/claim.mjs <ID> <started|blocked|done> [note...]
//   node scripts/claim.mjs <ID> blocked --blocked-by <who> "<note>"  (M1-1105-S)
//   node scripts/claim.mjs M2-1105-N started "accent guard + maestro"
//   node scripts/claim.mjs M2-1105-N blocked "waiting on M1 testID"
//   node scripts/claim.mjs M2-1105-N done
//
// 작동:
//   1. status/claims/<ID>.json 작성/갱신 (덮어쓰기)
//   2. hubs.json rebuild (허브별 current_round + state 반영)
//   3. git add + commit + push (fast-path · rebase 충돌 1회 자동 재시도)
//
// hub 는 ID 접두사 (대소문자 무시) 로 유추: "M2-..." → "m2", "R0-..." → "r0".
// 접두사 패턴 (`^([a-z])(\d+)-`) 매칭 실패 시 에러 종료.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const CLAIMS_DIR = join(REPO_ROOT, 'status', 'claims');

// M1-1105-T · `issued` 추가 — blocked claim 을 큐에 되돌려 러너가 재픽하게.
const VALID_STATES = new Set(['issued', 'started', 'blocked', 'done']);

function usage(code = 2) {
  console.error('Usage: node scripts/claim.mjs <ID> <issued|started|blocked|done> [--blocked-by <who>] [note...]');
  process.exit(code);
}

const [, , rawId, rawState, ...rest] = process.argv;
if (!rawId || !rawState) usage();
const id = rawId.trim();
const state = rawState.trim().toLowerCase();
if (!VALID_STATES.has(state)) {
  console.error(`invalid state "${state}" · must be one of: ${[...VALID_STATES].join(', ')}`);
  process.exit(2);
}
// M1-1105-S · 선택적 --blocked-by <who> (blocked state 에서만 payload 에 포함).
let blockedBy = null;
const noteParts = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--blocked-by' && i + 1 < rest.length) {
    blockedBy = rest[i + 1];
    i++;
    continue;
  }
  noteParts.push(rest[i]);
}
const m = id.match(/^([a-z])(\d+)-/i);
if (!m) {
  console.error(`invalid ID "${id}" · expected prefix pattern like "M2-1105-N"`);
  process.exit(2);
}
const hub = `${m[1].toLowerCase()}${m[2]}`;
const note = noteParts.join(' ').trim() || null;
const at = new Date().toISOString();

mkdirSync(CLAIMS_DIR, { recursive: true });
const file = join(CLAIMS_DIR, `${id}.json`);
const payload = { id, hub, state, at, note };
if (state === 'blocked' && blockedBy) payload.blocked_by = blockedBy;
writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.error(`[claim] wrote ${file} · ${JSON.stringify(payload)}`);

// hubs.json rebuild (claims 반영)
try {
  execFileSync(process.execPath, [join(HERE, 'build-hubs.mjs')], { stdio: 'inherit', cwd: REPO_ROOT });
} catch (e) {
  console.error(`[claim] build-hubs 경고: ${e.message} (계속 진행)`);
}

// git add · commit · push (실패 시 rebase 1회 재시도)
function git(args) {
  return execFileSync('git', args, { cwd: REPO_ROOT, stdio: 'pipe' }).toString().trim();
}
// 스코프 밖 변경 경고 (건드리지 않음)
try {
  const st = execFileSync('git', ['status', '--porcelain'], { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  const scope = ['status/claims/', 'status/runners/', 'status/hubs.json'];
  const foreign = st.split('\n').filter((l) => l.length > 2).map((l) => l.slice(3).trim()).filter((p) => p && !scope.some((pre) => p.startsWith(pre)));
  if (foreign.length) console.error(`[claim] 경고: 스코프 밖 변경 ${foreign.length}건 (건드리지 않음): ${foreign.slice(0, 3).join(', ')}`);
} catch { /* noop */ }
try { git(['add', `status/claims/${id}.json`, 'status/hubs.json']); } catch { /* noop */ }

let committed = false;
try {
  const msg = `claim(${hub}): ${id} ${state}${note ? ` · ${note.slice(0, 60)}` : ''}`;
  git(['commit', '-m', msg]);
  committed = true;
  console.error(`[claim] committed`);
} catch (e) {
  const err = e.stderr?.toString() || e.message;
  if (/nothing to commit/i.test(err)) {
    console.error('[claim] nothing to commit (claim identical to prior)');
  } else {
    console.error(`[claim] commit skipped: ${err.trim().split('\n').slice(0, 3).join(' ')}`);
  }
}

if (committed) {
  try {
    git(['push', 'origin', 'HEAD:main']);
    console.error('[claim] pushed');
  } catch (e) {
    const err = e.stderr?.toString() || e.message;
    if (/rejected|non-fast-forward/i.test(err)) {
      console.error('[claim] rebase + retry');
      try {
        git(['pull', '--rebase', '--autostash', 'origin', 'main']);
      } catch (re) {
        const reMsg = (re.stderr?.toString() || re.message).trim().split('\n').slice(0, 3).join(' ');
        console.error(`[claim] pull --rebase --autostash 실패 · rebase --abort · 다음 tick 재push: ${reMsg}`);
        try { git(['rebase', '--abort']); } catch { /* noop */ }
        // claim.json 디스크 보존 · 러너 다음 tick 재push
        process.exit(0);
      }
      try { git(['push', 'origin', 'HEAD:main']); console.error('[claim] pushed (after rebase)'); }
      catch (re2) {
        console.error(`[claim] 2nd push 실패: ${re2.stderr?.toString() || re2.message}`);
        process.exit(1);
      }
    } else {
      console.error(`[claim] push 실패: ${err.trim().split('\n').slice(0, 3).join(' ')}`);
      process.exit(1);
    }
  }
}
