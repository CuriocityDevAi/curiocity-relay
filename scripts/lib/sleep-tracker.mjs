// scripts/lib/sleep-tracker.mjs · M1-1124-N
//
// 러너 메인 루프의 sleep/wake 감지 — tick 간격을 모니터링해 두 tick 사이
// 벽시계 점프(> pollMs × threshold) 를 sleep 으로 간주하고 누적한다.
//
// 용도: `recoverStuckStartedClaims` 가 `Date.now() - stuck.at > run_timeout_ms` 로
// 60 분 상한을 판단할 때, 그 시간에 섞인 sleep 을 빼서 '실제 돌았던 시간' 기준으로 판정.
//
// 오늘 사고:
//   M1-1124-M 과 M2-1124-Q 가 노트북 잠자기 포함 60분 초과로 blocked 처리됨.
//   허브가 실제로 60분 돌지 않았는데도.
//
// 저장:
//   `<runnerHome>/sleep-events.ndjson` — { ts, gap_ms } 한 줄씩.
//   파일이 커지지 않게 24h 넘은 레코드는 다음 observe 호출에서 잘라냄.

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

const RETAIN_MS = 24 * 60 * 60 * 1000;

export function createSleepTracker({ runnerHome, pollMs, sleepGapMultiplier = 4, logFn } = {}) {
  const logFile = `${runnerHome}/sleep-events.ndjson`;
  const threshold = pollMs * sleepGapMultiplier;
  let lastTickAt = 0;

  function _load() {
    if (!existsSync(logFile)) return [];
    try {
      const out = [];
      for (const line of readFileSync(logFile, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try {
          const o = JSON.parse(line);
          if (o && typeof o.ts === 'string' && Number.isFinite(o.gap_ms)) out.push(o);
        } catch { /* skip */ }
      }
      return out;
    } catch { return []; }
  }

  function _prune() {
    const all = _load();
    const cutoff = Date.now() - RETAIN_MS;
    const kept = all.filter((o) => Date.parse(o.ts) >= cutoff);
    if (kept.length === all.length) return;
    try {
      mkdirSync(dirname(logFile), { recursive: true });
      writeFileSync(logFile, kept.map((o) => JSON.stringify(o)).join('\n') + (kept.length ? '\n' : ''));
    } catch { /* noop */ }
  }

  return {
    // 매 tick 시작에 호출. 전 tick 대비 gap 이 threshold 초과면 sleep 로 기록.
    observeTick() {
      const now = Date.now();
      if (lastTickAt === 0) { lastTickAt = now; return { gapMs: 0, sleep: false }; }
      const gapMs = now - lastTickAt;
      lastTickAt = now;
      if (gapMs < threshold) return { gapMs, sleep: false };
      const ts = new Date(now).toISOString();
      try {
        mkdirSync(dirname(logFile), { recursive: true });
        appendFileSync(logFile, JSON.stringify({ ts, gap_ms: gapMs }) + '\n');
      } catch { /* noop */ }
      if (typeof logFn === 'function') {
        try { logFn(`sleep observed · gap=${Math.round(gapMs / 1000)}s · threshold=${Math.round(threshold / 1000)}s`); } catch { /* noop */ }
      }
      _prune();
      return { gapMs, sleep: true };
    },

    // 주어진 [fromMs, toMs) 구간 안에서 누적된 sleep 시간을 반환.
    accumulatedSleepMs(fromIso, toMs = Date.now()) {
      const fromMs = typeof fromIso === 'string' ? Date.parse(fromIso) : Number(fromIso);
      if (!Number.isFinite(fromMs)) return 0;
      const all = _load();
      let total = 0;
      for (const o of all) {
        const t = Date.parse(o.ts);
        if (!Number.isFinite(t)) continue;
        if (t < fromMs || t >= toMs) continue;
        total += Math.max(0, Number(o.gap_ms) || 0);
      }
      return total;
    },

    _logFile: logFile,
  };
}
