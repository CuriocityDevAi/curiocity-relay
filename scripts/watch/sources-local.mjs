// scripts/watch/sources-local.mjs  ci-watch v2.0 · 로컬 데이터 수집기
// 원칙: 이 모듈은 GitHub 호출을 하지 않는다.
// 출처:
//   - relay clone (REPO_ROOT): queue/·m*/·r0/·status/claims/·status/runners/all.json·status/ci/<date>.jsonl
//   - ~/.hub-runner/reports/<hub>/<id>/report.md (M1-1124-P 리포트 경로 형식)
//   - status/pipeline/<id>.jsonl (R8 이후) — 없으면 빈 어댑터.
//
// 추측 금지: 이 파일은 "ID → 상태" 를 로컬 사실만으로 조합한다.
// GitHub 조회가 필요한 경우(이상 감지)는 pipeline-view.mjs 에서 결정.

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const QUEUE_HUBS = ['m0', 'm1', 'm2', 'm3', 'r0'];
const PROMPT_ID_RE = /^([MRTNK]\d-\d{4}-[A-Z]+)$/;

export function extractHubFromId(id) {
  const m = String(id || '').match(/^([A-Za-z])(\d)/);
  if (!m) return null;
  return m[1].toLowerCase() + m[2];
}

/**
 * 로컬 데이터 경로 계산.
 * @param {string} repoRoot relay git clone 루트
 */
export function resolvePaths(repoRoot) {
  return {
    repoRoot,
    queueRoot:   join(repoRoot, 'queue'),
    claimsDir:   join(repoRoot, 'status', 'claims'),
    runnersAll:  join(repoRoot, 'status', 'runners', 'all.json'),
    runnersDir:  join(repoRoot, 'status', 'runners'),
    ciJsonlDir:  join(repoRoot, 'status', 'ci'),
    pipelineDir: join(repoRoot, 'status', 'pipeline'),
    reportsHome: join(homedir(), '.hub-runner', 'reports'),
  };
}

function safeReadJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; }
}

