# M1-1124-F — v8 계획서 §8 제안 G(파이프라인 기록 + 9칸 화면) 보강

**판정: PASS** — relay PR #18 브랜치 `docs/M1-1124-E-runner-v8-plan` 에 §8 제안 G 추가 + 라운드 분할표/커버리지 매트릭스/Kyu 결정표 갱신. docs-only, 코드 변경 없음.

- 변경 파일: `docs/plans/runner-v8-isolation.md` (+124 / −26)
- 커밋: `1e626d3b4 docs(plan): M1-1124-F — v8 계획서 §8 제안 G(파이프라인 기록+9칸 화면) 추가 + 라운드 분할표 갱신`
- push: `origin docs/M1-1124-E-runner-v8-plan` (d33de13a0 → 1e626d3b4)
- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/18
- 작업 위치: `/Users/kyu.lee/projects/relay-M1-1124-F` (별도 worktree, `~/projects/curiocity-relay` 브랜치 변경 없음)

## 1. 추가된 §8 제안 G 요약

- **이벤트 기록** `status/pipeline/<ID>.jsonl` (append-only): `queued`·`claimed`·`session_start`·`session_end`·`report_uploaded`·`artifact`(repo/branch/head_sha/pr_number — **러너가 git/gh 로 결정적 수집, 브랜치명 추측 금지**)·CI 수집기의 `ci_pending`·`ci_running`(러너 이름)·`ci_result`(실패 job + ⏭ 건너뜀)·`review_start`·`review_done`·`merged`.
- **9칸 표**: 큐 → 허브작업 → 리포트 → PR → CI대기 → CI실행 → CI결과 → 리뷰 → 머지. 허브별 묶음, 큐 칸에 `⏳ 1번째 (I 뒤)`, 머지 10분 후 숨김 + 오늘 완료 N.
- **색 = 현 위치만**: 녹●/노▲/빨■ **+ 기호 병기**(색맹·단색 터미널). 노·빨 줄 끝에 이유 문구.
- **예상치 로직**: 큐 2분/5분, 허브작업 상한×70% / 초과, 리포트 2분/5분, CI대기 오늘 평균×3 / 10분, CI실행 p90 / p90×2, 리뷰 상한×70% / 초과, 머지 10분/20분. 이력 `status/pipeline/history.json` 롤링 7일. 샘플 3건 미만 기본값.
- **ci-watch 관계**: 상단 요약 줄 유지 + 그 아래 9칸 표. 추측 로직 제거 순서 = 브랜치명→ID → 미착지 추정. **ci-watch dist 를 §5 D self-update 범위에 포함**(오늘 발생한 "맥에 옛 ci-watch 파일 남음" 해결).
- **파일 주인 분리**: 러너 = `pipeline-log.ts`/`postmortem.ts`/`relay-client.ts`, ci-watch = `pipeline-joiner.ts`/`pipeline-view.ts`/`thresholds.ts`/`summary.ts`.

## 2. 갱신된 라운드 분할표 (전체)

