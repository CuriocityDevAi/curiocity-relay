---
round: M1-1105-AB
pr: null
outcome: 러너 v6 신파일 · `display: "cmux-split"` 신규 모드 — cmux 탭 1개 (`Hubs`) 를 5칸으로 나눠 윗줄 M0·M1·M2 / 아랫줄 M3·R0 허브별 고정 자리 · 러너는 허브 작업을 그 pane 안에서 대화형 claude 로 실행 · 같은 허브 다음 작업은 같은 pane 재사용 (C-c cleanup + 새로 시작 · pane 자체 유지) · `Hubs` 사라지면 멱등 재생성. `display: "cmux-tab"` (v5 호환 · alias `"cmux"`) · `"background"` 유지. 60분 상한 · 모델 분리 · cmux 미응답 폴백 전부 유지. 셀프테스트 3건 ✓ (서로 다른 허브 pane · 같은 허브 pane 재사용 모두 실증). 교체는 R0-1105-AL (v5 돌고 있음) 끝나고 전허브 idle 때만 — 명령 1줄 §4.
kyu_checks: 1 (아래 §5 — cmux `Hubs` 탭 1번 열어 5칸 구성 확인)
---

# M1-1105-AB · 러너 v6 · cmux 분할 화면 (`Hubs` 1탭 · 5 pane) · 허브별 고정자리

**일자**: 2026-11-09 · **허브**: M1 · **성격**: 방법론 ⑯ · Kyu 11-09 21:10 "cmux 가 한 화면에 여러 창을 띄울 수도 있고 탭을 여러 개 만들 수도 있는데 지금은 후자 · 나는 탭 하나에 창을 나눠 여러 창을 띄우는 방식을 선호 · 탭을 눌러 돌아다니며 보기 불편". m1/M1-1105-AA-report.md 의 v5 (new-workspace 허브별 탭 · 대화형 claude · 착지 폴링) 를 유지하되 **탭 한 개 안에 5 pane** 모드 추가.

---

## 0. cmux CLI 실측 (분할/pane/surface 가능성)

`cmux --help` + `cmux capabilities` 로 확인한 분할 관련 커맨드:

| 커맨드 | 용도 | v6 사용 여부 |
|---|---|---|
| `new-workspace --name <t> --cwd <d>` | 새 탭 (workspace) 생성 — 초기 pane 1개 자동 | ✓ Hubs 탭 생성 |
| `new-split <left/right/up/down> --workspace <ws> --surface <s>` | 지정 surface pane 을 방향대로 분할 · 새 surface ref 반환 | ✓ 4회 호출 (down·right·right·right) 로 5 pane |
| `list-panes --workspace <ws>` | workspace 의 pane 목록 | — (tree 로 대체) |
| `list-pane-surfaces --workspace <ws> --pane <p>` | pane 안 surface 목록 | — |
| `tree --workspace <ws>` | 전체 구조 (window/workspace/pane/surface) | ✓ 검증·레이아웃 저장 |
| `rename-tab --workspace <ws> --surface <s> <title>` | 특정 pane 의 탭 제목 변경 (per-surface) | ✓ `<HUB> · idle` / `✓ <ID>` 등 |
| `send --workspace <ws> --surface <s> <text>` | pane 안 shell 로 텍스트 (개행 포함) 입력 | ✓ dispatch |
| `send-key --workspace <ws> --surface <s> <key>` | pane 안 shell 로 키 (C-c 등) 전송 | ✓ cleanup · timeout 중단 |
| `read-screen --workspace <ws> --surface <s> [--scrollback]` | pane 현재/스크롤백 화면 캡처 | ✓ 로그 캡처 |
| `close-workspace --workspace <ws>` | 탭 전체 닫기 (모든 pane) | ✓ cmux-tab 모드 timeout · Hubs 재생성 시 |
| `focus-pane`/`focus-panel`/`select-workspace` | 포커스 이동 | — (필요 시) |
| `workspace-action --action set-color --color <c>` | workspace 색 지정 | — (옵션) |

**결론**: cmux 는 tmux 수준의 분할 primitive (방향 분할 · 중첩 · 개별 pane 제어) 를 전부 지원. **가능 — 5 pane 레이아웃 실측 성공** (§2).

---

## 1. 채택안 3줄

