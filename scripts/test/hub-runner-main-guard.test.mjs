// scripts/test/hub-runner-main-guard.test.mjs · M1-1124-Q
//
// 러너 폴더 사고 A·B·C 를 임시 git repo 에 재현하고 main-guard 가 자동으로 복구하는지 확인.
// 각 case 는 한 함수. runner-v8.2 가 --selftest-main-guard-{a,b,c} 로 이 모듈을 import 해서 호출.
//
//   A. 허브가 러너 폴더에서 fix/* 브랜치 + 커밋 생성 → 러너가 그 브랜치 위에 claim 커밋 2개 쌓음 →
//      origin/main 과 diverge · 러너는 지금 fix/* HEAD 위에 있음.
//      기대: tick 시작에 main-guard 가 (b) rescue 브랜치 ref 를 만들고 (d) checkout main+reset.
//            다음 상태: HEAD=main, rebase/merge 디렉터리 없음, unmerged 0.
//
//   B. .git/rebase-merge 디렉터리 잔존 (노트북 뚜껑 닫혀 rebase 가 중간에 멈춘 사고 B).
//      기대: main-guard 가 (a) rebase --abort 실패 시 .git/rebase-merge 를 수동 제거 →
//            (d) checkout main+reset 로 수습. 복구 후 상태 깨끗.
//
//   C. untracked 파일이 작업 트리에 있어 rebase --abort 가 "would be overwritten" 으로 실패.
//      기대: main-guard 가 untracked 를 ~/.hub-runner/rescue/<ts>/files/ 로 보존 copy →
//            git clean -fd → checkout main+reset. 사용자 파일은 유실되지 않음(rescue 폴더에 사본).

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertMainAtTickStart,
  detectViolation,
  createDefaultImpl,
  RUNNER_SCOPE_PREFIXES,
} from '../lib/main-guard.mjs';
import { safeRunnerPush, createGit as safePushCreateGit } from '../lib/safe-push.mjs';
import { buildHubPreamble, DEFAULT_WORKTREE_RULE } from '../lib/hub-preamble.mjs';
import { createSleepTracker } from '../lib/sleep-tracker.mjs';

function g(cwd, args) {
  return execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=tester',
                              '-c', 'init.defaultBranch=main', ...args], {
    cwd, stdio: ['ignore', 'pipe', 'pipe'],
  }).toString();
}

function initRemote(tmp) {
  const remote = join(tmp, 'remote.git');
  const local = join(tmp, 'local');
  mkdirSync(remote, { recursive: true });
  g(remote, ['init', '--bare']);
  mkdirSync(local, { recursive: true });
  g(local, ['clone', remote, '.']);
  // 초기 커밋
  mkdirSync(join(local, 'status', 'claims'), { recursive: true });
  writeFileSync(join(local, 'README.md'), '# test relay\n');
  writeFileSync(join(local, 'status', 'claims', 'INIT.json'), '{"state":"done"}\n');
  g(local, ['add', '.']);
  g(local, ['commit', '-m', 'init']);
  g(local, ['push', 'origin', 'HEAD:main']);
  return { remote, local };
}

function withTmp(fn) {
  const tmp = mkdtempSync(join(tmpdir(), 'hr-mg-'));
  try { return fn(tmp); } finally {
    try { rmSync(tmp, { recursive: true, force: true }); } catch { /* noop */ }
  }
}

function assert(ok, msg) {
  if (!ok) { console.error(`  FAIL · ${msg}`); throw new Error(msg); }
  console.log(`  OK · ${msg}`);
}

// --- Case A ---

