APPROVE — 착지 감지 범위 한정·안전장치·테스트 7/7 통과, 경미한 staged-file edge case 메모.

## REQ1 — `land-detect-v2.mjs` 수면 감지 안전성 (`scripts/lib/land-detect-v2.mjs:94–103`)

**임계**: `gap > pollMs × 4` (pollMs=5000 → 20 s). 20 s 이상의 GC/부하 정지도 "수면"으로 잘못 감지해 `addGap = gap − pollMs` 만큼 예산을 돌려줄 수 있음.

**안전한 이유**:
- 예산은 *늘기만 하고 줄지 않음* — 무한 루프 위험 없음.  
  `effective = (t − startedAt) − sleepGapTotal`는 실제 벽시계가 흐르는 한 단조 증가.  
  GC 오인으로 sleepGapTotal이 올라가도, 이후 정상 폴링에서 `t − startedAt` 가 더 빠르게 증가하므로 `effective` 는 결국 `timeoutMs`를 돌파함.
- **상한 존재**: `timeoutMs` (호출자가 전달 · 러너는 60분 상수 사용). 수면/GC 오인이 얼마나 많아도 실제 벽시계 기준으로 `timeoutMs × 2` 이내에 timeout이 발생함 (극단적으로 매 폴마다 20 s GC → 10 s 는 허비 → 2× 연장이 최악).
- **결론**: GC/부하 정지와 혼동해도 예산이 약간 늘어날 뿐, 무한 대기 없음. ✓

## REQ2 — `runnerProxyLand` 커밋 범위·충돌·이중 커밋 방지 (`scripts/hub-runner-v7.3.mjs:1711–1748`)

**리포트 파일만 커밋하는지**:  
`git(['add', '--', relRpath])` — `relRpath = '${hub}/${id}-report.md'` 경로 단일 지정. 다른 변경 휩쓸기 없음. ✓  
단, 외부 프로세스가 별도 staged 파일을 남긴 경우(`git diff --cached` 비어있지 않은 상태) 해당 파일도 commit에 포함될 수 있음. 러너 정상 운영에선 발생 불가능하나, 중간 실패→재시도 사이클에서 edge case 존재. 경미함.

**이중 커밋 방지**:  
```
const staged = execFileSync('git', ['diff', '--cached', '--name-only', '--', relRpath], ...).toString().trim();
if (staged) { git(['commit', ...]); } else { /* 이미 committed — push 만 */ }
```
이미 커밋됐으면 push 만 재시도. ✓

**push 실패/충돌 시**:  
- `pull --rebase --autostash` 실패 → catch 후 로그·계속 (non-fatal). push도 이어서 시도.  
- push 실패 → 외부 catch → `return false` → 호출자: `landing.reason = 'proxy-failed'` (로그 남기고 graceful 종료). ✓  
- 단, rebase 실패로 `.git/rebase-merge` 상태가 남으면 push도 실패하고 git repo가 rebase 진행 중 상태로 고착될 수 있음. 빈도 낮고 자동 복구보다 명시적 에러가 나은 케이스.

## REQ3 — v7.2 대비 diff 범위 · install.sh 롤백

**diff 범위**:  
파일 4개만 변경: `hub-runner-install.sh(+2/−2)`, `hub-runner-v7.3.mjs(신규·+3634)`, `lib/land-detect-v2.mjs(신규·+181)`, `test/hub-runner-landing-v2.test.mjs(신규·+323)`.  
v7.3 내 실질 변경은 착지 판정 범위에 한정:
- import: `waitForLandingWith` → `waitForLandingAwake`
- 상수 추가: `REPORT_REMOTE_WAIT_MS`, `SLEEP_GAP_MULTIPLIER`
- `isReportLanding`: `'report-local'` 제거, `'runner-proxy-landing'` 추가
- `waitForLanding` 래퍼: 새 파라미터 전달 + `lastSleepGap` 기록
- `runnerProxyLand` 함수 추가 (40 줄)
- `needs-proxy-land` call site 2곳
- `all.json` 필드 `last_sleep_gap` 추가

착지 외 로직(복구·pane close·selftest·App Nap·cmux) 무변경. ✓

**install.sh 롤백**:  
`TARGET_RUNNER="${TARGET:-hub-runner-v7.3.mjs}"` · `FALLBACK_RUNNER="${FALLBACK:-hub-runner-v7.2.mjs}"` 확인.  
흐름: `node --check TARGET` → `write_plist TARGET` → `load_plist` → `verify_loaded` (10초 PID 대기).  
실패 시: `write_plist FALLBACK` → `load_plist` → `verify_loaded`. 롤백도 실패 → `exit 3`. ✓

## REQ4 — 테스트 실행 로그

```
# hub-runner-landing-v2.test.mjs (신규 · fake clock 주입)
ok 1 REQ1 — 60m 예산 · 30m 수면 · 깨어나서 작업 지속 (timeout 안 됨)
ok 2 REQ1 — 짧은 gap(pollMs × 2) 은 수면 간주 안 함
ok 3 REQ2 — report-local 후 claim done → claim-done 반환
ok 4 REQ2 — report-local 후 report-origin 감지 → report-origin
ok 5 REQ2 — report-local 후 5m 안 원격 X → needs-proxy-land
ok 6 REQ1+2 — report-local 후 수면 30m · 깨어나 즉시 claim done → claim-done (needs-proxy-land 안 터짐)
ok 7 기본 — report/claim 없음 · 효율 60m 지나면 timeout
# tests 7 / pass 7 / fail 0 · duration_ms 101

# hub-runner-landing.test.mjs (기존 · v7.2 lib)
ok 1~3 pass 3/3 · duration_ms 7064

# hub-runner-version.test.mjs
ok 1~5 pass 5/5 · duration_ms 98
```

전 테스트 통과. ✓

## REQ5 — status/·ledger/ 덮어쓰기 위험

```
git diff origin/main...origin/m1/BT-runner-v7.3 -- status/ ledger/
(0줄)
```

PR 단일 커밋 `a85940b`은 `scripts/` 4파일만 변경. status/·ledger/ 미접촉.  
스쿼시 머지 기준으로도 `scripts/` 변경만 반영 — 덮어쓰기 위험 없음. ✓  
(main 이 `6f6e9bd` 이후 `chore(status): auto` 등 커밋을 추가했으나 PR 브랜치가 그 파일을 건드리지 않으므로 충돌 없음.)

---
R0-1105-DY · 2026-11-14 · Claude Sonnet 4.6
