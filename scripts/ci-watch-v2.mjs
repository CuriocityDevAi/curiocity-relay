#!/usr/bin/env node
// scripts/ci-watch-v2.mjs  ci-watch v2.0 (M1-1124-P)
// 9칸 파이프라인 칸반 · 로컬 우선 · GitHub 최소 호출.
//
// 실행: ci-watch.sh --v2  (래퍼 분기) · 단독: node ~/projects/curiocity-relay/scripts/ci-watch-v2.mjs
// 키   : q 종료 / Ctrl+C 종료 / r 수동 새로고침
// 간격 : 로컬 3초 · GitHub 호출은 이상 감지 트리거 시점에만 (평시 ≤1회/5분)
//
// 이 파일은 "조립"만 담당 — 모든 로직은 watch/*.mjs 에 있다.

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { buildPipelineView } from './watch/pipeline-view.mjs';
import { renderV2 } from './watch/render-v2.mjs';

const CI_WATCH_V2_VERSION = '2.0.0-mvp';

const HERE = dirname(fileURLToPath(import.meta.url));

// 배포본 판정 — v1.4 와 동일 규칙.
const DEPLOY_BIN = `${homedir()}/.hub-runner/bin`;
const IS_DEPLOYED = process.argv[1]
  ? dirname(resolve(process.argv[1])) === DEPLOY_BIN
  : false;
// 데이터 출처(REPO_ROOT)는 항상 러너가 쓰는 clone — 워크트리/배포 상관없이 live state 읽음.
// 커스텀 경로가 필요하면 CI_WATCH_RELAY_ROOT 환경변수로 덮어쓸 수 있음(테스트용).
const REPO_ROOT = process.env.CI_WATCH_RELAY_ROOT
  || `${homedir()}/projects/curiocity-relay`;

const LOCAL_REFRESH_MS = 3_000;

// GitHub 예산 추적 (평시 5분/이상 감지 시 1회) — 이번 라운드는 "호출 안 함"이 기본값.
const ghBudget = {
  windowStartMs: Date.now(),
  windowCalls: 0,
  windowMs: 60 * 60 * 1000,
  maxPerWindow: 12,   // 한 시간 12회 상한
  lastAnomalyMs: 0,
};

function nowStrWib() {
  return new Date().toLocaleString('en', {
    timeZone: 'Asia/Jakarta', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).replace(',', '');
}

function detectTerminalWidth() {
  const cols = process.stdout.columns || 100;
  return cols;
}

let renderToken = 0;

function tickOnce() {
  renderToken += 1;
  const view = buildPipelineView({ repoRoot: REPO_ROOT, now: new Date() });
  const width = detectTerminalWidth();
  const alertCount = view.cards.filter(c => c.level !== 'green').length;
  const lines = renderV2(view, {
    terminalWidth: width,
    timeStr: nowStrWib(),
    version: CI_WATCH_V2_VERSION,
    alertCount,
  });
  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(lines.join('\n') + '\n');
  // 하단 상태 줄 (GH 예산 · 호출 안 함 표기)
  const since = Math.round((Date.now() - ghBudget.windowStartMs) / 60000);
  const budgetStr = `GH 호출 ${ghBudget.windowCalls}/${ghBudget.maxPerWindow} (최근 ${since}분)`;
  process.stdout.write(`\x1b[2m  로컬 3초 · ${budgetStr} · q 종료 · r 새로고침\x1b[0m\n`);
}

let refreshTimer = null;

function scheduleNext() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    try { tickOnce(); } catch (e) { process.stderr.write(`[ci-watch-v2] tick error: ${e?.message || e}\n`); }
    scheduleNext();
  }, LOCAL_REFRESH_MS);
}

function cleanupTerminal() {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  try {
    if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
  } catch {}
  process.stdout.write('\x1b[?25h\n');
}

// --- M1-1124-P: --once · --snapshot <width> — 테스트/스크린샷용 ---
if (process.argv.includes('--once') || process.env.CI_WATCH_ONCE === '1') {
  try {
    const view = buildPipelineView({ repoRoot: REPO_ROOT, now: new Date() });
    const widthArg = process.argv.find(a => a.startsWith('--width='));
    const width = widthArg ? Number(widthArg.slice('--width='.length)) : detectTerminalWidth();
    const alertCount = view.cards.filter(c => c.level !== 'green').length;
    const lines = renderV2(view, {
      terminalWidth: width,
      timeStr: nowStrWib(),
      version: CI_WATCH_V2_VERSION,
      alertCount,
    });
    process.stdout.write(lines.join('\n') + '\n');
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[ci-watch-v2:once] ${e?.message || e}\n${e?.stack || ''}\n`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.on('SIGINT',  () => { cleanupTerminal(); process.exit(0); });
  process.on('SIGTERM', () => { cleanupTerminal(); process.exit(0); });

  process.stdout.write('\x1b[?25l');
  process.stderr.write(`[ci-watch-v2:boot] deployed=${IS_DEPLOYED} · repo=${REPO_ROOT}\n`);

  if (process.stdin.isTTY) {
    try { process.stdin.setRawMode(true); } catch {}
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', key => {
      if (key === 'q' || key === 'Q' || key === '') {
        cleanupTerminal(); process.exit(0);
      } else if (key === 'r' || key === 'R') {
        try { tickOnce(); } catch {}
      }
    });
  }

  try { tickOnce(); } catch (e) { process.stderr.write(`[ci-watch-v2] initial tick error: ${e?.message || e}\n`); }
  scheduleNext();
}
