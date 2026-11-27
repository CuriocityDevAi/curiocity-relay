# R0-1127-J 리포트

relay#66: CHANGES · 필수 2건 · 권고 1건 · 테스트 12/12 · `--once` exit 0 · 경보 없음(정상 상태)

## 직접 실행 명령 및 결과

```
node --test scripts/test/ci-watch-w123.test.mjs
→ 12 pass / 0 fail (W123-success-no-alert ~ W123-threshold-boundary)

node scripts/ci-watch.mjs --once
→ [ci-watch:once] imports ok  exit 0

node --input-type=module (computeMainCiAlerts 직접 판정)
→ in_progress (3분):  []           ✓ 거짓 경보 없음
→ null (5분,  문턱 15): []          ✓ push 직후 조용
→ null (16분, 문턱 15): [main_ci_no_run] ✓ 올바른 경보

gh api repos/narisolutions/agilo-medusa-pos-fork
→ 404 Not Found  → 필수-1 근거

gh api repos/CuriocityDevAi/agilo-medusa-pos-fork/branches/main
→ 404 Branch not found  → 필수-2 근거

gh api repos/CuriocityDevAi/storeport/actions/runs?branch=main&per_page=3
→ ci.yml sha=769090c status=in_progress  → 경보 없음 ✓

gh api repos/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs?branch=master…
→ ci.yml, lint.yml 최근 conclusion=success  (master 기준)
```

## 필수 CHANGES

### 필수-1: fork 리포 조직명 오류
- 위치: `scripts/ci-watch.mjs:82` `MAIN_CI_WORKFLOWS`
- 현재: `'narisolutions/agilo-medusa-pos-fork'`
- 문제: GitHub API 404 → `fetchMainCiStatusForRepo` 항상 `null` → fork CI 경보 영구 묵음
- 수정: `'CuriocityDevAi/agilo-medusa-pos-fork'`

### 필수-2: fork 기본 브랜치 `master`인데 `branches/main` 하드코딩
- 위치: `scripts/ci-watch.mjs:393`
- 현재: `` `repos/${fullRepo}/branches/main` ``
- 문제: fork default_branch=master, main 없음(404) → 항상 null → 묵음
- 수정: `MAIN_CI_WORKFLOWS` 엔트리에 `branch` 필드 추가 (storeport=main, fork=master)

## 권고

### 권고-1: paths-ignore commit 의 15분 후 no_run 오탐
- storeport `ci.yml` 에 `paths-ignore: ['**/*.md', 'docs/**']` 존재
- docs-only push → run 미생성 → 15분 후 `main_ci_no_run` 거짓 경보 가능
- 테스트 없음. 빈도 낮으면 허용 가능하나 config 처리 권고

## 이상 없는 항목

- in_progress/queued → 경보 없음 ✓
- push 직후(< 15분) null → 경보 없음 ✓
- workflow-lint (`.github/**` 한정) → MAIN_CI_WORKFLOWS 미등록 → 오판 없음 ✓
- skipped conclusion → isStartFailure 미해당 ✓
- startup_failure / failure+duration<5s → main_ci_start_failure ✓
- GH 호출: fetchGhQueueAndCloud() 안에 얹혀 30s/5min 주기 공유 (4 calls/cycle) ✓
- 보존: CW-PROG 9단계 띠 · CW-HUBQ · v1.21 iMac 12분 문턱 ✓
