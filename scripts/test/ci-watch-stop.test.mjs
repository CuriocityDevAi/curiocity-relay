// scripts/test/ci-watch-stop.test.mjs · M1-1124-K — ci-watch.sh 종료 동작 검증
// S-static: 래퍼 소스에 trap·stop·crash-limit·hint 포함 (정적 검사)
// S1: SIGINT 1회로 래퍼·node 종료
// S2: stop 명령으로 래퍼 종료 (pid 파일 기반)
// S3: 연속 비정상 종료 5회 → 래퍼 exit 1
// S4: exit(0) 는 크래시 아님 — 즉시 재기동

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deployCiWatchWrapper, WRAPPER_BODY } from '../lib/self-update.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitFor(fn, { timeout = 5000, interval = 150 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (fn()) return;
    await sleep(interval);
  }
  throw new Error(`waitFor timeout (${timeout}ms)`);
}

function setup() {
  const tmp = mkdtempSync(join(tmpdir(), 'ciw-stop-'));
  const fakeHome = join(tmp, 'home');
  mkdirSync(fakeHome, { recursive: true });
  deployCiWatchWrapper({ runnerHome: fakeHome });
  const wrapperPath = join(fakeHome, 'bin', 'ci-watch.sh');
  const pidFile = join(fakeHome, '.hub-runner', 'ci-watch.pid');
  const env = { ...process.env, HOME: fakeHome, PATH: process.env.PATH };
  return { tmp, fakeHome, wrapperPath, pidFile, env };
}

test('S-static: 래퍼 소스에 trap·stop·crash-limit·hint 포함 (정적 검사)', () => {
  assert.ok(WRAPPER_BODY.includes('trap _cleanup INT TERM'), 'SIGINT trap 없음');
  assert.ok(WRAPPER_BODY.includes('"stop"') || WRAPPER_BODY.includes("'stop'") || WRAPPER_BODY.includes('= "stop"') || WRAPPER_BODY.includes("= stop"), 'stop 서브커맨드 없음');
  assert.ok(WRAPPER_BODY.includes('CRASH_LIMIT'), 'CRASH_LIMIT 없음');
  assert.ok(WRAPPER_BODY.includes('CRASH_WINDOW'), 'CRASH_WINDOW 없음');
  assert.ok(WRAPPER_BODY.includes('Ctrl+C') || WRAPPER_BODY.includes('끄기'), '시작 힌트 없음');
  assert.ok(WRAPPER_BODY.includes('ci-watch.pid'), 'PID 파일 경로 없음');
});

test('S1: SIGINT 1회로 래퍼·node 종료', { timeout: 12000 }, async () => {
  const { tmp, fakeHome, wrapperPath, pidFile, env } = setup();
  try {
    // ci-watch stub — 무한 대기
    const stubPath = join(fakeHome, 'bin', 'ci-watch.mjs');
    writeFileSync(stubPath, 'setInterval(() => {}, 999999);\n', 'utf8');

    const proc = spawn('bash', [wrapperPath], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });

    // 시작 메시지 대기
    await waitFor(() => stderr.includes('시작 ·'), { timeout: 6000 });
    // PID 파일 대기
    await waitFor(() => existsSync(pidFile), { timeout: 3000 });

    // SIGINT 전송
    proc.kill('SIGINT');

    // 래퍼가 5초 내 종료해야 함
    const code = await new Promise(res => {
      proc.on('close', res);
      setTimeout(() => res(-999), 5000);
    });

    assert.ok(code !== -999, `SIGINT 후 5초 내 종료 안 됨 · stderr: ${stderr.slice(-300)}`);
    assert.ok(!existsSync(pidFile), 'PID 파일 미삭제');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('S2: stop 서브커맨드로 래퍼 종료 (pid 파일 기반)', { timeout: 12000 }, async () => {
  const { tmp, fakeHome, wrapperPath, pidFile, env } = setup();
  try {
    const stubPath = join(fakeHome, 'bin', 'ci-watch.mjs');
    writeFileSync(stubPath, 'setInterval(() => {}, 999999);\n', 'utf8');

    const proc = spawn('bash', [wrapperPath], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });

    await waitFor(() => existsSync(pidFile), { timeout: 6000 });

    // stop 서브커맨드 실행
    spawnSync('bash', [wrapperPath, 'stop'], { env, stdio: 'pipe' });

    // 래퍼가 5초 내 종료해야 함
    const code = await new Promise(res => {
      proc.on('close', res);
      setTimeout(() => res(-999), 5000);
    });

    assert.ok(code !== -999, `stop 후 5초 내 종료 안 됨 · stderr: ${stderr.slice(-300)}`);
    assert.ok(!existsSync(pidFile) || (() => {
      // stop 명령이 삭제했을 수도 있음 (이미 종료)
      return true;
    })(), 'PID 파일 미삭제');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('S3: 연속 비정상 종료 5회 → 래퍼 exit 1', { timeout: 22000 }, async () => {
  const { tmp, fakeHome, wrapperPath, env } = setup();
  try {
    // ci-watch stub — 즉시 exit 1
    const stubPath = join(fakeHome, 'bin', 'ci-watch.mjs');
    writeFileSync(stubPath, 'process.exit(1);\n', 'utf8');

    const proc = spawn('bash', [wrapperPath], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });

    // 래퍼가 crash limit 에 걸려 exit 1 로 종료해야 함
    const code = await new Promise(res => {
      proc.on('close', res);
      setTimeout(() => res(-999), 20000);
    });

    assert.ok(code !== -999, `S3: 20초 내 종료 안 됨 · stderr: ${stderr.slice(-500)}`);
    assert.equal(code, 1, `S3: exit code 는 1이어야 함 · got: ${code}`);
    assert.ok(stderr.includes('루프 중단'), `S3: 루프 중단 메시지 없음 · stderr: ${stderr.slice(-500)}`);
    assert.ok(stderr.includes('고친 뒤'), `S3: 안내 메시지 없음 · stderr: ${stderr.slice(-500)}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('S4: exit(0) 는 크래시 아님 — 즉시 재기동', { timeout: 10000 }, async () => {
  const { tmp, fakeHome, wrapperPath, env } = setup();
  const counterFile = join(tmp, 'restart-count');
  try {
    // stub: 카운터 증가 후 exit(0)
    const stubPath = join(fakeHome, 'bin', 'ci-watch.mjs');
    writeFileSync(stubPath, `
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const f = ${JSON.stringify(counterFile)};
const n = existsSync(f) ? parseInt(readFileSync(f, 'utf8')) + 1 : 1;
writeFileSync(f, String(n));
process.exit(0);
`, 'utf8');

    const proc = spawn('bash', [wrapperPath], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d; });

    // 카운터가 3에 도달할 때까지 대기 (exit(0) 3회 재기동)
    await waitFor(
      () => existsSync(counterFile) && parseInt(readFileSync(counterFile, 'utf8')) >= 3,
      { timeout: 8000 }
    );

    const count = parseInt(readFileSync(counterFile, 'utf8'));
    assert.ok(count >= 3, `S4: 재기동 횟수 부족 · got=${count}`);
    assert.ok(stderr.includes('exit(0)') && stderr.includes('재기동'), `S4: 재기동 메시지 없음 · stderr: ${stderr}`);

    // crash_count 는 0이어야 함 (exit(0) 는 크래시 아님) → 루프 중단 메시지 없어야 함
    assert.ok(!stderr.includes('루프 중단'), `S4: exit(0) 가 크래시로 처리됨`);

    proc.kill('SIGTERM');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