| 라운드 | 내용 | 파일 겹침 | 소요 | 혼재 안전 |
| --- | --- | --- | --- | --- |
| R1 | **A** — REPORT_PATH prefix + export + shim | runner/scripts, prompts | 30분 | 구 러너는 그냥 레포 경로 씀(변화 없음) |
| R2 | **B(1단계)** — `~/.hub-runner/relay` clone + heartbeat 전환 | runner/src/{heartbeat,relay-client}, bootstrap | 45분 | heartbeat 가 러너 clone 으로 이동 → 구 허브는 그대로 |
| R3 | **B(2단계)** — claim/report upload 도 러너 clone 사용 | runner/src/report-upload | 30분 | A 의 shim 은 유지 |
| R4 | **C** — worktree dispatch for relay repo | runner/src/{session-dispatch,worktree-manager} | 45분 | pos 는 변화 없음 |
| R5 | **E(1단계)** — stray + queue-path 복구 enable (관찰) | runner/src/recovery/{stray,queue-path} | 30분 | 감지만, 조치 off |
| R6 | **E(2단계)** — drift + divergence 복구 enable | runner/src/recovery/{drift,divergence} | 30분 | 1일 관찰 후 |
| R7 | **E(3단계)** — no-report + ci-busy 복구 | runner/src/recovery/{no-report,ci-busy} | 45분 | 조치 enable |
| **R8** | **G(1단계)** — 러너 pipeline-log + postmortem(이벤트만 쌓음) | runner/src/{pipeline-log,postmortem,relay-client} | 45분 | 화면 변화 없음, 로그만 적립 |
| **R9** | **G(2단계)** — CI 수집기 pipeline-joiner(head sha 매칭) | ci-watch/src/{pipeline-joiner,gh-runs} | 45분 | ci_* 이벤트가 jsonl 에 붙기 시작, 화면은 아직 레거시 |
| **R10** | **G(3단계)** — pipeline-view + thresholds + 추측 로직 제거 | ci-watch/src/{pipeline-view,thresholds,summary} | 60분 | 상단 요약 줄 유지, 9칸 표를 그 아래 추가 |
| R11 | **D** — launchd KeepAlive + self-update (**ci-watch dist 포함**) | launchd/*.plist, runner/src/{self-update,health} | 45분 | Kyu 1회 수동 설치 |
| R12 | **F-ⓐ** — 아이맥 CI 러너 등록 | scripts/ci-runner-register.sh, launchd | 45분 | 아이맥 1회 셋업 |
| R13 | **F-ⓑ** — scheduler swap 가드 | runner/src/scheduler | 30분 | — |
| R14 | A 의 shim 제거 (적중 100% 확인 후) | prompts, runner/src/report-upload | 30분 | — |

**핵심 변화**:
- G 는 R8~R10 으로 삽입 — **A~E 이후** 순서(요구대로), 러너와 ci-watch **주인 분리로 병렬 착수 가능**(R9 는 R8 이벤트 포맷 확정 뒤 시작).
- D(launchd)·F(CI 분리)·shim 제거는 R11~R14 로 shift. 기존 R8 → R11, R9 → R12, R10 → R13, R11 → R14.
- R11 은 유일한 Kyu 손작업(1회 plist). **ci-watch dist 를 self-update 범위에 포함** → 맥 버전 drift 영구 종결.

## 3. Kyu 결정 필요 항목

G 는 **별도 승인 불요**(로그 적립·화면 추가는 기존 ci-watch 하단에 비파괴로 붙음). 단 아래 2건은 타당성 검토 부탁:

1. **§8.4 예상치 로직 숫자** — 특히 (a) 큐 2분/5분 노·빨, (b) CI대기 "오늘 평균×3 / 10분" 중 더 큰 값 적용 vs 더 작은 값, (c) 샘플 3건 미만 기본값(허브작업 상한 100%/120%, CI 5분/10분, 리포트 3분/5분). 운영 감각으로 바로잡을 수치 있는지.
2. **pipeline.jsonl 파일 단위 선택** — 프롬프트당 1파일(초안) vs 단일 파일. git 충돌 최소화 측면에선 파일당이 유리하나, status/ 디렉토리 파일 수 증가(하루 수십 개). 보관 정책(머지 14일 뒤 archive) 같이 검토 필요.

기존 §12(이전 §11) Kyu 결정 3개는 그대로 유효:
1. A+B+C 격리 전체 승인?
2. F-ⓐ 아이맥 CI 전용 전환?
3. D(launchd KeepAlive)? — **G 의 ci-watch 자동 전환이 이 승인에 묶임**(거부 시 ci-watch drift 수동 처리 유지).

## 4. 범위 밖 / 메모

- `~/projects/curiocity-relay` 는 손대지 않음(기존 pending 삭제 3건은 그대로 두었음 — 본 태스크 범위 아님).
- 계획서 §1~§7·§10~§13 본문은 변경 없음. §8 신설·§9~§13 번호만 shift.
- 커버리지 매트릭스에 "(부가) ci-watch 버전 drift" 행과 "G 가시화" 열 추가.
