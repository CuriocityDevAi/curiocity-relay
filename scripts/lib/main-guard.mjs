// scripts/lib/main-guard.mjs · M1-1124-N
//
// 러너 폴더 = 항상 main 보증 모듈.
//
// 오늘(2026-11-24) 러너 폴더 사고 3건:
//   A. 허브가 러너 폴더에서 `fix/*` 브랜치 생성 + 커밋 → 러너 claim push 가 그 위에 쌓임(44건) →
//      `pull --rebase` 충돌로 rebase 중단 상태 방치 → "unmerged files" 로 push 전면 정지.
//   B. 노트북 뚜껑 닫힘 → rebase 중단 → `.git/rebase-merge` 디렉터리 잔존 →
//      "already a rebase-merge directory" 로 push 정지. abort 시 HEAD 가 다시 fix/* 브랜치로 복귀.
//   C. 오케가 되돌려 둔 untracked claim 파일 때문에 `rebase --abort` 가
//      "would be overwritten by merge" 로 실패.
//
// 이 모듈이 하는 일 (tick 시작에서 1회):
//   1) 현재 HEAD / rebase 진행 / merge 진행 / unmerged 파일 / untracked foreign 파일 조사.
//   2) 위반이면 안전 복구:
//      (a) 진행 중 rebase/merge abort — 실패 시 `.git/rebase-merge` 등 수동 제거.
//      (b) 현재 HEAD 를 `rescue-<YYYYMMDDTHHMMSS>` 브랜치로 보존 (push 는 하지 않음 — 로컬 ref 만).
//      (c) RUNNER_SCOPE 밖 untracked/modified 는 `<runnerHome>/rescue/<ts>/` 로 copy 보존.
//      (d) `git checkout -f main` + `git reset --hard origin/main` (origin fetch 된 최신).
//      (e) RUNNER_SCOPE(claims/·runners/·events/·ledger/) 중 복구 디렉터리에 들어간 것은 다시 써서 commit.
//      (f) <runnerHome>/rescue/<ts>/manifest.json 작성 + <REPO_ROOT>/events/ 에 1줄 기록(가능하면).
//
// 모든 동작은 주입된 `exec`·`io` 를 통해 수행 — 테스트에서 격리 가능.
// 실환경에서는 `createDefaultImpl()` 가 node:fs / node:child_process 를 묶어 반환.

import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

export const RUNNER_SCOPE_PREFIXES = [
  'status/claims/',
  'status/runners/',
  'status/hubs.json',
  'status/ci/',
  'events/',
  'ledger/',
];

export function createDefaultImpl(repoRoot) {
  return {
    git: (args, opts = {}) => {
      return execFileSync('git', args, {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        ...opts,
      }).toString();
    },
    tryGit: (args, opts = {}) => {
      try {
        return {
          ok: true,
          stdout: execFileSync('git', args, {
            cwd: repoRoot,
            stdio: ['ignore', 'pipe', 'pipe'],
            ...opts,
          }).toString(),
        };
      } catch (e) {
        return { ok: false, err: (e.stderr?.toString() || e.message || '').trim() };
      }
    },
    existsSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    readdirSync,
    rmSync,
    copyFileSync,
    statSync,
  };
}

// ---- 진단 ----

export function detectViolation({ repoRoot, impl }) {
  const gitDir = join(repoRoot, '.git');
  const rebaseMerge = impl.existsSync(join(gitDir, 'rebase-merge'));
  const rebaseApply = impl.existsSync(join(gitDir, 'rebase-apply'));
  const mergeHead = impl.existsSync(join(gitDir, 'MERGE_HEAD'));

  let headRef = '?';
  let onMain = false;
  const sym = impl.tryGit(['symbolic-ref', '--short', '-q', 'HEAD']);
  if (sym.ok) {
    headRef = sym.stdout.trim();
    onMain = headRef === 'main';
  } else {
    headRef = '(detached)';
  }

  let unmerged = [];
  const u = impl.tryGit(['diff', '--name-only', '--diff-filter=U']);
  if (u.ok) unmerged = u.stdout.split('\n').map((s) => s.trim()).filter(Boolean);

  let dirtyForeign = [];
  const st = impl.tryGit(['status', '--porcelain']);
  if (st.ok) {
    for (const raw of st.stdout.split('\n')) {
      if (!raw) continue;
      const p = raw.length > 3 ? raw.slice(3).trim() : '';
      if (!p) continue;
      if (RUNNER_SCOPE_PREFIXES.some((pre) => p.startsWith(pre))) continue;
      if (p.startsWith('m0/') || p.startsWith('m1/') || p.startsWith('m2/') ||
          p.startsWith('m3/') || p.startsWith('r0/') || p.startsWith('queue/')) continue;
      dirtyForeign.push(p);
    }
  }

  const violated = !onMain || rebaseMerge || rebaseApply || mergeHead || unmerged.length > 0;
  return {
    violated,
    onMain,
    headRef,
    rebaseMerge,
    rebaseApply,
    mergeHead,
    unmerged,
    dirtyForeign,
  };
}

