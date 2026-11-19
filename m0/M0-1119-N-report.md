mac-heavy 실성공률 96.8% (정의 수정 후: success/(success+failure)=30/31) · 진짜 실패 1건 · 취소 32건 · 버린 분 내역 <취소 492.6 / 재실행 0 / 중복 234.3> · 막을 것 3개 <pos-fork concurrency · playwright 3개 확정 실패 격리 · lint warn-as-error 완화>

---

# M0-1119-N — 오늘(2026-11-19 WIB) CI 진단 리포트

데이터 원본: `~/projects/curiocity-relay/status/ci/2026-11-19.jsonl` (오늘 완료 job 468개 · relay 집계, 11:06Z 스냅샷보다 **갱신분 포함**)
리포지토리: `CuriocityDevAi/storeport` · `CuriocityDevAi/agilo-medusa-pos-fork`
러너: `mac-light` 166 · `mac-heavy` 99 · `cloud` 203
작성자: Claude (M0) · 모드: 조회·분석 전용 (코드/워크플로 수정 없음 · 재실행 없음)

---

## [REQ-1] 결과별 분류표

### mac-heavy (99 jobs · 577.3 run-min)

| conclusion | 건수 | 분 | 비율 |
|---|---:|---:|---:|
| success | 30 | 163.4 | 30.3% |
| cancelled | 32 | 411.9 | 32.3% |
| **failure** | **1** | **2.0** | **1.0%** |
| skipped | 36 | 0.0 | 36.4% |

### cloud (203 jobs · 478.6 run-min)

| conclusion | 건수 | 분 | 비율 |
|---|---:|---:|---:|
| success | 137 | 153.3 | 67.5% |
| cancelled | 23 | 80.7 | 11.3% |
| **failure** | **22** | **244.6** | **10.8%** |
| skipped | 21 | 0.0 | 10.3% |

### mac-light (166 jobs · 53.5 run-min · 참고)

| conclusion | 건수 | 분 |
|---|---:|---:|
| success | 160 | 51.6 |
| failure | 4 | 1.6 |
| cancelled | 2 | 0.3 |

---

## [REQ-2] failure 상위 원인 5개

| # | job (repo · wf · job) | 실패 step | 대표 오류 한 줄 | 건수 | run-min 합 | 반복 패턴 |
|---|---|---|---|---:|---:|---|
| 1 | **agilo-medusa-pos-fork · CI · playwright** | `Run Playwright harnesses` | `m3-1105-d` locator.click Timeout 30000ms · `m3-1105-p` locator.fill "Element is not an \<input\>" · `m1-1105-ao` 23 passed / 4 failed | **14** | **234.3** | **결정론적 반복 실패 (flaky 아님)** · 27개 중 3개 스크립트가 매 push 마다 동일 실패 · 24 PASS / 3 FAIL 패턴 고정 |
| 2 | storeport · feature-map-check · check | `Fail if unmatched` | "미분류 파일 실패" (feature-map.yaml 에 신규 src 등록 누락) | 4 | 1.6 | PR 394 내 반복 (등록 후 08:01Z 해결) |
| 3 | agilo-medusa-pos-fork · Lint · lint | `Run npm run lint` | ESLint `Error: Calling setState synchronously within an effect` · `This value cannot be modified` 여러 파일 | 3 | 3.6 | 반복 (10:40/10:54 PR 207 포함) · warn 이 Error 승격 |
| 4 | storeport · ci · heavy-cloud (+ agilo heavy-cloud) | heavy-steps | PR 394 iteration cascade · 각 2건 | 4 | 5.3 | PR 394 수정 반복 과정 (수렴) |
| 5 | storeport · ci · heavy-mac (+ agilo flow-tests) | `./.github/actions/heavy-steps` | PR 394 heavy composite step 1회 실패 (수정 후 해결) | 2 | 3.4 | 일회성 |

핵심: **진짜 실패 27건 중 14건(52%) 이 agilo pos-fork playwright 결정론적 실패**. 모든 push 가 같은 3개 테스트에서 떨어진다.

---

## [REQ-3] "성공률" 정의 재검증

### 27% 는 과장이다

