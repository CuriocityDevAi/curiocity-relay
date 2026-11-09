---
round: M1-1105-Z
pr: null
outcome: 러너 v4 신파일 · 착지 검증 (exit 0 && 리포트/claim 없음 → blocked oke) · --status judge 열 · cmux ping 실패 진단 (socket write 저수준 실패 · 비번/env 로 안 풀림) · 5허브 전부 idle 된 순간 launchd v4 교체 완료 (pid 8499 live)
kyu_checks: 1 (아래 §5 — cmux 탭 띄우려면 설정 확인 1건)
---

# M1-1105-Z · v4 러너 · 착지 검증 · --status judge · cmux 진단

**일자**: 2026-11-09 · **허브**: M1 · **성격**: 방법론 ⑯ · Kyu 11-09 "exit 0 ≠ 완료 재발 방지 (M3-R)" + "cmux 에서 돌아가는 거 보고 싶다" + 방법론 ㉑ claim done ≠ 완료.

---

## 0. 원문 (허브-1109-Z) 요약

1. 착지 검증: exit 0 이어도 허브 claim done 또는 relay `<hub>/<ID>-report.md` 없으면 blocked note "exit 0 · 리포트/claim 없음 · 미완 의심" blocked_by=oke. 셀프테스트 2건.
2. cmux 탭 launchd 아래 ping 실패 원인 조사 (키체인 조회 금지).
3. `--status` 에 claim 판정 열.

---

## 1. node --check · bash -n

```
$ node --check scripts/hub-runner-v4.mjs                 → OK
$ bash -n scripts/hub-runner-install.sh                  → OK
$ bash scripts/hub-runner-install.sh
[install] runner-config.json 전 허브 cwd 존재 확인
[install] node --check scripts/hub-runner-v4.mjs · OK
[install] plist 작성 · runner=scripts/hub-runner-v4.mjs
[install] verify OK · pid=8499
load 완료: com.curiocity.hub-runner (runner=hub-runner-v4.mjs)
```

---

## 2. 셀프테스트 로그 (착지 검증 · `--dry-run` · 토큰 0)

5 허브 중 **r0, m2** 는 셀프테스트 사이에 다른 작업 없음 (R0-AG, M3-S 는 v3 가 완료 중). 서로 다른 허브에 올려 `--all --once` 1 tick 안에 **병렬** 검증.

### Case A: 리포트 있음 → `done`

```
queue/r0/R0-1105-AH-selftest.md              ← 큐
r0/R0-1105-AH-selftest-report.md             ← 더미 리포트 (존재)
$ node scripts/hub-runner-v4.mjs --all --once --dry-run
[hub-runner-v4:r0] pick · R0-1105-AH-selftest · model=sonnet
[claim] wrote R0-1105-AH-selftest.json state=started note="runner-v4 · model=sonnet"
[claim] wrote R0-1105-AH-selftest.json state=done
            note="runner-v4 exit 0 · 리포트 확인 r0/R0-1105-AH-selftest-report.md · model=sonnet · 로그: …"
```
→ claim `done`, note 에 리포트 경로 기록. ✓

### Case B: 리포트 없음 → `blocked` (no-report)

```
queue/m2/M2-1105-S-selftest.md               ← 큐
m2/M2-1105-S-selftest-report.md              ← 일부러 안 만듦
$ node scripts/hub-runner-v4.mjs --all --once --dry-run   (위와 동일 tick)
[hub-runner-v4:m2] pick · M2-1105-S-selftest · model=sonnet
[claim] wrote M2-1105-S-selftest.json state=started note="runner-v4 · model=sonnet"
[claim] wrote M2-1105-S-selftest.json state=blocked
            note="exit 0 · 리포트/claim 없음 · 미완 의심 · 리포트 기대 경로 m2/M2-1105-S-selftest-report.md · model=sonnet · 로그: …"
            blocked_by="oke"
```
→ claim `blocked` with blocked_by=oke, note 가 기대 리포트 경로를 적시. ✓

### `--status` 판정 열 확인

