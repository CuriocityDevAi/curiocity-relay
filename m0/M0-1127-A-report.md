# M0-1127-A Report — PASS

- **PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/61
- **커밋**: `4ed30991a9a77b2447c3fc4ab9b1feb96fa755c3` on `feat/M0-1127-A-ci-watch-progress-band`
- **상태**: PASS (모든 REQ 완료 · 테스트 251/251 · 실데이터 2폭 눈 확인 · 검증의 검증 통과)
- **범위**: ci-watch 기본 화면 · 명세 `specs/screens/ci-watch.md` 복구 (CW-PROG · CW-HEAD · CW-RENDER · CW-ALERT · CW-VERSION)

## REQ 체크

| # | 항목 | 결과 | 위치 |
|---|---|---|---|
| 1 | CW-PROG 복구 (프롬프트/9단계 띠/색/└ 이유) + 새로 안 만들고 v2 재사용 + "실행 중 CI 잡" 제거 | ✅ | `scripts/watch/ci-watch-render.mjs:985~1016` · `scripts/ci-watch.mjs:tick()` buildExtendedView 1회 · `collect-view.mjs` 의 `stageStrip`/`stageLabel` 재사용 |
| 2 | 머리줄 `●진행 N` = 프롬프트 수 (CI 잡 수 아님) | ✅ | `ci-watch-render.mjs:793~797` · 테스트 `G-HEAD-0` |
| 3 | CW-RENDER: `[build-hubs]` 줄 필터 + `주의 (1) 본문 안 보임` 원인 규명·수정 | ✅ | `ERR_TAIL_SCREEN_FILTERS` 에 `/^\[build-hubs\]/` 추가. "본문 안 보임" 뿌리 = `startCountdownTimer` 의 `\x1b[1A` 가 매 1초 "마지막 줄 바로 위" 를 덮어쓰기 → 주의 섹션을 countdown 위로 이동 |
| 4 | CW-VERSION 1.18 + 이력 주석에 1.17 relay#60 예약 · 1.18 M0-1127-A | ✅ | `ci-watch.mjs:9,39` |
| 5 | 보존 테스트 `ci-watch-spec-guard.test.mjs` | ✅ | 7건 pass · 구역 순서 · 9칸 띠 · ●진행 N · 러너 로그 없음 · CI 큐 열 6개 |
| 6 | `docs/ci-watch.md` 맨 위 "기본값" 수정 + `--v2` = 실험 · 다음 라운드 제거 후보 (이번엔 삭제 안 함) | ✅ | `docs/ci-watch.md:3-14` |
| 7 | PR 발의 (base main · 머지 금지) | ✅ | #61 |

## 자기 검증

### (a) `node --test scripts/test/ci-watch-*.test.mjs` 전체

```
# tests 251
# suites 0
# pass 251
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 20518.168166
```

기존 244 (W115-jsonl-print 포함 7건 신규 추가로 251 됨) + 신규 `ci-watch-spec-guard.test.mjs` 7건. 모두 녹.

### (b) 실제 relay 데이터로 렌더 (터미널 폭 140 · 101)

**140 폭** (`skipFetch:true · skipGh:true` · `status/runners/all.json` 그대로 · 2026-11-27 05:55 WIB):

```
ci-watch v1.18 (2026-11-27)  2026/11/27 05:55:00  ●진행 5  ■주의 0  ✔오늘 0  runner v8.3.2  heartbeat 0분전
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ──────────────────────────────────────────────── 평균대기─────────────────────────────────────
  m0  M0-1127-A  14분
    └ ⠋ M0-1127-A  작업 중
  m1  —
  m2  M2-1127-B  12분
    └ ⠋ M2-1127-B  작업 중
  m3  —
  r0  —
  git: ahead=0 behind=1
─ CI 큐 (SH 0 · SL 0 · FH 0 · FL 0) ───────────────────────────────────────────────────────────────────────────────────────────────────────
  풀                대기                    MBP M1          iMAC M1         클라우드          평균대기
  storeport-heavy   —                       ?               쉼              —                 -
  storeport-light   —                       ?               쉼              —                 -
  fork-heavy        —                       ?               ⠋#281·playwr…  —                 -
  fork-light        —                       ?               ⠋#282·lint 1m   —                 -
  오늘 처리(잡)                             0건             0건             0건
─ 진행 중 (5) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ● M0-1127-A    m0  ●◐○○○○○○○  작업    14분           🔴 ci-watch 진행 중 = 프롬프트별 9단계 띠 복구
  ● M2-1127-B    m2  ●◐○○○○○○○  작업    12분           🔴 방법론 v2.0
  ● M3-1127-A    m3  ●●●●◐○○○○  CI대기  2분    #282    명세↔구현 대조가 사람(R0) 손에 의존 · 자동 대조(명세 요소 ID ↔ data-testid
  ▲ M1-1127-A    m1  ●●●●●●◐○○  CI결과  7분    #281    보존 테스트는 '버튼이 있다'만 봄, '흐름이 된다'는 안 봄
  ■ M2-1127-A    m2  ●●●●◐○○○○  CI대기  18분   #1      🔴 방법론 v2.0
    └ CI 미시작 — 로컬 러너 미착수
─ 오늘 완료 0 (r 갱신 · q 종료) ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  MBP M1 오늘     PR 0 · PT 0 · 잡 0
  iMAC M1 오늘    PR 0 · PT 0 · 잡 0
  클라우드 오늘   PR 0 · PT 0 · 잡 0 · 넘김 폐지
  전체 오늘       PR 0 · PT 0 · 잡 0
  다음 갱신 30초 | r 지금 갱신 · q 종료  --full: 전체 목록
```

