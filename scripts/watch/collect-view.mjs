// scripts/watch/collect-view.mjs  M2-1125-J — 확정 레이아웃 (11:04 개정판) 확장 뷰 수집기
// buildPipelineView() 위에 추가 데이터(허브 큐 · CI 풀 · 러너 상태 · 큐 정체 경보)를 얹는다.
// PR 머지 여부 확인을 위해 gh pr view 를 선택적으로 호출한다(30초 캐시, 실패 시 무시).

import { execSync } from 'node:child_process';
import { buildPipelineView } from './pipeline-view.mjs';
import {
  resolvePaths, readAllJson, scanQueueFiles, readClaim, readQueueTitle,
  QUEUE_HUBS,
} from './sources-local.mjs';

// ── 큐 정체 판정 기준 상수 ────────────────────────────────────────────────
export const HUB_PICKUP_RED_SEC = 60;
export const CI_PICKUP_RED_SEC  = 60;
export const CLOUD_PICKUP_RED_SEC = 180;

// ── 9단계 띠 ─────────────────────────────────────────────────────────────
const IN_PROGRESS_STAGES = [
  'queue', 'hub', 'report', 'pr',
  'ci_pending', 'ci_running', 'ci_result', 'review', 'merge',
];

const STAGE_LABEL = {
  queue:      '큐',
  hub:        '작업',
  report:     '리포트',
  pr:         'PR',
  ci_pending: 'CI대기',
  ci_running: 'CI실행',
  ci_result:  'CI결과',
  review:     '리뷰',
  merge:      '머지',
};

/** 단계 띠 9칸: ●완료 ◐현재 ○남음 */
export function stageStrip(currentStage) {
  const idx = IN_PROGRESS_STAGES.indexOf(currentStage);
  if (idx < 0) return '○○○○○○○○○';
  return IN_PROGRESS_STAGES.map((_, i) => {
    if (i < idx) return '●';
    if (i === idx) return '◐';
    return '○';
  }).join('');
}

export function stageLabel(col) {
  return STAGE_LABEL[col] || col;
}

// ── PR 머지 확인 (gh pr view + 30초 캐시) ────────────────────────────────
const _prMergeCache = new Map();

