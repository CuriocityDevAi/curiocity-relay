PASS

# M1-1124-Q report · 2026-11-24

## 변경 파일

- `scripts/lib/main-guard.mjs` (M1-1124-Q)
- `scripts/test/hub-runner-main-guard.test.mjs` (M1-1124-Q)

커밋: `405ae292b` → push → `origin/fix/M1-1124-N-runner-main-guard` (PR #27)

---

## REQ1 구현

`performRescue` 에 `abortRescue(reason)` 헬퍼를 추가하고, 보존 단계 3곳에 가드를 삽입.

| 단계 | 조건 | 조치 |
|------|------|------|
| (b) rescue 브랜치 생성 | `tryGit(['branch', '-f', ...]).ok === false` 또는 `headSha === null` | `abortRescue` → 조기 반환 |
| (c) untracked/modified 복사 | `copyFileSync` throw | `copyError` 플래그 → 루프 후 `abortRescue` |
| manifest 기록 | `writeFileSync` throw | `abortRescue` → 조기 반환 |

`abortRescue` 는 reset/checkout/clean 없이:
1. `events/runner-main-guard-aborted-<tag>.md` 에 "보존 실패로 복구 보류" 기록 (best-effort)
2. `{ rescued: false, aborted: true, reason }` 반환

manifest 기록 가드는 **reset 전** 에 위치 (보존 완료 후, reset 직전).
reset 후 final manifest overwrite 는 best-effort (try/catch noop).

`assertMainAtTickStart`: `res.aborted` 시 `{ ok: false, aborted: true, reason, diag, rescue: res }` 조기 반환 (기존 `detectViolation(after)` skip).

---

## Selftest 실행 로그

### Case A
```
[selftest-main-guard-a] 사고 A 재현: 허브가 fix/* 생성 + 커밋, 러너가 그 위에 claim push
  OK · 복구 전 violated=true
  OK · 복구 전 onMain=false
  OK · 복구 전 HEAD=fix/*
    [log] main-guard rescue · at=2026-11-24T16:25:00.213Z · tag=20261124T162500Z · head_before=fix/FAKE-1-ci-watch · rebase=false · merge=false · unmerged=0 · foreign_preserved=0 · runner_reapplied=2
  OK · 복구 후 ok=true
  OK · rescue 브랜치 생성됨 (rescue-20261124T162500Z)
  OK · 복구 후 HEAD=main
  OK · 복구 후 rebase 디렉터리 없음
  OK · 복구 후 MERGE_HEAD 없음
  OK · 복구 후 unmerged=0
  OK · CLAIM-A.json runner-scope 재적용
  OK · CLAIM-B.json runner-scope 재적용
  OK · manifest 에 복구 전 HEAD 기록
  OK · manifest.actions 기록됨
[selftest-main-guard-A] OK
```

### Case B
```
[selftest-main-guard-b] 사고 B 재현: .git/rebase-merge 디렉터리 잔존 (노트북 뚜껑 닫힘)
  OK · 사전 조건: rebase 디렉터리 존재
  OK · 복구 전 violated=true
  OK · 복구 전 rebase 진행 감지
    [log] main-guard rescue · at=2026-11-24T16:25:04.356Z · tag=20261124T162504Z · head_before=(detached) · rebase=true · merge=false · unmerged=1 · foreign_preserved=0 · runner_reapplied=0
  OK · 복구 후 ok=true
  OK · 복구 후 HEAD=main
  OK · 복구 후 rebase 디렉터리 제거됨
  OK · 복구 후 unmerged=0
[selftest-main-guard-B] OK
```

### Case C
```
[selftest-main-guard-c] 사고 C 재현: untracked 파일 때문에 rebase --abort 가 would-overwrite 실패
  OK · 사전 조건: untracked 파일 존재
  OK · 복구 전 violated=true (rebase 진행)
    [log] main-guard rescue · at=2026-11-24T16:25:05.389Z · tag=20261124T162505Z · head_before=main · rebase=true · merge=false · unmerged=0 · foreign_preserved=1 · runner_reapplied=0
  OK · 복구 후 ok=true
  OK · 복구 후 HEAD=main
  OK · 복구 후 rebase-merge 디렉터리 제거됨
  OK · untracked 파일 rescue 보존 · /var/folders/.../files/docs/kyu-notes.md
  OK · 작업 트리에서는 clean 됨
  OK · manifest.preserved 기록
[selftest-main-guard-C] OK
```

### Case D (신규: rescue 브랜치 생성 실패 주입)
```
[selftest-main-guard-d] 보존 실패: rescue 브랜치 생성 실패 → reset/checkout 차단
    [log] 보존 실패로 복구 보류 · at=2026-11-24T16:25:14.858Z · tag=20261124T162514Z · reason=rescue-branch failed: injected: branch -f failed
  OK · rescued=false
  OK · aborted=true
  OK · ok=false
  OK · HEAD 미변경 · before=23cb49826372e96ec48acfd31e5b97f9484c9b57 after=23cb49826372e96ec48acfd31e5b97f9484c9b57
  OK · 브랜치 미변경 · fix/FAKE-D-branch-fail
  OK · untracked 파일 유지
  OK · events/ aborted 기록 · ["runner-main-guard-aborted-20261124T162514Z.md"]
[selftest-main-guard-D] OK
```

### Case E (신규: untracked 복사 실패 주입)
```
[selftest-main-guard-e] 보존 실패: untracked 복사 실패 → reset/checkout 차단
    [log] 보존 실패로 복구 보류 · at=2026-11-24T16:25:15.272Z · tag=20261124T162515Z · reason=copy failed · docs/notes.md: injected: copy failed
  OK · rescued=false
  OK · aborted=true
  OK · ok=false
  OK · HEAD 미변경 · before=56f7c485a4bbdf2252d58eec46d1d167497441bd after=56f7c485a4bbdf2252d58eec46d1d167497441bd
  OK · 브랜치 미변경 · fix/FAKE-E-copy-fail
  OK · untracked 파일 유지 (clean 차단됨)
  OK · events/ aborted 기록 · ["runner-main-guard-aborted-20261124T162515Z.md"]
[selftest-main-guard-E] OK
```

### safe-push
```
[selftest-safe-push] 러너 자기 push 가 rebase 없이 ours-merge 로 성공
  OK · safe push ok · steps=[{"step":"fetch","ok":true,"err":null},{"step":"ab","ahead":1,"behind":1},{"step":"merge-ours","ok":true,"err":null},{"step":"push","ok":true,"err":null}]
  OK · rebase-merge 디렉터리 없음
  OK · rebase-apply 디렉터리 없음
  OK · SP-1 origin/main 에 push 됨
  OK · SP-OTHER origin/main 유지됨
[selftest-main-guard-safe-push] OK
```

### hub-preamble
```
[selftest-hub-preamble] REPORT_PATH + worktree-only 2 조항 합성
  OK · ABS_PATH 치환
  OK · 미치환 토큰 없음
  OK · worktree 경로 포함
  OK · 러너 폴더 보호 조항 포함
  OK · includeWorktreeRule=false 로 제외
[selftest-main-guard-hub-preamble] OK
```

### sleep-tracker
```
[selftest-sleep-tracker] tick gap 감지 + 구간 누적
  OK · 누적 150000ms 기대 · got=150000
  OK · 부분 구간 120000ms · got=120000
[selftest-main-guard-sleep-tracker] OK
```

### preflight (--selftest-selfupdate-preflight)
```
[selftest-selfupdate-preflight] node --check hub-runner-v8.2.mjs → status=0
[selftest-selfupdate-preflight] selftest --selftest-stale-lock → status=0 [selftest-stale-lock] OK · 사망 PID lock 즉시 stale 처리 · 10분 대기 없음
[selftest-selfupdate-preflight] selftest --selftest-merge-fail3 → status=0 [selftest-merge-fail3] OK · 연속 3회 → summarized=true · 4회 반복 억제 · 키 변경 시 리셋
[selftest-selfupdate-preflight] selftest --selftest-report-path-off → status=0 [selftest-report-path-off] OK · flag off → false · 기본 on · ${ABS_PATH} 치환 정상
[selftest-selfupdate-preflight] OK · 자기 자신으로 node --check + 3 selftest 통과
```

---

## 총계

| 테스트 | 결과 |
|--------|------|
| A (fix/* 브랜치 + claim 2건) | PASS |
| B (rebase-merge 잔존) | PASS |
| C (untracked → would-overwrite) | PASS |
| D (rescue branch 실패 주입) | PASS |
| E (copy 실패 주입) | PASS |
| safe-push | PASS |
| hub-preamble | PASS |
| sleep-tracker | PASS |
| preflight (node --check + stale-lock + merge-fail3 + report-path-off) | PASS |
