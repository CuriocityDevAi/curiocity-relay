// scripts/test/hub-runner-install.test.mjs — install.sh write_plist 재발 방지 (M1-1105-BD)
//
// 뿌리: 장치 사건 11-12 13:12 — write_plist heredoc 이 `<<PLIST` (unquoted) 라서 XML 주석 안 백틱
//       `caffeinate -i` 가 명령 치환으로 실행 → 설치가 "node --check OK" 뒤 멈추고 caffeinate 가
//       무한 돌음. Kyu 가 `pkill -P <pid> caffeinate` 로 풀고 v7.2 가동 (pid 31237 · 06:14Z).
//
// 재발 방지:
//   T1. write_plist 를 임시 경로로 돌려 2 초 안에 끝남 (caffeinate 같은 서브프로세스 금지)
//   T2. 생성된 plist 가 plutil -lint 통과
//   T3. heredoc 바디(<<PLIST .. PLIST) 에 백틱·$( 없음 (grep 수준 정적 검사)
//   T4. ProcessType=Interactive 유지 (M1-1105-BA 수정 보존)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const INSTALL_SH = resolve(HERE, '..', 'hub-runner-install.sh');

function extractWritePlistBody() {
  const src = readFileSync(INSTALL_SH, 'utf8').split('\n');
  const lines = [];
  let inHeredoc = false;
  for (const l of src) {
    if (inHeredoc) {
      if (l === 'PLIST') { inHeredoc = false; continue; }
      lines.push(l);
    } else if (/cat > .* <<PLIST$/.test(l)) {
      inHeredoc = true;
    }
  }
  return lines.join('\n');
}

test('T1·T2 write_plist 가 2 초 안에 끝나고 생성 plist 가 plutil -lint 통과', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'plist-test-'));
  const plistFile = join(tmp, 'test.plist');
  // write_plist 함수만 뽑아 임시 스크립트로 실행 — install.sh 의 launchctl bootout 등 부수효과 금지.
  const srcLines = readFileSync(INSTALL_SH, 'utf8').split('\n');
  const startIdx = srcLines.findIndex((l) => /^write_plist\(\)/.test(l));
  let endIdx = startIdx;
  while (endIdx < srcLines.length && srcLines[endIdx] !== '}') endIdx++;
  const writePlistSrc = srcLines.slice(startIdx, endIdx + 1).join('\n');
  const runnerScript = [
    `LABEL='com.test.hub-runner'`,
    `PLIST_FILE='${plistFile}'`,
    `NODE_BIN='/usr/bin/false'`,
    `REPO_ROOT='${tmp}'`,
    `LOG_DIR='${tmp}/logs'`,
    `PATH_LINE='/usr/bin:/bin'`,
    writePlistSrc,
    `write_plist hub-runner-v7.2.mjs >/dev/null`,
  ].join('\n');
  const startedAt = Date.now();
  const res = spawnSync('bash', ['-c', runnerScript], {
    timeout: 2_000,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, HOME: tmp },
  });
  const elapsed = Date.now() - startedAt;
  assert.equal(res.status, 0, `write_plist bash status=${res.status} · stderr=${res.stderr?.toString()}`);
  assert.ok(elapsed < 2_000, `write_plist 2초 초과 (${elapsed}ms) · 명령치환(caffeinate 등) 의심`);
  // plutil -lint (Darwin 전용) — Linux CI 등에선 skip.
  const hasPlutil = spawnSync('which', ['plutil']).status === 0;
  if (hasPlutil) {
    const lint = spawnSync('plutil', ['-lint', plistFile], { stdio: ['ignore', 'pipe', 'pipe'] });
    assert.equal(lint.status, 0, `plutil -lint 실패 · stderr=${lint.stderr?.toString()} · stdout=${lint.stdout?.toString()}`);
  }
  rmSync(tmp, { recursive: true, force: true });
});

test('T3 heredoc 바디에 백틱·$( 없음 (정적 검사)', () => {
  const body = extractWritePlistBody();
  assert.ok(body.length > 0, 'write_plist heredoc 바디 추출 실패');
  const matches = [];
  body.split('\n').forEach((line, i) => {
    if (/`|\$\(/.test(line)) matches.push(`${i + 1}: ${line}`);
  });
  assert.equal(matches.length, 0, `heredoc 안 백틱/\$( 발견:\n${matches.join('\n')}`);
});

test('T4 heredoc 에 ProcessType=Interactive 유지 (M1-1105-BA)', () => {
  const body = extractWritePlistBody();
  assert.match(body, /<key>ProcessType<\/key>\s*\n\s*<string>Interactive<\/string>/);
  assert.match(body, /<key>LowPriorityIO<\/key>\s*\n\s*<false\/>/);
  assert.match(body, /<key>LegacyTimers<\/key>\s*\n\s*<true\/>/);
});

test('T5 다른 heredoc(<<NODE 등) 은 전부 quoted (<<\'NODE\')', () => {
  const src = readFileSync(INSTALL_SH, 'utf8');
  const heredocs = [...src.matchAll(/<<([A-Z_]+)\b/g)].map((m) => m[1]);
  // <<PLIST 는 변수 치환 필요라 unquoted · 재발 방지는 heredoc 바디 테스트(T3) 로 담당.
  for (const h of heredocs.filter((x) => x !== 'PLIST')) {
    const unquoted = new RegExp(`<<${h}\\b`);
    assert.ok(
      !unquoted.test(src) || new RegExp(`<<'${h}'`).test(src),
      `heredoc <<${h} 가 unquoted — <<'${h}' 로 바꿀 것`,
    );
  }
});
