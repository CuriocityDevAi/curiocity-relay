APPROVE

# R0-1125-E — PR #29 (runner-v8.3 · M1-1125-C) 리뷰

작성: 2026-11-25 · 모델: Sonnet · PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/29

5건 전부 확인 · selftest 11종 직접 실행 모두 OK · PR COMMENT(APPROVE) 제출 완료.
(자기 PR APPROVE API 거부 → COMMENT 로 대체 제출)

---

## REQ 1 · 착지 판정 — 일하는 중 죽이지 않음 · 진짜 끝난 세션 종료 ✅

**오탐 차단 — headTouchesReport**:
`git log -1 --name-only <rev>` 로 커밋이 `<hub>/<id>-report.md` 를 실제로 터치했는지 검증.
heartbeat/claim 커밋은 미터치 → 첫 폴 오탐 불가. selftest `--selftest-head-moved-unrelated` 로 확인.

**pane-idle 판정 근거·시간**:
- `isClaudePaneIdleFromScreen` — pane 마지막 4000자에 `"to interrupt"` 없으면 idle.
- `paneIdleStreakThreshold=3` (기본) × `pollMs=5000` = **15초 연속 idle** 후 resolve.
- busy 재진입 시 streak 즉시 0 리셋 · `pendingLandingReason` 유지 → 세션이 추가 작업으로 돌아가면 대기 재개.
- claim done/blocked/cancelled (explicit 신호) 는 idle 체크 없이 즉시 resolve — 올바름.

## REQ 2 · safe-push not-on-main 거부 → 다음 tick main-guard 복구 ✅

`safeRunnerPush` step 0: `symbolic-ref --short HEAD ≠ main` (detached 포함) → `{ ok:false, reason:'not-on-main' }` 즉시 반환.
러너는 로그만 남기고 tick 종료. 다음 tick 시작 시 main-guard 가 HEAD 를 origin/main 으로 강제 복구 → 이후 tick 에 safeRunnerPush 정상 진행. 영구 정지 없음.

## REQ 3 · pull --rebase 제거 · fg-timeout 재생성이 다른 허브 창 미침범 ✅

**pull --rebase 제거**:
- `safePull()` (line 994): `fetch + merge -X ours origin/main` 으로 교체. 실패 시 `merge --abort` + `rebase --abort` (잔재 cleanup 포함).
- `recoverReportFromBranch` (line 1425): `safeRunnerPush` (safe-push.mjs) 로 교체 완료.

**fg-timeout workspace 재생성 범위**:
- `clearHubsLayout()` = `~/.hub-runner/hubs-layout.json` 삭제만. cmux workspace/pane에 아무것도 안 건드림.
- 다음 tick `ensureHubsLayout()`: `list-workspaces` 로 기존 "Hubs" workspace 발견 → reuse.
  복수 workspace 감지 시 "나머지 건드리지 않음 (Kyu 수동 정리)" 로그 후 가장 오래된 것만 채택.
  타 허브 active session 보존됨 — 다른 허브 창 미침범 확인.

## REQ 4 · preamble 한 줄 어설션 · install.sh TARGET/FALLBACK ✅ (배포 주의)

**preamble 어설션**: `buildHubPreamble` 조립 후 `\n`/`\r` 발견 시 throw.
③ 조항 `DEFAULT_REPORT_ONCE_RULE` 추가 (리포트 마지막에 한 번). selftest `--selftest-preamble-newline` OK.

**install.sh TARGET 상태**:
- `TARGET_RUNNER="${TARGET:-hub-runner-v8.2.mjs}"` — PR 에 install.sh 미포함. **머지만으로 v8.3 자동 배포 안 됨**.
- 의도적 (M1-1125-C 리포트 명시). Kyu 가 머지 후 `TARGET=hub-runner-v8.3.mjs bash scripts/hub-runner-install.sh` 실행해야 self-update 가 v8.3 경로로 올라감.
- self-update `detectUpdate` 가 install.sh 의 `TARGET_RUNNER` 를 비교하므로, 현재 v8.2 그대로면 v8.3 업그레이드 미발동.

## REQ 5 · selftest 직접 실행 ✅ (11종 전부 OK)

| selftest | 결과 |
|---|---|
| `--selftest-stale-lock` (preflight) | OK |
| `--selftest-merge-fail3` (preflight) | OK |
| `--selftest-report-path-off` (preflight) | OK |
| `--selftest-main-guard-d` (preflight) | OK |
| `--selftest-main-guard-e` (preflight) | OK |
| `--selftest-head-moved-unrelated` ★신규 | OK |
| `--selftest-safe-push-detached` ★신규 | OK |
| `--selftest-preamble-newline` | OK |
| `--selftest-fg-timeout-isolated` | OK |
| `--selftest-merge-conflict-auto` (regression) | OK |
| `--selftest-hub-preamble` (regression) | OK |

---

## 비블로커 (일반 코멘트)

- 주석 내 `"pull --rebase"` 서술 line 658·673·850·1348 등 잔존. 실 로직 경로는 모두 교체됐으므로 기능 영향 없음. 다음 라운드 cleanup 가능.
- install.sh TARGET 상향 미포함은 의도적이나, Kyu 수동 install.sh 실행 없이 자동 배포 안 됨 주의.
