#50 CHANGES

## 판정 근거

### ✅ PASS — REQ 1: W7 합계 실제 데이터 계산

`computeTodayPRCount` / `computeTodayPTCount` / `computeTodayJobCount` 세 함수 모두 하드코딩이 아님.

- **PR**: `status/ci/${dateStr}.jsonl` 읽어 `isMarkerJob` 제외 후 `repo:pr` Set — main push는 pr='' or '-' → 자동 제외 ✓
- **PT**: `status/claims/*.json` 순회, state∈{started,done} + WIB 날짜 대조 ✓
- **잡**: JSONL, marker·skipped·cancelled 제외 ✓

테스트 fixture `summaryPR:14 · summaryPT:31 · summaryJobs:165`는 `renderLayout()` 단위 테스트용이며 `tick()`에서는 위 함수 결과를 주입하므로 하드코딩 아님. **이상 없음**.

---

### ✅ PASS — REQ 2: W5·W6·W8

| 항목 | 코드 | 테스트 |
|------|------|--------|
| W5 `classifyMachine(null) → 'unknown'` | `ci-watch-render.mjs:310` `if (!name) return 'unknown'` | W5-1~4 ✓ |
| W5 cloudInProgress null runner 제외 | `ci-watch.mjs:306` `if (!runnerName \|\| classifyMachine(runnerName) !== 'cloud') continue` | W5-3~4 ✓ |
| W6 `partial=true` → idle 셀 `?` | `fmtMachineCell` `if (partial) return padEndWidth('?', colW)` | W6-1 ✓ |
| W6 로그 필터 (`[hub-runner`, `[claim]`, `self-update`, `partial skip`) | `ERR_TAIL_SCREEN_FILTERS` | W6-2 ✓ |
| W8 `recentMin < 10` → `✓Nm` 초록 | `fmtMachineCell` isRecent 분기 + `buildTodayProcessedRow` buildMachineCol | W8-1~3 ✓ |
| W8 OFF 기계 제외 | `status=offline` 분기에서 `✓` 미출력 | W8-3 ✓ |

---

### ❌ CHANGES — REQ 3: W9 `collect_running_jobs` 경로 불일치

**문제**: `health.sh:260-263` 하드코딩 경로가 iMac CI-box 실제 설치 경로와 불일치.

```
# health.sh collect_running_jobs (현재 PR)
"$HOME/actions-runner"
"$HOME/actions-runner-light"
"$HOME/actions-runner-fork"
"$HOME/actions-runner-fork-light"
```

```
# lib/runner.sh _runner_dir($slot) → setup.sh register_runner 에서 호출
# slot = sp-heavy / sp-light / fork-heavy / fork-light
~/actions-runner-ci-box-sp-heavy
~/actions-runner-ci-box-sp-light
~/actions-runner-ci-box-fork-heavy
~/actions-runner-ci-box-fork-light
```

`setup.sh:34` → `source lib/runner.sh` → `_runner_dir()` = `$HOME/actions-runner-ci-box-$slot`.  
`setup.sh:99-102` slots: `sp-heavy`, `sp-light`, `fork-heavy`, `fork-light`.  
iMac CI-box는 위 `ci-box-$slot` 패턴으로 설치되어 있으므로, 현재 PR의 하드코딩 경로는 iMac에 존재하지 않음.  
→ W9 `collect_running_jobs`가 iMac에서 항상 `[]` 반환. W9 기능 전체가 무효.

**수정 방향** (예시):
```bash
"$HOME/actions-runner-ci-box-sp-heavy" \
"$HOME/actions-runner-ci-box-sp-light" \
"$HOME/actions-runner-ci-box-fork-heavy" \
"$HOME/actions-runner-ci-box-fork-light"
```
또는 `collect_disk`처럼 `find "$HOME" -maxdepth 2 -name "_diag" -type d` 동적 탐색.

---

**나머지 W9 항목 (경로 불일치 외)**

| 항목 | 판정 |
|------|------|
| 로그 비용 | ✅ 꼬리 2KB 완료 확인 + 앞 80KB만 파싱 |
| 실패 시 heartbeat | ✅ `\|\| echo "[]"` + `try/except → []`, health 판정 영향 0 |
| 토큰·비밀 누출 | ✅ 화이트리스트 5개 키(repository·workflow·head_ref·event_name·number)만 추출, variables 전체 불포함 |

---

### ✅ PASS — REQ 4: 테스트 실행 · 렌더 확인

```
$ node --test scripts/test/ci-watch-w111.test.mjs
# tests 15 / pass 15 / fail 0

$ node --test scripts/test/ci-watch-machines.test.mjs scripts/test/ci-watch-w110.test.mjs
# tests 59 / pass 59 / fail 0

$ node --test scripts/test/*.test.mjs
# tests 409 / pass 409 / fail 0  (duration 20.7s)
```

렌더 width=140 정상. width=100에서 CI 헤더 행 102 chars (2 초과)는 이 PR 이전부터 존재하는 열 폭 합계 문제이며 이 PR 도입 아님.

---

## 요약

W9 `collect_running_jobs`의 runner 경로 4개가 iMac CI-box 실제 설치 경로(`actions-runner-ci-box-$slot`)와 불일치하여 W9 기능이 iMac에서 항상 무효. 나머지 W5~W8 및 로그 비용·보안·테스트는 이상 없음.
