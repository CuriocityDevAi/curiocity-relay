// scripts/watch/runner-alerts.mjs  M1-1123-I · 러너 경보 판정 (순수 함수 · 단위 테스트 가능)

/**
 * @param {object|null} allJson  status/runners/all.json 파싱 결과
 * @param {{ nowMs?: number, aheadSinceMs?: number|null, unclaimedIds?: Array<{id:string,ageMin:number}> }} opts
 * @returns {{ alerts: Array<{type:string,msg:string}>, aheadSinceMs: number|null }}
 */
export function computeRunnerAlerts(allJson, { nowMs = Date.now(), aheadSinceMs = null, unclaimedIds = [] } = {}) {
  const alerts = [];
  let newAheadSinceMs = aheadSinceMs;

  if (!allJson) return { alerts, aheadSinceMs: null };

  // heartbeat (all.json `at`) 10분 초과
  if (allJson.at) {
    const hbAge = Math.round((nowMs - new Date(allJson.at).getTime()) / 60000);
    if (hbAge >= 10) {
      alerts.push({ type: 'heartbeat_timeout', msg: `러너 응답 없음(Mac 잠자기?) · ${hbAge}분` });
    }
  }

  const gs = allJson.git_state;
  if (gs) {
    // needs_human 또는 충돌 파일 존재
    if (gs.needs_human || (gs.conflicted && gs.conflicted.length > 0)) {
      const files = gs.conflicted && gs.conflicted.length > 0 ? ': ' + gs.conflicted.join(', ') : '';
      alerts.push({ type: 'git_conflict', msg: `relay 충돌 · 사람 필요${files}` });
    }

    // ahead > 0 이 5분 넘게 지속
    if ((gs.ahead || 0) > 0) {
      if (newAheadSinceMs === null) newAheadSinceMs = nowMs;
      const aheadMin = Math.round((nowMs - newAheadSinceMs) / 60000);
      if (aheadMin >= 5) {
        alerts.push({ type: 'git_ahead', msg: `GitHub에 못 올린 기록 ${gs.ahead}개 · ${aheadMin}분 지속` });
      }
    } else {
      newAheadSinceMs = null;
    }
  }

  // err_tail 에서 같은 오류 줄이 3회 이상 반복
  if (allJson.err_tail) {
    const lines = allJson.err_tail.split('\n').filter(Boolean);
    const counts = new Map();
    for (const l of lines) counts.set(l, (counts.get(l) || 0) + 1);
    for (const [line, count] of counts) {
      if (count >= 3) {
        const summary = line.length > 80 ? line.slice(0, 80) + '…' : line;
        alerts.push({ type: 'err_repeat', msg: `오류 ${count}회 반복: ${summary}` });
      }
    }
  }

  // 큐에 있는데 3분 넘게 claim 없는 프롬프트 ID
  for (const { id, ageMin } of unclaimedIds) {
    if (ageMin >= 3) {
      alerts.push({ type: 'unclaimed', msg: `미투입: ${id} (${ageMin}분)` });
    }
  }

  return { alerts, aheadSinceMs: newAheadSinceMs };
}
