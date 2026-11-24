PASS

# M1-1124-P — ci-watch v2.0 9칸 파이프라인 칸반 (MVP)

- 설계 정본 채택: `m2/M2-1124-R-report.md` (Q1·Q2 권장안 그대로).
- 러너/루트 파일 미수정. 새 파일만 추가 + `scripts/hub-runner-install.sh` 에 `--v2` 분기 + v2 심링크 코드 2 블록 추가.
- v1.4 는 그대로 — `ci-watch.sh --v2` 로 분기.
- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/28
- 브랜치: `feat/M1-1124-P-ci-watch-v2`
- 워크트리: `/Users/kyu.lee/projects/curiocity-relay-wts/M1-1124-P`

## 아침 실행 명령 (Kyu 맥)

```bash
~/.hub-runner/bin/ci-watch.sh --v2
```

PR 머지 후 ci-watch-v2 심링크가 없으면 한 번만:

```bash
~/projects/curiocity-relay/scripts/hub-runner-install.sh
```

## 추가/수정 파일

| 파일 | 역할 | 라인 |
|---|---|---|
| `scripts/watch/thresholds.mjs` | 색 임계·숨김·성공률 재계산 | 85 |
| `scripts/watch/sources-local.mjs` | 로컬 데이터 수집기 (GitHub 호출 無) | 196 |
| `scripts/watch/pipeline-view.mjs` | 9칸 융합 로직 (오늘/어제 ID 범위) | 247 |
| `scripts/watch/render-v2.mjs` | 가로 5+4 · 세로 쌓기 | 191 |
| `scripts/ci-watch-v2.mjs` | 진입점 · `q`/`Ctrl+C`/`r` · `--once` | 125 |
| `scripts/test/ci-watch-v2.test.mjs` | 단위 테스트 25 cases | 206 |
| `scripts/hub-runner-install.sh` | `--v2` 분기 + v2 심링크 | +22 |
| `docs/ci-watch.md` | v2 사용법·출처표·임계 | 99 (신규) |

## 테스트 로그