export function caseA() {
  console.log('[selftest-main-guard-a] 사고 A 재현: 허브가 fix/* 생성 + 커밋, 러너가 그 위에 claim push');
  return withTmp((tmp) => {
    const { local } = initRemote(tmp);
    const runnerHome = join(tmp, 'runner-home');
    mkdirSync(runnerHome, { recursive: true });

    // 허브가 fix/* 브랜치 만들고 러너 폴더에 커밋.
    g(local, ['checkout', '-b', 'fix/FAKE-1-ci-watch']);
    mkdirSync(join(local, 'scripts'), { recursive: true });
    writeFileSync(join(local, 'scripts', 'hub-runner-v8.X.mjs'), '// hub-written\n');
    g(local, ['add', 'scripts/hub-runner-v8.X.mjs']);
    g(local, ['commit', '-m', 'fix(FAKE-1): ci-watch']);
    // 러너도 그 위에 claim 2개 커밋.
    writeFileSync(join(local, 'status', 'claims', 'CLAIM-A.json'), '{"id":"CLAIM-A","state":"started"}\n');
    g(local, ['add', 'status/claims/CLAIM-A.json']);
    g(local, ['commit', '-m', 'claim: CLAIM-A started']);
    writeFileSync(join(local, 'status', 'claims', 'CLAIM-B.json'), '{"id":"CLAIM-B","state":"started"}\n');
    g(local, ['add', 'status/claims/CLAIM-B.json']);
    g(local, ['commit', '-m', 'claim: CLAIM-B started']);

    // 진단: violated=true, onMain=false.
    const impl = createDefaultImpl(local);
    const diag = detectViolation({ repoRoot: local, impl });
    assert(diag.violated, '복구 전 violated=true');
    assert(diag.onMain === false, '복구 전 onMain=false');
    assert(diag.headRef === 'fix/FAKE-1-ci-watch', '복구 전 HEAD=fix/*');

    // 복구.
    const r = assertMainAtTickStart({ repoRoot: local, runnerHome, impl, logFn: (m) => console.log(`    [log] ${m}`) });
    assert(r.ok, '복구 후 ok=true');
    assert(r.rescue && r.rescue.rescueBranch.startsWith('rescue-'), `rescue 브랜치 생성됨 (${r.rescue?.rescueBranch})`);

    // 사후: HEAD=main, rebase/merge 없음.
    const after = detectViolation({ repoRoot: local, impl });
    assert(after.onMain, '복구 후 HEAD=main');
    assert(!after.rebaseMerge && !after.rebaseApply, '복구 후 rebase 디렉터리 없음');
    assert(!after.mergeHead, '복구 후 MERGE_HEAD 없음');
    assert(after.unmerged.length === 0, '복구 후 unmerged=0');

    // 사후: 러너가 만든 claim 파일 중 origin/main 에 없는 건 재적용되었는지 확인.
    // (origin/main 에는 INIT.json 만 있으므로 CLAIM-A/B 가 로컬에 복원되어야 함)
    const claimA = existsSync(join(local, 'status', 'claims', 'CLAIM-A.json'));
    const claimB = existsSync(join(local, 'status', 'claims', 'CLAIM-B.json'));
    assert(claimA, 'CLAIM-A.json runner-scope 재적용');
    assert(claimB, 'CLAIM-B.json runner-scope 재적용');

    // 사후: manifest.json 존재.
    const rescueTag = r.rescue.tag;
    const manifest = JSON.parse(readFileSync(join(runnerHome, 'rescue', rescueTag, 'manifest.json'), 'utf8'));
    assert(manifest.diag.headRef === 'fix/FAKE-1-ci-watch', 'manifest 에 복구 전 HEAD 기록');
    assert(Array.isArray(manifest.actions) && manifest.actions.length > 0, 'manifest.actions 기록됨');
  });
}

// --- Case B ---

export function caseB() {
  console.log('[selftest-main-guard-b] 사고 B 재현: .git/rebase-merge 디렉터리 잔존 (노트북 뚜껑 닫힘)');
  return withTmp((tmp) => {
    const { local } = initRemote(tmp);
    const runnerHome = join(tmp, 'runner-home');
    mkdirSync(runnerHome, { recursive: true });

    // 로컬 커밋 1개 → origin 에서 바꿔서 diverge 만듦.
    writeFileSync(join(local, 'status', 'claims', 'CLAIM-B1.json'), '{"state":"started"}\n');
    g(local, ['add', '.']);
    g(local, ['commit', '-m', 'local claim']);

    // origin 에 같은 파일 다른 내용으로 쌓음 (충돌 유발).
    const other = join(tmp, 'other');
    g(tmp, ['clone', join(tmp, 'remote.git'), 'other']);
    writeFileSync(join(other, 'status', 'claims', 'CLAIM-B1.json'), '{"state":"done"}\n');
    g(other, ['add', '.']);
    g(other, ['-c', 'user.email=t@t', '-c', 'user.name=tester', 'commit', '-m', 'origin claim']);
    g(other, ['push', 'origin', 'HEAD:main']);
    g(local, ['fetch', 'origin', 'main']);

    // rebase 시작 → 충돌 → 정상적이면 abort 하지만 여기선 "뚜껑 닫힘" 시뮬레이션.
    try { g(local, ['rebase', 'origin/main']); } catch { /* 충돌 — 예상 */ }
    assert(existsSync(join(local, '.git', 'rebase-merge')) || existsSync(join(local, '.git', 'rebase-apply')), '사전 조건: rebase 디렉터리 존재');

    const impl = createDefaultImpl(local);
    const diag = detectViolation({ repoRoot: local, impl });
    assert(diag.violated, '복구 전 violated=true');
    assert(diag.rebaseMerge || diag.rebaseApply, '복구 전 rebase 진행 감지');

    const r = assertMainAtTickStart({ repoRoot: local, runnerHome, impl, logFn: (m) => console.log(`    [log] ${m}`) });
    assert(r.ok, '복구 후 ok=true');

    const after = detectViolation({ repoRoot: local, impl });
    assert(after.onMain, '복구 후 HEAD=main');
    assert(!after.rebaseMerge && !after.rebaseApply, '복구 후 rebase 디렉터리 제거됨');
    assert(after.unmerged.length === 0, '복구 후 unmerged=0');
    // CLAIM-B1.json 은 origin/main 에 이미 있으므로 재적용하지 않음(skip).
  });
}

