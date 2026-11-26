PASS (커밋·push 보류 — Kyu 판단 필요)

---

# M2-1126-T 리포트

**작업 브랜치**: `feat/M2-1126-T-runner-status-separate`  
**워크트리**: `~/projects/curiocity-relay-wts/M2-1126-T`  
**완료 시각**: 2026-11-26 (세션 내)

---

## A. 아이맥 무거운 워커 1 → 2

### 상태: 초안 완료 — 실측 수치 없어 착지 보류

**변경 파일** (워크트리 커밋 안 됨):
- `scripts/ci-box/setup.sh`: heavy2 슬롯 추가 (sp-heavy2 · fork-heavy2)
- `ledger/decision-imac-workers-20261126.md`: 분석·판정 기록

**핵심 발견**:

| 항목 | 결과 |
|------|------|
| Postgres 포트 충돌 | 없음 — 각 job이 `storeport_ci_${run_id}` 고유 DB 사용 |
| Playwright 포트 충돌 | **있음** — `apps/commerce-core/playwright.config.ts` line 17 `baseURL: "http://localhost:5173"` **하드코딩** |
| Customer Display E2E 포트 | 없음 — `CD_E2E_PORT` 환경변수로 이미 파라미터화 |

**Playwright 충돌 해결 경로**: `storeport#464` · `fork#278` 머지 후 별도 PR로 `CI_VITE_PORT` 파라미터화.

**실측 필요 (Kyu 아이맥에서 실행)**:

```bash
while true; do
  vm_stat | awk '
    /Pages free/     { free=$3 }
    /Pages active/   { active=$3 }
    /Pages wired/    { wired=$3 }
    /Pages occupied/ { compressed=$3 }
    END {
      pgsize=16384
      printf "active=%.1fGB wired=%.1fGB comp=%.1fGB\n",
        active*pgsize/1073741824, wired*pgsize/1073741824, compressed*pgsize/1073741824
    }
  '
  sysctl vm.swapusage | grep -o 'used = [0-9.]*M'
  sleep 15
done
```

**판정 기준**: heavy job 2개 동시 실행 중 swap < 2 GB → setup.sh 착지.

---

## B. 러너 상태 파일 분리

### 상태: 코드 완료 — 커밋 Kyu 승인 후

**변경 파일** (워크트리 커밋 안 됨):

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/hub-runner-v8.3.mjs` | `ALL_HEARTBEAT`, `MEM_LOG_FILE` 경로를 `REPO_ROOT/status/runners/` → `~/.hub-runner/status-wt/` 로 이동. `pushHeartbeatIfDue` 를 runner-status orphan branch 로 분리 push. 버전 v8.3.3. |
| `scripts/ci-watch.mjs` | `allJson` 경로 → `~/.hub-runner/status-wt/all.json`. 버전 v1.16. |

**원인 분석**: `~/.hub-runner/bin/hub-runner.mjs` 가 `curiocity-relay/scripts/hub-runner-v8.3.mjs` 의 심링크. `import.meta.url` 이 real path 를 사용 → `REPO_ROOT = ~/projects/curiocity-relay`. 러너가 `status/runners/all.json` 을 2분 간격으로 staged 상태로 유지 → Kyu의 `git pull` 충돌.

**수정 후 동작**: `all.json` · `mem-log.ndjson` 은 `~/.hub-runner/status-wt/` (runner-status orphan branch) 에서만 쓰고 force-push. `~/projects/curiocity-relay` 에는 절대 write 안 함.

**이미 적용된 패턴**: `state.json` 도 동일한 worktree 경로 사용 중 (기존 `writeState()`).

---

## Kyu 아침 실행 명령 블록

### 즉시 — Kyu 폴더 정리 (git pull 복구)

```bash
git -C ~/projects/curiocity-relay restore --staged status/runners/all.json
git -C ~/projects/curiocity-relay restore status/runners/all.json
git -C ~/projects/curiocity-relay pull --ff-only
```

### B 착지 — 러너 상태 파일 분리 (승인 시)

```bash
cd ~/projects/curiocity-relay-wts/M2-1126-T
git add scripts/hub-runner-v8.3.mjs scripts/ci-watch.mjs
git commit -m "fix(runner): M2-1126-T — all.json·mem-log status-wt 분리 · ci-watch v1.16
processes: [runner.heartbeat, ci.watch]"
git push origin feat/M2-1126-T-runner-status-separate
```

이후 PR 머지 → 러너 자동 self-update (다음 tick 에서 sha256 변화 감지 → 심링크 갱신 → relaunch).

### A 착지 — 무거운 워커 2개 (측정 & 포트 수정 후)

```bash
cd ~/projects/curiocity-relay-wts/M2-1126-T
git add scripts/ci-box/setup.sh ledger/decision-imac-workers-20261126.md
git commit -m "feat(ci-box): M2-1126-T — heavy 워커 2개 증설 초안 · iMac 메모리·포트 분석
processes: [ci.runner-setup]"
```

GitHub 토큰 발급 (스크립트가 묻는 것과 별개):
```bash
bash ~/projects/curiocity-relay/scripts/ci-box/setup.sh --dry-run
```

---

## PR 본문 초안 (3줄)

> **B**: runner status files(`all.json`, `mem-log.ndjson`) moved from `~/projects/curiocity-relay/status/runners/` to `~/.hub-runner/status-wt/` (runner-status orphan branch), so Kyu's git pull is never blocked by staged runner files.  
> **ci-watch v1.16**: updated `allJson` read path to match new location.  
> **A**: iMac heavy worker×2 draft prepared; Playwright port-5173 conflict and memory measurement pending — to be landed after `#464`/`#278` merge.
