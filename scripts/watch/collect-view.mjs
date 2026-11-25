// scripts/watch/collect-view.mjs  M2-1125-I — 확정 레이아웃용 확장 뷰 수집기
// buildPipelineView() 위에 추가 데이터(허브 큐 · CI 풀 · 러너 상태)를 얹는다.
// 이 파일은 GitHub 호출을 하지 않는다.

import { buildPipelineView } from './pipeline-view.mjs';
import {
  resolvePaths, readAllJson, scanQueueFiles, readClaim, readQueueTitle,
  QUEUE_HUBS,
} from './sources-local.mjs';

const IN_PROGRESS_STAGES = ['hub', 'report', 'pr', 'ci_pending', 'ci_running', 'ci_result', 'review', 'merge'];

const STAGE_LABEL = {
  hub:        '작업',
  report:     '리포트',
  pr:         'PR',
  ci_pending: 'CI대기',
  ci_running: 'CI실행',
  ci_result:  'CI결과',
  review:     '리뷰',
  merge:      '머지',
};

/** 단계 띠 8칸: ●완료 ◐현재 ○남음 */
export function stageStrip(currentStage) {
  const idx = IN_PROGRESS_STAGES.indexOf(currentStage);
  if (idx < 0) return '○○○○○○○○';
  return IN_PROGRESS_STAGES.map((_, i) => {
    if (i < idx) return '●';
    if (i === idx) return '◐';
    return '○';
  }).join('');
}

export function stageLabel(col) {
  return STAGE_LABEL[col] || col;
}

/**
 * 러너 이름에서 풀 종류 추론.
 * storeport-heavy · storeport-light · fork-heavy · fork-light
 */
function classifyRunnerPool(name) {
  const lc = String(name || '').toLowerCase();
  if (lc.includes('fork') && lc.includes('light')) return 'fork-light';
  if (lc.includes('fork')) return 'fork-heavy';
  if (lc.includes('light')) return 'storeport-light';
  return 'storeport-heavy';
}

/**
 * 풀별 러너 상태 집계.
 * 한 풀에 러너가 여럿이면:
 *   - 전원 offline → offline
 *   - 하나라도 busy → busy
 *   - 그 외 → online
 */
function poolStatus(runners) {
  if (!runners || runners.length === 0) return 'unknown';
  const anyOnline = runners.some(r => r.status !== 'offline');
  if (!anyOnline) return 'offline';
  const anyBusy = runners.some(r => r.busy);
  return anyBusy ? 'busy' : 'online';
}

/**
 * 풀 상태 → 표시 점.
 *   online → ● (green)
 *   busy   → ▲ (yellow / dim)
 *   offline → ■ (red)
 *   unknown → · (dim)
 */
export function poolDot(status) {
  switch (status) {
    case 'online':  return { ch: '●', color: 'green' };
    case 'busy':    return { ch: '▲', color: 'yellow' };
    case 'offline': return { ch: '■', color: 'red' };
    default:        return { ch: '·', color: 'dim' };
  }
}

const POOL_ORDER = ['storeport-heavy', 'storeport-light', 'fork-heavy', 'fork-light'];

/**
 * buildPipelineView() + 추가 필드.
 *
 * 반환 추가 필드:
 *   runnerVersion  : string (all.json .runner)
 *   ciRunnerPools  : Map<pool, { status, runners }> — 4개 풀
 *   ciPools        : Map<pool, { queued, queuedPrs, oldestMin, offlineReason }>
 *   hubQueue       : Map<hub, Array<{ id, ageMin, title }>> — 미착수 프롬프트
 *   inProgress     : Card[]  — column !== 'queue'
 *   caution        : Card[]  — inProgress 중 level !== 'green'
 */
export function buildExtendedView({
  repoRoot,
  now = new Date(),
  nowMs = Date.now(),
  allJson: allJsonOverride,
} = {}) {
  const paths = resolvePaths(repoRoot);
  const allJson = allJsonOverride || readAllJson(paths) || {};

  // 1) 기본 파이프라인 뷰
  const base = buildPipelineView({ repoRoot, now, nowMs, allJson });

  // 2) 러너 버전
  const runnerVersion = allJson.runner || '';

  // 3) CI 러너 풀 상태
  const rawRunners = (allJson.ci_runners || []).map(r => ({
    name: r.name,
    status: r.status || 'offline',
    busy: !!r.busy,
    pool: classifyRunnerPool(r.name),
  }));

  const runnersByPool = new Map();
  for (const p of POOL_ORDER) runnersByPool.set(p, []);
  for (const r of rawRunners) {
    const list = runnersByPool.get(r.pool);
    if (list) list.push(r);
    else runnersByPool.set(r.pool, [r]);
  }

  const ciRunnerPools = new Map();
  for (const p of POOL_ORDER) {
    const runners = runnersByPool.get(p) || [];
    ciRunnerPools.set(p, { status: poolStatus(runners), runners });
  }

  // 4) CI 큐 풀 데이터 (all.json ci.data)
  const ciData = allJson.ci?.data || {};
  const heavyPrs  = ciData.heavy?.queued_prs || [];
  const lightPrs  = ciData.light?.queued_prs || [];

  const ciPools = new Map([
    ['storeport-heavy', {
      queued: heavyPrs.length,
      queuedPrs: heavyPrs,
      oldestMin: ciData.heavy?.oldest_queued_min ?? null,
      offlineReason: ciRunnerPools.get('storeport-heavy')?.status === 'offline'
        ? 'storeport-heavy 러너 OFF' : null,
    }],
    ['storeport-light', {
      queued: lightPrs.length,
      queuedPrs: lightPrs,
      oldestMin: ciData.light?.oldest_queued_min ?? null,
      offlineReason: ciRunnerPools.get('storeport-light')?.status === 'offline'
        ? 'storeport-light 러너 OFF' : null,
    }],
    ['fork-heavy', {
      queued: 0,
      queuedPrs: [],
      oldestMin: null,
      offlineReason: ciRunnerPools.get('fork-heavy')?.status === 'offline'
        ? 'fork-heavy 러너 OFF — 클라우드로 넘기기 필요' : null,
    }],
    ['fork-light', {
      queued: 0,
      queuedPrs: [],
      oldestMin: null,
      offlineReason: ciRunnerPools.get('fork-light')?.status === 'offline'
        ? 'fork-light 러너 OFF' : null,
    }],
  ]);

  // 5) 허브 큐 (미착수 프롬프트, 허브별)
  const hubQueue = new Map();
  for (const hub of QUEUE_HUBS) hubQueue.set(hub, []);

  for (const q of scanQueueFiles(paths)) {
    const claim = readClaim(paths, q.id);
    const claimed = !!(claim && claim.state && claim.state !== 'issued');
    if (claimed) continue;
    const ageMin = Math.max(0, Math.round((nowMs - q.mtimeMs) / 60000));
    const title = readQueueTitle(q.filePath) || '';
    const list = hubQueue.get(q.hub) || [];
    list.push({ id: q.id, ageMin, title });
    hubQueue.set(q.hub, list);
  }
  for (const list of hubQueue.values()) list.sort((a, b) => a.id.localeCompare(b.id));

  // 6) 진행 중 / 주의
  const inProgress = base.cards.filter(c => c.column !== 'queue');
  const caution    = inProgress.filter(c => c.level !== 'green');

  return {
    ...base,
    runnerVersion,
    ciRunnerPools,
    ciPools,
    hubQueue,
    inProgress,
    caution,
  };
}

export { POOL_ORDER, IN_PROGRESS_STAGES, QUEUE_HUBS };
