// scripts/watch/ci-watch-render.mjs  M1-1123-K — 압축 렌더 + 순수 헬퍼

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const col = (text, ...codes) => codes.join('') + text + C.reset;

// ---- 순수 헬퍼 (테스트 가능) ----

/** route / heavy-cloud / ci-summary 등 마커/요약 잡 여부 */
export const MARKER_JOBS = new Set(['route', 'heavy-cloud', 'ci-summary', 'feature-map-route']);

export function isMarkerJob(jobName) {
  if (!jobName) return false;
  const n = String(jobName).toLowerCase();
  return MARKER_JOBS.has(n) || n.startsWith('ci-summary');
}

/**
 * JSONL 레코드 배열에서 실제 검사 잡만 카운트
 * @param {Array<{runner_kind:string, job:string}>} records
 */
export function countRealCloud(records) {
  return records.filter(r => r.runner_kind === 'cloud' && !isMarkerJob(r.job)).length;
}

/**
 * 24시간 이상 된 미투입 항목 제외
 * @param {Array<{id:string, ageMin:number}>} items
 * @param {number} maxAgeMin  기본 24×60
 */
export function filterFreshUnclaimed(items, maxAgeMin = 24 * 60) {
  return items.filter(it => it.ageMin < maxAgeMin);
}

/**
 * ci_runners 항목 1개를 repo×role 로 분류
 * - fork: 이름에 'fork' 포함
 * - light: 이름에 'light' 포함 (fork-light 도 포함)
 */
export function classifyRunner(name) {
  const n = String(name || '').toLowerCase();
  return {
    repo: n.includes('fork') ? 'fork' : 'storeport',
    role: n.includes('light') ? 'light' : 'heavy',
  };
}

/**
 * ci_runners 배열 + in_progress 잡 배열 → 렌더용 러너 행 배열
 * 같은 repo×role 에 여러 러너가 있으면 첫 번째만 사용하되 busy 를 OR 처리
 */
export function buildRunnerRows(ciRunners, inProgressAll) {
  const SLOTS = [
    { repo: 'storeport', role: 'heavy' },
    { repo: 'storeport', role: 'light' },
    { repo: 'fork',      role: 'heavy' },
    { repo: 'fork',      role: 'light' },
  ];

  const jobByRunner = new Map();
  for (const j of (inProgressAll || [])) {
    if (j.runner && !jobByRunner.has(j.runner)) jobByRunner.set(j.runner, j);
  }

  return SLOTS.map(({ repo, role }) => {
    const matched = (ciRunners || []).filter(r => {
      const c = classifyRunner(r.name);
      return c.repo === repo && c.role === role;
    });
    if (!matched.length) {
      return { repo, role, name: null, status: 'offline', busy: false, job: null };
    }
    const primary = matched[0];
    const busy = matched.some(r => r.busy);
    const online = matched.some(r => r.status === 'online');
    const job = jobByRunner.get(primary.name) || null;
    return { repo, role, name: primary.name, status: online ? 'online' : 'offline', busy, job };
  });
}

function statusDot(status, busy) {
  if (status !== 'online') return col('●OFF', C.red);
  return busy ? col('●BUSY', C.yellow) : col('●OK ', C.green);
}

function fmtRunnerRow(row) {
  const label = `${row.repo}-${row.role}`.padEnd(16);
  const name = row.name ? row.name.slice(0, 24).padEnd(24) : '(없음)'.padEnd(24);
  const dot = statusDot(row.status, row.busy);
  if (!row.job) return `  ${label} ${name} ${dot}  —`;
  const j = row.job;
  const rmin = j.running_min ?? '-';
  const c = typeof rmin === 'number' && rmin >= 25 ? C.red : typeof rmin === 'number' && rmin >= 15 ? C.yellow : '';
  const pid = j.pr_display || j.pr || '-';
  return `  ${label} ${name} ${dot}  ${c}${pid} ${j.job || ''} ${rmin}분${C.reset}`;
}

