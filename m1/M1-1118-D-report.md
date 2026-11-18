11-15~17 총 약 6,700분 · 1위 원인 storeport ci 워크플로 (PR 폭증 × 병렬 잡 과금) · 모르는 실행 無 · 절감안 합계 약 55%

---

# M1-1118-D — GitHub Actions 사용량 폭증 원인 실측 보고서

> 조사 기간: 2026-11-10 ~ 11-17 WIB · 읽기 전용 (`gh api`) · 코드 수정 없음

---

## [REQ 1] 저장소별 · 날짜별 분 합계 (wall-clock 추산)

> **wall-clock vs billable**: GitHub는 병렬 잡 각각을 과금. storeport ci는 최대 6개 잡 동시 실행 → 과금 분 ≈ wall-clock × 1.5~2.5×. 이하 표는 run 단위 wall-clock 합(underestimate). 실제 과금은 Kyu 화면 수치 사용.

| 저장소 | 11-10 | 11-11 | 11-12 | 11-13 | 11-14 | **11-15** | **11-16** | **11-17** | 11-15~17 소계 |
|--------|------:|------:|------:|------:|------:|----------:|----------:|----------:|--------------:|
| storeport | 25 | 332 | 134 | 61 | 96 | **598** | **1,325** | **828** | **2,751** |
| agilo-medusa-pos-fork | 206 | 391 | 905 | 354 | 301 | 339 | 295 | 234 | 868 |
| test-portal | 28 | 28 | 19 | 28 | 28 | 28 | 19 | 10 | 57 |
| curiocity-relay | 0 | 0 | 0 | 0 | 5 | 8 | 9 | 11 | 28 |
| grownest | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| curiocity-kit / todoboss | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **합계(wall-clock)** | 259 | 751 | 1,059 | 443 | 430 | **973** | **1,648** | **1,083** | **3,704** |
| **실제 과금(Kyu 화면)** | — | — | — | — | — | **1,705** | **3,222** | **~1,800** | **~6,727** |

> 실제 과금 / wall-clock ≈ 1.75× (병렬 잡 과금 반영). storeport ci 단일 run의 과금 분: 샘플 30회 평균 **10.0분 billed/run** (최대 36.8분, 경량 run 최소 2분).

🔴 모르는 저장소/워크플로: **없음** (전체 7개 저장소 확인 완료).

---

## [REQ 2] storeport 11-15~17 워크플로 · 잡별 분 상위 (샘플 30 run 기준)

### 워크플로 순위 (run 수 × 추산 과금)

| 워크플로 | 11-15~17 run 수 | wall-clock 합 | 추산 과금(×1.75) |
|----------|---------------:|-------------:|-----------------:|
| **ci** | 437 | 2,665 min | **~4,664 min** |
| feature-map-check | 115 | 77 min | ~135 min |
| ci-summary | 189 | 24 min | ~42 min |
| stale-deferred | 2 | 2 min | ~4 min |

### 잡별 단가 (샘플 30 completed runs, 11-16)

| 잡 이름 | 실행 횟수 | 평균 분/회 | 최대 분 | 비고 |
|---------|----------:|-----------:|--------:|------|
| **docker-smoke-commerce-core** | 9/30 | **17.2** | 19.2 | commerce_core 변경 시만 · 최고 단가 |
| **pos-integration** | 9/30 | **9.6** | 12.7 | 동상 조건 |
| customer-display | 9/30 | 2.8 | 3.1 | **모든 PR**에서 실행 (경로 무관) |
| e2e-admin-loyalty | 8/30 | 1.6 | 2.0 | **모든 PR**에서 실행 (경로 무관) |
| unit-commerce-core | 11/30 | 1.2 | 1.4 | — |
| markers-and-forbidden | 11/30 | 0.1 | 0.1 | fast-fail |
| changes-filter | 11/30 | 0.1 | 0.1 | fast-fail |

> **주목**: docker-smoke-commerce-core + pos-integration = 한 번 실행 시 ~26분 → 전체 과금의 대부분. 30 runs 중 9회(30%)만 트리거되었으나 과금의 ~83% 차지.

---

## [REQ 3] 계기별 분석

| 항목 | 값 | 설명 |
|------|---:|------|
| 전체 run 수 (11-10~17) | 979 | storeport |
| event=pull_request | 595 (61%) | PR sync/open |
| event=push | 140 (14%) | main 직접 push |
| event=workflow_run | 236 (24%) | ci-summary 연동 |
| event=schedule | 8 | stale-deferred |
| draft PR 여부 | **0** | 전 기간 draft PR 없음 — `!draft` 가드 효과 없음 |
| docs/ 브랜치 CI 실행 | **15개 브랜치, ~50 runs** | 마크다운만 변경된 PR 전부 CI 가동 |
| 재실행 (run_attempt > 1) | 3 | 무시 가능 |
| concurrency 취소 | **71 runs cancelled** | cancel-in-progress 이미 활성 |
| 취소 있는 브랜치 | 16개 | 이전 실행 취소 → 연속 push 비용 일부 절감 중 |

