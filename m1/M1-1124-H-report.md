# M1-1124-H v8 R2 (제안 D) — 러너 자기 업데이트 · 리포트

판정: **OK (dry-run)** · 코드·설치 스크립트·ci-watch 훅·셀프테스트 5 종 모두 통과. 머지 대기.

## PR

- https://github.com/CuriocityDevAi/curiocity-relay/pull/23
- 브랜치: `feat/M1-1124-H-v8-r2-self-update` · 작업은 별도 worktree (`~/curiocity-live/relay-wts/M1-1124-H-wt`) 에서만 진행. `~/projects/curiocity-relay` 브랜치·러너 상태 건드리지 않음.

## 무엇이 바뀌었나

- `scripts/hub-runner-v8.1.mjs` (신규 · v8.0 copy + self-update 로직)
- `scripts/lib/self-update.mjs` (신규 · detect/preflight/pending/symlink/ci-watch 배포/롤백 모듈)
- `scripts/hub-runner-install.sh`:
  - `TARGET_RUNNER` 기본값 `v7.8` → **`v8.1`** · `FALLBACK` `v7.7` → **`v8.0`**.
  - launchd `ProgramArguments` 가 `scripts/<TARGET>` 직접지시 → **`~/.hub-runner/bin/hub-runner.mjs` 심링크**로 전환. 러너가 심링크만 교체하면 launchd 재기동 시 새 버전 로드.
  - `ThrottleInterval` 60 → 30 (self-update exit 뒤 대기 단축).
  - 설치 시점에 `~/.hub-runner/bin/ci-watch.mjs` + `ci-watch.sh` 래퍼 자동 배포.
- `scripts/ci-watch.mjs`:
  - 배포 경로(`~/.hub-runner/bin/ci-watch.mjs`) 감지 → `REPO_ROOT` 를 실제 clone 으로 보정.
  - 배포본으로 실행 중 자기 파일 변화 감지 → `exit(0)` → `ci-watch.sh` 래퍼가 2초 뒤 재기동. 소스 직접 실행 경로는 v1.4 Ctrl+C 재시작 경고 유지(디버깅 편의).

## 어떻게 동작하나

1. **감지** (`maybeSelfUpdate`): 러너가 `safePull` 뒤 `tick` 마다 `origin/main`:`scripts/hub-runner-install.sh` 에서 `TARGET_RUNNER` 기본값을 읽고, 그 target 의 origin/main 바이트와 **boot 시점 자기 바이트(SELF_BOOT_SHA)** 를 비교. target 이름이 바뀌었거나(rename · v8.2 등) 바이트가 다르면 trigger.
2. **idle 게이트**: `busy.size > 0 || claimQueue.length > 0 || processingClaim` 이면 보류. 다음 쿨다운(기본 10 분) 뒤 재시도.
3. **pre-flight**: `process.execPath --check <새 target>` + 핵심 3 selftest (`--selftest-stale-lock`, `--selftest-merge-fail3`, `--selftest-report-path-off`). 전 체 통과해야만 적용.
4. **적용**: `~/.hub-runner/bin/hub-runner.mjs` 심링크를 새 target 으로 교체 → `~/.hub-runner/self-update/pending.json` 에 `{prev_abs, next_abs, boot_count: 0}` 기록 → 2 초 뒤 `process.exit(0)`. launchd `KeepAlive` 가 `ThrottleInterval=30s` 뒤 새 버전 재기동.
5. **boot 헬스체크 + 롤백**: 새 버전이 뜨면 `handleBootPendingAtStart` 가 `pending.json` 확인 → `boot_count` 가 1 미만이면 `boot_count` 1 증가 + 3 분짜리 watchdog 세팅. 첫 heartbeat 성공 시 pending 정리. 실패 시 다음 boot 가 `boot_count>=1` 보고 **심링크를 `prev_abs` 로 되돌리고 exit(0)** → launchd 가 이전 버전 재기동.
6. **preflight 실패 처리**: `events/runner-selfupdate-blocked-<ts>.md` 작성 + commit + push. 러너는 이전 버전 유지, 쿨다운 뒤 다시 시도.
7. **ci-watch 배포**: self-update tick 마다 `scripts/ci-watch.mjs` 바이트 비교 → 다르면 `~/.hub-runner/bin/ci-watch.mjs` 로 copy. ci-watch 가 자기 파일 변화 감지 시 exit → 래퍼가 즉시 재기동.

