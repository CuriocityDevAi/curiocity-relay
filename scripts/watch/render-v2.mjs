// scripts/watch/render-v2.mjs  ci-watch v2.0 · 9칸 칸반 렌더러
// ASCII · ANSI 색 · 100자+40줄 기준 가로 레이아웃 · 60자 미만 세로 쌓기.

import { COLUMNS, COLUMN_LABELS } from './thresholds.mjs';

const C = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
};

const MARK_COLOR = { green: C.green, yellow: C.yellow, red: C.red };

function colorForMark(level) {
  return MARK_COLOR[level] || '';
}

function truncate(s, n) {
  if (!s) return '';
  if ([...s].length <= n) return s;
  return [...s].slice(0, Math.max(0, n - 1)).join('') + '…';
}

function padEnd(s, n) {
  const visible = stripAnsi(s);
  const w = [...visible].length;
  if (w >= n) return s;
  return s + ' '.repeat(n - w);
}

function stripAnsi(s) {
  return String(s || '').replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 1칸 카드 블록 생성 (가로 레이아웃용).
 * 반환: string[] (각 요소 = 카드의 1줄). 카드 외곽은 fixed 폭.
 */
function renderCardBlock(card, width) {
  const inner = width - 2; // 테두리 2
  const col = colorForMark(card.level);
  const mark = card.mark || '●';
  const idStr = `${col}${mark}${card.id}${C.reset}`;
  const title = truncate(card.title || '', inner);
  const hubTag = card.hub ? `[${card.hub}]` : '';
  const age = typeof card.ageMin === 'number' ? `${card.ageMin}분` : '';
  const foot = truncate(`${hubTag}  ${age} ${col}${mark}${C.reset}`, inner + ansiOverhead(col, C.reset));
  const lines = [
    `│${padEnd(idStr, inner + ansiOverhead(col, C.reset))}│`,
    `│${padEnd(' ' + title, inner)}│`,
    `│${padEnd(' ' + foot, inner + ansiOverhead(col, C.reset))}│`,
  ];
  if (card.reason && card.level !== 'green') {
    const r = truncate(card.reason, inner - 1);
    lines.push(`│${padEnd(' ' + col + r + C.reset, inner + ansiOverhead(col, C.reset))}│`);
  }
  return lines;
}

function ansiOverhead(open, close) {
  return open.length + close.length;
}

function renderEmptyCard(width) {
  const inner = width - 2;
  return [
    `│${padEnd('', inner)}│`,
    `│${padEnd('  (비어있음)', inner)}│`,
    `│${padEnd('', inner)}│`,
  ];
}

function renderColumnHeader(col, count, width) {
  const label = COLUMN_LABELS[col] || col;
  return padEnd(`[ ${label}(${count}) ]`, width);
}

function renderGridRow(columnsBatch, cardsByCol, widths, hubOrder, hubCurrents) {
  const heads = columnsBatch.map((col, i) => renderColumnHeader(col, (cardsByCol.get(col) || []).length, widths[i]));
  const topRows = columnsBatch.map((col, i) => '┌' + '─'.repeat(widths[i] - 2) + '┐');
  const botRows = columnsBatch.map((col, i) => '└' + '─'.repeat(widths[i] - 2) + '┘');

  // 각 칸별로 카드 블록 리스트 만들기 (허브 칸은 current + queue 1·2 묶음)
  const cardBlocks = columnsBatch.map((col, i) => {
    const cards = cardsByCol.get(col) || [];
    if (cards.length === 0) return [renderEmptyCard(widths[i])];

    // hub 칸: 현 작업 카드 아래에 대기 1·2 를 "연결" 블록으로.
    if (col === 'hub') {
      const blocks = cards.map(c => renderCardBlock(c, widths[i]));
      // 각 허브 current 뒤에 그 허브의 대기 카드 1·2 를 "├── 분할선 ──" 로 이어붙임
      const stacked = [];
      for (const c of cards) {
        const myBlock = renderCardBlock(c, widths[i]);
        stacked.push(...myBlock);
        const queued = (hubOrder?.[c.hub] || []);
        for (let qi = 0; qi < queued.length; qi++) {
          const qCard = (cardsByCol.get('queue') || []).find(x => x.id === queued[qi]);
          if (!qCard) continue;
          stacked.push(`├${'─'.repeat(widths[i] - 2)}┤`);
          stacked.push(...renderCardBlock(qCard, widths[i]));
        }
        stacked.push(''); // gap
      }
      return [stacked];
    }
    return cards.map(c => renderCardBlock(c, widths[i]));
  });

  // 열별 라인을 flatten. 열 높이를 맞춘다.
  const columnLines = cardBlocks.map((blocks, i) => {
    const flat = [];
    for (const b of blocks) {
      if (Array.isArray(b)) flat.push(...b);
    }
    return flat;
  });

  const maxH = Math.max(...columnLines.map(l => l.length));
  for (let i = 0; i < columnLines.length; i++) {
    while (columnLines[i].length < maxH) columnLines[i].push(' '.repeat(widths[i]));
  }

  const out = [];
  out.push(heads.join('  '));
  out.push(topRows.join('  '));
  for (let r = 0; r < maxH; r++) {
    const row = columnLines.map((lines, i) => {
      const line = lines[r] || '';
      // 빈 라인/간격은 공백
      if (!line || line.trim() === '') return ' '.repeat(widths[i]);
      // 내부 라인은 카드 테두리가 이미 포함
      if (line.startsWith('│') || line.startsWith('├')) return padEnd(line, widths[i]);
      return padEnd(line, widths[i]);
    }).join('  ');
    out.push(row);
  }
  out.push(botRows.join('  '));
  return out;
}

/**
 * 평상시 가로 레이아웃: 100자 기준 2행 × 5·4 열 분할.
 */
function renderWide(view, options) {
  const { terminalWidth = 100 } = options;
  const rowCols = [
    ['queue', 'hub', 'report', 'pr', 'ci_pending'],
    ['ci_running', 'ci_result', 'review', 'merge'],
  ];
  // 열 폭: 최소 18 · 균등 분할
  const gap = 2;
  const widthsTop = evenWidths(terminalWidth, rowCols[0].length, gap, 18);
  const widthsBot = evenWidths(terminalWidth, rowCols[1].length, gap, 22);

  const cardsByCol = groupCardsByColumn(view.cards);

  const lines = [];
  lines.push(renderTopBar(view, options));
  lines.push(hr(terminalWidth));
  lines.push(...renderGridRow(rowCols[0], cardsByCol, widthsTop, view.hubOrder, view.hubCurrents));
  lines.push('');
  lines.push(...renderGridRow(rowCols[1], cardsByCol, widthsBot, view.hubOrder, view.hubCurrents));
  lines.push(hr(terminalWidth));
  lines.push(...renderAlertsSection(view));
  return lines;
}

/**
 * 좁은 단말 세로 쌓기 (60자 미만).
 */
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
    if (cards.length === 0) {
      lines.push(`${label}(0)  --`);
      continue;
    }
    lines.push(`${label}(${cards.length})`);
    for (const c of cards) {
      const col_ = colorForMark(c.level);
      const row = `  ${col_}${c.mark}${c.id}${C.reset}  ${truncate(c.title, w - 14 - c.id.length)}  ${c.ageMin}분`;
      lines.push(row);
      if (c.reason && c.level !== 'green') lines.push(`      ${col_}${c.mark}${c.reason}${C.reset}`);
    }
  }
  lines.push('─'.repeat(w));
  lines.push(...renderAlertsSection(view));
  return lines;
}

