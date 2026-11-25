// scripts/watch/render-v2.mjs  ci-watch v2.1 · 확정 레이아웃 (M2-1125-J)
// 기본: 새 섹션 레이아웃(주의·허브큐·CI큐·진행중·완료).
// --board 옵션: 9칸 박스 칸반(M2-1125-H 호환).
// 표시 폭은 EAW 기준(text-width.mjs) — 한글·전각·이모지 2칸.

import { COLUMNS, COLUMN_LABELS } from './thresholds.mjs';
import {
  stripAnsi, displayWidth, truncateWidth, padEndWidth,
} from './text-width.mjs';
import {
  stageStrip, stageLabel, poolDot, POOL_ORDER, POOL_ABBR, QUEUE_HUBS,
  HUB_PICKUP_RED_SEC, CI_PICKUP_RED_SEC,
} from './collect-view.mjs';

export { stripAnsi };

// ── 스피너 ────────────────────────────────────────────────────────────────
const SPINNER_FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];

export function spinnerChar(frame) {
  return SPINNER_FRAMES[Math.abs(frame || 0) % SPINNER_FRAMES.length];
}

// ── ANSI 색 ──────────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
};

const LEVEL_COLOR = { green: C.green, yellow: C.yellow, red: C.red };
function cl(level) { return LEVEL_COLOR[level] || ''; }

// ── 뷰 정규화 — buildPipelineView() 결과도 받을 수 있도록 ───────────────────

function normalizeView(view) {
  if (!view) return view;
  const cards      = view.cards || [];
  const inProgress = view.inProgress !== undefined
    ? view.inProgress
    : cards.filter(c => c.column !== 'queue');
  const caution = view.caution !== undefined
    ? view.caution
    : inProgress.filter(c => c.level !== 'green');

  let hubQueue = view.hubQueue;
  if (!hubQueue) {
    hubQueue = new Map();
    for (const h of QUEUE_HUBS) hubQueue.set(h, []);
    for (const c of cards) {
      if (c.column !== 'queue') continue;
      const hub  = c.hub || '';
      const list = hubQueue.get(hub) || [];
      list.push({ id: c.id, ageMin: c.ageMin ?? 0, ageSec: (c.ageMin ?? 0) * 60, title: c.title || '' });
      hubQueue.set(hub, list);
    }
  }

  const congestionAlerts = view.congestionAlerts || [];

  return { ...view, inProgress, caution, hubQueue, congestionAlerts };
}

// ── 구역 구분선 ───────────────────────────────────────────────────────────

function sectionHr(title, w) {
  const prefix = `─ ${title} `;
  const pw     = displayWidth(prefix);
  const fill   = Math.max(0, w - pw);
  return prefix + '─'.repeat(fill);
}

function hr(w) {
  return '─'.repeat(Math.max(10, w));
}

// ═══════════════════════════════════════════════════════════════════════════
//  새 섹션 레이아웃 (기본 모드)
// ═══════════════════════════════════════════════════════════════════════════

function renderSummaryBar(view, opts) {
  const { timeStr = '', terminalWidth: w = 100 } = opts;
  const { inProgress = [], caution = [], doneToday = 0, runnerVersion = '', ciRunnerPools, dataOrigin } = view;

  const inN  = inProgress.length;
  const cauN = caution.length + (view.congestionAlerts?.length || 0);
  const inStr  = `${C.green}●진행 ${inN}${C.reset}`;
  const cauStr = cauN > 0
    ? `${C.red}■주의 ${cauN}${C.reset}`
    : `${C.dim}■주의 0${C.reset}`;
  const doneStr = `${C.dim}✔오늘 ${doneToday}${C.reset}`;
  const rvStr   = runnerVersion ? `runner ${runnerVersion}` : '';

  let ciDots = '';
  const pools = ciRunnerPools instanceof Map ? ciRunnerPools
    : (ciRunnerPools ? new Map(Object.entries(ciRunnerPools)) : null);
  for (const pool of POOL_ORDER) {
    const info = pools?.get(pool);
    const st   = info?.status || 'unknown';
    const dot  = poolDot(st);
    const dotC = dot.color === 'green' ? C.green
      : dot.color === 'yellow' ? C.yellow
      : dot.color === 'red'    ? C.red
      : C.dim;
    ciDots += `${dotC}${dot.ch}${C.reset}`;
  }

  const left = `${C.bold}ci-watch${C.reset}  ${timeStr}  ${inStr}  ${cauStr}  ${doneStr}`;
  const right = (rvStr ? `  ${rvStr}` : '') + `   CI ${ciDots}`;
  return left + right;
}

