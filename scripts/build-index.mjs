#!/usr/bin/env node
// K0-0914-AR-A · relay build-index · prompts/<hub>/*.md + <hub>/*-report.md frontmatter 집계.
// K1-0914-A · checks/<hub>/<ID>.md (Kyu 실기 항목 파일) 집계 편입 · schema_version 2 · v1 호환.
// K1-0916-B · requirements[] + events[] 집계 · schema_version 3 · v1/v2 호환.
//
// K1-0916-B/C 정본 (Kyu 회신):
//   - ledger/requirements.yaml → index.json.requirements[] (각 항목 trace5 + age_days)
//   - events/<hub>/<date>.ndjson → index.json.events[] (배치 집계 · 최근 30일)
//   - reports frontmatter ledger_events + 세션 이벤트 대조 = mismatch 이벤트
//   - prompts req_ids 필수 · 부재 = warnings 편입
//
// 뿌리 (Kyu 원문 09-14 정본):
//   포털 프로덕션 = GitHub API 디렉터리 listing 의존 = GITHUB_TOKEN secret 부재 시 fail ·
//   비인증 60/h rate limit · 예외 삼킴. 정본 = relay push 시 이 스크립트가 index.json 생성 ·
//   포털은 raw.githubusercontent 에서 1회 fetch (무제한 · 무인증).
//
// 실행 = `.github/workflows/build-index.yml` (main push 트리거) 또는 로컬 (`node scripts/build-index.mjs`).
// 출력 = `index.json` (repo 루트) · frontmatter 집계 · schema_version 2.
//
// checks 규약 (K1-0914-A 정본 · Kyu K1-0914-B 회신):
//   - `checks/<hub>/<ID>.md` = Kyu 실기 항목 파일 (판정 상태 원장 아님 · 상태는 D1 case_state 정본)
//   - frontmatter: id · hub · pr · issued_at · author
//   - items[] = 각 원소 = JSON 문자열 (필드: device · title · ok · ng · est_min · deep_link?)
//   - relay checks = Kyu 실기 항목 · GitHub Checks API = kyu-gate 도장 (정본 분리)

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

const HUBS = ['k0', 'n0', 't0', 'm0', 'k1'];

/**
 * YAML frontmatter 관대 파서 (test-portal src/lib/relay.ts 정합 · 라이브러리 의존 회피).
 */
function parseFrontmatter(source) {
	const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
	if (!match) return null;
	const raw = match[1];
	const out = {};
	let currentListKey = null;
	for (const rawLine of raw.split('\n')) {
		const line = rawLine.trimEnd();
		if (line.length === 0) continue;
		if (currentListKey !== null && line.startsWith('  - ')) {
			const item = line.slice(4).trim();
			out[currentListKey].push(stripQuotes(item));
			continue;
		}
		const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
		if (!kv) continue;
		const [, key, value] = kv;
		if (value === '' || value === undefined) {
			out[key] = [];
			currentListKey = key;
			continue;
		}
		currentListKey = null;
		out[key] = stripQuotes(value.trim());
	}
	return out;
}
function stripQuotes(v) {
	if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
		return v.slice(1, -1);
	}
	return v;
}