눈으로 확인 가능:
- `ci-watch v1.18` ✅
- `●진행 5` (프롬프트 5건 모두 띠로 노출) ✅
- 각 줄에 9칸 띠 + 현재 단계 `◐` + 단계 이름(`작업` / `CI대기` / `CI결과`) + 머문 시간 + `#PR` ✅
- 색 레벨 다양: `●` 녹 3건 · `▲` 노 1건 (CI결과 7분 · yellow 임계 5분) · `■` 빨 1건 + 다음 줄 `└ CI 미시작 — 로컬 러너 미착수` ✅
- `[build-hubs]` 노출 없음 ✅ · 오늘 완료 아래 바로 countdown · 주의 섹션은 0건이라 생략 (스펙대로 N=0 → 생략) ✅

**101 폭** (같은 데이터 · 2026/11/27 05:55):

```
ci-watch v1.18 (2026-11-27)  2026/11/27 05:55:00  ●진행 5  ■주의 0  ✔오늘 0  runner v8.3.2  heartb
─ 허브 큐 (m0 0 · m1 0 · m2 0 · m3 0 · r0 0) ───────────────────────────────────────────────────────
  m0  M0-1127-A  14분
    └ ⠋ M0-1127-A  작업 중
  m1  —
  m2  M2-1127-B  12분
    └ ⠋ M2-1127-B  작업 중
  m3  —
  r0  —
  git: ahead=0 behind=1
─ CI 큐 (SH 0 · SL 0 · FH 0 · FL 0) ────────────────────────────────────────────────────────────────
  풀                대기                    MBP M1          iMAC M1         클라우드          평균대
  storeport-heavy   —                       ?               쉼              —                 -
  storeport-light   —                       ?               쉼              —                 -
  fork-heavy        —                       ?               ⠋#281·playwr…  —                 -
  fork-light        —                       ?               ⠋#282·lint 1m   —                 -
  오늘 처리(잡)                             0건             0건             0건
─ 진행 중 (5) ─────────────────────────────────────────────────────────────────────────────────────
  ● M0-1127-A    m0  ●◐○○○○○○○  작업    14분           🔴 ci-watch 진행 중 = 프롬프트별 9단
  ● M2-1127-B    m2  ●◐○○○○○○○  작업    12분           🔴 방법론 v2.0
  ● M3-1127-A    m3  ●●●●◐○○○○  CI대기  2분    #282    명세↔구현 대조가 사람(R0) 손에 의존
  ▲ M1-1127-A    m1  ●●●●●●◐○○  CI결과  7분    #281    보존 테스트는 '버튼이 있다'만 봄, '
  ■ M2-1127-A    m2  ●●●●◐○○○○  CI대기  18분   #1      🔴 방법론 v2.0
    └ CI 미시작 — 로컬 러너 미착수
─ 오늘 완료 0 (r 갱신 · q 종료) ───────────────────────────────────────────────────────────────────
  MBP M1 오늘     PR 0 · PT 0 · 잡 0
  iMAC M1 오늘    PR 0 · PT 0 · 잡 0
  클라우드 오늘   PR 0 · PT 0 · 잡 0 · 넘김 폐지
  전체 오늘       PR 0 · PT 0 · 잡 0
  다음 갱신 30초 | r 지금 갱신 · q 종료  --full: 전체 목록
```

101 폭에서도 9칸 띠·단계 이름·PR#·시간 모두 보임. 제목만 `truncateAnsiWidth` 로 폭 안에 잘림 (스펙 CW-RENDER "줄바꿈 금지 · 폭으로 자름").

### (c) 검증의 검증 (진행 중 구역 임시 제거 → 보존 테스트 빨강)

진행 중 섹션 로직 블록(`─ 진행 중 ...` 제목 + for loop)을 임시로 빼고 `node --test scripts/test/ci-watch-spec-guard.test.mjs` 실행:

```
# tests 7
# suites 0
# pass 3
# fail 4
```

- `not ok 1 G-SECT` · `not ok 2 G-SECT-5` · `not ok 3 G-PROG` · `not ok 4 G-HEAD` → 구역 제거 즉시 빨강으로 바뀜 ✅
- `ok 5 G-HEAD-0` · `ok 6 G-RENDER` · `ok 7 G-CIQ` → 다른 구역 보존은 영향 없음

패치 후 원본 복원 → 7/7 녹색 재확인 완료.

## PR 본문 Kyu 확인 항목

- ci-watch 를 다시 띄우면 **머리줄 버전이 v1.18**.
- **진행 중 구역** 에 프롬프트마다 **원 9개 띠** 가 보임 (`●● … ◐ ○ ○`). 현재 단계에만 `◐` (반달), 지난 단계는 `●` (꽉), 남은 단계는 `○` (빈 원).
- 허브가 일하는 중이면 **머리줄 `●진행 N` 이 0 이 아님** (현재 실데이터 = `●진행 5`).

## relay#60 과 겹치는 지점

- `scripts/ci-watch.mjs:9` (버전 이력 주석) — #60 끝 = `… · 1.17 M2-1126-T(all.json 경로 → status-wt)`. 이 PR 끝 = `… · 1.17 relay#60 예약(M2-1126-T) · 1.18 M0-1127-A(진행 중 9단계 띠 복구 …)`. **머지 시 1.17 설명 둘 다 살려서 `1.17 M2-1126-T(all.json 경로 → status-wt) · 1.18 M0-1127-A(…)` 로 정리**.
- `scripts/ci-watch.mjs:39` (`CI_WATCH_VERSION` 상수) — #60 는 `'1.17'` · 이 PR 은 `'1.18'`. **나중에 머지되는 쪽이 1.18 로 상한**.
- `#60 의 다른 변경(라인 119 `PATHS.allJson`, `sources-git.mjs`, `hub-runner-v8.3.mjs`, `ci-watch-v2.test.mjs`) 과는 겹치지 않음.

## 결정론적 확인 (명세↔구현)

specs/screens/ci-watch.md 의 "현재 구현"·"일치 여부" 열:

| ID | 과거 | 현재 |
|---|---|---|
| CW-HEAD | **불일치** (●진행 0, CI 잡 수) | 일치 (`totalInProgress = pipelinePrompts.length`) |
| CW-PROG | **불일치** (CI 잡 목록) | 일치 (9단계 띠 · 색 · └ 이유) |
| CW-ALERT | 일치 (뿌리 미규명) | 일치 (뿌리 = countdown 덮어쓰기 · 섹션 순서 교정) |
| CW-RENDER | **불일치** (`[build-hubs]` 노출) | 일치 (`ERR_TAIL_SCREEN_FILTERS` 확장) |
| CW-VERSION | **불일치** (1.15) | 일치 (1.18) |
| CW-HUBQ / CW-CIQ / CW-CIQ-TODAY / CW-DONE | 일치 (변경 없음) | 일치 (보존) |

## 변경 파일

- `scripts/watch/ci-watch-render.mjs` — 진행 중 섹션 재구현 · `stageStrip`/`stageLabel` import · `ERR_TAIL_SCREEN_FILTERS` 에 `[build-hubs]` · 주의↔countdown 순서 교체 (+41/-16)
- `scripts/ci-watch.mjs` — `buildExtendedView` import + tick 에서 `pipelinePrompts` 공급 · `CI_WATCH_VERSION` 1.15 → 1.18 · 이력 주석 추가 (+19/-3)
- `scripts/test/ci-watch-spec-guard.test.mjs` — **신규** (7 테스트 · 명세 보존 가드)
- `docs/ci-watch.md` — 기본값 v1.18 · `--v2` 설명 (+3/-3)
- `specs/screens/ci-watch.md` — 현재 구현·일치 여부 열 갱신 · 이력에 11-27 복구 라인 (+6/-5)

## 안 한 것 (선택지 · 이유)

- `ci-watch-v2.mjs` 삭제: 이번 PR 스코프 밖. `docs/ci-watch.md` 에 "다음 라운드 제거 후보" 로 표기만.
- `renderCompact` (하위 호환) 의 `●진행` 뱃지 로직: `renderCompact` 는 기본 화면 아님. 기본 = `renderLayout` 이고 거기만 수정.
- `inProgress` CI 잡 줄을 CI 큐 표의 "실행 칸" 과 통합: 이미 `fmtMachineCell`/`fmtCloudCell` 에 실행 잡 이름+시간+러너가 들어 있음 (리포 재확인). 표에 없는 "unassigned" 는 상단 `미분류 러너` 경보로 이미 노출. 필요 시 다음 라운드에서 재검토.
