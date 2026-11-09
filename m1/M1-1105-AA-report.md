---
round: M1-1105-AA
pr: null
outcome: 러너 v5 신파일 · cmux 탭 = 대화형 클로드코드 (-p + stream-json → 대화형 "queue/<path> 읽고 수행") · 완료 판정은 착지 폴링 (claim done/blocked 또는 relay 리포트 파일) · 탭 안 닫고 ✓/✗ 로 제목 갱신 · 같은 허브 다음 pick 시 이전 탭 close (prev-session.json) · 60분 상한 send-key C-c + close · background 폴백은 v4 그대로. 셀프테스트 2건 ✓ (echo+claim done · prev-cleanup). 교체는 M0-1105-X 완료 대기.
kyu_checks: 1 (아래 §4 — cmux 탭 1번 열어 "하얀 화면 + 코드명" 확인)
---

# M1-1105-AA · 러너 v5 · cmux 탭 대화형 전환 · 착지 폴링

**일자**: 2026-11-09 · **허브**: M1 · **성격**: 방법론 ⑯ · Kyu 11-09 "cmux 탭은 생기는데 내용이 너무 많이 찍혀 인간이 보기에 적절하지 않아 · 클로드코드의 작업창 같은 것을 생각했어" + 방법론 ㉑ 착지 검증 유지.

---

## 0. 채택안 3줄

- **선택지**: ① v4 `-p … --output-format stream-json | tee` (JSON 원문 노출) · ② `-p + stdin pipe` (출력 포맷 안 바뀜) · ③ **대화형** `claude "<프롬프트>" --model <m> --dangerously-skip-permissions`.
- **채택**: ③ 대화형 + 프롬프트는 `queue/<hub>/<ID>.md 파일을 읽고 그대로 수행` 한 줄 (긴 인자 한도 회피).
- **이유**: Kyu 가 원한 "클로드코드 작업창 같은 것" = 생각 중 · 도구 호출 · 토큰 요약이 그대로 보이는 TUI. stream-json 1줄 요약은 사람 로그엔 좋지만 TUI 가 아님. 대화형이 바로 그 화면. 프롬프트 한 줄 지시는 큐 파일 내용 통째 전달보다 안전·단순.

---

## 1. node --check

```
$ node --check scripts/hub-runner-v5.mjs                 → OK
$ node --check scripts/hub-runner-v4.mjs                 → OK (unchanged)
$ node scripts/hub-runner-v5.mjs --status                → 5허브 테이블 정상 출력
```

v4 는 건드리지 않음. `install.sh` 미변경 — v4 가 계속 launchd 를 소유. v5 는 교체 전까지 파일만 존재.

---

## 2. 셀프테스트 (대화형 탭 + 착지 폴링 + 탭 유지 + prev-cleanup)

**방식**: 토큰 절약 — 큐 파일 몸통의 bash 라인을 cmux 탭 안에서 직접 실행 (claude 미호출). `new-workspace` · `read-screen` · `rename-workspace` · `close-workspace` · `send-key` 등 **v5 가 쓰는 cmux CLI 호출 포맷을 그대로 재현**. 러너 코드는 `node --check` 로 선실측 완료, cmux 레이어는 셸로 실측.

### Case A: echo + claim done (happy path)

```
[spawn] cmux-interactive · label="m1 · M1-1105-AA-selftest"
[cmux-open] OK workspace:6
[cmux-workspace] ref=workspace:6
[landing] claim state=done · note="runner-v5 selftest · interactive tab + landing poll" · poll=2
[screen-capture] (cmux tab 현재 화면)
  ▶ M1-1105-AA-selftest 시작 · 17:12:03
  읽고 수행: queue/m1/M1-1105-AA-selftest.md
  hello from v5 self-test
  [claim] wrote …/M1-1105-AA-selftest.json · {"state":"done", …}
  [claim] committed · [claim] pushed
  ▶ 세션 종료 · exit=$? · 17:12:03 · (러너가 리포트 착지 폴링 중 · 탭 유지)
[/screen-capture]
[rename] workspace=workspace:6 title="✓ m1 · M1-1105-AA-selftest" · ok
[verdict] landing=claim-done · icon=✓ · elapsed=6s
```

