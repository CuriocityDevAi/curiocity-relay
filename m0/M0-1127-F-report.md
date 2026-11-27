PASS · PR #66 · d39077c053f70df173aa06785a95b2bcf4764ed5 · tests 519/519 pass (W123 신규 12/12 pass)

# M0-1127-F — ci-watch 리포별 main 최신 CI 경보 (v1.23)

## 뿌리
storeport#468 이 ci.yml 0초 실패 중에 머지됨. "빨간 잡"이 아니라 "잡 자체가 안 생김"이라 ci-watch 대기열·진행 중·경보 어디에도 안 잡혀 11시간 조용함. R0 도 다른 워크플로 초록만 보고 APPROVE. ledger: `decision-storeport-ci-dead-20261127.md:20` 조치 체크리스트.

## 변경 파일
- `scripts/ci-watch.mjs` — `computeMainCiAlerts` pure 함수 · `MAIN_CI_WORKFLOWS` · `fetchMainCiStatusAll`/`fetchMainCiStatusForRepo` · `tick()` 에 `mainCiAlerts` 선두 삽입 · `CI_WATCH_VERSION='1.23'` · 버전 이력 코멘트
- `scripts/test/ci-watch-w123.test.mjs` (신규 · 12 테스트)
- `specs/screens/ci-watch.md` — CW-ALERT · CW-VERSION · 이력 갱신
- `ledger/decision-storeport-ci-dead-20261127.md:20` — `[ ]` → `[x]` + 완료 기록

## 핵심 설계

### `computeMainCiAlerts(statusMap, nowMs, opts)` pure 함수
입력: `{ [fullRepo]: { commit, commitAtMs, latestRun | null } }`
경보 세 조건:
1. **실패**: `conclusion ∈ {failure, cancelled, timed_out}` → `main_ci_failure`
2. **시작실패**: `conclusion === 'startup_failure'` OR `action_required` OR (`failure` AND (jobs=0 OR duration<5s)) → `main_ci_start_failure` ("워크플로 파일 오류 의심" 추가)
3. **미실행**: `latestRun === null` AND `commitAgeMin >= MAIN_CI_NO_RUN_MIN(15)` → `main_ci_no_run`

성공 · in_progress · queued · fresh no-run → 조용함. `detectStartFailure` 옵션 = 검증의 검증용.

메시지: `<리포> main CI 실패 · <commit7> · <N분 전> — 다음 PR 머지 금지`

### 주 워크플로 매핑 (`MAIN_CI_WORKFLOWS`)
- `CuriocityDevAi/storeport`: path `.github/workflows/ci.yml`
- `narisolutions/agilo-medusa-pos-fork`: path `ci.yml`+`lint.yml` · name `CI`+`Lint`

경로 또는 이름 둘 중 하나 매칭.

### GH 호출 (REQ-3: 호출 수 늘리지 않기)
`fetchMainCiStatusAll()` 이 `fetchGhQueueAndCloud()` 안에서 호출됨 → 같은 캐시 주기 (`cachedGhData.mainCiStatus` · 30초 or idle 5분). 리포당 2 API 호출 (`branches/main` + `actions/runs?branch=main`) × 2 리포 = **4회 / 주기** (추가).

### 승자 선택 (`chooseWorstRun`)
fork 처럼 복수 워크플로 (`CI` + `Lint`) 가 있는 경우 그중 "가장 나쁜" conclusion 하나를 대표로. 우선순위: startup_failure > failure > timed_out > cancelled > in_progress > success > neutral > skipped.

### 주의 구역 통합
`tick()` 의 `runnerAlerts = [...mainCiAlerts, ...imacHbAlerts, ...rawRunnerAlerts, ...errAlerts]` — mainCi 가 **선두** 라 주의 구역 맨 위 빨간 `■` 로 표시.

## 테스트 (`ci-watch-w123.test.mjs`)

12 subtests (전부 pass):
- W123-success-no-alert
- W123-failure-alert (정상 duration · 워크플로 파일 오류 의심 문구 없음)
- W123-startup-alert (startup_failure)
- W123-zero-duration (failure · 0초 → start_failure 로 분류)
- W123-no-run-15min
- W123-no-run-fresh (문턱 미만 조용)
- W123-in-progress
- W123-multi-repo (성공+실패 혼합 → 실패만)
- W123-msg-format (정규식 매칭)
- **W123-verify-no-start-detect (검증의 검증)**: `detectStartFailure=false` 면 startup_failure 가 start_failure 로 분류되지 않음 → 사각지대 복원 확인
- W123-missing-latest-run-field
- W123-threshold-boundary

검증의 검증 출력 (stderr):
```
[W123 검증] detectStartFailure=false · startup_failure 케이스 · alerts=[] (type!=main_ci_start_failure 이어야 함)
```
→ 시작 실패 판정 OFF 시 startup_failure 는 어떤 경보도 안 남김 (= storeport#468 재발 시나리오 재현).

## 전체 테스트
`node --test scripts/test/*.test.mjs` → **519 pass · 0 fail · 0 cancelled · 0 skipped** · duration 20.7s.

## 보존 요소 (모두 유지)
- CW-PROG 9단계 띠
- CW-HUBQ 허브 칸
- v1.21 iMac HB 문턱 12분
- v1.22 all.json 두 위치 폴백
- 기본 화면은 하나

## 기록
- 브랜치: `feat/M0-1127-F-main-ci-alert`
- head: `d39077c053f70df173aa06785a95b2bcf4764ed5`
- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/66
- CI_WATCH_VERSION: 1.22 → **1.23**
- 소요: ~30분

## 주의
- fork 리포는 `CI_WATCH_VERSION` 이력에 "narisolutions/agilo-medusa-pos-fork" 만 등록. 기존 `REPOS` 배열의 `CuriocityDevAi/agilo-medusa-pos-fork` (오래된 이름) 는 손대지 않음 — out of scope.
- `jobs_count` 는 `/actions/runs` 응답에 없어 `duration<5s` 로만 0초 실패 판정 (추가 API 호출 회피). 실제 storeport#467 의 ci.yml 파싱 실패는 `conclusion='startup_failure'` 로 명시 보고되므로 1차 판정으로 커버됨.
