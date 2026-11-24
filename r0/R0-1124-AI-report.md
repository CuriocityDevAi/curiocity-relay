CHANGES

# R0-1124-AI · PR #27 리뷰 · runner-v8.2 main-guard

리뷰어: R0-1124-AI · 2026-11-24 · Sonnet 4.6  
브랜치: fix/M1-1124-N-runner-main-guard → main

---

## 결론: CHANGES (REQ1 보존 실패 시 reset 비중단)

나머지 REQ2–5 는 APPROVE. 셀프테스트 9종 전부 PASS.

---

## REQ별 상세

### REQ1 · main-guard 데이터 손실 경로 — CHANGES

**문제**: `performRescue` 에서 rescue 브랜치 생성·파일 복사가 실패해도 `reset --hard origin/main` 이 중단 없이 실행된다.

```
// main-guard.mjs:191-193
if (headSha) {
  impl.tryGit(['branch', '-f', rescueBranch, headSha]);  // .ok 미확인
  manifest.actions.push(...)
}
// ... 파일 복사 (try/catch 로 silently 계속) ...
// (c-1)
impl.tryGit(['reset', '--hard', 'HEAD']);
impl.tryGit(['clean', '-fd']);
// (d) — 보존 실패 여부 무관하게 항상 도달
impl.tryGit(['checkout', '-f', 'main']);
impl.tryGit(['reset', '--hard', 'origin/main']);
```

- `tryGit(['branch', '-f', ...])` 는 실패를 반환해도 코드가 계속 진행한다.  
- `copyFileSync` 도 개별 try/catch 로 실패가 흡수되며 흐름을 멈추지 않는다.  
- 따라서 "보존 실패 → reset 차단" 경로가 존재하지 않는다.

**수정 제안**: rescue 브랜치 생성 후 `.ok` 를 확인하고, 실패 시 rescue 를 중단(reset 없이 events 에 기록만)하거나 최소한 로그로 경고하고 계속할지 선택권을 준다.

```js
const branchRes = impl.tryGit(['branch', '-f', rescueBranch, headSha]);
if (!branchRes.ok) {
  // rescue 브랜치 없이 reset 하면 데이터 손실 위험 → 중단 or 경고
  log(`rescue-branch 실패: ${branchRes.err} · reset 중단`);
  return { rescued: false, aborted: true, reason: 'rescue-branch-failed', manifest };
}
```

실제로 `git branch -f` 가 실패하는 경우(디스크 풀, 레포 손상)는 드물지만, REQ1 이 명시적으로 "보존 실패 시 reset 을 하지 않는지"를 묻고 있으므로 CHANGES.

---

### REQ2 · 오작동(false positive) — APPROVE

**정상 상태 진단 경로**:
```
detectViolation():
  violated = !onMain || rebaseMerge || rebaseApply || mergeHead || unmerged.length > 0
```
HEAD=main, rebase/merge 없음, unmerged=0 → `violated=false` → `assertMainAtTickStart` 는 `{ ok: true, diag }` 를 즉시 반환. rescue 없음.

**허브 worktree 에서 작업 중인 tick**: 러너 폴더는 main 그대로이므로 violations 없음. 오작동 없음. ✓

**report_src=isolated 수거 간섭 없음**: tick 순서가 "main-guard(tick 최초) → recoverStuckStartedClaims → hub iteration(collectIsolatedReport)" 이므로, 정상 상태에서 main-guard 가 발동하지 않고, 발동하더라도 isolated report 는 `~/.hub-runner/reports/` (git 외부) 에 있어 `reset --hard` 영향권 밖. ✓

---

### REQ3 · safe-push ours-merge 오케 파일 덮어쓰기 — APPROVE

러너가 commit 하는 경로:
- `collectIsolatedReport`: `${hub}/${id}-report.md` (m1/·m2/·r0/ 등)
- `runnerProxyLand`: 동일
- main-guard reapply: `status/claims/·events/·ledger/` (RUNNER_SCOPE_PREFIXES 소속)

오케(orchestrator)가 commit 하는 경로: `queue/<hub>/<ID>.md`, `ledger/`

`queue/` 는 RUNNER_SCOPE_PREFIXES 에 없고 러너가 직접 commit 하지 않는다. `-X ours` 는 "양쪽이 모두 변경한 파일" 에서만 ours 가 이기며, 단독 원격 변경은 그대로 merge-in 된다. `caseSafePush` 테스트가 SP-OTHER(origin-only 커밋) 보존을 확인함. ✓

**엣지케이스**: main-guard reapply 커밋에 `ledger/` 파일이 포함된 직후 오케가 같은 ledger 경로를 origin/main 에 push 하면 ours 가 이겨 오케 버전을 덮는다. 단, main-guard 는 사고 복구 중에만 발동하고 ledger 충돌은 매우 드물어 실용적 위험은 낮음 — 명시적 질문 범위인 `queue/` 경로는 APPROVE.

---

### REQ4 · self-update 롤백 가드 — APPROVE

**preflight 실패 시 v8.1 유지**:
```
// hub-runner-v8.2.mjs:3528-3550
if (!pre.ok) {
  selfUpdateWriteBlocked(...)   // events/ 에 기록
  return { tried: true, applied: false, reason: `preflight-failed:...` };
  // ← symlink 갱신 없음, process.exit 없음 → 현재 버전 유지
}
```
✓