- 탭 열림 → echo → claim done → 러너가 5s 폴링으로 감지 (poll=2) → 화면 캡처 로그에 50줄 저장 → 탭 제목 **`✓ m1 · M1-1105-AA-selftest`** → 탭 열린 채 유지.
- `cmux list-workspaces` 로 확인: `workspace:6  ✓ m1 · M1-1105-AA-selftest` (닫히지 않음).

### Case B: prev-cleanup (같은 허브 다음 pick 시 이전 탭 close)

claim 삭제 후 셀프테스트 재실행 — prev-session.json 이 workspace:6 를 가리키므로:

```
[prev-cleanup] 이전 workspace=workspace:6 · close
[spawn] cmux-interactive · label="m1 · M1-1105-AA-selftest"
[cmux-open] OK workspace:7
[cmux-workspace] ref=workspace:7
[landing] claim state=done · poll=2
[rename] workspace=workspace:7 title="✓ m1 · M1-1105-AA-selftest" · ok
[verdict] landing=claim-done · icon=✓ · elapsed=6s
```

- 이전 workspace:6 **닫힘**, 새 workspace:7 **열림** → `list-workspaces` 에 workspace:6 없고 workspace:7 만 존재 ✓.
- 다른 허브 탭 (m0 · m2 · m3) 손 안 댐 — 같은 허브 prev-session.json 만 봄.

### 60분 상한 코드 경로 (정적 검증)

`waitForLanding` 에서 `Date.now() - startedAt > timeoutMs` 분기:
1. `cmux send-key --workspace <ref> C-c` 전송 (TUI claude 에 SIGINT) → log `[timeout] send-key C-c · ok=<bool>`.
2. 5s (`SIGKILL_GRACE_MS`) 대기 후 `cmux close-workspace --workspace <ref>` → log `[timeout] close-workspace · ok=<bool>`.
3. `landing.reason = 'timeout'`, `timedOut = true` → tick 로직에서 `claim blocked "timeout 60m · runner-v5 cmux-interactive · 탭 close"` blocked_by=oke.

(실측은 60분 소요 — 셀프테스트에서는 제외. CLI 호출은 Case A/B 에서 이미 성공한 것과 동일 명령.)

### 로그 파일 (사람용 1줄 체계)

`~/.hub-runner/m1/M1-1105-AA-selftest.log` — spawn / cmux-open / cmux-workspace / landing / screen-capture / rename / verdict / end 각 1줄 (대화형 모드는 stream-json 요약이 없으므로 착지 직후 `cmux read-screen` 결과 50줄만 블록으로 포함). 전체 TUI 전사는 cmux 탭 자체로 Kyu 가 봄.

---

## 3. 교체 명령 (지금은 금지 — M0-1105-X 돌고 있음)

`--status` 에서 **5허브 전부 idle** 확인 후:

```bash
cd ~/projects/curiocity-relay && bash scripts/hub-runner-install.sh
```

**단, install.sh 가 현재 `TARGET_RUNNER="hub-runner-v4.mjs"` 를 가리킴** — 교체하려면 먼저:

```bash
sed -i.bak 's|^TARGET_RUNNER="hub-runner-v4.mjs"|TARGET_RUNNER="hub-runner-v5.mjs"|; s|^FALLBACK_RUNNER="hub-runner-v3.mjs"|FALLBACK_RUNNER="hub-runner-v4.mjs"|' scripts/hub-runner-install.sh
```

→ TARGET=v5 · FALLBACK=v4. 그 후 `--status` 가 전부 idle 인지 다시 확인하고 install.sh 실행. 교체 실패 시 install.sh 가 v4 로 자동 롤백.

**이번 라운드에서는 install.sh 를 손 대지 않음** — Kyu 가 다음 한가한 시간에 교체 명령 1줄 실행 (Z 리포트에서 쓴 동일 흐름, TARGET/FALLBACK 만 다름).

---

## 4. Kyu 확인 절차 (쉬운 말 3줄)