`ci.data.today` 의 85 jobs (11:06Z 스냅샷) 는 skipped · cancelled 를 분모에 포함한 "모든 completed / success" 비율.
mac-heavy 기준:

| 정의 | 공식 | 값 |
|---|---|---:|
| raw (현재 상태판) | `success / all` | **30.3%** |
| 실행된 것 중 성공 | `success / (success + failure)` | **96.8%** |
| 실행된 것 중 성공 (실행=run_min>0) | `success / (success + failure + cancelled_with_runmin)` | ~49% |
| cloud 동일 재계산 | `137 / (137+22)` | **86.2%** |

**근본 문제**:
- `skipped` 36건(mac-heavy) 은 **조건부 skip (needs/if)** 으로 "안 돈" 것이지 실패가 아니다. 분모에서 제외 필수.
- `cancelled` 32건은 "superseded by new push" 가 대부분 — 사용자 의도가 아닌 자동 취소. 두 가지로 쪼개야 함: (a) **superseded** (concurrency 로 밀린 것) → 성공률 분모 제외 (b) **수동 취소** → 별도.

### 러너 지표 제안 (상태판·대시보드 반영)

```
quality  = success / (success + failure)            ← "코드 품질" (목표 >95%)
yield    = success / all_completed                   ← "오늘 실제 결과" (낮으면 재실행 많음)
throughput_waste = cancelled_min + failure_min       ← "버린 시간"
skip_share = skipped / all                           ← "진짜 돈 job 비율" (높을수록 좋음 = path-filter 효과)
```

27% 는 raw yield. 코드 품질 지표 (`quality`) 로는 **mac-heavy 96.8% · cloud 86.2%** — 완전히 다른 그림.

---

## [REQ-4] 버린 시간 ~222분(스냅샷) → 739.2분(현재) 내역

mac-heavy + cloud 범위:

| 분류 | 분 | 설명 |
|---|---:|---|
| **취소 (superseded)** | 492.6 | cancelled run_min 합 (mac-heavy 411.9 + cloud 80.7) |
| **재실행/실패 run** | 246.6 | failure run_min 합 (mac-heavy 2.0 + cloud 244.6) |
| **중복 (같은 커밋 반복)** | ~234.3 | agilo pos-fork playwright 14회 실패분 — 같은 테스트 3개가 모든 push 에서 재실패, 사실상 중복 소비 |

### 취소 492.6 분의 분해 (mac-heavy)

| PR/push | 건수 | 분 | job 패턴 |
|---|---:|---:|---|
| pos-fork main push (pr=None) | 21 | **362.0** | `CI·heavy-mac` 6회 × 평균 ~41분 (= 247.6분) · 나머지는 commerce-core unit/build/pos-integration |
| storeport PR 394 iteration | 10 | 24.0 | `ci·heavy-mac` — rapid-push 10회 (3분 안쪽에서 취소되어 피해 작음) |
| storeport PR 398 | 1 | 25.9 | `ci·pos-integration` 1회 |

**단일 최대 낭비 = pos-fork `CI·heavy-mac` 6회 취소 (247.6분)**. 긴 workflow 가 새 push 마다 중간에 끊긴다. storeport 는 이미 concurrency 로 빨리 끊지만 pos-fork 는 끊기 전에 20~40분 돌아버린 뒤 cancelled.

### cloud 실패 244.6분의 분해

- **agilo pos-fork playwright: 234.3분 / 14건** ← 전체 cloud failure 시간의 95.8%.
- storeport PR 394 heavy-cloud: 3.0분 / 2건
- 기타 (pos-fork heavy-cloud, flow-tests, Lint): 7.3분 / 6건

---

## [REQ-5] 바로 막을 수 있는 3가지 (제안만 · 수정 금지)

### 제안 1 — **pos-fork `CI` workflow 에 concurrency+cancel-in-progress 추가**

- **담당 파일**: `agilo-medusa-pos-fork/.github/workflows/ci.yml` (job `heavy-mac` · `playwright`)
- **지금 상태**: `pr=None` (main push) 6회의 `CI·heavy-mac` 가 **각 20~40분 돌다 다음 push 로 취소** → 247.6분 낭비.
- **변경**: workflow 상단에 `concurrency: { group: ${{ github.ref }}-ci, cancel-in-progress: true }` 추가 → 새 push 즉시 이전 run 종료.
- **예상 절감**: 하루 ~**200분** (가장 큰 단일 조치)
- 보조 효과: playwright 14 run 중 상당수도 superseded 로 빨리 끊어져 러너 점유 해소.

