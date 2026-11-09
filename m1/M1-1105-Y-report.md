---
round: M1-1105-Y
pr: null
outcome: 러너 v3 신파일 · 허브별 모델 (R0/M2=sonnet · M0/M1/M3=opus) · 60분 상한 (timeout → claim blocked note "timeout 60m" blocked_by=oke) · heartbeat 30분 (5분 커밋 소음 제거) · --status model/elapsed/remaining · cmux workspace "<hub> · <ID>" 실증 · launchd v3 live (pid 80967)
kyu_checks: 3 (아래 "Kyu 확인 절차 3줄" 참고)
---

# M1-1105-Y · v3 러너 · 허브별 모델 · 60분 상한 · heartbeat 30분

**일자**: 2026-11-09 · **허브**: M1 · **성격**: 방법론 ⑯ · Kyu 11-09 결정 "토요일 토큰 소진 분석 후 R0/M2=sonnet · 60분 상한 · heartbeat 커밋 소음 제거 · cmux 가시성 실증".

---

## 0. 진단 3줄 (M0-V 6h23m exit 1 · M3-R done 인데 리포트 없음)

1. **M0-1105-V (exit 1 @ 22:48Z · 6h23m)**: 레이트 리밋 — 실제 claude 작업 **1513s (25m13s) · 128 turns · $8.4158** (`storeport/apps/commerce-core` 결제 polyfill B 수정 + maintenance endpoint). util=0.99 warning 이후 **claude CLI 가 같은 session_id 로 내부 재시도**, 두 번째 호출이 "You're out of extra usage · resets Nov 9 at 9am (Jakarta)" 로 rejected. 사이 ~6h 간극 = CLI backoff 대기. **무한루프·타임아웃 아님**.
2. **M3-1105-R (exit 0 @ 16:50Z · 14m · $2.83 · 54 turns)**: `"Now I have enough info to create the OptionChip component."` 지점에서 자연 종료 → runner-v2 는 exit 0 만 보고 `done` 마킹. **실제 OptionChip 생성/PR push 는 안 일어남** — 러너가 relay 리포트 유무를 검증하지 않음 (claim done ≠ 작업 완료).
3. 공통: v2 에 **상한 없음** → claude backoff 가 6h 돌아도 kill 안 됐고, **리포트 push 검증 없음** → 미완료가 done 으로 감춰졌음. v3 는 ① 60분 SIGTERM → blocked note "timeout 60m" blocked_by=oke (오케가 라운드 쪼개야 함) 로 상한 문제 해결. 리포트 검증은 러너 책임 밖 — 오케·허브 프롬프트에 "PR push 안 하면 끝난 게 아님" 강제가 유일한 길.

---

## 1. node --check · 셀프테스트 로그

```
$ node --check scripts/hub-runner-v3.mjs      → OK
$ bash -n scripts/hub-runner-install.sh       → OK
$ bash scripts/hub-runner-install.sh
[install] runner-config.json 전 허브 cwd 존재 확인
[install] node --check scripts/hub-runner-v3.mjs · OK
[install] plist 작성 · runner=scripts/hub-runner-v3.mjs
[install] verify OK · pid=80967
load 완료: com.curiocity.hub-runner (runner=hub-runner-v3.mjs)
```

**--dry-run 셀프테스트 (R0-1105-AF-selftest · 토큰 0)**:
```
$ node scripts/hub-runner-v3.mjs --all --once --dry-run
[hub-runner-v3 03:51:25Z] 시작 · v3 · heartbeat=30m · run_timeout=60m
[hub-runner-v3:r0 03:51:28Z] pick · R0-1105-AF-selftest · model=sonnet
[claim] wrote R0-1105-AF-selftest.json state=started note="runner-v3 · model=sonnet" · pushed
[claim] wrote R0-1105-AF-selftest.json state=done note="runner-v3 exit 0 · model=sonnet · 로그: …" · pushed
```

**로그 헤더 (`~/.hub-runner/r0/R0-1105-AF-selftest.log`)**:
```
# hub-runner-v3 log · R0-1105-AF-selftest
hub: r0
model: sonnet              ← 허브별 override 적용 확인
run_timeout_min: 60
heartbeat_min: 30
display: cmux
--- stream ---
[dry-run] skipping claude spawn · item=R0-1105-AF-selftest model=sonnet
```

**cmux 가시성 실증 (직접 CLI 테스트)**:
```
$ cmux new-workspace --name "m1 · M1-1105-Y-cmuxtest" --cwd /tmp --command "…"
OK workspace:3

$ cmux list-workspaces
* workspace:1  ~  [selected]
  workspace:3  m1 · M1-1105-Y-cmuxtest   ← 탭 제목 "<hub> · <ID>" 형식 OK
```
launchd 컨텍스트에서는 `cmux ping` 실패 가능 (socket 환경변수 부재) — 러너는 자동으로 background 폴백 + 로그에 `[fallback] cmux 미응답 (ping 실패) · background 로 전환` 기록. **background 유지 설계**.