function fmtQueueRow(label, queueItems) {
  if (!queueItems.length) return `  ${label.padEnd(20)} 0건`;
  const oldest = queueItems[0];
  const pid = oldest.prompt_id || oldest.pr_display || oldest.display || oldest.pr || '?';
  const qm = oldest.queued_min ?? '-';
  const c = typeof qm === 'number' && qm >= 10 ? C.yellow : '';
  return `  ${label.padEnd(20)} ${queueItems.length}건  가장 오래: ${c}${pid} ${qm}분${C.reset}`;
}

/**
 * 압축 렌더 — 최대 60줄
 * @param {object} data
 *   allJson: status/runners/all.json 파싱 결과 (nullable)
 *   runState: { heavy:{inProgress,queued}, light:{inProgress,queued} }
 *   cloudData: { realCount, limit, totalMin, last3:[{job,conclusion,run_min}] }
 *   runnerAlerts: [{type,msg}]
 *   ciAlerts: [{type,detail}]
 *   ciDimAlerts: [{type,msg,dim:true}] — 회색 안내 (경보 카운트 제외)
 *   timeStr: string
 *   fullMode: boolean
 *   todayStats: allJson.ci.data.today (nullable)
 *   cloudTodayCount: allJson.ci.data.cloud_today (nullable)
 *   cloudLimit: number
 *   lastCiByRepo: [{repo,completed_at,conclusion,workflow,job,pr}]
 */
