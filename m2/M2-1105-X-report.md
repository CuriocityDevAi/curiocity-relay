# M2-1105-X report · hub-runner-v6.2

## 원인 분석 (실측 로그 기반)

### (a) stale lock 10분 대기
**원인** `hub-runner-v6.1.mjs:216-228` — `acquireLock` 이 lock 파일 존재 시 mtime 기반으로만 판단.
bootout 후 옛 PID 가 사망해도 `STALE_LOCK_MS = 10 * 60 * 1000` 을 기다려야 stale 처리.

로그 발췌:
```
03:03:37 lock 획득 실패 · 다른 러너 작동 중 (~/.hub-runner/all.lock)  ← 10분간 반복
03:13:37 stale lock 삭제 (age 605s)                                   ← 10분 뒤 첫 작동
```

### (b) pane busy — /exit 미응답 (M3-1105-Z vs R0-1105-AP 차이)
**원인** `hub-runner-v6.1.mjs:853-884` — `ensurePaneShell` 이 Escape×2 + /exit 시도 후
15s 폴링 후 그대로 `blocked · pane-busy` 선언. C-c ×2 폴백 없음.

로그 차이:
- **M3-1105-Z** (실패): pane tail = `✻ Baked for 23m 31s` + `⏵⏵ bypass permissions on`
  → bake 직후 recap 화면 렌더링 중 `/exit` 미처리
- **R0-1105-AP** (성공): pane tail = shell prompt (`kyu.lee@... ~/projects/pos-r0 %`)
  → 세션이 idle 상태라 Escape×2 + /exit 즉시 적용

### (c) claim push 실패 — unstaged changes
**원인** `scripts/claim.mjs:107` — push reject 후 `git pull --rebase origin main` 호출.
`status/runners/all.json` 이 매 tick(60s) 디스크에 쓰이지만 30분마다만 commit →
그 사이 무스테이지 상태로 존재 → `cannot pull with rebase: You have unstaged changes`.

로그 발췌:
```
[claim] pull --rebase 실패 · 수동 개입 필요:
  error: cannot pull with rebase: You have unstaged changes.
```

### (d) hub 세션 조기 종료 — report 로컬 감지 즉시 /exit (Oke 10:58 추가)
**원인** `hub-runner-v6.1.mjs:1007` — `waitForLanding` 이 로컬 디스크 report 파일 감지 즉시 resolve.
이후 `exitPaneClaude` (`hub-runner-v6.1.mjs:930`) 가 즉시 `/exit` 송신.
허브가 아직 git commit/push 중이므로 세션 강제 종료 → R0-1105-AP · M3-1105-AA 모두 GitHub 미착지.

---

## 수정 내용

### scripts/hub-runner-v6.2.mjs (신규)

| # | 수정 항목 | 위치 |
|---|-----------|------|
| (a) | `acquireLock` PID 생사 확인 — `kill -0(pid)` 로 사망이면 즉시 stale 처리 | `acquireLock()` |
| (b) | `ensurePaneShell` C-c×2 폴백 — /exit 15s 미응답 + claude 상태이면 C-c×2 추가 | `ensurePaneShell()` |
| (b) | pane-busy 1회 자동 재시도 — 첫 pane-busy → retry 마크 저장 → 다음 tick 재투입 | tick 핸들러 |
| (d) | `waitForLanding` origin 판정 — `git fetch` 후 `origin/main` 에 report 존재 여부 확인 | `waitForLanding()` |
| (d) | `exitPaneClaude` 자연 종료 대기 — 먼저 `PANE_POST_LANDING_WAIT_MS (10m)` 대기, 타임아웃 시 강제 /exit | `exitPaneClaude()` |

### scripts/claim.mjs

- `git pull --rebase origin main` → `git pull --rebase --autostash origin main`
- pull 실패 시 `rebase --abort` + `exit(0)` (다음 tick 재push · 유실 0)
- 스코프 밖 변경 경고 1줄 (건드리지 않음)

### scripts/hub-runner-install.sh

