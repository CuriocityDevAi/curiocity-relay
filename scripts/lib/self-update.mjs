// scripts/lib/self-update.mjs · M1-1124-H · v8 R2 (제안 D) 러너 자기 업데이트.
//
// 동작 요지:
//   ① loop() 가 주기적으로 checkPendingUpdate() 호출 → origin/main 파일 vs 실행 중 바이트 비교.
//   ② 다르면 모든 허브가 idle 인 순간 preflight (node --check + 핵심 selftest 3종).
//   ③ preflight 통과 → updateSymlink() 로 ~/.hub-runner/bin/hub-runner.mjs 를 새 target 으로 교체 →
//      writePending(prev, next) → process.exit(0). launchd KeepAlive 가 새 버전으로 재기동.
//   ④ preflight 실패 → writeBlockedEvent() 로 relay events/runner-selfupdate-blocked-<ts>.md 기록 → 유지.
//   ⑤ 새 버전 재기동 후 3분 내 heartbeat 못 쓰면 다음 boot 가 pending.boot_count>=1 확인 → 롤백.

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';

export const SELF_UPDATE_HOME_SUBDIR = 'self-update';
export const PENDING_FILE = 'pending.json';
export const BIN_SUBDIR = 'bin';
export const RUNNER_SYMLINK = 'hub-runner.mjs';
export const CI_WATCH_DEPLOY = 'ci-watch.mjs';
export const CI_WATCH_WRAPPER = 'ci-watch.sh';
export const BOOT_HEALTH_WINDOW_MS = 3 * 60 * 1000;
export const BOOT_FAILURE_THRESHOLD = 1;
export const BLOCKED_FILE = 'selfupdate-blocked.json';

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

export function sha256File(path) {
  try {
    return sha256(readFileSync(path));
  } catch {
    return null;
  }
}

export function parseInstallTarget(installShContent) {
  const m = /TARGET_RUNNER="\$\{TARGET:-([^}"]+)\}"/.exec(installShContent || '');
  return m ? m[1] : null;
}

export function readFromGitRef({ repoRoot, ref, path }) {
  try {
    const out = execFileSync('git', ['show', `${ref}:${path}`], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
    });
    return out;
  } catch {
    return null;
  }
}

export function detectUpdate({ repoRoot, selfScriptPath, selfBootSha, ref = 'origin/main' }) {
  const originInstall = readFromGitRef({ repoRoot, ref, path: 'scripts/hub-runner-install.sh' });
  if (!originInstall) {
    return { changed: false, reason: 'install-sh-read-fail' };
  }
  const originTargetName = parseInstallTarget(originInstall.toString());
  if (!originTargetName) {
    return { changed: false, reason: 'install-target-parse-fail' };
  }
  const originTargetBuf = readFromGitRef({
    repoRoot,
    ref,
    path: `scripts/${originTargetName}`,
  });
  if (!originTargetBuf) {
    return { changed: false, reason: `origin-target-missing:${originTargetName}` };
  }
  const originSha = sha256(originTargetBuf);
  const currentName = basename(selfScriptPath);
  const diskPath = join(repoRoot, 'scripts', originTargetName);
  const diskSha = sha256File(diskPath);
  const renamed = currentName !== originTargetName;
  const bytesDiffer = originSha !== selfBootSha;
  if (!renamed && !bytesDiffer) {
    return { changed: false, reason: 'up-to-date', originTargetName, originSha, diskSha };
  }
  return {
    changed: true,
    renamed,
    bytesDiffer,
    originTargetName,
    originSha,
    diskSha,
    diskPath,
  };
}

