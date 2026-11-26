PASS https://github.com/CuriocityDevAi/curiocity-relay/pull/50

## M2-1126-G — ci-watch v1.11 (W5~W9)

Branch: `feat/M2-1126-G-ci-watch-v111`
Commit: `74877cac1`
PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/50

---

## 아이맥 반영 명령

```
ssh imac 'git -C ~/projects/curiocity-relay-heartbeat pull --ff-only'
```

---

## 스냅샷 WIDTH 100 (맥북 OFF · 아이맥 실행 중 ⠹#273·playwr… · ✓Nm · 합계 줄)

```
ci-watch v1.11  2026/11/26 09:12:34  ●진행 1  ■주의 0  ✔오늘 86  runner ?  heartbeat 0분전
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ──────────────────────────────────────────────────────
  m0  —
  m1  —
  m2  —
  m3  —
  r0  —
  git: ahead=0 behind=0
─ CI 큐 (SH 0 · SL 0 · FH 0 · FL 0) ───────────────────────────────────────────────────────────────
  풀                대기                    MBP M1          iMAC M1         클라우드          평균대기
  storeport-heavy   —                       OFF             ⠹#273·playwr…  —(2)              -
  storeport-light   —                       OFF             쉼(12)    ✓7m  —(1)              -
  fork-heavy        —                       OFF             쉼(3)           —                 -
  fork-light        —                       OFF             쉼              —                 -
  오늘 처리(잡)                             68건·1.8m       22건·1.5m ✓3m  18건·1.2m $0.50
─ 진행 중 (1) ────────────────────────────────────────────────────────────────────────────────────
  ⠹ #273    playwright  1m
─ 오늘 완료 86 (r 갱신 · q 종료) ─────────────────────────────────────────────────────────────────
  cloud 잡 오늘  2건  잔여 3
  PR 14 · PT 31 · 잡 165
  다음 갱신 30초 | r 지금 갱신 · q 종료  --full: 전체 목록
```

**확인 포인트:**
- 맥북 MBP 칸: `OFF` (MBP 러너 offline)
- 아이맥 storeport-heavy: `⠹#273·playwr…` (W9: PR번호·잡이름, colW=14 절단)
- storeport-light iMAC: `쉼(12) ✓7m` (W8: 10분 내 완료 초록)
- 오늘 처리(잡): `22건·1.5m ✓3m` (W8: 행 최소 ✓Nm)
- 합계 줄: `PR 14 · PT 31 · 잡 165` (W7)

---

## 스냅샷 WIDTH 140 (동일 조건)

```
ci-watch v1.11  2026/11/26 09:12:34  ●진행 1  ■주의 0  ✔오늘 86  runner ?  heartbeat 0분전
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ─────────────────────────────────────────────── 평균대기─────────────────────────────────────
  m0  —
  ...
─ CI 큐 (SH 0 · SL 0 · FH 0 · FL 0) ───────────────────────────────────────────────────────────────────────────────────────────────────────
  풀                대기                    MBP M1          iMAC M1         클라우드          평균대기
  storeport-heavy   —                       OFF             ⠹#273·playwr…  —(2)              -
  storeport-light   —                       OFF             쉼(12)    ✓7m  —(1)              -
  fork-heavy        —                       OFF             쉼(3)           —                 -
  fork-light        —                       OFF             쉼              —                 -
  오늘 처리(잡)                             68건·1.8m       22건·1.5m ✓3m  18건·1.2m $0.50
─ 진행 중 (1) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ⠹ #273    playwright  1m
─ 오늘 완료 86 (r 갱신 · q 종료) ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  cloud 잡 오늘  2건  잔여 3
  PR 14 · PT 31 · 잡 165
  다음 갱신 30초 | r 지금 갱신 · q 종료  --full: 전체 목록
```

---

## W9 Worker 로그 파싱 단위 테스트 (W9-H)

샘플 로그 형식:
```
[2026-11-26 07:00:00Z INFO Worker] Starting worker process
[2026-11-26 07:00:01Z INFO Worker] Job message:
{
  "jobDisplayName": "playwright",
  "variables": [
    {"k": "repository", "v": "CuriocityDevAi/storeport"},
    {"k": "workflow",   "v": "CI"},
    {"k": "head_ref",   "v": "feat/M2-1126-G"},
    {"k": "event_name", "v": "pull_request"},
    {"k": "number",     "v": "273"}
  ]
}
```

