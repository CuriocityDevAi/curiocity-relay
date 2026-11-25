// scripts/watch/pipeline-view.mjs  ci-watch v2.0 · 9칸 융합 로직
// 각 프롬프트 ID 는 "가장 진전된" 1칸에만 배치된다.
// MVP 전략: R8 pipeline.jsonl 가 아직 없으므로 "활성 신호" 로만 카드를 띄운다.
//   - queue file + unclaimed
//   - allJson.hubs.<hub>.current
//   - 최근 N분 리포트 mtime (리포트/PR 추론)
//   - today's status/ci/<date>.jsonl 매칭
//   - r0 리포트 mtime < 2h (리뷰)
//   - pipeline.jsonl merged 이벤트 (아직 거의 비어있음)
// 신호가 없으면 "끝난 사이클"로 보고 카드로 띄우지 않는다 (예전 리포트 적체 방지).

import {
  resolvePaths,
  readAllJson,
  scanQueueFiles,
  readClaim,
  findReportFile,
  extractPrUrl,
  extractReportTitle,
  readReportFirstLine,
  readQueueTitle,
  readPipelineEvents,
  readCiJsonl,
  scanR0Reviews,
  scanRecentReports,
  extractHubFromId,
  getWibDateStr,
  QUEUE_HUBS,
} from './sources-local.mjs';
import { readAllJsonGit, readClaimGit } from './sources-git.mjs';
import { classifyAge, shouldHideAfterMerge, recomputeSuccessRate, COLUMNS } from './thresholds.mjs';

import { join as join_safe } from 'node:path';
import { existsSync as fs_exists } from 'node:fs';

// 리포트 mtime 이 이 분 이내일 때만 report/pr 칸으로 띄움 (예전 리포트 적체 방지)
const REPORT_RECENT_MIN = 20;
const REVIEW_RECENT_HR = 2;
const CI_RESULT_RECENT_MIN = 15;

/**
 * 프롬프트 ID 당 "현재 칸" 결정.
 */