// --- Case C ---

export function caseC() {
  console.log('[selftest-main-guard-c] 사고 C 재현: untracked 파일 때문에 rebase --abort 가 would-overwrite 실패');
  return withTmp((tmp) => {
    const { local } = initRemote(tmp);
    const runnerHome = join(tmp, 'runner-home');
    mkdirSync(runnerHome, { recursive: true });

    // 1) rebase-merge 디렉터리를 만들어 "rebase in progress" 로 위장.
    //    (실제 사고 C 는 pull 중단 상태였으므로 더 간단히 재현.)
    const rebaseDir = join(local, '.git', 'rebase-merge');
    mkdirSync(rebaseDir, { recursive: true });
    writeFileSync(join(rebaseDir, 'head-name'), 'refs/heads/main\n');
    writeFileSync(join(rebaseDir, 'onto'), g(local, ['rev-parse', 'HEAD']).trim() + '\n');
    writeFileSync(join(rebaseDir, 'interactive'), '\n');

    // 2) 오케가 되돌려 둔 untracked 파일 (스코프 밖).
    mkdirSync(join(local, 'docs'), { recursive: true });
    writeFileSync(join(local, 'docs', 'kyu-notes.md'), '# kyu 작업 메모 — 러너가 지워버리면 안 됨\n'.repeat(5));
    assert(existsSync(join(local, 'docs', 'kyu-notes.md')), '사전 조건: untracked 파일 존재');

    const impl = createDefaultImpl(local);
    const diag = detectViolation({ repoRoot: local, impl });
    assert(diag.violated, '복구 전 violated=true (rebase 진행)');

    const r = assertMainAtTickStart({ repoRoot: local, runnerHome, impl, logFn: (m) => console.log(`    [log] ${m}`) });
    assert(r.ok, '복구 후 ok=true');

    const after = detectViolation({ repoRoot: local, impl });
    assert(after.onMain, '복구 후 HEAD=main');
    assert(!after.rebaseMerge, '복구 후 rebase-merge 디렉터리 제거됨');

    // untracked 파일은 작업 트리에서 사라졌지만 rescue 디렉터리에 보존되어 있어야 함.
    const rescueTag = r.rescue.tag;
    const preservedPath = join(runnerHome, 'rescue', rescueTag, 'files', 'docs', 'kyu-notes.md');
    assert(existsSync(preservedPath), `untracked 파일 rescue 보존 · ${preservedPath}`);
    // 작업 트리에는 더 이상 없음.
    assert(!existsSync(join(local, 'docs', 'kyu-notes.md')), '작업 트리에서는 clean 됨');

    // manifest 에 preserved 레코드 1건 이상.
    const manifest = JSON.parse(readFileSync(join(runnerHome, 'rescue', rescueTag, 'manifest.json'), 'utf8'));
    assert(Array.isArray(manifest.preserved) && manifest.preserved.length >= 1, 'manifest.preserved 기록');
  });
}

// --- safe-push ---