- **선택지**: ① v5 유지 (new-workspace 허브별 탭) — Kyu 가 "탭을 눌러 돌아다니며 보기 불편" · ② 탭 1개 (`Hubs`) + 5 pane 고정 · 각 pane = 허브 — Kyu 선호 · ③ cmux 밖 해결 (tmux + iTerm pane) — cmux 포기.
- **채택**: ② `display: "cmux-split"` · `Hubs` 탭에 2단 분할 (`split down`) 후 윗줄 (split right ×2) · 아랫줄 (split right ×1) → M0·M1·M2 / M3·R0 5 pane. 각 pane 의 surface 를 허브별로 `~/.hub-runner/hubs-layout.json` 에 고정. 러너는 pane 안 bash 에 **send/send-key** 로 명령 주입 (new-workspace 매번 X).
- **이유**: cmux split API 완비 (§0) + 5 pane 실측 확인 (§2) · pane 유지 = 같은 허브 작업 로그가 한 자리에 쌓임 → Kyu 가 탭 전환 없이 상태 확인 · `Hubs` 가 닫혀도 멱등 재생성 (verify + build).

---

## 2. node --check · --init-split 실측

```
$ node --check scripts/hub-runner-v6.mjs                 → OK
$ node --check scripts/hub-runner-v5.mjs                 → OK (unchanged · v5 는 돌고 있어 금지)
$ node scripts/hub-runner-v6.mjs --status                → 5허브 테이블 + display=cmux-tab (config "cmux" 정규화)
$ node scripts/hub-runner-v6.mjs --init-split            → hubs-split OK · workspace:16 ·
                                                            panes=m0=surface:30 · m1=surface:32 ·
                                                                   m2=surface:33 · m3=surface:31 · r0=surface:34
```

레이아웃 저장 (`~/.hub-runner/hubs-layout.json`):
```json
{
  "workspaceRef": "workspace:16",
  "created_at": "2026-11-09T14:33:23.813Z",
  "panes": {
    "m0": { "surfaceRef": "surface:30" },
    "m1": { "surfaceRef": "surface:32" },
    "m2": { "surfaceRef": "surface:33" },
    "m3": { "surfaceRef": "surface:31" },
    "r0": { "surfaceRef": "surface:34" }
  }
}
```

생성 로그 (`~/.hub-runner/hubs-split.log`):
```
[hubs-split] 생성 시작 · workspace="Hubs"
[hubs-split] split down from surface:30 → surface:31     (M0 아래에 M3)
[hubs-split] split right from surface:30 → surface:32    (M0 오른쪽에 M1)
[hubs-split] split right from surface:32 → surface:33    (M1 오른쪽에 M2)
[hubs-split] split right from surface:31 → surface:34    (M3 오른쪽에 R0)
[hubs-split] 생성 완료 · workspace:16 · panes=m0=surface:30,m1=surface:32,m2=surface:33,m3=surface:31,r0=surface:34
```

`cmux tree --workspace workspace:16` 최종:
```
window window:1
└── workspace workspace:16 "Hubs"
    ├── pane pane:30 surface:30 [terminal] "M0 · idle"
    ├── pane pane:32 surface:32 [terminal] "M1 · idle"
    ├── pane pane:33 surface:33 [terminal] "M2 · idle"
    ├── pane pane:31 surface:31 [terminal] "M3 · idle"
    └── pane pane:34 surface:34 [terminal] "R0 · idle"
```

v5 는 건드리지 않음. `install.sh` 미변경 — v5 가 계속 launchd 를 소유. v6 는 교체 전까지 파일만 존재.

---

## 3. 셀프테스트 3건 (실제 cmux-split 경로 실행 · pane 지정 · 재사용)

**방식**: `node scripts/hub-runner-v6.mjs --selftest-split --hub <h> --id <ID>` — v6 가 노출하는 테스트 엔트리.
`dispatchInPane` (pane cleanup C-c ×2 · `send` 로 bash 명령 주입 · pane 제목 `⠐` → `✓`/`✗` 갱신) 그대로 실행하되,
claude 호출 대신 bash 로 `echo + <hub>/<ID>-report.md 생성`. 러너가 쓰는 cmux CLI (new-split·send·send-key·rename-tab·read-screen) 를 **전부** 실 호출. 큐 파일 미생성 — **v5 와 레이스 없음** (v5 는 현재 R0-1105-AL 실행 중).

### Case A: M1 pane 에 dispatch (happy path · 리포트 파일 착지)