export function buildPipelineView({
  repoRoot,
  now = new Date(),
  nowMs = Date.now(),
  allJson: allJsonOverride,
  hideMin,
  reportRecentMin = REPORT_RECENT_MIN,
  reviewRecentHr = REVIEW_RECENT_HR,
  ciResultRecentMin = CI_RESULT_RECENT_MIN,
} = {}) {
  const paths = resolvePaths(repoRoot);
  // all.json: git 오브젝트 우선, 없으면 작업 트리 폴백
  const allJson = allJsonOverride
    || (repoRoot && readAllJsonGit(repoRoot))
    || readAllJson(paths)
    || {};
  const dateStr = getWibDateStr(now);
  const todayCodes = getIdDateCodes(now);

  const byId = new Map(); // id → Card

  const ensure = (id, hub) => {
    if (!byId.has(id)) byId.set(id, { id, hub: hub || extractHubFromId(id) });
    const c = byId.get(id);
    if (!c.hub && hub) c.hub = hub;
    return c;
  };

  // --- 1) 큐: queue/<hub>/<id>.md 있고 claim 미착수.
  // claim: git 오브젝트 우선, 없으면 작업 트리 폴백
  for (const q of scanQueueFiles(paths)) {
    if (!inRecentCodes(q.id, todayCodes)) continue;
    const claim = (repoRoot && readClaimGit(repoRoot, q.id)) || readClaim(paths, q.id);
    const claimed = !!(claim && claim.state && claim.state !== 'issued');
    if (claimed) continue;
    const card = ensure(q.id, q.hub);
    card.column = 'queue';
    card.since = new Date(q.mtimeMs);
    card.ageMin = Math.max(0, Math.round((nowMs - q.mtimeMs) / 60000));
    card.title = readQueueTitle(q.filePath) || '';
  }

  // --- 2) 허브작업: allJson.hubs.<hub>.current.
  const hubCurrents = new Map();
  const hubOrder = {};
  for (const hub of QUEUE_HUBS) {
    const h = allJson.hubs?.[hub];
    if (!h?.current) continue;
    const id = h.current;
    hubCurrents.set(hub, id);
    const card = ensure(id, hub);
    const startedAt = h.started_at ? new Date(h.started_at).getTime() : nowMs;
    card.column = 'hub';
    card.since = new Date(startedAt);
    card.ageMin = Math.max(0, Math.round((nowMs - startedAt) / 60000));
    if (!card.title) {
      const rpt = findReportFile(paths, hub, id);
      card.title = readQueueTitle(_findQueueFile(paths, hub, id))
        || (rpt ? extractReportTitle(rpt.path) : null)
        || '';
    }
    card.extra = { ...(card.extra || {}), model: h.model || null };
  }
  for (const hub of hubCurrents.keys()) {
    const ids = [...byId.values()]
      .filter(c => c.hub === hub && c.column === 'queue')
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 2)
      .map(c => c.id);
    hubOrder[hub] = ids;
  }

  // --- 3) 최근 리포트 (mtime < reportRecentMin): report/pr 칸 후보.
  const recentReportMs = reportRecentMin * 60_000;
  const recentReports = scanRecentReports(paths, { maxAgeMs: recentReportMs, nowMs })
    .filter(r => inRecentCodes(r.id, todayCodes));
  const prByReportId = new Map();
  for (const r of recentReports) {
    const prUrl = extractPrUrl(r.path);
    if (prUrl) prByReportId.set(r.id, { ...prUrl, reportPath: r.path });
    const existing = byId.get(r.id);
    if (existing && existing.column === 'hub') {
      // hub 가 아직 돌고 있으면 hub 유지 — 하지만 PR URL 은 수집해서 CI 매칭에 쓴다
      continue;
    }
    const card = ensure(r.id);
    const ageMin = Math.max(0, Math.round((nowMs - r.mtimeMs) / 60000));
    // R0 허브 카드: 리포트의 PR URL 은 "리뷰 대상 PR" 이므로 card.extra.pr 에 설정 금지.
    const isR0 = r.hub === 'r0';
    card.column = (prUrl && !isR0) ? 'pr' : 'report';
    card.since = new Date(r.mtimeMs);
    card.ageMin = ageMin;
    if (!card.title) {
      card.title = readQueueTitle(_findQueueFile(paths, r.hub, r.id))
        || extractReportTitle(r.path)
        || '';
    }
    card.extra = { ...(card.extra || {}), reportFirstLine: readReportFirstLine(r.path) };
    if (prUrl && !isR0) card.extra.pr = prUrl;
  }

  // --- 4) today CI jsonl → ci_running/ci_result + ci_pending 예측 조정.
  const todayCi = readCiJsonl(paths, dateStr);
  const ciByPr = new Map();
  for (const r of todayCi) {
    if (!r.pr) continue;
    const list = ciByPr.get(r.pr) || [];
    list.push(r);
    ciByPr.set(r.pr, list);
  }

  for (const card of byId.values()) {
    const pr = card.extra?.pr?.number;
    if (!pr) continue;
    const list = ciByPr.get(pr) || [];
    if (list.length === 0) continue;
    const running = list.find(x => x.started_at && !x.completed_at);
    const latestDone = list
      .filter(x => x.completed_at)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))[0];
    if (running) {
      const start = new Date(running.started_at).getTime();
      card.column = 'ci_running';
      card.since = new Date(start);
      card.ageMin = Math.max(0, Math.round((nowMs - start) / 60000));
      card.extra = { ...(card.extra || {}), ci: { runner_kind: running.runner_kind, job: running.job, workflow: running.workflow } };
    } else if (latestDone) {
      const done = new Date(latestDone.completed_at).getTime();
      const sinceMin = Math.max(0, Math.round((nowMs - done) / 60000));
      if (sinceMin <= ciResultRecentMin) {
        card.column = 'ci_result';
        card.since = new Date(done);
        card.ageMin = sinceMin;
        card.extra = { ...(card.extra || {}), ci: {
          runner_kind: latestDone.runner_kind, job: latestDone.job,
          workflow: latestDone.workflow, conclusion: latestDone.conclusion,
        }};
      } else {
        // 결과가 오래되어 더 이상 활성이 아님 — 리뷰 신호가 있으면 아래 단계에서 승격, 없으면 숨김 대상.
        // 여기서는 card.column 유지 (pr) · 아래 '활성 신호 필터' 가 걸러줌.
      }
    }
  }

  // --- 5) CI 대기 예측: PR URL 있고 CI jsonl 매칭 無 → ci_pending.
  for (const card of byId.values()) {
    if (card.column !== 'pr') continue;
    const pr = card.extra?.pr?.number;
    if (!pr) continue;
    const list = ciByPr.get(pr) || [];
    if (list.length > 0) continue;
    card.column = 'ci_pending';
    card.predicted = true;
  }

  // --- 6) r0 리뷰 (mtime < reviewRecentHr 시간) → review 칸.
  // predicted=true: 로컬만으로 머지 여부를 확인할 수 없으므로 경보 집계 제외.
  const reviews = scanR0Reviews(paths);
  const reviewRecentMs = reviewRecentHr * 3600_000;
  for (const [targetId, info] of reviews.entries()) {
    if (!inRecentCodes(targetId, todayCodes)) continue;
    if (!inRecentCodes(info.reviewerId, todayCodes)) continue;
    if (nowMs - info.mtimeMs > reviewRecentMs) continue;
    const card = ensure(targetId);
    if (card.column === 'merge') continue;
    card.column = 'review';
    card.predicted = true; // 머지 여부 로컬 미확인 → 경보 집계 제외
    card.since = new Date(info.mtimeMs);
    card.ageMin = Math.max(0, Math.round((nowMs - info.mtimeMs) / 60000));
    card.extra = { ...(card.extra || {}), review: info };
    if (!card.title) {
      const qFile = _findQueueFile(paths, card.hub, card.id);
      const qTitle = readQueueTitle(qFile);
      if (qTitle) {
        card.title = qTitle;
      } else {
        const rpt = findReportFile(paths, card.hub, card.id);
        if (rpt) card.title = extractReportTitle(rpt.path) || '';
      }
    }
  }

  // --- 7) pipeline.jsonl merged 이벤트 (R8 전에는 거의 없음).
  for (const card of byId.values()) {
    const ev = readPipelineEvents(paths, card.id);
    const merged = ev.find(e => e.type === 'merged');
    if (!merged) continue;
    const mAt = merged.at ? new Date(merged.at).getTime() : nowMs;
    card.column = 'merge';
    card.since = new Date(mAt);
    card.ageMin = Math.max(0, Math.round((nowMs - mAt) / 60000));
  }

  // --- 8) 라벨·색 계산 + 숨김 적용.
  const cards = [];
  let doneToday = 0;
  for (const card of byId.values()) {
    if (!card.column) continue;
    if (!card.title) {
      const q = _findQueueFile(paths, card.hub, card.id);
      if (q) card.title = readQueueTitle(q) || '';
    }
    if (shouldHideAfterMerge(card.column, card.ageMin, hideMin)) {
      doneToday += 1;
      continue;
    }
    // predicted review: 경보 집계 제외.
    // APPROVE + 90분 → 머지 추정으로 숨김; 그 외 → level 강제 green.
    if (card.predicted && card.column === 'review') {
      const firstLine = card.extra?.review?.firstLine;
      if (firstLine === 'APPROVE' && card.ageMin >= 90) {
        doneToday += 1;
        continue; // 머지 추정 숨김
      }
      card.level = 'green';
      card.mark = '●';
      card.column_label = labelOf(card.column);
      card.reason = '예측·머지 여부 모름';
      cards.push(card);
      continue;
    }
    const cls = classifyAge(card.column, card.ageMin, card.thresholdOverride);
    card.level = cls.level;
    card.mark = cls.mark;
    card.column_label = labelOf(card.column);
    if (card.level !== 'green' && !card.reason) card.reason = defaultReason(card);
    cards.push(card);
  }

  // --- 9) 이상 감지 (GitHub 조회 트리거 결정용).
  const anomalies = [];
  for (const c of cards) {
    if (c.level === 'red') anomalies.push({ type: `${c.column}_overdue`, id: c.id, column: c.column, ageMin: c.ageMin });
    if (c.column === 'ci_pending' && c.ageMin >= 5) anomalies.push({ type: 'ci_missing_start', id: c.id, ageMin: c.ageMin });
  }

  // --- 10) 성공률 재계산 (취소·건너뜀 제외 — Kyu 22:50 #3).
  const today = allJson.ci?.data?.today || null;
  const recomputed = recomputeSuccessRate(todayCi);

  return {
    cards,
    hubCurrents: Object.fromEntries(hubCurrents),
    hubOrder,
    doneToday,
    anomalies,
    today,
    todaySuccess: recomputed,
    stats: {
      local_confirmed: cards.filter(c => !c.predicted).length,
      local_predicted: cards.filter(c => !!c.predicted).length,
    },
  };
}

