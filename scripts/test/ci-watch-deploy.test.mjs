// scripts/test/ci-watch-deploy.test.mjs — M1-1124-J: ci-watch 심링크 배포 검증.
//
// 뿌리: v8.1 self-update (REQ3) 가 ci-watch.mjs 를 copyFileSync 로 배포해
//       ~/.hub-runner/bin/ 에 단독 복사본을 만들었고, 이 복사본은 ./lib/ci-history.mjs 등
//       상대 경로 import 를 해석할 수 없어 ERR_MODULE_NOT_FOUND → 2 초 루프 현상 발생.
//
// 검증:
//   T1. deployCiWatch 가 심링크를 생성하는지 (파일 복사본 아님).
//   T2. 심링크 target 이 scripts/ci-watch.mjs 절대경로인지.
//   T3. 2nd call → no-op (changed:false). 심링크는 target 이 같으면 교체 안 함.
//   T4. 소스 파일 내용 변경 후에도 추가 deploy 없이 심링크 통해 최신 내용 읽힘.
//   T5. 실제 scripts/ci-watch.mjs 를 src 로 써서 node --check 통과 (ERR_MODULE_NOT_FOUND 없음).
//   T6. install.sh ci-watch 배포 라인이 ln -s 를 쓰고 cp 를 쓰지 않음 (정적 검사).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deployCiWatch } from '../lib/self-update.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const INSTALL_SH = resolve(HERE, '..', 'hub-runner-install.sh');
const REAL_CI_WATCH = resolve(HERE, '..', 'ci-watch.mjs');