export function renderCompact(data) {
  const { allJson, runState, cloudData, runnerAlerts, ciAlerts, ciDimAlerts,
          timeStr, fullMode, todayStats, cloudTodayCount, cloudLimit, lastCiByRepo } = data;
  const W = 100;
  const hr = '─'.repeat(W - 1);
  const lines = [];

  // 1. 상태 1줄
  const allAlerts = [...(runnerAlerts || []), ...(ciAlerts || [])];
  const statusStr = allAlerts.length === 0
    ? col('● 정상', C.green, C.bold)
    : col(`● 경보 ${allAlerts.length}`, C.red, C.bold);
  lines.push(`${statusStr}  ${timeStr} WIB`);
  lines.push(hr);

  // 2. 허브 5줄
  const hubs = ['m0', 'm1', 'm2', 'm3', 'r0'];
  for (const hub of hubs) {
    const h = allJson?.hubs?.[hub];
    if (!h) {
      lines.push(`  ${col(hub, C.bold)}  ${col('데이터 없음', C.dim)}`);
      continue;
    }
    const cur = h.current;
    if (cur) {
      const startMs = h.started_at ? Date.now() - new Date(h.started_at).getTime() : null;
      const elapMin = startMs !== null ? Math.round(startMs / 60000) : '?';
      lines.push(`  ${col(hub, C.bold)}  ${col(cur, C.yellow)}  ${elapMin}분`);
    } else {
      lines.push(`  ${col(hub, C.bold)}  ${col('idle', C.green)}`);
    }
  }

  // heartbeat + git
  const hbAge = allJson?.at ? Math.round((Date.now() - new Date(allJson.at).getTime()) / 60000) : null;
  const hbStr = hbAge !== null ? (hbAge >= 10 ? col(`heartbeat ${hbAge}분전`, C.red) : `heartbeat ${hbAge}분전`) : 'heartbeat ?';
  const gs = allJson?.git_state;
  const gitStr = gs
    ? `  git: ahead=${gs.ahead} behind=${gs.behind}${gs.rebase_in_progress ? col('  REBASE중', C.red) : ''}${gs.needs_human ? col('  ★사람필요', C.red) : ''}`
    : '  git: ?';
  lines.push(`  ${hbStr}  ${allJson?.runner || '?'} pid=${allJson?.pid || '?'}${gitStr}`);
  lines.push(hr);

  // 3. CI 러너 4줄
  const inProgressAll = [
    ...(allJson?.ci?.data?.heavy?.in_progress || []),
    ...(allJson?.ci?.data?.light?.in_progress || []),
  ];
  const rows = buildRunnerRows(allJson?.ci_runners, inProgressAll);
  for (const row of rows) lines.push(fmtRunnerRow(row));
  lines.push(hr);

  // 4. 대기열 (저장소×역할별 건수 + 가장 오래 기다린 1건)
  const heavy = runState?.heavy || { inProgress: [], queued: [] };
  const light = runState?.light || { inProgress: [], queued: [] };

  const shQ = heavy.queued.filter(q => repoShortLocal(q.repo) === 'storeport');
  const fhQ = heavy.queued.filter(q => repoShortLocal(q.repo) === 'fork');
  const slQ = light.queued.filter(q => repoShortLocal(q.repo) === 'storeport');
  const flQ = light.queued.filter(q => repoShortLocal(q.repo) === 'fork');

  if (fullMode) {
    // full 모드에서는 각 행을 모두 출력
    lines.push(col('  대기열', C.bold));
    for (const [lbl, arr] of [['storeport-heavy', shQ], ['fork-heavy', fhQ], ['storeport-light', slQ], ['fork-light', flQ]]) {
      if (arr.length === 0) { lines.push(`  ${lbl.padEnd(20)} 0건`); continue; }
      lines.push(`  ${col(lbl, C.bold)} (${arr.length}건)`);
      for (const q of arr) {
        const pid = q.prompt_id || q.display || q.pr || '?';
        const qm = q.queued_min ?? '-';
        const c = typeof qm === 'number' && qm >= 10 ? C.yellow : '';
        lines.push(`    ${c}${pid}${C.reset}  ${q.display || ''}  ${q.check || ''}  ${qm}분`);
      }
    }
  } else {
    lines.push(fmtQueueRow('storeport-heavy', shQ));
    lines.push(fmtQueueRow('fork-heavy', fhQ));
    lines.push(fmtQueueRow('storeport-light', slQ));
    lines.push(fmtQueueRow('fork-light', flQ));
  }
  lines.push(hr);

  // 5. 클라우드 (실제 검사 잡만)
  const cd = cloudData || { realCount: 0, limit: 5, totalMin: 0, last3: [] };
  const remaining = Math.max(0, cd.limit - cd.realCount);
  lines.push(`  ${col('cloud 오늘', C.bold)}  ${cd.realCount}/${cd.limit}건  총 ${cd.totalMin.toFixed(1)}분  잔여: ${remaining}`);
  if (cd.last3 && cd.last3.length) {
    for (const j of cd.last3.slice(0, 3)) {
      const res = j.conclusion === 'success' ? col('✓', C.green) : j.conclusion === 'skipped' ? col('-', C.dim) : col('✗', C.red);
      lines.push(`    ${j.job}  ${j.run_min?.toFixed(1) || '-'}분  ${res}`);
    }
  }
  lines.push(hr);

  // 5.5. 오늘 누적 (WIB)
  if (todayStats) {
    lines.push(col('  오늘 누적 (WIB)', C.bold));
    for (const kind of ['mac-heavy', 'mac-light']) {
      const s = todayStats[kind];
      if (!s) continue;
      const sr = typeof s.success_rate === 'number' ? s.success_rate.toFixed(1) : '?';
      const aw = typeof s.avg_wait_min === 'number' ? s.avg_wait_min.toFixed(1) : '?';
      const ar = typeof s.avg_run_min === 'number' ? s.avg_run_min.toFixed(1) : '?';
      const sc = typeof s.success_rate === 'number' && s.success_rate < 70 ? C.red
        : typeof s.success_rate === 'number' && s.success_rate < 90 ? C.yellow : '';
      lines.push(`  ${kind.padEnd(14)}  ${String(s.jobs).padStart(3)}잡  대기${aw}분  실행${ar}분  ${sc}성공${sr}%${C.reset}`);
    }
    // cloud(경로포함) — cloud.jobs 는 마커잡 포함 전체
    const cl = todayStats['cloud'];
    if (cl) {
      const sr = typeof cl.success_rate === 'number' ? cl.success_rate.toFixed(1) : '?';
      const ar = typeof cl.avg_run_min === 'number' ? cl.avg_run_min.toFixed(1) : '?';
      const sc = typeof cl.success_rate === 'number' && cl.success_rate < 70 ? C.red
        : typeof cl.success_rate === 'number' && cl.success_rate < 90 ? C.yellow : '';
      lines.push(`  ${'cloud(경로포함)'.padEnd(14)}  ${String(cl.jobs).padStart(3)}잡  실행${ar}분  ${sc}성공${sr}%${C.reset}`);
    }
    // cloud 한도 — cloud_today 는 넘기기 한도 카운트 (마커잡 제외)
    if (cloudTodayCount !== null) {
      const lim = cloudLimit || 5;
      const rem = Math.max(0, lim - cloudTodayCount);
      const costStr = todayStats.cloud_cost_est_usd != null ? `  $${todayStats.cloud_cost_est_usd.toFixed(2)}` : '';
      lines.push(`  ${'cloud 한도'.padEnd(14)}  ${cloudTodayCount}/${lim}건${costStr}  잔여 ${rem}`);
    }
    lines.push(hr);
  }

  // 5.6. 마지막 완료 CI
  if (lastCiByRepo && lastCiByRepo.length > 0) {
    lines.push(col('  마지막 완료 CI', C.bold));
    for (const item of lastCiByRepo) {
      const shortRepo = fmtRepoShort(item.repo);
      if (!item.completed_at) {
        lines.push(`  ${shortRepo.padEnd(10)}  ${col('데이터 없음', C.dim)}`);
        continue;
      }
      const minsAgo = Math.round((Date.now() - new Date(item.completed_at).getTime()) / 60_000);
      const wibTime = new Date(item.completed_at).toLocaleString('en', {
        timeZone: 'Asia/Jakarta', hour12: false, hour: '2-digit', minute: '2-digit',
      });
      const resIcon = item.conclusion === 'success' ? col('✅', C.green)
        : item.conclusion === 'failure' ? col('❌', C.red)
        : item.conclusion === 'cancelled' ? col('취소', C.dim)
        : col(item.conclusion || '?', C.dim);
      const wf = (item.workflow || '-').slice(0, 20);
      const prStr = item.pr ? `  PR#${item.pr}` : '';
      const mc = minsAgo > 30 ? C.red : minsAgo > 15 ? C.yellow : '';
      lines.push(`  ${shortRepo.padEnd(10)}  ${wibTime} WIB  (${mc}${minsAgo}분 전${C.reset})  ${resIcon}  ${wf}${prStr}`);
    }
    lines.push(hr);
  }

  // 6. 경보 최대 5줄 + dim 안내
  const alertsToShow = allAlerts.slice(0, 5);
  if (alertsToShow.length === 0 && !(ciDimAlerts && ciDimAlerts.length)) {
    lines.push(col('  경보 없음', C.green));
  } else {
    for (const a of alertsToShow) {
      lines.push(col(`  ⚠ ${a.msg || a.detail || ''}`, C.red, C.bold));
    }
    for (const a of (ciDimAlerts || [])) {
      lines.push(col(`  ⏭ ${a.msg}`, C.dim));
    }
  }
  lines.push(hr);

  // 7. err_tail 마지막 2줄
  const errLines = allJson?.err_tail
    ? allJson.err_tail.split('\n').filter(Boolean).slice(-2)
    : [];
  if (errLines.length) {
    for (const l of errLines) lines.push(col('  ' + l.slice(0, W - 4), C.dim));
  }

  lines.push(col('  갱신 30초 | Ctrl+C 종료' + (fullMode ? '' : '  --full: 전체 목록'), C.dim));

  return lines;
}

function repoShortLocal(repo) {
  if (!repo) return 'storeport';
  const last = String(repo).split('/').pop();
  return last.endsWith('-fork') ? 'fork' : last.startsWith('agilo') ? 'fork' : 'storeport';
}

function fmtRepoShort(repo) {
  if (!repo) return '?';
  const last = String(repo).split('/').pop();
  if (last.endsWith('-fork') || last.startsWith('agilo')) return 'fork';
  return last.length > 10 ? last.slice(0, 10) : last;
}
