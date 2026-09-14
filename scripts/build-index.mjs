#!/usr/bin/env node
// K0-0914-AR-A · relay build-index · prompts/<hub>/*.md + <hub>/*-report.md frontmatter 집계.
//
// 뿌리 (Kyu 원문 09-14 정본):
//   포털 프로덕션 = GitHub API 디렉터리 listing 의존 = GITHUB_TOKEN secret 부재 시 fail ·
//   비인증 60/h rate limit · 예외 삼킴. 정본 = relay push 시 이 스크립트가 index.json 생성 ·
//   포털은 raw.githubusercontent 에서 1회 fetch (무제한 · 무인증).
//
// 실행 = `.github/workflows/build-index.yml` (main push 트리거) 또는 로컬 (`node scripts/build-index.mjs`).
// 출력 = `index.json` (repo 루트) · frontmatter 집계 · schema_version 1.

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

const HUBS = ['k0', 'n0', 't0', 'm0'];

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
			out.push({
				path,
				id: fm.id,
				hub: fm.hub,
				issued_at: typeof fm.issued_at === 'string' ? fm.issued_at : '',
				status,
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
			out.push({
				path,
				round: fm.round,
				pr: fm.pr,
				outcome: typeof fm.outcome === 'string' ? fm.outcome : '',
				kyu_checks
			});
		}
	}
	return out;
}

async function main() {
	const prompts = await collectPrompts();
	const reports = await collectReports();
	const index = {
		schema_version: 1,
		built_at: new Date().toISOString(),
		prompts,
		reports
	};
	const outPath = resolve(REPO_ROOT, 'index.json');
	await writeFile(outPath, JSON.stringify(index, null, 2) + '\n', 'utf8');
	console.log(`✓ index.json · prompts=${prompts.length} · reports=${reports.length}`);
}

main().catch((err) => {
	console.error('build-index 실패:', err);
	process.exit(1);
});