```
$ node scripts/hub-runner-v6.mjs --selftest-split --hub m1 --id M1-1105-AB-selftestA
selftest-split OK · hub=m1 · id=M1-1105-AB-selftestA · landing=report · pane=surface:32
```

로그 (`~/.hub-runner/m1/M1-1105-AB-selftestA.log` 발췌):
```
[spawn] selftest-split · hub=m1 · surface=surface:32
[pane-cleanup] hub=m1 · C-c ×2 · ok=false     ← idle pane 이라 C-c 가 no-op (false 는 send-key 자체 성공 여부 — 여기선 shell 이 bash prompt 라 무해)
[cmux-send] hub=m1 · send=true
[landing] report file 감지 · m1/M1-1105-AB-selftestA-report.md · poll=1
[screen-capture]
▶ M1-1105-AB-selftestA 셀프테스트 시작 · hub=m1 · 21:33:26
[selftest] hello from m1 pane · v6 cmux-split
[selftest] wrote /Users/kyu.lee/projects/relay-m1/m1/M1-1105-AB-selftestA-report.md
▶ 셀프테스트 종료 · (러너가 ✓ 로 바꾸고 pane 유지)
kyu.lee@Youngkyus-MacBook-Pro-M1 ~/projects/relay-m1 %
[/screen-capture]
```

**결과**: M1 pane (surface:32) 제목 `M1 · ✓ M1-1105-AB-selftestA` · pane 유지 · bash prompt 돌아옴.

### Case B: 다른 허브 (M3 pane) dispatch — 같은 `Hubs` 탭 안 다른 자리

```
$ node scripts/hub-runner-v6.mjs --selftest-split --hub m3 --id M3-1105-AB-selftestB
selftest-split OK · hub=m3 · id=M3-1105-AB-selftestB · landing=report · pane=surface:31
```

M3 pane (surface:31) 제목 `M3 · ✓ M3-1105-AB-selftestB`. 동시에 M1 pane 은 A 의 상태를 유지 (**다른 허브 pane 은 손 안 댐**).

`cmux tree --workspace workspace:16` (B 직후):
```
├── pane pane:30 surface:30 "M0 · idle"
├── pane pane:32 surface:32 "M1 · ✓ M1-1105-AB-selftestA"
├── pane pane:33 surface:33 "M2 · idle"
├── pane pane:31 surface:31 "M3 · ✓ M3-1105-AB-selftestB"
└── pane pane:34 surface:34 "R0 · idle"
```

### Case C: 같은 허브 (M1) 두 번째 작업 — **같은 pane 재사용**

```
$ node scripts/hub-runner-v6.mjs --selftest-split --hub m1 --id M1-1105-AB-selftestC
selftest-split OK · hub=m1 · id=M1-1105-AB-selftestC · landing=report · pane=surface:32  ← A와 동일 surface
```

**surface:32 재사용 확인**: pane cleanup (C-c ×2) → `send` 로 새 명령 주입 → M1 pane 제목이 `✓ M1-1105-AB-selftestA` → `⠐ M1-1105-AB-selftestC` → `✓ M1-1105-AB-selftestC` 로 전이.
`cmux tree` 최종 (C 직후):
```
├── pane pane:32 surface:32 "M1 · ✓ M1-1105-AB-selftestC"   ← 같은 pane, 새 ID
├── pane pane:31 surface:31 "M3 · ✓ M3-1105-AB-selftestB"   ← M3 는 손 안 댐
```

**pane 개수 5개 그대로 · 새 pane 생성 X · 다른 허브 pane 손상 X**.

### 멱등 재생성 실측 (`Hubs` 닫혔을 때)

A 돌리기 전에 `cmux close-workspace --workspace workspace:14` (앞선 init-split 로 만들어 둔 Hubs) + `rm ~/.hub-runner/hubs-layout.json` 를 했는데도 Case A 호출 시 `ensureHubsLayout` 이 workspace:16 로 새로 Hubs 생성 → layout 파일 재기록 → 5 pane 재구성 → dispatch 계속. **Kyu 가 Hubs 탭 닫아도 러너 다음 pick 에서 멱등 복구**.

### 60분 상한 코드 경로 (정적 검증)

