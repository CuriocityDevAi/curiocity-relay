// scripts/lib/safe-push.mjs · M1-1124-N
//
// 러너 자기 push 를 rebase 없이, 충돌 생기지 않는 방식으로 돌린다.
//
// 배경 (오늘 사고 A):
//   러너의 자기 push 경로가 `pull --rebase --autostash origin main` 을 사용 → 같은 파일
//   (status/claims/<id>.json) 을 허브와 러너가 모두 건드리는 순간 rebase 충돌 → 중단 상태 방치 →
//   "unmerged files" 로 모든 push 정지.
//
// 러너가 쓰는 파일은 claim · heartbeat · report · event · ledger 뿐 — 전부 runner 자신만 쓴다.
// 따라서 충돌은 "허브가 러너 폴더에 잘못 썼다" 거나 "두 러너가 동시 push" 중 하나다.
// 어느 경우든 **러너 쪽 버전이 정답** 이므로 ours 전략으로 자동 해소하고 push.
//
// 흐름:
//   1) `git fetch origin main`
//   2) local 이 origin/main 보다 ahead 0 → 바로 push.
//   3) ahead > 0:
//      (a) `git merge -X ours origin/main --no-edit` 로 remote 변경 수용. 충돌 시 ours 가 이김.
//      (b) merge 가 ours 전략으로도 실패하면(예: binary · delete-modify) 충돌 파일을 다시
//          `git checkout --ours -- <file>` → `git add` → `git commit --no-edit` 로 마무리.
//      (c) 그래도 안 되면 `git merge --abort` + 에러 리턴 — 러너는 다음 tick 에 재시도.
//   4) `git push origin HEAD:main`.
//
// 어떤 경우에도 rebase 를 사용하지 않는다 → `.git/rebase-merge` 디렉터리가 잔존하는 사고 B 재발 불가.

import { execFileSync } from 'node:child_process';

export function createGit(repoRoot) {
  return {
    run: (args, opts = {}) => execFileSync('git', args, {
      cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'], ...opts,
    }).toString(),
    try: (args, opts = {}) => {
      try {
        return { ok: true, stdout: execFileSync('git', args, {
          cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'], ...opts,
        }).toString() };
      } catch (e) {
        return { ok: false, err: (e.stderr?.toString() || e.message || '').trim() };
      }
    },
  };
}

export function safeRunnerPush({ git, timeoutMs = 30_000 }) {
  const steps = [];
  const fetch = git.try(['fetch', 'origin', 'main'], { timeout: timeoutMs });
  steps.push({ step: 'fetch', ok: fetch.ok, err: fetch.ok ? null : fetch.err?.split('\n')[0] });
  if (!fetch.ok) return { ok: false, reason: 'fetch-failed', steps };

  // ahead/behind.
  const ab = git.try(['rev-list', '--left-right', '--count', 'HEAD...origin/main']);
  let ahead = 0, behind = 0;
  if (ab.ok) {
    const [a, b] = ab.stdout.trim().split(/\s+/).map((n) => parseInt(n, 10) || 0);
    ahead = a; behind = b;
  }
  steps.push({ step: 'ab', ahead, behind });

  if (behind > 0) {
    // ours 전략 merge. 자기 변경이 priority.
    const m = git.try(['-c', 'user.email=runner@curiocity', '-c', 'user.name=hub-runner',
                       'merge', '-X', 'ours', '--no-edit', 'origin/main'], { timeout: timeoutMs });
    steps.push({ step: 'merge-ours', ok: m.ok, err: m.ok ? null : m.err?.split('\n')[0] });
    if (!m.ok) {
      // 잔존 충돌 파일 — ours 로 해소.
      const u = git.try(['diff', '--name-only', '--diff-filter=U']);
      const conflicted = u.ok ? u.stdout.split('\n').map((s) => s.trim()).filter(Boolean) : [];
      for (const f of conflicted) {
        git.try(['checkout', '--ours', '--', f]);
        git.try(['add', '--', f]);
      }
      const cm = git.try(['-c', 'user.email=runner@curiocity', '-c', 'user.name=hub-runner',
                          'commit', '--no-edit']);
      steps.push({ step: 'resolve-ours', count: conflicted.length, ok: cm.ok, err: cm.ok ? null : cm.err?.split('\n')[0] });
      if (!cm.ok) {
        git.try(['merge', '--abort']);
        return { ok: false, reason: 'merge-conflict-unresolved', steps };
      }
    }
  }

  const push = git.try(['push', 'origin', 'HEAD:main'], { timeout: timeoutMs });
  steps.push({ step: 'push', ok: push.ok, err: push.ok ? null : push.err?.split('\n')[0] });
  if (!push.ok) return { ok: false, reason: 'push-failed', steps };
  return { ok: true, steps };
}