function renderDataOriginLine(dataOrigin) {
  if (!dataOrigin) return null;
  const shaStr = dataOrigin.sha ? `@${dataOrigin.sha}` : '@(unknown)';
  const ageStr = dataOrigin.ageSec != null ? `${dataOrigin.ageSec}s 전 fetch` : 'fetch 미완';
  return `${C.dim}data origin/main ${shaStr} · ${ageStr}${C.reset}`;
}

// ── 주의 섹션 ─────────────────────────────────────────────────────────────

function renderCaution(view, opts) {
  const { caution = [], congestionAlerts = [] } = view;
  const { terminalWidth: w = 100 } = opts;

  const total = caution.length + congestionAlerts.length;
  if (total === 0) return [sectionHr('주의 없음', w)];

  const lines = [sectionHr(`주의 (${total})`, w)];

  // 큐 정체 경보
  for (const a of congestionAlerts) {
    const idStr = a.id ? `  ${a.id}` : '';
    const src   = a.kind === 'hub_queue' ? a.hub : (a.poolAbbr || a.pool || '');
    const minStr = a.ageMin != null ? `${a.ageMin}분` : '—';
    const header = truncateWidth(
      `■ ${(src + idStr).padEnd(14)}  큐 정체 ${minStr}`, w
    );
    lines.push(`${C.red}${header}${C.reset}`);
    lines.push(`    ${C.dim}└ ${truncateWidth(a.reason || '', Math.max(4, w - 6))}${C.reset}`);
  }

  // 일반 경보 (기존 카드 주의)
  for (const c of caution) {
    const col    = cl(c.level);
    const mark   = c.mark || '■';
    const strip  = stageStrip(c.column);
    const stage  = padEndWidth(stageLabel(c.column), 6);
    const ageStr = typeof c.ageMin === 'number' ? `${c.ageMin}분` : '';
    const prPart = c.extra?.pr?.number ? `  #${c.extra.pr.number}` : '';
    const FIXED  = displayWidth(mark) + 1 + 12 + 1 + 2 + 2 + displayWidth(strip) + 2
      + displayWidth(stage) + 2 + displayWidth(ageStr) + displayWidth(prPart);
    const title  = truncateWidth(c.title || '', Math.max(4, w - FIXED));
    const idPad  = padEndWidth(c.id, 12);
    const hubPad = padEndWidth(c.hub || '', 2);

    // R0 리뷰 결과 칩
    let reviewChip = '';
    if (c.reviewResult === 'APPROVE') reviewChip = ` ${C.green}[APPROVE]${C.reset}`;
    else if (c.reviewResult === 'CHANGES') reviewChip = ` ${C.yellow}[CHANGES]${C.reset}`;

    lines.push(
      `${col}${mark}${C.reset} ${idPad} ${hubPad}  ${strip}  ${stage}  ${ageStr}${prPart}${reviewChip}  ${col}${title}${C.reset}`
    );
    if (c.reason) {
      lines.push(`  ${C.dim}└ ${truncateWidth(c.reason, Math.max(4, w - 6))}${C.reset}`);
    }
  }
  return lines;
}

// ── 허브 큐 섹션 ─────────────────────────────────────────────────────────