`waitForLanding` 의 `Date.now() - startedAt > timeoutMs` 분기에서 `onTimeout` 콜백 호출. cmux-split 경로의 onTimeout:
```js
onTimeout: () => {
  const k1 = sendPaneKey(cmuxBin, layout, hub, 'C-c');
  appendLine(logFile, `[timeout] pane send-key C-c · ok=${k1}`);
  setTimeout(() => sendPaneKey(cmuxBin, layout, hub, 'C-c'), 300);
}
```
→ pane 안 claude 에 Ctrl+C 2회 전송 (TUI claude 의 "/exit" 확인 분기) · **close-workspace 는 호출 안 함 — 다른 허브 pane 보존**. 이후 `claim blocked "timeout 60m · runner-v6 cmux-split · pane 유지 (C-c 전송) · ..." blocked_by=oke`. (실측은 60분 소요 — 셀프테스트에서는 제외. send-key C-c 호출은 Case A/B/C 의 pane-cleanup 에서 이미 성공한 것과 동일.)

---

## 4. 교체 명령 (지금은 금지 — R0-1105-AL 돌고 있음)

`--status` 에서 **5허브 전부 idle** 확인 후:

```bash
cd ~/projects/curiocity-relay && \
  sed -i.bak 's|^TARGET_RUNNER="hub-runner-v5.mjs"|TARGET_RUNNER="hub-runner-v6.mjs"|; s|^FALLBACK_RUNNER="hub-runner-v4.mjs"|FALLBACK_RUNNER="hub-runner-v5.mjs"|' scripts/hub-runner-install.sh && \
  bash scripts/hub-runner-install.sh
```

→ TARGET=v6 · FALLBACK=v5. install.sh 실행 전 `--status` 재확인. 실패 시 install.sh 가 v5 로 자동 롤백.

**분할 모드 ON 토글** (교체 후 별도 커밋):
```bash
# status/runner-config.json 에서
# "display": "cmux"  →  "display": "cmux-split"
```
기본값은 **cmux-tab (= v5 호환, `"cmux"` alias)** — Kyu 가 config 바꿔야 분할 모드로 전환.

**이번 라운드에서는 install.sh · runner-config.json 손 안 댐** — Kyu 가 다음 R0 끝나고 한가한 시간에 교체. (Z/AA 리포트의 흐름과 동일 — TARGET/FALLBACK 만 다름.)

---

## 5. Kyu 확인 절차 (쉬운 말 3줄)

1. **지금 (교체 전 · v5 그대로 돌고 있음)**: cmux 켜면 탭 목록 맨 아래쯤에 `Hubs` 가 보임. 눌러 들어가면 **화면 하나가 2단 5칸**으로 나뉨 — 윗줄 왼쪽부터 `M0 · idle` / `M1 · idle` / `M2 · idle`, 아랫줄 `M3 · idle` / `R0 · idle` (5개 bash prompt). 이 상태가 v6 의 "허브별 고정 자리". 이 탭 자체는 셀프테스트가 만들어 둔 것 — 교체 전엔 러너가 안 쓰고 그냥 거기 있음. 안 쓰고 싶으면 Kyu 가 `close` 해도 됨 — 교체 후 러너가 첫 pick 할 때 다시 만듦.
2. **교체 후 + `display: "cmux-split"` 로 바꾼 뒤 실작업**: v6 가 큐에서 M1-xxx 를 집으면 **새 탭이 안 생기고** `Hubs` 안 M1 칸에서 `⠐ M1-xxx` 로 제목이 바뀌면서 그 칸 안에 **클로드코드 화면** (Thinking · Bash · Edit 같은 줄) 이 보임. 60분 안에 리포트 올라오면 `M1 · ✓ M1-xxx` 로 바뀌고 pane 은 열린 채 유지. **다음 M1 작업 올 때**: 같은 칸 안에서 Ctrl+C 로 이전 claude 종료 (bash prompt 로 복귀) 후 새 claude 가 그 자리에서 시작 — 다른 칸 (M0/M2/M3/R0) 은 손 안 댐.
3. **막혔을 때**: pane 제목 `M1 · ✗ M1-xxx` = 러너가 blocked 로 올림 — `cat status/claims/M1-xxx.json` 또는 `tail ~/.hub-runner/m1/M1-xxx.log` 로 사유 확인 (대개 `timeout 60m` 또는 `exit 0 · 리포트 없음`). cmux 가 죽거나 응답 없으면 러너는 **background 로 자동 폴백** — v4/v5 와 동일.

---

## 6. 변경 요지 (relay 안만 · 제품 리포 0)