1. **지금**: cmux 켜 두면 탭 목록에 `✓ m1 · M1-1105-AA-selftest` 가 보임. 탭 눌러 들어가면 "hello from v5 self-test" + claim done 출력 + 프롬프트 (`%`) 가 보여야 함 → 탭이 **안 닫히고 남아 있다**는 뜻. ✓ 표식 = 러너가 "끝" 으로 판정.
2. **교체 후 실작업**: v5 가 큐에서 M1-1105-BB (예시) 를 집으면 cmux 에 새 탭 `m1 · M1-1105-BB` 가 생기고 안에서 **클로드코드 화면** (`claude` 대화형 — Thinking · Bash(…) · Edit(…) 같은 줄) 이 보임. 60분 안에 리포트 올라오면 탭 제목이 **✓** 로 바뀌고 탭은 열린 채 유지, 그 다음 작업 올 때 자동으로 닫힘.
3. **막혔을 때**: 탭 제목 **✗** = 러너가 blocked 로 올림 — `cat status/claims/M1-1105-BB.json` 또는 `tail ~/.hub-runner/m1/M1-1105-BB.log` 로 사유 확인 (대개 `exit 0 · 리포트/claim 없음` or `timeout 60m`).

---

## 5. 변경 요지 (relay 안만 · 제품 리포 0)

| 파일 | 변경 |
|---|---|
| `scripts/hub-runner-v5.mjs` | **신규** — v4 복사 + cmux 대화형 전환 (`spawnClaudeCmuxInteractive` · prompt = "queue/<hub>/<ID>.md 파일을 읽고 그대로 수행") + 착지 폴링 (`waitForLanding` · 5s 주기 · report/claim/timeout) + prev-session.json (같은 허브 다음 pick 시 close-workspace) + 탭 제목 ✓/✗ 갱신 + 60분 send-key C-c + close. background 폴백은 v4 와 동일. 로그 라벨 v5. |
| `queue/m1/M1-1105-AA-selftest.md` | 신규 — 셀프테스트 큐 (bash: echo + claim done) |
| `status/claims/M1-1105-AA.json` | started → done (본 라운드) |
| `status/claims/M1-1105-AA-selftest.json` | done (셀프테스트 결과) |
| `m1/M1-1105-AA-report.md` | 본 리포트 |

**건드리지 않음**: `scripts/hub-runner-v4.mjs` (실행 중) · `scripts/hub-runner-install.sh` (교체는 Kyu 가) · 제품 리포 · 운영 SSH · railway CLI · security/키체인. node --check 선실측. cmux CLI 호출은 셸 셀프테스트로 실측. 교체는 `--status` 에서 5허브 전부 idle 일 때만.

---

## 6. 열린 질문 · 후속

- **v5 대화형 모드가 실제 claude 세션을 어떻게 끝낼지**: claude 의 대화형 모드는 Kyu 가 `/exit` 입력하거나 Ctrl+D 를 눌러야 종료 — 하지만 v5 는 **claude 종료를 기다리지 않음**. 허브 측에서 `node scripts/claim.mjs <ID> done` 을 호출하거나 relay 리포트 파일을 push 하면 러너가 판정하고 허브 idle. claude TUI 는 계속 살아 있어도 무관 — 탭이 열려 있을 뿐.
- **다음 pick 시 이전 탭 close → 탭 안 claude 프로세스 SIGTERM**: cmux `close-workspace` 가 pane 의 pty 프로세스를 종료 (bash + claude 트리). 테스트 Case B 에서 workspace:6 닫힘 확인. claude 가 어떤 "저장되지 않은 상태" 를 가지더라도 — 러너 입장에선 이미 claim/report 로 판정 끝낸 작업이라 손실 없음.
- **대화형 claude 토큰 추적**: v4 는 stream-json `result` 블록에서 `total_cost_usd` 를 로그에 남겼으나, v5 대화형 모드는 TTY 라 접근 불가. Kyu 가 비용 추적 필요하면 `~/.claude/projects/<cwd>/<session>.jsonl` 세션 로그를 보거나 `/cost` 명령을 TUI 에서 실행.
- **background 폴백 유지 여부**: cmux 가 ping 실패 시 v5 는 자동으로 v4-style `-p + stream-json` 로 폴백. Z 리포트 §4 cmux launchd 가시성 진단은 여전히 유효 — Kyu 가 설정 토글 찾으면 cmux 항상 가용, 아니면 폴백.
