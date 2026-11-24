CHANGES REQUESTED — 업데이트→롤백→업데이트 무한 루프 대책 없음 (v8.1→v8.2+ 경로)

## 판정

**CHANGES REQUESTED**

현재 설치 범위(v8.0→v8.1)는 안전하지만, `pending.json`에 rollback 횟수 제한이 없어 v8.1→v8.2 이후부터 무한 재시도 루프가 발생할 수 있음. 나머지 ①②④⑤⑦ 경로는 정상 확인.

---

## ① 업데이트 감지 → idle → preflight → exit → launchd 재기동 경로

**OK**

- `maybeSelfUpdate()` 호출 순서: enabled 체크 → cooldown → `busy.size + claimQueue + processingClaim` idle 조건 → `selfUpdateDetect()` → diskPath 존재 확인 → preflight → `ensureSymlink` → `writePending` → `setTimeout(exit, 2000)`.
- idle 조건은 `busy.size > 0 || claimQueue.length > 0 || processingClaim` 세 가지 모두 체크. ✓
- exit 2초 delay 전 `releaseLock()` 수동 호출로 lock 정리. ✓
- launchd `KeepAlive=true`로 exit(0) 후 자동 재기동. ✓

---

## ② preflight 실패 시 기존 버전 유지 + events 기록

**OK**

- preflight 실패 시 `writeBlockedEvent()` → `events/runner-selfupdate-blocked-<ts>.md` 작성.
- 성공 시 relay에 `git add → commit → push`. 실패해도 `tried: true, applied: false` 반환 후 현 버전 유지. ✓
- 심링크 교체나 pending 기록 없이 조기 반환. ✓

---

## ③ 재기동 후 헬스체크 + 롤백 — 무한 루프 가능성 ⚠️

**CHANGES REQUESTED**

### 롤백 메커니즘 (정상 작동 확인)

- `writePending({boot_count: 0})` 기록 후 exit.
- 재기동 후 `handleBootPendingAtStart`: boot_count < 1 → increments to 1 → `armBootWatchdog` (3분 타이머).
- 3분 내 heartbeat 성공 → `confirmBootHeartbeatIfPending()` → `clearPending()`. ✓
- heartbeat 실패 → 다음 boot에 boot_count=1 ≥ `BOOT_FAILURE_THRESHOLD(1)` → rollback.
- 롤백: 심링크를 prev로 되돌림 → `clearPending()` → exit(1.5s) → launchd가 prev(=v8.1) 재기동. ✓

### 무한 루프 (횟수 제한 없음) ⚠️

**현재 설치 범위(v8.0→v8.1)에서는 발동 안 함**: v8.0은 self-update 모듈 없음 → 롤백 후 v8.0이 뜨면 `maybeSelfUpdate` 없음 → 루프 없음.

**v8.1→v8.2+ 이후부터 위험**:

```
v8.1 → maybeSelfUpdate → v8.2 preflight OK → 심링크 교체 → exit
launchd: v8.2 기동 → heartbeat 실패 → 3분 watchdog → 다음 boot
v8.2 재기동: boot_count=1 → rollback → 심링크=v8.1 → clearPending → exit
launchd: v8.1 기동 → handleBootPending: none → loop() 즉시 maybeSelfUpdate
  → origin/main 여전히 v8.2 → preflight OK → 심링크 교체 → exit
  → 무한 반복 (~5–7분 주기)
```

`clearPending()` 후 `nextSelfUpdateAt=0`(신규 부트) → 첫 `maybeSelfUpdate` 호출이 즉시 발생. 사이클:

| 단계 | 소요 |
|------|------|
| v8.2 heartbeat 실패 대기 | ~3분 |
| launchd ThrottleInterval | 30초 |
| v8.2 재기동 → rollback exit | 1.5초 |
| launchd ThrottleInterval | 30초 |
| v8.1 부트 → preflight (3 selftest × 60s max) | ~최대 3분 |
| **합계** | **~7분/사이클** |

### 롤백 실패 경로

`prev` 파일 부재 시 `clearPending` + exit → launchd가 현 심링크(=broken next)로 재기동 → ThrottleInterval 30초마다 반복. 이 경우 보호 없음.

### 권고 수정

롤백 후 `blocked-rollback-<next_sha>.json`(또는 pending에 `rollback_count` 필드) 기록 → `maybeSelfUpdate`에서 동일 target 감지 시 N회(예: 3회) 초과이면 skip + blocked event 기록. 또는 rollback 직후 `nextSelfUpdateAt = Date.now() + backoff`(지수 백오프) 적용.

---

## ④ launchd plist · install 스크립트 · v7.8→v8.1 직행 설치

**OK**

