#50 APPROVE

## 리뷰 대상
PR #50 `feat/M2-1126-G-ci-watch-v111` · HEAD `b3c990590` (feat(ci-watch): M2-1126-I — W9경로·W2보완·W10 클라우드 오늘 줄)

---

## W9: health.sh 4경로 (scripts/ci-box/health.sh)

**변경 내용:**
- 이전: `actions-runner`, `actions-runner-light`, `actions-runner-fork`, `actions-runner-fork-light`
- 신규: `actions-runner-ci-box-sp-heavy`, `actions-runner-ci-box-sp-light`, `actions-runner-ci-box-fork-heavy`, `actions-runner-ci-box-fork-light`

**iMac 러너 등록명 대조 (runners/all.json + 2026-11-26.jsonl):**
```
ci-box-storeport-heavy-imac  → actions-runner-ci-box-sp-heavy  ("sp"=storeport 약어)
ci-box-storeport-light-imac  → actions-runner-ci-box-sp-light
ci-box-fork-heavy-imac       → actions-runner-ci-box-fork-heavy
ci-box-fork-light-imac       → actions-runner-ci-box-fork-light
```
등록명 "storeport"와 폴더명 "sp" 약어는 명명 규칙 차이. R0-V 결정에서 확인된 실제 폴더명으로 간주(SSH 금지 → 직접 확인 불가).

**find 폴백 오탐 여부:**
`find $HOME -maxdepth 2 -type d -name _diag`
- 러너 `_diag`: `$HOME/actions-runner-ci-box-*/` (depth 1) → `_diag` depth 2 → maxdepth 2 커버 ✓
- 리포/프로젝트 디렉터리: `$HOME/projects/*/` depth 3+ → 미검색 ✓
- Library 등 시스템 경로: `_diag`라는 디렉터리명 사용 없음 ✓

**테스트:** F-1(경로 없음 → [] 에러 없음) · F-2(find 폴백 → _diag 발견 · 잡 파싱) PASS

```
$ bash scripts/test/ci-box-health.test.sh
...
PASS: F-1: ci-box-* 경로 Worker 없음 → [] 반환 (에러 없음)
PASS: F-2: find 폴백 → _diag 발견 · Worker 로그에서 job 추출
=== 결과: PASS=29 FAIL=0 ===
```

---

## W2: MARKER_JOBS 단일 정의 · 잡 수 부풀림

**MARKER_JOBS 정의 위치:** `scripts/watch/ci-watch-render.mjs` 18번째 줄 1곳.
`scripts/metrics/ci-offload-impact.mjs`는 re-export만(복사본 없음) ✓

```
MARKER_JOBS = { route, heavy-cloud, ci-summary, feature-map-route, changes-filter, markers-and-forbidden }
```

**오늘 jsonl(2026-11-26.jsonl, 303레코드) 직접 계산:**

| 구분 | 수 |
|---|---|
| 전체 레코드 | 303 |
| 마커 잡 합계 | 114 |
| └ route | 48 |
| └ heavy-cloud | 32 |
| └ changes-filter | 17 |
| └ markers-and-forbidden | 17 |
| 카운트 가능 잡 (skipped/cancelled 제외) | 175 |
| 클라우드 카운트 가능 잡 | 21 |

v1.11까지는 `changes-filter`(17) + `markers-and-forbidden`(17) = 34건이 실잡으로 집계되어 부풀림 발생. v1.12에서 MARKER_JOBS 추가 → 올바르게 제외 ✓

**테스트:**
```
$ node --test scripts/test/ci-watch-w112.test.mjs
ok 1 - W2보완-1: isMarkerJob — changes-filter 는 마커
ok 2 - W2보완-2: isMarkerJob — markers-and-forbidden 는 마커
ok 3 - W2보완-3: isCountableJob — changes-filter/markers-and-forbidden 는 카운트 제외
# tests 8 / pass 8 / fail 0
```

---

## W10: 클라우드 오늘 PR · PT · 잡 · 넘김

**필터 로직 (`computeCloudTodayPRStats`):**
```js
if (r.runner_kind !== 'cloud') continue;
if (isMarkerJob(r.job)) continue;         // heavy-cloud, route 등 제외
if (r.conclusion === 'skipped' || ...) continue;
```

**heavy-cloud 오탐 여부:**
오늘 jsonl heavy-cloud 32건 → 전부 `job: "heavy-cloud"` (MARKER_JOBS) + `conclusion: "skipped"` → 이중 제외 ✓
route(runner_kind=cloud) 예시: `{"job":"route","runner_kind":"cloud",...}` → MARKER_JOBS 제외 ✓

**손계산 대조:**
- 클라우드 카운트 가능 잡: 21
- 클라우드 고유 PR: 6 (`CuriocityDevAi/storeport:449~453` 등)

**폭 100 렌더:**
```
─ 오늘 완료 0 (r 갱신 · q 종료) ─────────────────────────────────────────────
  클라우드 오늘  PR 6 · PT 3 · 잡 21 · 넘김 2/5
  PR 10 · PT 8 · 잡 175
```
손계산(잡 21, PR 6)과 일치 ✓

**폭 140 렌더:**
```
  클라우드 오늘  PR 6 · PT 3 · 잡 21 · 넘김 2/5
```
동일 ✓

**넘김 빨강/평문:**
- W10-4(cloudTodayCount=5, limit=5 → 소진): `\x1b[31m` 포함 ✓
- W10-5(cloudTodayCount=2, limit=5 → 미소진): 빨강 없음 ✓

---

## 테스트 전체 실행 결과

```
ci-watch-w112.test.mjs:   8/8  PASS
ci-box-health.test.sh:   29/29 PASS
```

---

## 판정

**#50 APPROVE**

W2·W10 모두 손계산 일치, 마커잡 오탐 없음. W9 경로는 R0-V 확정 명칭 + find 폴백으로 안전. 테스트 전체 패스.