```
# tests 25
# suites 0
# pass 25
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

커버:
- 색 임계 (`classifyAge`): 큐 2/5분 · hub 28/40분 · threshold 오버라이드
- 머지 10분 숨김 (`shouldHideAfterMerge`)
- 성공률 재계산 (`recomputeSuccessRate`) — 취소·건너뜀 제외, 실패 건수 병기
- 날짜 코드 (`getIdDateCodes` / `inRecentCodes`) — 오래된 ID 제외
- 9칸 융합 (`buildPipelineView`) — queue · claim → hub · PR URL → pr → ci_result · ci_pending 예측 · merged 숨김 · r0 review mtime 2h
- 렌더 (`renderV2`) — 가로/세로/노·빨 이유 줄

전체 로그: `~/.hub-runner/reports/m1/M1-1124-P/screenshots/test-log.txt`

## 화면 캡처 (실제 relay 데이터 · 23:10 WIB)

파일: `~/.hub-runner/reports/m1/M1-1124-P/screenshots/{wide-100,narrow-55}.txt` (ANSI 포함)

### 평상시 가로 100자

```
ci-watch v2.0.0-mvp  11/24/2026 23:10:07  ■ 경보 5건  | 작업 8건  완료(오늘) 0                    [q]종료 [r]새로고침
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ 큐(0) ]            [ 허브작업(1) ]         [ 리포트(1) ]          [ PR(0) ]           [ CI대기(1) ]
┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐
│                │  │●M1-1124-P              │  │▲R0-1124-AI             │  │                │  │●M3-1124-O                 │
│  (비어있음)    │  │ M1-1124-P (M1-1…│  │ R0-1124-AI · PR…│  │  (비어있음)    │  │ M3-1124-O — Check…│
│                │  │ [m1]  12분 ●           │  │ [r0]  4분 ▲            │  │                │  │ [m3]  4분 ●               │
                                        │ 리포트 체류 4분               │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘  └──────────────────┘

[ CI실행(0) ]              [ CI결과(0) ]              [ 리뷰(5) ]                [ 머지(0) ]
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  ┌───────────────────────┐
│                     │  │                     │  │■M0-1124-J                    │  │                       │
│  (비어있음)        │  │  (비어있음)        │  │ M0-1124-J — POS Sett…│  │  (비어있음)           │
│                     │  │                     │  │ [m0]  93분 ■              │  │                       │
                                                  │ 리뷰 대기 93분
                                                  │■M0-1124-K
                                                  │ M0-1124-K · PR #421 …
                                                  │ [m0]  74분 ■
                                                  │ 리뷰 대기 74분
                                                  │■M3-1124-M
                                                  │ M3-1124-M 리포트 — draf…
                                                  │ [m3]  72분 ■
                                                  │ 리뷰 대기 72분
                                                  │■M3-1124-L
                                                  │ M3-1124-L 리포트 — 결제 성…
                                                  │ [m3]  69분 ■
                                                  │ 리뷰 대기 69분
                                                  │●M1-1124-N
                                                  │ ## 요약
                                                  │ [m1]  4분 ●
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘  └───────────────────────┘
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▲ R0-1124-AI  리포트 4분 · 리포트 체류 4분
■ M3-1124-L  리뷰 69분 · 리뷰 대기 69분
■ M0-1124-J  리뷰 93분 · 리뷰 대기 93분
■ M0-1124-K  리뷰 74분 · 리뷰 대기 74분
■ M3-1124-M  리뷰 72분 · 리뷰 대기 72분
  로컬 3초 · GH 호출 0/12 (최근 0분) · q 종료 · r 새로고침
```

### 폭 좁은 터미널 (55자 · 세로 쌓기)

```
ci-watch v2.0.0-mvp  11/24/2026 23:10:07  ■ 경보 5건  | 작업 8건  완료(오늘) 0
───────────────────────────────────────────────────────
큐(0)  --
허브작업(1)
  ●M1-1124-P  M1-1124-P (M1-1124-O 다음 차례)  12분
리포트(1)
  ▲R0-1124-AI  R0-1124-AI · PR #27 리뷰 · runne…  4분
      ▲리포트 체류 4분
PR(0)  --
CI대기(1)
  ●M3-1124-O  M3-1124-O — Checkout B안 · tende…  4분
CI실행(0)  --
CI결과(0)  --
리뷰(5)
  ■M0-1124-J  M0-1124-J — POS Settings "Recei…  93분
      ■리뷰 대기 93분
  ■M0-1124-K  M0-1124-K · PR #421 R0-1124-AC …  74분
      ■리뷰 대기 74분
  ■M3-1124-M  M3-1124-M 리포트 — draft 생성 시 meta…  72분
      ■리뷰 대기 72분
  ■M3-1124-L  M3-1124-L 리포트 — 결제 성공 화면 custom…  69분
      ■리뷰 대기 69분
  ●M1-1124-N  ## 요약  4분
머지(0)  --
───────────────────────────────────────────────────────
▲ R0-1124-AI  리포트 4분 · 리포트 체류 4분
■ M3-1124-L  리뷰 69분 · 리뷰 대기 69분
■ M0-1124-J  리뷰 93분 · 리뷰 대기 93분
■ M0-1124-K  리뷰 74분 · 리뷰 대기 74분
■ M3-1124-M  리뷰 72분 · 리뷰 대기 72분
```

## q / Ctrl+C 종료 확인

- SIGINT 로 외부에서 종료 시 exit 0 (커서 복원 포함). `node … &; sleep 1.5; kill -INT $PID` 로 검증.
- `q` 키 핸들러도 `cleanupTerminal` 후 `process.exit(0)` — TTY stdin 에서만 raw mode 사용.

## 로컬 확정 vs 예측 (오늘 23:10 기준)

- 로컬 확정 7건 (허브작업 1 · 리포트 1 · CI대기 1(쿼리 無) · 리뷰 4건 등)
- 로컬 예측 1건 (`M3-1124-O` 의 CI대기)
- GitHub 호출 0회 — 이번 라운드는 로컬만.

## 기술 선택지 (권장안 그대로)

1. **새 파일 분리 유지** — v1.4 와 공존. 기본값은 당분간 v1.4, Kyu 가 v2 를 마음에 들어 하면 `ci-watch.sh` 기본값을 `--v2` 로 전환.
2. **GitHub 호출 예산 1h 12회** — R9 에서 실제 호출을 붙일 때 그대로 사용.
3. **R8 전 MVP 어댑터** — `status/pipeline/<ID>.jsonl` 파일 없으면 자연스레 빈 배열. R8 랜딩 후 자동으로 이벤트 사용 (merged 숨김 포함).

## 미실행 / 미검증

- GitHub 조회 경로(이상 감지 트리거) 는 MVP 범위 밖. 예산 표시만 해 두었고 실제 호출은 R9/R10 에서.
- 터미널 raw stdin 의 `q` 키 테스트는 자동화 안 함 (TTY 가 아닌 환경에서 안전하게 fallback) — 수동 확인 필요.
- `~/.hub-runner/bin/ci-watch-v2.mjs` 심링크 최초 배포는 `scripts/hub-runner-install.sh` 재실행이 필요. 이미 배포돼 있으면 자동 업데이트.

## 남은 작업 (R9/R10 — 다른 프롬프트)

- R8: `runner/src/pipeline-log.ts` (`status/pipeline/<ID>.jsonl` 이벤트 기록) — 이 파일이 생겨야 머지 이벤트가 자동 들어옴.
- R9: `scripts/watch/pipeline-joiner.mjs` + `gh-runs.mjs` — head_sha 매칭 기반 CI 결합 + 이상 감지 조회.
- R10: 추측 로직 제거 + v1.4 기본을 v2 로 교체.