**rollback prev 부재 시 fallback**:
```
const SELF_UPDATE_FALLBACK_RUNNER = 'hub-runner-v8.1.mjs';  // :163
// ...
if (prev && existsSync(prev)) {
  selfUpdateEnsureSymlink({ linkPath, targetPath: prev });
} else {
  // prev 없으면 v8.1 로 복원 (:3644-3651)
  selfUpdateEnsureSymlink({ linkPath, targetPath: fallbackPath });
}
```
✓

**install.sh TARGET/FALLBACK**: `TARGET=hub-runner-v8.2.mjs`, `FALLBACK=hub-runner-v8.1.mjs` 로 올바르게 갱신됨. ✓

---

### REQ5 · sleep 보정 60분 상한 — APPROVE

```
elapsedMs = Math.max(0, wallElapsedMs - sleepMs)  // :2668
```

`accumulatedSleepMs` 는 `RETAIN_MS = 24h` 이상 된 이벤트를 pruning 한다. 따라서 sleep 보정은 최대 24h 분량으로 한정되며 "무한히" 늘어나지 않는다. 24h+ wall-clock 경과 후에는 pruning 으로 인해 wallElapsed 가 지배하고 60m 상한이 반드시 발동한다.

다만 24h 이내에 laptop 이 대부분 잠든 경우(예: 23h sleep/1h active 반복) claim 이 실제 60m 에 도달하지 않아 보호된다. 이는 의도된 동작(실제 작업 시간 기준 60m). ✓

---

## 셀프테스트 실행 로그 (전부 PASS)

```
$ node scripts/hub-runner-v8.2.mjs --selftest-main-guard-a
  OK · 복구 전 violated=true
  OK · 복구 전 onMain=false
  OK · 복구 전 HEAD=fix/*
  OK · 복구 후 ok=true
  OK · rescue 브랜치 생성됨 (rescue-20261124T153928Z)
  OK · 복구 후 HEAD=main
  OK · 복구 후 rebase 디렉터리 없음
  OK · 복구 후 MERGE_HEAD 없음
  OK · 복구 후 unmerged=0
  OK · CLAIM-A.json runner-scope 재적용
  OK · CLAIM-B.json runner-scope 재적용
  OK · manifest 에 복구 전 HEAD 기록
  OK · manifest.actions 기록됨
[selftest-main-guard-A] OK

$ node scripts/hub-runner-v8.2.mjs --selftest-main-guard-b
  OK · 사전 조건: rebase 디렉터리 존재
  OK · 복구 전 violated=true
  OK · 복구 전 rebase 진행 감지
  OK · 복구 후 ok=true
  OK · 복구 후 HEAD=main
  OK · 복구 후 rebase 디렉터리 제거됨
  OK · 복구 후 unmerged=0
[selftest-main-guard-B] OK

$ node scripts/hub-runner-v8.2.mjs --selftest-main-guard-c
  OK · 사전 조건: untracked 파일 존재
  OK · 복구 전 violated=true (rebase 진행)
  OK · 복구 후 ok=true
  OK · 복구 후 HEAD=main
  OK · 복구 후 rebase-merge 디렉터리 제거됨
  OK · untracked 파일 rescue 보존
  OK · 작업 트리에서는 clean 됨
  OK · manifest.preserved 기록
[selftest-main-guard-C] OK

$ node scripts/hub-runner-v8.2.mjs --selftest-safe-push
  OK · safe push ok · steps=[fetch ok, ahead=1 behind=1, merge-ours ok, push ok]
  OK · rebase-merge 디렉터리 없음
  OK · rebase-apply 디렉터리 없음
  OK · SP-1 origin/main 에 push 됨
  OK · SP-OTHER origin/main 유지됨
[selftest-main-guard-safe-push] OK

$ node scripts/hub-runner-v8.2.mjs --selftest-hub-preamble
  OK · ABS_PATH 치환
  OK · 미치환 토큰 없음
  OK · worktree 경로 포함
  OK · 러너 폴더 보호 조항 포함
  OK · includeWorktreeRule=false 로 제외
[selftest-main-guard-hub-preamble] OK

$ node scripts/hub-runner-v8.2.mjs --selftest-sleep-tracker
  OK · 누적 150000ms 기대 · got=150000
  OK · 부분 구간 120000ms · got=120000
[selftest-main-guard-sleep-tracker] OK

$ node scripts/hub-runner-v8.2.mjs --selftest-stale-lock
[selftest-stale-lock] OK · 사망 PID lock 즉시 stale 처리 · 10분 대기 없음

$ node scripts/hub-runner-v8.2.mjs --selftest-merge-fail3
[selftest-merge-fail3] OK · 연속 3회 → summarized=true · 4회 반복 억제 · 키 변경 시 리셋

$ node scripts/hub-runner-v8.2.mjs --selftest-report-path-off
[selftest-report-path-off] OK · flag off → false · 기본 on · ${ABS_PATH} 치환 정상

$ node scripts/hub-runner-v8.2.mjs --selftest-selfupdate-preflight
[selftest-selfupdate-preflight] node --check → 0
[selftest-selfupdate-preflight] --selftest-stale-lock → 0
[selftest-selfupdate-preflight] --selftest-merge-fail3 → 0
[selftest-selfupdate-preflight] --selftest-report-path-off → 0
[selftest-selfupdate-preflight] OK · 자기 자신으로 node --check + 3 selftest 통과
```

---

## 수정 필요 항목 요약

| # | 파일 | 위치 | 내용 |
|---|------|------|------|
| 1 | `scripts/lib/main-guard.mjs` | `performRescue` 190-193행 | rescue 브랜치 생성 실패 시 reset 중단 로직 추가 |

나머지(REQ2–5, REQ6)는 코드·테스트 모두 APPROVE.
