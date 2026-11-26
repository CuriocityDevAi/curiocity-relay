// scripts/watch/ci-watch-render.mjs  M1-1123-K — 압축 렌더 + 순수 헬퍼
// v1.8: CI 한 줄 표 · partial→? · 단위 s/m · 잔상 방지
// v1.11: W5~W9 — 클라우드 필터·?표시·합계줄·초록✓·잡이름+열폭절단
// v1.12: W2보완(changes-filter·markers-and-forbidden) · W10(클라우드 오늘 줄 개편)
// v1.13: M2-1126-L — W2(cancel-on-close 마커) · W5(OFF 표시 수정) · W10(4줄 MBP/iMAC/클라우드/전체)
// v1.14: M2-1126-N — heavy-cloud 를 fork-only 마커로 변경 (storeport heavy-cloud 는 실제 24분 잡)

import { displayWidth, padEndWidth, stripAnsi, truncateWidth } from './text-width.mjs';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const col = (text, ...codes) => codes.join('') + text + C.reset;

// ---- 순수 헬퍼 (테스트 가능) ----

/** route / ci-summary 등 마커/요약 잡 여부 */
// W2보완: changes-filter · markers-and-forbidden 추가 (gate/filter 잡)
// cancel-on-close: PR 닫힐 때 실행되는 수 초짜리 정리 잡 → 마커 (실제 테스트·빌드 아님)
// v1.14: heavy-cloud 제거 — storeport 에서는 실제 24분 잡 · fork 에서만 echo 마커
//        fork 판정은 isMarkerJob(jobName, repo) 의 repo 파라미터로 처리
export const MARKER_JOBS = new Set(['route', 'ci-summary', 'feature-map-route', 'changes-filter', 'markers-and-forbidden', 'cancel-on-close']);

/** fork 리포 여부 판정 (CuriocityDevAi/agilo-* 또는 *-fork) */
function isForkRepo(repo) {
  if (!repo) return false;
  const last = String(repo).split('/').pop() || '';
  return last.endsWith('-fork') || last.startsWith('agilo');
}

/**
 * 마커/요약 잡 여부.
 * @param {string} jobName
 * @param {string} [repo] - 리포 full_name (CuriocityDevAi/storeport 등).
 *   repo 미전달 → heavy-cloud 를 보수적으로 마커 취급 (backward-compat).
 */
export function isMarkerJob(jobName, repo) {
  if (!jobName) return false;
  const n = String(jobName).toLowerCase();
  if (MARKER_JOBS.has(n) || n.startsWith('ci-summary')) return true;
  // heavy-cloud: fork 에서는 echo 마커 · storeport 에서는 실제 잡
  // repo 미전달이면 보수적으로 마커 취급 (기존 동작 유지)
  if (n === 'heavy-cloud') return repo === undefined ? true : isForkRepo(repo);
  return false;
}

export function isCountableJob(record) {
  if (!record) return false;
  if (isMarkerJob(record.job, record.repo)) return false;
  const c = record.conclusion;
  if (c === 'skipped' || c === 'cancelled') return false;
  return true;
}

/**
 * JSONL 레코드 배열에서 실제 검사 잡만 카운트
 */
export function countRealCloud(records) {
  return records.filter(r => r.runner_kind === 'cloud' && !isMarkerJob(r.job, r.repo)).length;
}

/**
 * 24시간 이상 된 미투입 항목 제외
 */
export function filterFreshUnclaimed(items, maxAgeMin = 24 * 60) {
  return items.filter(it => it.ageMin < maxAgeMin);
}

/**
 * ci_runners 항목 1개를 repo×role 로 분류
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
 * 압축 렌더 — renderCompact (하위 호환용 · 직접 사용 감소 중)
 */
