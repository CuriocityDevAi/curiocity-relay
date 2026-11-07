#!/usr/bin/env node
// M1-1105-I · status/hubs.json 자동 등재 (수기 등재 제거)
//
// 뿌리 (방법론 ⑦ 결함):
//   외부 K1-0915-D 자동 쓰기 스크립트가 허브 목록을 상수 ['k0','k1','k2','n0','t0','m0'] 로 고정 →
//   hubs.json 리빌드마다 m1~m3 · r0 등 **스캔되지 않은 허브가 삭제**됨 (diff `-28/+8`).
//
// 정본 규약:
//   허브 디렉터리 = 리포 루트의 `/^([a-z])(\d+)$/` 매치 디렉터리 (k0/k1/k2/m0/m1/m2/m3/n0/t0/r0/...).
//   각 디렉터리의 가장 최신 `*-report.md` 를 읽어 frontmatter 집계 → hubs.json 에 등재.
//   기존 hubs.json 의 `state` · `session` · `work_dir` · `repo` · `branch` · `inquiry_files` · `ci_*` ·
//   그 외 주인 필드는 **보존** (스캔은 보조 데이터만 overwrite).
//
// 사용:
//   node scripts/build-hubs.mjs                 # status/hubs.json 갱신 (diff 가 없으면 touch 안 함)
//   node scripts/build-hubs.mjs --dry-run       # stdout 에 결과만 출력
//
// 관련: scripts/build-index.mjs (index.json 집계 · 독립)

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const HUBS_JSON = resolve(REPO_ROOT, 'status/hubs.json');
const HUB_DIR_RE = /^[a-z]\d+$/;

const DRY_RUN = process.argv.includes('--dry-run');

const log = (...xs) => console.error('[build-hubs]', ...xs);

// --- YAML frontmatter 관대 파서 (build-index.mjs 와 동형 · 라이브러리 의존 회피) ---
function parseFrontmatter(source) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return null;
  const raw = match[1];
  const out = {};
  let currentListKey = null;
  let currentObjKey = null;
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trimEnd();
    if (line.length === 0) continue;
    if (currentListKey !== null && line.startsWith('  - ')) {
      if (!Array.isArray(out[currentListKey])) out[currentListKey] = [];
      out[currentListKey].push(stripQuotes(line.slice(4).trim()));
      continue;
    }
    if (currentObjKey !== null && (line.startsWith('  ') || line.startsWith('\t'))) {
      const inner = line.trim().match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
      if (inner) {
        // 빈 배열로 초기화돼 있으면 (다음 줄이 `  - ` 가 아니라 `  key: val`) 오브젝트로 승격.
        if (Array.isArray(out[currentObjKey])) out[currentObjKey] = {};
        out[currentObjKey][inner[1]] = stripQuotes((inner[2] ?? '').trim());
      }
      continue;
    }
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === '' || value === undefined) {
      // 다음 라인이 `  - ` 면 리스트 · `  <key>: <val>` 면 오브젝트. 판별은 다음 라인에서.
      out[key] = [];
      currentListKey = key;
      currentObjKey = key;
      // 오브젝트로 승격될 수도 있으니 뒤에서 교체.
      continue;
    }
    currentListKey = null;
    currentObjKey = null;
    out[key] = stripQuotes(value.trim());
  }
  // 리스트로 두었다가 실제로 오브젝트 값만 들어온 경우 보정
  for (const [k, v] of Object.entries(out)) {
    if (Array.isArray(v) && v.length === 0) {
      // 뒤 로직에서 obj 로 재채워졌는지 확인 — parseFrontmatter 는 단순해서 둘 다 못 구분.
      // 호출부에서 fallback 처리.
    }
  }
  return out;
}