export function caseSafePush() {
  console.log('[selftest-safe-push] 러너 자기 push 가 rebase 없이 ours-merge 로 성공');
  return withTmp((tmp) => {
    const { local } = initRemote(tmp);
    // 로컬 claim 커밋 1개.
    writeFileSync(join(local, 'status', 'claims', 'SP-1.json'), '{"id":"SP-1","state":"started"}\n');
    g(local, ['add', '.']);
    g(local, ['commit', '-m', 'claim: SP-1']);

    // origin 에 다른 claim 밀어 behind=1 만들기.
    const other = join(tmp, 'other');
    g(tmp, ['clone', join(tmp, 'remote.git'), 'other']);
    writeFileSync(join(other, 'status', 'claims', 'SP-OTHER.json'), '{"state":"done"}\n');
    g(other, ['add', '.']);
    g(other, ['commit', '-m', 'origin claim']);
    g(other, ['push', 'origin', 'HEAD:main']);
    g(local, ['fetch', 'origin', 'main']);

    const r = safeRunnerPush({ git: safePushCreateGit(local), timeoutMs: 15_000 });
    assert(r.ok, `safe push ok · steps=${JSON.stringify(r.steps)}`);

    // rebase 디렉터리가 **남아 있지 않아야** 한다.
    assert(!existsSync(join(local, '.git', 'rebase-merge')), 'rebase-merge 디렉터리 없음');
    assert(!existsSync(join(local, '.git', 'rebase-apply')), 'rebase-apply 디렉터리 없음');

    // SP-1 과 SP-OTHER 둘 다 origin/main 에 존재.
    g(local, ['fetch', 'origin', 'main']);
    const originFiles = g(local, ['ls-tree', '-r', '--name-only', 'origin/main']).trim().split('\n');
    assert(originFiles.includes('status/claims/SP-1.json'), 'SP-1 origin/main 에 push 됨');
    assert(originFiles.includes('status/claims/SP-OTHER.json'), 'SP-OTHER origin/main 유지됨');
  });
}

// --- hub-preamble ---

export function caseHubPreamble() {
  console.log('[selftest-hub-preamble] REPORT_PATH + worktree-only 2 조항 합성');
  const p = buildHubPreamble({ absReportPath: '/tmp/x.md' });
  assert(p.includes('/tmp/x.md'), 'ABS_PATH 치환');
  assert(!p.includes('${ABS_PATH}'), '미치환 토큰 없음');
  assert(p.includes('~/projects/curiocity-relay-wts/'), 'worktree 경로 포함');
  assert(p.includes('러너 폴더'), '러너 폴더 보호 조항 포함');

  // worktree rule 끌 수 있음.
  const p2 = buildHubPreamble({ absReportPath: '/tmp/x.md', includeWorktreeRule: false });
  assert(!p2.includes('~/projects/curiocity-relay-wts/'), 'includeWorktreeRule=false 로 제외');
}

// --- sleep-tracker ---

export function caseSleepTracker() {
  console.log('[selftest-sleep-tracker] tick gap 감지 + 구간 누적');
  return withTmp((tmp) => {
    // tick observeTick 은 내부 시간 비교라 직접 검증은 어려움 — accumulatedSleepMs 를
    // ndjson 파일 직접 수정으로 검증한다.
    const t = createSleepTracker({ runnerHome: tmp, pollMs: 1000, sleepGapMultiplier: 4 });
    const now = Date.now();
    const line1 = { ts: new Date(now - 60_000).toISOString(), gap_ms: 30_000 };
    const line2 = { ts: new Date(now - 30_000).toISOString(), gap_ms: 120_000 };
    writeFileSync(t._logFile, JSON.stringify(line1) + '\n' + JSON.stringify(line2) + '\n');
    const total = t.accumulatedSleepMs(new Date(now - 120_000).toISOString(), now);
    assert(total === 150_000, `누적 150000ms 기대 · got=${total}`);
    const partial = t.accumulatedSleepMs(new Date(now - 45_000).toISOString(), now);
    assert(partial === 120_000, `부분 구간 120000ms · got=${partial}`);
  });
}

// --- Case D: rescue 브랜치 생성 실패 주입 ---