---

## [REQ 4] 하루 PR 수 · 푸시 · 분 분해

### storeport ci 11-15~17

| 날짜 | ci 총 run | 고유 브랜치(≒PR) | avg runs/PR | avg 과금 min/run | 추산 총 과금 |
|------|----------:|----------------:|------------:|-----------------:|-------------:|
| 11-15 | 124 | 35 | 3.5 | ~10 | **~1,240** |
| 11-16 | 97 | 32 | 3.0 | ~10 | **~970** |
| 11-17 | 80 | 30 | 2.7 | ~10 | **~800** |

**분 = PR 수 × 푸시 수 × 푸시당 분**

- 11-15: 35 PRs × 3.5 push × 10 min ≈ **1,225 min**
- 11-16: 32 PRs × 3.0 push × 10 min ≈ **960 min**
- 11-17: 30 PRs × 2.7 push × 10 min ≈ **810 min**

> **왜 11-15부터 급증했나?** 11-14: 21 ci runs, 9 브랜치. 11-15: 124 ci runs, 35 브랜치 (6×). 허브 자동화가 한꺼번에 ~26개 새 브랜치/PR을 생성 → 각 PR open 이벤트 → CI 가동. 허브가 항목마다 개별 push를 보내는 방식이 직접 원인.

main 브랜치 단독 비용 (11-15~17): **94 ci runs × ~6 min avg ≈ 564 min** (merge마다 CI 재실행).

---

## [REQ 5] 절감안 효과 추정 (적용 금지 — 수치만)

> 기준: storeport 11-15~17 추산 과금 ~4,700 min (전체 ~6,727 중 약 70%)

| # | 절감안 | 절감 메커니즘 | 추산 절감 | 비율 |
|---|--------|-------------|----------:|-----:|
| ① | draft PR → customer-display · e2e 생략 | !draft 가드 이미 있음 · PR을 draft로 열면 즉시 적용 | ~660 min | **~10%** |
| ② | docs/md만 변경 시 CI 생략 | 15 브랜치 × 평균 2 run × 경량 CI 2min = 60; full CI 가드 불필요 | ~100 min | **~1.5%** |
| ③ | 연속 push 취소 (cancel-in-progress) | **이미 적용 중** · 71 runs saved · 미적용 시 +~1,000 min 추가 과금 | 현상 유지 | ~0% 추가 |
| ④ | pos-integration · e2e · docker-smoke → ready/main만 | PR draft 해제(ready_for_review) 시에만 무거운 잡 실행 | ~1,400 min | **~21%** |
| ⑤ | 변경 경로별 job 필터 (customer-display에 경로 추가) | customer-display 잡을 `apps/customer-display/**` 변경 시만 실행 | ~500 min | **~7%** |
| ⑥ | 허브 "항목마다 push" → 묶어서 push | avg 3 push/PR → 1 push/PR 감축 → run 수 ~65% 절감 | **~2,600 min** | **~39%** |
| **합계** | | | **~5,260 min** | **≈ 55%** |

> ③ 취소는 이미 구현됨 → 순수 추가 절감 아님. ①+④+⑥ 조합이 핵심: **약 70% 절감 가능**.

### 최우선 액션 (효과/난이도 비율)
1. **⑥ 허브 batch push**: 가장 큰 절감(39%). 허브 설정 변경만으로 가능.
2. **④ ready 단계 분리**: ci.yml에서 draft 조건 추가 → `ready_for_review` 이벤트 추가 시 자동.
3. **① draft PR 운영**: 개발 중 PR을 draft로 열기만 하면 즉시 ~10% 절감.

---

## 요약

| 항목 | 수치 |
|------|------|
| 11-15~17 총 과금(실측) | ~6,727 min |
| 1위 저장소 | storeport (ci 워크플로, 과금의 ~70%) |
| 1위 잡 | docker-smoke-commerce-core (17 min/실행) + pos-integration (10 min/실행) |
| 급증 계기 | 11-15 허브 자동화로 26+ 브랜치/PR 동시 생성 → PR open 이벤트 → CI 대거 가동 |
| 최대 단일 원인 | 허브 "항목마다 개별 push" → avg 3 runs/PR, 모든 PR에서 customer-display · e2e 무조건 실행 |
| draft PR 수 | 0 (전 기간) — draft 활용 시 즉시 절감 가능 |
| 모르는 실행 | **없음** |
| 절감 가능 | ①④⑥ 적용 시 **약 55~70%** |