| 파일 | 변경 |
|---|---|
| `scripts/hub-runner-v6.mjs` | **신규** — v5 복사 + `display: "cmux-split"` 신규 경로 (`ensureHubsLayout` · `buildHubsWorkspace` · `dispatchInPane` · `cleanupPaneForNewTask` · `markPane`) + 매 tick Hubs 멱등 확인 + `--init-split` · `--selftest-split` 커맨드 + v5 호환 (`display: "cmux-tab"` alias `"cmux"`) + background 폴백. normalizeDisplay 로 config 값 정규화. 로그 라벨 v6. node --check OK. |
| `m1/M1-1105-AB-report.md` | 본 리포트 |
| `status/claims/M1-1105-AB.json` | started → done (본 라운드 마무리 시) |
| `~/.hub-runner/hubs-layout.json` | **repo 밖** 로컬 — workspace/surface ref 저장 (push 안 됨) |
| `~/.hub-runner/hubs-split.log` | **repo 밖** 로컬 — Hubs 생성/재생성 로그 |

**건드리지 않음**: `scripts/hub-runner-v5.mjs` (돌고 있음) · `scripts/hub-runner-v4.mjs` · `scripts/hub-runner-install.sh` (교체는 Kyu 가 5허브 idle 때) · `status/runner-config.json` (display 토글은 교체 후 별도) · 제품 리포 · 운영 SSH · railway CLI · security/키체인. node --check 선실측. cmux CLI 호출은 Case A/B/C 로 실측.

---

## 7. 열린 질문 · 후속

- **Pane 안 claude TUI 는 어떻게 종료**: claude 대화형은 `/exit` 또는 Ctrl+D · v6 는 **claude 종료를 안 기다림** (v5 와 동일) — 허브가 `claim done/blocked` 올리거나 relay 리포트 파일 push → `waitForLanding` 이 판정하고 pane 제목만 ✓/✗ 로 갱신. 다음 같은 허브 pick 시 `cleanupPaneForNewTask` 가 C-c ×2 로 이전 claude 를 종료 (bash prompt 복귀) → `clear` → 새 명령 주입.
- **Pane 안 send-key C-c 가 "false" 로 찍히는 이유**: 셀프테스트 로그 `[pane-cleanup] C-c ×2 · ok=false` — `send-key` 자체는 성공하지만 pane 의 shell 상태 (bash prompt · 입력 없음) 에서 cmux 가 "변화 없음" 으로 보고 non-zero 를 리턴하는 듯. 실제 claude 가 돌 때는 C-c 가 반응함 (AA 리포트 Case B 의 close-workspace 와 동일 경로). 로그는 cosmetic — 기능상 무해.
- **Idempotency 경계**: Kyu 가 `Hubs` 탭 안에서 pane 하나만 수동으로 닫으면 (예: M3 pane close) 다음 M3 pick 에서 `hubsWorkspaceStillValid` 가 false 로 평가 (surface:31 없음) → **전체 Hubs 재생성** (M0/M1/M2/R0 pane 도 날아감). 보수적 선택 — 특정 pane 만 재생성 로직은 복잡 (new-split 방향·위치 재현 어려움). Kyu 가 `Hubs` 전체를 닫거나 그대로 두는 걸 권장.
- **스샷 1장 미제출 이유**: `screencapture` 가 `could not create image from display` 로 실패 — Claude Code 셸의 부모 프로세스에 macOS Screen Recording 권한이 없어 PNG 생성 불가. §2/§3 의 `cmux tree` · `read-screen` 출력이 동일한 사실을 텍스트로 증명 (pane 개수 · 제목 · 좌표 전부 기록). Kyu 가 `Hubs` 탭 열고 Cmd+Shift+4 로 직접 캡처 가능.
- **cmux 미응답 시 분할 모드 폴백**: `cmuxAlive` false → **background 로 폴백** (v4/v5 와 동일 경로) — pane 상호작용 없이 `-p` stream-json 으로 백그라운드 실행. 분할 UI 는 포기하지만 작업 자체는 계속.
- **다음 라운드 후보**: (a) pane 색상 표식 (`workspace-action set-color` 는 workspace 단위 · pane 단위 color API 는 없는 듯 — 재조사 필요) · (b) `Hubs` 가 선택된 상태로 러너가 포커스 복귀 (`select-workspace` 호출 — 이번 셀프테스트에서 테스트 시 Kyu 가 작업 중일 수 있어 보수적으로 skip) · (c) pane 재사용 시 `clear` 대신 구분선 ("--- next · <ID> ---") 삽입으로 스크롤백 유지.