```
hub  current  model   elapsed  remaining  judge      last claim           queue head  cwd
---  -------  -----   -------  ---------  -----      ----------           ----------  ---
m0   idle     opus    —        —          done       M0-1105-W            (empty)     ✓
m1   idle     opus    —        —          started    M1-1105-Z            (empty)     ✓
m2   idle     sonnet  —        —          no-report  M2-1105-S-selftest   (empty)     ✓
m3   idle     opus    —        —          done       M3-1105-S            (empty)     ✓
r0   idle     sonnet  —        —          done       R0-1105-AH-selftest  (empty)     ✓

heartbeat.at: 2026-11-09T04:23:56Z · pid=8499 · runner=v4
cmux ping: PONG · bin=… · password=(none)
run_timeout: 60m · heartbeat_interval: 30m · display: cmux
```
- `judge` 값: `done` · `blocked` · `no-report` · `started` · `—`.
- `no-report` 는 blocked 중 note 에 "리포트/claim 없음" 포함되는 경우만 (v4 landing check 가 올린 것).

---

## 3. 교체 여부 (launchd 재설치)

**교체 완료**. 작업 시작 시엔 M0-W · M3-S · R0-AG 가 돌고 있어 대기. 셀프테스트 작업 중 3허브가 각자 완료 → claim done → 5허브 전부 idle 로 전환 — 그 시점 (`--status` 확인) 에 install.sh 실행.

```
$ bash scripts/hub-runner-install.sh
[install] plist 작성 · runner=scripts/hub-runner-v4.mjs
[install] verify OK · pid=8499
load 완료: com.curiocity.hub-runner (runner=hub-runner-v4.mjs)
```

`FALLBACK_RUNNER=hub-runner-v3.mjs` — v4 가 verify 실패하면 install.sh 가 자동으로 v3 롤백.

**다음 번 교체 명령 (v5 가 생길 때)**:
```
cd ~/projects/curiocity-relay && bash scripts/hub-runner-install.sh
```
위 명령은 **5허브 전부 idle 일 때만** 실행 (돌고 있으면 claude child 가 SIGTERM 됨). 확인:
```
node scripts/hub-runner-v4.mjs --status   # 전부 current=idle 인지
```

---

## 4. cmux launchd 가시성 진단

### 실측 (launchd gui/$(id -u) 컨텍스트에서 cmux CLI 호출 · probe plist 로 측정)

| 명령 | launchd 결과 | 터미널 결과 |
|---|---|---|
| `cmux version` | ✓ cmux 0.63.1 (78) | ✓ |
| `cmux welcome` | ✓ (ASCII art 정상 출력) | ✓ |
| `cmux ping` | ✗ `Error: Failed to write to socket` | ✓ PONG |
| `cmux list-workspaces` | ✗ `Error: Failed to write to socket` | ✓ |
| `cmux capabilities` | ✗ `Error: Failed to write to socket` | ✓ |
| `cmux --password "wrong" ping` | ✗ `Error: Failed to configure socket receive timeout` | ✓ PONG (!) |
| `cmux ping` with `CMUX_SOCKET_PASSWORD=""` | ✗ `Failed to write to socket` | — |

소켓 파일은 launchd 컨텍스트에서도 **읽기·쓰기 권한 모두 있음** (0600 owner match, uid 502 == uid 502). 그런데도 소켓 write 가 저수준에서 실패.

### 결론

- **비밀번호 문제가 아님**: empty/bogus 비번도 같은 오류 (단지 에러 메시지만 조금 바뀜). 터미널에서는 bogus 비번이어도 PONG → cmux CLI 는 **실제로는 --password 값을 안 쓰고 다른 신뢰 경로로 auth**.
- **원인 추정**: cmux.app 가 socket 연결시 **피어 자격** (SO_PEERCRED / getpeereid / mach port / TCC 등) 으로 "이 프로세스가 cmux.app 와 같은 로그인/세션 트리에 있는지" 확인. launchd gui 아래 돌아도 (Aqua 세션 일치) 어떤 추가 제약이 있어 통과 못 함.
- **v4 가 지원하는 escape hatch**: `~/.hub-runner/cmux-password` 파일 (0600) 있으면 `cmux CLI 호출 모두에 --password <value>` 전달. 현재까지 실측으로는 **설치해봐야 가능성 50:50** — 터미널 PONG 은 --password 를 ignore 하는 걸로 보이므로 실제 서버가 요구하는 값이 뭔지 cmux 설정 UI 에서 봐야 확정.
- **현재 운영**: launchd 아래서는 cmux ping fail → v4 가 자동으로 background 폴백 + 로그에 `[fallback] cmux 미응답 (ping 실패) · background 로 전환` 기록. **background 유지** (이전 라운드 결정).

