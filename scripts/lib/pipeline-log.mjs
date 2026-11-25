// scripts/lib/pipeline-log.mjs · M1-1125-E · v8.3.1
//
// 프롬프트 1개의 일생을 status/pipeline/<ID>.jsonl 에 이벤트로 기록한다.
// 이벤트 형식: { ts, id, hub, event, ...extra } (한 줄 JSON = NDJSON).
//
// 이벤트 종류:
//   queued   — 큐에서 선택됨 (pick 직후)
//   started  — claude 세션 시작 (클레임 started 발행 직후)
//   report   — 리포트 파일 확인 (done 처리 중 보고서 존재 확인)
//   artifact — PR URL 추출 성공 (pr_number · repo · head_sha)
//   done     — 완료
//   blocked  — 차단
//
// 설계 원칙:
//   - 기록 실패는 non-fatal (try/catch · 호출자 흐름 중단 없음).
//   - push 는 호출자가 git add 후 claim 커밋에 번들 — 이 모듈은 파일 쓰기만.
//   - 프롬프트당 1 파일 (Q2 권장안): status/pipeline/<ID>.jsonl.
//   - archiveOldPipelineLogs 는 함수만 제공 · 실행 스케줄은 별도.

import { appendFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export const PIPELINE_DIR = 'status/pipeline';

export function pipelineLogPath(repoRoot, id) {
  return join(repoRoot, PIPELINE_DIR, `${id}.jsonl`);
}

// JSONL 한 줄 추가. 실패 시 false 리턴 (예외 미전파).
export function appendPipelineEvent(repoRoot, id, hub, event, extra = {}) {
  try {
    const dir = join(repoRoot, PIPELINE_DIR);
    mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), id, hub, event, ...extra });
    appendFileSync(join(dir, `${id}.jsonl`), line + '\n');
    return true;
  } catch {
    return false;
  }
}

// 리포트 본문에서 첫 번째 GitHub PR URL 을 찾아 { repo, pr_number } 추출.
// head_sha 는 gh CLI 로 조회 (실패·없음 시 null). 전체가 non-fatal.
export function extractArtifactFromReport(reportText) {
  try {
    const m = reportText.match(/https:\/\/github\.com\/([\w.\-]+\/[\w.\-]+)\/pull\/(\d+)/);
    if (!m) return null;
    return { repo: m[1], pr_number: parseInt(m[2], 10) };
  } catch {
    return null;
  }
}

export function fetchPrHeadSha(repo, prNumber) {
  try {
    const r = spawnSync(
      'gh',
      ['pr', 'view', String(prNumber), '--repo', repo, '--json', 'headRefOid', '--jq', '.headRefOid'],
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 6000 },
    );
    if (r.status !== 0) return null;
    const sha = r.stdout?.toString().trim();
    return sha || null;
  } catch {
    return null;
  }
}

// 14일 지난 파일을 status/pipeline/archive/ 에 이동. 실행 스케줄은 호출자 담당.
export function archiveOldPipelineLogs(repoRoot) {
  try {
    const dir = join(repoRoot, PIPELINE_DIR);
    if (!existsSync(dir)) return { archived: 0 };
    const archiveDir = join(dir, 'archive');
    const cutoffMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
    let archived = 0;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.jsonl')) continue;
      const src = join(dir, name);
      try {
        const st = statSync(src);
        if (st.mtimeMs < cutoffMs) {
          mkdirSync(archiveDir, { recursive: true });
          renameSync(src, join(archiveDir, name));
          archived++;
        }
      } catch { /* noop */ }
    }
    return { archived };
  } catch {
    return { archived: 0 };
  }
}