// ---- 복구 ----

function tsCompact(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`;
}

function listRunnerScopeFiles({ repoRoot, impl }) {
  const files = [];
  const st = impl.tryGit(['status', '--porcelain']);
  if (!st.ok) return files;
  for (const raw of st.stdout.split('\n')) {
    if (!raw) continue;
    const p = raw.length > 3 ? raw.slice(3).trim() : '';
    if (!p) continue;
    if (!RUNNER_SCOPE_PREFIXES.some((pre) => p.startsWith(pre))) continue;
    files.push(p);
  }
  return files;
}

export function performRescue({ repoRoot, runnerHome, impl, logFn, now = new Date() }) {
  const log = typeof logFn === 'function' ? logFn : () => {};
  const tag = tsCompact(now);
  const rescueDir = join(runnerHome, 'rescue', tag);
  impl.mkdirSync(rescueDir, { recursive: true });

  const diag = detectViolation({ repoRoot, impl });
  const manifest = {
    at: now.toISOString(),
    diag,
    actions: [],
  };

  // (a) rebase/merge abort — 실패해도 진행.
  if (diag.rebaseMerge || diag.rebaseApply) {
    const a = impl.tryGit(['rebase', '--abort']);
    manifest.actions.push({ step: 'rebase-abort', ok: a.ok, err: a.ok ? null : a.err?.split('\n')[0] });
    if (!a.ok) {
      // 수동으로 .git/rebase-merge, rebase-apply 디렉터리 제거.
      for (const sub of ['rebase-merge', 'rebase-apply']) {
        const p = join(repoRoot, '.git', sub);
        if (impl.existsSync(p)) {
          try { impl.rmSync(p, { recursive: true, force: true }); } catch { /* noop */ }
        }
      }
      manifest.actions.push({ step: 'rebase-dir-rm', ok: true });
    }
  }
  if (diag.mergeHead) {
    const a = impl.tryGit(['merge', '--abort']);
    manifest.actions.push({ step: 'merge-abort', ok: a.ok, err: a.ok ? null : a.err?.split('\n')[0] });
  }

  // (b) 현재 HEAD 를 rescue 브랜치로 보존 (ref 만).
  const headSha = (() => {
    const r = impl.tryGit(['rev-parse', 'HEAD']);
    return r.ok ? r.stdout.trim() : null;
  })();
  const rescueBranch = `rescue-${tag}`;
  if (headSha) {
    impl.tryGit(['branch', '-f', rescueBranch, headSha]);
    manifest.actions.push({ step: 'rescue-branch', ref: rescueBranch, sha: headSha });
  }

  // (c) RUNNER_SCOPE 밖 untracked/modified 파일 copy 보존.
  //   untracked 는 `git ls-files --others --exclude-standard` 로 파일 단위 조회.
  //   modified 는 `git ls-files --modified` 로 조회.
  const preserved = [];
  const seen = new Set();
  const preserveOne = (p, code) => {
    if (!p || seen.has(p)) return;
    seen.add(p);
    if (RUNNER_SCOPE_PREFIXES.some((pre) => p.startsWith(pre))) return;
    const abs = join(repoRoot, p);
    if (!impl.existsSync(abs)) return;
    const dst = join(rescueDir, 'files', p);
    try {
      impl.mkdirSync(dirname(dst), { recursive: true });
      impl.copyFileSync(abs, dst);
      preserved.push({ path: p, code });
    } catch (e) {
      preserved.push({ path: p, code, err: (e.message || '').split('\n')[0] });
    }
  };
  const uTracked = impl.tryGit(['ls-files', '--others', '--exclude-standard']);
  if (uTracked.ok) {
    for (const raw of uTracked.stdout.split('\n')) preserveOne(raw.trim(), '??');
  }
  const mod = impl.tryGit(['ls-files', '--modified']);
  if (mod.ok) {
    for (const raw of mod.stdout.split('\n')) preserveOne(raw.trim(), 'M');
  }
  manifest.actions.push({ step: 'preserve-foreign', count: preserved.length });
  manifest.preserved = preserved;

  // RUNNER_SCOPE 파일 보존 — 두 소스 결합:
  //   (1) 작업 트리에 pending 상태로 떠 있는 것 (status --porcelain)
  //   (2) 현재 HEAD 에는 있지만 origin/main 에는 없는 커밋된 것 (diff origin/main...HEAD)
  const savedRunner = new Set();
  const saveFromWorktree = (p) => {
    const abs = join(repoRoot, p);
    if (!impl.existsSync(abs)) return;
    const dst = join(rescueDir, 'runner', p);
    try {
      impl.mkdirSync(dirname(dst), { recursive: true });
      impl.copyFileSync(abs, dst);
      savedRunner.add(p);
    } catch { /* noop */ }
  };
  const saveFromHead = (p) => {
    const r = impl.tryGit(['show', `HEAD:${p}`]);
    if (!r.ok) return;
    const dst = join(rescueDir, 'runner', p);
    try {
      impl.mkdirSync(dirname(dst), { recursive: true });
      impl.writeFileSync(dst, r.stdout);
      savedRunner.add(p);
    } catch { /* noop */ }
  };
  for (const p of listRunnerScopeFiles({ repoRoot, impl })) saveFromWorktree(p);
  // ahead 커밋에서 runner-scope 파일 수집.
  const dh = impl.tryGit(['diff', '--name-only', 'origin/main...HEAD']);
  if (dh.ok) {
    for (const raw of dh.stdout.split('\n')) {
      const p = raw.trim();
      if (!p) continue;
      if (!RUNNER_SCOPE_PREFIXES.some((pre) => p.startsWith(pre))) continue;
      if (savedRunner.has(p)) continue;
      saveFromHead(p);
    }
  }
  manifest.actions.push({ step: 'preserve-runner-scope', count: savedRunner.size });

  // (c-1) 작업 트리를 전부 정리 — untracked + modified 모두 날려야 checkout -f 가 걸린다.
  // 단, `.git/` 는 건드리지 않는다. runner scope 파일은 이미 savedRunner 로 백업됨.
  impl.tryGit(['reset', '--hard', 'HEAD']);
  impl.tryGit(['clean', '-fd']);

  // (d) fetch + main 으로 복귀.
  impl.tryGit(['fetch', 'origin', 'main']);
  impl.tryGit(['checkout', '-f', 'main']);
  impl.tryGit(['reset', '--hard', 'origin/main']);
  manifest.actions.push({ step: 'checkout-main-reset-hard' });

  // (e) runner scope 파일 재적용 — 단 origin/main 에 이미 있는 것은 덮지 않음.
  //     그리고 복구 후 1번의 commit 으로 묶어 올린다 (다음 safePush 가 push).
  let reapplied = 0;
  const reappliedFiles = [];
  for (const p of savedRunner) {
    // origin/main 에 같은 경로가 존재하면 skip.
    const chk = impl.tryGit(['cat-file', '-e', `origin/main:${p}`]);
    if (chk.ok) continue;
    const src = join(rescueDir, 'runner', p);
    const dst = join(repoRoot, p);
    try {
      impl.mkdirSync(dirname(dst), { recursive: true });
      impl.copyFileSync(src, dst);
      impl.tryGit(['add', '--', p]);
      reapplied++;
      reappliedFiles.push(p);
    } catch { /* noop */ }
  }
  if (reapplied > 0) {
    impl.tryGit(['-c', 'user.email=runner@curiocity', '-c', 'user.name=hub-runner',
                 'commit', '-m', `runner-scope reapply · main-guard ${tag}`]);
  }
  manifest.actions.push({ step: 'reapply-runner-scope', count: reapplied, files: reappliedFiles });

  // (f) manifest + events 1줄.
  impl.writeFileSync(join(rescueDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const evLine = `main-guard rescue · at=${now.toISOString()} · tag=${tag} · head_before=${diag.headRef} · rebase=${diag.rebaseMerge || diag.rebaseApply} · merge=${diag.mergeHead} · unmerged=${diag.unmerged.length} · foreign_preserved=${preserved.length} · runner_reapplied=${reapplied}`;
  log(evLine);
  try {
    const eventsDir = join(repoRoot, 'events');
    impl.mkdirSync(eventsDir, { recursive: true });
    const evFile = join(eventsDir, `runner-main-guard-${tag}.md`);
    impl.writeFileSync(evFile, `# runner main-guard rescue · ${tag}\n\n${evLine}\n\ndetails: ${join(runnerHome, 'rescue', tag, 'manifest.json')}\n`);
  } catch { /* noop — 러너 루트가 로컬 git 리포가 아닐 수 있는 테스트 환경 */ }

  return { rescued: true, tag, rescueDir, rescueBranch, preserved, reapplied, manifest };
}

export function assertMainAtTickStart({ repoRoot, runnerHome, impl, logFn, now }) {
  const diag = detectViolation({ repoRoot, impl });
  if (!diag.violated) return { ok: true, diag };
  const res = performRescue({ repoRoot, runnerHome, impl, logFn, now });
  const after = detectViolation({ repoRoot, impl });
  return { ok: !after.violated, diag, after, rescue: res };
}
