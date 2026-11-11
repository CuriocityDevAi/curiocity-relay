# M2-1105-AC report — hub-runner-v6.6

## 변경 내역

| REQ | 항목 | 변경 내용 |
|-----|------|-----------|
| REQ0 | 재시작 복구 안전화 | `probeClaimCurrent(hub, claimId, config)` 추가. heartbeat `all.json hubs[hub].current ≠ claimId` 이거나 cmux pane 제목/화면에 ID 없으면 `confirmed=false` → 칸 무접촉·claim 미변경·`state.json hubs[].stale_claim` 보고만. |
| REQ1 | 허브 멈춤 감지 | `detectHubStuck` / `checkAllHubStuck` 추가. 1분 주기 pane 화면 스캔 → `api_error` / `asking_user` / `idle_no_landing` 판정 → `state.json hubs[].stuck = {kind, since, tail}`. 자동 응답 없음. |
| REQ2 | 러너 폴더 침범 감지 | `INTRUDER_PATTERNS` / `guessIntruderHub` 추가. `safePull` 에서 foreign 파일 중 패턴 매칭 시 `state.json git.intruder = {files, guess_hub, since}` 기록. |
| REQ3 | stray 자동 격리 | `matchesOriginMain` / `quarantineStray` / `getUntrackedPaths` 추가. `safePull` 에서 origin/main 과 동일 내용 untracked 파일 → `~/.hub-runner/quarantine/<시각>/` 로 이동 후 pull 진행. 내용 다르거나 origin 에 없으면 보고만. |
| REQ4 | git.dirty 첫 글자 버그 | `l.slice(3)` → `l.slice(2).trim()` 수정 (`collectGitState` · `outOfScopeChanges` 2곳). |
| — | install.sh | `TARGET=v6.6`, `FALLBACK=v6.5` |
| — | 로그 머리표 | `hub-runner-v6.6` / `runner-v6.6` 으로 갱신 |

## state.json stuck 예시

```json
{
  "hubs": {
    "m1": {
      "stuck": {
        "kind": "api_error",
        "since": "2026-11-10T17:06:00.000Z",
        "tail": ["...", "API Error: exceeded context window"]
      }
    }
  }
}
```

## state.json intruder 예시

```json
{
  "git": {
    "intruder": {
      "files": ["scripts/hub-runner-v6.5.mjs"],
      "guess_hub": "m2",
      "since": "2026-11-10T16:55:00.000Z"
    }
  }
}
```

## 셀프테스트 로그

```
# v6.6 신규 5건
[selftest-stale-recovery] OK · probe confirmed=false(heartbeat.current=M2-v66-other-... ≠ M2-v66-stale-...) · claim 미변경 · 칸 무접촉
[selftest-stuck]           OK · api_error="api_error" · asking_user="asking_user" · idle_no_landing="idle_no_landing"
[selftest-intruder]        OK · 침범 파일 패턴 감지 3건 · 비침범 2건
[selftest-stray]           OK · 동일 내용 판정 ✓ · 다른 내용 판정 ✓ · 격리(mv) ✓

# v6.5 기존 9건 재실행 (8건 성공 · 1건 skip)
[selftest-stale-lock]      SKIP · v6.5 러너 실행 중 (PID 41504) — lock 파일 보유 중 (안전 보호 작동)
[selftest-folder-guard]    OK · mock guarded=true · 실제 config guarded=false
[selftest-state-dirty]     OK · 더티 main 에서도 state.json 쓰기 성공 · dirty=3 건
[selftest-auto-recover]    OK · ahead=4 → dropped=3(heartbeat) · reapplied=1(claim)
[selftest-human-files]     OK · 사람 파일 혼입 감지 · HEAD 보존
[selftest-dirty-push]      OK · 스코프 밖 더티 파일 존재에도 claim push 성공
[selftest-local-landing]   OK · reason=report-local · elapsed=5020ms · latency=3s
[selftest-recovery-done]   OK · done claim 보존 · blocked 덮어쓰기 금지 경로 검증
[selftest-recovery-timeout] OK · 60m+ 초과 · pane claude 없음 → timeout blocked 보류 경로 검증
```

## 교체 명령 (1줄)

```bash
bash ~/projects/curiocity-relay/scripts/hub-runner-install.sh
```

## 커밋

- `feat(runner): hub-runner-v6.6 · git.dirty 수정 · 로그 머리표 v6.6 · install.sh 기본값`
- `feat(runner): v6.6 항목0 — 재시작 복구 안전화(probeClaimCurrent)`
- `feat(runner): v6.6 항목1 — 허브 멈춤 감지(api_error·asking_user·idle_no_landing)`
- `feat(runner): v6.6 항목2+3 — 러너 폴더 침범 감지 · stray 자동 격리`
- `feat(runner): install.sh TARGET=v6.6 FALLBACK=v6.5`
- `fix(runner): v6.6 selftest-state-dirty runner 버전 체크 v6.6 으로 수정`

pushed → `origin/main`