export function caseD() {
  console.log('[selftest-main-guard-d] 보존 실패: rescue 브랜치 생성 실패 → reset/checkout 차단');
  return withTmp((tmp) => {
    const { local } = initRemote(tmp);
    const runnerHome = join(tmp, 'runner-home');
    mkdirSync(runnerHome, { recursive: true });

    // HEAD를 fix/* 브랜치로 (violated) + untracked file
    g(local, ['checkout', '-b', 'fix/FAKE-D-branch-fail']);
    mkdirSync(join(local, 'docs'), { recursive: true });
    writeFileSync(join(local, 'docs', 'memo.md'), 'do not destroy\n');

    const headBefore = g(local, ['rev-parse', 'HEAD']).trim();
    const branchBefore = g(local, ['symbolic-ref', '--short', 'HEAD']).trim();

    // rescue branch 생성 실패 주입
    const baseImpl = createDefaultImpl(local);
    const impl = {
      ...baseImpl,
      tryGit: (args, opts) => {
        if (args[0] === 'branch' && args[1] === '-f' && args[2]?.startsWith('rescue-')) {
          return { ok: false, err: 'injected: branch -f failed' };
        }
        return baseImpl.tryGit(args, opts);
      },
    };

    const r = assertMainAtTickStart({ repoRoot: local, runnerHome, impl, logFn: (m) => console.log(`    [log] ${m}`) });

    assert(r.rescue?.rescued === false, 'rescued=false');
    assert(r.rescue?.aborted === true, 'aborted=true');
    assert(r.ok === false, 'ok=false');

    // 작업 트리·HEAD 미변경 확인
    const headAfter = g(local, ['rev-parse', 'HEAD']).trim();
    assert(headAfter === headBefore, `HEAD 미변경 · before=${headBefore} after=${headAfter}`);
    const branchAfter = g(local, ['symbolic-ref', '--short', 'HEAD']).trim();
    assert(branchAfter === branchBefore, `브랜치 미변경 · ${branchAfter}`);
    assert(existsSync(join(local, 'docs', 'memo.md')), 'untracked 파일 유지');

    // events/ 에 aborted 기록
    const evFiles = readdirSync(join(local, 'events')).filter(f => f.includes('aborted'));
    assert(evFiles.length >= 1, `events/ aborted 기록 · ${JSON.stringify(evFiles)}`);
  });
}

// --- Case E: untracked 복사 실패 주입 ---

export function caseE() {
  console.log('[selftest-main-guard-e] 보존 실패: untracked 복사 실패 → reset/checkout 차단');
  return withTmp((tmp) => {
    const { local } = initRemote(tmp);
    const runnerHome = join(tmp, 'runner-home');
    mkdirSync(runnerHome, { recursive: true });

    // HEAD를 fix/* 브랜치로 (violated) + untracked file
    g(local, ['checkout', '-b', 'fix/FAKE-E-copy-fail']);
    mkdirSync(join(local, 'docs'), { recursive: true });
    writeFileSync(join(local, 'docs', 'notes.md'), 'important notes\n');

    const headBefore = g(local, ['rev-parse', 'HEAD']).trim();
    const branchBefore = g(local, ['symbolic-ref', '--short', 'HEAD']).trim();

    // copyFileSync 실패 주입 (notes.md 복사 시도 시)
    const baseImpl = createDefaultImpl(local);
    const impl = {
      ...baseImpl,
      copyFileSync: (src, dst) => {
        if (src.includes('notes.md')) throw new Error('injected: copy failed');
        return baseImpl.copyFileSync(src, dst);
      },
    };

    const r = assertMainAtTickStart({ repoRoot: local, runnerHome, impl, logFn: (m) => console.log(`    [log] ${m}`) });

    assert(r.rescue?.rescued === false, 'rescued=false');
    assert(r.rescue?.aborted === true, 'aborted=true');
    assert(r.ok === false, 'ok=false');

    // 작업 트리·HEAD 미변경 확인
    const headAfter = g(local, ['rev-parse', 'HEAD']).trim();
    assert(headAfter === headBefore, `HEAD 미변경 · before=${headBefore} after=${headAfter}`);
    const branchAfter = g(local, ['symbolic-ref', '--short', 'HEAD']).trim();
    assert(branchAfter === branchBefore, `브랜치 미변경 · ${branchAfter}`);
    assert(existsSync(join(local, 'docs', 'notes.md')), 'untracked 파일 유지 (clean 차단됨)');

    // events/ 에 aborted 기록
    const evFiles = readdirSync(join(local, 'events')).filter(f => f.includes('aborted'));
    assert(evFiles.length >= 1, `events/ aborted 기록 · ${JSON.stringify(evFiles)}`);
  });
}

export async function runSelftest(which) {
  try {
    switch (which) {
      case 'A': caseA(); break;
      case 'B': caseB(); break;
      case 'C': caseC(); break;
      case 'D': caseD(); break;
      case 'E': caseE(); break;
      case 'safe-push': caseSafePush(); break;
      case 'hub-preamble': caseHubPreamble(); break;
      case 'sleep-tracker': caseSleepTracker(); break;
      default:
        console.error(`unknown selftest: ${which}`);
        return false;
    }
    console.log(`[selftest-main-guard-${which}] OK`);
    return true;
  } catch (e) {
    console.error(`[selftest-main-guard-${which}] FAIL · ${e.message}`);
    return false;
  }
}
