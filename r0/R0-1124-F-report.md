APPROVE

리뷰어: claude-sonnet-4-6 · 2026-11-24 13:31 WIB
PR: CuriocityDevAi/curiocity-relay #16 (`feat/M2-1124-F-ci-watch-busy-job` → main)

---

## 변경 파일 확인

| 파일 | 종류 | 판정 |
|------|------|------|
| `scripts/ci-watch.mjs` | 수정 +352/-4 | ✔ |
| `scripts/watch/ci-watch-render.mjs` | 수정 +77/-5 | ✔ |
| `m2/M2-1124-C-report.md` | 신규 추가 | ✔ |
| `hub-runner*.mjs` | 변경 없음 | ✔ |
| `claim.mjs` | 변경 없음 | ✔ |
| `.github/workflows/*.yml` | 변경 없음 | ✔ |

→ 감시 화면 전용 변경. 러너·클레임·워크플로 무변경.

---

## 실행 검증 (별도 worktree: /Users/kyu.lee/projects/relay-M2-1124-F)

```
node --check scripts/ci-watch.mjs        → (출력 없음) PASS
node --check scripts/watch/ci-watch-render.mjs → (출력 없음) PASS
```

### 화면 1회 출력 캡처 (13:31:31 WIB)

```
⚠ 경보 6  11/24/2026 13:31:31 WIB
──────────────────────────────────────────────────────
  m0  idle
  m1  idle
  m2  M2-1124-C  97분  [M2-1124-D, M2-1124-E, M2-1124-F]
  m3  M3-1124-C  108분  [M3-1124-D]
  r0  idle  [R0-1105-BA, R0-1124-B, R0-1124-C, R0-1124-D]
  heartbeat 97분  v7.8 pid=75067  git: ahead=0 behind=0
──────────────────────────────────────────────────────
  storeport-heavy  Youngkyus-MacBook-Pro-M1  ●BUSY
  storeport-light  curiocity-mac-light       ●OK   storeport:#415 check 0분
  fork-heavy       curiocity-mac-fork        ●OK
  fork-light       curiocity-mac-fork-light  ●OK
──────────────────────────────────────────────────────
  오늘 누적 (WIB)
  mac-heavy        32잡  대기0.8분  실행1.2분  성공90.6%
  mac-light         3잡  대기0.0분  실행0.3분  성공100.0%
  cloud(경과포함)   18잡  실행0.1분  성공72.2%
  cloud 한도        0/5건  $0.10  최근 5
──────────────────────────────────────────────────────
  마지막 완료 CI
  storeport   11:27 WIB  (124분 전)  ✔  runner-watch
  fork        11:42 WIB  (109분 전)  ✔  ci-summary
──────────────────────────────────────────────────────
  ⚠ 허브 heartbeat 갱신 없음(Mac 멈춤?) · 97분
  ⚠ 미투입: R0-1105-BA (38분)
  ⚠ 미투입: R0-1124-B (38분)
  ⚠ 미투입: R0-1124-C (38분)
  ⚠ 미투입: R0-1124-D (38분)
──────────────────────────────────────────────────────
  갱신 30초 | Ctrl+C 종료  --full: 전체 목록
```

---

## 검증 항목별 판정

### ① 오늘 누적 표 — PASS
mac-heavy/light·cloud 세 줄 + cloud 한도 한 줄 표시 확인. 잡수·대기·실행·성공률·cloud n/5 모두 출력.

### ② 리포별 마지막 완료 CI 시각 — PASS
- storeport: 11:27 WIB (124분 전) ✔ runner-watch
- fork: 11:42 WIB (109분 전) ✔ ci-summary
JSONL 우선, gh run list 폴백(2분 캐시) 정상 동작.

### ③ 허브 줄 대기 `[...]` 러너 선택 규칙 대조 — PASS
`listHubPendingState`: `-report.md`·`-selftest.md` 제외 → 알파벳순 → claim state `null/issued`만 포함.
화면 시점에서 r0 대기: R0-1105-BA(claim없음), R0-1124-B~D(claim없거나 issued 추정) 일치.
이후 B~D가 `done`으로 처리됐고, 현재 r0 current=R0-1124-F — 오래된 파일 오판 없음.

### ④ 큐 변경 알림 삭제 오표시 — PASS (코드)
`diffHubQueue`: `state === 'started' || state === 'done'` → `▶ 시작` (cyan)
그 외 → `✕ 삭제` (red). 러너가 집은 항목을 `▶ 시작`으로 올바르게 구분.

### ⑤ BUSY 줄 PR·프롬프트·잡 — PASS (조건부)
화면 캡처 시 storeport-heavy BUSY인데 세부 정보 비어있음.
원인: 해당 시점 `all.json.ci.data.heavy.in_progress = []`였던 것으로 추정 (캡처 이후 current가 M2-1124-C→H로 바뀌고 storeport:#415 진행 중).
`buildBusyJobMap` + `enhanceBusyLines` 구현 자체는 정상: PR·promptId·jobName·runningMin 추출·조합, 25분+ 적색·15분+ 황색 처리.

### ⑥ git 쓰기 0 · API 캐시 — PASS
파일 헤더 "relay git 쓰기 없음" 명시 + 로컬 캐시 `~/.hub-runner/ci-watch/` 한정.
30초 갱신당 gh API: 최대 4회(2 repos × in_progress+queued).
BUSY 프롬프트 캐시: 2분 TTL(`BUSY_CACHE_MS`).
마지막 CI: 2분 캐시(`CI_LAST_CACHE_MS`). 폭주 없음.

---

## 결론

APPROVE — `hub-runner*.mjs`·`claim.mjs`·워크플로 무변경 확인, 감시 화면 전용 개선 4건(C~F) 정상 동작.
