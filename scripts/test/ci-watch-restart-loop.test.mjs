// scripts/test/ci-watch-restart-loop.test.mjs  M1-1126-A — 재기동 루프 방지 검증
//
// 수정 대상:
//   S1 — exit(0) 5회 → 래퍼 중단 (WRAPPER_BODY crash 카운터 개선)
//   S2 — 배포 심링크에서 --once 실행 → [ci-watch:once] 출력
//   S3 — 배포 심링크에서 실행 → [ci-watch:boot] 출력 (main 블록 진입 확인)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deployCiWatchWrapper } from '../lib/self-update.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_CI_WATCH = resolve(HERE, '..', 'ci-watch.mjs');

// --- S1: 래퍼 — exit(0) CRASH_LIMIT 회 연속 → exit(1) + 중단 메시지 ---

test('S1: exit(0) 5회 연속 시 래퍼가 "자가 업데이트 재기동…중단" 출력 후 exit(1)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ciw-restart-s1-'));
  try {
    const tmpHome = join(tmp, 'home');
    const runnerHome = join(tmpHome, '.hub-runner');
    mkdirSync(runnerHome, { recursive: true });

    deployCiWatchWrapper({ runnerHome });

    // 항상 즉시 exit(0) 하는 가짜 ci-watch.mjs
    writeFileSync(
      join(runnerHome, 'bin', 'ci-watch.mjs'),
      '#!/usr/bin/env node\nprocess.exit(0);\n',
      'utf8',
    );

    const wrapperPath = join(runnerHome, 'bin', 'ci-watch.sh');

    const result = spawnSync('bash', [wrapperPath], {
      timeout: 15_000,
      env: { ...process.env, HOME: tmpHome },
    });

    const stderr = result.stderr?.toString() || '';
    assert.equal(result.status, 1, `래퍼가 exit(1) 로 종료해야 함 · got=${result.status}\n${stderr}`);
    assert.ok(
      stderr.includes('자가 업데이트 재기동이') && stderr.includes('중단'),
      `중단 메시지 없음\nstderr: ${stderr}`,
    );
    const restartCount = (stderr.match(/exit\(0\) · 즉시 재기동/g) || []).length;
    assert.ok(restartCount < 10, `재기동 ${restartCount}회 · 10 미만 기대\nstderr: ${stderr}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// --- S2: 배포 심링크 + --once → [ci-watch:once] 출력 ---

test('S2: 배포 심링크에서 --once 실행 → [ci-watch:once] imports ok', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ciw-restart-s2-'));
  try {
    const binDir = join(tmp, 'bin');
    mkdirSync(binDir, { recursive: true });
    symlinkSync(REAL_CI_WATCH, join(binDir, 'ci-watch.mjs'));

    const result = spawnSync(process.execPath, [join(binDir, 'ci-watch.mjs'), '--once'], {
      timeout: 10_000,
      env: { ...process.env, HOME: join(tmp, 'home') },
    });

    const stderr = result.stderr?.toString() || '';
    assert.equal(result.status, 0, `--once 는 exit(0) 이어야 함 · got=${result.status}\n${stderr}`);
    assert.ok(
      stderr.includes('[ci-watch:once] imports ok'),
      `[ci-watch:once] 없음\nstderr: ${stderr}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// --- S3: 배포 심링크 일반 실행 → [ci-watch:boot] 출력 (main 블록 진입 확인) ---
// 수정 전: import.meta.url(resolve) ≠ pathToFileURL(argv[1]) → main 블록 미진입 → exit(0) 무한 루프
// 수정 후: argv[1] realpath 비교 추가 → main 블록 진입 → [ci-watch:boot] 출력

test('S3: 배포 심링크에서 실행 시 [ci-watch:boot] 출력 (main 블록 진입)', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ciw-restart-s3-'));
  try {
    const binDir = join(tmp, 'bin');
    mkdirSync(binDir, { recursive: true });
    symlinkSync(REAL_CI_WATCH, join(binDir, 'ci-watch.mjs'));

    // 2초 타임아웃으로 실행 — boot 로그만 확인하면 되므로 충분
    const result = spawnSync(
      process.execPath,
      [join(binDir, 'ci-watch.mjs')],
      {
        timeout: 2_000,
        env: { ...process.env, HOME: join(tmp, 'home') },
      },
    );

    const stderr = result.stderr?.toString() || '';
    // SIGTERM/timeout 으로 종료되거나 오류 종료 모두 허용 — boot 로그 유무만 확인
    assert.ok(
      stderr.includes('[ci-watch:boot]'),
      `[ci-watch:boot] 없음 — main 블록 미진입 (심링크 가드 버그)\nstderr: ${stderr}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