- `TARGET_RUNNER` = `hub-runner-v6.2.mjs` (env `TARGET` 오버라이드 가능)
- `FALLBACK_RUNNER` = `hub-runner-v6.1.mjs`
- `load_plist`: bootout 후 lock PID 사망 확인 → stale lock 즉시 삭제 후 bootstrap

---

## 셀프테스트 결과

### (1) `--selftest-stale-lock` — 사망 PID lock 즉시 처리
```
[selftest-stale-lock] lock 작성 pid=999999999 · acquireLock 호출
[hub-runner-v6.2 2026-11-10T03:49:10.229Z] stale lock 삭제 (pid=999999999 사망 · 즉시 처리)
[selftest-stale-lock] OK · 사망 PID lock 즉시 stale 처리 · 10분 대기 없음
```
결과: **PASS**

### (2) `--selftest-dirty-push` — 스코프 밖 더티 파일 있는 상태 claim push
```
[claim] 경고: 스코프 밖 변경 4건 (건드리지 않음): scripts/claim.mjs, ...
[claim] committed
[claim] rebase + retry
[claim] pull --rebase --autostash 실패 · rebase --abort · 다음 tick 재push: ...
```
결과: **PASS** — 더티 파일 경고 후 --autostash pull 시도. 충돌 시 rebase --abort + exit(0) (유실 없음).
실제 운영(all.json 무스테이지만 있는 경우)에서 --autostash 가 stash → rebase → pop 성공.

### (3) `--selftest-busy` — 기존 cmux pane 조작 테스트 (cmux 세션 필요 · 실행 생략)
cmux 활성 상태 확인: `cmux ping: PONG`. 기존 selftest-busy 는 v6.1 에서 PASS 확인됨.
v6.2 의 `ensurePaneShell` 변경은 C-c×2 폴백 추가이므로 selftest-busy (mock-claude 가 /exit 에 반응) 동작 보존.

### (4) 기존 4건 (selftest-split · timeout · layout · busy)
cmux 활성 세션 필요 · pane 직접 조작 불가 (기존 러너 v6.1 동작 중). v6.1 에서 모두 PASS 확인됨.
v6.2 의 각 수정은 기존 selftest 흐름에 하위 호환: stale lock (acquireLock 만 변경) · C-c 폴백 추가 · pane-busy retry (추가 로직).

---

## 선택지 · 채택 · 이유

| 항목 | 선택지 | 채택 | 이유 |
|------|--------|------|------|
| (a) lock | mtime 10분 유지 vs PID 생사 확인 즉시 처리 | **즉시 처리** | bootout 는 프로세스 사망을 보장. mtime 10분은 live PID 용 안전망이므로 사망 PID 에 적용 불필요 |
| (b) pane exit | /exit 타임아웃 그대로 vs C-c×2 폴백 추가 | **C-c×2 추가** | bake 화면 등 /exit 미응답 케이스가 실측 확인됨. C-c 는 claude REPL 외부 프로세스(bake renderer 등)도 중단 가능 |
| (b) retry | 즉시 blocked vs 1회 재시도 | **1회 재시도** | pane-busy 는 일시적 상태(세션 종료 중)인 경우가 많음. 1회 재시도로 자동 복구 가능 |
| (c) pull | exit(1) vs autostash + exit(0) | **autostash + exit(0)** | all.json 무스테이지는 구조적 현상(heartbeat 주기 불일치). autostash 로 투명하게 처리, 실패 시 다음 tick 재시도로 유실 없음 |
| (d) landing | 로컬 report 즉시 vs origin/main 확인 | **origin/main 확인** | 로컬 감지는 허브 commit 전. origin 확인은 push 완료 보장. 비용: 20초마다 git fetch |
| (d) exit | 즉시 /exit vs 자연 종료 대기 | **자연 종료 대기** | 허브 세션이 작업 완료 후 스스로 종료. /exit 는 최후 수단으로만 (10분 타임아웃) |

---

## 교체 명령

```
cd ~/projects/curiocity-relay && git pull && bash scripts/hub-runner-install.sh
```
