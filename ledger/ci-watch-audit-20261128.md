# ci-watch 직접 검증 · 2026-11-28

## 오전

(기록 없음 — 이 파일은 오후 검증에서 처음 생성)

## 오후 · 기준 시각 2026-11-28T09:41:47Z (16:41 WIB)

ci-watch 값 = `ci-watch-state` 브랜치 `state.json` (snapshot 커밋 3ebdc2c · 09:41:47Z · v1.28).
1차 출처 = relay main `status/claims/*-1128-*.json` · `status/pipeline/*.jsonl` · `status/ci-box/imac.json` + heartbeat 커밋 · `runner-status/all.json` · GitHub PR ci-summary 코멘트.

### 대조표

| 항목 | 1차 출처 값 | ci-watch 값 | 판정 | 불일치 원인 추정 |
|---|---|---|---|---|
| 진행 중 프롬프트 수·목록 | 5 — M0-1128-G(07:42Z) · M1-1128-I · M2-1128-H · R0-1128-I(08:01Z) · M3-1128-L(08:05Z) · claims started / pipeline 마지막 이벤트 started | `pipelinePrompts: []` (0) · `hubPending` 전부 빈 배열 | ❌ 불일치 | ci-watch-web 이 보는 main 사본이 ~03:16–03:21Z 이후 갱신 안 됨(아래 타임라인 근거). 또 pipeline `started` 이벤트의 `hub` 가 `"?"` 로 기록돼 허브별 집계에서 빠질 가능성 |
| 허브별 상태 | all.json(08:55Z): m0·m1·m2·m3·r0 전부 current 있음(작업 중) | allJson 은 같은 값(5허브 작업 중) · 그러나 todayTimeline 은 M0-D·M2-D·M3-G 를 진행 중(endMs null)으로 표시 | ❌ 불일치 | 타임라인 = 낡은 main 사본 기준. 실제 M0-D blocked 04:16Z · M2-D blocked 04:08Z · M3-G done 03:21Z |
| 오늘 완료 수 | done 33 (M0 5 · M1 7 · M2 5 · M3 8 · R0 8) · blocked 7 (M0-D · M1-H · M2-D · M2-F · M3-H · M3-J · M3-K) · started 5 | `todayStats: null` (미표시) · `claimStartedCount: 52` | ❌ 불일치 | todayStats 계산 실패 또는 미구현. 52 는 1차(오늘 ID 45개)와 안 맞음 — 재시작·recovered 이벤트까지 센 것으로 추정 |
| 아이맥 heartbeat 나이 | imac.json ts 09:39:43Z · 커밋 09:41:13Z → 약 2분 · health=ok · listener 4 · worker 0 | 경고 `imac_heartbeat_stale` "255분 · 마지막 12:26 WIB" | ❌ 불일치 (허위 경보) | main 사본 정체. heartbeat 커밋은 6분 간격으로 정상 도착 중 |
| 러너 응답 나이 | all.json at 08:55:39Z → 46분 | `heartbeat_timeout` "46분" | ✅ 일치 | — (err_tail 에 sleep gap 반복 · state.json/ci-health push 실패 기록 → Mac 잠자기 추정) |
| 러너 버전 | all.json runner v8.3.7 · 최근 claim 커밋도 v8.3.7 | v8.3.7 | ✅ 일치 | — |
| CI 진행 중/대기 | imac.json worker_count 0 · current [] | runState heavy/light inProgress·queued 전부 [] | ✅ 일치 | — (단 fork#302 에 "not started ⏳" 레그 1개가 06:54Z 부터 남아 있음 — 큐에 안 잡힌 매트릭스 레그로 추정) |
| 레포별 마지막 CI | storeport: #487 ci-summary 05:58Z ❌ 1 failed(feature-map-check) · fork: #302 06:54Z ❌2 · #292 06:44Z ❌2 · #301 06:24Z ✅ | storeport 01:13Z success · fork 03:14Z success | ❌ 불일치 | 같은 정체(낡은 데이터). 최근 결과가 빨강인데 초록으로 보임 |

### 말이 안 되는 조합

1. claims 에 started 5건인데 ci-watch 진행 0 — 위 1번 항목.
2. relay 아이맥 heartbeat 는 2분 전 최신인데 ci-watch 는 255분 끊김 경고.
3. 진행 중 5건이 시작 후 96~119분 경과 — 러너 run_timeout 60분을 넘었는데 timeout blocked 가 안 올라옴. 러너가 08:55Z 이후 응답 없음(잠자기 추정)이라 claim 이 갱신되지 못한 상태 → "진행 중" 표시 자체가 실제 진행을 보장하지 않음.
4. storeport#487 이 ci-summary ❌(feature-map-check) 상태에서 06:05Z 머지됨 — ci-watch 는 storeport 마지막 CI 를 초록으로 표시.
5. pipeline jsonl 의 `started` 이벤트 hub 필드가 항상 `"?"` (queued·blocked 는 정상 허브명).

### 고칠 것 (발부는 메인 오케 창에서)

- `ci-watch-web` 의 read-only clone 갱신 — main 사본이 ~03:16Z 이후 정체 추정. 정체 시작이 relay#78(웹 전용 read-only clone · 02:48Z 머지)·#79·#80(plist 수정) 직후라 pull 경로/plist 설정 의심.
- ci-watch 에 "입력 데이터 나이" 표시 + 사본이 N분 이상 낡으면 경보를 허위 경보 대신 "데이터 낡음"으로 바꾸기.
- `todayStats` null — 오늘 완료/막힘 집계 복구.
- `claimStartedCount` 정의 확인(오늘 ID 수인지 이벤트 수인지) — 라벨 명확화.
- 러너 pipeline 로그 `started` 이벤트 hub 필드 `"?"` → 실제 허브명 기록(hub-runner).
- 러너가 잠자기 후 run_timeout 초과 claim 을 깨어나서 정리하는지 확인 (현재 5건 60분 초과 started 상태).
- `lastCiByRepo` 최신 ci-summary 반영 + storeport#487 빨강 머지 건 확인(feature-map 미분류 2파일).
- fork#302 "not started" e2e 레그 1개 방치 여부 확인.