function extractSummary(body) {
	const withoutFm = body.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
	const m = withoutFm.match(/^##\s*요지\s*\n+([^\n]+)/m);
	return m ? m[1].trim() : '';
}

async function safeReaddir(path) {
	try {
		return await readdir(path);
	} catch {
		return [];
	}
}
async function fileExists(path) {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

async function collectPrompts() {
	const out = [];
	for (const hub of HUBS) {
		const hubDir = resolve(REPO_ROOT, 'prompts', hub);
		if (!(await fileExists(hubDir))) continue;
		const files = await safeReaddir(hubDir);
		for (const name of files) {
			if (!name.endsWith('.md') || name === 'README.md') continue;
			const path = `prompts/${hub}/${name}`;
			const src = await readFile(resolve(REPO_ROOT, path), 'utf8');
			const fm = parseFrontmatter(src);
			if (!fm || typeof fm.id !== 'string' || typeof fm.hub !== 'string') continue;
			const status = fm.status;
			if (status !== 'pending' && status !== 'dispatched' && status !== 'landed') continue;
			// K1-0916-B/C · req_ids (A4 · 필수 · 부재 = warning)
			const req_ids = Array.isArray(fm.req_ids)
				? fm.req_ids.filter((v) => typeof v === 'string' && /^R\d+$/.test(v))
				: [];
			out.push({
				path,
				id: fm.id,
				hub: fm.hub,
				issued_at: typeof fm.issued_at === 'string' ? fm.issued_at : '',
				status,
				req_ids,
				summary: extractSummary(src)
			});
		}
	}
	return out;
}

async function collectReports() {
	const out = [];
	for (const hub of HUBS) {
		const hubDir = resolve(REPO_ROOT, hub);
		if (!(await fileExists(hubDir))) continue;
		const files = await safeReaddir(hubDir);
		for (const name of files) {
			if (!name.endsWith('-report.md')) continue;
			const path = `${hub}/${name}`;
			const src = await readFile(resolve(REPO_ROOT, path), 'utf8');
			const fm = parseFrontmatter(src);
			if (!fm || typeof fm.round !== 'string' || typeof fm.pr !== 'string') continue;
			const kyu_checks = Array.isArray(fm.kyu_checks)
				? fm.kyu_checks.filter((v) => typeof v === 'string')
				: [];
			// K1-0916-B · ledger_events (frontmatter 안 JSON 문자열 배열)
			const rawLedger = Array.isArray(fm.ledger_events) ? fm.ledger_events : [];
			const ledger_events = [];
			for (const raw of rawLedger) {
				if (typeof raw !== 'string') continue;
				try {
					const obj = JSON.parse(raw);
					if (obj && typeof obj === 'object') ledger_events.push(obj);
				} catch {
					// parse 실패 · skip
				}
			}
			out.push({
				path,
				round: fm.round,
				pr: fm.pr,
				outcome: typeof fm.outcome === 'string' ? fm.outcome : '',
				kyu_checks,
				ledger_events
			});
		}
	}
	return out;
}

/**
 * K1-0916-B/C · K1-0916-D · YAML requirements.yaml parser (deps 0).
 * K1-0916-D 확장 = conflict_with (스칼라/comma 배열 정합) · blocked_by · next boolean · size.
 */
function parseRequirementsYaml(src) {
	const items = [];
	const blockRegex = /^- id: (R\d+)\n([\s\S]*?)(?=\n- id:|\n\n[A-Z#]|\Z)/gm;
	let m;
	while ((m = blockRegex.exec(src)) !== null) {
		const id = m[1];
		const body = m[2];
		const item = { id };
		for (const line of body.split('\n')) {
			const kv = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
			if (!kv) continue;
			const [, k, v] = kv;
			const val = v.trim().replace(/^["']|["']$/g, '');
			if (!val) continue;
			if (k === 'repeat_count') item[k] = parseInt(val, 10);
			else if (k === 'next') item[k] = val === 'true';
			else if (k === 'conflict_with') {
				// K1-0916-D · 스칼라 (R012) 또는 comma 배열 (R012, R013) 정합
				item[k] = val.split(',').map((s) => s.trim()).filter(Boolean);
			} else item[k] = val;
		}
		items.push(item);
	}
	return items;
}

/**
 * K1-0916-D · requirement status → K0 5열 mapping (src/lib/ui/flow-data.ts 정합).
 * filed→waiting · issued→implementing · landed→drilling · verified/done→merged.
 */
function statusToColumn(status) {
	switch (status) {
		case 'filed': return 'waiting';
		case 'issued': return 'implementing';
		case 'landed': return 'drilling';
		case 'verified': return 'merged';
		case 'done': return 'merged';
		default: return 'waiting';
	}
}

/**
 * K1-0916-B/C · collectRequirements = requirements.yaml + events[] 합류 + trace5 + age_days.
 * @param {any[]} events
 */
async function collectRequirements(events) {
	const path = resolve(REPO_ROOT, 'ledger', 'requirements.yaml');
	if (!(await fileExists(path))) return [];
	const src = await readFile(path, 'utf8');
	const items = parseRequirementsYaml(src);
	const now = new Date();
	return items.map((r) => {
		// age_days = today - filed_at
		let age_days = null;
		if (r.filed_at) {
			const filed = new Date(r.filed_at);
			if (!isNaN(filed.getTime())) {
				age_days = Math.floor((now.getTime() - filed.getTime()) / (24 * 60 * 60 * 1000));
			}
		}
		// trace5 (K1-0916-C 정본) · 각 = {seen: bool, last_ts: string}
		// read = 원장/EPIC-STATE 읽음 (같은 hub 안 read 이벤트 존재)
		// reconcile = /docs 대조 (tracking/state read or reconcile 이벤트)
		// priority = 우선순위 변경 이력 (priority 이벤트)
		// issued = issued_id 존재 or dispatch 이벤트
		// landed = report-push 이벤트 · status=landed/verified
		const hubEvents = events.filter((e) => e.hub === r.hub);
		function lastOf(pred) {
			const matches = hubEvents.filter(pred).map((e) => e.ts).sort();
			return matches.length > 0 ? matches[matches.length - 1] : null;
		}
		const readTs = lastOf((e) => e.type === 'read');
		const reconcileTs = lastOf((e) => e.type === 'reconcile');
		const priorityTs = lastOf((e) => e.type === 'priority');
		const issuedTs = lastOf((e) => e.type === 'dispatch' || e.type === 'consume') || (r.issued_id ? r.filed_at ?? null : null);
		const landedTs = lastOf((e) => e.type === 'report-push') || (['landed', 'verified', 'done'].includes(r.status) ? r.filed_at ?? null : null);
		return {
			id: r.id,
			text: r.text ?? '',
			title: r.text ?? '', // K0 FlowRequirement.title = 원문 첫 줄 (별칭 · K0 소비 정본)
			project: r.project ?? '',
			project_slug: r.project ?? null,
			hub: r.hub ?? '',
			priority: r.priority ?? '',
			size: r.size ?? '',
			status: r.status ?? '',
			column: statusToColumn(r.status), // K1-0916-D · K0 5열 mapping
			issued_id: r.issued_id ?? null,
			issue_id: r.issued_id ?? null, // K0 alias
			repeat_count: r.repeat_count ?? 0,
			filed_at: r.filed_at ?? null,
			age_days,
			// K1-0916-D · yaml 확장 필드 (K0 소비 계약)
			next: r.next === true,
			conflict_with: Array.isArray(r.conflict_with) ? r.conflict_with : [],
			blocked_by: r.blocked_by ?? null,
			trace5: {
				read: { seen: !!readTs, last_ts: readTs },
				reconcile: { seen: !!reconcileTs, last_ts: reconcileTs },
				priority: { seen: !!priorityTs, last_ts: priorityTs },
				issued: { seen: !!issuedTs, last_ts: issuedTs },
				landed: { seen: !!landedTs, last_ts: landedTs }
			},
			note: r.note ?? ''
		};
	});
}

/**
 * K1-0916-B/C · collectEvents = events/<hub>/*.ndjson 통합 (최근 30일).
 */
async function collectEvents() {
	const eventsDir = resolve(REPO_ROOT, 'events');
	if (!(await fileExists(eventsDir))) return [];
	const out = [];
	const now = Date.now();
	const cutoff = now - 30 * 24 * 60 * 60 * 1000; // 30일
	for (const hub of HUBS) {
		const hubDir = resolve(eventsDir, hub);
		if (!(await fileExists(hubDir))) continue;
		const files = await safeReaddir(hubDir);
		for (const f of files) {
			if (!f.endsWith('.ndjson')) continue;
			const src = await readFile(resolve(hubDir, f), 'utf8');
			for (const line of src.split('\n')) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				try {
					const e = JSON.parse(trimmed);
					const t = new Date(e.ts).getTime();
					if (!isNaN(t) && t >= cutoff) out.push(e);
				} catch {
					// skip bad line
				}
			}
		}
	}
	return out;
}

/**
 * K1-0916-B/C · mismatch 감지 (report ledger_events vs 실 세션 이벤트).
 * (a) session 매칭 부재 · (b) R-id 원장 부재 · window = 해당 session 전체.
 */
function detectMismatches(reports, events, requirements) {
	const rIds = new Set(requirements.map((r) => r.id));
	const mismatches = [];
	for (const rp of reports) {
		for (const le of rp.ledger_events ?? []) {
			if (!le || !le.id) continue;
			// (b) R-id 원장 부재
			if (!rIds.has(le.id)) {
				mismatches.push({
					type: 'mismatch',
					report: rp.path,
					reason: 'R-id not in ledger',
					id: le.id,
					action: le.action ?? '?'
				});
				continue;
			}
			// (a) session 매칭 부재 (report action=reconcile 인데 세션에 reconcile/read 이벤트 부재)
			if (le.action === 'reconcile') {
				const found = events.find(
					(e) => e.type === 'reconcile' || (e.type === 'read' && (e.target ?? '').includes('requirements.yaml'))
				);
				if (!found) {
					mismatches.push({
						type: 'mismatch',
						report: rp.path,
						reason: 'reconcile action without matching read/reconcile event',
						id: le.id,
						action: le.action
					});
				}
			}
		}
	}
	return mismatches;
}

/**
 * K1-0917-B · collectFeatureMaps · R030 정본.
 * 각 리포 main branch 의 docs/feature-map.yaml 을 GitHub API 로 fetch → index.json.feature_maps[].
 * StorePort/agilo-fork = storeport 리포 파일 안 fork: 접두 처리 (convention.md § 파일 위치).
 *
 * 열린 PR files 매칭 (building 계산) = 포털 측 소비 · build-index 는 파일 패턴만 전달.
 * schema = docs/feature-map-convention.md.
 *
 * @param {string} ghToken - GH_TOKEN (build-index.yml workflow 에서 secrets.GITHUB_TOKEN 소비)
 */
async function collectFeatureMaps(ghToken) {
	const REPOS = [
		'CuriocityDevAi/test-portal',
		'CuriocityDevAi/todoboss',
		'CuriocityDevAi/grownest',
		'CuriocityDevAi/storeport'
		// agilo-medusa-pos-fork = storeport 리포 fork: 접두 파일 소비 (별건 fetch 안 함)
	];
	const out = [];
	// K1-0917-C · PRIVATE 리포 지원 = API contents 소비 (raw.githubusercontent 는 PRIVATE 404).
	// - Accept: raw → 응답 body = 파일 원문 (base64 아님)
	// - Authorization: Bearer <token> · 토큰이 리포 read 권한 있어야 함
	// - Actions default GITHUB_TOKEN 은 current 리포 (curiocity-relay) 만 접근 · 다른 CuriocityDevAi 리포는 별건 PAT (CROSS_REPO_READ_TOKEN 신설) 필요
	// K1-0917-B 초기 raw URL 소비 = 404 (test-portal PRIVATE) · 이 라운드 정정.
	const headers = {
		'User-Agent': 'curiocity-relay-build-index/1.0',
		Accept: 'application/vnd.github.raw',
		'X-GitHub-Api-Version': '2022-11-28'
	};
	if (ghToken) headers.Authorization = `Bearer ${ghToken}`;
	for (const repo of REPOS) {
		const url = `https://api.github.com/repos/${repo}/contents/docs/feature-map.yaml?ref=main`;
		try {
			const res = await fetch(url, { headers });
			if (!res.ok) {
				console.log(`[feature-maps] skip ${repo}: HTTP ${res.status}`);
				continue;
			}
			const yamlText = await res.text();
			// 관대 파서 (라이브러리 의존 회피 · build-index.mjs 정합)
			const parsed = parseFeatureMapYaml(yamlText);
			if (!parsed) {
				console.warn(`[feature-maps] parse fail ${repo}: null result`);
				continue;
			}
			// K1-0917-C · project 필드 부재 = repo slug 파생 (todoboss/storeport 실 스키마 정합).
			const projectSlug = parsed.project ?? repo.split('/').pop();
			// K1-0917-C · 실 스키마 (todoboss/storeport) = top-level processes[] + area FK. convention.md v1 = nested. 두 방식 모두 정합 (area 병합 pass).
			out.push({
				repo,
				project: projectSlug,
				version: parsed.version ?? 1,
				areas: parsed.areas ?? [],
				processes: parsed.processes ?? [], // K1-0917-C · top-level processes[] 지원
				fetched_at: new Date().toISOString()
			});
		} catch (err) {
			console.warn(`[feature-maps] fetch fail ${repo}:`, err instanceof Error ? err.message : String(err));
		}
	}
	return out;
}

/**
 * feature-map.yaml 관대 파서 (project · version · areas[].processes[].files[]).
 * 라이브러리 의존 회피 (relay = deps 0 원칙).
 */
function parseFeatureMapYaml(text) {
	// K1-0917-D · 3 스키마 정합 (nested + top-level + processes 안 area):
	//   (a) convention.md v1 = areas[].processes[] · nested (test-portal)
	//   (b) 실 리포 (todoboss/storeport) = top-level processes[] with `area:` FK
	//   (c) 혼합: top-level areas[] + top-level processes[] 병렬 (todoboss/storeport 정합)
	// 정본:
	//   - areas[] = 그대로 저장 (area 정의)
	//   - processes[] = FLATTEN · nested (test-portal) 는 area FK 자동 주입
	//   - K0 소비 정본 = processes[] 배열 (area 는 정의만)
	const lines = text.split('\n');
	const out = { areas: [], processes: [] };
	let currentContainer = null; // 'areas' | 'processes' | null
	let currentArea = null; // K1-0917-D · nested processes 안 area FK 자동 주입
	let currentEntry = null;
	let inFilesArray = false;
	let inAreaProcesses = false; // K1-0917-D · areas[].processes: nested 블록 안?
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		// top-level scalar (project · version · generated_at · round · etc)
		const topMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
		if (topMatch && !line.startsWith(' ')) {
			const [, k, v] = topMatch;
			inFilesArray = false;
			inAreaProcesses = false;
			currentEntry = null;
			currentArea = null;
			if (k === 'areas' || k === 'processes') {
				currentContainer = k;
				continue;
			}
			currentContainer = null;
			out[k] = stripQuotes(v.trim());
			continue;
		}

		// K1-0917-D · areas[] 안 nested `processes:` 감지 (4-space indent)
		if (currentArea && line.match(/^\s{4}processes:\s*$/)) {
			inAreaProcesses = true;
			inFilesArray = false;
			currentEntry = null;
			continue;
		}

		// K1-0917-D · nested process entry (6-space indent = area.processes[])
		if (inAreaProcesses && currentArea) {
			const nestedProcMatch = line.match(/^\s{6}-\s+id:\s*(.+)$/);
			if (nestedProcMatch) {
				currentEntry = {
					id: stripQuotes(nestedProcMatch[1].trim()),
					area: currentArea.id, // K1-0917-D · nested → top-level flatten · area FK 자동 주입
					files: []
				};
				out.processes.push(currentEntry);
				inFilesArray = false;
				continue;
			}
			// nested process 안 필드 (8-space indent) 는 아래 fieldMatch 로 처리 (currentEntry 유지)
		}

		// top-level entry ("  - id: ..." · 2-space indent) 안 areas or processes container
		const entryMatch = line.match(/^\s{2}-\s+id:\s*(.+)$/);
		if (entryMatch && currentContainer) {
			currentEntry = { id: stripQuotes(entryMatch[1].trim()) };
			if (currentContainer === 'areas') {
				currentArea = currentEntry;
				inAreaProcesses = false;
			} else if (currentContainer === 'processes') {
				currentEntry.files = [];
			}
			out[currentContainer].push(currentEntry);
			inFilesArray = false;
			continue;
		}

		// files array (processes 안 nested files · inline or multiline)
		if (currentEntry && line.match(/^\s{4,}files:\s*/)) {
			const inlineMatch = line.match(/files:\s*\[([^\]]*)\]/);
			if (inlineMatch) {
				currentEntry.files = inlineMatch[1].split(',').map((s) => stripQuotes(s.trim())).filter(Boolean);
				inFilesArray = false;
			} else {
				currentEntry.files = currentEntry.files ?? [];
				inFilesArray = true;
			}
			continue;
		}
		if (inFilesArray) {
			const fileItem = line.match(/^\s+-\s+(.+)$/);
			if (fileItem) {
				currentEntry.files.push(stripQuotes(fileItem[1].trim()));
				continue;
			}
			inFilesArray = false;
		}

		// entry 안 다른 필드 (area/label/name/summary/status/spec 등)
		const fieldMatch = line.match(/^\s+([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.+)$/);
		if (fieldMatch && currentEntry) {
			const [, k, v] = fieldMatch;
			if (k !== 'files' && k !== 'processes') currentEntry[k] = stripQuotes(v.trim());
		}
	}
	return out;
}

async function collectChecks() {
	const out = [];
	for (const hub of HUBS) {
		const hubDir = resolve(REPO_ROOT, 'checks', hub);
		if (!(await fileExists(hubDir))) continue;
		const files = await safeReaddir(hubDir);
		for (const name of files) {
			if (!name.endsWith('.md') || name === 'README.md') continue;
			const path = `checks/${hub}/${name}`;
			const src = await readFile(resolve(REPO_ROOT, path), 'utf8');
			const fm = parseFrontmatter(src);
			if (!fm || typeof fm.id !== 'string' || typeof fm.hub !== 'string') continue;
			// items[] = 각 원소 = JSON 문자열 · JSON.parse 후 object 로 저장 · 실패 시 원문 유지
			const rawItems = Array.isArray(fm.items) ? fm.items : [];
			const items = [];
			for (const raw of rawItems) {
				if (typeof raw !== 'string') continue;
				try {
					const obj = JSON.parse(raw);
					if (obj && typeof obj === 'object') items.push(obj);
				} catch {
					items.push({ _raw: raw, _parse_error: true });
				}
			}
			out.push({
				path,
				id: fm.id,
				hub: fm.hub,
				pr: typeof fm.pr === 'string' ? fm.pr : '',
				issued_at: typeof fm.issued_at === 'string' ? fm.issued_at : '',
				author: typeof fm.author === 'string' ? fm.author : '',
				items,
				summary: extractSummary(src)
			});
		}
	}
	return out;
}

async function main() {
	const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
	const prompts = await collectPrompts();
	const reports = await collectReports();
	const checks = await collectChecks();
	const events = await collectEvents();
	const requirements = await collectRequirements(events);
	// K1-0917-B · R030 · 각 리포 main docs/feature-map.yaml 집계 (파일 패턴 · areas)
	const featureMaps = await collectFeatureMaps(ghToken);
	// K1-0917-B · R011 · 허브별 최근 활동 요약 (last_action · files_touched · tests_touched · 최근 24h)
	const hubs = computeHubActivity(events);
	// K1-0916-B/C · prompts req_ids warnings (A4 · Kyu Q5)
	const warnings = [];
	for (const p of prompts) {
		if (!Array.isArray(p.req_ids) || p.req_ids.length === 0) {
			warnings.push({ type: 'prompt_missing_req_ids', path: p.path, id: p.id });
		}
	}
	const mismatches = detectMismatches(reports, events, requirements);
	// K1-0916-B/C · monthly rollup counters (A5)
	const filed_count = requirements.filter((r) => r.status === 'filed').length;
	const max_age_days = requirements
		.filter((r) => r.status === 'filed' && r.age_days !== null)
		.reduce((max, r) => Math.max(max, r.age_days), 0);
	const red_count = requirements.filter((r) => (r.repeat_count ?? 0) >= 2).length;
	const index = {
		schema_version: 4, // K1-0917-B · +hubs +feature_maps (v3 호환 · 기존 필드 유지)
		built_at: new Date().toISOString(),
		prompts,
		reports,
		checks,
		requirements,
		events,
		mismatches,
		warnings,
		hubs,
		feature_maps: featureMaps,
		rollup: { filed_count, max_age_days, red_count }
	};
	const outPath = resolve(REPO_ROOT, 'index.json');
	await writeFile(outPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
	console.log(
		`✓ index.json · prompts=${prompts.length} · reports=${reports.length} · checks=${checks.length}` +
			` · requirements=${requirements.length} · events=${events.length} · mismatches=${mismatches.length}` +
			` · warnings=${warnings.length} · hubs=${Object.keys(hubs).length}` +
			` · feature_maps=${featureMaps.length}` +
			` · rollup=(filed=${filed_count}, max_age=${max_age_days}d, 🔴=${red_count})`
	);
}

/**
 * K1-0917-B · R011 · 허브별 최근 24h 활동 집계.
 * flow-data.ts (K0 소비) 계약 = hubs[hub] = {last_action, files_touched, tests_touched, updated_at}.
 *
 * - last_action = 최근 report-push/inquiry-push/dispatch 이벤트 target basename (문장 요약)
 * - files_touched = 24h 안 유일 target 파일 수 (read/reconcile/dispatch/mismatch 포함 · 모든 tool_use 소비)
 * - tests_touched = files_touched 중 `.test.` 또는 `/test/` 경로 매치 수
 * - updated_at = 최근 event ts
 *
 * @param {any[]} events - collectEvents() 결과 (최근 30일)
 */
function computeHubActivity(events) {
	const HUBS_LIST = ['k0', 'k1', 'k2', 'n0', 't0', 'm0'];
	const nowMs = Date.now();
	const CUTOFF_MS = nowMs - 24 * 60 * 60 * 1000;
	const out = {};
	for (const hub of HUBS_LIST) {
		out[hub] = { last_action: null, files_touched: 0, tests_touched: 0, updated_at: null };
	}
	// 그룹핑
	const byHub = new Map();
	for (const e of events) {
		if (!e.hub || !e.ts) continue;
		const t = new Date(e.ts).getTime();
		if (isNaN(t) || t < CUTOFF_MS) continue;
		if (!byHub.has(e.hub)) byHub.set(e.hub, []);
		byHub.get(e.hub).push(e);
	}
	for (const [hub, evs] of byHub) {
		if (!out[hub]) out[hub] = { last_action: null, files_touched: 0, tests_touched: 0, updated_at: null };
		evs.sort((a, b) => a.ts.localeCompare(b.ts));
		// last_action = 최근 report-push/inquiry-push/dispatch 문장 (target basename)
		const meaningful = evs.filter((e) =>
			e.type === 'report-push' || e.type === 'inquiry-push' || e.type === 'dispatch' || e.type === 'priority'
		);
		const lastMeaningful = meaningful.length > 0 ? meaningful[meaningful.length - 1] : evs[evs.length - 1];
		if (lastMeaningful) {
			// K1-0917-C · event.label 우선 (문장화 계약 · Kyu 원문 정본) · 부재 시 fallback = "{kind}: {basename}"
			if (lastMeaningful.label) {
				out[hub].last_action = lastMeaningful.label;
			} else {
				const targetBase = (lastMeaningful.target || '').split('/').pop() || lastMeaningful.type;
				out[hub].last_action = `${labelForKind(lastMeaningful.type)}: ${targetBase}`;
			}
			out[hub].updated_at = lastMeaningful.ts;
		}
		// files_touched · tests_touched (유일 target 파일)
		const files = new Set();
		const tests = new Set();
		for (const e of evs) {
			const target = e.target || '';
			if (!target || !target.includes('/')) continue;
			files.add(target);
			if (target.includes('.test.') || target.includes('/test/') || target.includes('/tests/')) {
				tests.add(target);
			}
		}
		out[hub].files_touched = files.size;
		out[hub].tests_touched = tests.size;
	}
	return out;
}

function labelForKind(kind) {
	const map = {
		'report-push': '리포트',
		'inquiry-push': '심문',
		'dispatch': '태스크',
		'priority': '원장 편집',
		'read': '읽음',
		'reconcile': '대사',
		'mismatch': '불일치',
		'consume': '소비'
	};
	return map[kind] || kind;
}

main().catch((err) => {
	console.error('build-index 실패:', err);
	process.exit(1);
});