- `KeepAlive: true` ✓
- `ThrottleInterval: 60→30` ✓ (자기 업데이트 재기동 가속. 사고 방지용으로는 충분.)
- `ProgramArguments`: 심링크(`~/.hub-runner/bin/hub-runner.mjs`)로 전환. ✓
- `write_plist()` 함수 내부에서도 runner 인자별로 심링크를 갱신(`ensureSymlink` 패턴). ✓
- v7.8→v8.1 직행: 기존 hub-specific plist(com.curiocity.hub-runner.\<hub>) bootout+삭제 후 단일 plist 재작성. 진행 중 세션 보호는 없으나 이전 버전부터 동일 동작. ✓
- BIN_DIR 생성(`~/.hub-runner/bin`) + 심링크 + ci-watch 복사 + ci-watch.sh 모두 install.sh에서 처리. ✓

---

## ⑤ ci-watch 배포 경로 · 실행 명령

**OK (경미한 미사용 import 1건)**

- 배포 경로: `~/.hub-runner/bin/ci-watch.mjs` (cp, 심링크 아님). ✓
- 래퍼: `~/.hub-runner/bin/ci-watch.sh` (무한 while loop, exit(0) 시 2초 뒤 재기동). ✓
- Kyu 실행 명령: `~/.hub-runner/bin/ci-watch.sh`. ✓
- `CI_WATCH_IS_DEPLOYED` 판별: `HERE === join(homedir(), '.hub-runner', 'bin')` — copy이므로 `import.meta.url`이 배포 경로를 직접 가리킴. ✓
- 배포본에서 `REPO_ROOT = join(homedir(), 'projects', 'curiocity-relay')` 하드코딩 — Kyu 환경 전용, 문서화됨. 허용.
- **[경미]** `ci-watch.mjs` line 17: `realpathSync` import됐으나 신규 코드(exitIfSelfChanged, scheduleNext 패치)에서 미사용. 린트 경고 대상.

---

## ⑥ 셀프테스트 5종 별도 worktree 재실행

worktree: `/Users/kyu.lee/curiocity-live/relay-wts/M1-1124-H-wt`

```
--selftest-selfupdate-detect    OK · (a) 동일 (b) bytesDiffer (c) renamed 세 경로 감지
--selftest-selfupdate-preflight OK · node --check + stale-lock + merge-fail3 + report-path-off 통과
--selftest-selfupdate-busy-wait OK · busy=1 → 보류 확인
--selftest-selfupdate-rollback  OK · confirm→bootCount=1 · 2차=rollback · currentScript 불일치=stale
--selftest-selfupdate-ciwatch   OK · copy·no-op·갱신·래퍼 4 분기 정상
```

**전부 PASS**

---

## ⑦ #21 (v8.0) REPORT_PATH 동작 포함 여부

**OK**

v8.1 헤더 명시: "v8.0 이 유지하는 특성(REPORT_PATH 격리 · relay inbox · recovery · merge 자동해소 · Kyu 폴더 감시 등)은 그대로 상속."

코드 확인:
- `ISOLATED_REPORT_HOME = join(RUNNER_HOME, 'reports')` (line 250) ✓
- `loadConfig()` 내 `reportPath` 블록 파싱 (line 976~) ✓
- preflight 핵심 3 selftest: `--selftest-stale-lock`, `--selftest-merge-fail3`, **`--selftest-report-path-off`** (REPORT_PATH 플래그 포함) ✓

---

## Kyu 설치 명령 확인

PR body 기준:

```bash
cd ~/projects/curiocity-relay
git fetch origin
git checkout main && git pull --ff-only
bash scripts/hub-runner-install.sh
```

TARGET=v8.1(기본값) · FALLBACK=v8.0 · 한 번만 실행. ✓

---

## 종합

| 항목 | 판정 |
|------|------|
| ① 업데이트 감지→idle→preflight→exit→launchd | ✅ OK |
| ② preflight 실패 시 기존 유지 + events 기록 | ✅ OK |
| ③ 헬스체크 + 롤백 (boot_count 메커니즘) | ✅ OK |
| ③ 업데이트→롤백→업데이트 무한 루프 (횟수 제한) | ❌ **없음** |
| ③ 롤백 실패(prev 부재) 시 처리 | ⚠️ 보호 없음 |
| ④ launchd plist · install 변경 · 직행 안전성 | ✅ OK |
| ⑤ ci-watch 배포 경로 · 실행 명령 | ✅ OK |
| ⑤ ci-watch.mjs realpathSync 미사용 import | ⚠️ 경미 |
| ⑥ 셀프테스트 5종 worktree 재실행 | ✅ 전부 PASS |
| ⑦ v8.0 REPORT_PATH 상속 | ✅ OK |

**CHANGES REQUESTED**: ③ v8.1→v8.2+ 무한 루프 대책(rollback_count or blocked-target 기록) 추가 후 머지 권장.
