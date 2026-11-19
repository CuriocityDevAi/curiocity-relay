// scripts/lib/ci-suspect.mjs · M0-1119-I — suspect_done "기록만" 로직.
//
// 조건 (전부 참):
//   1) hub 의 최신 claim.state === 'started'
//   2) /tmp/<ID>-report.md 존재
//   3) claim.at 로부터 THRESHOLD_MS(15분) 이상 경과 · 그 사이 done claim 없음
//
// 결과: { since } 만 반환. tmux 조작/프롬프트 입력/busy 조작/blocked 승격 전부 안 함.
//
// deps 는 전부 주입(테스트 가능). 기본 구현은 fs.existsSync 로 /tmp 파일만 확인.

import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const SUSPECT_DONE_THRESHOLD_MS = 15 * 60_000;
export const SUSPECT_DONE_TMP_DIR = '/tmp';

export function computeSuspectDone({
  hubs,              // ['m0','m1', ...]
  latestClaim,       // (hub) => claim | null
  reportExists = defaultReportExists,
  now = Date.now(),
  thresholdMs = SUSPECT_DONE_THRESHOLD_MS,
} = {}) {
  const out = {};
  if (!Array.isArray(hubs)) return out;
  for (const hub of hubs) {
    const claim = latestClaim(hub);
    if (!claim) continue;
    const state = String(claim.state || '').toLowerCase();
    if (state !== 'started') continue;
    const id = claim.id || claim.prompt_id;
    if (!id) continue;
    if (!reportExists(id)) continue;
    const startedAt = claim.at ? new Date(claim.at).getTime() : null;
    if (!startedAt || Number.isNaN(startedAt)) continue;
    if (now - startedAt < thresholdMs) continue;
    out[hub] = { since: new Date(startedAt).toISOString(), id };
  }
  return out;
}

function defaultReportExists(id) {
  return existsSync(join(SUSPECT_DONE_TMP_DIR, `${id}-report.md`));
}
