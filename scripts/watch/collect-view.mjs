// scripts/watch/collect-view.mjs  M2-1125-T — buildExtendedViewAsync 추가 (스피너 freeze 방지)
// buildPipelineView() 위에 추가 데이터(허브 큐 · CI 풀 · 러너 상태 · 큐 정체 경보)를 얹는다.
// M2-1125-N: 클레임·all.json 을 작업 트리 대신 git origin/main 오브젝트에서 읽어 stale 방지.
// M2-1125-Q: scanClaimsDirGitFast(날짜 필터+배치) · skipFetch · 중복 scan 제거.
// M2-1125-T: 모든 git/gh 호출을 비동기화 → 이벤트 루프 비차단.

import { execSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { buildPipelineView } from './pipeline-view.mjs';
const _execFileP = promisify(execFile);
import {
  resolvePaths, readAllJson, scanQueueFiles, readClaim, readQueueTitle,
  scanClaimsDir, getWibDateStr,
  QUEUE_HUBS,
  findReportFile, extractPrUrl, readPipelineEvents, readReportFirstLine,
} from './sources-local.mjs';
import {
  maybeGitFetch, getDataOrigin,
  readAllJsonGit, readClaimGit, scanClaimsDirGitFast, getRecentMmddSet,
  gitCatFileBatch,
  readAllJsonGitAsync, readClaimGitAsync, scanClaimsDirGitFastAsync,
  gitCatFileBatchAsync,
} from './sources-git.mjs';

// ── CI 없는 레포 (PR CI 워크플로 없음 → ci_pending 건너뜀) ───────────────
const NO_CI_REPOS = new Set(['curiocity-relay']);

/** PR 정보 → 레포 약칭 (sp · fk · rl) */
function getRepoAbbr(prInfo) {
  if (!prInfo) return 'sp';
  const owner = prInfo.owner || '';
  const repo = prInfo.repo || (prInfo.url ? (prInfo.url.split('/').slice(-2)[0] || '') : '');
  if (repo === 'curiocity-relay') return 'rl';
  if (owner === 'narisolutions' || repo.includes('fork') || repo.includes('agilo')) return 'fk';
  return 'sp';
}

/** PR 번호 → 큐 아이템 객체 { number, repoAbbr, promptId } */
function toPrQueueItem(pr, prToCard) {
  const num = typeof pr === 'object' && pr !== null
    ? (pr.number ?? Number(String(pr).replace(/^#/, '')))
    : Number(String(pr ?? '').replace(/^#/, ''));
  if (isNaN(num) || num <= 0) return null;
  const card = prToCard.get(num);
  return { number: num, repoAbbr: getRepoAbbr(card?.extra?.pr), promptId: card?.id || null };
}

/** queuedPrs 에서 PR 번호 비교 (숫자 또는 { number } 객체 모두 처리) */
function queuedHasPr(queuedPrs, prNum) {
  return (queuedPrs || []).some(it => (typeof it === 'object' ? it.number : it) === prNum);
}

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

/**
 * PR 상태 조회. fullRepo 가 없으면 storeport 기본값 사용.
 * @param {number} prNumber
 * @param {string} [fullRepo]  'owner/repo' 형식
 */
export function defaultFetchPrState(prNumber, fullRepo) {
  const repo = fullRepo || 'CuriocityDevAi/storeport';
  const cacheKey = `${repo}#${prNumber}`;
  const now = Date.now();
  const cached = _prMergeCache.get(cacheKey);
  if (cached && now - cached.cachedAt < 30_000) return cached;
  try {
    const out = execSync(
      `gh pr view ${prNumber} --repo ${repo} --json state,mergedAt,mergeable,mergeStateStatus 2>/dev/null`,
      { timeout: 5000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const data = JSON.parse(out);
    const result = {
      state: data.state,
      mergedAt: data.mergedAt || null,
      mergeable: data.mergeable || null,
      mergeStateStatus: data.mergeStateStatus || null,
      cachedAt: now,
    };
    _prMergeCache.set(cacheKey, result);
    return result;
  } catch { return null; }
}

// ── GitHub Actions CI 큐 조회 (fork 리포, 30초 캐시) — M2-1125-M ───────────

const _ghForkCiCache = { data: null, fetchedAt: 0 };
const GH_FORK_REPO = 'narisolutions/agilo-medusa-pos-fork';

export function fetchGhForkRuns(nowMs = Date.now()) {
  if (_ghForkCiCache.data && nowMs - _ghForkCiCache.fetchedAt < 30_000) {
    return _ghForkCiCache.data;
  }
  const result = { queued: [], inProgress: [] };
  for (const status of ['queued', 'in_progress']) {
    try {
      const out = execSync(
        `gh api repos/${GH_FORK_REPO}/actions/runs?status=${status}&per_page=30 2>/dev/null`,
        { timeout: 5000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      );
      const data = JSON.parse(out);
      for (const run of (data.workflow_runs || [])) {
        const prs = run.pull_requests || [];
        const prNumber = prs.length > 0 ? Number(prs[0].number) : null;
        const createdMs = run.created_at ? new Date(run.created_at).getTime() : null;
        const ageMin = createdMs ? Math.max(0, Math.round((nowMs - createdMs) / 60_000)) : null;
        const rn = String(run.runner_name || '').toLowerCase();
        const kind = (rn.includes('light') || rn.includes('fork-light')) ? 'fork-light' : 'fork-heavy';
        const entry = {
          prNumber,
          repo: GH_FORK_REPO,
          kind,
          run_id: run.id,
          runner_name: run.runner_name || null,
          ageMin,
        };
        if (status === 'queued') result.queued.push(entry);
        else result.inProgress.push(entry);
      }
    } catch {}
  }
  _ghForkCiCache.data = result;
  _ghForkCiCache.fetchedAt = nowMs;
  return result;
}

// ── ID → PR 검색 (gh pr list --search, 30초 캐시, 3개 리포) ───────────────
const _prSearchCache = new Map();
const _SEARCH_REPOS = [
  'CuriocityDevAi/storeport',
  'CuriocityDevAi/curiocity-relay',
  'narisolutions/agilo-medusa-pos-fork',
];

function fetchPrBySearch(id) {
  const now = Date.now();
  const cached = _prSearchCache.get(id);
  if (cached && now - cached.cachedAt < 30_000) return cached.result;

  for (const fullRepo of _SEARCH_REPOS) {
    try {
      const out = execSync(
        `gh pr list --repo ${fullRepo} --state all --search "${id}" --json number,state,mergedAt,url,headRefName --limit 10 2>/dev/null`,
        { timeout: 8000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      );
      const prs = JSON.parse(out);
      const pr = prs.find(p =>
        (p.headRefName || '').includes(id) || (p.title || '').includes(id)
      );
      if (pr) {
        const [owner, repo] = fullRepo.split('/');
        const result = { number: pr.number, url: pr.url, owner, repo };
        _prSearchCache.set(id, { result, cachedAt: now });
        return result;
      }
    } catch {}
  }
  _prSearchCache.set(id, { result: null, cachedAt: now });
  return null;
}

// ── CI 러너 풀 분류 ───────────────────────────────────────────────────────

// 러너 이름/라벨 → 풀 매핑표 (단일 소스)
// runner_name(실행 중) · labels(대기 중) 로 판정 — 판정 불가 시 null 반환.
function classifyRunnerPool(name) {
  const lc = String(name || '').toLowerCase();
  if (!lc) return null;
  if (lc.includes('fork') && lc.includes('light')) return 'fork-light';
  if (lc.includes('fork')) return 'fork-heavy';
  if (lc.includes('light')) return 'storeport-light';
  if (lc.includes('ubuntu') || lc.startsWith('github-')) return 'CLOUD';
  // 알려진 storeport-heavy 러너 패턴 (heavy 키워드 or 등록된 머신명)
  if (lc.includes('heavy') || lc.includes('youngkyus') || lc.includes('macbook')) return 'storeport-heavy';
  // 판정 불가 → null (미배정). storeport-heavy 기본값 제거.
  return null;
}

// 잡 이름 → 사람이 읽는 말 (REQ-4: mac-light → 가벼운 검사)
const JOB_LABEL = {
  'mac-light':  '가벼운 검사',
  'light-mac':  '가벼운 검사',
  'mac-heavy':  '전체 검사',
  'heavy-mac':  '전체 검사',
};

export function humanJobLabel(job) {
  return JOB_LABEL[String(job || '').toLowerCase()] || null;
}

// runner_name · job 이름 · PR 리포 맥락으로 실제 풀 결정
function classifyItemPool(runnerName, jobName, isForkPr) {
  // 1) runner_name 이 가장 신뢰도 높음
  const fromRunner = classifyRunnerPool(runnerName);
  if (fromRunner) return fromRunner;
  // 2) job 이름 + PR 리포 맥락
  const jl = String(jobName || '').toLowerCase();
  const isLight = jl.includes('light');
  const isHeavy = jl.includes('heavy');
  if (isForkPr) {
    if (isLight) return 'fork-light';
    if (isHeavy || jl) return 'fork-heavy';
    return null;
  }
  if (isLight) return 'storeport-light';
  if (isHeavy) return 'storeport-heavy';
  return null;
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
  fetchPrState: fetchPrStateOpt,
  fetchForkRuns: fetchForkRunsOpt,
  skipFetch = false,
  skipGh = false,
} = {}) {
  // skipGh=true 시 gh/PR API 호출 전부 no-op (첫 화면 즉시 렌더용)
  const fetchPrState = fetchPrStateOpt ?? (skipGh ? () => null : defaultFetchPrState);
  const fetchForkRuns = fetchForkRunsOpt ?? (skipGh ? () => ({ queued: [], inProgress: [] }) : fetchGhForkRuns);

  // git 오브젝트에서 최신 relay 데이터 읽기 (30초 간격 fetch · skipFetch=true 시 건너뜀)
  if (repoRoot && !skipFetch) maybeGitFetch(repoRoot, nowMs);

  const paths   = resolvePaths(repoRoot);
  // all.json: git 오브젝트 우선, 없으면 작업 트리 폴백
  const allJson = allJsonOverride
    || (repoRoot && readAllJsonGit(repoRoot))
    || readAllJson(paths)
    || {};

  // 0.5) 오늘/어제 MMDD 집합 — claims 날짜 필터에 사용
  const mmddSet = getRecentMmddSet(now, 1);

  // 1) 기본 파이프라인 뷰
  const base = buildPipelineView({ repoRoot, now, nowMs, allJson });

  // 1.5) PR 정보 없는 카드에 다중 소스 PR 매핑
  // ① 리포트 파일 PR URL ② pipeline jsonl pr 이벤트 ③ gh pr list --search
  for (const card of base.cards) {
    if (card.extra?.pr?.number) continue; // 이미 있음
    if (card.hub === 'r0') continue; // R0 는 자체 PR 없음
    if (!['review', 'ci_result', 'pr', 'ci_pending'].includes(card.column)) continue;

    const rpt = findReportFile(paths, card.hub, card.id);
    if (rpt) {
      const prUrl = extractPrUrl(rpt.path);
      if (prUrl?.number) {
        card.extra = { ...(card.extra || {}), pr: prUrl };
        continue;
      }
    }

    const events = readPipelineEvents(paths, card.id);
    const prEvent = events.find(e => e.pr || e.pr_number);
    if (prEvent) {
      const raw = prEvent.pr ?? prEvent.pr_number;
      const num = raw ? Number(String(raw).replace(/^#/, '')) : NaN;
      if (!isNaN(num) && num > 0) {
        card.extra = { ...(card.extra || {}), pr: { number: num, url: null } };
        continue;
      }
    }

    if (!skipGh) {
      const ghPr = fetchPrBySearch(card.id);
      if (ghPr?.number) {
        card.extra = { ...(card.extra || {}), pr: ghPr };
      }
    }
  }

  // 2) PR 머지 여부 보강 (review/ci_result 카드 · 30초 캐시 · 실패 시 현상 유지)
  for (const card of base.cards) {
    if (!['review', 'ci_result', 'pr', 'ci_pending'].includes(card.column)) continue;
    const pr = card.extra?.pr;
    if (!pr?.number) continue;
    const fullRepo = pr.owner && pr.repo ? `${pr.owner}/${pr.repo}` : undefined;
    let prData = null;
    try { prData = fetchPrState(pr.number, fullRepo); } catch {}
    if (!prData) continue;
    const st = (prData.state || '').toLowerCase();
    if (st === 'merged' || st === 'closed') {
      const mAt = prData.mergedAt ? new Date(prData.mergedAt).getTime() : nowMs;
      card.column  = 'merge';
      card.since   = new Date(mAt);
      card.ageMin  = Math.max(0, Math.round((nowMs - mAt) / 60000));
      card.predicted = false;
    } else if (prData.mergeStateStatus === 'DIRTY' || prData.mergeable === 'CONFLICTING') {
      card.level  = 'red';
      card.mark   = '■';
      card.reason = '충돌 — rebase 필요';
      card.mergeConflict = true;
    }
  }

  // 2.1) CI 없는 레포 PR → ci_pending 건너뛰고 review 로 승격
  for (const card of base.cards) {
    if (card.column !== 'ci_pending') continue;
    const pr = card.extra?.pr;
    if (!pr) continue;
    const repo = pr.repo || (pr.url ? pr.url.split('/').slice(-2)[0] : null);
    if (repo && NO_CI_REPOS.has(repo)) {
      card.column   = 'review';
      card.predicted = true;
      card.reason   = null;
    }
  }

  // 2.5) 비-큐 카드 claims 단일 배치 프리로드 (git cat-file --batch 1회)
  // null(git 없음/실패) → 캐싱 않음 → 로컬 폴백. queue 카드는 pipeline-view 에서 처리 완료.
  const _claimCache = new Map(); // id → claim object (null 미저장 → 로컬 폴백)
  if (repoRoot) {
    const needIds = base.cards
      .filter(c => c.column !== 'queue')
      .map(c => `status/claims/${c.id}.json`);
    if (needIds.length > 0) {
      const batch = gitCatFileBatch(repoRoot, needIds);
      for (const [p, text] of batch) {
        if (!text) continue;
        const id = p.replace('status/claims/', '').replace('.json', '');
        try { const obj = JSON.parse(text); if (obj) _claimCache.set(id, obj); } catch {}
      }
    }
  }

  // 3) 'report' 단계 + done claim 인 카드 → 경보 제외
  // 프리로드 캐시 우선, 없으면 git show, 없으면 작업 트리 폴백
  for (const card of base.cards) {
    if (card.column !== 'report') continue;
    const claim = _claimCache.has(card.id)
      ? _claimCache.get(card.id)
      : ((repoRoot && readClaimGit(repoRoot, card.id)) || readClaim(paths, card.id));
    if (claim?.state === 'done') {
      card.level  = 'green';
      card.mark   = '●';
      card.reason = null;
    }
  }

  // 3.5) 제목 없는 카드 → 큐 파일 원장 대사 폴백 (R0 포함 전 허브)
  for (const card of base.cards) {
    if (card.title) continue;
    const hub = card.hub;
    if (!hub) continue;
    const qPath = join(paths.queueRoot, hub, `${card.id}.md`);
    const qTitle = readQueueTitle(qPath);
    if (qTitle) card.title = qTitle;
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
      // item は数値(PR番号) または {pr:'#429', job:'heavy-mac', running_min:9, runner_name:'curiocity-mac-light', ...} 形式
      let rawPr;
      let jobName = poolLabel;
      let runnerName = null;
      let runningMin = null;
      if (typeof item === 'object' && item !== null) {
        rawPr      = item.pr ?? item.number ?? item.pr_number ?? null;
        jobName    = item.job || item.kind || poolLabel;
        runnerName = item.runner_name || null;
        runningMin = item.running_min ?? null;
      } else {
        rawPr = item;
      }
      // '#429' → 429
      const numStr = String(rawPr ?? '').replace(/^#/, '');
      const num    = numStr ? Number(numStr) : NaN;
      const card   = !isNaN(num) ? prToCard.get(num) : null;
      // PR 리포 기반 fork 판정
      const isForkPr = card?.extra?.pr?.owner === 'narisolutions'
        || (card?.extra?.pr?.repo || '').includes('fork');
      const actualPool = classifyItemPool(runnerName, jobName, isForkPr);
      // 사람이 읽는 잡 레이블 (mac-light → 가벼운 검사)
      const displayKind = humanJobLabel(jobName) || card?.extra?.ci?.runner_kind || jobName;
      return {
        prNumber:    !isNaN(num) ? num : null,
        promptId:    card?.id    || null,
        runnerKind:  displayKind,
        ageMin:      runningMin ?? card?.ageMin ?? null,
        actualPool,
        runner_name: runnerName,
        repoAbbr:    getRepoAbbr(card?.extra?.pr),
        isMerged:    card?.column === 'merge',
      };
    }).filter(x => x.prNumber !== null);
  }

  // storeport 풀 대기열 — 각 항목을 { number, repoAbbr, promptId } 객체로 변환
  // relay/fork PR 이 runner 데이터 오류로 섞이더라도 올바른 레포 접두를 표시하기 위해
  const spHeavyQueued = (heavyData.queued_prs || [])
    .map(pr => toPrQueueItem(pr, prToCard)).filter(Boolean);
  const spLightQueued = (lightData.queued_prs || [])
    .map(pr => toPrQueueItem(pr, prToCard)).filter(Boolean);

  const ciPools = new Map([
    ['storeport-heavy', {
      queued:           spHeavyQueued.length,
      queuedPrs:        spHeavyQueued,
      oldestMin:        heavyData.oldest_queued_min ?? null,
      oldestSec:        heavyData.oldest_queued_min != null ? heavyData.oldest_queued_min * 60 : null,
      inProgressItems:  mapInProgress(heavyData.in_progress, 'heavy-mac'),
      offlineReason:    ciRunnerPools.get('storeport-heavy')?.status === 'offline'
                          ? 'storeport-heavy 러너 OFF' : null,
      congested:        false,
    }],
    ['storeport-light', {
      queued:           spLightQueued.length,
      queuedPrs:        spLightQueued,
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

  // 7.5a) all.json inProgressItems → ci_pending 카드를 ci_running 으로 승격 — M2-1125-M
  for (const [pool, poolData] of ciPools) {
    for (const item of (poolData.inProgressItems || [])) {
      if (!item.prNumber) continue;
      const card = prToCard.get(item.prNumber);
      if (!card) continue;
      if (card.column === 'ci_pending' || card.column === 'pr') {
        const startedMs = item.ageMin != null ? nowMs - item.ageMin * 60_000 : nowMs;
        card.column = 'ci_running';
        card.since  = new Date(startedMs);
        card.ageMin = item.ageMin ?? card.ageMin;
        card.extra  = { ...(card.extra || {}), ci: { runner_kind: item.runnerKind, pool } };
      }
    }
  }

  // 7.5b) ci_pending 카드가 어떤 pool 에도 없으면 → PR 리포 기반 pool 에 pre-queue 추가
  for (const card of base.cards) {
    if (card.column !== 'ci_pending') continue;
    const pr = card.extra?.pr?.number;
    if (!pr) continue;
    let inAnyPool = false;
    for (const pd of ciPools.values()) {
      if (queuedHasPr(pd.queuedPrs, pr)) { inAnyPool = true; break; }
      if ((pd.inProgressItems || []).some(i => i.prNumber === pr)) { inAnyPool = true; break; }
    }
    if (inAnyPool) continue;
    const owner = card.extra?.pr?.owner;
    const repo  = card.extra?.pr?.repo;
    const isFork = owner === 'narisolutions' || (repo || '').includes('fork');
    const targetPool = isFork ? 'fork-heavy' : 'storeport-heavy';
    const td = ciPools.get(targetPool);
    if (td) {
      const qItem = toPrQueueItem(pr, prToCard);
      td.queuedPrs = [...(td.queuedPrs || []), qItem || pr];
      td.queued    = (td.queued || 0) + 1;
      if (td.oldestMin == null || (card.ageMin != null && card.ageMin > td.oldestMin)) {
        td.oldestMin = card.ageMin;
        td.oldestSec = card.ageMin != null ? card.ageMin * 60 : null;
      }
    }
  }

  // 7.5c) GH fork runs (agilo-medusa-pos-fork) 로 fork-heavy/fork-light 보강 — M2-1125-M
  const hasCiPendingOrFork = base.cards.some(c =>
    c.column === 'ci_pending' || (c.extra?.pr?.owner === 'narisolutions')
  );
  if (hasCiPendingOrFork && typeof fetchForkRuns === 'function') {
    try {
      const ghFork = fetchForkRuns(nowMs);
      for (const run of (ghFork.queued || [])) {
        if (!run.prNumber) continue;
        const forkPool = run.kind === 'fork-light' ? 'fork-light' : 'fork-heavy';
        const fd = ciPools.get(forkPool);
        if (!fd) continue;
        if (!queuedHasPr(fd.queuedPrs, run.prNumber)) {
          const qItem = toPrQueueItem(run.prNumber, prToCard)
            || { number: run.prNumber, repoAbbr: 'fk', promptId: null };
          fd.queuedPrs = [...(fd.queuedPrs || []), qItem];
          fd.queued    = (fd.queued || 0) + 1;
        }
        if (run.ageMin != null && (fd.oldestMin == null || run.ageMin > fd.oldestMin)) {
          fd.oldestMin = run.ageMin;
          fd.oldestSec = run.ageMin * 60;
        }
      }
      for (const run of (ghFork.inProgress || [])) {
        if (!run.prNumber) continue;
        const forkPool = run.kind === 'fork-light' ? 'fork-light' : 'fork-heavy';
        const fd = ciPools.get(forkPool);
        if (!fd) continue;
        const exists = (fd.inProgressItems || []).some(i => i.prNumber === run.prNumber);
        if (!exists) {
          const card = prToCard.get(run.prNumber);
          fd.inProgressItems = [...(fd.inProgressItems || []), {
            prNumber:   run.prNumber,
            promptId:   card?.id || null,
            runnerKind: run.runner_name || forkPool,
            ageMin:     run.ageMin,
            repoAbbr:   'fk',
            isMerged:   card?.column === 'merge',
          }];
        }
        const card = prToCard.get(run.prNumber);
        if (card && (card.column === 'ci_pending' || card.column === 'pr')) {
          card.column = 'ci_running';
          card.extra  = { ...(card.extra || {}), ci: { runner_kind: run.runner_name || forkPool, pool: forkPool } };
          if (run.ageMin != null) card.ageMin = run.ageMin;
        }
      }
    } catch {}
  }

  // 7.6) pool 재배정 — runner_name·job·PR리포 기반 (REQ M2-1125-O)
  // actualPool 이 소속 pool 과 다르면 올바른 pool 로 이동. null → '미배정' 별도 보관.
  {
    const unassigned = [];
    for (const [pool, poolData] of ciPools) {
      const stay = [];
      for (const item of (poolData.inProgressItems || [])) {
        if (item.actualPool === null) {
          unassigned.push({ ...item, sourcePool: pool });
        } else if (item.actualPool !== pool) {
          const target = ciPools.get(item.actualPool);
          if (target) target.inProgressItems.push(item);
          else stay.push(item); // 대상 pool 없으면 그대로 (안전망)
        } else {
          stay.push(item);
        }
      }
      poolData.inProgressItems = stay;
    }
    if (unassigned.length > 0) {
      ciPools.set('unassigned', {
        queued: 0, queuedPrs: [], oldestMin: null, oldestSec: null,
        inProgressItems: unassigned, offlineReason: null, congested: false,
      });
    }
  }

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
  // step 2 에서 merge 로 이동된 카드 중 10분 이상 → doneToday 편입 + inProgress 제외
  const HIDE_MIN = 10;
  let doneToday = base.doneToday;
  for (const card of base.cards) {
    if (card.column === 'merge' && card.ageMin >= HIDE_MIN) {
      doneToday += 1;
      card._hideFromInProgress = true;
    }
  }
  // 모든 허브: done claim + open PR 없음 → 오늘 완료에 편입
  // 카드 ID 배치 로드 (git cat-file --batch 1회) + 없으면 작업 트리 폴백
  const inProgress = base.cards.filter(c => c.column !== 'queue' && !c._hideFromInProgress);

  for (let i = inProgress.length - 1; i >= 0; i--) {
    const card = inProgress[i];
    if (card.extra?.pr?.number) continue;
    const claim = _claimCache.has(card.id)
      ? _claimCache.get(card.id)
      : ((repoRoot && readClaimGit(repoRoot, card.id)) || readClaim(paths, card.id));
    if (!claim || claim.state !== 'done') continue;
    doneToday += 1;
    inProgress.splice(i, 1);
  }
  const caution = inProgress.filter(c => c.level !== 'green');

  // 오늘 done claim 전체 집계 (WIB 기준) — inProgress 에 남은 카드(open PR 등) 제외
  // git 오브젝트 우선: 날짜 필터 + 배치 읽기 (오늘 MMDD only → 프로세스 2개 이하)
  const inProgressIds = new Set(inProgress.map(c => c.id));
  const todayWibStr = getWibDateStr(now);
  let doneTodayFromClaims = 0;
  const gitClaims = repoRoot ? scanClaimsDirGitFast(repoRoot, mmddSet) : [];
  const claimsSource = gitClaims.length > 0 ? gitClaims : scanClaimsDir(paths);
  for (const claimData of claimsSource) {
    if (!claimData || claimData.state !== 'done') continue;
    if (!claimData.at) continue;
    if (getWibDateStr(new Date(claimData.at)) !== todayWibStr) continue;
    if (inProgressIds.has(claimData.id)) continue;
    doneTodayFromClaims++;
  }
  if (doneTodayFromClaims > doneToday) doneToday = doneTodayFromClaims;

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
        const firstPr = data.queuedPrs?.[0];
        const firstPrId = firstPr
          ? (typeof firstPr === 'object' ? `${firstPr.repoAbbr}#${firstPr.number}` : `#${firstPr}`)
          : null;
        congestionAlerts.push({
          kind:     'ci_queue',
          pool,
          poolAbbr: POOL_ABBR[pool] || pool,
          id:       firstPrId,
          ageSec:   oldestSec,
          ageMin:   data.oldestMin,
          reason:   `${POOL_ABBR[pool]} 러너 idle 인데 ${data.oldestMin}분째 queued — 러너 재연결 필요`,
        });
      }
    }
  }

  // 10.5) pool 배정 오류 감지 (REQ M2-1125-O)
  // ① 같은 풀에 실행 중 2건 이상 → 데이터 오류
  // ② fork PR 이 storeport 풀에, storeport PR 이 fork 풀에 → 오류
  for (const [pool, data] of ciPools) {
    if (pool === 'unassigned') continue;
    const items = data.inProgressItems || [];
    if (items.length > 1) {
      congestionAlerts.push({
        kind:     'pool_assign_error',
        pool,
        poolAbbr: POOL_ABBR[pool] || pool,
        id:       null, ageSec: null, ageMin: null,
        reason:   `${POOL_ABBR[pool] || pool} 풀 실행 중 ${items.length}건 — 풀 배정 오류 (한 풀 = 동시 1건)`,
      });
    }
    for (const item of items) {
      if (!item.prNumber) continue;
      const card = prToCard.get(item.prNumber);
      if (!card?.extra?.pr) continue;
      const isForkPr = card.extra.pr.owner === 'narisolutions'
        || (card.extra.pr.repo || '').includes('fork');
      const isInForkPool = pool.startsWith('fork');
      const prAbbr = item.repoAbbr || (isForkPr ? 'fk' : 'sp');
      if (isForkPr && !isInForkPool) {
        congestionAlerts.push({
          kind: 'pool_assign_error', pool, poolAbbr: POOL_ABBR[pool] || pool,
          id: `${prAbbr}#${item.prNumber}`, ageSec: null, ageMin: null,
          reason: `fork PR ${prAbbr}#${item.prNumber} 가 ${POOL_ABBR[pool] || pool}(storeport) 풀에 배정 — 오류`,
        });
      } else if (!isForkPr && isInForkPool) {
        congestionAlerts.push({
          kind: 'pool_assign_error', pool, poolAbbr: POOL_ABBR[pool] || pool,
          id: `${prAbbr}#${item.prNumber}`, ageSec: null, ageMin: null,
          reason: `storeport PR ${prAbbr}#${item.prNumber} 가 ${POOL_ABBR[pool] || pool}(fork) 풀에 배정 — 오류`,
        });
      }
    }
  }

  const _dOriginSync = repoRoot ? getDataOrigin(nowMs) : null;
  return {
    ...base,
    doneToday,
    runnerVersion,
    ciRunnerPools,
    ciPools,
    hubQueue,
    inProgress,
    caution,
    congestionAlerts,
    dataOrigin: _dOriginSync ? { ..._dOriginSync, builtAt: Date.now() } : null,
  };
}

// ── 비동기 gh 래퍼 ────────────────────────────────────────────────────────

async function defaultFetchPrStateAsync(prNumber, fullRepo) {
  const repo = fullRepo || 'CuriocityDevAi/storeport';
  const cacheKey = `${repo}#${prNumber}`;
  const now = Date.now();
  const cached = _prMergeCache.get(cacheKey);
  if (cached && now - cached.cachedAt < 30_000) return cached;
  try {
    const { stdout } = await _execFileP(
      'gh', ['pr', 'view', String(prNumber), '--repo', repo,
        '--json', 'state,mergedAt,mergeable,mergeStateStatus'],
      { timeout: 5000, maxBuffer: 1024 * 1024 },
    );
    const data = JSON.parse(stdout);
    const result = {
      state: data.state,
      mergedAt: data.mergedAt || null,
      mergeable: data.mergeable || null,
      mergeStateStatus: data.mergeStateStatus || null,
      cachedAt: now,
    };
    _prMergeCache.set(cacheKey, result);
    return result;
  } catch { return null; }
}

async function fetchGhForkRunsAsync(nowMs = Date.now()) {
  if (_ghForkCiCache.data && nowMs - _ghForkCiCache.fetchedAt < 30_000) {
    return _ghForkCiCache.data;
  }
  const result = { queued: [], inProgress: [] };
  for (const status of ['queued', 'in_progress']) {
    try {
      const { stdout } = await _execFileP(
        'gh', ['api', `repos/${GH_FORK_REPO}/actions/runs?status=${status}&per_page=30`],
        { timeout: 5000, maxBuffer: 2 * 1024 * 1024 },
      );
      const data = JSON.parse(stdout);
      for (const run of (data.workflow_runs || [])) {
        const prs = run.pull_requests || [];
        const prNumber = prs.length > 0 ? Number(prs[0].number) : null;
        const createdMs = run.created_at ? new Date(run.created_at).getTime() : null;
        const ageMin = createdMs ? Math.max(0, Math.round((nowMs - createdMs) / 60_000)) : null;
        const rn = String(run.runner_name || '').toLowerCase();
        const kind = (rn.includes('light') || rn.includes('fork-light')) ? 'fork-light' : 'fork-heavy';
        const entry = {
          prNumber,
          repo: GH_FORK_REPO,
          kind,
          run_id: run.id,
          runner_name: run.runner_name || null,
          ageMin,
        };
        if (status === 'queued') result.queued.push(entry);
        else result.inProgress.push(entry);
      }
    } catch {}
  }
  _ghForkCiCache.data = result;
  _ghForkCiCache.fetchedAt = nowMs;
  return result;
}

// ── buildExtendedViewAsync ────────────────────────────────────────────────

/**
 * buildExtendedView 의 비동기 버전.
 * 모든 git/gh 호출을 비동기로 수행해 이벤트 루프를 차단하지 않는다 → 스피너 120ms 타이머 freeze 방지.
 */
export async function buildExtendedViewAsync({
  repoRoot,
  now = new Date(),
  nowMs = Date.now(),
  allJson: allJsonOverride,
  fetchPrState: fetchPrStateOpt,
  fetchForkRuns: fetchForkRunsOpt,
  skipFetch = false,
  skipGh = false,
} = {}) {
  const fetchPrState = fetchPrStateOpt ?? (skipGh ? async () => null : defaultFetchPrStateAsync);
  const fetchForkRuns = fetchForkRunsOpt ?? (skipGh ? async () => ({ queued: [], inProgress: [] }) : fetchGhForkRunsAsync);

  if (repoRoot && !skipFetch) {
    // sync fetch (maybeGitFetch) 는 이미 maybeGitFetchAsync 로 대체됨 — 여기서는 skip
    // 호출자가 maybeGitFetchAsync 를 별도로 실행한다고 가정 (ci-watch-v2.mjs 흐름)
  }

  const paths = resolvePaths(repoRoot);
  const mmddSet = getRecentMmddSet(now, 1);

  // git 읽기: all.json + claims 를 비동기 병렬로 미리 적재
  const allJson = allJsonOverride
    || (repoRoot ? await readAllJsonGitAsync(repoRoot) : null)
    || readAllJson(paths)
    || {};

  // 모든 claim paths 를 한 번에 비동기 배치 로드
  let claimCacheOverride = null;
  if (repoRoot) {
    const queueFiles = scanQueueFiles(paths);
    const todayCodes = (() => {
      const codes = new Set();
      for (const d of [0, 1]) {
        const t = new Date(now); t.setUTCDate(t.getUTCDate() - d);
        codes.add(String(t.getUTCMonth() + 1).padStart(2, '0') + String(t.getUTCDate()).padStart(2, '0'));
        const tw = new Date(now.getTime() + 7 * 3600_000); tw.setUTCDate(tw.getUTCDate() - d);
        codes.add(String(tw.getUTCMonth() + 1).padStart(2, '0') + String(tw.getUTCDate()).padStart(2, '0'));
      }
      return codes;
    })();
    const recentQueueFiles = queueFiles.filter(q => {
      const m = String(q.id).match(/-(\d{4})-/);
      return !!m && todayCodes.has(m[1]);
    });
    if (recentQueueFiles.length > 0) {
      const claimPaths = recentQueueFiles.map(q => `status/claims/${q.id}.json`);
      claimCacheOverride = await gitCatFileBatchAsync(repoRoot, claimPaths);
    } else {
      claimCacheOverride = new Map();
    }
  }

  // 1) 기본 파이프라인 뷰 (claimCacheOverride 전달 → pipeline-view 내 gitCatFileBatch 건너뜀)
  const base = buildPipelineView({ repoRoot, now, nowMs, allJson, claimCacheOverride });

  // 1.5) PR 정보 없는 카드에 다중 소스 PR 매핑
  for (const card of base.cards) {
    if (card.extra?.pr?.number) continue;
    if (card.hub === 'r0') continue;
    if (!['review', 'ci_result', 'pr', 'ci_pending'].includes(card.column)) continue;

    const rpt = findReportFile(paths, card.hub, card.id);
    if (rpt) {
      const prUrl = extractPrUrl(rpt.path);
      if (prUrl?.number) {
        card.extra = { ...(card.extra || {}), pr: prUrl };
        continue;
      }
    }

    const events = readPipelineEvents(paths, card.id);
    const prEvent = events.find(e => e.pr || e.pr_number);
    if (prEvent) {
      const raw = prEvent.pr ?? prEvent.pr_number;
      const num = raw ? Number(String(raw).replace(/^#/, '')) : NaN;
      if (!isNaN(num) && num > 0) {
        card.extra = { ...(card.extra || {}), pr: { number: num, url: null } };
        continue;
      }
    }
    // skipGh=true 시 gh pr list --search 건너뜀
  }

  // 2) PR 머지 여부 보강 — 비동기 병렬 조회
  if (!skipGh) {
    const prCards = base.cards.filter(c =>
      ['review', 'ci_result', 'pr', 'ci_pending'].includes(c.column) && c.extra?.pr?.number
    );
    const prResults = await Promise.all(prCards.map(async card => {
      const pr = card.extra.pr;
      const fullRepo = pr.owner && pr.repo ? `${pr.owner}/${pr.repo}` : undefined;
      try { return { card, prData: await fetchPrState(pr.number, fullRepo) }; }
      catch { return { card, prData: null }; }
    }));
    for (const { card, prData } of prResults) {
      if (!prData) continue;
      const st = (prData.state || '').toLowerCase();
      if (st === 'merged' || st === 'closed') {
        const mAt = prData.mergedAt ? new Date(prData.mergedAt).getTime() : nowMs;
        card.column  = 'merge';
        card.since   = new Date(mAt);
        card.ageMin  = Math.max(0, Math.round((nowMs - mAt) / 60000));
        card.predicted = false;
      } else if (prData.mergeStateStatus === 'DIRTY' || prData.mergeable === 'CONFLICTING') {
        card.level  = 'red';
        card.mark   = '■';
        card.reason = '충돌 — rebase 필요';
        card.mergeConflict = true;
      }
    }
  }

  // 2.1) CI 없는 레포 PR → ci_pending 건너뛰고 review 로 승격
  for (const card of base.cards) {
    if (card.column !== 'ci_pending') continue;
    const pr = card.extra?.pr;
    if (!pr) continue;
    const repo = pr.repo || (pr.url ? pr.url.split('/').slice(-2)[0] : null);
    if (repo && NO_CI_REPOS.has(repo)) {
      card.column   = 'review';
      card.predicted = true;
      card.reason   = null;
    }
  }

  // 2.5) 비-큐 카드 claims 단일 배치 프리로드 (비동기)
  const _claimCache = new Map();
  if (repoRoot) {
    const needIds = base.cards
      .filter(c => c.column !== 'queue')
      .map(c => `status/claims/${c.id}.json`);
    if (needIds.length > 0) {
      const batch = await gitCatFileBatchAsync(repoRoot, needIds);
      for (const [p, text] of batch) {
        if (!text) continue;
        const id = p.replace('status/claims/', '').replace('.json', '');
        try { const obj = JSON.parse(text); if (obj) _claimCache.set(id, obj); } catch {}
      }
    }
  }

  // 3) 'report' 단계 + done claim
  for (const card of base.cards) {
    if (card.column !== 'report') continue;
    const claim = _claimCache.has(card.id)
      ? _claimCache.get(card.id)
      : (repoRoot ? await readClaimGitAsync(repoRoot, card.id) : null)
        || readClaim(paths, card.id);
    if (claim?.state === 'done') {
      card.level  = 'green';
      card.mark   = '●';
      card.reason = null;
    }
  }

  // 3.5) 제목 없는 카드 → 큐 파일 원장 대사 폴백
  for (const card of base.cards) {
    if (card.title) continue;
    const hub = card.hub;
    if (!hub) continue;
    const qPath = join(paths.queueRoot, hub, `${card.id}.md`);
    const qTitle = readQueueTitle(qPath);
    if (qTitle) card.title = qTitle;
  }

  // 4) R0 카드 리뷰 결과 칩
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

  // 7) CI 큐 풀 데이터
  const ciData     = allJson.ci?.data || {};
  const heavyData  = ciData.heavy || {};
  const lightData  = ciData.light || {};

  const prToCard = new Map();
  for (const c of base.cards) {
    const prNum = c.extra?.pr?.number;
    if (prNum) prToCard.set(prNum, c);
  }

  function mapInProgress(inProgressItems, poolLabel) {
    return (inProgressItems || []).map(item => {
      let rawPr; let jobName = poolLabel; let runnerName = null; let runningMin = null;
      if (typeof item === 'object' && item !== null) {
        rawPr = item.pr ?? item.number ?? item.pr_number ?? null;
        jobName = item.job || item.kind || poolLabel;
        runnerName = item.runner_name || null;
        runningMin = item.running_min ?? null;
      } else { rawPr = item; }
      const numStr = String(rawPr ?? '').replace(/^#/, '');
      const num = numStr ? Number(numStr) : NaN;
      const card = !isNaN(num) ? prToCard.get(num) : null;
      const isForkPr = card?.extra?.pr?.owner === 'narisolutions'
        || (card?.extra?.pr?.repo || '').includes('fork');
      const actualPool = classifyItemPool(runnerName, jobName, isForkPr);
      const displayKind = humanJobLabel(jobName) || card?.extra?.ci?.runner_kind || jobName;
      return {
        prNumber:    !isNaN(num) ? num : null,
        promptId:    card?.id    || null,
        runnerKind:  displayKind,
        ageMin:      runningMin ?? card?.ageMin ?? null,
        actualPool,
        runner_name: runnerName,
        repoAbbr:    getRepoAbbr(card?.extra?.pr),
        isMerged:    card?.column === 'merge',
      };
    }).filter(x => x.prNumber !== null);
  }

  const spHeavyQueued = (heavyData.queued_prs || [])
    .map(pr => toPrQueueItem(pr, prToCard)).filter(Boolean);
  const spLightQueued = (lightData.queued_prs || [])
    .map(pr => toPrQueueItem(pr, prToCard)).filter(Boolean);

  const ciPools = new Map([
    ['storeport-heavy', {
      queued:           spHeavyQueued.length,
      queuedPrs:        spHeavyQueued,
      oldestMin:        heavyData.oldest_queued_min ?? null,
      oldestSec:        heavyData.oldest_queued_min != null ? heavyData.oldest_queued_min * 60 : null,
      inProgressItems:  mapInProgress(heavyData.in_progress, 'heavy-mac'),
      offlineReason:    ciRunnerPools.get('storeport-heavy')?.status === 'offline'
                          ? 'storeport-heavy 러너 OFF' : null,
      congested:        false,
    }],
    ['storeport-light', {
      queued:           spLightQueued.length,
      queuedPrs:        spLightQueued,
      oldestMin:        lightData.oldest_queued_min ?? null,
      oldestSec:        lightData.oldest_queued_min != null ? lightData.oldest_queued_min * 60 : null,
      inProgressItems:  mapInProgress(lightData.in_progress, 'light-mac'),
      offlineReason:    ciRunnerPools.get('storeport-light')?.status === 'offline'
                          ? 'storeport-light 러너 OFF' : null,
      congested:        false,
    }],
    ['fork-heavy', {
      queued:           0, queuedPrs: [], oldestMin: null, oldestSec: null,
      inProgressItems:  [],
      offlineReason:    ciRunnerPools.get('fork-heavy')?.status === 'offline'
                          ? 'fork-heavy 러너 OFF — 클라우드로 넘기기 필요' : null,
      congested:        false,
    }],
    ['fork-light', {
      queued:           0, queuedPrs: [], oldestMin: null, oldestSec: null,
      inProgressItems:  [],
      offlineReason:    ciRunnerPools.get('fork-light')?.status === 'offline'
                          ? 'fork-light 러너 OFF' : null,
      congested:        false,
    }],
  ]);

  // 7.5a) all.json inProgressItems → ci_pending → ci_running 승격
  for (const [pool, poolData] of ciPools) {
    for (const item of (poolData.inProgressItems || [])) {
      if (!item.prNumber) continue;
      const card = prToCard.get(item.prNumber);
      if (!card) continue;
      if (card.column === 'ci_pending' || card.column === 'pr') {
        const startedMs = item.ageMin != null ? nowMs - item.ageMin * 60_000 : nowMs;
        card.column = 'ci_running';
        card.since  = new Date(startedMs);
        card.ageMin = item.ageMin ?? card.ageMin;
        card.extra  = { ...(card.extra || {}), ci: { runner_kind: item.runnerKind, pool } };
      }
    }
  }

  // 7.5b) ci_pending 카드가 어떤 pool 에도 없으면 → PR 리포 기반 pool 에 pre-queue 추가
  for (const card of base.cards) {
    if (card.column !== 'ci_pending') continue;
    const pr = card.extra?.pr?.number;
    if (!pr) continue;
    let inAnyPool = false;
    for (const pd of ciPools.values()) {
      if (queuedHasPr(pd.queuedPrs, pr)) { inAnyPool = true; break; }
      if ((pd.inProgressItems || []).some(i => i.prNumber === pr)) { inAnyPool = true; break; }
    }
    if (inAnyPool) continue;
    const owner = card.extra?.pr?.owner;
    const repo  = card.extra?.pr?.repo;
    const isFork = owner === 'narisolutions' || (repo || '').includes('fork');
    const targetPool = isFork ? 'fork-heavy' : 'storeport-heavy';
    const td = ciPools.get(targetPool);
    if (td) {
      const qItem = toPrQueueItem(pr, prToCard);
      td.queuedPrs = [...(td.queuedPrs || []), qItem || pr];
      td.queued    = (td.queued || 0) + 1;
      if (td.oldestMin == null || (card.ageMin != null && card.ageMin > td.oldestMin)) {
        td.oldestMin = card.ageMin;
        td.oldestSec = card.ageMin != null ? card.ageMin * 60 : null;
      }
    }
  }

  // 7.5c) GH fork runs (비동기)
  const hasCiPendingOrFork = base.cards.some(c =>
    c.column === 'ci_pending' || (c.extra?.pr?.owner === 'narisolutions')
  );
  if (hasCiPendingOrFork && !skipGh) {
    try {
      const ghFork = await fetchForkRuns(nowMs);
      for (const run of (ghFork.queued || [])) {
        if (!run.prNumber) continue;
        const forkPool = run.kind === 'fork-light' ? 'fork-light' : 'fork-heavy';
        const fd = ciPools.get(forkPool);
        if (!fd) continue;
        if (!queuedHasPr(fd.queuedPrs, run.prNumber)) {
          const qItem = toPrQueueItem(run.prNumber, prToCard)
            || { number: run.prNumber, repoAbbr: 'fk', promptId: null };
          fd.queuedPrs = [...(fd.queuedPrs || []), qItem];
          fd.queued    = (fd.queued || 0) + 1;
        }
        if (run.ageMin != null && (fd.oldestMin == null || run.ageMin > fd.oldestMin)) {
          fd.oldestMin = run.ageMin;
          fd.oldestSec = run.ageMin * 60;
        }
      }
      for (const run of (ghFork.inProgress || [])) {
        if (!run.prNumber) continue;
        const forkPool = run.kind === 'fork-light' ? 'fork-light' : 'fork-heavy';
        const fd = ciPools.get(forkPool);
        if (!fd) continue;
        const exists = (fd.inProgressItems || []).some(i => i.prNumber === run.prNumber);
        if (!exists) {
          const card = prToCard.get(run.prNumber);
          fd.inProgressItems = [...(fd.inProgressItems || []), {
            prNumber:   run.prNumber,
            promptId:   card?.id || null,
            runnerKind: run.runner_name || forkPool,
            ageMin:     run.ageMin,
            repoAbbr:   'fk',
            isMerged:   card?.column === 'merge',
          }];
        }
        const card = prToCard.get(run.prNumber);
        if (card && (card.column === 'ci_pending' || card.column === 'pr')) {
          card.column = 'ci_running';
          card.extra  = { ...(card.extra || {}), ci: { runner_kind: run.runner_name || forkPool, pool: forkPool } };
          if (run.ageMin != null) card.ageMin = run.ageMin;
        }
      }
    } catch {}
  }

  // 7.6) pool 재배정
  {
    const unassigned = [];
    for (const [pool, poolData] of ciPools) {
      const stay = [];
      for (const item of (poolData.inProgressItems || [])) {
        if (item.actualPool === null) {
          unassigned.push({ ...item, sourcePool: pool });
        } else if (item.actualPool !== pool) {
          const target = ciPools.get(item.actualPool);
          if (target) target.inProgressItems.push(item);
          else stay.push(item);
        } else {
          stay.push(item);
        }
      }
      poolData.inProgressItems = stay;
    }
    if (unassigned.length > 0) {
      ciPools.set('unassigned', {
        queued: 0, queuedPrs: [], oldestMin: null, oldestSec: null,
        inProgressItems: unassigned, offlineReason: null, congested: false,
      });
    }
  }

  // 8) 허브 큐
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
  const HIDE_MIN = 10;
  let doneToday = base.doneToday;
  for (const card of base.cards) {
    if (card.column === 'merge' && card.ageMin >= HIDE_MIN) {
      doneToday += 1;
      card._hideFromInProgress = true;
    }
  }
  const inProgress = base.cards.filter(c => c.column !== 'queue' && !c._hideFromInProgress);

  for (let i = inProgress.length - 1; i >= 0; i--) {
    const card = inProgress[i];
    if (card.extra?.pr?.number) continue;
    const claim = _claimCache.has(card.id)
      ? _claimCache.get(card.id)
      : (repoRoot ? await readClaimGitAsync(repoRoot, card.id) : null)
        || readClaim(paths, card.id);
    if (!claim || claim.state !== 'done') continue;
    doneToday += 1;
    inProgress.splice(i, 1);
  }
  const caution = inProgress.filter(c => c.level !== 'green');

  // 오늘 done claim 전체 집계 (비동기)
  const inProgressIds = new Set(inProgress.map(c => c.id));
  const todayWibStr = getWibDateStr(now);
  let doneTodayFromClaims = 0;
  const gitClaims = repoRoot ? await scanClaimsDirGitFastAsync(repoRoot, mmddSet) : [];
  const claimsSource = gitClaims.length > 0 ? gitClaims : scanClaimsDir(paths);
  for (const claimData of claimsSource) {
    if (!claimData || claimData.state !== 'done') continue;
    if (!claimData.at) continue;
    if (getWibDateStr(new Date(claimData.at)) !== todayWibStr) continue;
    if (inProgressIds.has(claimData.id)) continue;
    doneTodayFromClaims++;
  }
  if (doneTodayFromClaims > doneToday) doneToday = doneTodayFromClaims;

  // 10) 허브 큐 정체 경보
  const congestionAlerts = [];
  const hubCurrentsMap = base.hubCurrents || {};
  for (const hub of QUEUE_HUBS) {
    const isRunning  = !!hubCurrentsMap[hub];
    const waitItems  = hubQueue.get(hub) || [];
    if (isRunning || waitItems.length === 0) continue;
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

  for (const [pool, data] of ciPools) {
    const runnerSt = ciRunnerPools.get(pool)?.status || 'unknown';
    if (data.offlineReason) {
      data.congested = true;
      congestionAlerts.push({
        kind:     'ci_queue',
        pool,
        poolAbbr: POOL_ABBR[pool] || pool,
        id:       null, ageSec: null, ageMin: null,
        reason:   data.offlineReason,
      });
    } else if (runnerSt === 'online' && data.queued > 0) {
      const oldestSec = data.oldestSec;
      const threshold = pool.startsWith('fork') ? CLOUD_PICKUP_RED_SEC : CI_PICKUP_RED_SEC;
      if (oldestSec != null && oldestSec > threshold) {
        data.congested = true;
        const firstPr = data.queuedPrs?.[0];
        const firstPrId = firstPr
          ? (typeof firstPr === 'object' ? `${firstPr.repoAbbr}#${firstPr.number}` : `#${firstPr}`)
          : null;
        congestionAlerts.push({
          kind:     'ci_queue',
          pool,
          poolAbbr: POOL_ABBR[pool] || pool,
          id:       firstPrId,
          ageSec:   oldestSec,
          ageMin:   data.oldestMin,
          reason:   `${POOL_ABBR[pool]} 러너 idle 인데 ${data.oldestMin}분째 queued — 러너 재연결 필요`,
        });
      }
    }
  }

  // 10.5) pool 배정 오류 감지
  for (const [pool, data] of ciPools) {
    if (pool === 'unassigned') continue;
    const items = data.inProgressItems || [];
    if (items.length > 1) {
      congestionAlerts.push({
        kind:     'pool_assign_error',
        pool,
        poolAbbr: POOL_ABBR[pool] || pool,
        id:       null, ageSec: null, ageMin: null,
        reason:   `${POOL_ABBR[pool] || pool} 풀 실행 중 ${items.length}건 — 풀 배정 오류 (한 풀 = 동시 1건)`,
      });
    }
    for (const item of items) {
      if (!item.prNumber) continue;
      const card = prToCard.get(item.prNumber);
      if (!card?.extra?.pr) continue;
      const isForkPr = card.extra.pr.owner === 'narisolutions'
        || (card.extra.pr.repo || '').includes('fork');
      const isInForkPool = pool.startsWith('fork');
      const prAbbr = item.repoAbbr || (isForkPr ? 'fk' : 'sp');
      if (isForkPr && !isInForkPool) {
        congestionAlerts.push({
          kind: 'pool_assign_error', pool, poolAbbr: POOL_ABBR[pool] || pool,
          id: `${prAbbr}#${item.prNumber}`, ageSec: null, ageMin: null,
          reason: `fork PR ${prAbbr}#${item.prNumber} 가 ${POOL_ABBR[pool] || pool}(storeport) 풀에 배정 — 오류`,
        });
      } else if (!isForkPr && isInForkPool) {
        congestionAlerts.push({
          kind: 'pool_assign_error', pool, poolAbbr: POOL_ABBR[pool] || pool,
          id: `${prAbbr}#${item.prNumber}`, ageSec: null, ageMin: null,
          reason: `storeport PR ${prAbbr}#${item.prNumber} 가 ${POOL_ABBR[pool] || pool}(fork) 풀에 배정 — 오류`,
        });
      }
    }
  }

  const _dOriginAsync = repoRoot ? getDataOrigin(nowMs) : null;
  return {
    ...base,
    doneToday,
    runnerVersion,
    ciRunnerPools,
    ciPools,
    hubQueue,
    inProgress,
    caution,
    congestionAlerts,
    dataOrigin: _dOriginAsync ? { ..._dOriginAsync, builtAt: Date.now() } : null,
  };
}

export { POOL_ORDER as _POOL_ORDER, IN_PROGRESS_STAGES, QUEUE_HUBS, getRepoAbbr, NO_CI_REPOS };