### Kyu 할 일 1~3줄 (cmux 탭 띄우고 싶으면)

1. **cmux.app → Settings** → "Socket Control" 같은 섹션 찾기. **"Allow background clients"** / **"Trusted clients"** 류 토글이 있으면 켜고 재시작. → 이 한 줄로 끝날 수도 있음.
2. 없으면 **Settings 에서 Socket 비밀번호 표시 UI** 찾아 복사: `umask 077 && printf '%s' '<붙여넣기>' > ~/.hub-runner/cmux-password` — v4 가 **다음 tick (최대 60s)** 에 자동으로 `--password` 전달 시도.
3. 둘 다 없으면 cmux 팀 (discord.gg/xsgFEVrWCZ / founders@manaflow.com) 에 "launchd gui 아래 CLI ping 이 socket write 에서 실패한다" 문의. **그 전까지 러너는 background 폴백 · 라이브 로그 = `tail -f ~/.hub-runner/<hub>/<ID>.log`** (이미 모든 라운드별 stream-json 사람 읽기 1줄로 나옴).

---

## 5. 변경 요지 (relay 안만 · 제품 리포 0)

| 파일 | 변경 |
|---|---|
| `scripts/hub-runner-v4.mjs` | **신규** — v3 복사 + 착지 검증 (exit 0 → 리포트/claim 확인 → done or blocked oke) + --status judge 열 + `~/.hub-runner/cmux-password` 파일 지원 + 로그 라벨 v4 |
| `scripts/hub-runner-install.sh` | TARGET=`hub-runner-v4.mjs` · FALLBACK=`hub-runner-v3.mjs` (v4 verify 실패 시 v3 자동 롤백) |
| `queue/r0/R0-1105-AH-selftest.md` + `r0/R0-1105-AH-selftest-report.md` | Case A 셀프테스트 (리포트 있음 → done) |
| `queue/m2/M2-1105-S-selftest.md` | Case B 셀프테스트 (리포트 없음 → blocked no-report) |
| `m1/M1-1105-Z-report.md` | 본 리포트 |

**건드리지 않음**: 실행 중이던 v3 파일 · v2 · 제품 리포 코드 · 운영 SSH/railway CLI · security/키체인. 선실측 node --check · bash -n 필수. v4 실패 시 install.sh 가 v3 자동 롤백 경로 보유. 교체는 `--status` 에서 **5허브 전부 idle 확인 후** (방법론 ⑯).

---

## 6. 열린 질문 · 후속

- **M3-1105-R 대체**: 이번 라운드 와중에 M3-S 도 exit 0 → 허브가 직접 `claim done` 과 `m3/M3-1105-S-report.md` 올림. v3 (현재 러너) 는 "claim 이미 done (허브 설정) · 덮어쓰기 금지" 로 존중. v4 는 landing check 가 이 경로 (허브 self-claim done) 도 똑같이 존중 — 덮어쓰기 금지 분기를 v3→v4 로 그대로 이식. 앞으로 "허브가 push 안 하고 claude 가 조기 종료" 는 v4 가 blocked (no-report) 로 잡아 가시화.
- **R0-1105-AH-selftest · M2-1105-S-selftest**: 큐 + claim 모두 relay 에 그대로 보존 (M1-1105-X-selftest 선례 따라). 러너가 재픽 안 함 (claim state 가 done/blocked).
- **cmux Settings 탐색**: Kyu 가 §4 Kyu 할 일 1~3 중 1 번 (설정 토글) 먼저 확인 요청. 설정 UI 에 아무 것도 없으면 2 번 (파일) 시도해볼 가치 낮음 — 터미널 PONG 이 bogus 비번도 받으니 비번은 사실상 "disabled" 로 보임. 그 경우 3 번 (cmux 팀 문의) 이 가장 빠른 길.