### 제안 2 — **playwright 3개 결정론 실패 스크립트 격리 (quarantine)**

- **담당 파일**: `agilo-medusa-pos-fork/.github/workflows/ci.yml` 의 `playwright` job + `e2e/m3-1105-d-playwright.mjs` · `e2e/m3-1105-p-playwright.mjs` · `e2e/m1-1105-ao-playwright.mjs` (경로는 추정 · pos-fork e2e 디렉토리 기준)
- **지금 상태**: 27개 스크립트 중 **고정된 3개만** 매 push 실패 (24 PASS · 3 FAIL · 752초 반복). 플래키 아니라 **실제 버그 또는 환경 미스매치** (locator.click 30초 타임아웃 · fill 대상이 input 아님).
- **변경**: 3개 스크립트에 한시적 `continue-on-error: true` 또는 matrix 에서 제외 → 티켓으로 분리 수정. CI 녹색화 후 제거.
- **예상 절감**: 하루 ~**234분** (failure run 시간 전부 소거) + 성공률 지표 정상화 (cloud quality 86.2% → ~99%).
- 리스크: 실패 테스트의 재발 보호가 사라짐 → 티켓 열고 24~48h 내 수정 약속 필수.

### 제안 3 — **pos-fork Lint 의 warn-as-error 분리**

- **담당 파일**: `agilo-medusa-pos-fork/.github/workflows/Lint.yml` + `.eslintrc*` (추정)
- **지금 상태**: `npm run lint` 가 React 19 호환 warning (`setState synchronously within an effect` · `cannot be modified`) 을 Error 로 승격 → 3회 실패.
- **변경**: CI lint 단계에서 `--max-warnings=0` 완화 또는 해당 룰을 `warn` 유지 (정책 수정 PR 로 분리).
- **예상 절감**: 하루 ~**3분** (작지만 **빨간 상태판 noise** 제거 효과 큼 · dev 심리 차단)

### 추가(제안 외) 관측

- **storeport PR 394 feature-map-check** 는 "미분류 파일 실패" 반복 — 제도적 (신규 src 등록 강제) 이라 유지. 단, PR 열기 전 로컬 pre-commit 훅으로 미리 걸면 CI 소모 0.
- **mac-heavy 긴 wait**: 44분 / 33분 / 31분 … 상위 wait 들이 전부 mac-heavy success — **러너 큐 적체**. heavy-mac 1대만 돌리는 경우, 제안 1 (concurrency) 구현되면 자동 해소.

---

## 부록 — 수치 검증 재현 명령

```bash
python3 - <<'PY'
import json
from collections import defaultdict
jobs=[]
for l in open('status/ci/2026-11-19.jsonl'):
    try: jobs.append(json.loads(l))
    except: pass
by=defaultdict(lambda:defaultdict(lambda:{'n':0,'m':0.0}))
for j in jobs:
    k=j.get('runner_kind','?'); c=j.get('conclusion','?')
    by[k][c]['n']+=1; by[k][c]['m']+=float(j.get('run_min',0) or 0)
for k in by: print(k, dict((c, (v['n'], round(v['m'],1))) for c,v in by[k].items()))
PY
```

---

## 정의 의견 (상태판 반영 권장)

**Kyu 13:29 "인풋대비 아웃풋, 그리고 평균시간 등을 실시간으로"** 에 답하는 지표 set:

1. `quality` = success / (success + failure) → 코드 자체 건강
2. `yield` = success / all_completed → 하루 실질 산출 (재실행·취소 노이즈 포함)
3. `waste_min` = cancelled_run_min + failure_run_min
4. `superseded_min` = cancelled_run_min 중 "same branch · older created_at" 인 것만
5. `avg_wait_min` = p50 wait_min (러너 큐 압박 지표)

오늘 값(mac-heavy):
- quality = **96.8%** · yield = 30.3% · waste = 413.9 · superseded ≈ 247.6 · avg_wait p50 ≈ 2m (꼬리 44m)

끝.
