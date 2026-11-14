// scripts/lib/land-detect-v2.mjs — M1-1105-BT · v7.3 착지 감지 (2단계 + 잠자기 예산 보정)
//
// v7.2 의 waitForLandingWith 과의 차이:
//   ① **잠자기 예산 보정**: Mac 잠자기 중에는 Date.now()/hrtime.bigint() 둘 다 전진하므로
//      (mach_absolute_time 도 수면 중 tick · Node 가 노출하는 CLOCK_MONOTONIC 도 마찬가지)
//      **폴링 루프에서 벽시계 점프를 감지** 하는 방식을 선택 — 두 폴 사이 간격 > pollMs × N
//      (기본 4) 이면 그 차이만큼을 예산에서 빼고 "sleep gap 감지 Ns · 예산 보정" 로그.
//   ② **로컬 → 원격 2단계 착지**: report-local(로컬 파일 생김) 만으론 착지라고 보지 않음.
//      로컬 파일이 생긴 후 remoteWaitMs(기본 5m) 안에
//        · claim done/blocked/cancelled (허브가 결과 올림) 또는
//        · origin/main 에 report 존재 (허브가 push 함) 또는
//        · 로컬 HEAD 이동 (허브가 commit 했지만 push 전)
//      이 보여야 "원격 착지" 로 판정. 5m 안 안 올라오면 needs-proxy-land 로 호출자에 반환
//      → 러너가 대신 add·commit·push.
//
// 왜 벽시계 점프 감지인가 (REQ1 권장안 + 이유 3줄):
//   (a) macOS 에서 Node 의 process.hrtime.bigint() 는 CLOCK_MONOTONIC = mach_absolute_time
//       기반인데 Apple 커널은 시스템 수면(suspend) 중에도 이 타이머를 **멈추지 않음** (멈추는 것은
//       hibernation=S4 뿐 · lid close=S3 는 계속 tick). Date.now() 도 동일.
//   (b) mach_absolute_time 을 FFI 로 가져와도 결과가 Date.now() 와 같아 "잠자기 제외 시계" 역할
//       불가 — Apple 공식 문서(DTS `Darwin-Notify-API`, TN2169) 참고 + 실제 측정(수면 1h 후
//       hrtime 1h 전진) 확인 (claims/handoff-20261112-early.md 재현 완료).
//   (c) 따라서 **"setInterval 콜백이 23분 묶여서 나타남"** 이라는 관찰 사실(=수면 중 이벤트 loop
//       정지) 자체를 신호로 쓰는 게 가장 신뢰성 있고 테스트하기 쉽다 (clock injection 가능).

/**
 * waitForLandingAwake
 * @param {object} opts
 * @param {()=>boolean}         opts.reportExists          로컬 report 파일 존재 확인
 * @param {()=>{state,note}|null} opts.readClaim           로컬 claim 읽기
 * @param {()=>string}          opts.getHead               로컬 HEAD rev (throws 허용)
 * @param {()=>boolean}         opts.fetchOriginReport     origin 에 report 존재 여부 (네트워크)
 * @param {(msg:string)=>void}  [opts.logLine]
 * @param {()=>number|null}     [opts.detectLatency]       done 시 지연 계산
 * @param {()=>void}            [opts.onTimeout]           최종 타임아웃 콜백 (C-c 등)
 * @param {(now:number)=>void}  [opts.onPoll]
 * @param {()=>void}            [opts.onSleepGap]          sleep gap 감지 콜백 (heartbeat 기록용)
 * @param {number}              opts.timeoutMs             전체 타임아웃 (잠자기 제외 기준 "effective")
 * @param {number}              [opts.pollMs=5000]
 * @param {number}              [opts.originPollInterval=4]
 * @param {number}              [opts.sigkillGraceMs=5000]
 * @param {number}              [opts.remoteWaitMs=300000] report-local 후 원격 착지 대기 상한 (기본 5m)
 * @param {number}              [opts.sleepGapMultiplier=4] 수면 간주 임계: gap > pollMs × N
 * @param {()=>number}          [opts.now=Date.now]        clock injection (테스트용)
 * @param {(cb:Function,ms:number)=>any} [opts.setIntervalFn=setInterval]
 * @param {(h:any)=>void}       [opts.clearIntervalFn=clearInterval]
 * @param {(cb:Function,ms:number)=>any} [opts.setTimeoutFn=setTimeout]
 * @returns {Promise<{reason:string,timedOut:boolean,detectLatencyS:number|null,sleepGapMs:number,claimNote?:string}>}
 *   reason 값:
 *     'claim-done'|'claim-blocked'|'claim-cancelled' — 허브가 claim 올림 (최종)
 *     'report-origin'                                — origin/main 에 report (최종)
 *     'head-moved'                                   — 로컬 HEAD 이동 + report (최종)
 *     'needs-proxy-land'                             — report-local 만 · 원격 대기 상한 초과 (러너가 push 해야 함)
 *     'timeout'                                      — 전체 예산 초과
 */
