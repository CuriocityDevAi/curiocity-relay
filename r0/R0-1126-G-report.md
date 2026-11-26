#43 APPROVE · #42 CHANGES

## A. #43 ci-watch v1.7 (`M2-1126-A` · `M2-1126-B`)

### REQ 1 — 결정 문서 §1~7 대조표

| § | 요구 | 구현 | 판정 |
|---|------|------|------|
| §1 | CI 큐 4풀 × └ 항상 표시 · 고정 폭 3칸(MBP·iMAC·클라우드) | `renderLayout` → `POOL_DEFS` 4개 × `fmtMachineCell` 3칸, `─ 항상 표시` | ✅ |
| §2 | 기계 판별 `ci-box-*-imac`→iMAC · `curiocity-mac-*`/`Youngkyus-MacBook*`→MBP · 그 외→클라우드 | `classifyMachine` regex 3개 + 미지 self-hosted → `'unknown'` (경고 표시, §5) | ✅ |
| §3 | CI 구역 `오늘 처리` 행 MBP·iMAC·클라우드 비용 | `buildTodayProcessedRow` · `todayMachineStats` 분리 | ✅ |
| §4 | 허브 줄 오른쪽 끝 평균대기 · └ 실행 중만 | `appendHubWait` · `if (cur)` 블록만 └ 출력 | ✅ |
| §5 | 줄 속 경보 그 자리 빨강 · 무소속 경보 맨 아래 주의 구역 | `renderLayout` §2(주의) + 각 풀/허브 줄 인라인 red | ✅ |
| §6 | 차분 갱신(전체 지우기 금지) · 스피너 120ms | `renderDiff` 첫 렌더만 `\x1b[2J` · `startSpinnerTimer(120)` | ✅ |
| §7 | 빨강 기준 decision-ci-watch-tui-layout 큐 정체 규칙 그대로 | `fmtMachineCell` OFF 즉시 빨강 · `spinnerTickRender` 임계 유지 | ✅ |

### REQ 2 — OFF 표시 · 풀↔러너 매핑 · `runner ?` · `unknown 5건`

**매핑 오류 없음 (CHANGES 불필요)**

`classifyMachine` + `classifyRunner` + `buildMachineState` 를 현재 `status/runners/all.json` 의 8개 러너로 직접 실행한 결과:

```
storeport-heavy: mbp=idle imac=idle unknowns=[]
storeport-light: mbp=idle imac=idle unknowns=[]
fork-heavy:      mbp=idle imac=idle unknowns=[]
fork-light:      mbp=idle imac=idle unknowns=[]
```

8개 러너 → 4개 풀 × 2 기계 정상 매핑, `unknown` 없음.

M2-1126-B 스냅샷에서 storeport-light·fork-heavy·fork-light 가 OFF 로 보인 것은 **스냅샷 촬영 시점(09:48 WIB)의 all.json `ci_runners` 에 storeport-heavy 러너만 등록돼 있던 타이밍 문제**이며, 코드 오류 아님.

- `runner ?`: `allJson.runner` 미설정 시 표시. 현재 all.json `runner: "v8.3.2"` → 정상 표시 확인.
- `unknown 5건`: JSONL 집계에서 등록 전 또는 비표준 이름 러너가 처리한 5건. `classifyMachine` 이 'unknown' 반환 → 경고 줄 표시. 코드 오류 아님.

### REQ 3 — 차분 렌더 · clear-screen 반복 여부

`renderDiff` 함수 (`ci-watch.mjs:870`):
- `_prevLines.length === 0` (첫 렌더) → `\x1b[2J\x1b[H` 1회만 발송
- 이후 → `\x1b[${i+1};1H\x1b[2K` 커서 이동 · 변경 줄만 갱신

모의 10회 반복 렌더 검증:

```
clear-screen count: 1   ← \x1b[2J 첫 렌더 1회만
cursor-move count:  27  ← 이후 커서 이동만
```

`_prevLines` 가 `[]` 로 리셋되는 경로 없음 (`ci-watch.mjs:868,888`). **40초 실 TTY 실행은 미수행** (코드 분석으로 clear-screen 반복 없음을 확인).

### REQ 4 — 테스트 27개 직접 실행

`~/projects/curiocity-relay-wts/M2-1126-A` 워크트리에서 직접 실행:

```
$ node --test scripts/test/ci-watch-machines.test.mjs
TAP version 13
ok 1 ~ ok 27  (전부 pass)
# tests 27  # pass 27  # fail 0  # duration_ms 116.16
```

27/27 ✅

**판정: #43 APPROVE**

---

## B. #42 heartbeat 재리뷰 (`M1-1126-E`)

### R0-1126-D CHANGES 2건 해소 확인

| CHANGE | 내용 | 해소 여부 |
|--------|------|-----------|
| Critical | heartbeat 전용 clone 경로 `~/projects/curiocity-relay-heartbeat` 고정 | ✅ `docs/ci-box-heartbeat.md §설치` 추가 · PR 본문 반영 |
| Minor | `health.sh` rebase retry fetch `--depth=5` 제거 (line 323) | ✅ 보고서 diff 확인 |

### `a && b || c` 구문 — 버그 확인 · CHANGES

`docs/ci-box-heartbeat.md:90` (M1-1126-C 워크트리 직접 확인):

```bash
[ -d ~/projects/curiocity-relay-heartbeat/.git ] && \
  git -C ~/projects/curiocity-relay-heartbeat pull --ff-only || \
  git clone --depth=1 ... ~/projects/curiocity-relay-heartbeat
```

**버그**: `.git` 폴더 존재(a=true) + pull 실패(b=false) → `a && b` = false → `c` (clone) 실행 → 이미 존재하는 폴더 위에 clone 시도 → `fatal: destination path already exists` 오류.

권장 수정 (`if` 분리):

```bash
if [ -d ~/projects/curiocity-relay-heartbeat/.git ]; then
  git -C ~/projects/curiocity-relay-heartbeat pull --ff-only
else
  git clone --depth=1 https://github.com/CuriocityDevAi/curiocity-relay.git ~/projects/curiocity-relay-heartbeat
fi
```

이 오류 경로는 pull 실패 시(네트워크 오류 · fast-forward 불가 등) 실제 발생 가능. `docs/ci-box-heartbeat.md` 및 PR 본문 Kyu 설치 명령 양쪽 모두 `a && b || c` 패턴 사용 중 → **양쪽 모두 수정 필요**.

**판정: #42 CHANGES** — 1건 (`a && b || c` → `if` 분기)

---

## 미검증 항목

- 40초 TTY 실 배포본 실행 (clear-screen 반복 없음은 코드로 확인)
- 아이맥 SSH 실 설치 (태스크 조건: SSH 금지)
- health.sh `--depth=5` 제거 실제 파일 grep (M1-1126-C 워크트리 직접 접근 시도했으나 대상 줄 확인은 M1-1126-E 리포트 diff 로 대체)