export function renderCompact(data) {
  const { allJson, runState, cloudData, runnerAlerts, ciAlerts, ciDimAlerts,
          timeStr, fullMode, todayStats, cloudTodayCount, cloudLimit, lastCiByRepo,
          countdownSec, hubReportStatus } = data;
  const W = 100;
  const hr = '─'.repeat(W - 1);
  const lines = [];

  const allAlerts = [...(runnerAlerts || []), ...(ciAlerts || [])];
  const statusStr = allAlerts.length === 0
    ? col('● 정상', C.green, C.bold)
    : col(`● 경보 ${allAlerts.length}`, C.red, C.bold);
  lines.push(`${statusStr}  ${timeStr} WIB`);
  lines.push(hr);

  const hubs = ['m0', 'm1', 'm2', 'm3', 'r0'];
  for (const hub of hubs) {
    const h = allJson?.hubs?.[hub];
    if (!h) {
      lines.push(`  ${col(hub, C.bold)}  ${col('데이터 없음', C.dim)}`);
      continue;
    }
    const cur = h.current;
    if (cur) {
      const rptStatus = hubReportStatus?.[hub];
      if (rptStatus && !rptStatus.reportExists) {
        const wc = rptStatus.workMin >= 60 ? C.red : rptStatus.workMin >= 30 ? C.yellow : '';
        const workStr = wc ? `${wc}작업 ${rptStatus.workMin}분${C.reset}` : `작업 ${rptStatus.workMin}분`;
        const wt = rptStatus.waitMin >= 5 ? C.red : C.yellow;
        const waitStr = `${wt}⚠ 리포트 미착지 ${rptStatus.waitMin}분${C.reset}`;
        lines.push(`  ${col(hub, C.bold)}  ${col(cur, C.yellow)}  ${workStr} · ${waitStr}`);
      } else {
        const startMs = h.started_at ? Date.now() - new Date(h.started_at).getTime() : null;
        const elapMin = startMs !== null ? Math.round(startMs / 60000) : null;
        const ec = elapMin !== null && elapMin >= 60 ? C.red
          : elapMin !== null && elapMin >= 30 ? C.yellow : '';
        const elapStr = elapMin !== null
          ? (ec ? `${ec}${elapMin}분${C.reset}` : `${elapMin}분`)
          : '?분';
        lines.push(`  ${col(hub, C.bold)}  ${col(cur, C.yellow)}  ${elapStr}`);
      }
    } else {
      lines.push(`  ${col(hub, C.bold)}  ${col('idle', C.green)}`);
    }
  }

  const hbAge = allJson?.at ? Math.round((Date.now() - new Date(allJson.at).getTime()) / 60000) : null;
  const hbStr = hbAge !== null ? (hbAge >= 10 ? col(`heartbeat ${hbAge}분전`, C.red) : `heartbeat ${hbAge}분전`) : 'heartbeat ?';
  const gs = allJson?.git_state;
  const gitStr = gs
    ? `  git: ahead=${gs.ahead} behind=${gs.behind}${gs.rebase_in_progress ? col('  REBASE중', C.red) : ''}${gs.needs_human ? col('  ★사람필요', C.red) : ''}`
    : '  git: ?';
  lines.push(`  ${hbStr}  ${allJson?.runner || '?'} pid=${allJson?.pid || '?'}${gitStr}`);
  lines.push(hr);

  const inProgressAll = [
    ...(allJson?.ci?.data?.heavy?.in_progress || []),
    ...(allJson?.ci?.data?.light?.in_progress || []),
  ];
  const rows = buildRunnerRows(allJson?.ci_runners, inProgressAll);
  for (const row of rows) lines.push(fmtRunnerRow(row));
  lines.push(hr);

  const heavy = runState?.heavy || { inProgress: [], queued: [] };
  const light = runState?.light || { inProgress: [], queued: [] };

  const shQ = heavy.queued.filter(q => repoShortLocal(q.repo) === 'storeport');
  const fhQ = heavy.queued.filter(q => repoShortLocal(q.repo) === 'fork');
  const slQ = light.queued.filter(q => repoShortLocal(q.repo) === 'storeport');
  const flQ = light.queued.filter(q => repoShortLocal(q.repo) === 'fork');

  if (fullMode) {
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

  const cd = cloudData || { realCount: 0, limit: 5, totalMin: 0, last3: [] };
  const remaining = Math.max(0, cd.limit - cd.realCount);
  lines.push(`  ${col('cloud 잡 오늘', C.bold)}  ${cd.realCount}건(간단 판정 포함)  총 ${cd.totalMin.toFixed(1)}분  잔여: ${remaining}`);
  if (cd.last3 && cd.last3.length) {
    for (const j of cd.last3.slice(0, 3)) {
      const res = j.conclusion === 'success' ? col('✓', C.green) : j.conclusion === 'skipped' ? col('-', C.dim) : col('✗', C.red);
      lines.push(`    ${j.job}  ${j.run_min?.toFixed(1) || '-'}분  ${res}`);
    }
  }
  lines.push(hr);

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
    const cl = todayStats['cloud'];
    if (cl) {
      const sr = typeof cl.success_rate === 'number' ? cl.success_rate.toFixed(1) : '?';
      const ar = typeof cl.avg_run_min === 'number' ? cl.avg_run_min.toFixed(1) : '?';
      const sc = typeof cl.success_rate === 'number' && cl.success_rate < 70 ? C.red
        : typeof cl.success_rate === 'number' && cl.success_rate < 90 ? C.yellow : '';
      lines.push(`  ${'cloud(경로포함)'.padEnd(14)}  ${String(cl.jobs).padStart(3)}잡  실행${ar}분  ${sc}성공${sr}%${C.reset}`);
    }
    if (cloudTodayCount !== null) {
      const lim = cloudLimit || 5;
      const rem = Math.max(0, lim - cloudTodayCount);
      const costStr = todayStats.cloud_cost_est_usd != null ? `  $${todayStats.cloud_cost_est_usd.toFixed(2)}` : '';
      lines.push(`  ${'클라우드 넘기기 한도'.padEnd(10)}  ${cloudTodayCount}/${lim}${costStr}  잔여 ${rem}`);
    }
    lines.push(hr);
  }

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

  const errLines = allJson?.err_tail
    ? allJson.err_tail.split('\n').filter(Boolean).slice(-2)
    : [];
  if (errLines.length) {
    for (const l of errLines) lines.push(col('  ' + l.slice(0, W - 4), C.dim));
  }

  const cdSec = typeof countdownSec === 'number' ? countdownSec : 30;
  lines.push(col(`  다음 갱신 ${cdSec}초 | r 지금 갱신 · q 종료${fullMode ? '' : '  --full: 전체 목록'}`, C.dim));

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

// ─────────────────────────────────────────────────────────────────────
// v1.6+: 기계 분류 · 기계 상태 빌드 · renderLayout
// ─────────────────────────────────────────────────────────────────────

/**
 * REQ 2: runner_name → 'mbp' | 'imac' | 'cloud' | 'unknown'
 * W5: null/undefined → 'unknown' (not 'cloud') — runner 미배정은 cloud가 아님
 */
export function classifyMachine(name) {
  if (!name) return 'unknown';
  const n = String(name);
  if (/^ci-box-.*-imac$/i.test(n)) return 'imac';
  if (/^(curiocity-mac-|Youngkyus-MacBook)/i.test(n)) return 'mbp';
  if (/^(GitHub Actions|ubuntu-|windows-|macos-)/i.test(n)) return 'cloud';
  return 'unknown';
}

const POOL_DEFS = [
  { key: 'storeport-heavy', repo: 'storeport', role: 'heavy' },
  { key: 'storeport-light', repo: 'storeport', role: 'light' },
  { key: 'fork-heavy',      repo: 'fork',      role: 'heavy' },
  { key: 'fork-light',      repo: 'fork',      role: 'light' },
];

/**
 * REQ 1+2: allJson + runState → per-pool machine state
 * Returns Map<poolKey, { mbp, imac, cloud, unknownRunners }>
 *   mbp:   { status: 'running'|'idle'|'offline', job: null | { promptId, min }, partial: bool }
 *   imac:  same
 *   cloud: { count: number, jobs: [] }
 *   unknownRunners: string[]
 *
 * §5: ci.data.partial=true 또는 repos_failed 에 해당 repo 있으면
 *     offline 상태는 'partial' 플래그를 true 로 설정 → 렌더에서 `?` 표시
 */
export function buildMachineState(allJson, runState) {
  const ciRunners = allJson?.ci_runners || [];
  const isGlobalPartial = allJson?.ci?.data?.partial === true;
  const reposFailed = new Set(allJson?.ci?.data?.repos_failed || []);

  const runnerInfo = new Map();
  for (const r of ciRunners) {
    const kind = classifyMachine(r.name);
    const { repo, role } = classifyRunner(r.name);
    const poolKey = `${repo}-${role}`;
    runnerInfo.set(r.name, { kind, poolKey, status: r.status || 'offline' });
  }

  const inProgressAll = [
    ...(allJson?.ci?.data?.heavy?.in_progress || []),
    ...(allJson?.ci?.data?.light?.in_progress || []),
    ...(runState?.heavy?.inProgress || []),
    ...(runState?.light?.inProgress || []),
  ];
  const jobByRunner = new Map();
  for (const j of inProgressAll) {
    if (j.runner && !jobByRunner.has(j.runner)) {
      jobByRunner.set(j.runner, j);
    }
  }

  const machineState = new Map();

  for (const { key: poolKey, repo, role } of POOL_DEFS) {
    const poolRunners = ciRunners.filter(r => {
      const c = classifyRunner(r.name);
      return c.repo === repo && c.role === role;
    });

    // Determine if this pool's runner data is partial
    // (global partial flag, or the repo that owns these runners failed)
    const repoFqn = repo === 'fork'
      ? 'CuriocityDevAi/agilo-medusa-pos-fork'
      : 'CuriocityDevAi/storeport';
    const isPoolPartial = isGlobalPartial || reposFailed.has(repoFqn);

    const byKind = { mbp: [], imac: [], cloud: [], unknown: [] };
    for (const r of poolRunners) {
      const kind = classifyMachine(r.name);
      (byKind[kind] || byKind.unknown).push(r);
    }

    function machineStatus(runners) {
      if (!runners.length) return { status: 'offline', job: null, partial: isPoolPartial };
      const online = runners.some(r => r.status === 'online');
      // W5fix: 러너가 목록에 존재하고 명시적으로 offline → partial=false (알 수 없음 아님)
      if (!online) return { status: 'offline', job: null, partial: false };

      for (const r of runners) {
        const j = jobByRunner.get(r.name);
        if (j) {
          const promptId = j.prompt_id || null;
          const min = j.running_min ?? null;
          // W9: pr번호·브랜치·잡이름 포함
          const pr = (j.pr && j.pr !== '-') ? j.pr : null;
          const branch = j.head_branch || null;
          const jobName = j.job || j.check || '';
          return { status: 'running', job: { promptId, pr, branch, jobName, min, runnerName: r.name }, partial: false };
        }
      }
      // W6: idle 이지만 partial → '?' 표시
      return { status: 'idle', job: null, partial: isPoolPartial };
    }

    const poolCloudJobs = [
      ...(runState?.heavy?.inProgress || []),
      ...(runState?.light?.inProgress || []),
    ].filter(j => {
      const jRepo = repoShortLocal(j.repo);
      const jLight = j.light ?? (j.check && isLightWorkflow(j.check));
      const jRole = jLight ? 'light' : 'heavy';
      return jRepo === repo && jRole === role && classifyMachine(j.runner) === 'cloud';
    });

    machineState.set(poolKey, {
      mbp:  machineStatus(byKind.mbp),
      imac: machineStatus(byKind.imac),
      cloud: { count: poolCloudJobs.length, jobs: poolCloudJobs },
      unknownRunners: byKind.unknown.map(r => r.name),
    });
  }

  return machineState;
}

function isLightWorkflow(name) {
  if (!name) return false;
  const n = String(name).toLowerCase();
  return n.includes('feature-map') || n.includes('light') || n.includes('check');
}

// Braille spinner frames
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function spinnerChar(frame) {
  return SPINNER_FRAMES[((frame % SPINNER_FRAMES.length) + SPINNER_FRAMES.length) % SPINNER_FRAMES.length];
}

// ─────────────────────────────────────────────────────────────────────
// v1.8: CI 한 줄 표 (§1) · 단위 s/m (§3) · partial→? (§5)
// ─────────────────────────────────────────────────────────────────────

// CI 표 열 폭 (display chars)
const CI_COL_POOL  = 16;   // 'storeport-heavy' = 15
const CI_COL_QUEUE = 22;   // '[M2-1126-A 5m]+1' = 18
const CI_COL_MBP   = 14;
const CI_COL_IMAC  = 14;
const CI_COL_CLOUD = 16;   // '⠹M2-1126-A 5m +2' = 17 → truncated
const CI_COL_AVG   = 8;    // '4.5m' = 4
const CI_SEP       = '  '; // 열 구분자

// CI 표 `평균대기` 열 시작 x 위치 (EAW display cols, 2-space indent 포함)
// W1: 허브 큐 머리줄의 `평균대기` 라벨과 허브 줄 평균대기 값을 이 위치에 맞춤
export const CI_AVG_X = 2 + CI_COL_POOL + CI_SEP.length + CI_COL_QUEUE + CI_SEP.length +
                        CI_COL_MBP + CI_SEP.length + CI_COL_IMAC + CI_SEP.length + CI_COL_CLOUD + CI_SEP.length;

/**
 * §3: 시간 단위 s/m. min < 1 → Xs, min >= 1 → X.Xm
 */
export function fmtDuration(minFloat) {
  if (minFloat == null || minFloat === '') return '-';
  const n = typeof minFloat === 'number' ? minFloat : parseFloat(minFloat);
  if (isNaN(n)) return '-';
  if (n < 1) return `${Math.round(n * 60)}s`;
  // For integer minutes, omit decimal
  if (Number.isInteger(n)) return `${n}m`;
  return `${n.toFixed(1)}m`;
}

/**
 * §1: 기계 칸 (MBP/iMAC). status=offline/idle+partial → `?` 회색 (W6).
 * W4: todayN > 0 → 쉼(N) · 실행 중이면 ⠋ID·잡 3m (N)
 * W8: recentMin < 10 → idle 셀에 `✓Nm` 초록 추가
 * W9: 실행 중 → `⠋#PR·잡이름 Xm (N)` · 열 폭 절단
 * @param {object} machineInfo - { status, job, partial }
 * @param {number} spinnerFrame
 * @param {number} colW - 열 폭 (display cols)
 * @param {number|undefined} todayN - 오늘 처리 잡 수
 * @param {number|undefined} recentMin - 최근 완료 분 (W8)
 */
function fmtMachineCell(machineInfo, spinnerFrame, colW, todayN, recentMin) {
  const { status, job, partial } = machineInfo;
  if (status === 'offline') {
    if (partial) return padEndWidth(col('?', C.dim), colW);
    return padEndWidth(col('OFF', C.red), colW);
  }
  const nStr = typeof todayN === 'number' && todayN > 0 ? `(${todayN})` : '';
  if (status === 'idle') {
    // W6: partial → '?' 회색
    if (partial) return padEndWidth(col('?', C.dim), colW);
    // W8: 10분 내 완료 → `✓Nm` 초록
    const isRecent = typeof recentMin === 'number' && recentMin < 10;
    if (isRecent) {
      const recentPart = `\x1b[32m✓${recentMin}m\x1b[0m`;
      const recentW = displayWidth(`✓${recentMin}m`);
      const baseW = Math.max(0, colW - recentW - 1); // 1 for space
      return padEndWidth(col(`쉼${nStr}`, C.dim), baseW) + ' ' + recentPart;
    }
    return padEndWidth(col(`쉼${nStr}`, C.dim), colW);
  }
  // running — W9: `⠋#PR·잡이름 Xm (N)` 형태 · 열 폭 절단
  const sp = spinnerChar(spinnerFrame);
  const displayId = (job?.pr && job.pr !== '-') ? job.pr
    : (job?.branch ? job.branch.replace(/^refs\/[^/]+\//, '') : (job?.promptId || '?'));
  const jobName = job?.jobName || '';
  const minPart = job?.min != null ? ` ${fmtDuration(job.min)}` : '';
  const nPart = nStr ? ` ${nStr}` : '';
  // 잡 이름 포함 · 초과 시 오른쪽부터 말줄임
  const basePart = jobName ? `${sp}${displayId}·${jobName}` : `${sp}${displayId}`;
  const fullPlain = basePart + minPart + nPart;
  const truncated = truncateWidth(fullPlain, colW);
  return padEndWidth(`${C.yellow}${truncated}${C.reset}`, colW);
}

/**
 * §1: 클라우드 칸. 0건→`—(N)`, 1건→`⠹#PR·잡 Tm (N)`, 2+→`⠹#PR·잡 Tm (N) +N`
 * W4: todayN > 0 → 오늘 처리 잡 수 표시
 * W5: cloudState.jobs 는 실제 cloud(GitHub-hosted) runner 잡만 포함
 * W9: 잡 이름 표시 · 열 폭 절단
 */
function fmtCloudCell(cloudState, spinnerFrame, colW, todayN) {
  const { count, jobs } = cloudState;
  const nStr = typeof todayN === 'number' && todayN > 0 ? `(${todayN})` : '';
  if (!count) return padEndWidth(col(`—${nStr}`, C.dim), colW);

  const sp = spinnerChar(spinnerFrame);
  const firstJob = jobs[0];
  const displayId = (firstJob?.pr && firstJob.pr !== '-') ? firstJob.pr
    : (firstJob?.prompt_id || firstJob?.display || '?');
  const jobName = firstJob?.job || firstJob?.check || '';
  const min = firstJob?.running_min;
  const timeStr = min != null ? ` ${fmtDuration(min)}` : '';
  const nPart = nStr ? ` ${nStr}` : '';
  const extra = count > 1 ? ` +${count - 1}` : '';
  // W9: 잡 이름 포함 · 열 폭 절단
  const basePart = jobName ? `${sp}${displayId}·${jobName}` : `${sp}${displayId}`;
  const fullPlain = basePart + timeStr + nPart + extra;
  const truncated = truncateWidth(fullPlain, colW);
  return padEndWidth(`${C.cyan}${truncated}${C.reset}`, colW);
}

/**
 * §1: 대기 칩 최대 2개 + +N
 */
function fmtQueueCell(qItems, colW) {
  if (!qItems.length) return padEndWidth(col('—', C.dim), colW);

  const chips = [];
  for (let i = 0; i < Math.min(2, qItems.length); i++) {
    const q = qItems[i];
    const pid = q.prompt_id || q.display || q.pr || '?';
    const qm = q.queued_min ?? '-';
    const tStr = typeof qm === 'number' ? fmtDuration(qm) : '?';
    const warn = typeof qm === 'number' && qm >= 10;
    chips.push(warn ? `${C.yellow}[${pid} ${tStr}]${C.reset}` : `[${pid} ${tStr}]`);
  }

  const extra = qItems.length > 2 ? col(`+${qItems.length - 2}`, C.dim) : '';
  const content = chips.join('') + extra;
  return padEndWidth(content, colW);
}

/**
 * §1: 오늘 처리 행 — CI 표 열 아래에 N건·avgXm (MBP / iMAC / 클라우드 각각 정렬)
 * W8: machineRecentStats 에서 최근 10분 내 완료 → `✓Nm` 초록 추가
 * @param {object|null} machineRecentStats - { 'storeport-heavy-mbp': minAgo, ... }
 */
function buildTodayProcessedRow(todayStats, cloudCostEst, todayMachineStats, machineRecentStats) {
  if (!todayStats && !todayMachineStats) return null;

  // 라벨 셀: 풀 + SEP + 대기 위치를 차지 (헤더의 풀/대기 열과 같은 너비)
  const labelWidth = CI_COL_POOL + CI_SEP.length + CI_COL_QUEUE;
  const labelCell = padEndWidth('오늘 처리(잡)', labelWidth);

  // W8: 기계 전체 최근 완료 ✓Nm 계산
  function overallRecentMin(kind) {
    if (!machineRecentStats) return null;
    const vals = Object.entries(machineRecentStats)
      .filter(([k]) => k.endsWith(`-${kind}`))
      .map(([, v]) => v)
      .filter(v => v < 10);
    return vals.length ? Math.min(...vals) : null;
  }

  function buildMachineCol(str, colW, recentMin) {
    if (typeof recentMin === 'number' && recentMin < 10) {
      const recentPart = `\x1b[32m✓${recentMin}m\x1b[0m`;
      const rW = displayWidth(`✓${recentMin}m`);
      return padEndWidth(str, Math.max(0, colW - rW - 1)) + ' ' + recentPart;
    }
    return padEndWidth(str, colW);
  }

  // MBP 칸
  let mbpStr;
  if (todayMachineStats) {
    const mbp = todayMachineStats.mbp;
    mbpStr = mbp && mbp.jobs > 0
      ? `${mbp.jobs}건·${fmtDuration(mbp.avgRun ?? 0)}`
      : '0건';
  } else {
    const mh = todayStats?.['mac-heavy'];
    const ml = todayStats?.['mac-light'];
    const macJobs = (mh?.jobs || 0) + (ml?.jobs || 0);
    const macAvgRun = (mh && ml)
      ? ((mh.avg_run_min || 0) * (mh.jobs || 0) + (ml.avg_run_min || 0) * (ml.jobs || 0)) / Math.max(1, macJobs)
      : (mh?.avg_run_min || ml?.avg_run_min || 0);
    mbpStr = macJobs > 0 ? `${macJobs}건·${fmtDuration(macAvgRun)}` : '0건';
  }
  const mbpCell = buildMachineCol(mbpStr, CI_COL_MBP, overallRecentMin('mbp'));

  // iMAC 칸
  let imacStr;
  if (todayMachineStats) {
    const imac = todayMachineStats.imac;
    imacStr = imac && imac.jobs > 0
      ? `${imac.jobs}건·${fmtDuration(imac.avgRun ?? 0)}`
      : '0건';
  } else {
    imacStr = '—';
  }
  const imacCell = buildMachineCol(imacStr, CI_COL_IMAC, overallRecentMin('imac'));

  // 클라우드 칸
  const cl = todayStats?.['cloud'];
  const cloudJobs = cl?.jobs || 0;
  const cloudAvg = cl?.avg_run_min;
  const costStr = cloudCostEst != null ? ` $${cloudCostEst.toFixed(2)}` : '';
  const cloudStr = cloudJobs > 0
    ? `${cloudJobs}건·${cloudAvg != null ? fmtDuration(cloudAvg) : '?'}${costStr}`
    : `0건${costStr}`;
  const cloudCell = padEndWidth(cloudStr, CI_COL_CLOUD);

  return `  ${labelCell}${CI_SEP}${mbpCell}${CI_SEP}${imacCell}${CI_SEP}${cloudCell}`;
}

/**
 * §4: 허브 줄 평균대기 — CI_AVG_X 위치에 고정 · 창 폭 밖이면 생략 (W1)
 */
function appendHubWait(lineStr, hub, hubWaitStats, W) {
  const hw = hubWaitStats?.[hub];
  if (hw?.avgMin == null) return lineStr;
  const hwText = fmtDuration(hw.avgMin);
  const hwW = displayWidth(hwText);
  if (CI_AVG_X + hwW > W) return lineStr; // 열이 창 폭 밖 → 생략
  const leftW = displayWidth(lineStr);
  const pad = Math.max(2, CI_AVG_X - leftW);
  return lineStr + ' '.repeat(pad) + col(hwText, C.dim);
}

/**
 * v1.8 메인 렌더 함수 (§1~7)
 *
 * @param {object} data
 *   allJson, runState, cloudData, runnerAlerts, ciAlerts, ciDimAlerts,
 *   timeStr, fullMode, todayStats, cloudTodayCount, cloudLimit, lastCiByRepo,
 *   countdownSec, hubReportStatus,
 *   spinnerFrame: number (default 0),
 *   terminalWidth: number (default 120)
 *   version: string (default '1.8')
 *   versionNote: string
 *   fileCommitDate: string
 *   poolWaitStats: { [poolKey]: { avgWait } }
 *   hubWaitStats: { [hub]: { avgMin, count } }
 *   todayMachineStats: { mbp: { jobs, avgRun }, imac: { jobs, avgRun } }
 *   todayPoolMachineStats: { [poolKey]: { mbp: N, imac: N, cloud: N } }  W4
 *   machineRecentStats: { [poolKey-kind]: minAgo }  W8
 *   summaryPR: number  W7
 *   summaryPT: number  W7
 *   summaryJobs: number  W7
 *   cloudPR: number  W10 — 오늘 클라우드 잡 1건 이상 돈 PR 수 (고유)
 *   cloudPT: number  W10 — 그 PR들을 만든/고친 오늘 프롬프트 수
 *   mbpPR: number  W10 — 오늘 MBP 잡 1건 이상 돈 PR 수 (고유)
 *   mbpPT: number  W10 — MBP PR들의 오늘 프롬프트 수
 *   imacPR: number  W10 — 오늘 iMAC 잡 1건 이상 돈 PR 수 (고유)
 *   imacPT: number  W10 — iMAC PR들의 오늘 프롬프트 수
 *
 * NOTE: 전체 PR · PT 는 중복 제거한 고유 수 (동일 PR 이 MBP+iMAC+클라우드에서 돌 수 있음).
 *       전체 잡 = MBP잡 + iMAC잡 + 클라우드잡. 전체 PR ≤ 세 줄 PR 합.
 */
export function renderLayout(data) {
  const {
    allJson, runState, cloudData, runnerAlerts, ciAlerts, ciDimAlerts,
    timeStr, fullMode, todayStats, cloudTodayCount, cloudLimit, lastCiByRepo,
    countdownSec, hubReportStatus,
    spinnerFrame = 0,
    terminalWidth = 120,
    version = '1.8',
    versionNote = '',
    fileCommitDate = '',
    poolWaitStats,
    hubWaitStats,
    todayMachineStats,
    todayPoolMachineStats,
    machineRecentStats,
    summaryPR,
    summaryPT,
    summaryJobs,
    cloudPR = null,
    cloudPT = null,
    mbpPR = null,
    mbpPT = null,
    imacPR = null,
    imacPT = null,
  } = data;

  const W = Math.max(terminalWidth, 60);
  const hr = (char = '─') => char.repeat(W - 1);
  const lines = [];

  // ── 1. 헤더 1줄 (§6: heartbeat 중복 없이 version 포함) ──────────────────
  const allAlerts = [...(runnerAlerts || []), ...(ciAlerts || [])];
  const inProgressHeavy = runState?.heavy?.inProgress || [];
  const inProgressLight = runState?.light?.inProgress || [];
  const totalInProgress = inProgressHeavy.length + inProgressLight.length;

  const todayCompletedCount = (() => {
    if (todayStats) {
      const mh = todayStats['mac-heavy'];
      const ml = todayStats['mac-light'];
      const cl = todayStats['cloud'];
      return (mh?.jobs || 0) + (ml?.jobs || 0) + (cl?.jobs || 0);
    }
    return 0;
  })();

  const alertBadge = allAlerts.length > 0
    ? col(`■주의 ${allAlerts.length}`, C.red, C.bold)
    : col('■주의 0', C.dim);
  const inProgBadge = totalInProgress > 0
    ? col(`●진행 ${totalInProgress}`, C.green, C.bold)
    : col(`●진행 0`, C.dim);
  const todayBadge = col(`✔오늘 ${todayCompletedCount}`, C.dim);
  const runnerVer = allJson?.runner ? `runner ${allJson.runner}` : 'runner ?';

  const hbAge = allJson?.at ? Math.round((Date.now() - new Date(allJson.at).getTime()) / 60000) : null;
  const hbStr = hbAge !== null
    ? (hbAge >= 10 ? col(`heartbeat ${hbAge}분전`, C.red) : `heartbeat ${hbAge}분전`)
    : 'heartbeat ?';

  const verStr = fileCommitDate ? `v${version} (${fileCommitDate})` : `v${version}`;
  const verNote = versionNote ? `  ${versionNote}` : '';
  lines.push(`${C.bold}ci-watch ${verStr}${C.reset}  ${timeStr}  ${inProgBadge}  ${alertBadge}  ${todayBadge}  ${runnerVer}  ${hbStr}${verNote}`);

  // ── 3. 허브 큐 섹션 (§4: 평균대기 열 · 단위 s/m) ─────────────────────
  const hubs = ['m0', 'm1', 'm2', 'm3', 'r0'];
  const hubCounts = hubs.map(h => {
    const pending = data.hubPending?.[h] || [];
    return pending.length;
  });
  const hubSummary = hubs.map((h, i) => `${h} ${hubCounts[i]}`).join(' · ');
  // W1: `평균대기` 라벨을 CI 표 `평균대기` 열 시작(CI_AVG_X)에 고정
  const hubAvgTitle = '평균대기';
  const hubLeftPart = `─ 허브 큐 (${hubSummary}) `;
  const hubLeftW = displayWidth(hubLeftPart);
  const hubAvgTitleW = displayWidth(hubAvgTitle);
  if (CI_AVG_X + hubAvgTitleW <= W) {
    // 라벨을 CI_AVG_X에 배치: fillToAvg = CI_AVG_X - hubLeftW - 1(공백 자리)
    const fillToAvg = '─'.repeat(Math.max(0, CI_AVG_X - hubLeftW - 1));
    const fillAfter = '─'.repeat(Math.max(0, W - CI_AVG_X - hubAvgTitleW - 1));
    lines.push(col(hubLeftPart + fillToAvg, C.bold) + ' ' + col(hubAvgTitle, C.dim) + col(fillAfter, C.bold));
  } else {
    // 창 폭 부족 — 라벨 생략 · 대시로 채움
    const hubFill = '─'.repeat(Math.max(0, W - hubLeftW - 1));
    lines.push(col(hubLeftPart + hubFill, C.bold));
  }

  for (const hub of hubs) {
    const h = allJson?.hubs?.[hub];
    if (!h) {
      const noDataLine = `  ${col(hub, C.bold)}  ${col('—', C.dim)}`;
      lines.push(appendHubWait(noDataLine, hub, hubWaitStats, W));
      continue;
    }
    const cur = h.current;
    const pending = data.hubPending?.[hub] || [];
    const chips = pending.map(item => {
      const id = typeof item === 'string' ? item : item.id;
      const ageMin = typeof item === 'object' && item.ageMin != null ? ` ${item.ageMin}분` : '';
      return `[${id}${ageMin}]`;
    }).join('');

    if (cur) {
      const rptStatus = hubReportStatus?.[hub];
      let statusStr;
      if (rptStatus && !rptStatus.reportExists) {
        const wc = rptStatus.workMin >= 60 ? C.red : rptStatus.workMin >= 30 ? C.yellow : '';
        const workStr = wc ? `${wc}작업 ${rptStatus.workMin}분${C.reset}` : `작업 ${rptStatus.workMin}분`;
        const wt = rptStatus.waitMin >= 5 ? C.red : C.yellow;
        const waitStr = `${wt}⚠ 리포트 미착지 ${rptStatus.waitMin}분${C.reset}`;
        statusStr = `${col(cur, C.yellow)}  ${workStr} · ${waitStr}`;
      } else {
        const startMs = h.started_at ? Date.now() - new Date(h.started_at).getTime() : null;
        const elapMin = startMs !== null ? Math.round(startMs / 60000) : null;
        const ec = elapMin !== null && elapMin >= 60 ? C.red
          : elapMin !== null && elapMin >= 30 ? C.yellow : '';
        const elapStr = elapMin !== null
          ? (ec ? `${ec}${elapMin}분${C.reset}` : `${elapMin}분`)
          : '?분';
        statusStr = `${col(cur, C.yellow)}  ${elapStr}`;
      }
      const chipsStr = chips ? `  ${col(chips, C.dim)}` : '';
      const curLine = `  ${col(hub, C.bold)}  ${statusStr}${chipsStr}`;
      lines.push(appendHubWait(curLine, hub, hubWaitStats, W));

      // └ 는 실행 중일 때만 (§4)
      const sp = spinnerChar(spinnerFrame);
      lines.push(`    └ ${col(sp, C.cyan)} ${col(cur, C.dim)}  작업 중`);
    } else {
      const chipsStr = chips ? `  ${col(chips, C.dim)}` : '';
      const idleLine = `  ${col(hub, C.bold)}  ${col('—', C.green)}${chipsStr}`;
      lines.push(appendHubWait(idleLine, hub, hubWaitStats, W));
    }
  }

  // git state
  const gs = allJson?.git_state;
  const gitStr = gs
    ? `git: ahead=${gs.ahead} behind=${gs.behind}${gs.rebase_in_progress ? col('  REBASE중', C.red) : ''}${gs.needs_human ? col('  ★사람필요', C.red) : ''}`
    : 'git: ?';
  lines.push(`  ${col(gitStr, C.dim)}`);

  // ── 4. CI 큐 섹션 (§1: 한 줄 표) ────────────────────────────────────
  const machineState = buildMachineState(allJson, runState);

  const heavy = runState?.heavy || { inProgress: [], queued: [] };
  const light = runState?.light || { inProgress: [], queued: [] };

  const shQ = heavy.queued.filter(q => repoShortLocal(q.repo) === 'storeport');
  const fhQ = heavy.queued.filter(q => repoShortLocal(q.repo) === 'fork');
  const slQ = light.queued.filter(q => repoShortLocal(q.repo) === 'storeport');
  const flQ = light.queued.filter(q => repoShortLocal(q.repo) === 'fork');

  const queueCounts = `SH ${shQ.length} · SL ${slQ.length} · FH ${fhQ.length} · FL ${flQ.length}`;

  // 섹션 구분자
  const ciSepStr = `─ CI 큐 (${queueCounts}) `;
  const ciSepFill = '─'.repeat(Math.max(0, W - displayWidth(ciSepStr) - 1));
  lines.push(col(ciSepStr + ciSepFill, C.bold));

  // 열 제목 행 (§1: 구역 제목줄 1회)
  const hdrPool  = padEndWidth(col('풀', C.dim), CI_COL_POOL);
  const hdrQueue = padEndWidth(col('대기', C.dim), CI_COL_QUEUE);
  const hdrMbp   = padEndWidth(col('MBP M1', C.dim), CI_COL_MBP);
  const hdrImac  = padEndWidth(col('iMAC M1', C.dim), CI_COL_IMAC);
  const hdrCloud = padEndWidth(col('클라우드', C.dim), CI_COL_CLOUD);
  const hdrAvg   = col('평균대기', C.dim);
  lines.push(`  ${hdrPool}${CI_SEP}${hdrQueue}${CI_SEP}${hdrMbp}${CI_SEP}${hdrImac}${CI_SEP}${hdrCloud}${CI_SEP}${hdrAvg}`);

  const poolQueues = {
    'storeport-heavy': shQ,
    'storeport-light': slQ,
    'fork-heavy': fhQ,
    'fork-light': flQ,
  };

  const unknownRunnersAll = new Set();

  for (const { key: poolKey } of POOL_DEFS) {
    const qItems = poolQueues[poolKey] || [];
    const ms = machineState.get(poolKey) || {
      mbp:  { status: 'offline', job: null, partial: false },
      imac: { status: 'offline', job: null, partial: false },
      cloud: { count: 0, jobs: [] },
      unknownRunners: [],
    };

    for (const r of (ms.unknownRunners || [])) unknownRunnersAll.add(r);

    const poolToday = todayPoolMachineStats?.[poolKey] || {};
    const poolCell  = padEndWidth(col(poolKey, C.bold), CI_COL_POOL);
    const queueCell = fmtQueueCell(qItems, CI_COL_QUEUE);
    // W8: per-pool machine recent stats
    const mbpCell   = fmtMachineCell(ms.mbp, spinnerFrame, CI_COL_MBP, poolToday.mbp, machineRecentStats?.[`${poolKey}-mbp`]);
    const imacCell  = fmtMachineCell(ms.imac, spinnerFrame, CI_COL_IMAC, poolToday.imac, machineRecentStats?.[`${poolKey}-imac`]);
    const cloudCell = fmtCloudCell(ms.cloud, spinnerFrame, CI_COL_CLOUD, poolToday.cloud);

    const poolAw = poolWaitStats?.[poolKey]?.avgWait;
    const avgCell = col(poolAw != null ? fmtDuration(poolAw) : '-', C.dim);

    lines.push(`  ${poolCell}${CI_SEP}${queueCell}${CI_SEP}${mbpCell}${CI_SEP}${imacCell}${CI_SEP}${cloudCell}${CI_SEP}${avgCell}`);
  }

  // 오늘 처리 행 (§1: 마지막 줄) — W8 machineRecentStats 전달
  const todayRow = buildTodayProcessedRow(todayStats, todayStats?.cloud_cost_est_usd ?? null, todayMachineStats, machineRecentStats);
  if (todayRow) lines.push(col(todayRow, C.dim));

  // 미분류 러너 경고
  if (unknownRunnersAll.size > 0) {
    for (const name of unknownRunnersAll) {
      lines.push(col(`  ⚠ 미분류 러너: ${name}`, C.red));
    }
  }

  // ── 5. 진행 중 섹션 ───────────────────────────────────────────────────
  const inProgressTitle = `─ 진행 중 (${totalInProgress}) ` + '─'.repeat(Math.max(0, W - 2 - displayWidth(`─ 진행 중 (${totalInProgress}) `)));
  lines.push(col(inProgressTitle, C.bold));

  for (const j of [...inProgressHeavy, ...inProgressLight]) {
    const pid = j.prompt_id || j.display || j.pr || '-';
    const hub = j.hub || '';
    const jobName = j.check || j.job || '';
    const min = j.running_min ?? '-';
    const sp = spinnerChar(spinnerFrame);
    const c = typeof min === 'number' && min >= 25 ? C.red
      : typeof min === 'number' && min >= 15 ? C.yellow : C.green;
    const timeStr2 = typeof min === 'number' ? fmtDuration(min) : '-';
    lines.push(`  ${col(sp, c)} ${col(pid, C.bold)}  ${hub}  ${jobName}  ${c}${timeStr2}${C.reset}`);
  }

  if (totalInProgress === 0) {
    lines.push(col('  —', C.dim));
  }

  // ── 6. 오늘 완료 섹션 ─────────────────────────────────────────────────
  const doneTitle = `─ 오늘 완료 ${todayCompletedCount} (r 갱신 · q 종료) ` + '─'.repeat(Math.max(0, W - 2 - displayWidth(`─ 오늘 완료 ${todayCompletedCount} (r 갱신 · q 종료) `)));
  lines.push(col(doneTitle, C.bold));

  if (lastCiByRepo && lastCiByRepo.length > 0) {
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
      const resIcon = item.conclusion === 'success' ? col('✔', C.green)
        : item.conclusion === 'failure' ? col('✗', C.red)
        : col(item.conclusion || '?', C.dim);
      const wf = (item.workflow || '-').slice(0, 20);
      const mc = minsAgo > 30 ? C.red : minsAgo > 15 ? C.yellow : '';
      lines.push(`  ${shortRepo.padEnd(10)}  ${wibTime} WIB  (${mc}${minsAgo}분 전${C.reset})  ${resIcon}  ${wf}`);
    }
  }

  const cd = cloudData || { realCount: 0, limit: 5, totalMin: 0, last3: [] };

  // W10: 4줄 — MBP M1 오늘 / iMAC M1 오늘 / 클라우드 오늘 / 전체 오늘
  // 전체 PR·PT = 중복 제거 고유 수 (동일 PR이 여러 기계에서 돌 수 있음). 전체 잡 = 세 줄 합.
  {
    const mbpJobs = todayMachineStats?.mbp?.jobs ?? 0;
    const imacJobs = todayMachineStats?.imac?.jobs ?? 0;
    const cloudJobs = cd.realCount;
    const totalJobs = summaryJobs ?? (mbpJobs + imacJobs + cloudJobs);
    const totalPR = summaryPR ?? 0;
    const totalPT = summaryPT ?? 0;

    const LBL_W = 14; // 라벨 열 폭 (display cols) — '클라우드 오늘' = 7 CJK = 14
    const fmtRow = (label, pr, pt, jobs, suffix = '') => {
      const lbl = padEndWidth(label, LBL_W);
      return col(`  ${lbl}  PR ${pr} · PT ${pt} · 잡 ${jobs}${suffix}`, C.dim);
    };

    lines.push(fmtRow('MBP M1 오늘', mbpPR ?? 0, mbpPT ?? 0, mbpJobs));
    lines.push(fmtRow('iMAC M1 오늘', imacPR ?? 0, imacPT ?? 0, imacJobs));

    // 클라우드 오늘 — 넘김 X/Y (한도 소진 시 빨강)
    const overflowUsed = cloudTodayCount ?? 0;
    const overflowLim = cloudLimit || 5;
    const overflowExhausted = overflowUsed >= overflowLim;
    const overflowText = `${overflowUsed}/${overflowLim}`;
    const overflowStr = overflowExhausted ? col(overflowText, C.red) : overflowText;
    lines.push(
      col(`  ${padEndWidth('클라우드 오늘', LBL_W)}  PR ${cloudPR ?? 0} · PT ${cloudPT ?? 0} · 잡 ${cloudJobs} · 넘김 `, C.dim) + overflowStr,
    );

    lines.push(fmtRow('전체 오늘', totalPR, totalPT, totalJobs));
  }

  // err_tail — W6: watchdog/claim/self-update 로그 줄은 화면 미출력 (파일 로그로만)
  const ERR_TAIL_SCREEN_FILTERS = [
    /^\[hub-runner/,
    /gh-watchdog/i,
    /^\[claim\]/,
    /self-update/i,
    /partial skip/i,
  ];
  const errLines2 = allJson?.err_tail
    ? allJson.err_tail.split('\n').filter(Boolean)
        .filter(l => !ERR_TAIL_SCREEN_FILTERS.some(p => p.test(l)))
        .slice(-2)
    : [];
  if (errLines2.length) {
    for (const l of errLines2) lines.push(col('  ' + l.slice(0, W - 4), C.dim));
  }

  const cdSec = typeof countdownSec === 'number' ? countdownSec : 30;
  lines.push(col(`  다음 갱신 ${cdSec}초 | r 지금 갱신 · q 종료${fullMode ? '' : '  --full: 전체 목록'}`, C.dim));

  // ── 7. 주의 섹션 (맨 아래 · 0건이면 생략) ─────────────────────────────
  if (allAlerts.length > 0 || (ciDimAlerts && ciDimAlerts.length > 0)) {
    const alertTitle2 = `─ 주의 (${allAlerts.length}) ` + '─'.repeat(Math.max(0, W - 2 - displayWidth(`─ 주의 (${allAlerts.length}) `)));
    lines.push(col(alertTitle2, C.bold));
    for (const a of allAlerts.slice(0, 5)) {
      const msg = a.msg || a.detail || '';
      lines.push(col(`  ■ ${msg}`, C.red));
    }
    for (const a of (ciDimAlerts || [])) {
      lines.push(col(`  ⏭ ${a.msg}`, C.dim));
    }
  }

  return lines;
}
