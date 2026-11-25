#!/usr/bin/env node
// scripts/ci-watch-v2.mjs  ci-watch v2.1 (M2-1125-J)
// 확정 레이아웃: 주의 · 허브큐 · CI대기 · 진행중 · 오늘완료.
//
// 실행: node ~/projects/curiocity-relay/scripts/ci-watch-v2.mjs
// 키  : j/k 이동 · Enter 상세 창 · / 필터 · r 새로고침 · q 종료
// 옵션: --once [--width=N]  스크린샷/테스트용 1회 출력
//
// 이 파일은 "조립"만 담당 — 모든 로직은 watch/*.mjs 에 있다.

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { buildExtendedView } from './watch/collect-view.mjs';
import { renderV2, renderDetailPanel } from './watch/render-v2.mjs';

const CI_WATCH_V2_VERSION = '2.2.0';

const SPINNER_INTERVAL_MS = 120;

const DEPLOY_BIN = `${homedir()}/.hub-runner/bin`;
const IS_DEPLOYED = process.argv[1]
  ? dirname(resolve(process.argv[1])) === DEPLOY_BIN
  : false;

const REPO_ROOT = process.env.CI_WATCH_RELAY_ROOT
  || `${homedir()}/projects/curiocity-relay`;

const LOCAL_REFRESH_MS = 3_000;

function nowStrWib() {
  return new Date().toLocaleString('en', {
    timeZone: 'Asia/Jakarta', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).replace(',', '');
}

function detectTerminalWidth() {
  return process.stdout.columns || 100;
}

// ── 인터랙션 상태 ─────────────────────────────────────────────────────────

const uiState = {
  cursor:       -1,   // 진행중 항목 선택 인덱스
  filter:       '',   // / 필터 문자열
  filterMode:   false,
  detailCard:   null, // Enter 상세 창 열린 카드
  doneExpanded: false,
  spinnerFrame: 0,    // 스피너 프레임 (120ms 별개 타이머)
};

// 마지막으로 렌더한 inProgress 목록 (j/k 범위 계산용)
let lastInProgress = [];

// ── 렌더 ──────────────────────────────────────────────────────────────────

let cachedView = null;

function tickOnce() {
  const view = buildExtendedView({ repoRoot: REPO_ROOT, now: new Date() });
  cachedView = view;
  lastInProgress = view.inProgress || [];

  // cursor 범위 보정
  if (lastInProgress.length === 0) uiState.cursor = -1;
  else if (uiState.cursor >= lastInProgress.length) uiState.cursor = lastInProgress.length - 1;

  redraw(view);
}

function redraw(view) {
  if (!view) return;
  const width = detectTerminalWidth();
  const lines = renderV2(view, {
    terminalWidth: width,
    timeStr: nowStrWib(),
    version: CI_WATCH_V2_VERSION,
  }, uiState);

  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(lines.join('\n') + '\n');
}

// ── 타이머 ────────────────────────────────────────────────────────────────

let refreshTimer = null;
let spinnerTimer  = null;

function scheduleNext() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    if (!uiState.filterMode && !uiState.detailCard) {
      try { tickOnce(); } catch (e) { process.stderr.write(`[ci-watch-v2] tick: ${e?.message}\n`); }
    }
    scheduleNext();
  }, LOCAL_REFRESH_MS);
}

function startSpinner() {
  if (spinnerTimer) clearInterval(spinnerTimer);
  spinnerTimer = setInterval(() => {
    uiState.spinnerFrame = (uiState.spinnerFrame + 1) % 10;
    if (!uiState.filterMode) redraw(cachedView);
  }, SPINNER_INTERVAL_MS);
}

function cleanupTerminal() {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
  if (spinnerTimer)  { clearInterval(spinnerTimer);  spinnerTimer  = null; }
  try {
    if (process.stdin.isTTY && process.stdin.isRaw) process.stdin.setRawMode(false);
  } catch {}
  process.stdout.write('\x1b[?25h\n');
}

