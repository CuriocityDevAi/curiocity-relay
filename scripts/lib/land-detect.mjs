// scripts/lib/land-detect.mjs — 허브 착지 감지 순수 함수 (M2-1105-AO v7.1)
// Mac 로컬 5초 주기 · 토큰·네트워크 0

/**
 * waitForLandingWith
 * 허브 착지(완료) 감지 — 의존성 주입 버전 (테스트·생산 코드 공용).
 *
 * 감지 순서 (우선도 높은 것부터):
 *   L1 — 로컬 claim done/blocked/cancelled (파일 읽기만 · 네트워크 0)
 *   L2 — 로컬 report 파일 생성 (existsSync · 네트워크 0)
 *   L3 — 로컬 HEAD 이동 + report 파일 (git rev-parse · 네트워크 0)
 *   R  — origin/main 에 report 존재 (originPollInterval 주기 · 네트워크)
 *
 * @param {object} opts
 * @param {()=>boolean}         opts.reportExists        로컬 report 파일 존재 확인
 * @param {()=>{state,note}|null} opts.readClaim         로컬 claim 읽기
 * @param {()=>string}          opts.getHead             로컬 HEAD rev (throws 허용)
 * @param {()=>boolean}         opts.fetchOriginReport   origin 에 report 존재 여부 (네트워크)
 * @param {(msg:string)=>void}  [opts.logLine]           로그 출력 함수
 * @param {(latS:number|null)=>void} [opts.detectLatency] done 시 지연 계산 함수
 * @param {()=>void}            [opts.onTimeout]         타임아웃 콜백
 * @param {(now:number)=>void}  [opts.onPoll]            폴 콜백
 * @param {number}              opts.timeoutMs           전체 타임아웃
 * @param {number}              [opts.pollMs=5000]       로컬 폴 주기 (ms)
 * @param {number}              [opts.originPollInterval=4] origin 체크 간격 (N 폴마다)
 * @param {number}              [opts.sigkillGraceMs=5000]  타임아웃 후 resolve 까지 대기
 * @returns {Promise<{reason:string, timedOut:boolean, detectLatencyS:number|null, claimNote?:string}>}
 */
export function waitForLandingWith({
  reportExists,
  readClaim,
  getHead,
  fetchOriginReport,
  logLine = () => {},
  detectLatency = () => null,
  onTimeout = () => {},
  onPoll = () => {},
  timeoutMs,
  pollMs = 5000,
  originPollInterval = 4,
  sigkillGraceMs = 5000,
}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let pollCount = 0;
    let headSnapshot = null;
    try { headSnapshot = getHead(); } catch { /* noop */ }

    const done = (reason, extra = {}) => {
      const latencyS = detectLatency();
      logLine(`[landing] ${reason} · poll=${pollCount}${latencyS != null ? ` · latency=${latencyS}s` : ''}`);
      resolve({ reason, timedOut: false, detectLatencyS: latencyS, ...extra });
    };

    const interval = setInterval(() => {
      pollCount++;
      try { onPoll(Date.now()); } catch { /* noop */ }

      // Check L1: 로컬 claim done/blocked/cancelled (네트워크 0)
      try {
        const claim = readClaim();
        if (claim && (claim.state === 'done' || claim.state === 'blocked' || claim.state === 'cancelled')) {
          clearInterval(interval);
          done(`claim-${claim.state}`, { claimNote: (claim.note || '').slice(0, 80) });
          return;
        }
      } catch { /* noop */ }

      // Check L2: 로컬 report 파일 생김 (네트워크 0)
      try {
        if (reportExists()) {
          clearInterval(interval);
          done('report-local');
          return;
        }
      } catch { /* noop */ }

      // Check L3: 로컬 HEAD 이동 + report 확인
      try {
        const curHead = getHead();
        if (headSnapshot && curHead !== headSnapshot) {
          headSnapshot = curHead;
          if (reportExists()) {
            clearInterval(interval);
            done('head-moved');
            return;
          }
        }
      } catch { /* noop */ }

      // Check R (보조): origin 에 report 존재 (N poll 마다 · 네트워크)
      if (pollCount % originPollInterval === 0) {
        try {
          if (fetchOriginReport()) {
            clearInterval(interval);
            done('report-origin');
            return;
          }
        } catch { /* not yet */ }
      }

      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(interval);
        logLine(`[timeout] ${Math.round(timeoutMs / 60000)}m 초과 · poll=${pollCount}`);
        try { onTimeout(); } catch (e) {
          logLine(`[timeout] onTimeout 실패: ${e?.message ?? e}`);
        }
        setTimeout(() => resolve({ reason: 'timeout', timedOut: true, detectLatencyS: null }), sigkillGraceMs);
        return;
      }
    }, pollMs);
  });
}