export function runPreflight({ nodeBin, runnerScriptAbs, selftests }) {
  const log = [];
  const checkRes = spawnSync(nodeBin, ['--check', runnerScriptAbs], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20 * 1000,
  });
  log.push(`node --check ${basename(runnerScriptAbs)} → status=${checkRes.status ?? '?'}${checkRes.error ? ' err=' + checkRes.error.message : ''}`);
  if (checkRes.status !== 0) {
    return { ok: false, log, stage: 'node-check', stderr: checkRes.stderr?.toString() || '' };
  }
  for (const flag of selftests) {
    const res = spawnSync(nodeBin, [runnerScriptAbs, flag], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60 * 1000,
    });
    const tail = (res.stdout?.toString() || '').split('\n').filter(Boolean).slice(-1)[0] || '';
    log.push(`selftest ${flag} → status=${res.status ?? '?'} ${tail}`);
    if (res.status !== 0) {
      return {
        ok: false,
        log,
        stage: `selftest:${flag}`,
        stderr: res.stderr?.toString() || '',
      };
    }
  }
  return { ok: true, log };
}

export function selfUpdateHome(runnerHome) {
  return join(runnerHome, SELF_UPDATE_HOME_SUBDIR);
}

export function pendingFile(runnerHome) {
  return join(selfUpdateHome(runnerHome), PENDING_FILE);
}

