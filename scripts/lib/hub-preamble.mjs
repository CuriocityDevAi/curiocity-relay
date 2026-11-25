// scripts/lib/hub-preamble.mjs · M1-1125-C (v8.3)
//
// 허브 세션에 주입되는 상시 고정 preamble 조립.
//
// 세 조항을 합친다:
//   ① REPORT_PATH (M1-1124-G): 리포트는 isolated 경로에만 쓴다 · git commit/push 금지.
//   ② relay WORKTREE 전용 (M1-1124-N): relay(curiocity-relay) 작업은 반드시
//      ~/projects/curiocity-relay-wts/<ID> worktree 에서. 러너 폴더
//      (~/projects/curiocity-relay) 에서는 브랜치 생성 · 커밋 · rebase 금지.
//   ③ "리포트는 마지막에 한 번" (M1-1125-C): 중간 리포트 제출로 세션 kill 유발 방지.
//
// 오늘 사고 A 재현:
//   허브 M1-1124-J 가 러너 폴더(~/projects/curiocity-relay) 에서
//   `git switch -c fix/M1-1124-J-ci-watch-deploy` 후 커밋 → 러너 claim push 가 그 위에 쌓임 →
//   `pull --rebase` 충돌 → push 전면 정지.
//
// 이 preamble 은 프롬프트 맨 앞에 붙어 허브(= claude 세션) 가 러너 폴더를 수정하지 않도록
// 강하게 유도한다. runtime 가드(main-guard) 가 사후 복구를 맡으므로 2중 방어.
//
// ⚠ 11-25 사고(오케 긴급 수정): preamble 은 cmux 화면에 셸 명령 인자('...')로 타이핑된다.
//   조항 사이를 '\n\n' 으로 이으면 줄바꿈이 Enter 로 들어가 zsh 가 `quote>` 상태에 갇히고
//   claude 가 시작되지 않는다(전 허브 정지 · pane busy 로 오판). 반드시 한 줄로 이을 것.

export const DEFAULT_REPORT_PATH_PREFIX =
  '리포트는 반드시 ${ABS_PATH} 에만 쓴다. 어떤 git 리포 안에도 리포트를 쓰지 말고 리포트를 commit/push 하지 말 것(올리는 건 러너). 프롬프트 [REPORT] 의 경로 지시보다 이 문구가 우선.';

export const DEFAULT_WORKTREE_RULE =
  'relay(curiocity-relay) 작업은 반드시 ~/projects/curiocity-relay-wts/<ID> worktree 에서만. ' +
  '러너 폴더(~/projects/curiocity-relay)에서는 브랜치 생성 · 커밋 · rebase · stash · reset 전부 금지. ' +
  '러너 폴더는 러너의 상시 main 체크아웃이며 claim·heartbeat·report push 전용이다. ' +
  '러너 폴더에 쓴 모든 변경은 다음 tick 에 자동 복구(main 강제 리셋) 되어 사라진다.';

// M1-1125-C: 중간 리포트 제출(세션 중 파일 저장 + git touch) → head-moved 오탐 kill 재발 방지 유도.
export const DEFAULT_REPORT_ONCE_RULE =
  '리포트는 마지막에 한 번만 저장한다. 중간에 리포트 파일을 만들거나 수정했다가 지우지 말 것. 작업·커밋·PR 다 끝난 뒤 최종 요약만 리포트 파일에 쓴다.';

export function buildHubPreamble({
  absReportPath = null,
  reportPath = null,
  reportPrefix = DEFAULT_REPORT_PATH_PREFIX,
  worktreeRule = DEFAULT_WORKTREE_RULE,
  reportOnceRule = DEFAULT_REPORT_ONCE_RULE,
  includeWorktreeRule = true,
  includeReportOnce = true,
} = {}) {
  // M1-1125-C: `reportPath` alias (selftest 호환) — absReportPath 미지정 시 fallback.
  const abs = absReportPath || reportPath || null;
  const parts = [];
  if (abs) {
    const t = typeof reportPrefix === 'string' && reportPrefix.trim() ? reportPrefix : DEFAULT_REPORT_PATH_PREFIX;
    parts.push(t.replace(/\$\{ABS_PATH\}/g, abs));
  }
  if (includeWorktreeRule && worktreeRule) parts.push(worktreeRule);
  if (includeReportOnce && reportOnceRule) parts.push(reportOnceRule);
  const joined = parts.join(' ').replace(/[\r\n]+/g, ' ');
  // M1-1125-C: 개행 0 어설션 (837c6c1 재발 방지). cmux 타이핑 시 zsh quote> 에 갇히는 것 원천 차단.
  if (joined.includes('\n') || joined.includes('\r')) {
    throw new Error(`[hub-preamble] FATAL: 조립된 preamble 에 개행이 섞여 있음 (837c6c1 재발 신호) · len=${joined.length}`);
  }
  return joined;
}
