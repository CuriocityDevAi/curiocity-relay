// scripts/lib/pane-close.mjs — 끝난 Claude 세션 자동 닫기 결정 로직 (M1-1105-BC · 장치 사건 #19)
//
// 뿌리: v7.1 exitPaneClaude 는 done 감지 후 "자연 종료 대기 (최대 10m)" — Claude Code 는 작업 끝나도
//      자동 /exit 하지 않으므로 10 분이 거의 늘 흐르거나 Kyu 가 손으로 /exit 함.
//      오늘(11-12) R0 3회 · M1 1회 발생 (Kyu 10:35·10:39 원문).
//
// 새 규칙 (M1-1105-BC [REQ] 2):
//   1. hub === 'm2'            → skip (수동 투입 칸 · 건드리지 않음)
//   2. isDone === false         → skip (작업 중 세션은 절대 안 닫기)
//   3. state === 'shell'        → done (이미 쉘 · ⛔ `exit` 를 쉘에 절대 보내지 않음 — cmux 칸 닫힘)
//   4. state === 'unknown'      → skip (vim/less 등 모를 땐 안전하게 미개입)
//   5. state === 'claude':
//        attempt 0 (초회)        → 'ctrl-u-exit'       (ctrl-u 로 입력칸 비우고 `/exit\n`)
//        attempt 1 (재시도 1)    → 'ctrl-u-exit'       (같은 시퀀스)
//        attempt 2 (재시도 2)    → 'escape-ctrl-u-exit' (Escape 후 재시도 — recap·bake 상태 대응)
//        attempt >= 3            → 'report-failure'    (3회 전부 15초 안 쉘 미복귀)
//
// decideCloseAction 은 순수 함수 — 사이드 이펙트 없이 다음 액션만 반환.
// 러너는 액션에 맞게 cmux send-key / send-text 호출 후 15초간 detectPaneState 폴, 그래도 claude 면
// attempt++ 로 재호출 · attempt=3 에서 'report-failure' 반환 → relay status 에 pane_close_failed 보고.

/**
 * @typedef {('m0'|'m1'|'m2'|'m3'|'r0'|string)} Hub
 * @typedef {('shell'|'claude'|'unknown')} PaneState
 * @typedef {('skip'|'done'|'ctrl-u-exit'|'escape-ctrl-u-exit'|'report-failure')} Action
 *
 * @typedef {object} CloseInput
 * @property {Hub}       hub
 * @property {PaneState} state
 * @property {number}    attempt   0=초회, 1=재시도 1, 2=재시도 2, 3+=실패
 * @property {boolean}   isDone    claim 상태가 done 인지 (false 면 절대 안 닫음)
 *
 * @typedef {object} CloseDecision
 * @property {Action} action
 * @property {string} reason
 */

/**
 * @param {CloseInput} input
 * @returns {CloseDecision}
 */
export function decideCloseAction({ hub, state, attempt, isDone }) {
  if (hub === 'm2') return { action: 'skip', reason: 'manual-hub' };
  if (isDone === false) return { action: 'skip', reason: 'not-done' };
  if (state === 'shell') return { action: 'done', reason: 'already-shell' };
  if (state === 'unknown') return { action: 'skip', reason: 'unknown-state' };
  if (state === 'claude') {
    if (attempt <= 0) return { action: 'ctrl-u-exit', reason: 'first-try' };
    if (attempt === 1) return { action: 'ctrl-u-exit', reason: 'retry-1' };
    if (attempt === 2) return { action: 'escape-ctrl-u-exit', reason: 'retry-2-escape' };
    return { action: 'report-failure', reason: 'exhausted' };
  }
  return { action: 'skip', reason: 'unexpected-state' };
}

export const PANE_CLOSE_MAX_ATTEMPTS = 3;