function getIdDateCodes(now) {
  const codes = new Set();
  for (const d of [0, 1]) {
    const t = new Date(now);
    t.setUTCDate(t.getUTCDate() - d);
    codes.add(String(t.getUTCMonth() + 1).padStart(2, '0') + String(t.getUTCDate()).padStart(2, '0'));
    const tw = new Date(now.getTime() + 7 * 3600_000);
    tw.setUTCDate(tw.getUTCDate() - d);
    codes.add(String(tw.getUTCMonth() + 1).padStart(2, '0') + String(tw.getUTCDate()).padStart(2, '0'));
  }
  return codes;
}

function inRecentCodes(id, codes) {
  const m = String(id).match(/-(\d{4})-/);
  return !!m && codes.has(m[1]);
}

function defaultReason(card) {
  switch (card.column) {
    case 'queue':      return `큐 대기 ${card.ageMin}분`;
    case 'hub':        return `허브작업 ${card.ageMin}분 (상한 초과)`;
    case 'report':     return `리포트 체류 ${card.ageMin}분`;
    case 'pr':         return `PR 착지 ${card.ageMin}분`;
    case 'ci_pending': return 'CI 미시작 — 로컬 러너 미착수';
    case 'ci_running': return `CI 실행 ${card.ageMin}분 경과`;
    case 'ci_result':  return `CI 결과 ${card.ageMin}분 전`;
    case 'review':     return `리뷰 대기 ${card.ageMin}분`;
    case 'merge':      return `머지 ${card.ageMin}분 전`;
    default:           return '';
  }
}

function labelOf(col) {
  return ({
    queue: '큐', hub: '허브작업', report: '리포트', pr: 'PR',
    ci_pending: 'CI대기', ci_running: 'CI실행', ci_result: 'CI결과',
    review: '리뷰', merge: '머지',
  })[col] || col;
}

function _findQueueFile(paths, hub, id) {
  if (!hub) return null;
  const p = join_safe(paths.queueRoot, hub, `${id}.md`);
  try { return fs_exists(p) ? p : null; } catch { return null; }
}

export { COLUMNS, getIdDateCodes, inRecentCodes };