export function waitForLandingAwake({
  reportExists,
  readClaim,
  getHead,
  fetchOriginReport,
  logLine = () => {},
  detectLatency = () => null,
  onTimeout = () => {},
  onPoll = () => {},
  onSleepGap = () => {},
  timeoutMs,
  pollMs = 5000,
  originPollInterval = 4,
  sigkillGraceMs = 5000,
  remoteWaitMs = 5 * 60_000,
  sleepGapMultiplier = 4,
  now = Date.now,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  setTimeoutFn = setTimeout,
}) {
  return new Promise((resolve) => {
    const startedAt = now();
    let lastPollAt = startedAt;
    let sleepGapTotal = 0;
    let pollCount = 0;
    let headSnapshot = null;
    try { headSnapshot = getHead(); } catch { /* noop */ }

    let phase = 'await-landing'; // 'await-landing' | 'await-remote'
    let remotePhaseStartedAt = null;
    let remotePhaseSleepGapAtStart = 0;

    const threshold = pollMs * sleepGapMultiplier;

    const resolveLanding = (reason, extra = {}) => {
      clearIntervalFn(interval);
      const latencyS = detectLatency();
      const sgPart = sleepGapTotal > 0 ? ` · sleep-gap=${Math.round(sleepGapTotal / 1000)}s` : '';
      logLine(`[landing] ${reason} · poll=${pollCount}${latencyS != null ? ` · latency=${latencyS}s` : ''}${sgPart}`);
      resolve({ reason, timedOut: false, detectLatencyS: latencyS, sleepGapMs: sleepGapTotal, ...extra });
    };

    const interval = setIntervalFn(() => {
      const t = now();
      const gap = t - lastPollAt;
      if (gap > threshold) {
        // 수면 간주: 기대 간격(pollMs) 을 넘긴 초과분을 예산에서 빼기.
        const addGap = gap - pollMs;
        sleepGapTotal += addGap;
        logLine(`[landing] sleep gap 감지 ${Math.round(addGap / 1000)}s · 예산 보정 (phase=${phase})`);
        try { onSleepGap({ gapMs: addGap, totalMs: sleepGapTotal, phase }); } catch { /* noop */ }
      }
      lastPollAt = t;
      pollCount++;
      try { onPoll(t); } catch { /* noop */ }

      // Check L1: claim done/blocked/cancelled — 두 phase 모두 최종.
      try {
        const claim = readClaim();
        if (claim && (claim.state === 'done' || claim.state === 'blocked' || claim.state === 'cancelled')) {
          resolveLanding(`claim-${claim.state}`, { claimNote: (claim.note || '').slice(0, 80) });
          return;
        }
      } catch { /* noop */ }

      // 로컬 report 존재 확인 (두 phase 공용).
      let localReport = false;
      try { localReport = reportExists(); } catch { /* noop */ }

      // Check L3: 로컬 HEAD 이동 + report 존재 → head-moved (허브가 commit 함).
      try {
        const curHead = getHead();
        if (headSnapshot && curHead !== headSnapshot) {
          headSnapshot = curHead;
          if (localReport) {
            resolveLanding('head-moved');
            return;
          }
        }
      } catch { /* noop */ }

      // Check R: origin/main 에 report (N 폴마다).
      if (pollCount % originPollInterval === 0) {
        try {
          if (fetchOriginReport()) {
            resolveLanding('report-origin');
            return;
          }
        } catch { /* 아직 없음 */ }
      }

      // Phase 전환: report-local 처음 감지 → await-remote.
      if (localReport && phase === 'await-landing') {
        phase = 'await-remote';
        remotePhaseStartedAt = t;
        remotePhaseSleepGapAtStart = sleepGapTotal;
        logLine(`[landing] report-local 감지 · origin/main 착지 대기 시작 (최대 ${Math.round(remoteWaitMs / 60000)}m, 잠자기 제외)`);
      }

      // await-remote 상한 — effective 시간 기준.
      if (phase === 'await-remote' && remotePhaseStartedAt !== null) {
        const remoteGapsSinceStart = sleepGapTotal - remotePhaseSleepGapAtStart;
        const remoteEffective = (t - remotePhaseStartedAt) - remoteGapsSinceStart;
        if (remoteEffective > remoteWaitMs) {
          logLine(`[landing] report-local 후 ${Math.round(remoteWaitMs / 60000)}m (잠자기 제외) 안 origin/main 미착지 · 러너 대리 착지 요청`);
          resolveLanding('needs-proxy-land');
          return;
        }
      }

      // 전체 예산 확인 — effective 시간 기준.
      const effective = (t - startedAt) - sleepGapTotal;
      if (effective > timeoutMs) {
        clearIntervalFn(interval);
        const sgPart = sleepGapTotal > 0 ? ` · sleep-gap=${Math.round(sleepGapTotal / 1000)}s 보정 후 timeout` : '';
        logLine(`[timeout] ${Math.round(timeoutMs / 60000)}m 초과 · poll=${pollCount}${sgPart}`);
        try { onTimeout(); } catch (e) {
          logLine(`[timeout] onTimeout 실패: ${e?.message ?? e}`);
        }
        setTimeoutFn(() => resolve({ reason: 'timeout', timedOut: true, detectLatencyS: null, sleepGapMs: sleepGapTotal }), sigkillGraceMs);
        return;
      }
    }, pollMs);
  });
}
