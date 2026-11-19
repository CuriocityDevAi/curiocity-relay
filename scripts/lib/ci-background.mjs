// scripts/lib/ci-background.mjs · M0-1119-I — 러너 본체와 분리된 CI 조회 백그라운드.
//
// 보장:
//   · 동시 1개만 in-flight (두 번째 호출은 조용히 skip).
//   · 전체 마감 30s — 초과 시 { error, at } 만 저장. tick / safePull / claim 경로에
//     await 를 걸지 않는다.
//   · 결과는 메모리에 둠. writeHeartbeat 가 getLatestCi() 로 읽기만.

const DEFAULT_DEADLINE_MS = 30_000;

function makeState() {
  return {
    inFlight: false,
    latest: null, // { data, at } 또는 { error, at }
    startedAt: null,
  };
}

// 모듈 싱글턴 state (프로세스 전역).
const GLOBAL = makeState();

export function createCiBackground() {
  // 테스트 용 격리 state.
  return makeState();
}

function withDeadline(promise, ms) {
  return new Promise((resolve) => {
    let settled = false;
    const t = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ __deadline: true });
    }, ms);
    promise.then(
      (v) => { if (settled) return; settled = true; clearTimeout(t); resolve({ __value: v }); },
      (e) => { if (settled) return; settled = true; clearTimeout(t); resolve({ __error: e }); },
    );
  });
}

export function maybeStartCiFetch(fetchFn, opts = {}) {
  const state = opts.state || GLOBAL;
  const deadlineMs = opts.deadlineMs || DEFAULT_DEADLINE_MS;
  if (state.inFlight) return { started: false, reason: 'in-flight' };
  state.inFlight = true;
  state.startedAt = Date.now();
  // fire-and-forget — 호출자는 await 하지 않는다.
  (async () => {
    const started = Date.now();
    const res = await withDeadline(
      Promise.resolve().then(() => fetchFn()),
      deadlineMs,
    );
    const at = new Date().toISOString();
    if (res.__deadline) {
      state.latest = { error: `deadline ${deadlineMs}ms`, at };
    } else if (res.__error) {
      state.latest = { error: res.__error.message || String(res.__error), at };
    } else {
      state.latest = { data: res.__value, at, took_ms: Date.now() - started };
    }
    state.inFlight = false;
  })().catch((e) => {
    state.inFlight = false;
    state.latest = { error: e.message || String(e), at: new Date().toISOString() };
  });
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

// 테스트 지원: 전역 state 리셋.
export function _resetCiBackground() {
  GLOBAL.inFlight = false;
  GLOBAL.latest = null;
  GLOBAL.startedAt = null;
}