test('T1 deployCiWatch 는 심링크를 생성한다 (파일 복사본 아님)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ciw-deploy-t1-'));
  try {
    const fakeRepo = join(tmp, 'relay');
    const fakeHome = join(tmp, 'home');
    mkdirSync(join(fakeRepo, 'scripts'), { recursive: true });
    mkdirSync(fakeHome, { recursive: true });
    writeFileSync(join(fakeRepo, 'scripts', 'ci-watch.mjs'), '// ci-watch stub\n', 'utf8');
    const result = deployCiWatch({ repoRoot: fakeRepo, runnerHome: fakeHome });
    assert.ok(result.ok, `deployCiWatch 실패 · ${JSON.stringify(result)}`);
    assert.ok(result.changed, `deployCiWatch changed=false (첫 배포임에도 no-op)`);
    const deployedPath = join(fakeHome, 'bin', 'ci-watch.mjs');
    assert.ok(existsSync(deployedPath), '배포 경로 파일 없음');
    const st = lstatSync(deployedPath);
    assert.ok(st.isSymbolicLink(), '심링크 아님 — 파일 복사본으로 배포됨 (버그)');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('T2 심링크 target 이 scripts/ci-watch.mjs 절대경로인지', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ciw-deploy-t2-'));
  try {
    const fakeRepo = join(tmp, 'relay');
    const fakeHome = join(tmp, 'home');
    mkdirSync(join(fakeRepo, 'scripts'), { recursive: true });
    mkdirSync(fakeHome, { recursive: true });
    writeFileSync(join(fakeRepo, 'scripts', 'ci-watch.mjs'), '// ci-watch stub\n', 'utf8');
    deployCiWatch({ repoRoot: fakeRepo, runnerHome: fakeHome });
    const deployedPath = join(fakeHome, 'bin', 'ci-watch.mjs');
    const target = readlinkSync(deployedPath);
    const expected = join(fakeRepo, 'scripts', 'ci-watch.mjs');
    assert.equal(target, expected, `심링크 target 오류 · got=${target} want=${expected}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('T3 2nd deployCiWatch call → no-op (changed:false)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ciw-deploy-t3-'));
  try {
    const fakeRepo = join(tmp, 'relay');
    const fakeHome = join(tmp, 'home');
    mkdirSync(join(fakeRepo, 'scripts'), { recursive: true });
    mkdirSync(fakeHome, { recursive: true });
    writeFileSync(join(fakeRepo, 'scripts', 'ci-watch.mjs'), '// ci-watch stub\n', 'utf8');
    deployCiWatch({ repoRoot: fakeRepo, runnerHome: fakeHome });
    const r2 = deployCiWatch({ repoRoot: fakeRepo, runnerHome: fakeHome });
    assert.ok(r2.ok, `2nd call 실패 · ${JSON.stringify(r2)}`);
    assert.ok(!r2.changed, `2nd call changed=true (불필요한 재링크) · ${JSON.stringify(r2)}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('T4 소스 파일 변경 후 심링크 통해 최신 내용이 보임 (추가 deploy 불필요)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ciw-deploy-t4-'));
  try {
    const fakeRepo = join(tmp, 'relay');
    const fakeHome = join(tmp, 'home');
    mkdirSync(join(fakeRepo, 'scripts'), { recursive: true });
    mkdirSync(fakeHome, { recursive: true });
    writeFileSync(join(fakeRepo, 'scripts', 'ci-watch.mjs'), '// ci-watch body v1\n', 'utf8');
    deployCiWatch({ repoRoot: fakeRepo, runnerHome: fakeHome });
    // 소스 변경 — deploy 재호출 없이도 심링크 통해 최신 내용이 보여야 한다.
    writeFileSync(join(fakeRepo, 'scripts', 'ci-watch.mjs'), '// ci-watch body v2\n', 'utf8');
    const deployedPath = join(fakeHome, 'bin', 'ci-watch.mjs');
    const body = readFileSync(deployedPath, 'utf8');
    assert.ok(body.includes('v2'), `심링크 통해 최신 내용 미반영 · body=${body.trim()}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('T5 실제 실행 스모크 — 심링크 배포: CI_WATCH_ONCE=1 exit 0 · 복사본: ERR_MODULE_NOT_FOUND', { timeout: 20_000 }, () => {
  // M1-1124-L F2: node --check 는 import 를 해석하지 않아 ERR_MODULE_NOT_FOUND 를 잡지 못한다.
  // CI_WATCH_ONCE=1 (--once 플래그 동등) 으로 실제 실행 — import 성공 시 exit 0, 실패 시 비정상 종료.
  // 복사본 배포(기존 버그)로 실행하면 반드시 실패해야 한다.
  const tmp = mkdtempSync(join(tmpdir(), 'ciw-deploy-t5-'));
  try {
    assert.ok(existsSync(REAL_CI_WATCH), `실제 ci-watch.mjs 없음: ${REAL_CI_WATCH}`);

    // ① 심링크 배포 → CI_WATCH_ONCE=1 → exit 0 (ERR_MODULE_NOT_FOUND 없음).
    const fakeHome = join(tmp, 'home-sym');
    mkdirSync(fakeHome, { recursive: true });
    const symResult = deployCiWatch({ repoRoot: REPO_ROOT, runnerHome: fakeHome });
    assert.ok(symResult.ok, `symlink deployCiWatch 실패 · ${JSON.stringify(symResult)}`);
    const symPath = join(fakeHome, 'bin', 'ci-watch.mjs');
    assert.ok(lstatSync(symPath).isSymbolicLink(), '심링크 아님');

    const symRes = spawnSync(process.execPath, [symPath], {
      env: { ...process.env, CI_WATCH_ONCE: '1', HOME: fakeHome },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15_000,
    });
    const symStderr = symRes.stderr?.toString() || '';
    assert.equal(
      symRes.status, 0,
      `심링크 실행 실패 (ERR_MODULE_NOT_FOUND 의심) · status=${symRes.status} · stderr=${symStderr.slice(0, 300)}`,
    );
    assert.ok(symStderr.includes('imports ok'), `once 메시지 없음 · stderr=${symStderr}`);

    // ② 복사본 배포(기존 버그 재현) → 반드시 비정상 종료.
    const fakeHome2 = join(tmp, 'home-copy');
    mkdirSync(join(fakeHome2, 'bin'), { recursive: true });
    const copyPath = join(fakeHome2, 'bin', 'ci-watch.mjs');
    // copyFileSync 로 복사본 배포 — lib/ 없어 ERR_MODULE_NOT_FOUND 발생해야 함.
    copyFileSync(REAL_CI_WATCH, copyPath);

    const copyRes = spawnSync(process.execPath, [copyPath], {
      env: { ...process.env, CI_WATCH_ONCE: '1', HOME: fakeHome2 },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15_000,
    });
    assert.notEqual(
      copyRes.status, 0,
      `복사본이 exit 0 (ERR_MODULE_NOT_FOUND 미발생 — 회귀)`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('T6 install.sh ci-watch 배포 라인이 ln -s 를 사용하고 cp 를 사용하지 않음 (정적 검사)', () => {
  const src = readFileSync(INSTALL_SH, 'utf8');
  const lines = src.split('\n');
  // CI_WATCH_DST 에 cp 명령으로 쓰는 라인이 없어야 한다 (주석 라인 제외).
  const cpLines = lines.filter(l => !l.trim().startsWith('#') && (/\bcp\b.*CI_WATCH/.test(l) || /\bcp\b.*ci-watch/.test(l)));
  assert.equal(
    cpLines.length,
    0,
    `install.sh 에 ci-watch cp 라인 발견 (심링크로 교체 필요):\n${cpLines.join('\n')}`,
  );
  // ln -s 로 CI_WATCH_DST 를 만드는 라인이 있어야 한다.
  const lnLines = lines.filter(l => /\bln\s+-s/.test(l) && /CI_WATCH/.test(l));
  assert.ok(
    lnLines.length > 0,
    `install.sh 에 ci-watch ln -s 라인 없음 — 심링크 배포 로직 누락`,
  );
});
