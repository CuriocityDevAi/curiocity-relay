// scripts/lib/recovery.mjs — 재시작 복구 판단 순수 함수 (M2-1105-AO v7.1)

/**
 * shouldRecoverStartedClaim
 * 재시작 복구 시 claim 을 blocked 처리해야 하는지 판단.
 *
 * @param {string|null} claimState 현재 claim 상태 ('started'|'done'|'cancelled'|'blocked'|null)
 * @param {string}      paneState  현재 pane 상태 ('claude'|'shell'|'unknown')
 * @returns {'skip-state'|'skip-claude'|'recover'}
 *   skip-state  — claim 이 이미 done/cancelled/blocked (덮어쓰기 금지)
 *   skip-claude — pane 에 claude 작업 중 (개입 보류 · 자연 완료 대기)
 *   recover     — blocked 처리 대상 (started + 빈 pane)
 */
export function shouldRecoverStartedClaim({ claimState, paneState }) {
  if (!claimState || claimState === 'done' || claimState === 'cancelled' || claimState === 'blocked') {
    return 'skip-state';
  }
  if (paneState === 'claude') {
    return 'skip-claude';
  }
  return 'recover';
}