function renderHubQueue(view, opts, state = {}) {
  const { hubQueue, inProgress = [], congestionAlerts = [] } = view;
  const { terminalWidth: w = 100 } = opts;
  const { spinnerFrame = 0 } = state;

  const hubs = QUEUE_HUBS;

  // 허브별 실행 중 카드 (inProgress 에서 column==='hub')
  const runningByHub = new Map();
  for (const c of inProgress) {
    if (c.column === 'hub') runningByHub.set(c.hub, c);
  }

  // 대기 건수 → 제목
  const countParts = hubs.map(h => {
    const list = hubQueue instanceof Map ? (hubQueue.get(h) || []) : (hubQueue?.[h] || []);
    return `${h} ${list.length}`;
  }).join(' · ');

  const lines = [sectionHr(`허브 큐 (${countParts})`, w)];

  for (const hub of hubs) {
    const items   = hubQueue instanceof Map ? (hubQueue.get(hub) || []) : (hubQueue?.[hub] || []);
    const running = runningByHub.get(hub) || null;
    const isAlert = congestionAlerts.some(a => a.kind === 'hub_queue' && a.hub === hub);

    const hubPad = padEndWidth(hub, 2);

    if (items.length === 0 && !running) {
      lines.push(`  ${hubPad}  —`);
      continue;
    }

    // 대기 칩
    let chipsLine = `  ${hubPad}  `;
    if (items.length === 0) {
      chipsLine += '—';
    } else {
      let chips = '';
      for (const item of items) {
        const ageStr  = `${item.ageMin}분`;
        const isCong  = item.congested;
        const chip    = `[${item.id} ${ageStr}]`;
        chips += isCong ? `${C.red}${chip}${C.reset}` : chip;
      }
      chipsLine += truncateWidth(chips.replace(/\x1b\[[0-9;]*m/g, '').length > 0 ? chips : chips, Math.max(10, w - 7));
    }

    // 제목 행 (대기 칩이 있는 행)에 정체 표시
    if (isAlert && items.length > 0) {
      lines.push(chipsLine);
    } else {
      lines.push(chipsLine);
    }

    // 실행 중 └ 행
    if (running) {
      const sp       = spinnerChar(spinnerFrame);
      const stageStr = padEndWidth(stageLabel(running.column), 4);
      const ageStr   = running.ageMin != null ? `${running.ageMin}분` : '';
      const inner    = `${sp} ${running.id}  ${stageStr} ${ageStr}`;
      lines.push(`    ${C.dim}└${C.reset} ${C.green}${truncateWidth(inner, Math.max(4, w - 6))}${C.reset}`);
    }
  }
  return lines;
}

// ── CI 큐 섹션 ───────────────────────────────────────────────────────────

function renderCiPool(view, opts, state = {}) {
  const { ciPools, ciRunnerPools } = view;
  const { terminalWidth: w = 100 } = opts;
  const { spinnerFrame = 0 } = state;

  const iterPools  = ciPools instanceof Map ? ciPools
    : (ciPools ? new Map(Object.entries(ciPools)) : new Map());
  const iterRunner = ciRunnerPools instanceof Map ? ciRunnerPools
    : (ciRunnerPools ? new Map(Object.entries(ciRunnerPools)) : new Map());

  // 제목: CI 큐 (SH n · SL n · FH n · FL n)
  const countParts = POOL_ORDER.map(p => {
    const abbr = POOL_ABBR[p] || p;
    const data = iterPools.get(p);
    const n    = data?.queued || 0;
    return `${abbr} ${n}`;
  }).join(' · ');

  const hasCloud = (view.allJson?.ci?.data?.cloud_in_progress || []).length > 0;
  const titleStr = hasCloud
    ? `CI 큐 (${countParts} · CL ${(view.allJson?.ci?.data?.cloud_in_progress || []).length})`
    : `CI 큐 (${countParts})`;

  const hasActivity = [...iterPools.values()].some(d =>
    d.queued > 0 || d.offlineReason || (d.inProgressItems || []).length > 0
  );

  if (!hasActivity) return [sectionHr(titleStr, w)];

  const POOL_LABEL_W = 15;
  const lines = [sectionHr(titleStr, w)];

  for (const pool of POOL_ORDER) {
    const data      = iterPools.get(pool);
    const runnerSt  = iterRunner.get(pool)?.status || 'unknown';
    const labelPad  = padEndWidth(pool, POOL_LABEL_W);
    const isCong    = data?.congested;

    if (!data) { lines.push(`  ${labelPad}  —`); continue; }

    if (data.offlineReason) {
      lines.push(
        `  ${C.red}${labelPad}${C.reset}  ${C.red}${truncateWidth(data.offlineReason, Math.max(4, w - POOL_LABEL_W - 6))}${C.reset}`
      );
    } else if (data.queued === 0 && (data.inProgressItems || []).length === 0) {
      lines.push(`  ${labelPad}  —`);
    } else {
      // 대기 칩
      let chipsStr = '';
      for (const pr of (data.queuedPrs || [])) {
        const prId   = `#${pr}`;
        const minStr = data.oldestMin != null ? ` ${data.oldestMin}분` : '';
        const chip   = `[${prId}${minStr}]`;
        chipsStr += isCong ? `${C.red}${chip}${C.reset}` : chip;
      }
      if (chipsStr || data.queued > 0) {
        lines.push(`  ${isCong ? C.red + labelPad + C.reset : labelPad}  ${truncateWidth(chipsStr, Math.max(4, w - POOL_LABEL_W - 6))}`);
      } else {
        lines.push(`  ${labelPad}  —`);
      }
    }

    // 실행 중 └ 행
    for (const item of (data.inProgressItems || [])) {
      const sp      = spinnerChar(spinnerFrame);
      const idStr   = item.promptId || `#${item.prNumber}`;
      const rk      = item.runnerKind || '';
      const ageStr  = item.ageMin != null ? ` ${item.ageMin}분` : '';
      const inner   = `${sp} ${idStr}  ${rk}${ageStr}`;
      lines.push(`    ${C.dim}└${C.reset} ${truncateWidth(inner, Math.max(4, w - 6))}`);
    }
  }

  // CLOUD 줄 (있을 때만)
  if (hasCloud) {
    const cloudItems = view.allJson?.ci?.data?.cloud_in_progress || [];
    const cl_label   = padEndWidth('CLOUD', POOL_LABEL_W);
    lines.push(`  ${cl_label}  ${cloudItems.length}건 실행 중`);
  }

  return lines;
}

// ── 진행 중 섹션 ──────────────────────────────────────────────────────────

function formatInProgressRow(c, w) {
  const col    = cl(c.level);
  const mark   = c.mark || '●';
  const strip  = stageStrip(c.column);
  const stage  = padEndWidth(stageLabel(c.column), 6);
  const ageStr = padEndWidth(typeof c.ageMin === 'number' ? `${c.ageMin}분` : '', 4);
  // PR# 포맷: #257 (공백 없음, 오른쪽 정렬)
  const prNum  = c.extra?.pr?.number;
  const prPart = prNum ? `#${prNum}`.padStart(5) + '  ' : '       ';
  const FIXED  = displayWidth(mark) + 1 + 12 + 1 + 2 + 2 + displayWidth(strip) + 2
    + displayWidth(stage) + 2 + displayWidth(ageStr) + 2 + displayWidth(prPart);

  // R0 리뷰 결과 칩
  let reviewChip = '';
  if (c.reviewResult === 'APPROVE') reviewChip = ` ${C.green}[APPROVE]${C.reset}`;
  else if (c.reviewResult === 'CHANGES') reviewChip = ` ${C.yellow}[CHANGES]${C.reset}`;
  const chipW = c.reviewResult ? displayWidth(`[${c.reviewResult}]`) + 1 : 0;

  const title  = truncateWidth(c.title || '', Math.max(4, w - FIXED - chipW));
  return `${col}${mark}${C.reset} ${padEndWidth(c.id, 12)} ${padEndWidth(c.hub || '', 2)}  ${strip}  ${stage}  ${ageStr}  ${prPart}${reviewChip}${title}`;
}

function renderInProgress(view, opts, state = {}) {
  const { inProgress = [] } = view;
  const { terminalWidth: w = 100 } = opts;
  const { cursor = -1, filter = '' } = state;

  if (inProgress.length === 0) return [sectionHr('진행 중 (없음)', w)];

  const filtered = filter
    ? inProgress.filter(c => {
        const q = filter.toLowerCase();
        return c.id.toLowerCase().includes(q) || (c.title || '').toLowerCase().includes(q);
      })
    : inProgress;

  const lines = [sectionHr(`진행 중 (${inProgress.length})`, w)];
  filtered.forEach((c, i) => {
    const row = formatInProgressRow(c, w);
    lines.push(i === cursor ? `\x1b[7m${stripAnsi(row)}\x1b[27m` : row);
  });
  if (filter && filtered.length === 0) {
    lines.push(`${C.dim}  (필터 "${filter}" — 일치 없음)${C.reset}`);
  }
  return lines;
}

function renderDoneToday(view, opts, state = {}) {
  const { doneToday = 0 } = view;
  const { terminalWidth: w = 100 } = opts;
  const hint = (!state.doneExpanded && doneToday > 0) ? ' (Enter 펼치기)' : '';
  return [sectionHr(`오늘 완료 ${doneToday}${hint}`, w)];
}

function renderKeyHints(state = {}) {
  if (state.filter !== undefined && state.filter !== '') {
    return [`${C.dim} 필터: "${state.filter}"_  · ESC 취소 · Enter 적용${C.reset}`];
  }
  return [`${C.dim} j/k 이동 · Enter 상세 · / 필터 · r 새로고침 · q 종료${C.reset}`];
}

export function renderDetailPanel(card, opts = {}) {
  if (!card) return [];
  const { terminalWidth: w = 100 } = opts;
  const col = cl(card.level);
  return [
    '═'.repeat(Math.max(10, w)),
    `${col}${card.mark || '●'} ${card.id}${C.reset}  ${card.title || ''}`,
    `허브: ${card.hub || '-'}  단계: ${stageLabel(card.column)}  경과: ${card.ageMin ?? '-'}분`,
    ...(card.extra?.pr?.number ? [`PR: #${card.extra.pr.number}`] : []),
    ...(card.reason ? [`이유: ${col}${card.reason}${C.reset}`] : []),
    `단계 띠: ${stageStrip(card.column)}`,
    '─'.repeat(Math.max(10, w)),
    `${C.dim} Enter 닫기 · j/k 이동${C.reset}`,
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
//  박스 칸반 (--board, M2-1125-H 호환)
// ═══════════════════════════════════════════════════════════════════════════

function renderCardBlock(card, width) {
  const inner = width - 2;
  const col   = cl(card.level);
  const mark  = card.mark || '●';
  const idPlain = `${mark}${card.id}`;
  const idStr   = `${col}${truncateWidth(idPlain, inner)}${C.reset}`;
  const titleTrunc = truncateWidth(card.title || '', inner - 1);
  const hubTag = card.hub ? `[${card.hub}]` : '';
  const age    = typeof card.ageMin === 'number' ? `${card.ageMin}분` : '';
  const footTrunc = truncateWidth(`${hubTag}  ${age} ${mark}`, inner - 1);
  const lines = [
    `│${padEndWidth(idStr, inner)}│`,
    `│${padEndWidth(' ' + titleTrunc, inner)}│`,
    `│${padEndWidth(` ${col}${footTrunc}${C.reset}`, inner)}│`,
  ];
  if (card.reason && card.level !== 'green') {
    const r = truncateWidth(card.reason, inner - 2);
    lines.push(`│${padEndWidth(` ${col}${r}${C.reset}`, inner)}│`);
  }
  return lines;
}

function renderEmptyCard(width) {
  const inner = width - 2;
  return [
    `│${padEndWidth('', inner)}│`,
    `│${padEndWidth('  (비어있음)', inner)}│`,
    `│${padEndWidth('', inner)}│`,
  ];
}

function renderColumnHeader(col, count, width) {
  const label = COLUMN_LABELS[col] || col;
  return padEndWidth(`[ ${label}(${count}) ]`, width);
}

function renderGridRow(columnsBatch, cardsByCol, widths, hubOrder) {
  const topRows = columnsBatch.map((_, i) => '┌' + '─'.repeat(widths[i] - 2) + '┐');
  const botRows = columnsBatch.map((_, i) => '└' + '─'.repeat(widths[i] - 2) + '┘');

  const cardBlocks = columnsBatch.map((col, i) => {
    const cards = cardsByCol.get(col) || [];
    if (cards.length === 0) return [renderEmptyCard(widths[i])];
    if (col === 'hub') {
      const stacked = [];
      for (const c of cards) {
        stacked.push(...renderCardBlock(c, widths[i]));
        for (const qi of (hubOrder?.[c.hub] || [])) {
          const qCard = (cardsByCol.get('queue') || []).find(x => x.id === qi);
          if (!qCard) continue;
          stacked.push(`├${'─'.repeat(widths[i] - 2)}┤`);
          stacked.push(...renderCardBlock(qCard, widths[i]));
        }
        stacked.push('');
      }
      return [stacked];
    }
    return cards.map(c => renderCardBlock(c, widths[i]));
  });

  const columnLines = cardBlocks.map(blocks => {
    const flat = [];
    for (const b of blocks) if (Array.isArray(b)) flat.push(...b);
    return flat;
  });

  const maxH = Math.max(...columnLines.map(l => l.length));
  for (let i = 0; i < columnLines.length; i++) {
    while (columnLines[i].length < maxH) columnLines[i].push(' '.repeat(widths[i]));
  }

  const heads = columnsBatch.map((col, i) =>
    renderColumnHeader(col, (cardsByCol.get(col) || []).length, widths[i]));

  const out = [heads.join('  '), topRows.join('  ')];
  for (let r = 0; r < maxH; r++) {
    out.push(columnLines.map((lines, i) => {
      const line = lines[r] || '';
      if (!line || line.trim() === '') return ' '.repeat(widths[i]);
      return padEndWidth(line, widths[i]);
    }).join('  '));
  }
  out.push(botRows.join('  '));
  return out;
}

function renderTopBar(view, options, narrow = false) {
  const { timeStr, version = '2.0', alertCount = 0, workCount = view.cards.length, extraKeys = '' } = options;
  const alertStr = alertCount > 0
    ? `${C.red}■ 경보 ${alertCount}건${C.reset}`
    : `${C.green}● 정상${C.reset}`;
  const left = `${C.bold}ci-watch v${version}${C.reset}  ${timeStr || ''}  ${alertStr}`;
  const mid  = `| 작업 ${workCount}건  완료(오늘) ${view.doneToday}`;
  const right = narrow ? '' : `[q]종료 [r]새로고침${extraKeys}`;
  if (narrow) return `${left}  ${mid}`;
  return `${left}  ${mid}                    ${right}`.trimEnd();
}

function renderAlertsSection(view) {
  if (!view.cards.some(c => c.level !== 'green') && (view.anomalies?.length ?? 0) === 0) {
    return [C.dim + '경보 없음' + C.reset];
  }
  return view.cards
    .filter(c => c.level !== 'green')
    .map(c => `${cl(c.level)}${c.mark}${C.reset} ${c.id}  ${COLUMN_LABELS[c.column]} ${c.ageMin}분${c.reason ? ' · ' + c.reason : ''}`);
}

function evenWidths(total, n, gap, minWidth) {
  const avail = total - gap * (n - 1);
  const each  = Math.max(minWidth, Math.floor(avail / n));
  const widths = new Array(n).fill(each);
  const used = each * n + gap * (n - 1);
  if (used < total) widths[widths.length - 1] += (total - used);
  return widths;
}

function groupCardsByColumn(cards) {
  const m = new Map();
  for (const col of COLUMNS) m.set(col, []);
  for (const c of cards) {
    const list = m.get(c.column) || [];
    list.push(c);
    m.set(c.column, list);
  }
  for (const [, list] of m) list.sort((a, b) => (b.ageMin ?? 0) - (a.ageMin ?? 0));
  return m;
}

function renderWide(view, options) {
  const { terminalWidth = 100 } = options;
  const rowCols = [
    ['queue', 'hub', 'report', 'pr', 'ci_pending'],
    ['ci_running', 'ci_result', 'review', 'merge'],
  ];
  const gap = 2;
  const widthsTop = evenWidths(terminalWidth, rowCols[0].length, gap, 18);
  const widthsBot = evenWidths(terminalWidth, rowCols[1].length, gap, 22);
  const cardsByCol = groupCardsByColumn(view.cards);
  const lines = [];
  lines.push(renderTopBar(view, options));
  lines.push(hr(terminalWidth).replace(/─/g, '━'));
  lines.push(...renderGridRow(rowCols[0], cardsByCol, widthsTop, view.hubOrder));
  lines.push('');
  lines.push(...renderGridRow(rowCols[1], cardsByCol, widthsBot, view.hubOrder));
  lines.push(hr(terminalWidth).replace(/─/g, '━'));
  lines.push(...renderAlertsSection(view));
  return lines;
}

function renderNarrow(view, options) {
  const { terminalWidth = 60 } = options;
  const w = terminalWidth;
  const cardsByCol = groupCardsByColumn(view.cards);
  const lines = [];
  lines.push(renderTopBar(view, options, true));
  lines.push('─'.repeat(w));
  for (const col of COLUMNS) {
    const cards = cardsByCol.get(col) || [];
    const label = COLUMN_LABELS[col];
    if (cards.length === 0) { lines.push(`${label}(0)  --`); continue; }
    lines.push(`${label}(${cards.length})`);
    for (const c of cards) {
      const col_ = cl(c.level);
      const ageStr = typeof c.ageMin === 'number' ? `${c.ageMin}분` : '';
      const markW  = displayWidth(c.mark || '●');
      const fixedW = 2 + markW + displayWidth(c.id) + 2 + 2 + displayWidth(ageStr);
      const row = `  ${col_}${c.mark || '●'}${c.id}${C.reset}  ${truncateWidth(c.title || '', Math.max(0, w - fixedW))}  ${ageStr}`;
      lines.push(row);
      if (c.reason && c.level !== 'green') {
        lines.push(`      ${col_}${c.mark || '●'}${truncateWidth(c.reason, Math.max(0, w - 8))}${C.reset}`);
      }
    }
  }
  lines.push('─'.repeat(w));
  lines.push(...renderAlertsSection(view));
  return lines;
}

// ═══════════════════════════════════════════════════════════════════════════
//  공개 진입점
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {object} view  buildExtendedView() 또는 buildPipelineView() 결과
 * @param {object} opts  { terminalWidth?, timeStr?, version?, alertCount?, extraKeys?, board? }
 *   board=true → 9칸 박스 칸반 (M2-1125-H 호환)
 * @param {object} state { cursor?, filter?, doneExpanded?, detailCard?, spinnerFrame? }
 */
export function renderV2(view, opts = {}, state = {}) {
  const width = opts.terminalWidth || 100;

  // 박스 칸반 모드 (--board, M2-1125-H 호환)
  if (opts.board) {
    if (width < 60) return renderNarrow(view, { ...opts, terminalWidth: width });
    return renderWide(view, { ...opts, terminalWidth: width });
  }

  // 새 섹션 레이아웃 (기본)
  const v = normalizeView(view);
  const { detailCard = null } = state;

  const lines = [];
  lines.push(renderSummaryBar(v, { ...opts, terminalWidth: width }));
  const originLine = renderDataOriginLine(v.dataOrigin);
  if (originLine) lines.push(originLine);
  lines.push(...renderCaution(v, { terminalWidth: width }));
  lines.push(...renderHubQueue(v, { terminalWidth: width }, state));
  lines.push(...renderCiPool(v, { terminalWidth: width }, state));
  lines.push(...renderInProgress(v, { terminalWidth: width }, state));
  lines.push(...renderDoneToday(v, { terminalWidth: width }, state));
  lines.push(...renderKeyHints(state));

  if (detailCard) {
    lines.push(...renderDetailPanel(detailCard, { terminalWidth: width }));
  }

  return lines;
}
