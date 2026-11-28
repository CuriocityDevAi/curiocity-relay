// scripts/ci-watch-web/ui.js  M2-1128-D
// Pure JS renderer — no deps — input: /api/state JSON — DOM: textContent only
// Used by both web server (index.html) and oke pin-artifact

(function (root) {
  'use strict';

  // ── constants ────────────────────────────────────────────────────────────────
  const STAGES = ['큐', '작업', '리포트', 'PR', 'CI대기', 'CI실행', 'CI결과', '리뷰', '머지'];
  const COLS   = ['queue', 'hub', 'report', 'pr', 'ci_pending', 'ci_running', 'ci_result', 'review', 'merge'];
  const HUBS   = ['m0', 'm1', 'm2', 'm3', 'r0'];
  const SLOW_MIN  = 20;  // minutes in a stage before yellow
  const RED_MIN   = 45;  // minutes before red
  const DATA_DELAY_MS = 30_000;

  // ── DOM helpers ──────────────────────────────────────────────────────────────
  function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'cls') e.className = v;
      else if (k === 'txt') e.textContent = v;
      else if (k === 'onClick') e.addEventListener('click', v);
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null) continue;
      e.append(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }

  // ── state ────────────────────────────────────────────────────────────────────
  let _data = null;
  let _detail = null; // { type: 'hub'|'board'|'timeline'|'ci'|'alerts', key: any }
  let _alertsOpen = false;
  let _lastFetchMs = 0;

  // ── navigation ───────────────────────────────────────────────────────────────
  function showDetail(type, key) {
    _detail = { type, key };
    renderAll(_data);
  }
  function hideDetail() {
    _detail = null;
    renderAll(_data);
  }
  function toggleAlerts() {
    _alertsOpen = !_alertsOpen;
    renderAll(_data);
  }

  // ── header ───────────────────────────────────────────────────────────────────
  function renderHeader(d, isMobile) {
    const prog      = (d.pipelinePrompts || []).filter(p => p.column !== 'queue').length;
    const alertCnt  = (d.runnerAlerts || []).length;
    const mergedCnt = (d.pipelinePrompts || []).filter(p => p.column === 'merge').length;
    const runnerVer = d.allJson?.runner || '?';
    const claimCnt  = d.claimStartedCount ?? null;
    const mismatch  = claimCnt !== null && claimCnt !== prog;
    const delayed   = _lastFetchMs > 0 && (Date.now() - _lastFetchMs) > DATA_DELAY_MS;

    const hdr = el('header', { cls: 'cw-head' + (delayed ? ' cw-head-delayed' : '') });

    // Title + version
    hdr.append(el('span', { cls: 'cw-title', txt: 'ci-watch' }));
    hdr.append(el('span', { cls: 'cw-ver', txt: ` v${d.version || '?'}` }));

    if (!isMobile) {
      hdr.append(el('span', { cls: 'cw-time', txt: d.timeStr || '' }));
    }

    // Spinner
    hdr.append(el('span', { cls: 'cw-spin', id: 'cw-spin', txt: '⟳' }));
    hdr.append(el('span', { cls: 'cw-age', id: 'cw-age', txt: ' …' }));

    // Data delay warning
    if (delayed) {
      hdr.append(el('span', { cls: 'cw-badge cw-badge-warn', txt: '데이터 지연' }));
    }
    if (mismatch) {
      hdr.append(el('span', { cls: 'cw-badge cw-badge-dim', txt: '데이터 불일치' }));
    }

    if (isMobile) {
      // 3 pills for mobile
      hdr.append(pill(`진행 ${prog}`, prog > 0 ? 'prog' : 'dim', () => showDetail('board', null)));
      hdr.append(pill(`주의 ${alertCnt}`, alertCnt > 0 ? 'bad' : 'dim', () => showDetail('alerts', null)));
      hdr.append(pill(`v${runnerVer}`, 'dim', null));
    } else {
      // 4 pills for desktop
      hdr.append(pill(`●진행 ${prog}`, prog > 0 ? 'prog' : 'dim', null));
      hdr.append(pill(`■주의 ${alertCnt}`, alertCnt > 0 ? 'bad' : 'dim', toggleAlerts));
      hdr.append(pill(`✔머지 ${mergedCnt}`, 'ok', null));
      hdr.append(pill(`v${runnerVer}`, 'dim', null));
    }

    return hdr;
  }

  function pill(txt, variant, onClick) {
    const b = el('span', { cls: `cw-badge cw-badge-${variant}`, txt });
    if (onClick) {
      b.style.cursor = 'pointer';
      b.addEventListener('click', onClick);
    }
    return b;
  }

  // ── alerts panel (desktop expandable) ────────────────────────────────────────
  function renderAlertPanel(d) {
    if (!_alertsOpen) return null;
    const alerts = d.runnerAlerts || [];
    const panel = el('div', { cls: 'cw-alerts-panel' });
    if (!alerts.length) {
      panel.append(el('div', { cls: 'cw-dim', txt: '주의 없음' }));
      return panel;
    }
    for (const a of alerts) {
      panel.append(el('div', { cls: 'cw-alert-row', txt: `⚠ ${a.msg || String(a)}` }));
    }
    return panel;
  }

  // ── hub cards (desktop) ───────────────────────────────────────────────────────
  function renderHubCards(d) {
    const hubs = d.allJson?.hubs || {};
    const limits = d.queueLimits || {};
    const prompts = d.pipelinePrompts || [];

    const grid = el('div', { cls: 'cw-hub-cards' });
    for (const hub of HUBS) {
      const info  = hubs[hub] || {};
      const curId = info.current || null;
      const model = info.model  || null;

      // Find matching prompt card
      const card = curId ? prompts.find(p => p.id === curId) : null;
      const title = card?.title || null;
      const isActive = !!curId;

      let elapsedMin = null;
      if (isActive && info.started_at) {
        elapsedMin = Math.round((Date.now() - new Date(info.started_at).getTime()) / 60_000);
      }
      const limitMin = curId ? (limits[curId] || 60) : 60;
      const progress = elapsedMin !== null ? Math.min(100, (elapsedMin / limitMin) * 100) : 0;
      const isOver = elapsedMin !== null && elapsedMin > limitMin;

      const hubCard = el('div', {
        cls: `cw-hub-card${isActive ? ' cw-hub-card-active' : ''}`,
      });

      // Hub name + spinner row
      const topRow = el('div', { cls: 'cw-hub-card-top' });
      topRow.append(el('span', { cls: 'cw-hub-name', txt: hub }));
      if (model) topRow.append(el('span', { cls: 'cw-hub-model', txt: model }));
      if (isActive) topRow.append(el('span', { cls: 'cw-hub-spinner', txt: '⟳' }));
      hubCard.append(topRow);

      if (isActive && curId) {
        hubCard.append(el('div', { cls: 'cw-hub-id', txt: curId }));
        if (title) hubCard.append(el('div', { cls: 'cw-hub-title', txt: title }));

        // Progress bar
        const barWrap = el('div', { cls: 'cw-hub-bar-wrap' });
        const barFill = el('div', { cls: `cw-hub-bar-fill${isOver ? ' cw-hub-bar-over' : ''}` });
        barFill.style.width = `${progress}%`;
        barWrap.append(barFill);
        hubCard.append(barWrap);
        hubCard.append(el('div', {
          cls: `cw-hub-progress${isOver ? ' cw-hub-over' : ''}`,
          txt: `${elapsedMin}분 / ${limitMin}분`,
        }));
      } else {
        hubCard.append(el('div', { cls: 'cw-hub-idle', txt: '쉼' }));
        // Show last ID if available
        const lastAct = info.last_activity || null;
        if (lastAct) {
          hubCard.append(el('div', { cls: 'cw-hub-last', txt: `마지막 ${formatAgo(lastAct)}` }));
        }
      }

      grid.append(hubCard);
    }
    return grid;
  }

  // ── 9-stage board ─────────────────────────────────────────────────────────────
  function renderBoard(d) {
    const prompts = (d.pipelinePrompts || []).filter(p => p.column !== 'queue');
    const wrap = el('div', { cls: 'cw-board-wrap' });
    const board = el('div', { cls: 'cw-board' });

    for (let i = 0; i < STAGES.length; i++) {
      const colKey = COLS[i];
      const col = el('div', { cls: 'cw-board-col' });
      col.append(el('div', { cls: 'cw-board-col-head', txt: `${STAGES[i]}` }));

      const cards = prompts.filter(p => p.column === colKey);
      if (!cards.length) {
        col.append(el('div', { cls: 'cw-board-empty', txt: '—' }));
      }
      for (const p of cards) {
        const age = p.ageMin ?? 0;
        const level = age > RED_MIN ? 'red' : age > SLOW_MIN ? 'yellow' : 'green';
        const cardEl = el('div', { cls: `cw-board-card cw-board-card-${level}` });
        cardEl.append(el('div', { cls: 'cw-board-card-id', txt: p.id || '' }));
        if (p.title) cardEl.append(el('div', { cls: 'cw-board-card-title', txt: p.title }));
        cardEl.append(el('div', { cls: 'cw-board-card-age', txt: `${age}분` }));

        // Click = PR or report link (https only)
        const link = extractLink(p);
        if (link) {
          cardEl.style.cursor = 'pointer';
          cardEl.addEventListener('click', () => window.open(link, '_blank'));
        }
        col.append(cardEl);
      }
      board.append(col);
    }
    wrap.append(board);
    return wrap;
  }

  function extractLink(p) {
    const prUrl = p.extra?.pr?.url;
    if (prUrl && prUrl.startsWith('https://')) return prUrl;
    return null;
  }

  // ── today timeline ────────────────────────────────────────────────────────────
  function renderTimeline(d) {
    const timeline = d.todayTimeline || {};
    const section = el('div', { cls: 'cw-section' });
    section.append(el('div', { cls: 'cw-section-head', txt: '오늘 타임라인' }));

    const nowMs = Date.now();
    // WIB 오늘 00:00 기준
    const wibNow = new Date(nowMs + 7 * 3600_000);
    const startOfDayMs = new Date(Date.UTC(
      wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate()
    )).getTime() - 7 * 3600_000;
    const endOfDayMs = startOfDayMs + 24 * 3600_000;
    const spanMs = endOfDayMs - startOfDayMs;

    const grid = el('div', { cls: 'cw-tl-grid' });

    for (const hub of HUBS) {
      const row = el('div', { cls: 'cw-tl-row' });
      row.append(el('span', { cls: 'cw-tl-hub', txt: hub }));
      const bar = el('div', { cls: 'cw-tl-bar' });

      const segs = timeline[hub] || [];
      for (const seg of segs) {
        const left = Math.max(0, (seg.startMs - startOfDayMs) / spanMs * 100);
        const right = Math.min(100, ((seg.endMs || nowMs) - startOfDayMs) / spanMs * 100);
        const width = Math.max(0.3, right - left);
        const type = segType(seg, d, hub);
        const segEl = el('div', { cls: `cw-tl-seg cw-tl-seg-${type}` });
        segEl.style.left = `${left}%`;
        segEl.style.width = `${width}%`;
        segEl.title = seg.id;
        bar.append(segEl);
      }
      row.append(bar);
      grid.append(row);
    }

    // Legend
    const legend = el('div', { cls: 'cw-tl-legend' });
    for (const [t, lbl] of [['coding', '코딩'], ['review', '리뷰(R0)'], ['diag', '진단'], ['fail', '실패']]) {
      legend.append(el('span', { cls: `cw-tl-seg cw-tl-seg-${t} cw-tl-legend-chip` }));
      legend.append(el('span', { cls: 'cw-dim', txt: ` ${lbl}  ` }));
    }

    section.append(grid);
    section.append(legend);
    return section;
  }

  function segType(seg, d, hub) {
    if (hub === 'r0') return 'review';
    // Find prompt title
    const p = (d.pipelinePrompts || []).find(x => x.id === seg.id);
    const title = p?.title || seg.id || '';
    if (title.includes('진단')) return 'diag';
    if (!seg.endMs) return 'coding'; // still running
    // Check if blocked (ageMin threshold)
    return 'coding';
  }

  // ── CI machines ───────────────────────────────────────────────────────────────
  function renderCIMachines(d) {
    const runState  = d.runState || {};
    const ciRunners = d.allJson?.ci_runners || [];
    const todayStats = d.todayMachineStats || {};

    const section = el('div', { cls: 'cw-section' });
    section.append(el('div', { cls: 'cw-section-head', txt: 'CI 기계' }));

    const grid = el('div', { cls: 'cw-ci-grid' });

    const machines = [
      { id: 'mbp', label: 'MacBook', kinds: ['mbp'] },
      { id: 'imac', label: 'iMac', kinds: ['imac'] },
      { id: 'cloud', label: '클라우드', kinds: ['cloud'] },
    ];

    const pools = [
      { repo: 'storeport', role: 'heavy', label: 'SP-H' },
      { repo: 'storeport', role: 'light', label: 'SP-L' },
      { repo: 'fork',      role: 'heavy', label: 'FK-H' },
      { repo: 'fork',      role: 'light', label: 'FK-L' },
    ];

    for (const mac of machines) {
      const col = el('div', { cls: 'cw-ci-col' });
      col.append(el('div', { cls: 'cw-ci-col-head', txt: mac.label }));

      const slots = el('div', { cls: 'cw-ci-slots' });
      for (const pool of pools) {
        const slot = el('div', { cls: 'cw-ci-slot' });
        const jobLabel = findRunningJob(mac.id, pool.repo, pool.role, runState, ciRunners);
        if (jobLabel) {
          slot.classList.add('cw-ci-slot-busy');
          slot.append(el('span', { cls: 'cw-ci-slot-name', txt: pool.label }));
          slot.append(el('span', { cls: 'cw-ci-job', txt: jobLabel }));
        } else {
          slot.classList.add('cw-ci-slot-idle');
          slot.append(el('span', { txt: pool.label }));
        }
        slots.append(slot);
      }
      col.append(slots);

      // Today count
      const jobs = mac.id === 'cloud'
        ? (d.cloudData?.realCount || 0)
        : (todayStats[mac.id]?.jobs || 0);
      col.append(el('div', { cls: 'cw-ci-today', txt: `오늘 ${jobs}잡` }));
      col.append(renderTokens(d, mac.id));

      grid.append(col);
    }

    section.append(grid);
    return section;
  }

  function findRunningJob(machineId, repo, role, runState, ciRunners) {
    const pool = role === 'heavy' ? runState.heavy : runState.light;
    const inProg = pool?.inProgress || [];

    for (const j of inProg) {
      const rName = (j.runner || '').toLowerCase();
      const rRepo = rName.includes('fork') ? 'fork' : 'storeport';
      const rKind = rName.includes('imac') || rName.includes('ci-box') ? 'imac'
                  : rName.includes('macbook') || rName.includes('mbp') ? 'mbp' : 'cloud';
      if (rKind === machineId && rRepo === repo) {
        return j.prompt_id || j.pr || '⠹';
      }
    }
    // cloud: unassigned jobs
    if (machineId === 'cloud') {
      const cloudJ = inProg.find(j => {
        const rName = (j.runner || '').toLowerCase();
        const rKind = rName.includes('imac') || rName.includes('ci-box') ? 'imac'
                    : rName.includes('macbook') || rName.includes('mbp') ? 'mbp' : 'cloud';
        const rRepo = rName.includes('fork') ? 'fork' : 'storeport';
        return rKind === 'cloud' && rRepo === repo;
      });
      if (cloudJ) return cloudJ.prompt_id || cloudJ.pr || '⠹';
    }
    return null;
  }

  function renderTokens(d, machineId) {
    // tokens 표시 자리 — status/tokens 있으면 허브별 합계, 없으면 placeholder
    const tokens = d.allJson?.status?.tokens;
    if (!tokens) {
      return el('div', { cls: 'cw-ci-tokens cw-dim', txt: '[계량기 설치 대기]' });
    }
    const total = Object.values(tokens).reduce((s, v) => s + (v || 0), 0);
    return el('div', { cls: 'cw-ci-tokens', txt: `토큰 ${formatNum(total)}` });
  }

  // ── phone mini hub row ────────────────────────────────────────────────────────
  function renderHubMini(d) {
    const hubs = d.allJson?.hubs || {};
    const limits = d.queueLimits || {};
    const prompts = d.pipelinePrompts || [];

    const row = el('div', { cls: 'cw-hub-mini' });
    for (const hub of HUBS) {
      const info  = hubs[hub] || {};
      const curId = info.current || null;
      const isActive = !!curId;
      const card = curId ? prompts.find(p => p.id === curId) : null;
      const stageIdx = card ? COLS.indexOf(card.column) : -1;

      let elapsedMin = null;
      if (isActive && info.started_at) {
        elapsedMin = Math.round((Date.now() - new Date(info.started_at).getTime()) / 60_000);
      }
      const limitMin = curId ? (limits[curId] || 60) : 60;
      const progress = elapsedMin !== null ? Math.min(100, (elapsedMin / limitMin) * 100) : 0;

      const item = el('div', {
        cls: `cw-hub-mini-item${isActive ? ' cw-hub-mini-active' : ''}`,
        onClick: () => showDetail('hub', hub),
      });
      item.append(el('div', { cls: 'cw-hub-mini-name', txt: hub }));
      if (isActive) {
        item.append(el('span', { cls: 'cw-hub-mini-spin', txt: '⟳' }));
        item.append(el('div', { cls: 'cw-hub-mini-stage', txt: stageIdx >= 0 ? STAGES[stageIdx] : '?' }));
        const barWrap = el('div', { cls: 'cw-hub-mini-bar' });
        const fill = el('div', { cls: 'cw-hub-mini-fill' });
        fill.style.width = `${progress}%`;
        barWrap.append(fill);
        item.append(barWrap);
      } else {
        item.append(el('div', { cls: 'cw-dim', txt: '쉼' }));
      }
      row.append(item);
    }
    return row;
  }

  // ── phone board mini ──────────────────────────────────────────────────────────
  function renderBoardMini(d) {
    const prompts = (d.pipelinePrompts || []).filter(p => p.column !== 'queue');
    const row = el('div', { cls: 'cw-board-mini', onClick: () => showDetail('board', null) });
    for (let i = 0; i < STAGES.length; i++) {
      const cnt = prompts.filter(p => p.column === COLS[i]).length;
      const cell = el('div', { cls: `cw-board-mini-cell${cnt > 0 ? ' cw-board-mini-active' : ''}` });
      cell.append(el('div', { cls: 'cw-board-mini-stage', txt: STAGES[i] }));
      cell.append(el('div', { cls: 'cw-board-mini-cnt', txt: String(cnt) }));
      row.append(cell);
    }
    return row;
  }

  // ── phone timeline mini ───────────────────────────────────────────────────────
  function renderTimelineMini(d) {
    const timeline = d.todayTimeline || {};
    const nowMs = Date.now();
    const wibNow = new Date(nowMs + 7 * 3600_000);
    const startOfDayMs = new Date(Date.UTC(
      wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate()
    )).getTime() - 7 * 3600_000;
    const spanMs = Date.now() - startOfDayMs || 1;

    const wrap = el('div', { cls: 'cw-tl-mini', onClick: () => showDetail('timeline', null) });
    for (const hub of HUBS) {
      const row = el('div', { cls: 'cw-tl-mini-row' });
      row.append(el('span', { cls: 'cw-tl-mini-hub', txt: hub }));
      const bar = el('div', { cls: 'cw-tl-mini-bar' });
      for (const seg of (timeline[hub] || [])) {
        const left = Math.max(0, (seg.startMs - startOfDayMs) / spanMs * 100);
        const right = Math.min(100, ((seg.endMs || nowMs) - startOfDayMs) / spanMs * 100);
        const width = Math.max(1, right - left);
        const type = seg.endMs ? 'done' : 'active';
        const s = el('div', { cls: `cw-tl-mini-seg cw-tl-mini-seg-${type}` });
        s.style.left = `${left}%`;
        s.style.width = `${width}%`;
        bar.append(s);
      }
      row.append(bar);
      wrap.append(row);
    }
    return wrap;
  }

  // ── phone CI mini ─────────────────────────────────────────────────────────────
  function renderCIMini(d) {
    const runState  = d.runState || {};
    const ciRunners = d.allJson?.ci_runners || [];
    const todayStats = d.todayMachineStats || {};

    const wrap = el('div', { cls: 'cw-ci-mini', onClick: () => showDetail('ci', null) });
    for (const { id, label } of [
      { id: 'mbp', label: 'MBP' },
      { id: 'imac', label: 'iMac' },
      { id: 'cloud', label: 'Cloud' },
    ]) {
      const col = el('div', { cls: 'cw-ci-mini-col' });
      col.append(el('div', { cls: 'cw-ci-mini-label', txt: label }));
      const chips = el('div', { cls: 'cw-ci-mini-chips' });
      for (const { repo, role } of [
        { repo: 'storeport', role: 'heavy' },
        { repo: 'storeport', role: 'light' },
        { repo: 'fork',      role: 'heavy' },
        { repo: 'fork',      role: 'light' },
      ]) {
        const busy = !!findRunningJob(id, repo, role, runState, ciRunners);
        chips.append(el('span', { cls: `cw-ci-chip${busy ? ' cw-ci-chip-busy' : ''}` }));
      }
      col.append(chips);
      const jobs = id === 'cloud' ? (d.cloudData?.realCount || 0) : (todayStats[id]?.jobs || 0);
      col.append(el('div', { cls: 'cw-ci-mini-cnt', txt: `${jobs}잡` }));
      wrap.append(col);
    }
    return wrap;
  }

  // ── detail panels (phone) ────────────────────────────────────────────────────
  function renderDetailPanel(d, detail) {
    const panel = el('div', { cls: 'cw-detail-panel' });
    const backBtn = el('button', { cls: 'cw-back-btn', onClick: hideDetail }, el('span', { txt: '← 뒤로' }));
    panel.append(backBtn);

    if (detail.type === 'hub') {
      panel.append(renderHubDetail(d, detail.key));
    } else if (detail.type === 'board') {
      panel.append(renderBoardDetail(d));
    } else if (detail.type === 'timeline') {
      panel.append(renderTimelineDetail(d));
    } else if (detail.type === 'ci') {
      panel.append(renderCIDetail(d));
    } else if (detail.type === 'alerts') {
      panel.append(renderAlertsDetail(d));
    }
    return panel;
  }

  function renderHubDetail(d, hub) {
    const info = d.allJson?.hubs?.[hub] || {};
    const curId = info.current || null;
    const prompts = d.pipelinePrompts || [];
    const limits = d.queueLimits || {};
    const card = curId ? prompts.find(p => p.id === curId) : null;

    const wrap = el('div', { cls: 'cw-detail-section' });
    wrap.append(el('h2', { cls: 'cw-detail-head', txt: `${hub} 상세` }));

    if (curId) {
      wrap.append(el('div', { cls: 'cw-detail-id', txt: curId }));
      if (card?.title) wrap.append(el('div', { cls: 'cw-detail-title', txt: card.title }));

      // Stage strip
      if (card) {
        const si = COLS.indexOf(card.column);
        const stripRow = el('div', { cls: 'cw-stage-strip' });
        STAGES.forEach((s, i) => {
          const dot = el('span', {
            cls: `cw-stage-dot ${i < si ? 'done' : i === si ? 'cur' : 'todo'}`,
            txt: i < si ? '●' : i === si ? '◐' : '○',
          });
          stripRow.append(dot);
          stripRow.append(el('span', { cls: 'cw-dim', txt: s }));
          if (i < STAGES.length - 1) stripRow.append(document.createTextNode(' '));
        });
        wrap.append(stripRow);
      }

      // Elapsed / limit
      if (info.started_at) {
        const elMin = Math.round((Date.now() - new Date(info.started_at).getTime()) / 60_000);
        const lim = limits[curId] || 60;
        wrap.append(el('div', { cls: 'cw-detail-time', txt: `경과 ${elMin}분 / 상한 ${lim}분` }));
      }

      // PR + report links
      const link = card ? extractLink(card) : null;
      if (link) {
        const a = el('a', { cls: 'cw-detail-link', href: link, txt: 'PR 보기' });
        a.target = '_blank';
        wrap.append(a);
      }

      // Model
      if (info.model) wrap.append(el('div', { cls: 'cw-dim', txt: `모델: ${info.model}` }));
    } else {
      wrap.append(el('div', { cls: 'cw-dim', txt: '현재 작업 없음 (쉼)' }));
      if (info.last_activity) {
        wrap.append(el('div', { cls: 'cw-dim', txt: `마지막 활동: ${formatAgo(info.last_activity)}` }));
      }
    }

    // Today's completed items for this hub
    const timeline = d.todayTimeline?.[hub] || [];
    if (timeline.length) {
      wrap.append(el('h3', { cls: 'cw-detail-subhead', txt: '오늘 한 일' }));
      for (const seg of timeline) {
        const dur = seg.endMs
          ? `${Math.round((seg.endMs - seg.startMs) / 60_000)}분`
          : '진행 중';
        wrap.append(el('div', { cls: 'cw-detail-item', txt: `${seg.id}  ${dur}` }));
      }
    }

    return wrap;
  }

  function renderBoardDetail(d) {
    const prompts = (d.pipelinePrompts || []).filter(p => p.column !== 'queue');
    const wrap = el('div', { cls: 'cw-detail-section' });
    wrap.append(el('h2', { cls: 'cw-detail-head', txt: '진행 카드 목록' }));

    if (!prompts.length) {
      wrap.append(el('div', { cls: 'cw-dim', txt: '진행 중 없음' }));
      return wrap;
    }
    for (const p of prompts) {
      const item = el('div', {
        cls: 'cw-detail-item cw-detail-item-tappable',
        onClick: () => showDetail('hub', p.hub),
      });
      item.append(el('span', { cls: 'cw-detail-id', txt: p.id }));
      item.append(el('span', { cls: 'cw-dim', txt: ` · ${STAGES[COLS.indexOf(p.column)] || p.column} · ${p.ageMin ?? '?'}분` }));
      if (p.title) item.append(el('div', { cls: 'cw-detail-title', txt: p.title }));
      wrap.append(item);
    }
    return wrap;
  }

  function renderTimelineDetail(d) {
    const timeline = d.todayTimeline || {};
    const wrap = el('div', { cls: 'cw-detail-section' });
    wrap.append(el('h2', { cls: 'cw-detail-head', txt: '오늘 프롬프트 시간순' }));

    const all = [];
    for (const [hub, segs] of Object.entries(timeline)) {
      for (const seg of segs) all.push({ hub, ...seg });
    }
    all.sort((a, b) => a.startMs - b.startMs);

    if (!all.length) {
      wrap.append(el('div', { cls: 'cw-dim', txt: '오늘 기록 없음' }));
      return wrap;
    }
    for (const seg of all) {
      const startStr = new Date(seg.startMs + 7 * 3600_000).toISOString().slice(11, 16);
      const result = seg.endMs ? `✔ ${Math.round((seg.endMs - seg.startMs) / 60_000)}분` : '진행 중';
      wrap.append(el('div', { cls: 'cw-detail-item', txt: `${startStr} · ${seg.hub} · ${seg.id} · ${result}` }));
    }
    return wrap;
  }

  function renderCIDetail(d) {
    const runState = d.runState || {};
    const wrap = el('div', { cls: 'cw-detail-section' });
    wrap.append(el('h2', { cls: 'cw-detail-head', txt: 'CI 기계·풀별' }));

    for (const { pool, label } of [
      { pool: 'heavy', label: '헤비 풀' },
      { pool: 'light', label: '라이트 풀' },
    ]) {
      const inProg = runState[pool]?.inProgress || [];
      const queued = runState[pool]?.queued || [];
      wrap.append(el('div', { cls: 'cw-detail-subhead', txt: `${label} · 진행 ${inProg.length} 대기 ${queued.length}` }));
      for (const j of inProg) {
        const runtime = j.running_min != null ? `${j.running_min}분` : '';
        wrap.append(el('div', {
          cls: 'cw-detail-item',
          txt: `⠹ ${j.prompt_id || j.pr || ''} ${j.runner || ''} ${runtime}`,
        }));
      }
    }
    return wrap;
  }

  function renderAlertsDetail(d) {
    const alerts = d.runnerAlerts || [];
    const wrap = el('div', { cls: 'cw-detail-section' });
    wrap.append(el('h2', { cls: 'cw-detail-head', txt: `주의 (${alerts.length})` }));
    if (!alerts.length) {
      wrap.append(el('div', { cls: 'cw-dim', txt: '없음' }));
      return wrap;
    }
    for (const a of alerts) {
      wrap.append(el('div', { cls: 'cw-alert-row', txt: `⚠ ${a.msg || String(a)}` }));
    }
    return wrap;
  }

  // ── utilities ────────────────────────────────────────────────────────────────
  function formatAgo(isoOrMs) {
    if (!isoOrMs) return '?';
    const ms = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
    const diff = Math.round((Date.now() - ms) / 60_000);
    if (diff < 1) return '방금';
    if (diff < 60) return `${diff}분 전`;
    return `${Math.round(diff / 60)}시간 전`;
  }

  function formatNum(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  }

  // ── main render ───────────────────────────────────────────────────────────────
  function renderAll(d) {
    if (!d) return;
    _data = d;
    const root = document.getElementById('app');
    if (!root) return;

    const isMobile = window.innerWidth < 900;
    const frag = document.createDocumentFragment();

    if (isMobile && _detail) {
      frag.append(renderHeader(d, true));
      frag.append(renderDetailPanel(d, _detail));
    } else if (isMobile) {
      frag.append(renderHeader(d, true));
      frag.append(renderHubMini(d));
      frag.append(renderBoardMini(d));
      frag.append(renderTimelineMini(d));
      frag.append(renderCIMini(d));
    } else {
      frag.append(renderHeader(d, false));
      if (_alertsOpen) frag.append(renderAlertPanel(d));
      frag.append(renderHubCards(d));
      frag.append(renderBoard(d));
      frag.append(renderTimeline(d));
      frag.append(renderCIMachines(d));
    }

    root.replaceChildren(frag);
  }

  // ── fetch loop ────────────────────────────────────────────────────────────────
  async function refresh() {
    const ageEl    = document.getElementById('cw-age');
    const statusEl = document.getElementById('cw-spin');
    try {
      const resp = await fetch('/api/state');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      _lastFetchMs = Date.now();
      renderAll(data);
    } catch (e) {
      if (ageEl) ageEl.textContent = ` 오류: ${e.message}`;
    }
    setTimeout(refresh, 5000);
  }

  // Update age ticker every second
  setInterval(() => {
    const ageEl = document.getElementById('cw-age');
    if (!ageEl || !_lastFetchMs) return;
    const secs = Math.round((Date.now() - _lastFetchMs) / 1000);
    ageEl.textContent = ` ${secs}초 전`;
    if (_data) renderAll(_data); // re-render to update delay badge
  }, 10_000); // every 10s to avoid excessive re-renders

  document.addEventListener('DOMContentLoaded', () => { refresh(); });
  window.addEventListener('resize', () => { if (_data) renderAll(_data); });

  // Export for pin-artifact usage
  root.CIWatch = { renderAll, refresh };

}(window));