function readJsonlSafe(path) {
  if (!existsSync(path)) return [];
  try {
    return readFileSync(path, 'utf8')
      .split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

export function readAllJson(paths) {
  return safeReadJson(paths.runnersAll);
}

/**
 * 큐 디렉터리 스캔.
 * @returns {Array<{id, hub, filePath, mtimeMs}>}
 */
export function scanQueueFiles(paths) {
  const out = [];
  for (const hub of QUEUE_HUBS) {
    const hubDir = join(paths.queueRoot, hub);
    if (!existsSync(hubDir)) continue;
    let files; try { files = readdirSync(hubDir); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.md')) continue;
      if (f.endsWith('-report.md') || f.endsWith('-selftest.md')) continue;
      const id = f.replace(/\.md$/, '');
      if (!PROMPT_ID_RE.test(id)) continue;
      let mtimeMs = 0;
      try { mtimeMs = statSync(join(hubDir, f)).mtimeMs; } catch {}
      out.push({ id, hub, filePath: join(hubDir, f), mtimeMs });
    }
  }
  return out;
}

export function readClaim(paths, id) {
  return safeReadJson(join(paths.claimsDir, `${id}.json`));
}

/**
 * 리포트 파일 경로 후보를 확인해 첫 일치를 반환.
 * - ~/.hub-runner/reports/<hub>/<id>/report.md  (M1-1124-P 형식)
 * - <repo>/<hub>/<id>-report.md                (기존 레거시 경로)
 */
export function findReportFile(paths, hub, id) {
  const candidates = [
    { path: join(paths.reportsHome, hub, id, 'report.md'),      kind: 'home' },
    { path: join(paths.repoRoot,  hub,  `${id}-report.md`),     kind: 'repo' },
  ];
  for (const c of candidates) {
    if (existsSync(c.path)) {
      let mtimeMs = 0;
      try { mtimeMs = statSync(c.path).mtimeMs; } catch {}
      return { ...c, mtimeMs };
    }
  }
  return null;
}

/**
 * 리포트 본문에서 PR URL 추출 (첫 매치).
 * 반환: { url, owner, repo, number } — owner/repo 는 URL 에서 추출.
 */
export function extractPrUrl(reportPath) {
  if (!reportPath || !existsSync(reportPath)) return null;
  try {
    const body = readFileSync(reportPath, 'utf8');
    const m = body.match(/https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)/);
    if (!m) return null;
    return { url: m[0], owner: m[1], repo: m[2], number: Number(m[3]) };
  } catch { return null; }
}

/**
 * 리포트 첫 줄 (APPROVE/CHANGES/PASS/FAIL 등) 추출.
 */
export function readReportFirstLine(reportPath) {
  if (!reportPath || !existsSync(reportPath)) return null;
  try {
    const body = readFileSync(reportPath, 'utf8');
    return (body.split('\n', 1)[0] || '').trim();
  } catch { return null; }
}

// 일반적인 섹션 헤딩 — 제목으로 사용하면 의미 없음.
const GENERIC_HEADINGS = new Set([
  '요약', '결과', '개요', '내용', '변경사항', '성능', '테스트', '작업', '완료',
  '현황', '경과', '분석', '검토', '리뷰', '수정', '배포', '확인', '구현', '문제',
  'summary', 'results', 'overview', 'changes', 'notes',
]);

/**
 * 리포트 본문에서 한 줄 제목 뽑기 — 첫 "# 제목" (일반 헤딩 건너뜀).
 * - `# 요약` 같은 일반 헤딩은 건너뛰고 다음 의미 있는 `#` 헤딩을 사용.
 * - `#` 헤딩이 없으면 첫 비-상태코드·비-헤딩 줄.
 */
export function extractReportTitle(reportPath) {
  if (!reportPath || !existsSync(reportPath)) return null;
  try {
    const body = readFileSync(reportPath, 'utf8');
    const lines = body.split('\n').slice(0, 40);
    for (const l of lines) {
      const s = l.trim();
      if (s.startsWith('#')) {
        const text = s.replace(/^#+\s*/, '').trim();
        if (text && !GENERIC_HEADINGS.has(text.toLowerCase()) && text.length >= 3) return text;
        continue; // 일반 헤딩 건너뜀
      }
    }
    for (const l of lines) {
      const s = l.trim();
      if (s && !/^(PASS|FAIL|APPROVE|CHANGES|SPEC|PLAN)\b/.test(s)
          && !s.startsWith('#') && s.length < 120) return s;
    }
  } catch {}
  return null;
}

const _ID_RE = /^[MRTNK]\d-\d{4}-[A-Z]+$/;

/**
 * 큐 파일 1줄 제목.
 * 우선순위: ① 원장 대사: 줄 ② [REQ] 첫 문장 ③ 첫 비-ID 비공란 줄.
 */
export function readQueueTitle(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  try {
    const body = readFileSync(filePath, 'utf8');
    const lines = body.split('\n');
    // ① 원장 대사: (첫 10 줄)
    for (const l of lines.slice(0, 10)) {
      const s = l.trim();
      if (s.startsWith('원장 대사:')) {
        const rest = s.slice('원장 대사:'.length).trim();
        const quoted = rest.match(/"([^"]{4,80})"/);
        if (quoted) return quoted[1];
        const seg = rest.replace(/—.*$/, '').replace(/·.*$/, '').trim();
        if (seg.length >= 4) return seg.slice(0, 80);
      }
    }
    // ② [REQ] 첫 문장
    let inReq = false;
    for (const l of lines) {
      const s = l.trim();
      if (s === '[REQ]') { inReq = true; continue; }
      if (inReq) {
        if (s.startsWith('[') && s !== '[REQ]') break;
        if (!s || s.startsWith('-') || s.startsWith('*')) continue;
        const sentence = s.split(/[。.]/)[0].trim();
        if (sentence.length >= 4) return sentence.slice(0, 80);
      }
    }
    // ③ 첫 비-ID 비공란 줄
    for (const l of lines.slice(0, 10)) {
      const s = l.trim();
      if (s && !_ID_RE.test(s) && s.length >= 4) return s.slice(0, 80);
    }
    return null;
  } catch { return null; }
}

/**
 * status/pipeline/<id>.jsonl 어댑터 (R8 이후).
 * 지금은 파일이 없으면 빈 배열을 반환해 호출부가 로컬 예측으로 전환.
 */
export function readPipelineEvents(paths, id) {
  return readJsonlSafe(join(paths.pipelineDir, `${id}.jsonl`));
}

/**
 * status/ci/<date>.jsonl 어댑터 — pr/head_branch 로 prompt ID 매칭 가능 레코드만.
 */
export function readCiJsonl(paths, dateStr) {
  return readJsonlSafe(join(paths.ciJsonlDir, `${dateStr}.jsonl`));
}

/**
 * R0 리뷰 리포트 스캔 — r0/<id>-report.md 첫 줄로 상태 (APPROVE/CHANGES).
 * 반환: Map<targetPromptId, {reviewerId, firstLine, mtimeMs}>
 *   targetPromptId 는 r0 리포트 본문에서 추출 (예: "M0-1124-H 수정분").
 */
export function scanR0Reviews(paths) {
  const r0Dir = join(paths.repoRoot, 'r0');
  const out = new Map();
  if (!existsSync(r0Dir)) return out;
  let files; try { files = readdirSync(r0Dir); } catch { return out; }
  for (const f of files) {
    if (!f.endsWith('-report.md')) continue;
    const reviewerId = f.replace(/-report\.md$/, '');
    if (!PROMPT_ID_RE.test(reviewerId)) continue;
    const p = join(r0Dir, f);
    let mtimeMs = 0; try { mtimeMs = statSync(p).mtimeMs; } catch {}
    try {
      const body = readFileSync(p, 'utf8');
      const firstLine = (body.split('\n', 1)[0] || '').trim();
      // target prompt ID: 첫 본문 라인 몇 줄에서 M?-????-? 패턴
      const head = body.split('\n').slice(0, 10).join('\n');
      const m = head.match(/\b([MRTNK]\d-\d{4}-[A-Z]+)\b/g) || [];
      const target = m.find(x => x !== reviewerId) || null;
      if (target) {
        const prior = out.get(target);
        if (!prior || mtimeMs > prior.mtimeMs) {
          out.set(target, { reviewerId, firstLine, mtimeMs });
        }
      }
    } catch {}
  }
  return out;
}

/**
 * ~/.hub-runner/reports/<hub>/ 아래 최근 리포트 디렉터리 스캔.
 * R8 이벤트가 없을 때 PR/CI/머지 칸 추측용 로컬 신호원.
 */
export function scanRecentReports(paths, { maxAgeMs = 24 * 3600_000, nowMs = Date.now() } = {}) {
  const out = [];
  const now = nowMs;
  for (const hub of QUEUE_HUBS) {
    const hubDir = join(paths.reportsHome, hub);
    if (!existsSync(hubDir)) continue;
    let entries; try { entries = readdirSync(hubDir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const id = e.name;
      if (!PROMPT_ID_RE.test(id)) continue;
      const rpt = join(hubDir, id, 'report.md');
      if (!existsSync(rpt)) continue;
      let mtimeMs = 0; try { mtimeMs = statSync(rpt).mtimeMs; } catch {}
      if (now - mtimeMs > maxAgeMs) continue;
      out.push({ id, hub, path: rpt, mtimeMs });
    }
    // 레거시: <repo>/<hub>/<id>-report.md
    const legacyHub = join(paths.repoRoot, hub);
    if (existsSync(legacyHub)) {
      let files; try { files = readdirSync(legacyHub); } catch { files = []; }
      for (const f of files) {
        if (!f.endsWith('-report.md')) continue;
        const id = f.replace(/-report\.md$/, '');
        if (!PROMPT_ID_RE.test(id)) continue;
        const p = join(legacyHub, f);
        let mtimeMs = 0; try { mtimeMs = statSync(p).mtimeMs; } catch {}
        if (now - mtimeMs > maxAgeMs) continue;
        out.push({ id, hub, path: p, mtimeMs });
      }
    }
  }
  // 최근 것 우선
  out.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return out;
}

/**
 * 오늘 날짜 WIB 문자열.
 */
export function getWibDateStr(now = new Date()) {
  const wib = new Date(now.getTime() + 7 * 3600_000);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wib.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export { QUEUE_HUBS, PROMPT_ID_RE };