function renderTopBar(view, options, narrow = false) {
  const { timeStr, version = '2.0', alertCount = 0, workCount = view.cards.length, extraKeys = '' } = options;
  const alertStr = alertCount > 0
    ? `${C.red}■ 경보 ${alertCount}건${C.reset}`
    : `${C.green}● 정상${C.reset}`;
  const left = `${C.bold}ci-watch v${version}${C.reset}  ${timeStr || ''}  ${alertStr}`;
  const mid = `| 작업 ${workCount}건  완료(오늘) ${view.doneToday}`;
  const right = narrow ? '' : `[q]종료 [r]새로고침${extraKeys}`;
  if (narrow) return `${left}  ${mid}`;
  return `${left}  ${mid}                    ${right}`.trimEnd();
}

function renderAlertsSection(view) {
  if (!view.cards.some(c => c.level !== 'green') && (view.anomalies?.length ?? 0) === 0) {
    return [C.dim + '경보 없음' + C.reset];
  }
  const lines = [];
  for (const c of view.cards) {
    if (c.level === 'green') continue;
    const col = colorForMark(c.level);
    lines.push(`${col}${c.mark}${C.reset} ${c.id}  ${COLUMN_LABELS[c.column]} ${c.ageMin}분${c.reason ? ' · ' + c.reason : ''}`);
  }
  return lines;
}

function hr(w) {
  return '━'.repeat(Math.max(10, w));
}

function evenWidths(total, n, gap, minWidth) {
  const avail = total - gap * (n - 1);
  const each = Math.max(minWidth, Math.floor(avail / n));
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
  for (const [k, list] of m) list.sort((a, b) => (b.ageMin ?? 0) - (a.ageMin ?? 0));
  return m;
}

/**
 * 공개 진입점.
 * @param {object} view buildPipelineView() 결과
 * @param {object} opts { terminalWidth?: number, timeStr?: string, version?: string, alertCount?: number, extraKeys?: string }
 */
export function renderV2(view, opts = {}) {
  const width = opts.terminalWidth || 100;
  if (width < 60) return renderNarrow(view, opts);
  return renderWide(view, { ...opts, terminalWidth: width });
}

export { stripAnsi };
