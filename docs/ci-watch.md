# ci-watch

`ci-watch.mjs` 는 runner/CI 상태를 터미널에 띄우는 감시 화면이다. 러너나 git 에는 쓰지 않는다 — 전부 **로컬 읽기**이고 GitHub 호출은 최소한만 한다.

v1.6 이 지금 기본값. v2.0 은 `--v2` 플래그로 띄우는 9칸 파이프라인 칸반 화면.

---

## 실행

```bash
~/.hub-runner/bin/ci-watch.sh            # 기본 (v1.5)
~/.hub-runner/bin/ci-watch.sh --v2       # v2.0 · 9칸 칸반
```

- 끄기: `q` · `Ctrl+C` · 다른 터미널 `ci-watch.sh stop`
- 수동 갱신: `r`
- 자가 재기동: `ci-watch.sh` 래퍼가 하위 프로세스 비정상 종료 시 2 초 뒤 재기동 (60 초에 5 회 초과하면 중단)
- 자가 업데이트: 배포본(`~/.hub-runner/bin/`) 에서 심링크 원본 파일이 바뀌면 `exit(0)` → 래퍼가 재기동
- **exit(0) 루프 방지** (M1-1126-A): exit(0) 도 비정상 종료와 같이 60초 내 5회 카운트 — 초과 시 "자가 업데이트 재기동이 60초에 5회 넘음 · 중단" 출력

---

## v2.0 — 9칸 파이프라인 칸반 (M1-1124-P)

설계 정본: `m2/M2-1124-R-report.md`.

### 9칸 순서

```
큐 → 허브작업 → 리포트 → PR → CI대기 → CI실행 → CI결과 → 리뷰 → 머지
```

각 프롬프트 ID 는 "가장 진전된" 1칸에만 들어간다. 머지 완료 후 10 분이 지나면 숨겨지고 상단 "완료(오늘) N" 카운터만 갱신된다.

### 데이터 출처 (로컬 우선)

| 칸 | 로컬 출처 | 예측 가능 여부 |
|---|---|---|
| 큐 | `queue/<hub>/<ID>.md` + `status/claims/<ID>.json` | 로컬 확정 |
| 허브작업 | `status/runners/all.json .hubs.<hub>.current` | 로컬 확정 |
| 리포트 | `~/.hub-runner/reports/<hub>/<ID>/report.md` 또는 `<repo>/<hub>/<ID>-report.md` (mtime < 20 분) | 로컬 확정 |
| PR | 리포트 본문의 PR URL (`https://github.com/.../pull/N`) | 로컬 확정 |
| CI대기 | PR URL 있고 `status/ci/<date>.jsonl` 매칭 無 | 로컬 예측 (`predicted=true`) |
| CI실행 | `status/ci/<date>.jsonl` 의 `started_at`·`completed_at` 미설정 | 로컬 확정 |
| CI결과 | `status/ci/<date>.jsonl` 의 `completed_at < 15 분` | 로컬 확정 |
| 리뷰 | `r0/R0-*-report.md` mtime < 2h · 본문에서 대상 ID 추출 | 로컬 확정 |
| 머지 | `status/pipeline/<ID>.jsonl` 의 `merged` 이벤트 (R8 이후 생성) | 로컬 확정 |

> **범위 제한**: ID 의 MMDD 날짜 코드가 "오늘/어제" 가 아니면 칸반에서 제외. 예전 리포트 적체 방지.

### 색 임계 · 상태 심볼

- 녹 `●` : 정상
- 노 `▲` : 느림 (임계 ≥ 노)
- 빨 `■` : 비정상 (임계 ≥ 빨)

| 칸 | 노▲ 임계분 | 빨■ 임계분 |
|---|---|---|
| 큐 | 2 | 5 |
| 허브작업 | 28 | 40 (프롬프트 상한×70%/100% — 상한이 다르면 조정) |
| 리포트 | 3 | 5 |
| PR | 10 | 15 |
| CI대기 | 5 | 10 |
| CI실행 | 10 | 20 |
| CI결과 | 5 | 10 |
| 리뷰 | 28 | 40 |
| 머지 | 10 | 20 |

### GitHub 호출 예산

이번 라운드(M1-1124-P)는 **로컬 전용** · GitHub 조회 호출은 하지 않는다. 호출 예산 표시줄은 이상 감지가 트리거 됐을 때를 대비해 만들어 두었다 (`0/12 (최근 N분)`).

이상 감지 목록 (하단 상태 줄에 anomaly 로 쌓임):
- 각 칸이 빨 임계 넘김 (`<column>_overdue`)
- `ci_pending` 5 분 초과 (`ci_missing_start`)

### 터미널 폭 분기

- `cols ≥ 60` : 가로 레이아웃 (5열 + 4열)
- `cols < 60` : 세로 쌓기

### Kyu 22:50 반영 (M1-1124-P §4)

- BUSY 는 "무엇인지" 항상 표시 (허브작업 카드에 ID + 제목 함께). 모르면 "무엇인지 아직 모름" 로 표기.
- 대기 0 건 줄은 숨김 (empty column 자체는 `(비어있음)` placeholder).
- 성공률은 "취소·건너뜀 제외" + 실패 건수 병기 (`recomputeSuccessRate`).
- "마지막 완료 CI" 는 이상일 때만 경보 (v2 에서는 ci_result 칸으로 이동).