export function writePending(runnerHome, payload) {
  const dir = selfUpdateHome(runnerHome);
  mkdirSync(dir, { recursive: true });
  writeFileSync(pendingFile(runnerHome), JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

export function readPending(runnerHome) {
  const f = pendingFile(runnerHome);
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
}

export function clearPending(runnerHome) {
  const f = pendingFile(runnerHome);
  try {
    rmSync(f, { force: true });
  } catch {
    /* noop */
  }
}

export function blockedFile(runnerHome) {
  return join(runnerHome, BLOCKED_FILE);
}

export function readBlockedSha(runnerHome) {
  const f = blockedFile(runnerHome);
  if (!existsSync(f)) return null;
  try {
    return JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
}

export function writeBlockedSha(runnerHome, record) {
  mkdirSync(runnerHome, { recursive: true });
  writeFileSync(blockedFile(runnerHome), JSON.stringify(record, null, 2) + '\n', 'utf8');
}

export function binDir(runnerHome) {
  return join(runnerHome, BIN_SUBDIR);
}

export function ensureSymlink({ linkPath, targetPath }) {
  const dir = dirname(linkPath);
  mkdirSync(dir, { recursive: true });
  let current = null;
  try {
    current = readlinkSync(linkPath);
  } catch {
    /* noop */
  }
  if (current === targetPath) return { changed: false, prev: current };
  if (existsSync(linkPath) || current !== null) {
    try {
      rmSync(linkPath, { force: true });
    } catch {
      /* noop */
    }
  }
  symlinkSync(targetPath, linkPath);
  return { changed: true, prev: current };
}

export function deployCiWatch({ repoRoot, runnerHome }) {
  const bin = binDir(runnerHome);
  mkdirSync(bin, { recursive: true });
  const src = join(repoRoot, 'scripts', 'ci-watch.mjs');
  const dst = join(bin, CI_WATCH_DEPLOY);
  if (!existsSync(src)) return { ok: false, reason: 'src-missing', src };
  const srcSha = sha256File(src);
  const dstSha = existsSync(dst) ? sha256File(dst) : null;
  if (srcSha === dstSha) return { ok: true, changed: false, srcSha };
  copyFileSync(src, dst);
  try {
    execFileSync('chmod', ['755', dst]);
  } catch {
    /* noop */
  }
  return { ok: true, changed: true, srcSha, prevSha: dstSha };
}

const WRAPPER_BODY = `#!/bin/bash
# ci-watch.sh · M1-1124-H v8 R2 · ci-watch 자가 재기동 래퍼.
# ci-watch.mjs 가 자기 파일 바이트 변화를 감지하면 exit(0) → 이 래퍼가 2 초 뒤 다시 띄움.
set -u
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
CI_WATCH="$SELF_DIR/ci-watch.mjs"
while :; do
  if [[ ! -f "$CI_WATCH" ]]; then
    echo "[ci-watch.sh] 배포 파일 없음: $CI_WATCH · 10 초 뒤 재시도" >&2
    sleep 10
    continue
  fi
  node "$CI_WATCH" "$@"
  echo "[ci-watch.sh] exited · 2 초 뒤 재기동" >&2
  sleep 2
done
`;

export function deployCiWatchWrapper({ runnerHome }) {
  const bin = binDir(runnerHome);
  mkdirSync(bin, { recursive: true });
  const dst = join(bin, CI_WATCH_WRAPPER);
  const existing = existsSync(dst) ? readFileSync(dst, 'utf8') : null;
  if (existing === WRAPPER_BODY) return { ok: true, changed: false };
  writeFileSync(dst, WRAPPER_BODY, 'utf8');
  try {
    execFileSync('chmod', ['755', dst]);
  } catch {
    /* noop */
  }
  return { ok: true, changed: true };
}

export function writeBlockedEvent({ relayRoot, runnerVersion, reason, preflightLog, originTargetName, originSha }) {
  const eventsDir = join(relayRoot, 'events');
  mkdirSync(eventsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(eventsDir, `runner-selfupdate-blocked-${ts}.md`);
  const body = [
    `# runner-selfupdate-blocked ${ts}`,
    ``,
    `러너: ${runnerVersion}`,
    `사유: ${reason}`,
    `원 target: ${originTargetName || '?'}`,
    `원 sha: ${originSha || '?'}`,
    ``,
    `## preflight 로그`,
    '```',
    ...(preflightLog || []),
    '```',
    '',
  ].join('\n');
  writeFileSync(file, body, 'utf8');
  return file;
}

// 러너 boot 시 호출. pending.boot_count 를 보고 rollback 필요 판정.
// 반환:
//   { action: 'rollback', prev, next } — 호출자가 symlink 되돌리고 exit 할 것.
//   { action: 'confirm',  prev, next, bootCount } — 성공 부트(1 회째). 호출자가 heartbeat watchdog 띄움.
//   { action: 'none' }                            — pending 없음. 통상 부트.
export function handleBootPending({ runnerHome, currentScriptAbs }) {
  const pending = readPending(runnerHome);
  if (!pending) return { action: 'none' };
  const nextAbs = pending.next_abs || pending.next;
  const prevAbs = pending.prev_abs || pending.prev;
  const bootCount = pending.boot_count ?? 0;
  if (currentScriptAbs !== nextAbs) {
    // 심링크가 next 를 안 가리키고 있음 (또는 다른 경로로 뜸) → 롤백 대상 아님. pending 만 정리.
    return { action: 'none-stale', pending };
  }
  if (bootCount >= BOOT_FAILURE_THRESHOLD) {
    return { action: 'rollback', prev: prevAbs, next: nextAbs, pending };
  }
  const nextPending = { ...pending, boot_count: bootCount + 1, boot_at: new Date().toISOString() };
  writePending(runnerHome, nextPending);
  return { action: 'confirm', prev: prevAbs, next: nextAbs, bootCount: nextPending.boot_count };
}

// pending.json 안의 boot_watchdog_handle 은 저장 안 함 — 호출 측에서 setTimeout 유지.
// 3 분 이내 heartbeat 성공이 확인되면 호출자가 clearPending() + clearTimeout.
export function armBootWatchdog({ runnerHome, onFailure, windowMs = BOOT_HEALTH_WINDOW_MS }) {
  const handle = setTimeout(() => {
    // 3 분 지났는데도 pending 이 살아 있으면 heartbeat 실패로 간주. 호출자에게 알림.
    const p = readPending(runnerHome);
    if (!p) return; // 이미 confirm 처리됨.
    try {
      onFailure(p);
    } catch {
      /* noop */
    }
  }, windowMs);
  handle.unref?.();
  return handle;
}
