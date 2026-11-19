// scripts/lib/ci-background.mjs · M0-1119-I/J — 러너 본체와 분리된 CI 조회 백그라운드.
//
// 보장:
//   · 동시 1개만 in-flight (두 번째 호출은 조용히 skip).
//   · M0-1119-J REQ2: inFlight 는 실제 fetchFn 가 settle 할 때까지 유지.
//     deadline(soft) 은 "latest 를 error 로 노출" 만 하고 in-flight 는 풀지 않는다.
//     → 다음 tick 과 겹쳐 쌓이는 문제 (withDeadline 조기 해제 버그) 를 제거.
//   · M0-1119-J REQ1: minIntervalMs (마지막 시작 시각으로부터) 미만이면 start 안 함.
//   · 결과는 메모리에 둠. writeHeartbeat 가 getLatestCi() 로 읽기만.

const DEFAULT_DEADLINE_MS = 30_000;

function makeState() {
  return {
    inFlight: false,
    latest: null,
    startedAt: null,
    lastStartedAt: null,
  };
}

const GLOBAL = makeState();

export function createCiBackground() {
  return makeState();
}

export function maybeStartCiFetch(fetchFn, opts = {}) {
  const state = opts.state || GLOBAL;
  const deadlineMs = opts.deadlineMs || DEFAULT_DEADLINE_MS;
  const minIntervalMs = opts.minIntervalMs || 0;
  if (state.inFlight) return { started: false, reason: 'in-flight' };
  if (minIntervalMs > 0 && state.lastStartedAt
      && (Date.now() - state.lastStartedAt) < minIntervalMs) {
    return { started: false, reason: 'min-interval' };
  }
  state.inFlight = true;
  state.startedAt = Date.now();
  state.lastStartedAt = state.startedAt;

  let deadlineTriggered = false;
  const t = setTimeout(() => {
    deadlineTriggered = true;
    state.latest = { error: `deadline ${deadlineMs}ms`, at: new Date().toISOString() };
  }, deadlineMs);
  if (typeof t.unref === 'function') t.unref();

  const settle = (patch) => {
    clearTimeout(t);
    const at = new Date().toISOString();
    if (!deadlineTriggered) state.latest = { ...patch, at };
    state.inFlight = false;
  };

  Promise.resolve()
    .then(() => fetchFn())
    .then(
      (v) => settle({ data: v, took_ms: Date.now() - state.startedAt }),
      (e) => settle({ error: e.message || String(e) }),
    );
  return { started: true };
}

export function getLatestCi(opts = {}) {
  const state = opts.state || GLOBAL;
  return state.latest;
}

export function isFetchInFlight(opts = {}) {
  const state = opts.state || GLOBAL;
  return state.inFlight;
}

export function _resetCiBackground() {
  GLOBAL.inFlight = false;
  GLOBAL.latest = null;
  GLOBAL.startedAt = null;
  GLOBAL.lastStartedAt = null;
}
