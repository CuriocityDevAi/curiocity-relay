# M1-1125-C — runner-v8.3 landing 오탐·safe-push 가드·pull-rebase 잔재·fg-timeout 분리·preamble 어설션

PASS

- 모델: Opus · 상한 55분 · 리포: curiocity-relay
- 작업 worktree: `~/projects/curiocity-relay-wts/M1-1125-A`
- 브랜치: `fix/M1-1125-A-runner-no-report-done`
- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/29 (v8.3 · TARGET=v8.3 FALLBACK=v8.2 · 자기 머지 금지)

## 단계별 결과

| # | 항목 | 상태 | 비고 |
|---|---|---|---|
| 1 | landing 오탐 수정 (head-moved + pane-idle 가드) | ✅ | land-detect-v2 콜백 2개 주입 · cmux-split 호출부에 wiring · selftest OK |
| 2 | safe-push HEAD-on-main 가드 (detached 거부) | ✅ | safe-push.mjs step 0 추가 · selftest OK |
| 3 | pull --rebase 잔재 제거 → fetch + merge -X ours | ✅ | safePull · recoverReportFromBranch 둘 다 교체 · fallback cleanup 에 merge --abort 추가 |
| 4 | claude-foreground-timeout 을 pane-busy 와 분리 | ✅ | `~/.hub-runner/claude-fg-retry/<ID>` 마크 · workspace layout 리셋 후 1회 재시도 |
| 5 | preamble 개행 0 어설션 + "리포트 마지막에 한 번" | ✅ | buildHubPreamble 에서 \\n 발견 시 throw · DEFAULT_REPORT_ONCE_RULE 신규 조항 |

## 커밋

- `ba51b6ca2` feat(runner-v8.3): step1 — landing 오탐 수정 + safe-push HEAD-on-main 가드 + selftest 2종
- `3085a1c79` feat(runner-v8.3): step3 — pull --rebase 잔재 제거 → fetch + merge -X ours
- `dec66a030` feat(runner-v8.3): step4 — claude-foreground-timeout 을 pane-busy 와 분리
- `71eef807e` feat(runner-v8.3): step5 — preamble 개행 0 어설션 + "리포트는 마지막에 한 번" 조항

(B 가 남긴 land-detect-v2 + safe-push 변경은 step1 커밋에 포함. NOTES-M1-1125-B.md 는 발견되지 않아 git diff 와 untracked 로부터 B 의 진척을 재구성.)

## Selftest 로그 (full preflight · v8.3)

```
--- stale-lock ---
[hub-runner-v8.3 2026-11-25T02:40:26.340Z] stale lock 삭제 (pid=999999999 사망 · 즉시 처리)
[selftest-stale-lock] OK · 사망 PID lock 즉시 stale 처리 · 10분 대기 없음

--- merge-fail3 ---
[hub-runner-v8.3:git 2026-11-25T02:40:26.433Z] merge 연속 3회 실패 · needs_human=true · conflicted=status/hubs.json · human=(auto-only)
[selftest-merge-fail3] OK · 연속 3회 → summarized=true · 4회 반복 억제 · 키 변경 시 리셋

--- report-path-off ---
[selftest-report-path-off] OK · flag off → false · 기본 on · ${ABS_PATH} 치환 정상

--- main-guard-d ---
  OK · untracked 파일 유지
  OK · events/ aborted 기록
[selftest-main-guard-D] OK

--- main-guard-e ---
  OK · untracked 파일 유지 (clean 차단됨)
  OK · events/ aborted 기록
[selftest-main-guard-E] OK

--- head-moved-unrelated ---   (신규 · M1-1125-C)
[selftest-head-moved-unrelated] OK · HEAD 이동 + report 미터치 → head-moved 안 됨 (timeout)

--- safe-push-detached ---     (신규 · M1-1125-C)
[selftest-safe-push-detached] OK · detached + feature-branch 모두 not-on-main 거부
```

추가 셀프테스트:
- `--selftest-preamble-newline` OK · preamble 2 샘플 모두 \\n 0개
- `--selftest-fg-timeout-isolated` OK · 두 분기 토큰 코드에 모두 존재
- `--selftest-merge-conflict-auto` OK (fetch+merge ours 흐름에서도 자동 해소 유지 — step3 regression 없음)
- `--selftest-hub-preamble` OK (기존 테스트 하네스 regression 없음 — step5 호환)

## v8.3 자가 업데이트 preflight

`DEFAULT_SELF_UPDATE_PREFLIGHT` 에 다음 2개를 추가:
```
--selftest-head-moved-unrelated
--selftest-safe-push-detached
```
(기존 5개 유지). self-update 가 target 버전을 판정할 때 preflight 가 자동으로 둘을 포함.

## 미완/주의

- 못 한 단계: 없음 (5건 전부 완료).
- 주석/문서 상의 "pull --rebase" 서술은 일부 남아 있음(line 658·673·850·1348 등). 실 로직 경로는 모두 교체됨. 다음 라운드에서 cleanup 가능.
- v8.3.mjs 의 line 5175·5178·5266 의 pull --rebase 는 `--selftest-merge-conflict-auto` 하네스 안쪽. "일부러 충돌 만드는" 테스트 코드이므로 유지가 맞음.
- 러너 자기 자신은 아직 v8.2 (install.sh TARGET 아직 v8.3 로 올리지 않음). PR 머지 후 Kyu 가 TARGET 상향 해야 선택적 self-update 시작.

## 러너 폴더 보호 준수

- 작업은 전부 `~/projects/curiocity-relay-wts/M1-1125-A` worktree 에서 진행.
- 러너 폴더(`~/projects/curiocity-relay`) 에는 어떤 commit / stash / branch 생성 / rebase / reset 도 하지 않음.
- 리포트는 이 파일 1개 (`/Users/kyu.lee/.hub-runner/reports/m1/M1-1125-C/report.md`). git 리포에 리포트 쓰지 않았고 commit/push 하지 않음.