function stripQuotes(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

async function discoverHubs() {
  const entries = await readdir(REPO_ROOT, { withFileTypes: true });
  const hubs = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!HUB_DIR_RE.test(e.name)) continue;
    const hubDir = resolve(REPO_ROOT, e.name);
    const files = await readdir(hubDir);
    const reports = files.filter((f) => /-report\.md$/i.test(f));
    if (reports.length === 0 && e.name !== 'r0') {
      // 리포트가 아직 없어도 디렉터리는 존재하는 허브 (예: 신규 r0 placeholder) 는 등재.
      hubs.push({ id: e.name, reports: [] });
      continue;
    }
    hubs.push({ id: e.name, reports: reports.sort() });
  }
  hubs.sort((a, b) => a.id.localeCompare(b.id));
  return hubs;
}

function extractInquiryFiles(files) {
  return files.filter((f) => /-inquiry\.md$/i.test(f)).sort();
}

async function latestReportMeta(hub) {
  if (hub.reports.length === 0) return null;
  const latest = hub.reports[hub.reports.length - 1];
  const src = await readFile(resolve(REPO_ROOT, hub.id, latest), 'utf8');
  const fm = parseFrontmatter(src) ?? {};
  return { file: latest, fm };
}

function roundFromFilename(filename) {
  // ex: "M1-1105-H-report.md" → "M1-1105-H", "K0-0918-E-report.md" → "K0-0918-E"
  const m = filename.match(/^([A-Z]\d+-\d{4}-[A-Za-z0-9-]+?)-report\.md$/);
  return m ? m[1] : filename.replace(/-report\.md$/, '');
}

function derivePrLinks(fm) {
  // fm.pr 가 object 형태 ({ fork: '...#17', fork_url: 'https://...', storeport: '...' }) 기대.
  // parseFrontmatter 가 리스트로 잡아버리면 (빈 자식) fallback 으로 null 반환.
  const pr = fm.pr;
  if (pr && typeof pr === 'object' && !Array.isArray(pr)) {
    return {
      last_pr_fork: pr.fork_url ?? (pr.fork ? `https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/${String(pr.fork).split('#').pop()}` : null),
      last_pr_storeport: pr.storeport_url ?? null,
      last_commit: pr.fork_commit ?? null,
    };
  }
  return { last_pr_fork: null, last_pr_storeport: null, last_commit: null };
}