export function defaultFetchPrState(prNumber) {
  const now = Date.now();
  const cached = _prMergeCache.get(prNumber);
  if (cached && now - cached.cachedAt < 30_000) return cached;
  try {
    const out = execSync(
      `gh pr view ${prNumber} --repo CuriocityDevAi/storeport --json state,mergedAt 2>/dev/null`,
      { timeout: 5000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const data = JSON.parse(out);
    const result = { state: data.state, mergedAt: data.mergedAt || null, cachedAt: now };
    _prMergeCache.set(prNumber, result);
    return result;
  } catch { return null; }
}

// ── CI 러너 풀 분류 ───────────────────────────────────────────────────────

function classifyRunnerPool(name) {
  const lc = String(name || '').toLowerCase();
  if (lc.includes('fork') && lc.includes('light')) return 'fork-light';
  if (lc.includes('fork')) return 'fork-heavy';
  if (lc.includes('light')) return 'storeport-light';
  return 'storeport-heavy';
}

function poolStatus(runners) {
  if (!runners || runners.length === 0) return 'unknown';
  const anyOnline = runners.some(r => r.status !== 'offline');
  if (!anyOnline) return 'offline';
  const anyBusy = runners.some(r => r.busy);
  return anyBusy ? 'busy' : 'online';
}

export function poolDot(status) {
  switch (status) {
    case 'online':  return { ch: '●', color: 'green' };
    case 'busy':    return { ch: '▲', color: 'yellow' };
    case 'offline': return { ch: '■', color: 'red' };
    default:        return { ch: '·', color: 'dim' };
  }
}

const POOL_ORDER = ['storeport-heavy', 'storeport-light', 'fork-heavy', 'fork-light'];
const POOL_ABBR  = {
  'storeport-heavy': 'SH',
  'storeport-light': 'SL',
  'fork-heavy':      'FH',
  'fork-light':      'FL',
};

export { POOL_ORDER, POOL_ABBR };

// ── buildExtendedView ─────────────────────────────────────────────────────

/**
 * buildPipelineView() + 추가 필드.
 *
 * 반환 추가 필드:
 *   runnerVersion   : string
 *   ciRunnerPools   : Map<pool, { status, runners }>
 *   ciPools         : Map<pool, { queued, queuedPrs, oldestMin, oldestSec,
 *                                 inProgressItems, offlineReason, congested }>
 *   hubQueue        : Map<hub, Array<{ id, ageMin, ageSec, title }>>
 *   inProgress      : Card[]
 *   caution         : Card[]
 *   congestionAlerts: Array<{ kind, hub|pool|poolAbbr, id, ageSec, ageMin, reason }>
 *
 * @param {Function} [fetchPrState]  테스트용 PR 상태 주입 함수 (pr번호 → {state,mergedAt})
 */
export function buildExtendedView({
  repoRoot,
  now = new Date(),
  nowMs = Date.now(),
  allJson: allJsonOverride,
  fetchPrState = defaultFetchPrState,
} = {}) {
  const paths   = resolvePaths(repoRoot);
  const allJson = allJsonOverride || readAllJson(paths) || {};

  // 1) 기본 파이프라인 뷰
  const base = buildPipelineView({ repoRoot, now, nowMs, allJson });

  // 2) PR 머지 여부 보강 (review/ci_result 카드 · 30초 캐시 · 실패 시 현상 유지)
  for (const card of base.cards) {
    if (!['review', 'ci_result', 'pr', 'ci_pending'].includes(card.column)) continue;
    const prNum = card.extra?.pr?.number;
    if (!prNum) continue;
    let prData = null;
    try { prData = fetchPrState(prNum); } catch {}
    if (!prData) continue;
    if (prData.state === 'merged' || prData.state === 'closed') {
      const mAt = prData.mergedAt ? new Date(prData.mergedAt).getTime() : nowMs;
      card.column  = 'merge';
      card.since   = new Date(mAt);
      card.ageMin  = Math.max(0, Math.round((nowMs - mAt) / 60000));
      card.predicted = false;
    }
  }

  // 3) 'report' 단계 + done claim 인 카드 → 경보 제외
  for (const card of base.cards) {
    if (card.column !== 'report') continue;
    const claim = readClaim(paths, card.id);
    if (claim?.state === 'done') {
      card.level  = 'green';
      card.mark   = '●';
      card.reason = null;
    }
  }

  // 4) R0 카드 리뷰 결과 칩 준비 (render 에서 사용)
  for (const card of base.cards) {
    if (card.hub !== 'r0') continue;
    const firstLine = card.extra?.reportFirstLine || card.extra?.review?.firstLine || '';
    if (firstLine === 'APPROVE' || firstLine === 'CHANGES') {
      card.reviewResult = firstLine;
    }
  }

  // 5) 러너 버전
  const runnerVersion = allJson.runner || '';

  // 6) CI 러너 풀 상태
  const rawRunners = (allJson.ci_runners || []).map(r => ({
    name:   r.name,
    status: r.status || 'offline',
    busy:   !!r.busy,
    pool:   classifyRunnerPool(r.name),
  }));
  const runnersByPool = new Map();
  for (const p of POOL_ORDER) runnersByPool.set(p, []);
  for (const r of rawRunners) {
    const list = runnersByPool.get(r.pool);
    if (list) list.push(r); else runnersByPool.set(r.pool, [r]);
  }
  const ciRunnerPools = new Map();
  for (const p of POOL_ORDER) {
    const runners = runnersByPool.get(p) || [];
    ciRunnerPools.set(p, { status: poolStatus(runners), runners });
  }

  // 7) CI 큐 풀 데이터 (queued + in_progress)
  const ciData     = allJson.ci?.data || {};
  const heavyData  = ciData.heavy || {};
  const lightData  = ciData.light || {};

  // PR → 프롬프트 ID 매핑용 (ci_running 카드)
  const prToCard = new Map();
  for (const c of base.cards) {
    const prNum = c.extra?.pr?.number;
    if (prNum) prToCard.set(prNum, c);
  }

  function mapInProgress(inProgressItems, poolLabel) {
    return (inProgressItems || []).map(item => {
      // item は数値(PR番号) または {pr:'#429', job:'heavy-mac', running_min:9, ...} 形式
      let rawPr;
      let jobLabel = poolLabel;
      let runningMin = null;
      if (typeof item === 'object' && item !== null) {
        rawPr     = item.pr ?? item.number ?? item.pr_number ?? null;
        jobLabel  = item.job || item.kind || poolLabel;
        runningMin = item.running_min ?? null;
      } else {
        rawPr = item;
      }
      // '#429' → 429
      const numStr = String(rawPr ?? '').replace(/^#/, '');
      const num    = numStr ? Number(numStr) : NaN;
      const card   = !isNaN(num) ? prToCard.get(num) : null;
      return {
        prNumber:   !isNaN(num) ? num : null,
        promptId:   card?.id    || null,
        runnerKind: card?.extra?.ci?.runner_kind || jobLabel,
        ageMin:     runningMin ?? card?.ageMin ?? null,
      };
    }).filter(x => x.prNumber !== null);
  }

  const ciPools = new Map([
    ['storeport-heavy', {
      queued:           (heavyData.queued_prs || []).length,
      queuedPrs:        heavyData.queued_prs || [],
      oldestMin:        heavyData.oldest_queued_min ?? null,
      oldestSec:        heavyData.oldest_queued_min != null ? heavyData.oldest_queued_min * 60 : null,
      inProgressItems:  mapInProgress(heavyData.in_progress, 'heavy-mac'),
      offlineReason:    ciRunnerPools.get('storeport-heavy')?.status === 'offline'
                          ? 'storeport-heavy 러너 OFF' : null,
      congested:        false,
    }],
    ['storeport-light', {
      queued:           (lightData.queued_prs || []).length,
      queuedPrs:        lightData.queued_prs || [],
      oldestMin:        lightData.oldest_queued_min ?? null,
      oldestSec:        lightData.oldest_queued_min != null ? lightData.oldest_queued_min * 60 : null,
      inProgressItems:  mapInProgress(lightData.in_progress, 'light-mac'),
      offlineReason:    ciRunnerPools.get('storeport-light')?.status === 'offline'
                          ? 'storeport-light 러너 OFF' : null,
      congested:        false,
    }],
    ['fork-heavy', {
      queued:           0,
      queuedPrs:        [],
      oldestMin:        null,
      oldestSec:        null,
      inProgressItems:  [],
      offlineReason:    ciRunnerPools.get('fork-heavy')?.status === 'offline'
                          ? 'fork-heavy 러너 OFF — 클라우드로 넘기기 필요' : null,
      congested:        false,
    }],
    ['fork-light', {
      queued:           0,
      queuedPrs:        [],
      oldestMin:        null,
      oldestSec:        null,
      inProgressItems:  [],
      offlineReason:    ciRunnerPools.get('fork-light')?.status === 'offline'
                          ? 'fork-light 러너 OFF' : null,
      congested:        false,
    }],
  ]);

  // 8) 허브 큐 (미착수 프롬프트, 허브별 · ageSec 포함)
  const hubQueue = new Map();
  for (const hub of QUEUE_HUBS) hubQueue.set(hub, []);

  for (const q of scanQueueFiles(paths)) {
    const claim   = readClaim(paths, q.id);
    const claimed = !!(claim && claim.state && claim.state !== 'issued');
    if (claimed) continue;
    const ageSec  = Math.max(0, Math.round((nowMs - q.mtimeMs) / 1000));
    const ageMin  = Math.max(0, Math.round(ageSec / 60));
    const title   = readQueueTitle(q.filePath) || '';
    const list    = hubQueue.get(q.hub) || [];
    list.push({ id: q.id, ageMin, ageSec, title });
    hubQueue.set(q.hub, list);
  }
  for (const list of hubQueue.values()) list.sort((a, b) => a.id.localeCompare(b.id));

  // 9) 진행 중 / 주의
  const inProgress = base.cards.filter(c => c.column !== 'queue');
  const caution    = inProgress.filter(c => c.level !== 'green');

  // 10) 허브 큐 정체 경보 계산
  const congestionAlerts = [];

  // 허브: started claim 없음 (hubCurrents[hub] 없음) + 대기 칩 60초 초과
  const hubCurrentsMap = base.hubCurrents || {};
  for (const hub of QUEUE_HUBS) {
    const isRunning  = !!hubCurrentsMap[hub];
    const waitItems  = hubQueue.get(hub) || [];
    if (isRunning || waitItems.length === 0) continue;
    const oldest     = waitItems[0]; // 이미 id 순 정렬 — 가장 오래된 것은 ageSec 기준으로 별도 계산
    const oldestItem = waitItems.reduce((a, b) => (b.ageSec > a.ageSec ? b : a), waitItems[0]);
    if (oldestItem.ageSec > HUB_PICKUP_RED_SEC) {
      oldestItem.congested = true;
      congestionAlerts.push({
        kind:    'hub_queue',
        hub,
        id:      oldestItem.id,
        ageSec:  oldestItem.ageSec,
        ageMin:  oldestItem.ageMin,
        reason:  `${hub} 비어 있는데 ${oldestItem.ageMin}분째 안 가져감 — 러너 확인`,
      });
    }
  }

  // CI: runner online (not busy) + oldestSec > CI_PICKUP_RED_SEC
  // CI: runner offline → 즉시 경보
  for (const [pool, data] of ciPools) {
    const runnerSt = ciRunnerPools.get(pool)?.status || 'unknown';
    if (data.offlineReason) {
      data.congested = true;
      congestionAlerts.push({
        kind:     'ci_queue',
        pool,
        poolAbbr: POOL_ABBR[pool] || pool,
        id:       null,
        ageSec:   null,
        ageMin:   null,
        reason:   data.offlineReason,
      });
    } else if (runnerSt === 'online' && data.queued > 0) {
      const oldestSec = data.oldestSec;
      const threshold = pool.startsWith('fork') ? CLOUD_PICKUP_RED_SEC : CI_PICKUP_RED_SEC;
      if (oldestSec != null && oldestSec > threshold) {
        data.congested = true;
        congestionAlerts.push({
          kind:     'ci_queue',
          pool,
          poolAbbr: POOL_ABBR[pool] || pool,
          id:       data.queuedPrs[0] ? `#${data.queuedPrs[0]}` : null,
          ageSec:   oldestSec,
          ageMin:   data.oldestMin,
          reason:   `${POOL_ABBR[pool]} 러너 idle 인데 ${data.oldestMin}분째 queued — 러너 재연결 필요`,
        });
      }
    }
  }

  return {
    ...base,
    runnerVersion,
    ciRunnerPools,
    ciPools,
    hubQueue,
    inProgress,
    caution,
    congestionAlerts,
  };
}

export { POOL_ORDER as _POOL_ORDER, IN_PROGRESS_STAGES, QUEUE_HUBS };
