# Hub Runner · 큐 자동 투입 (M2-1105-O)

**목적**: 오케가 `queue/<hub>/<ID>.md` 로 발부한 프롬프트를 각 Mac 러너가 picking → `claude -p <본문> --dangerously-skip-permissions` 로 **허브 리포 폴더에서** 실행 → `status/claims/<ID>.json` 자동 업데이트. Kyu 수동 투입 없이 24h 돌음.

**설계 근거**: 방법론 ⑯ (프롬프트 상태판·claims 신호) · Kyu 2026-11-07 결정 "A안 Mac 러너 · skip-permissions 전제".

---

## Kyu 3줄 (허브별 한 번만)

```bash
cd ~/projects/curiocity-relay
bash scripts/hub-runner-install.sh m2    # m2 자리에 m0/m1/m2/m3/r0 중 하나
tail -f ~/.hub-runner/m2/launchd.err.log  # 작동 확인
```

**끄기**: `bash scripts/hub-runner-uninstall.sh m2`
**로그**: `~/.hub-runner/<hub>/launchd.*.log` (launchd 전체) · `~/.hub-runner/<hub>/<ID>.log` (라운드별 claude 실행)

---

## 큐 규약

- 파일: `queue/<hub>/<ID>.md`
  - `<hub>` ∈ {m0, m1, m2, m3, r0}
  - `<ID>` = 라운드 ID (예: `M2-1105-O-selftest`)
  - 본문 = **프롬프트 원문 그대로**. 첫 줄 "허브-월일-알파벳 (ID)" 권장.
- **발부자 = 오케** (git commit)
- **취소**: 파일 삭제 or `status/claims/<ID>.json` 에 `state: "cancelled"`

---

## 러너 동작 사이클

1. 60 s 마다 `git pull --rebase --quiet`
2. `queue/<hub>/*.md` 스캔 → claim 없는/`issued` 상태인 것 중 **파일명 최솟값** 1개 선택
3. `node scripts/claim.mjs <ID> started "runner"` → commit + push
4. `claude -p "<본문>" --dangerously-skip-permissions` 를 **허브 리포 폴더** 에서 spawn
   - 허브 폴더 = `hubs.json[hub].cwd` (또는 `work_dir` → `~/projects/<work_dir>` fallback)
   - stdout/stderr → `~/.hub-runner/<hub>/<ID>.log`
5. 종료 코드
   - `0` → `claim.mjs done "runner exit 0 · 로그: ..."`
   - `N` → `claim.mjs blocked "runner exit N · 로그: ... · blocked_by:kyu"`
   - 단, **허브가 이미 done/blocked/cancelled 올렸으면 덮어쓰지 않음** (pull 로 최신 확인)
6. 허브당 **동시 1개**만 — `~/.hub-runner/<hub>.lock` 파일로 보장
7. Stale lock 10 분 뒤 자동 해제 (비정상 종료 복구)
8. Heartbeat: 5 분마다 `status/runners/<hub>.json {at, pid, current}` 커밋 (변화 없으면 skip)

---

## 수동 실행 (디버그)

```bash
cd ~/projects/curiocity-relay
node scripts/hub-runner.mjs m2 --once   # 1 tick 만 돌고 exit (launchd 없이 즉시 테스트)
node scripts/hub-runner.mjs m2           # 상시 loop (Ctrl+C 로 종료)
```

**선택적 override**:
- `--cwd <path>` : hubs.json 의 cwd 무시하고 특정 폴더 사용
- `CLAUDE_BIN=<path>` : claude 바이너리 경로 강제 (기본값: `which claude` → `/Applications/cmux.app/.../claude`)

---

## 보안

- 큐 파일 · 로그 · claim · heartbeat 전부 **public relay 리포에 커밋**. 시크릿을 큐 파일/로그에 쓰면 안 됨.
- `--dangerously-skip-permissions` 는 허브 리포 내부에서만 작용. Kyu 가 발부한 프롬프트만 신뢰.
- Runner 가 사용하는 `claude` 는 Kyu 로컬 session (API key) 그대로 — 세션 공유를 피하려면 전용 계정 분리.

---

## 파일 지도

```
curiocity-relay/
├─ queue/<hub>/<ID>.md              ← 오케 발부
├─ scripts/hub-runner.mjs           ← 러너
├─ scripts/hub-runner-install.sh    ← launchd 설치
├─ scripts/hub-runner-uninstall.sh  ← launchd 제거
├─ scripts/claim.mjs                ← 라운드 상태 1줄 (M2-1105-N)
├─ status/claims/<ID>.json          ← 라운드 state (started/blocked/done/cancelled)
├─ status/runners/<hub>.json        ← 허브 러너 heartbeat
└─ docs/hub-runner.md               ← 이 문서
```
