PASS https://github.com/CuriocityDevAi/curiocity-relay/pull/48

W2 결론: 103건 = ci-watch의 `buildTodayMachineStats`가 MBP runner_name 전체를 집계할 때 marker 잡(route/heavy-cloud/ci-summary 10개)을 포함한 오집계. GitHub JSONL 대조 결과 올바른 MBP 건수 = 90(marker+skipped/cancelled 제외), iMAC = 57, cloud = 18. 75 cloud vs "cloud 잡 오늘 25건" 불일치 = all.json today.cloud(marker 50개 포함 전체)와 readRealCloudData(marker 제외만)의 집계 기준 차이. GitHub API(오늘 storeport 72건·fork 61건 completed runs 확인).

---

## W2 대조표 (JSONL 기준 · GitHub completed runs 대조)

| 기계 | ci-watch 표시 (before) | 원인 | JSONL 올바른 집계 | GitHub runs (참고) |
|---|---|---|---|---|
| MBP | 103건 | marker 10개 포함 | 90건 (marker+skip/cancel 제외) | storeport 72 + fork 61 runs (page1) |
| iMAC | 62건 | marker 4개 포함 | 57건 (marker+skip/cancel 제외) | — |
| cloud (all.json today.cloud) | 75건 | marker 50개 포함 | — (참조값) | — |
| cloud 잡 오늘 (readRealCloudData) | 25건 | skip/cancel 미제외 | 18건 (marker+skip/cancel 제외) | — |

**JSONL runner_name='unknown' 29건**: runner_name 미기록된 잡으로 MBP/iMAC/cloud 어느 쪽에도 미집계. JSONL 집계와 GitHub API 간 오차 원인 중 하나.

**75 vs 25 불일치 원인**: `all.json today.cloud = 75` = JSONL runner_kind='cloud' 전체(marker 50개 포함); `readRealCloudData = 25` = marker만 제외(isMarkerJob). 두 집계의 기준이 달라 같은 화면에 모순처럼 보임. 수정 후 readRealCloudData도 skipped/cancelled 제외하면 18건.

---

## 폭 100·140 스냅샷 (W1 평균대기 위치 확인)

**width=100** (CI_AVG_X=94, 94+8=102 > 100 → 허브 머리줄 라벨 생략):
```
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ──────────────────────────────────────────────────────
  m0  —                                                                                       1.5m
  m1  —                                                                                       3m
  ...
  풀                대기                    MBP M1          iMAC M1         클라우드          평균대기
  storeport-heavy   —                       쉼(7)           쉼(2)           —(12)             2.5m
```

**width=140** (CI_AVG_X=94, 94+8=102 ≤ 140 → 허브 머리줄 라벨 표시):
```
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ──────────────────────────────────────────────── 평균대기─────────────────────────────────────
  m0  —                                                                                       1.5m
  ...
  풀                대기                    MBP M1          iMAC M1         클라우드          평균대기
```
허브 머리줄 `평균대기` display x=94 = CI 표 `평균대기` display x=94 = CI_AVG_X ✓

---

## 테스트 로그

```
ci-watch-w110.test.mjs (W1~W4 신설):
  W1-1: 허브 큐 머리줄 `평균대기` display 위치 = CI_AVG_X ... ok
  W1-2: 허브 줄 평균대기 값 display x = CI_AVG_X ... ok
  W1-3: 창 폭 < CI_AVG_X + 8 → 허브 머리줄 `평균대기` 생략 ... ok
  W1-4: 창 폭 < CI_AVG_X + val_width → 허브 줄 평균대기 값 생략 ... ok
  W3-1: hubPending 에 current ID 없으면 허브 줄에 current 칩 미표시 ... ok
  W4-1: todayPoolMachineStats.mbp > 0 → 쉼(N) 등장 ... ok
  W4-2: 실행 중 셀 → ⠋ID 3m (N) 형태 ... ok
  W4-3: 클라우드 idle 셀 → —(N) ... ok
  W4-4: todayPoolMachineStats=null → 쉼 (숫자 없음) ... ok
  W4-5: 오늘 처리(잡) 라벨 등장 ... ok
# tests 10, pass 10, fail 0

기존 테스트 전체 (ci-watch-*.test.mjs):
# tests 185, pass 185, fail 0
```

## 변경 파일

- `scripts/ci-watch.mjs`: classifyRunner import, CI_WATCH_VERSION 1.9→1.10, buildTodayMachineStats marker/skip/cancel 제외, buildTodayPoolMachineStats 신설, tick() hubPending current 제외(W3), renderData에 todayPoolMachineStats 추가
- `scripts/watch/ci-watch-render.mjs`: CI_AVG_X 상수 export, appendHubWait CI_AVG_X 고정(W1), hub header 평균대기 위치(W1), fmtMachineCell/fmtCloudCell todayN 파라미터(W4), renderLayout todayPoolMachineStats 파라미터(W4), 오늘 처리(잡) 라벨(W2)
- `scripts/test/ci-watch-w110.test.mjs`: 신설 (10개 테스트)
