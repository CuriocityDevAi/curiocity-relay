// scripts/watch/render-v2.mjs  ci-watch v2.0 · 렌더러
// 기본: 줄형 보기(한 줄씩). --board 옵션: 9칸 박스 칸반.
// 표시 폭은 EAW 기준(text-width.mjs) — 한글·전각·이모지 2칸 올바르게 처리.

import { COLUMNS, COLUMN_LABELS } from './thresholds.mjs';
import {
  stripAnsi, displayWidth, truncateWidth, padEndWidth,
} from './text-width.mjs';

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

// ── 카드 블록 (박스 칸반용) ───────────────────────────────────────────────

/**
 * 1칸 카드 블록 생성 (가로 레이아웃용).
 * 반환: string[] (각 요소 = 카드의 1줄). 각 줄의 표시 폭 = width.
 */
function renderCardBlock(card, width) {
  const inner = width - 2; // 테두리 2칸(│…│)
  const cl = colorForMark(card.level);
  const mark = card.mark || '●';

  // ID 줄: mark(2칸) + id
  const idPlain = `${mark}${card.id}`;
  const idStr = `${cl}${truncateWidth(idPlain, inner)}${C.reset}`;

  // 제목 줄: 앞에 공백 1칸
  const titleTrunc = truncateWidth(card.title || '', inner - 1);

  // 하단 줄: hub + age + mark
  const hubTag = card.hub ? `[${card.hub}]` : '';
  const age = typeof card.ageMin === 'number' ? `${card.ageMin}분` : '';
  const footTrunc = truncateWidth(`${hubTag}  ${age} ${mark}`, inner - 1);

  const lines = [
    `│${padEndWidth(idStr, inner)}│`,
    `│${padEndWidth(' ' + titleTrunc, inner)}│`,
    `│${padEndWidth(` ${cl}${footTrunc}${C.reset}`, inner)}│`,
  ];

  if (card.reason && card.level !== 'green') {
    const r = truncateWidth(card.reason, inner - 2);
    lines.push(`│${padEndWidth(` ${cl}${r}${C.reset}`, inner)}│`);
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
  const heads = columnsBatch.map((col, i) =>
    renderColumnHeader(col, (cardsByCol.get(col) || []).length, widths[i]));
  const topRows = columnsBatch.map((_, i) => '┌' + '─'.repeat(widths[i] - 2) + '┐');
  const botRows = columnsBatch.map((_, i) => '└' + '─'.repeat(widths[i] - 2) + '┘');

  const cardBlocks = columnsBatch.map((col, i) => {
    const cards = cardsByCol.get(col) || [];
    if (cards.length === 0) return [renderEmptyCard(widths[i])];

    if (col === 'hub') {
      const stacked = [];
      for (const c of cards) {
        stacked.push(...renderCardBlock(c, widths[i]));
        const queued = hubOrder?.[c.hub] || [];
        for (const qi of queued) {
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

  // 각 칸별 줄 배열 평탄화
  const columnLines = cardBlocks.map(blocks => {
    const flat = [];
    for (const b of blocks) {
      if (Array.isArray(b)) flat.push(...b);
    }
    return flat;
  });

  // 칸 높이를 맞춤
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
      if (!line || line.trim() === '') return ' '.repeat(widths[i]);
      return padEndWidth(line, widths[i]);
    }).join('  ');
    out.push(row);
  }
  out.push(botRows.join('  '));
  return out;
}

// ── 박스 칸반 (--board) ──────────────────────────────────────────────────

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
  lines.push(hr(terminalWidth));
  lines.push(...renderGridRow(rowCols[0], cardsByCol, widthsTop, view.hubOrder));
  lines.push('');
  lines.push(...renderGridRow(rowCols[1], cardsByCol, widthsBot, view.hubOrder));
  lines.push(hr(terminalWidth));
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
    if (cards.length === 0) {
      lines.push(`${label}(0)  --`);
      continue;
    }
    lines.push(`${label}(${cards.length})`);
    for (const c of cards) {
      const cl = colorForMark(c.level);
      const ageStr = typeof c.ageMin === 'number' ? `${c.ageMin}분` : '';
      const markW = displayWidth(c.mark || '●');
      const fixedW = 2 + markW + displayWidth(c.id) + 2 + 2 + displayWidth(ageStr);
      const titleW = Math.max(0, w - fixedW);
      const row = `  ${cl}${c.mark || '●'}${c.id}${C.reset}  ${truncateWidth(c.title || '', titleW)}  ${ageStr}`;
      lines.push(row);
      if (c.reason && c.level !== 'green') {
        lines.push(`      ${cl}${c.mark || '●'}${truncateWidth(c.reason, Math.max(0, w - 8))}${C.reset}`);
      }
    }
  }
  lines.push('─'.repeat(w));
  lines.push(...renderAlertsSection(view));
  return lines;
}

// ── 줄형 보기 (기본) ─────────────────────────────────────────────────────

/**
 * 기본 줄형 보기: 단계 → 카드 한 줄씩.
 * 각 줄: 색 기호 · ID · 단계 · [허브] · 분 · 한 줄 제목·이유.
 */
function renderLine(view, options) {
  const { terminalWidth = 100 } = options;
  const w = terminalWidth;
  const lines = [];
  lines.push(renderTopBar(view, options));
  lines.push(hr(w));

  if (view.cards.length === 0) {
    lines.push(C.dim + '  작업 없음' + C.reset);
  } else {
    // 단계 순서대로 정렬
    const sorted = [...view.cards].sort(
      (a, b) => COLUMNS.indexOf(a.column) - COLUMNS.indexOf(b.column)
    );

    // 고정 열 폭: mark=2, id=12, stage=8, hub=5, age=5
    // 사이 공백: 1씩 × 5 = 5
    // 고정 합계 = 2+1+12+1+8+1+5+1+5+1 = 37
    const FIXED = 37;
    const remaining = Math.max(10, w - FIXED);

    for (const c of sorted) {
      const cl = colorForMark(c.level);
      const markStr   = `${cl}${c.mark || '●'}${C.reset}`;
      const idStr     = padEndWidth(c.id, 12);
      const stageStr  = padEndWidth(COLUMN_LABELS[c.column] || c.column, 8);
      const hubStr    = padEndWidth(c.hub ? `[${c.hub}]` : '', 5);
      const ageStr    = padEndWidth(typeof c.ageMin === 'number' ? `${c.ageMin}분` : '', 5);
      const reasonPart = c.reason && c.level !== 'green' ? ` · ${c.reason}` : '';
      const fullText  = truncateWidth((c.title || '') + reasonPart, remaining);
      const textStr   = c.level !== 'green' ? `${cl}${fullText}${C.reset}` : fullText;

      lines.push(`${markStr} ${idStr} ${stageStr} ${hubStr} ${ageStr} ${textStr}`);
    }
  }

  lines.push(hr(w));
  lines.push(...renderAlertsSection(view));
  return lines;
}

// ── 공유 헬퍼 ────────────────────────────────────────────────────────────

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
    const cl = colorForMark(c.level);
    lines.push(`${cl}${c.mark}${C.reset} ${c.id}  ${COLUMN_LABELS[c.column]} ${c.ageMin}분${c.reason ? ' · ' + c.reason : ''}`);
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
  for (const [, list] of m) list.sort((a, b) => (b.ageMin ?? 0) - (a.ageMin ?? 0));
  return m;
}

// ── 공개 진입점 ──────────────────────────────────────────────────────────

/**
 * @param {object} view buildPipelineView() 결과
 * @param {object} opts { terminalWidth?, timeStr?, version?, alertCount?, extraKeys?, board? }
 *   board=true → 9칸 박스 칸반 (기본값 false → 줄형 보기)
 */
export function renderV2(view, opts = {}) {
  const width = opts.terminalWidth || 100;
  if (opts.board) {
    if (width < 60) return renderNarrow(view, { ...opts, terminalWidth: width });
    return renderWide(view, { ...opts, terminalWidth: width });
  }
  return renderLine(view, { ...opts, terminalWidth: width });
}

export { stripAnsi };