## v8.0 설치와 합쳐 한 번에 — 판단: **합쳐도 됨**

v8.1 = v8.0 features 전부 + self-update. v8.0 을 거치지 않고 v7.8 → **v8.1 직행**이 가능. preflight/rollback 안전망이 모두 들어 있어 롤백 경로 (v8.0 FALLBACK) 가 자동으로 작동한다.

## Kyu 설치 명령 (**마지막 1 회**)

```bash
cd ~/projects/curiocity-relay
git fetch origin
git checkout main && git pull --ff-only
# PR #23 머지 뒤 실행:
bash scripts/hub-runner-install.sh
```

설치 후 확인:

```bash
launchctl list | grep com.curiocity.hub-runner
readlink ~/.hub-runner/bin/hub-runner.mjs
ls -l ~/.hub-runner/bin/
tail -20 ~/.hub-runner/launchd.err.log
```

## ci-watch 실행 명령 (이후 Kyu 는 이 한 줄만)

```bash
~/.hub-runner/bin/ci-watch.sh
```

러너가 새 ci-watch 를 배포하면 `ci-watch.mjs` 가 자기 바이트 변화를 감지해 `exit(0)` → `ci-watch.sh` 가 2 초 뒤 재기동. 화면 로직 변경(M2 범위)도 Kyu 재실행 없이 적용.

## 셀프테스트 로그 (dry-run · 2026-11-24 08:36~08:37 UTC)

```
=== detect ===
[selftest-selfupdate-detect] OK · (a) 동일 (b) bytesDiffer (c) renamed 세 경로 감지
=== preflight ===
[selftest-selfupdate-preflight] node --check hub-runner-v8.1.mjs → status=0
[selftest-selfupdate-preflight] selftest --selftest-stale-lock → status=0 [selftest-stale-lock] OK · 사망 PID lock 즉시 stale 처리 · 10분 대기 없음
[selftest-selfupdate-preflight] selftest --selftest-merge-fail3 → status=0 [selftest-merge-fail3] OK · 연속 3회 → summarized=true · 4회 반복 억제 · 키 변경 시 리셋
[selftest-selfupdate-preflight] selftest --selftest-report-path-off → status=0 [selftest-report-path-off] OK · flag off → false · 기본 on · ${ABS_PATH} 치환 정상
[selftest-selfupdate-preflight] OK · 자기 자신으로 node --check + 3 selftest 통과
=== busy-wait ===
[hub-runner-v8.1:self-update ...] 보류 · busy=1 claimQueue=0 processing=false
[selftest-selfupdate-busy-wait] OK · busy 상태에서 self-update 보류
=== rollback ===
[selftest-selfupdate-rollback] OK · confirm→bootCount=1 · 2차=rollback · currentScript 불일치=stale
=== ciwatch ===
[selftest-selfupdate-ciwatch] OK · copy·no-op·갱신·래퍼 4 분기 정상
```

v8.0 기존 셀프테스트(`stale-lock`, `merge-fail3`, `report-path-off`, `report-path-collect`, `report-path-shim`) 도 재실행해 전 녹색 확인.

## 주의·충돌 상태

- PR #22 (v1.4 ci-watch) 가 main 에 머지돼 있어 `scripts/ci-watch.mjs` 에 rebase 충돌 1 건 → 해결. v1.4 가 이미 보유한 `runningCodeHash` + `getDiskFileHash()` 경로를 활용해 자동 exit 훅만 최소로 얹음(소스 실행 경로는 v1.4 경고 유지 · 배포본만 자동 재기동).
- M2/R0 진행 중인 ci-watch 화면 로직(`scripts/watch/*`) 은 건드리지 않음.
- 러너 직접 재시작·설치·주 리포 브랜치 변경 모두 없음.

---

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