파싱 결과: `{job: "playwright", repo: "CuriocityDevAi/storeport", workflow: "CI", head_ref: "feat/M2-1126-G", event_name: "pull_request", pr: "273"}`

테스트: `W9-H` PASS (Python regex, `python3` 실행)

---

## 전체 테스트 로그

```
ci-watch-w111.test.mjs + ci-watch-w110.test.mjs:

ok  1 - W1-1: 허브 큐 머리줄 `평균대기` display 위치 = CI_AVG_X
ok  2 - W1-2: 허브 줄 평균대기 값 display x = CI_AVG_X
ok  3 - W1-3: 창 폭 < CI_AVG_X + 8 → 허브 머리줄 `평균대기` 생략
ok  4 - W1-4: 창 폭 < CI_AVG_X + val_width → 허브 줄 평균대기 값 생략
ok  5 - W3-1: hubPending 에 current ID 없으면 허브 줄에 current 칩 미표시
ok  6 - W4-1: todayPoolMachineStats.mbp > 0 → 쉼(N) 등장
ok  7 - W4-2: 실행 중 셀 → ⠋ID 3m (N) 형태
ok  8 - W4-3: 클라우드 idle 셀 → —(N)
ok  9 - W4-4: todayPoolMachineStats=null → 쉼 (숫자 없음)
ok 10 - W4-5: 오늘 처리(잡) 라벨 등장
ok 11 - W5-1: classifyMachine(null) → "unknown" (not "cloud")
ok 12 - W5-2: classifyMachine cloud runner names → "cloud"
ok 13 - W5-3: null/self-hosted runner → buildMachineState 클라우드 칸에 미포함
ok 14 - W5-4: self-hosted(imac) runner in-progress → cloud 칸 미포함
ok 15 - W6-1: ci.data.partial=true → idle 셀에 "?" 등장
ok 16 - W6-2: hub-runner/partial skip/claim 로그 줄은 화면 미출력
ok 17 - W7-1: summaryPR/PT/잡 → "PR 14 · PT 31 · 잡 165" 형태 한 줄
ok 18 - W7-2: 합계 줄 순서 PR → PT → 잡 고정
ok 19 - W8-1: machineRecentStats recentMin=3 → idle 셀에 ✓3m 등장
ok 20 - W8-2: 오늘 처리(잡) 행에 machineRecentStats → ✓Nm 등장
ok 21 - W8-3: offline 기계 (OFF) → ✓Nm 없음
ok 22 - W9-1: running 셀 → PR ID 등장 · 잡이름 일부 등장(절단 허용)
ok 23 - W9-2: running 셀 초과 → 말줄임 등장 · 셀 폭 고정 (다음 열 밀림 없음)
ok 24 - W9-3: job=null, pr=null, branch=null → "?" 표시
ok 25 - W9-H: collect_running_jobs Python 파싱 — Worker 로그 샘플에서 job/repo/pr 추출

전체 ci-watch-*.test.mjs: 200/200 pass (fail 0)
```

---

## 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `scripts/watch/ci-watch-render.mjs` | truncateWidth import 추가, W5 classifyMachine null→unknown, W6 partial idle '?', W6 ERR_TAIL_SCREEN_FILTERS, W7 합계 줄, W8 ✓Nm 초록, W9 잡이름·절단 |
| `scripts/ci-watch.mjs` | v1.11, readImacJson, classifyRunnerDir, computeToday*, buildMachineRecentStats, W5 fetchQueuedForRepo runner 필터, W9 imac.json runners.current 주입 |
| `scripts/ci-box/health.sh` | collect_running_jobs() 추가, main() runners.current[] 조립 |
| `scripts/test/ci-watch-w111.test.mjs` | 신규 W5~W9 15 케이스 |
| `scripts/test/ci-watch-machines.test.mjs` | M-1e: null→unknown 갱신 |
| `scripts/test/ci-watch-w110.test.mjs` | W4-2: 단축 prompt_id 적용 (W9 절단 반영) |
