// scripts/lib/land-detect-v2.mjs — M1-1105-BT · v7.3 착지 감지 (2단계 + 잠자기 예산 보정)
//
// M1-1125-B (v8.3) 추가:
//   ③ **head-moved 엄격화**: HEAD 가 움직여도 "그 커밋이 실제로 <hub>/<id>-report.md 를 터치했는지"
//      확인해야 head-moved 로 성공 판정. 아니면 (heartbeat/다른 claim 커밋이었다) 스냅샷만 갱신하고
//      계속 폴. 11-25 사고: v8.2 는 "HEAD 움직임 + 과거 localReport 있음" 만으로 즉시 성공 판정 →
//      세션이 PR 생성·코드 커밋·리뷰 중인데 /exit 로 강제 종료.
//   ④ **세션 idle 지속 N 폴**: report-based 착지(head-moved · report-origin) 는 "pane idle"
//      이 연속 N 폴 유지될 때만 최종 resolve. idle 판정은 호출자 콜백 isPaneIdle() (기본 true) —
//      claude REPL 에서 "esc to interrupt" 등 busy 토큰이 보이지 않을 때 idle=true 로 호출자가 정의.
//      claim-{done,blocked,cancelled} 는 explicit 신호이므로 idle 체크 불필요.
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
 * @param {(headRev:string)=>boolean} [opts.headTouchesReport] M1-1125-B: HEAD 커밋이 report 파일을 터치했는지 (허브 커밋 식별). 미지정 시 v8.2 호환 — 무조건 true.
 * @param {()=>boolean}         [opts.isPaneIdle]          M1-1125-B: 세션이 입력 대기(프롬프트 빈칸) 상태인지. 미지정 시 true(호환).
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
 * @param {number}              [opts.paneIdleStreakThreshold=3] M1-1125-B: report-based 착지 전 요구되는 연속 idle 폴 수 (기본 3)
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
  headTouchesReport = () => true,
  isPaneIdle = () => true,
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
  paneIdleStreakThreshold = 3,
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
    // M1-1125-B v8.3: report-based 착지 전 pane idle 연속 폴 카운터.
    let paneIdleStreak = 0;
    let pendingLandingReason = null; // 'head-moved' | 'report-origin' — idle 연속 N 폴 되면 resolve.
    let busyLogged = false;
    // M1-1125-B v8.3: head-moved 오탐 로그 1회 억제 (poll 마다 중복 방지).
    let headUnrelatedLogged = false;

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

      // Check L1: claim done/blocked/cancelled — 두 phase 모두 최종 (explicit 신호 · idle 체크 불필요).
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

      // M1-1125-B v8.3: pane idle 연속 카운터 갱신. busy 가 보이면 streak reset.
      let paneIdleNow = true;
      try { paneIdleNow = !!isPaneIdle(); } catch { paneIdleNow = true; }
      if (paneIdleNow) {
        paneIdleStreak++;
      } else {
        if (paneIdleStreak > 0) {
          logLine(`[landing] 세션 busy 재진입 · idle streak reset (${paneIdleStreak} → 0)`);
        }
        paneIdleStreak = 0;
        busyLogged = false;
      }

      // pending landing 이 있고 idle 연속 임계 넘겼으면 이제 resolve.
      if (pendingLandingReason && paneIdleStreak >= paneIdleStreakThreshold) {
        resolveLanding(pendingLandingReason);
        return;
      }

      // Check L3: 로컬 HEAD 이동 + 커밋이 report 를 터치 + report 존재 → head-moved (허브가 commit 함).
      // M1-1125-B v8.3: HEAD 이동만으로는 부족 — heartbeat/claim 커밋이 움직였을 수 있음.
      try {
        const curHead = getHead();
        if (headSnapshot && curHead !== headSnapshot) {
          const prevSnapshot = headSnapshot;
          headSnapshot = curHead;
          let touched = false;
          try { touched = !!headTouchesReport(curHead); } catch { /* noop */ }
          if (localReport && touched) {
            if (paneIdleStreak >= paneIdleStreakThreshold) {
              resolveLanding('head-moved');
              return;
            }
            if (!pendingLandingReason) {
              pendingLandingReason = 'head-moved';
              logLine(`[landing] head-moved + report touched · pane idle 대기 (streak=${paneIdleStreak}/${paneIdleStreakThreshold})`);
            }
          } else if (!touched) {
            // 허브와 무관한 commit (heartbeat/claim) — 로그 1회만.
            if (!headUnrelatedLogged) {
              logLine(`[landing] HEAD 이동하였으나 report 미터치 (${prevSnapshot?.slice(0, 7)}→${curHead?.slice(0, 7)}) · 무시하고 폴 계속`);
              headUnrelatedLogged = true;
            }
          }
        }
      } catch { /* noop */ }

      // Check R: origin/main 에 report (N 폴마다).
      if (pollCount % originPollInterval === 0) {
        try {
          if (fetchOriginReport()) {
            if (paneIdleStreak >= paneIdleStreakThreshold) {
              resolveLanding('report-origin');
              return;
            }
            if (!pendingLandingReason) {
              pendingLandingReason = 'report-origin';
              logLine(`[landing] origin/main report 확인 · pane idle 대기 (streak=${paneIdleStreak}/${paneIdleStreakThreshold})`);
            }
          }
        } catch { /* 아직 없음 */ }
      }

      // pending 있는데 busy 인 상태를 1회만 로그 (스팸 방지).
      if (pendingLandingReason && !paneIdleNow && !busyLogged) {
        logLine(`[landing] 착지 조건(${pendingLandingReason}) 충족했으나 세션 busy · 입력 대기 전까지 pane 유지`);
        busyLogged = true;
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
