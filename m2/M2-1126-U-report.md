PASS · relay#60 · storeport#467

## 완료 항목

### 1) relay PR #60 — B 러너 상태 파일 분리
- 브랜치: `feat/M2-1126-T-runner-status-separate`
- 커밋: b7f84b15d
- **ALL_HEARTBEAT** `REPO_ROOT/status/runners/all.json` → `~/.hub-runner/status-wt/all.json`
- **MEM_LOG_FILE** `REPO_ROOT/status/runners/mem-log.ndjson` → `~/.hub-runner/status-wt/mem-log.ndjson`
- push 경로: runner-status 브랜치 (force push, STATUS_WT_PATH worktree 경유)
- RUNNER_SCOPE_PREFIXES에서 `status/runners/` 삭제
- ci-watch 1.16: `PATHS.allJson` 1곳 `~/.hub-runner/status-wt/all.json` 로 변경
- setup.sh: heavy2 슬롯 2개 추가 (sp-heavy2 · fork-heavy2)
- ledger/decision-imac-workers-20261126.md 추가
- **selftest 버그 수정**: selftest-auto-recover 가 여전히 REPO_ROOT에 임시 파일 생성 후 staging 하도록 수정 (ALL_HEARTBEAT 분리 후 not-staged 버그)
- **ci-watch #59 충돌 주의**: PR #59(M2-1126-S, v1.16) 과 같은 파일 — 머지 순서 #59 → #60(rebase 후 1.17 bump). R0/오케 판단.

### grep 증명: Kyu 폴더에 더 이상 쓰지 않음

```
# production writeFileSync
grep "writeFileSync.*ALL_HEARTBEAT\|writeFileSync.*MEM_LOG_FILE" hub-runner-v8.3.mjs
# → ALL_HEARTBEAT = STATUS_WT_PATH/all.json (line 285)
# → MEM_LOG_FILE  = STATUS_WT_PATH/mem-log.ndjson (line 286)

# REPO_ROOT에 status/runners/ 쓰기 = selftest 전용(임시 파일, 단 1곳)
grep "git\(\['add', 'status/runners" hub-runner-v8.3.mjs
# → 4610: selftest-auto-recover 임시 파일만 (production 경로 아님)
```

### self-update 경로 코드 확인 (본 PR 무변경)
- `sha256File(SELF_SCRIPT_ABS)` — 부팅 시 sha256 기록 (line 215)
- `selfUpdateDetect()` — tick마다 origin/main sha256 비교
- `ensureSymlink({ linkPath, targetPath })` — `~/.hub-runner/bin/hub-runner.mjs` 심링크 갱신 (self-update.mjs:189)
- `deployCiWatch()` — `~/.hub-runner/bin/ci-watch.mjs` 갱신

### 2) storeport PR #467 — Playwright Vite 포트 파라미터화
- 브랜치: `feat/M2-1126-U-playwright-port-param`
- 커밋: 22d1c09
- `apps/commerce-core/playwright.config.ts`: `CI_VITE_PORT` env 파라미터화 (기본 5173)
- `.github/workflows/ci.yml` heavy-mac env: `CI_VITE_PORT: ${{ 5173 + (github.run_id % 1000) }}`
- pnpm test 877 unit tests PASS · typecheck clean

---

## Kyu 아침 명령 블록 (iMac 메모리 실측)

**전제**: heavy job 1개 실행 중 아이맥에서 실행

```bash
while true
do
  vm_stat | awk '/Pages free/{free=$3}/Pages active/{active=$3}/Pages inactive/{inactive=$3}/Pages wired/{wired=$3}/Pages occupied/{compressed=$3}END{pgsize=16384;printf "free=%.1fGB active=%.1fGB inactive=%.1fGB wired=%.1fGB\n",(free*pgsize/1073741824),(active*pgsize/1073741824),(inactive*pgsize/1073741824),(wired*pgsize/1073741824)}'
  sysctl vm.swapusage | awk '{print "swap " $4}'
  sleep 10
done
```

**판정 기준**: heavy job 2개 동시 실행 시 swap < 2 GB → 안전 · swap > 4 GB or pressure=warn → 보류

---

## 보류 항목 (Kyu 아침)

| 항목 | 내용 |
|------|------|
| iMac 메모리 실측 | heavy job 중 위 명령 실행 → swap 수치 확인 |
| relay #59 머지 | M2-1126-S 리뷰 완료 후 머지 → relay #60 rebase (ci-watch 1.17 bump) |
| relay #60 머지 | #59 이후 R0/오케 판단 |
| storeport #467 머지 | 독립적으로 머지 가능 |
| heavy2 러너 등록 | 메모리 실측 OK 판정 후 setup.sh heavy2 슬롯으로 등록 |