---

## 2. `--status` (model/elapsed/remaining 추가 · live)

```
$ node scripts/hub-runner-v3.mjs --status
hub  current  model   elapsed  remaining  queue head  cwd
---  -------  -----   -------  ---------  ----------  ---
m0   idle     opus    —        —          (empty)     ✓
m1   idle     opus    —        —          (empty)     ✓
m2   idle     sonnet  —        —          (empty)     ✓
m3   idle     opus    —        —          (empty)     ✓
r0   idle     sonnet  —        —          (empty)     ✓

heartbeat.at: 2026-11-09T03:54:39.805Z · pid=80967 · runner=v3
claude_bin: /Users/kyu.lee/.local/bin/claude · version=2.1.128 (Claude Code)
cmux ping: PONG · bin=/Applications/cmux.app/Contents/Resources/bin/cmux
run_timeout: 60m · heartbeat_interval: 30m · display: cmux
```

허브가 라운드 돌 때 `elapsed` 와 `remaining` 이 채워짐 (60m 상한에서 남은 분):
- `current=M3-1105-S` 가 25m 돌면 `elapsed=25m00s · remaining=35m`.
- 60m 넘으면 러너가 SIGTERM → claim blocked.

---

## 3. 변경 요지 (relay 안만 · 제품 리포 0)

| 파일 | 변경 |
|---|---|
| `scripts/hub-runner-v3.mjs` | **신규** — v2 복사 + 허브별 모델 · 60m 상한 (SIGTERM → SIGKILL grace 5s · cmux 모드는 exitFile `-2` 강제 기록) · heartbeat 30m · workspace 이름 `<hub> · <ID>` · `--status` 열 확장. v2 는 그대로 유지 (install.sh 가 v3 가리킬 때만 교체) |
| `scripts/hub-runner-install.sh` | TARGET=`hub-runner-v3.mjs` · FALLBACK=`hub-runner-v2.mjs` (v3 실패 시 v2 로 자동 롤백) |
| `status/runner-config.json` | schema_version 4 · `hubs.{r0,m2}.model=sonnet` · `m0/m1/m3=opus` · `run_timeout_min: 60` · `heartbeat_min: 30` |
| `docs/hub-runner.md` | v3 요약 1줄 추가 (상단) |
| `m1/M1-1105-Y-report.md` | 본 리포트 |

**건드리지 않음**: 실행 중이던 v2 파일 · 제품 리포 코드 · 운영 SSH/railway CLI · security/키체인. 선실측 node --check 필수. 실패 시 v2 자동 롤백 경로 (install.sh 가 처리).

---

## 4. 열린 질문 · 후속

- **M0-V 재개**: 레이트리밋이 Nov 9 09:00 (Jakarta) = 02:00Z 에 리셋. 03:54Z 현재 리셋 완료 상태. M0 큐에 다음 라운드 투입 시 v3 가 60분 상한 안에 완료 확인.
- **M3-R 미완료**: claim done 인데 OptionChip 생성/PR push 없음 (runner-v2 picked 시 "I have enough info" 에서 자연 종료). 오케가 **재발부 (M3-1105-R2?)** 할지 결정 필요. 러너 범위 밖.
- **cmux launchd 가시성**: 현재 launchd 아래서 `cmux ping` 실패 → background 폴백. `CMUX_SOCKET_PASSWORD` plist env 추가하면 cmux 탭 띄울 수 있음 — Kyu 가 "탭 보고 싶다" 명시하면 M1-1105-Z 에서 추가. 지금은 `[fallback]` 로그로 추적 가능.
- **heartbeat 커밋 소음**: 30분으로 바뀜 (5분 → 1/6). 러너가 활동 중이면 라운드 start/done claim push 가 더 빈번 → heartbeat 로 인한 "조용한 커밋" 은 30분당 1건만.

---

## 5. Kyu 확인 절차 3줄 (cmux 어디를 보면 되는지)

1. **러너 살아있나?** `launchctl list | grep com.curiocity.hub-runner` → 두 번째 열이 0 (최근 종료 코드) · 첫 열이 pid. `ps -p <pid>` 로 확인. 현재 pid=80967.
2. **진행 상황** (어느 허브가 뭘 돌리는지): `cd ~/projects/curiocity-relay && node scripts/hub-runner-v3.mjs --status` — 각 허브 `current` · `model` · `elapsed` · `remaining(60m)`. heartbeat `at` 이 5분 이상 안 움직이면 러너 멈춤.
3. **cmux 탭**: 현재 launchd 컨텍스트에서는 `cmux ping` 실패 → background 폴백 (탭 안 뜸). 라이브 로그는 `tail -f ~/.hub-runner/<hub>/<ID>.log`. 탭 띄우려면 `CMUX_SOCKET_PASSWORD` 를 plist 에 추가 — M1-1105-Z 에서 Kyu 승인 시 처리.
