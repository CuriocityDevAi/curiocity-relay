# M2-1105-AB report — hub-runner-v6.5

## 감지 방식 채택 (3줄 요약)
로컬 HEAD 이동 · 로컬 `<hub>/<ID>-report.md` 파일 생김 · 로컬 `status/claims/<ID>.json done` 을 5초마다 체크하여 즉시 done 판정한다. origin/main fetch 는 보조(폴백)로만 사용한다. 감지 지연은 `state.json hubs[].detect_latency_s` 에 기록된다.

## 변경 내역

| REQ | 상수·함수 | 변경 내용 |
|-----|-----------|-----------|
| REQ1 | `waitForLanding` | 로컬 HEAD 이동(L3) · 로컬 report 파일(L2) · 로컬 claim(L1) 추가; origin 은 Check R(보조). `computeDetectLatency` 추가. `isReportLanding()` 헬퍼 추가. |
| REQ2 | `POLL_MS` | `60_000` → `30_000` (30초) |
| REQ3 | `recoverStuckStartedClaims` | ① current claim 이미 done/cancelled/blocked → `markRecovered` 후 skip. ② cmux-split 에서 pane state ≠ claude 이면 timeout blocked 보류. |
| REQ4 | `exitPaneClaude` | 함수 첫 줄에 `if (hub === 'm2') return true;` 추가 (수동 투입 칸 가드). |
| REQ5 | `buildState` / tick() | `hubs[hub].detect_latency_s` 필드 추가; 착지 완료 시 `setHubDecision` 으로 저장. |
| — | `install.sh` | `TARGET=v6.5`, `FALLBACK=v6.4` |
| — | 로그 머리표 | 전체 `hub-runner-v6.5` / `runner-v6.5` 로 갱신 |

## 셀프테스트 로그

```
# v6.5 신규 3건
[selftest-local-landing] OK · reason=report-local · elapsed=5021ms · latency=3s
[selftest-recovery-done] OK · done claim 보존 · blocked 덮어쓰기 금지 경로 검증
[selftest-recovery-timeout] OK · 60m+ 초과 · pane claude 없음 → timeout blocked 보류 경로 검증

# v6.4 기존 6건 재실행
[selftest-stale-lock]    OK · 사망 PID lock 즉시 stale 처리 · 10분 대기 없음
[selftest-folder-guard]  OK · mock guarded=true · 실제 config guarded=false
[selftest-state-dirty]   OK · 더티 main 에서도 state.json 쓰기 성공 · dirty=5건
[selftest-auto-recover]  OK · ahead=4 → dropped=3(heartbeat) · reapplied=1(claim)
[selftest-human-files]   OK · 사람 파일 혼입 감지 · HEAD 보존
[selftest-dirty-push]    OK · 스코프 밖 더티 파일 존재에도 claim push 성공
```

## 교체 명령 (1줄)

```bash
bash ~/projects/curiocity-relay/scripts/hub-runner-install.sh
```

## 커밋

`a3ddc01 feat(runner): hub-runner-v6.5 · 착지 감지 5초(로컬) · 큐 30초 · 복구 #6 수정`  
pushed → `origin/main`
