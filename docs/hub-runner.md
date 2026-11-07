# Hub Runner · 큐 자동 투입 (M1-1105-S · 단일 프로세스)

**목적**: 오케가 `queue/<hub>/<ID>.md` 로 발부한 프롬프트를 Mac 러너 1 프로세스가 picking → `claude -p <본문> --dangerously-skip-permissions` 로 **허브 리포 폴더에서** 실행 → `status/claims/<ID>.json` 자동 업데이트. Kyu 수동 투입 없이 24h 돌음.

**설계 근거**: 방법론 ⑯ (프롬프트 상태판·claims 신호) · Kyu 2026-11-07 결정 "A안 Mac 러너" · M2-1105-O 리포트 + Kyu 실설치 로그 (cwd=null · unstaged changes · multiple branches) 재발 방지.

---

## Kyu 2줄 (전체 1 번만)

```bash
cd ~/projects/curiocity-relay
bash scripts/hub-runner-install.sh         # 인자 없음 = m0/m1/m2/m3/r0 전부
tail -f ~/.hub-runner/launchd.err.log      # 작동 확인
```

**끄기**: `bash scripts/hub-runner-uninstall.sh`
**로그**: `~/.hub-runner/launchd.*.log` (launchd 전체) · `~/.hub-runner/<hub>/<ID>.log` (라운드별 claude 실행)

---

## 뿌리 수정 (M1-1105-S)

1. **cwd 분리**: `status/runner-config.json` {hubs:{m0:{cwd}, m1:{cwd}, …}} — `build-hubs.mjs` 가 `hubs.json` 을 다시 써도 무영향. hubs.json 의 `cwd` 는 더 이상 참조하지 않음.
2. **단일 프로세스**: `node scripts/hub-runner.mjs --all` 한 루프가 5 허브를 처리. git 작업 (pull/commit/push) 전부 메인 프로세스에서 **직렬**. claude 실행만 허브별 child 로 병렬 (동시 최대 5).
3. **git 안전**: `git pull --rebase origin main` (branch 명시) · 실패 시 `git rebase --abort`. 변경 범위는 `status/claims` · `status/runners` · `status/hubs.json` 로 한정 — 스코프 밖 변경은 건드리지 않고 pull 자체를 건너뜀 (로그 경고).
4. **heartbeat 1 파일**: 5 분마다 `status/runners/all.json` 커밋. 허브별 `m0.json … r0.json` 은 더 이상 쓰지 않음.
5. **공존**: 큐 ID 가 이미 `started/in_progress` (허브 수동 투입) 이면 skip. `blocked` 는 claim 안에 `blocked_by:"kyu"` + note 에 로그 경로.
6. **launchd 1 개**: 단일 `com.curiocity.hub-runner` plist. 설치 스크립트가 레거시 `com.curiocity.hub-runner.<hub>.*` plist 를 bootout + 삭제.

---

## 큐 규약

- 파일: `queue/<hub>/<ID>.md`
  - `<hub>` ∈ {m0, m1, m2, m3, r0}
  - `<ID>` = 라운드 ID (예: `M1-1105-S-selftest`)
  - 본문 = **프롬프트 원문 그대로**. 첫 줄 "허브-월일-알파벳 (ID)" 권장.
- **발부자 = 오케** (git commit)
- **취소**: 파일 삭제 or `status/claims/<ID>.json` 에 `state: "cancelled"`

---

## 러너 동작 사이클

1. 60 s 마다 `safePull`
   - 스코프 (`status/claims` · `status/runners` · `status/hubs.json`) 밖 변경이 있으면 pull 건너뜀 (경고 로그).
   - `git fetch origin main` + `git pull --rebase origin main` — branch 명시.
   - rebase 실패 시 `git rebase --abort` 후 다음 폴에 재시도.
2. 각 허브마다 `queue/<hub>/*.md` 스캔 → claim 없는/`issued` 상태 **파일명 최솟값** 1개 선택.
3. `status/runner-config.json` 의 cwd 확인 — 없거나 부재면 해당 허브 **skip** (claim 안 바꿈).
4. claim-op 큐에 `started` 넣고 `claude -p "<본문>" --dangerously-skip-permissions` 를 **허브 cwd** 에서 child 로 spawn (병렬).
5. claude 종료 → `safePull` 로 허브가 직접 올린 claim 반영 → `done`/`blocked` 결정:
   - 허브가 이미 `done/blocked/cancelled` 올렸으면 **덮어쓰지 않음**.
   - exit 0 → `done · 로그: ...`
   - exit N → `blocked`, payload 에 `blocked_by:"kyu"`, note = `runner exit N · 로그: ...`.
6. claim-op 큐는 메인 루프가 **1 개씩 drain** — git commit 직렬화.
7. 5 분마다 `status/runners/all.json` 1 커밋 (`chore(runner): heartbeat · m0=... · m1=... · ...`).

---

## 수동 실행 (디버그)

```bash
cd ~/projects/curiocity-relay
node scripts/hub-runner.mjs --all --once      # 1 tick 만 돌고 exit (셀프테스트)
node scripts/hub-runner.mjs --all             # 상시 loop
node scripts/hub-runner.mjs --hub m2          # 단일 허브 (디버그)
```

**선택적 override**:
- `CLAUDE_BIN=<path>` : `runner-config.json` 의 `claude_bin` 보다 우선 (디버그용).

---

## claude 경로·모델 바꾸는 법 (M1-1105-T)

1. 버전 비교: `/Applications/cmux.app/Contents/Resources/bin/claude --version` 과 `/opt/homebrew/bin/claude --version` 중 최신 쪽 경로 확인 (둘 다 구버전이면 `npm i -g @anthropic-ai/claude-code@latest` 후 `which claude` 경로 사용).
2. `status/runner-config.json` 의 `claude_bin` (전역) 또는 `hubs.<hub>.claude_bin` (허브별 override) 를 그 경로로 교체. 모델은 `model` 필드 (기본 `opus` 별칭 · 허브별 `hubs.<hub>.model` 지원).
3. launchd 재적용: `launchctl kickstart -k gui/$(id -u)/com.curiocity.hub-runner` — 러너가 재기동되며 새 바이너리/모델 로 spawn. 스폰 로그 헤더에 `claude_version` · `model` · `process_env_path` 기록됨.

---

## 보안

- 큐 파일 · 로그 · claim · heartbeat 전부 **public relay 리포에 커밋**. 시크릿을 큐 파일/로그에 쓰면 안 됨.
- `--dangerously-skip-permissions` 는 허브 리포 내부에서만 작용. Kyu 가 발부한 프롬프트만 신뢰.
- `runner-config.json` 의 cwd 는 러너 실행자 홈 하위. 운영 전 Kyu 가 직접 확인.

---

## 파일 지도

```
curiocity-relay/
├─ queue/<hub>/<ID>.md              ← 오케 발부
├─ scripts/hub-runner.mjs           ← 러너 (단일 프로세스 --all)
├─ scripts/hub-runner-install.sh    ← launchd 설치 (인자 없음 = 전체)
├─ scripts/hub-runner-uninstall.sh  ← launchd 제거 (단일 + 레거시 plist 전부)
├─ scripts/claim.mjs                ← 라운드 state 1 줄 + --blocked-by 지원 (M1-1105-S)
├─ status/claims/<ID>.json          ← 라운드 state (started/blocked/done/cancelled)
├─ status/runners/all.json          ← 러너 heartbeat (단일 파일)
├─ status/runner-config.json        ← 허브별 cwd 지도 (M1-1105-S)
└─ docs/hub-runner.md               ← 이 문서
```
