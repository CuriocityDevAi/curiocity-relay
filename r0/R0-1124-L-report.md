APPROVE

## R0-1124-L — relay PR #21 (v8 R1 · REPORT_PATH 격리) 리뷰 보고서

리뷰어: R0 · 2026-11-24
판정: **APPROVE**

---

## 셀프테스트 6종 직접 재실행 결과 (별도 worktree `/tmp/relay-v8-review`)

| 테스트 | 결과 |
|--------|------|
| `--selftest-report-path-collect` | ✅ OK |
| `--selftest-report-path-shim` | ✅ OK |
| `--selftest-report-path-off` | ✅ OK |
| `--selftest-report-relocate` (regression) | ✅ OK |
| `--selftest-merge-conflict-auto` (regression) | ✅ OK |
| `--selftest-merge-fail3` (regression) | ✅ OK |
| `node --check hub-runner-v8.0.mjs` | ✅ syntax OK |

---

## 체크포인트별 판정

### ① 세션 시작 시 REPORT_PATH 준비
- `prepareIsolatedReport`: `~/.hub-runner/reports/<hub>/<id>/report.md` 디렉터리 생성 + 잔재 정리 ✅
- 세 spawn 경로(background · cmux-interactive · cmux-split) 모두 `REPORT_PATH` env + preamble 삽입 확인 ✅
- `buildReportPathPreamble`: `${ABS_PATH}` 치환 정상 ✅

### ② 세션 종료 후 수거·commit·push + 실패 처리
- `collectIsolatedReport`: copy → git add → staged 체크 → commit → pull --rebase → push 순서 ✅
- push 실패 시: 로그 기록(`appendLine` + `log(hub, ...)`) 후 `{ collected: false, source: 'isolated-error' }` 반환 — **조용히 삼키지 않음** ✅
- push 실패 시 명시적 재시도 루프는 없으나, 다음 `waitForLanding` 폴링에서 `hasReportAnyPath` → `report-local` 감지 → 5분 대기 → `needs-proxy-land` → `runnerProxyLand`(`push 만 시도` 경로)를 통한 간접 재시도 경로 확인 ✅

### ③ shim 세 경로
- **legacy-root** (`<hub>/<id>-report.md`): `hasReport` / `hasReportAnyPath` 로 감지 ✅
- **legacy-queue** (`queue/<hub>/<id>-report.md`): `relocateMisplacedReports` → `git mv` ✅
- **wrong-branch** (`git show origin/<br>:<path>`): `recoverReportFromBranch` → 최근 25 브랜치 탐색 ✅
- **M2-1124-I·K(브랜치에만)**: `refs/remotes/origin/` 탐색으로 회수 가능 ✅
- **R0-1124-E(fork push)**: ⚠️ `refs/remotes/origin/` 범위 밖(다른 계정 fork repo) → shim으로 회수 불가. v8 설치 후 재발 방지만 됨. 과거 케이스는 Kyu 수동 처리 필요. **단, v8의 1차 목적이 "원천 차단"이므로 CHANGES 아님.**

### ④ flag off = 완전 레거시
- `report_path_enabled=false` 시: `reportPathEnv=null` → preamble 없음, env 없음, `collectIsolatedReport` 미호출 → v7.8 동일 동작 ✅

### ⑤ 설치 후 진행 중 세션(구 방식) 보호
- 러너 재시작 후 `busy` 초기화. 기존 세션이 직접 claim done + report push하면 다음 tick에서 감지 (`pickNext` → state != 'issued' → 패스)
- 60분 미경과 시 `recoverStuckStartedClaims` 미개입 ✅
- 허브가 relay git을 만지는 구 방식 세션이 완료되면 claim 처리 흐름은 정상 작동 ✅

### ⑥ 셀프테스트 6종 (위 표 참조) ✅ 전부 통과

### ⑦ hub-runner-install.sh 변경 없음
- PR 변경 파일: `scripts/hub-runner-v8.0.mjs` 단 1개 ✅
- 설치 명령: `TARGET=hub-runner-v8.0.mjs FALLBACK=hub-runner-v7.8.mjs bash scripts/hub-runner-install.sh` (PR 설명 그대로)

---

## 주의사항 (CHANGES 아님)

1. **R0-1124-E 과거 케이스**: fork push된 리포트는 shim으로 회수 불가. 수동 처리 필요. v8 on 이후 재발 방지.
2. **수거 push 실패 → 최대 5분 지연**: `collectIsolatedReport` push 실패 시 `runnerProxyLand` 경로를 통해 최대 5분 후 재착지. 허용 범위.

---

APPROVE — 머지 가능. 설치는 Kyu 별도 진행.
