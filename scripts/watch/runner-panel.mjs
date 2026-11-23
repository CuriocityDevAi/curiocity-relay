#!/usr/bin/env node
// scripts/watch/runner-panel.mjs · M1-1123-E · 러너 칸 터미널 표시 모듈.
//
// 입력: status/runners/all.json 파싱 결과(객체)
// 출력: 문자열 줄 배열 (터미널 표시용)
//
// 단독 실행: node scripts/watch/runner-panel.mjs  → 30초 갱신 화면.
// import: M3 ci-watch.mjs 가 import { renderRunnerPanel } from './runner-panel.mjs' 로 사용.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const ALL_JSON = join(REPO_ROOT, 'status', 'runners', 'all.json');

const HUBS = ['m0', 'm1', 'm2', 'm3', 'r0'];
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function ageMin(isoStr) {
  if (!isoStr) return null;
  return Math.round((Date.now() - new Date(isoStr).getTime()) / 60000);
}

function fmtAge(min, redThreshold = 10) {
  if (min === null) return `${DIM}?${RESET}`;
  if (min >= redThreshold) return `${RED}${min}분 전${RESET}`;
  return `${min}분 전`;
}

function fmtRunner(status, busy) {
  if (status === 'online') return busy ? `${YELLOW}●BUSY${RESET}` : `${GREEN}●OK${RESET}`;
  return `${RED}●OFF${RESET}`;
}

export function renderRunnerPanel(data) {
  const lines = [];
  if (!data) {
    lines.push(`${RED}[runner-panel] all.json 없음${RESET}`);
    return lines;
  }

  const atAge = ageMin(data.at);
  lines.push(`${BOLD}=== 러너 칸 ===${RESET}  heartbeat ${fmtAge(atAge)}  runner=${data.runner || '?'}  pid=${data.pid || '?'}`);

  for (const hub of HUBS) {
    const h = (data.hubs || {})[hub];
    if (!h) {
      lines.push(`  ${hub}: ${DIM}데이터 없음${RESET}`);
      continue;
    }
    const current = h.current || null;
    const startedAt = h.started_at || null;
    const lastActivity = h.last_activity || null;
    const elapsedMin = current && startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000) : null;
    const activityAge = ageMin(lastActivity);
    const statusStr = current
      ? `${YELLOW}${current}${RESET} (${elapsedMin !== null ? elapsedMin + '분 경과' : '?'})`
      : `${GREEN}idle${RESET}`;
    lines.push(`  ${BOLD}${hub}${RESET}  ${statusStr}  마지막활동=${fmtAge(activityAge)}`);
  }

  lines.push('');
  const gs = data.git_state;
  if (gs) {
    const ahead = gs.ahead || 0;
    const behind = gs.behind || 0;
    let gitLine = `git: ahead=${ahead} behind=${behind}`;
    if (gs.rebase_in_progress) gitLine += `  ${RED}REBASE 진행 중${RESET}`;
    if (gs.merge_in_progress) gitLine += `  ${YELLOW}MERGE 진행 중${RESET}`;
    if (gs.needs_human) gitLine += `  ${RED}★사람 필요★${RESET}`;
    if (gs.conflicted && gs.conflicted.length) gitLine += `  충돌=${gs.conflicted.slice(0, 3).join(',')}`;
    lines.push(`  ${gitLine}`);
  } else {
    lines.push(`  git: ${DIM}데이터 없음${RESET}`);
  }

  lines.push('');
  const cr = data.ci_runners;
  if (cr && cr.length) {
    lines.push(`  CI 러너:`);
    for (const r of cr) {
      lines.push(`    ${fmtRunner(r.status, r.busy)}  ${r.name}`);
    }
  } else {
    lines.push(`  CI 러너: ${DIM}데이터 없음${RESET}`);
  }

  lines.push('');
  const errTail = data.err_tail;
  if (errTail) {
    const errLines = errTail.split('\n').filter(Boolean).slice(-8);
    lines.push(`  오류 로그 (마지막 8줄):`);
    for (const l of errLines) {
      lines.push(`    ${DIM}${l}${RESET}`);
    }
  } else {
    lines.push(`  오류 로그: ${DIM}없음${RESET}`);
  }

  return lines;
}

function loadAllJson() {
  try {
    if (!existsSync(ALL_JSON)) return null;
    return JSON.parse(readFileSync(ALL_JSON, 'utf8'));
  } catch { return null; }
}

function render() {
  process.stdout.write('\x1b[2J\x1b[H');
  const data = loadAllJson();
  const lines = renderRunnerPanel(data);
  for (const l of lines) process.stdout.write(l + '\n');
  process.stdout.write(`\n  ${DIM}${new Date().toISOString()} · 30초마다 갱신${RESET}\n`);
}

const IS_MAIN = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (IS_MAIN) {
  render();
  setInterval(render, 30_000);
}