async function buildHubs() {
  const nowIso = new Date().toISOString();
  let existing = { schema_version: 1, built_at: nowIso, hubs: {} };
  try {
    existing = JSON.parse(await readFile(HUBS_JSON, 'utf8'));
  } catch {
    log('status/hubs.json 부재 · 신규 생성');
  }

  const discovered = await discoverHubs();
  const scannedIds = new Set(discovered.map((h) => h.id));

  const nextHubs = {};
  for (const hub of discovered) {
    const prior = existing.hubs?.[hub.id] ?? {};
    const latest = await latestReportMeta(hub);

    // 보조 데이터 (리포트 frontmatter 에서 derive)
    const derived = {};
    if (latest) {
      derived.last_round = typeof latest.fm.round === 'string' ? latest.fm.round : roundFromFilename(latest.file);
      derived.last_report = `${hub.id}/${latest.file}`;
      const prLinks = derivePrLinks(latest.fm);
      if (prLinks.last_pr_fork) derived.last_pr_fork = prLinks.last_pr_fork;
      if (prLinks.last_pr_storeport) derived.last_pr_storeport = prLinks.last_pr_storeport;
      if (prLinks.last_commit) derived.last_commit = prLinks.last_commit;
    }

    // k 허브: inquiry_files 집계
    const inquiryFiles = extractInquiryFiles(await readdir(resolve(REPO_ROOT, hub.id)));
    if (inquiryFiles.length > 0) {
      derived.inquiry_files = inquiryFiles;
    }

    // 머지 전략: 기존 필드 유지 + derived 가 새 값 제시한 경우 overwrite (주인 필드는 보존).
    // 주인 필드 (스캔으로 알 수 없음): state · session · work_dir · repo · branch · ci_run · ci_duration_s · open_prs_fork · last_round_kind
    const OWNER_PRESERVED_KEYS = [
      'state', 'session', 'work_dir', 'repo', 'branch',
      'ci_run', 'ci_duration_s', 'open_prs_fork', 'last_round_kind',
      'last_activity', 'updated_at',
      // M2-1105-O · hub-runner.mjs 가 참조. 수기 1회 세팅 후 build 가 보존.
      'cwd',
    ];

    const merged = { ...prior };
    for (const [k, v] of Object.entries(derived)) {
      // derived 값이 비어 있으면 prior 유지
      if (v === null || v === undefined) continue;
      merged[k] = v;
    }
    // owner-preserved 는 prior 가 있으면 유지 (derived 는 세팅 안 함)
    for (const k of OWNER_PRESERVED_KEYS) {
      if (k in prior) merged[k] = prior[k];
    }
    // state 기본값
    if (!('state' in merged)) merged.state = 'idle';
    if (!('last_activity' in merged)) merged.last_activity = null;
    if (!('updated_at' in merged)) merged.updated_at = nowIso;

    nextHubs[hub.id] = merged;
  }

  // M2-1105-N · status/claims/*.json 반영 → 허브별 current_round · state (started/blocked/done).
  // claims 는 override 성격 — 허브의 "지금 뭘 하고 있나" 를 raw state 로 보여줌.
  try {
    const claimsDir = resolve(REPO_ROOT, 'status/claims');
    const names = (await readdir(claimsDir)).filter((n) => n.endsWith('.json'));
    const perHubLatest = {};
    for (const name of names) {
      try {
        const raw = await readFile(resolve(claimsDir, name), 'utf8');
        const c = JSON.parse(raw);
        if (!c || !c.hub || !c.id || !c.state || !c.at) continue;
        const prev = perHubLatest[c.hub];
        if (!prev || c.at > prev.at) perHubLatest[c.hub] = c;
      } catch { /* skip invalid */ }
    }
    for (const [hubId, claim] of Object.entries(perHubLatest)) {
      if (!nextHubs[hubId]) continue; // claim 이 가리키는 허브 폴더가 아직 없으면 skip
      nextHubs[hubId].current_round = claim.id;
      nextHubs[hubId].current_state = claim.state;
      nextHubs[hubId].current_at = claim.at;
      if (claim.note) nextHubs[hubId].current_note = claim.note;
    }
  } catch {
    // status/claims 디렉터리가 없으면 pass
  }

  // 스캔되지 않은 기존 허브 (디렉터리가 사라졌거나 .md 가 없는 경우) 는 유지
  // (수기 데이터 보존 — 수기 삭제는 수동 커밋으로)
  for (const [id, data] of Object.entries(existing.hubs ?? {})) {
    if (!scannedIds.has(id)) {
      log(`유지 (스캔 못 함) · ${id}`);
      nextHubs[id] = data;
    }
  }

  const output = {
    schema_version: existing.schema_version ?? 1,
    built_at: nowIso,
    hubs: nextHubs,
  };

  const existingSerialized = JSON.stringify({ ...existing, built_at: null }, null, 2);
  const nextSerialized = JSON.stringify({ ...output, built_at: null }, null, 2);
  const changed = existingSerialized !== nextSerialized;

  return { output, changed, scanned: discovered.map((h) => h.id) };
}

(async () => {
  const { output, changed, scanned } = await buildHubs();
  log(`scanned hubs (${scanned.length}): ${scanned.join(', ')}`);
  if (DRY_RUN) {
    console.log(JSON.stringify(output, null, 2));
    log('--dry-run · 파일 쓰지 않음');
    process.exit(0);
  }
  if (!changed) {
    log('status/hubs.json unchanged · skip write');
    process.exit(0);
  }
  await writeFile(HUBS_JSON, JSON.stringify(output, null, 2) + '\n', 'utf8');
  log(`status/hubs.json rewritten (${scanned.length} hubs)`);
})();