// ── 키 처리 ───────────────────────────────────────────────────────────────

function handleKey(key) {
  // 상세 창 열린 상태
  if (uiState.detailCard) {
    if (key === '\r' || key === '\x1b') { uiState.detailCard = null; redraw(cachedView); }
    else if (key === 'j' || key === 'J') { moveCursor(1); }
    else if (key === 'k' || key === 'K') { moveCursor(-1); }
    return;
  }

  // 필터 입력 중
  if (uiState.filterMode) {
    if (key === '\x1b') {                     // ESC 취소
      uiState.filter = ''; uiState.filterMode = false; redraw(cachedView);
    } else if (key === '\r') {                // Enter 적용
      uiState.filterMode = false; redraw(cachedView);
    } else if (key === '\x7f' || key === '\b') { // 백스페이스
      uiState.filter = uiState.filter.slice(0, -1); redraw(cachedView);
    } else if (key.length === 1 && key >= ' ') {
      uiState.filter += key; redraw(cachedView);
    }
    return;
  }

  // 일반 모드
  if (key === 'q' || key === 'Q' || key === '\x03') {
    cleanupTerminal(); process.exit(0);
  } else if (key === 'r' || key === 'R') {
    try { tickOnce(); } catch {}
  } else if (key === 'j' || key === 'J') {
    moveCursor(1);
  } else if (key === 'k' || key === 'K') {
    moveCursor(-1);
  } else if (key === '\r') {  // Enter
    openDetail();
  } else if (key === '/') {
    uiState.filterMode = true; redraw(cachedView);
  }
}

function moveCursor(delta) {
  if (lastInProgress.length === 0) return;
  if (uiState.cursor < 0) uiState.cursor = 0;
  else uiState.cursor = Math.max(0, Math.min(lastInProgress.length - 1, uiState.cursor + delta));
  if (uiState.detailCard && lastInProgress[uiState.cursor]) {
    uiState.detailCard = lastInProgress[uiState.cursor];
  }
  redraw(cachedView);
}

function openDetail() {
  if (uiState.cursor >= 0 && lastInProgress[uiState.cursor]) {
    uiState.detailCard = lastInProgress[uiState.cursor];
    redraw(cachedView);
  }
}

// ── --once モード (테스트/스크린샷) ─────────────────────────────────────────

if (process.argv.includes('--once') || process.env.CI_WATCH_ONCE === '1') {
  try {
    const view = buildExtendedView({ repoRoot: REPO_ROOT, now: new Date() });
    const widthArg = process.argv.find(a => a.startsWith('--width='));
    const width = widthArg ? Number(widthArg.slice('--width='.length)) : detectTerminalWidth();
    const lines = renderV2(view, {
      terminalWidth: width,
      timeStr: nowStrWib(),
      version: CI_WATCH_V2_VERSION,
    });
    process.stdout.write(lines.join('\n') + '\n');
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[ci-watch-v2:once] ${e?.message || e}\n${e?.stack || ''}\n`);
    process.exit(1);
  }
}

// ── 대화형 모드 ───────────────────────────────────────────────────────────

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.on('SIGINT',  () => { cleanupTerminal(); process.exit(0); });
  process.on('SIGTERM', () => { cleanupTerminal(); process.exit(0); });

  process.stdout.write('\x1b[?25l');
  process.stderr.write(`[ci-watch-v2:boot] v${CI_WATCH_V2_VERSION} · deployed=${IS_DEPLOYED} · repo=${REPO_ROOT}\n`);

  if (process.stdin.isTTY) {
    try { process.stdin.setRawMode(true); } catch {}
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', key => { try { handleKey(key); } catch {} });
  }

  try { tickOnce(); } catch (e) { process.stderr.write(`[ci-watch-v2] initial: ${e?.message}\n`); }
  scheduleNext();
  startSpinner();
}
