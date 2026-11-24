PASS

# M1-1124-S · hub-runner-v8.2 main-guard D·E · 2026-11-25

워크트리: `~/projects/curiocity-relay-wts/M1-1124-S`  
브랜치: `fix/M1-1124-N-runner-main-guard` (PR #27)  
커밋: `572005495` fix(runner): M1-1124-S — main-guard D·E CLI 플래그·preflight·tick aborted pickup-skip

---

## R0-1124-AL CHANGES 3건 구현 확인

### CHANGES-1: D·E CLI 플래그 + dispatch + preflight

`scripts/hub-runner-v8.2.mjs`:
- line 369-370: `SELFTEST_MAIN_GUARD_D/E` 상수 추가 ✓
- line 423-424: usage guard 에 D·E 포함 ✓
- line 5749-5750: dispatch 블록에 D·E 분기 추가 ✓
- line 174-175: `DEFAULT_SELF_UPDATE_PREFLIGHT` 에 `--selftest-main-guard-d/e` 포함 ✓

### CHANGES-2: aborted 케이스 로그 TypeError 수정

`scripts/hub-runner-v8.2.mjs` line 3226-3235:
```js
if (!g.ok && g.aborted) {
  log('main-guard', `보존 실패로 복구 보류 · reason=${g.rescue?.reason || 'unknown'}`);
  mainGuardBlocked = true;
  lastGitState = { ...collectRelayGitState(), needs_human: true };
} else if (!g.ok && g.after) {
  log('main-guard', `복구 후에도 위반 남음 · head=${g.after.headRef} · ...`);
  mainGuardBlocked = true;
  lastGitState = { ...collectRelayGitState(), needs_human: true };
} else if (g.rescue) {
  log('main-guard', `복구 성공 · tag=${g.rescue.tag} · reapplied=${g.rescue.reapplied} · preserved=${g.rescue?.preserved?.length ?? 0}`);
}
```
`preserved.length` TypeError → `?.length ?? 0` + aborted 분기 분리 ✓

### CHANGES-3: aborted 상태 허브 픽업 중단

`scripts/hub-runner-v8.2.mjs` line 3269-3273:
```js
if (mainGuardBlocked) {
  log(hub, `main-guard blocked · 다음 tick 재시도`);
  setHubDecision(hub, 'skip:main-guard-blocked');
  continue;
}
```
`!g.ok` (aborted 또는 after 위반 잔존) 모두 `mainGuardBlocked=true` → tick 허브 픽업 스킵 ✓  
`needs_human=true` → `lastGitState` 에 기록 → all.json git_state 반영 ✓

---

## Selftest 실행 결과

### D (rescue branch 실패 주입)
```
[selftest-main-guard-d] 보존 실패: rescue 브랜치 생성 실패 → reset/checkout 차단
  OK · rescued=false
  OK · aborted=true
  OK · ok=false
  OK · HEAD 미변경 · fix/FAKE-D-branch-fail
  OK · 브랜치 미변경 · fix/FAKE-D-branch-fail
  OK · untracked 파일 유지
  OK · events/ aborted 기록 · ["runner-main-guard-aborted-20261124T171046Z.md"]
[selftest-main-guard-D] OK
```

### E (copy 실패 주입)
```
[selftest-main-guard-e] 보존 실패: untracked 복사 실패 → reset/checkout 차단
  OK · rescued=false
  OK · aborted=true
  OK · ok=false
  OK · HEAD 미변경 · fix/FAKE-E-copy-fail
  OK · 브랜치 미변경 · fix/FAKE-E-copy-fail
  OK · untracked 파일 유지 (clean 차단됨)
  OK · events/ aborted 기록 · ["runner-main-guard-aborted-20261124T171047Z.md"]
[selftest-main-guard-E] OK
```

### A·B·C·safe-push·hub-preamble·sleep-tracker
```
[selftest-main-guard-A] OK
[selftest-main-guard-B] OK
[selftest-main-guard-C] OK
[selftest-main-guard-safe-push] OK
[selftest-main-guard-hub-preamble] OK
[selftest-main-guard-sleep-tracker] OK
```

---

## Preflight 재실행

```
[selftest-selfupdate-preflight] node --check hub-runner-v8.2.mjs → status=0
[selftest-selfupdate-preflight] selftest --selftest-stale-lock → status=0 OK
[selftest-selfupdate-preflight] selftest --selftest-merge-fail3 → status=0 OK
[selftest-selfupdate-preflight] selftest --selftest-report-path-off → status=0 OK
[selftest-selfupdate-preflight] selftest --selftest-main-guard-d → status=0 [selftest-main-guard-D] OK
[selftest-selfupdate-preflight] selftest --selftest-main-guard-e → status=0 [selftest-main-guard-E] OK
[selftest-selfupdate-preflight] OK · 자기 자신으로 node --check + 3 selftest 통과
```

---

## 결론

R0-1124-AL CHANGES 3건 전부 구현 완료. selftest 10개 전부 PASS. preflight (node --check + 5 selftest) PASS.
