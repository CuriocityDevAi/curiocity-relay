PASS relay#56 60f6b2ec7

## 요약
Kyu 22:13 "숫자가 안맞아... 신뢰도가 너무 떨어져" (스크린샷 22:07 v1.13) 대응. ci-watch v1.13 → **v1.15**.

- 상/하 클라우드 숫자 통일 (cloudData.realCount 단일 소스).
- 전체 오늘 = MBP + iMAC + 클라우드 **단순 합** (Kyu 확정).
- iMAC '?' 원인(partial 전역 플래그) 수정 → online+idle 은 '쉼' 확정.
- ⚠ 집계 불일치 가드 (checkAggregateInvariants) — "조용히 틀린 숫자 금지".

## 원인 4가지 (각 1줄)
- (ㄱ) 상단 '오늘 처리(잡)' 클라우드 = `todayStats['cloud'].jobs` (hub-runner 집계) vs 하단 '클라우드 오늘 잡' = `cloudData.realCount` (ci-watch 집계) — **두 함수가 서로 다른 필터**를 썼다. v1.15 는 하단 소스로 통일.
- (ㄴ) '전체 PR' = `summaryPR = computeTodayPRCount` (**unique PR, isMarkerJob 만 제외**) — 세 줄과 자격이 달라 합이 성립 안 함. v1.15 는 세 줄 단순 합.
- (ㄷ) '전체 PT' = `summaryPT = computeTodayPTCount` (**`claims/` 폴더 카운트, 파이프라인 아님**) — 전혀 다른 소스. v1.15 는 세 줄 단순 합.
- (ㄹ) iMAC '?': `buildMachineState` 가 `isGlobalPartial`(다른 repo 조회 실패로도 켜짐) 로 online+idle 을 뒤집음. v1.15 는 online 러너의 idle 을 **확정 사실**로 취급.

## PT 110 원인 1줄
`computeTodayPTCount` = `status/claims/*.json` 중 state in {started,done} & WIB=오늘 카운트 — **파이프라인 artifact 기반 PT(13/19/14)와 전혀 다른 원장**. v1.15 는 전체 줄에서 이 값 사용 중단.

## 손계산 vs 실제 출력 (`status/ci/2026-11-26.jsonl`, 485 records)

Python hand-compute (`isCountableJob + classifyMachine`):
```
mbp:     jobs=82,  unique PRs=12
imac:    jobs=138, unique PRs=15
cloud:   jobs=23,  unique PRs=11   (classifyMachine 기준)
unknown: jobs=1
Total countable jobs = 244
Cloud by runner_kind==='cloud' & countable = 24   (readRealCloudData 기준)
Total unique PRs (dedup) = 22
Sum of per-machine PRs = 38
computeTodayPRCount equiv (markerOnly) = 23
computeTodayJobCount equiv = 244
```

`renderLayout` 실측 출력 (실제 jsonl + all.json, terminalWidth=140):
```
  풀                대기                    MBP M1          iMAC M1         클라우드          평균대기
  storeport-heavy   —                       OFF             쉼              —                 -
  storeport-light   —                       OFF             쉼              —                 -
  fork-heavy        —                       OFF             쉼              —                 -
  fork-light        —                       OFF             쉼              —                 -
  오늘 처리(잡)                             82건·2.5m       138건·1.8m      24건·1.3m $2.14

  MBP M1 오늘     PR 12 · PT 13 · 잡 82
  iMAC M1 오늘    PR 15 · PT 19 · 잡 138
  클라우드 오늘   PR 11 · PT 14 · 잡 24 · 넘김 0/5
  전체 오늘       PR 38 · PT 46 · 잡 244
```

- MBP 82 ✓ · iMAC 138 ✓ · 클라우드 24 ✓ · 합 244 ✓ (손계산 일치)
- PR 12+15+11 = **38** ✓ · PT 13+19+14 = **46** ✓ · 잡 82+138+24 = **244** ✓
- 상단 클라우드 셀 **24** = 하단 '클라우드 오늘 잡 24' (단일 소스 통일. 이전 162/146 소멸)
- iMAC 전 풀 '쉼' (`ci.data.partial=true` 상태였으나 online idle = 확정 '쉼')
- ⚠ 집계 불일치 메시지 없음 (올바른 집계)

## 자기검사 가드 (W115)
- G1: topCloudJobs(146) ≠ bottomCloudJobs(24) → "클라우드 상단 146 ≠ 하단 24"
- G2: totalPR(22) ≠ mbp+imac+cloud → "전체 PR 22 ≠ 12+15+11=38"
- G3: totalPT(110) ≠ 세 줄 합 → "전체 PT 110 ≠ 13+19+14=46"
- G4: totalJobs 불일치 감지
- OK: 정상 입력 → `msgs = []`
- GUARD-SCREEN: 정상 입력 → 화면에 ⚠ 메시지 없음

## 바뀐 파일
- `scripts/ci-watch.mjs` — `CI_WATCH_VERSION '1.13' → '1.15'`
- `scripts/watch/ci-watch-render.mjs` — `checkAggregateInvariants` 신설 / `buildMachineState` partial 의미 수정 / `buildTodayProcessedRow` cloudJobs 파라미터화 / 4행 전체 = 세 줄 합
- `scripts/test/ci-watch-w115.test.mjs` — 신규 (G1~G4 guard · OK · sum · cloud-unified · imac-쉼 · guard-screen · jsonl 손계산 · 디버그 print)
- `scripts/test/ci-watch-w111.test.mjs` — W6-1·W7-1·W7-2 세 테스트를 v1.15 의미로 갱신 (옛 버그를 보존하던 테스트 제거)
- `scripts/test/ci-watch-w113.test.mjs` — W10-전체줄·W10-전체PR 두 테스트 갱신

## 테스트
- `node --test scripts/test/ci-watch-w*.test.mjs` → **70/70 pass** (신규 11건 포함)
- `node scripts/ci-watch.mjs --once` → `[ci-watch:once] imports ok`

## 보존 요소 확인
- 화면 배치 (허브 큐 · CI 큐 · 진행 중 · 오늘 완료 · 4줄) 유지
- W9 '실행 중' 칸 유지

## PR
https://github.com/CuriocityDevAi/curiocity-relay/pull/56
commit `60f6b2ec7`
branch `feat/M2-1126-Q-ci-watch-v115`
