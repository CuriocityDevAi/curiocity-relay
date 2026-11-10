M2-1105-AA 완료 리포트 · hub-runner-v6.4

## 채택안 (3줄)

**runner-status 전용 orphan 브랜치 + worktree** 방식 채택.  
`~/.hub-runner/status-wt` worktree에서 `state.json` 1개 커밋을 amend + force-push (내용 변경 시만, 최대 1회/분). main이 더러워도 별도 경로이므로 항상 동작.  
heartbeat는 main commit에서 제거 → state.json으로 이동. claim은 기존 그대로 main에 commit/push.

---

## state.json 예시

```json
{
  "runner": "v6.4",
  "script": "/Users/kyu.lee/projects/relay-m1/scripts/hub-runner-v6.4.mjs",
  "repo": "/Users/kyu.lee/projects/relay-m1",
  "pid": 12345,
  "last_tick": "2026-11-10T09:13:09.711Z",
  "git": {
    "head": "8d7aa6c",
    "ahead": 0,
    "behind": 0,
    "dirty": [],
    "last_pull": { "ok": true, "at": "2026-11-10T09:00:00.000Z", "err": null }
  },
  "hubs": {
    "m0": { "pane": "shell", "current": null, "elapsed_s": null, "last_decision": "skip:claim-done", "last_decision_at": "2026-11-10T09:00:00.000Z" },
    "m1": { "pane": "unknown", "current": "M1-1105-AB", "elapsed_s": 142, "last_decision": "picked", "last_decision_at": "2026-11-10T09:00:00.000Z" },
    "m2": { "pane": "shell", "current": null, "elapsed_s": null, "last_decision": "skip:cwd-missing", "last_decision_at": "2026-11-10T09:00:00.000Z" },
    "m3": { "pane": "shell", "current": null, "elapsed_s": null, "last_decision": "skip:claim-done", "last_decision_at": "2026-11-10T09:00:00.000Z" },
    "r0": { "pane": "shell", "current": null, "elapsed_s": null, "last_decision": "skip:queue-empty", "last_decision_at": "2026-11-10T09:00:00.000Z" }
  },
  "queue_seen": ["M1-1105-AB"],
  "log_tail": [
    "[hub-runner-v6.4 2026-11-10T09:00:00.000Z] 시작 · v6.4 ...",
    "[hub-runner-v6.4:git 2026-11-10T09:00:05.000Z] 자동 복구 완료 · ahead=3 · dropped=3 · reapplied=0"
  ]
}
```

---

## 셀프테스트 로그

### v6.4 신규 셀프테스트 (4건 모두 통과)

```
① --selftest-state-dirty
[selftest-state-dirty] 더미 더티 파일 작성 .../tmp-selftest-state-dirty.txt
[selftest-state-dirty] OK · 더티 main 에서도 state.json 쓰기 성공 · dirty=2 건 · wt=~/.hub-runner/status-wt

② --selftest-auto-recover
[selftest-auto-recover] 사전 준비 완료 · 4 ahead · heartbeat x3 + claim x1
[selftest-auto-recover] autoRecoverDivergence 결과: {"status":"recovered","ahead":4,"dropped":3,"reapplied":1}
[selftest-auto-recover] OK · ahead=4 → dropped=3(heartbeat) · reapplied=1(claim) · origin 우선 복구 성공

③ --selftest-human-files
[selftest-human-files] 사람 파일 커밋 생성 · HEAD=daafe0fe
[selftest-human-files] autoRecoverDivergence 결과: {"status":"manual","files":["tmp-selftest-human-file.txt@daafe0fe"]}
[selftest-human-files] OK · 사람 파일 혼입 감지 · HEAD 보존 · files=tmp-selftest-human-file.txt@daafe0fe

④ --selftest-folder-guard
[selftest-folder-guard] OK · mock guarded=true(hub=fake_guard_hub) · 실제 config guarded=false · REPO_ROOT=/Users/kyu.lee/projects/relay-m1
```

### v6.3 비-cmux 셀프테스트 (2건 통과)

```
⑤ --selftest-stale-lock
[selftest-stale-lock] lock 작성 pid=999999999 · acquireLock 호출
[hub-runner-v6.4 ...] stale lock 삭제 (pid=999999999 사망 · 즉시 처리)
[selftest-stale-lock] OK · 사망 PID lock 즉시 stale 처리 · 10분 대기 없음

⑥ --selftest-dirty-push
[selftest-dirty-push] 더미 더티 파일 작성 .../tmp-selftest-dirty.txt
[selftest-dirty-push] claim.mjs 호출: M2-selftest-dirty-... started
[selftest-dirty-push] OK · 스코프 밖 더티 파일 존재에도 claim push 성공
```

### v6.3 cmux 셀프테스트 5건 (split/timeout/layout/busy/respawn)
cmux Hubs 패인 환경 필요 — 실제 러너 교체 후 Kyu가 직접 실행 권장.  
`node scripts/hub-runner-v6.4.mjs --selftest-split --hub m2 --id <ID>`

---

## 교체 명령 (Kyu 몫 · 허브가 쉴 때)

```bash
TARGET=hub-runner-v6.4.mjs FALLBACK=hub-runner-v6.3.mjs bash scripts/hub-runner-install.sh
```

---

## 변경 요약

| 항목 | v6.3 | v6.4 |
|------|------|------|
| heartbeat | main에 commit/push (1분마다) | state.json으로 이동 (main commit 없음) |
| 상태 보고 | all.json 로컬만 | runner-status 브랜치 state.json push |
| 자기 복구 | 없음 | ahead 커밋 모두 runner-own → 자동 reset+reapply |
| 폴더 가드 | 없음 | repo == hub cwd 시 경고/거부 |
| 허브별 판단 | 없음 | state.json hubs[].last_decision |

**신규 파일**: `scripts/hub-runner-v6.4.mjs`  
**수정 파일**: `scripts/hub-runner-install.sh` (TARGET=v6.4, FALLBACK=v6.3, 폴더 가드 추가)
