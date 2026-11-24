// scripts/watch/thresholds.mjs  ci-watch v2.0 · 예상치/임계 판정
// 로컬 전용 · GitHub 호출 없음.
//
// 9칸 모델:
//   queue → hub → report → pr → ci_pending → ci_running → ci_result → review → merge
//
// 색 코드:
//   ● green  : 정상 범위 (노 임계 미만)
//   ▲ yellow : 느림 (노 임계 이상 · 빨 임계 미만)
//   ■ red    : 비정상 (빨 임계 이상)

export const COLUMNS = [
  'queue',
  'hub',
  'report',
  'pr',
  'ci_pending',
  'ci_running',
  'ci_result',
  'review',
  'merge',
];

export const COLUMN_LABELS = {
  queue: '큐',
  hub: '허브작업',
  report: '리포트',
  pr: 'PR',
  ci_pending: 'CI대기',
  ci_running: 'CI실행',
  ci_result: 'CI결과',
  review: '리뷰',
  merge: '머지',
};

// M2-1124-R §5: 샘플 3건 미만 기본값.
// 숫자는 "노▲ 임계분 · 빨■ 임계분".
export const DEFAULT_THRESHOLDS = {
  queue:      { yellow: 2,  red: 5 },
  hub:        { yellow: 28, red: 40 }, // 프롬프트 상한 기본 40분 기준 70%/100%
  report:     { yellow: 3,  red: 5 },
  pr:         { yellow: 10, red: 15 },
  ci_pending: { yellow: 5,  red: 10 },
  ci_running: { yellow: 10, red: 20 },
  ci_result:  { yellow: 5,  red: 10 },
  review:     { yellow: 28, red: 40 },
  merge:      { yellow: 10, red: 20 },
};

// M2-1124-R §1: 머지 10분 후 카드 숨김.
export const MERGE_HIDE_MIN = 10;

/**
 * 체류 분을 임계와 비교해 상태 심볼 결정.
 * @param {string} column
 * @param {number|null} ageMin
 * @param {{yellow?:number, red?:number}} [override]
 * @returns {{level: 'green'|'yellow'|'red', mark: '●'|'▲'|'■'}}
 */
export function classifyAge(column, ageMin, override) {
  const t = { ...(DEFAULT_THRESHOLDS[column] || {}), ...(override || {}) };
  const m = typeof ageMin === 'number' ? ageMin : 0;
  if (t.red != null && m >= t.red) return { level: 'red', mark: '■' };
  if (t.yellow != null && m >= t.yellow) return { level: 'yellow', mark: '▲' };
  return { level: 'green', mark: '●' };
}

/**
 * 머지 N분 후 카드 숨김 여부.
 */
export function shouldHideAfterMerge(column, ageMin, hideMin = MERGE_HIDE_MIN) {
  if (column !== 'merge') return false;
  return typeof ageMin === 'number' && ageMin >= hideMin;
}

/**
 * 성공률 재계산 — 취소·건너뜀 제외 (Kyu 22:50 #3).
 * @param {Array<{conclusion:string}>} records
 * @returns {{successRate: number|null, failCount: number, total: number}}
 */
export function recomputeSuccessRate(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { successRate: null, failCount: 0, total: 0 };
  }
  const EXCLUDED = new Set(['skipped', 'cancelled', 'canceled']);
  const relevant = records.filter(r => r.conclusion && !EXCLUDED.has(String(r.conclusion).toLowerCase()));
  if (relevant.length === 0) return { successRate: null, failCount: 0, total: 0 };
  const success = relevant.filter(r => String(r.conclusion).toLowerCase() === 'success').length;
  const fail = relevant.length - success;
  const rate = Math.round((success / relevant.length) * 1000) / 10; // 소수 1자리
  return { successRate: rate, failCount: fail, total: relevant.length };
}
