# Hub Runner · 큐 자동 투입 (M1-1105-S / Y · 단일 프로세스)

> **v7.5 (M0-1119-I)**: v7.4 기반 + CI 상태·기록 + suspect_done 기록-only.
> 추가 요소(전부 `v7.4` 와 **추가-only**):
> - **백그라운드 CI 조회**: tick 과 분리된 fire-and-forget 1개(동시 1개만 · 전체 마감 30초).
>   결과는 메모리 `latestCi` 에 저장 · 다음 heartbeat 가 `all.json.ci` 로 읽기만. 실패/시간초과면
>   `{error, at}` 만. 러너 본체(큐 폴링 · claim · pull)에 `await` 추가 없음.
> - **스코프 확장**: `RUNNER_SCOPE_PREFIXES` 에 `status/ci/` 추가 → jsonl 이 safePull 의
>   out-of-scope 로 오인되지 않음. heartbeat 커밋에 `git add status/ci` 포함.
> - **분류**: GitHub job API 의 `labels` + `runner_name` 으로 mac-heavy · mac-light · cloud
>   분류 (run 레벨의 `runner_labels` 는 존재하지 않아 사용 금지).
> - **기록 범위**: 직전 lookback 이후 **completed 된 run 의 모든 job** 을 저장 (진행 중 run
>   안의 끝난 job만 보던 범위 버그 수정). wait = `job.created_at→started_at` · 날짜 =
>   `job.completed_at` 의 WIB. `storeport` + fork(KyuuuLee/storeport) 둘 다 조회.
> - **비용 추정**: `cloud_cost_est_usd` = Σ ceil(run_min) × `CLOUD_COST_PER_MIN_USD` ($0.008/min,
>   GitHub Linux 2-core 추정 단가 · 무료분/저장소 설정 미반영 · 상대 비교용 추정치).
> - **suspect_done 기록-only**: started 인데 `/tmp/<ID>-report.md` 가 있고 claim.at 로부터
>   15분 이상 지났으면 `all.json.hubs.<h>.suspect_done:{since,id}` 만 기록. 창 입력·busy
>   조작·blocked 승격 **일절 안 함** — 판단·조치는 오케 몫.
>
> **v3 (M1-1105-Y)**: 허브별 모델 (`hubs.<hub>.model`, R0/M2=sonnet · M0/M1/M3=opus) · 60 분 상한 (`run_timeout_min`, 초과 시 claim blocked note "timeout 60m" blocked_by=oke) · heartbeat 30 분 (`heartbeat_min`, 로컬 `status/runners/all.json` 은 매 tick 갱신 · git commit/push 만 30 분) · `--status` 에 model/elapsed/remaining · cmux workspace 이름 `<hub> · <ID>`. install.sh TARGET=`hub-runner-v3.mjs`, 실패 시 v2 자동 롤백.

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
7. 5 분마다 `status/runners/all.json` 1 커밋 (`chore(runner): heartbeat · m0=... · m1=... · ...`). ci 블록 + `ci.today` 블록 포함.
8. **suspect_done 감지** (M0-1119-H): started 허브가 cmux 창 프롬프트 5분+ · `/tmp/<ID>-report.md` 존재 → `착지 명령을 지금 실행해` 1회 tmux send-keys. 10분 내 claim 없으면 `blocked (done-not-landed)` 승격.

---

## CI 이력 · 러너 종류 · 비용 (M0-1119-H)

heartbeat 마다 GitHub API 에서 완료된 job 을 `status/ci/<YYYY-MM-DD WIB>.jsonl` 에 기록 (중복 방지 · job id 기준).

**runner_kind 분류**:

| runner_kind | 조건 |
|-------------|------|
| `mac-heavy` | runner_name 에 `curiocity-mac-heavy` / `MacBook` / `-M1` 포함 OR labels 에 `curiocity-mac` |
| `mac-light`  | runner_name 에 `curiocity-mac-light` 포함 OR labels 에 `curiocity-mac-light` |
| `cloud`      | 그 외 (ubuntu-latest 등) |

**jsonl 필드**: `{id, repo, pr, workflow, job, runner_kind, runner_name, queued_at, started_at, completed_at, wait_min, run_min, conclusion}`

**ci.today 요약** (`all.json` 의 `ci.today` 키):

```json
{
  "mac-heavy": { "jobs": N, "avg_wait_min": X, "avg_run_min": Y, "success_rate": Z, "run_min_total": T },
  "mac-light":  { ... },
  "cloud":      { ... },
  "cloud_cost_usd": C,
  "wasted_min": W
}
```

**비용 계산**: ubuntu (cloud) 러너 한정 · `ceil(run_min) × $0.008` per job.
**wasted_min**: `conclusion === "cancelled"` 인 job 의 `run_min` 합.

---

## 감시 화면 (M1-1123-I)

```
node ~/projects/curiocity-relay/scripts/ci-watch.mjs
```

빨간 줄 뜻: `⚠ relay 충돌 · 사람 필요: <파일>` → git 충돌 Kyu 직접 해소 / `⚠ 러너 응답 없음(Mac 잠자기?)` → Mac 잠금 해제 필요 / `⚠ 미투입: <ID>` → 러너가 큐를 처리 못하는 중 / `⚠ GitHub에 못 올린 기록 N개` → push 지연.

macOS 알림: 새 빨간 경보가 생길 때 1회 알림 (같은 경보 반복 안 함 · 해소되면 초기화).

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
├─ scripts/hub-runner.mjs           ← 레거시 `-p` 러너 (운영 사용 중단 · 설치 target 아님)
├─ scripts/hub-runner-v7.5.mjs      ← **현 설치 target (M0-1119-I · v7.4 + CI 추가-only)**
├─ scripts/hub-runner-v7.4.mjs      ← 직전 버전 (fallback target · Kyu 폴더 감시)
├─ scripts/lib/ci-health.mjs        ← storeport+fork CI 조회 (job.labels+runner_name 분류 · 완료-run 범위)
├─ scripts/lib/ci-history.mjs       ← jsonl + today 요약 + cloud_cost_est_usd (M0-1119-I · WIB per-job)
├─ scripts/lib/ci-background.mjs    ← 동시 1개 · 30s 마감 fire-and-forget 러너
├─ scripts/lib/ci-suspect.mjs       ← suspect_done 기록-only 판정 (tmux/busy/blocked 조작 금지)
├─ scripts/hub-runner-install.sh    ← launchd 설치 (TARGET=hub-runner-v7.5.mjs · 인자 없음 = 전체)
├─ scripts/hub-runner-uninstall.sh  ← launchd 제거 (단일 + 레거시 plist 전부)
├─ scripts/claim.mjs                ← 라운드 state 1 줄 + --blocked-by 지원 (M1-1105-S)
├─ status/claims/<ID>.json          ← 라운드 state (started/blocked/done/cancelled)
├─ status/runners/all.json          ← 러너 heartbeat (단일 파일 · ci + ci.today 포함)
├─ status/ci/<YYYY-MM-DD WIB>.jsonl ← 완료된 CI job 이력 (날짜별 · M0-1119-H)
├─ status/runner-config.json        ← 허브별 cwd 지도 (M1-1105-S)
└─ docs/hub-runner.md               ← 이 문서
```