### v1.4 유지/버린 항목 (M2-1124-R §6)

유지: 버전 표시 · `r`/`q` 키 · 3 초 로컬 갱신 · 클라우드 한도 · err_tail 허용 목록 · rate_limit 모니터링 · 허브 대기 큐.

버림: GitHub 30 초 주기 조회 → 이상 감지 트리거 · 브랜치명에서 ID 추측 → pipeline.jsonl 이벤트 (R8 이후) · prPromptCache.

---

---

## v1.6 — 기계 3칸(MBP·iMAC·클라우드) · 평균대기 · 차분 갱신 (M2-1126-A)

### 기계 칼럼 레이아웃

CI 큐 섹션의 각 풀 행 아래에 항상 `└` 서브행이 표시된다. 서브행에는 3개 고정폭 칼럼이 있다:

```
─ CI 큐 (SH N · SL N · FH N · FL N) ───────────  MBP M1    iMAC M1   클라우드
  storeport-heavy  [chip1 3분][chip2 13분]  avg2.1분
    └                                             ⠹M0-K 5분  쉼         +2
  storeport-light  —
    └                                             쉼          쉼         쉼
```

| 셀 내용 | 의미 |
|---|---|
| `⠹ <ID> <N>분` | 해당 기계에서 실행 중 (스피너 + promptId + 경과분) |
| `쉼` | 온라인 · 대기 중 (idle) |
| `OFF` (빨간색) | 오프라인 |
| `+N` | 클라우드에서 N개 잡 실행 중 |

칼럼 타이틀(`MBP M1  iMAC M1  클라우드`)은 CI 섹션 헤더 줄 오른쪽에 1회만 표시된다.

### Runner name 분류 규칙

| 패턴 | 기계 종류 |
|---|---|
| `ci-box-*-imac` | iMAC M1 |
| `curiocity-mac-*` or `Youngkyus-MacBook*` | MBP M1 |
| `GitHub Actions *`, `ubuntu-*`, `windows-*`, `macos-*` | 클라우드 |
| 그 외 self-hosted | unknown → 하단 ⚠ 경고 |

### 좁은 화면 모드 (W < 100)

터미널 폭이 100칸 미만이면 **narrow mode** 가 활성화된다:

- `└` 서브행에 MBP M1 + iMAC M1 칼럼만 표시 (클라우드 칼럼 생략)
- CI 섹션 헤더 괄호 안에 `+N클라우드` 로 클라우드 대기 수 표시
- 헤더 오른쪽 칼럼 타이틀: `MBP M1  iMAC M1` (클라우드 없음)

### 차분 렌더 (REQ 6)

첫 렌더에서만 `\x1b[2J\x1b[H]` 로 전체 클리어, 이후 갱신은 변경된 줄만 커서 이동으로 갱신한다. 스피너는 별도 120ms 타이머로만 업데이트해 3초 데이터 갱신과 독립적으로 동작한다.

### 오늘 처리 행

CI 섹션 하단에 오늘 처리 통계 행이 표시된다:

```
오늘 처리: MAC N건 avgX.Xmin · 클라우드 N건 avgXmin $X.XX
```

`allJson.ci.data.today` 의 `mac-heavy` + `mac-light` 를 합산해 MAC 처리량으로 표시.

### 버전 이력

| 버전 | 티켓 | 주요 변경 |
|---|---|---|
| 1.0 | M1-1123-K | 최초 |
| 1.1 | M2-1124-A | err_tail 허용 목록 |
| 1.2 | M2-1124-C~F | BUSY 잡 상세 · 허브 큐 |
| 1.3 | M2-1124-H+I | 카운트다운 · 버전 표시 |
| 1.4 | M2-1124-K | 큐 diff 알림 |
| 1.5 | M2-1125-S | 스피너 · 오늘 통계 |
| 1.6 | M2-1126-A | 기계 3칸(MBP·iMAC·클라우드) · 평균대기 · 차분 갱신 |
| **v1.7** | M2-1126-B | CI 풀 행·허브 행 오른쪽 끝 `대기avgXm` · 오늘 처리 MBP/iMAC 분리 · ID 잘림 수정 (MCOL_W 12→14 · `m` 단위) |

---

## 배포

`scripts/hub-runner-install.sh` 가 다음을 심링크로 깐다:

- `~/.hub-runner/bin/ci-watch.mjs` → `<repo>/scripts/ci-watch.mjs`
- `~/.hub-runner/bin/ci-watch-v2.mjs` → `<repo>/scripts/ci-watch-v2.mjs`
- `~/.hub-runner/bin/ci-watch.sh`     — 래퍼 (이 안에 `--v2` 분기)

PR 머지 후 Kyu 맥에서 추가 설치 단계 없이 `ci-watch.sh --v2` 로 뜬다. 다만 배포본은 심링크이므로 **최초 1회** `~/.hub-runner/bin/` 에 `ci-watch-v2.mjs` 심링크가 있어야 한다. 심링크가 없다면:

```bash
~/projects/curiocity-relay/scripts/hub-runner-install.sh
```

실행하면 양쪽(v1.4 + v2.0) 심링크가 정렬되고 래퍼 스크립트도 새로 깔린다.
