// scripts/test/ci-watch-w.test.mjs  M2-1125-W — --once sha @(unknown) 수정 테스트
// 커버:
//   W-sha-1: --once 실출력 머리줄에 @<7자리 sha> 가 origin/main 과 일치

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

test('W-sha-1: --once 머리줄 sha — git rev-parse origin/main 과 일치', () => {
  let expectedSha;
  try {
    expectedSha = execSync(`git -C "${REPO_ROOT}" rev-parse origin/main`, {
      encoding: 'utf8', timeout: 5_000,
    }).trim().slice(0, 7);
  } catch {
    // origin/main 없는 환경 — 테스트 불가
    return;
  }

  const scriptPath = fileURLToPath(new URL('../ci-watch-v2.mjs', import.meta.url));
  const env = { ...process.env, CI_WATCH_RELAY_ROOT: REPO_ROOT };
  const output = execSync(`node "${scriptPath}" --once --width=100`, {
    encoding: 'utf8',
    timeout: 15_000,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const lines = output.split('\n');
  // 머리 2줄 (첫줄=상태줄, 둘째줄=data origin sha) 중에 @sha 포함 여부 확인
  const header2 = lines.slice(0, 2).join('\n');

  assert.ok(
    header2.includes(`@${expectedSha}`),
    `머리 2줄에 @${expectedSha} 포함 (got: ${JSON.stringify(lines.slice(0, 2))})`,
  );
});
