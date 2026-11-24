# 러너 v8 — 격리 구조 (오케 초안)

- 작성: 2026-11-24 (M1-1124-E · 계획서, 구현 금지)
- 상위 지시: Kyu 2026-11-24 13:35 "좀더 근본적인 방법은 없을까? 너무 손이 많이가.."
- 검토 대상 사고: 오늘(11-24) 하루 6건 — 공통 뿌리 = 러너와 허브가 `~/projects/curiocity-relay` 라는 **한 git 작업 트리를 공유**
- 모델: Opus · 상한 45분

## 0. 오늘 사고 6건 요약

| # | 증상 | 뿌리 |
| --- | --- | --- |
| ① | M2 가 러너 폴더(main) 브랜치 변경 → 러너 37분 정지 | 허브 세션이 러너와 **같은 폴더**에서 `checkout` |
| ② | 러너 heartbeat 가 허브 작업 중 파일을 main 에 커밋 | 러너가 **허브 작업 트리**에 `git add -A` |
| ③ | 리포트가 `queue/` 아래 생성(다수) | 프롬프트가 레포 폴더 안에 열려 **모델이 queue 옆에 기록** |
| ④ | 리포트 미push → 'runner-folder change pending Kyu install' 반복 | 러너 자체가 **main dirty** 로 이어져 자가 복구 못 함 |
| ⑤ | R0 가 리포트를 fork 리포에 push → 러너 37분 대기 | 세션의 CWD 가 **포크 작업 트리**였기 때문 |
| ⑥ | 로컬 main 이 origin 과 갈라져 ff 불가 | ② + ④ 가 누적된 결과 |

> **한 줄 결론**: 러너·허브·사람이 같은 git 폴더를 **각자 다른 전제**로 쓴다. 폴더가 1개면 충돌은 시간 문제. v8 은 폴더를 셋으로 나눈다.

## 1. v8 목표

1. 허브(모델 세션)는 **relay git 을 전혀 안 만진다**. 리포트 경로는 레포 밖 고정 경로.
2. 러너는 **자기 전용 clone** 에서 큐 읽기·claim·리포트 업로드만 한다. 사람과 공유하지 않는다.
3. relay 코드 작업은 **ephemeral worktree** 로 들어간다. main 체크아웃은 러너·사람 쪽 작업 트리를 건드리지 않는다.
4. 알려진 막힘(미업로드·브랜치 이탈·갈라짐·리포트 없음)은 러너가 **스스로 복구**. 사람 호출은 자동 복구가 실패한 경우만.
5. 러너 자가 업데이트 — 모든 허브 idle 인 순간 재시작. 'Kyu install pending' 상태 제거.

## 2. 제안 A — 허브는 relay git 을 안 만짐 (REPORT_PATH 격리)

**아이디어**: 러너가 프롬프트 실행 시 아래를 자동 삽입·주입한다.

```
REPORT_PATH=~/.hub-runner/<hub>/<ID>/report.md
```

- 프롬프트 앞에 자동 prefix: "리포트는 **$REPORT_PATH 에만** 쓸 것. relay/pos 레포 안에 쓰지 말 것. git 명령 금지(claim/heartbeat 제외는 러너가 담당)."
- 세션 종료 후 러너가 결정적 코드로 `~/.hub-runner/<hub>/<ID>/report.md` 를 읽어 `m1/M1-1124-E-report.md` 로 **옮겨서 commit + push**.

**막는 사고**: ②(허브가 main 커밋), ③(오경로), ⑤(fork 리포 push).
**바뀔 파일**:
- `runner/scripts/session-start.sh` — REPORT_PATH env export, prompt prefix 삽입
- `runner/src/report-upload.ts` (신규) — 세션 종료 후 report 를 relay 로 옮겨 커밋
- `queue/*/*.md` 템플릿 — [REPORT] 블록이 `$REPORT_PATH` 참조로 통일
- `prompts/*` — "레포 내 리포트 금지" 가드 문구

**마이그레이션 순서**:
1. 러너는 REPORT_PATH 를 **export 하되**, 모델이 경로를 못 따르면 레거시 경로(`<repo>/m1/<ID>-report.md`)도 **읽어 복사**하는 shim 유지.
2. 2일 뒤 shim 제거 — 그 사이 하루 분량 run 을 보고 100% 적중 확인.

**Kyu 손작업**: 0(설치 1회로 끝).

**대안·반론**:
- (a) "허브가 끝나고 스스로 push 하게 두되 레포 가드만 추가" → 모델이 가드를 돌아가는 경우 반복(오늘 ③). 기각.
- (b) "허브 CWD 를 `/tmp` 로 고정" → relay 코드 수정 작업 시 레포 CWD 가 필요 → 제안 C 로 보완 필요. A 단독으로는 안 됨.

## 3. 제안 B — 러너 전용 relay clone

**아이디어**: 러너는 `~/.hub-runner/relay` 라는 **러너만 쓰는 clone** 에서 큐 polling, claim commit, heartbeat, 리포트 업로드를 수행한다. 사람·허브가 쓰는 `~/projects/curiocity-relay` 와 완전 분리.

- 러너 폴더는 **상시 clean 유지** — 매 틱 시작 시 `git fetch origin main && git reset --hard origin/main` (로컬 변경이 존재할 수 없으므로 갈라짐·ff 실패 **구조적으로 불가능**).
- claim/heartbeat 커밋은 `runner-status` 브랜치를 쓰거나(이미 `~/.hub-runner/status-wt` 존재), main 에 쓸 때는 `fetch → cherry-pick → push → reset` 의 짧은 critical section.
- 러너 폴더에서 **코드 변경 금지** — report 파일만 add 가능하도록 pre-commit 훅.

**막는 사고**: ①②④⑤⑥ **(5건)**.
**바뀔 파일**:
- `runner/scripts/bootstrap.sh` — 러너 clone 초기화
- `runner/src/relay-client.ts` (신규) — relay 상대 모든 git op 의 유일한 진입점
- `runner/src/heartbeat.ts` — CWD 를 `~/.hub-runner/relay` 로 변경
- `runner/scripts/install-runner.sh` — 기존 러너에서 신규 clone 생성 + 상태 마이그레이션
- `.git/hooks/pre-commit` (러너 clone 안) — 비-report 파일 커밋 차단

**마이그레이션 순서**:
1. 러너 bootstrap 이 `~/.hub-runner/relay` 존재 확인 → 없으면 clone.
2. 신규 러너는 **먼저 신규 clone 에서 polling** 시도, 실패 시 레거시 폴더로 fallback. 1일 fallback 유지.
3. heartbeat 는 **신규 clone 에서만** 쓰도록 즉시 전환. (이게 ②의 뿌리)
4. 사람·허브 폴더는 그대로 → 사람이 쓰는 경험 변화 없음.

**Kyu 손작업**: 0(설치 1회, 러너 재시작).

**대안·반론**:
- (a) "지금 폴더에서 lockfile 로 직렬화" → ①은 블록 가능, ②③④⑤⑥ 는 여전히 발생. 기각.
- (b) "git worktree 로만 분리" → worktree 들이 **같은 .git 을 공유**해 인덱스 경쟁 발생. 러너는 완전 별도 .git 이 더 안전. 채택.

## 4. 제안 C — relay 코드 작업은 러너가 worktree 자동 생성

**아이디어**: 프롬프트의 리포가 `curiocity-relay` 이면 러너가 `~/.hub-runner/wt/<ID>` worktree 를 origin/main 기반 신규 브랜치로 만들어 **그 폴더를 CWD 로** 세션 시작. 끝나면 worktree 제거.

- 러너 clone(§3)이 base `.git` 이고, worktree 는 거기서 `git worktree add` 로 파생.
- 세션 종료 시 러너가 PR push → `git worktree remove` → prune.
- 중간 crash 시 러너 bootstrap 에서 24h 넘은 worktree 자동 prune.

**막는 사고**: ①(폴더 브랜치 변경), ⑤(fork 리포 push — relay 전용이므로 CWD 가 relay 외일 수 없음), ⑥(갈라짐 — main 체크아웃을 두 곳에서 하지 않음).
**바뀔 파일**:
- `runner/src/session-dispatch.ts` — repo 가 relay 면 worktree add
- `runner/src/worktree-manager.ts` (신규)
- `runner/scripts/prune-stale-worktrees.sh`

**마이그레이션 순서**:
1. 제안 B 가 선행 — base clone 이 있어야 함.
2. 신·구 러너 혼재 시, 구 러너가 쓰는 `~/projects/curiocity-relay` 와 신 러너의 `~/.hub-runner/wt/*` 는 **파일·브랜치 네임스페이스 분리** → 안전.

**Kyu 손작업**: 0.

**대안·반론**:
- (a) "허브 쪽에서 worktree 를 만든다" → 허브가 git 을 만지면 A·B 의 격리가 깨짐. 기각.
- (b) "모든 리포에 적용" → pos 레포는 이미 포크 worktree 체계가 있음. 중복이라 relay 에만 적용.

## 5. 제안 D — 러너 자가 업데이트 (launchd KeepAlive)

**아이디어**: 러너 스크립트가 main 에서 바뀌면 **모든 허브 idle 인 순간** 러너가 스스로 종료 → launchd KeepAlive 가 재기동 → 신 버전으로 복귀.

- 전제: 러너 바이너리/스크립트는 `~/.hub-runner/relay/runner/dist/*` 에서 로드 → §3 으로 보장.
- 업데이트 전 pre-flight: `node runner/dist/self-check.js` 성공 시에만 재시작. 실패 시 이전 버전 유지 + relay 에 `events/runner-selfupdate-blocked.md` 보고.
- 'Kyu install pending' 큐 사유 제거.

**막는 사고**: ④(반복 막힘).
**바뀔 파일**:
- `launchd/com.curiocity.hub-runner.plist` — KeepAlive true, ThrottleInterval 60s
- `runner/src/self-update.ts` (신규)
- `runner/src/health.ts` — all-hubs-idle 감지

**마이그레이션 순서**:
1. 설치는 Kyu 1회 수동 (`launchctl bootout` → 신 plist `launchctl load`).
2. 1회 설치 이후 모든 상위 러너 릴리스는 자가 전환.

**Kyu 손작업**: **1회**(plist 교체).

**대안·반론**:
- (a) "crontab 재시작" → cron 타이밍이 허브 busy 와 겹치면 세션 죽음. 기각.
- (b) "GitHub Actions 로 원격 재시작 트리거" → 로컬 가용성 의존. 백업 수단으로 추가 가능.

## 6. 제안 E — 자가 복구 표 (사람 호출 최소화)

러너가 상태 머신으로 다음을 처리한다. **모두 실패했을 때만** 사람 호출.

| 알려진 막힘 | 감지 신호 | 자동 조치 | 경보 조건 |
| --- | --- | --- | --- |
| 미업로드 stray 파일 | `~/.hub-runner/*/report.md` 가 10분 넘게 미이동 | `~/.hub-runner/stray/<ts>/` 로 옮기고 `events/runner-stray-<ts>.md` push | 3회/일 초과 시 relay 경보 |
| 러너 폴더 브랜치 이탈 | HEAD != main | `git fetch && git reset --hard origin/main`(§3 전제) | 10분 내 2회 발생 시 경보 |
| 로컬-origin 갈라짐 | `git status` 상 "diverged" | 백업 브랜치(`backup/local-main-<ts>`) 만들고 reset. 백업 커밋 중 report 파일만 cherry-pick 재시도 | 항상 relay 에 기록 |
| 세션 종료 + 리포트 없음 5분 | 세션 pid 종료 && `$REPORT_PATH` 없음 | claim 을 `blocked: no report` 로 닫고 다음 큐 진행 | relay 에 기록, 반복 ID 는 사람 호출 |
| 큐 오경로(옛 러너) | `queue/<ID>-report.md` 존재 | 올바른 경로로 이동 + commit | 항상 기록 |
| CI 러너 BUSY 15분 | `gh runs` BUSY | SIGTERM → 재기동 | 2회 연속 실패 시 경보 |

**막는 사고**: ②③④⑤⑥.
**바뀔 파일**:
- `runner/src/recovery/{stray,drift,divergence,no-report,queue-path,ci-busy}.ts`
- `runner/src/recovery/dispatch.ts` — 신호 → 조치 라우팅
- `events/recovery.schema.md` — 경보 포맷 표준

**마이그레이션 순서**:
1. 감지만 enable(조치 off) → 1일 관찰 → False positive 0 확인 후 조치 enable.
2. 유형 별 라운드 분리 가능 — stray → drift → divergence → no-report → queue-path → ci-busy.

**Kyu 손작업**: 0.

**대안·반론**: 각 조치를 별 스크립트가 아닌 shell one-liner 로 두는 안 → 상태 저장이 안 되어 반복 감지가 안 됨. 기각.

## 7. 제안 F — 메모리/CI 부하

**현상**: 16GB 중 15.9GB, 스왑 4GB 상시. 허브 5개 + CI 러너 4개가 한 기기.

| 선택지 | 비용 | 효과 | 권장 |
| --- | --- | --- | --- |
| ⓐ 아이맥(M1 8GB)을 CI 전용 러너로 | 0(이미 있음) | **상** — CI 러너 4개를 통째로 분리, 맥북 RAM 6~8GB 회복 | **1순위** |
| ⓑ 스왑 >3GB 면 새 허브 투입 자동 보류 | 낮음(러너 1 파일) | 중 — 사고는 줄이나 대기 시간 늘어남 | 2순위(ⓐ 보완) |
| ⓒ heavy CI(e2e·android) 는 클라우드 러너 우선 | $ (GH Actions 분당 과금) | 중 — 피크만 완화 | 3순위(필요 시) |

**권장 조합**: ⓐ + ⓑ. ⓒ 는 ⓐ 이후에도 스왑 상시면 도입.

**바뀔 파일**(ⓐ): `launchd/*.plist` 두 벌(맥북·아이맥용), `scripts/ci-runner-register.sh`.
**바뀔 파일**(ⓑ): `runner/src/scheduler.ts` — swap 임계 가드.

**Kyu 손작업**: ⓐ 는 아이맥 1회 셋업(gh-runner 등록). ⓑ 는 0.

## 8. 전체 마이그레이션 타임라인 (하루 내 안전 전환)

| 라운드 | 내용 | 파일 겹침 | 소요 | 혼재 안전 |
| --- | --- | --- | --- | --- |
| R1 | **A** — REPORT_PATH prefix + export + shim | runner/scripts, prompts | 30분 | 구 러너는 그냥 레포 경로 씀(변화 없음) |
| R2 | **B(1단계)** — `~/.hub-runner/relay` clone + heartbeat 전환 | runner/src/{heartbeat,relay-client}, bootstrap | 45분 | heartbeat 가 러너 clone 으로 이동 → 구 허브는 그대로 |
| R3 | **B(2단계)** — claim/report upload 도 러너 clone 사용 | runner/src/report-upload | 30분 | A 의 shim 은 유지 |
| R4 | **C** — worktree dispatch for relay repo | runner/src/{session-dispatch,worktree-manager} | 45분 | pos 는 변화 없음 |
| R5 | **E(1단계)** — stray + queue-path 복구 enable (관찰) | runner/src/recovery/{stray,queue-path} | 30분 | 감지만, 조치 off |
| R6 | **E(2단계)** — drift + divergence 복구 enable | runner/src/recovery/{drift,divergence} | 30분 | 1일 관찰 후 |
| R7 | **E(3단계)** — no-report + ci-busy 복구 | runner/src/recovery/{no-report,ci-busy} | 45분 | 조치 enable |
| R8 | **D** — launchd KeepAlive + self-update | launchd/*.plist, runner/src/{self-update,health} | 45분 | Kyu 1회 수동 설치 |
| R9 | **F-ⓐ** — 아이맥 CI 러너 등록 | scripts/ci-runner-register.sh, launchd | 45분 | 아이맥 1회 셋업 |
| R10 | **F-ⓑ** — scheduler swap 가드 | runner/src/scheduler | 30분 | — |
| R11 | A 의 shim 제거 (적중 100% 확인 후) | prompts, runner/src/report-upload | 30분 | — |

- R1~R4 는 **같은 날 순차**, 각 라운드 완료 시 러너 재시작 1회.
- R5~R7 은 하루 간격.
- R8 은 라운드 중 유일하게 Kyu 손작업 필요(plist).
- R9 는 아이맥 접근 가능할 때.

**혼재 안전 핵심**:
- 모든 라운드는 **feature flag**(`runner.config.json`) 로 on/off. 구 버전 러너가 플래그를 모르면 레거시 경로를 탄다.
- 러너 clone(§3)과 사용자 clone(`~/projects/curiocity-relay`) 은 **디스크 상 완전 별도** → 어떤 라운드도 사용자 작업을 깨지 않음.

## 9. 사고 번호별 커버리지 매트릭스

| 사고 | A | B | C | D | E | F |
| --- | --- | --- | --- | --- | --- | --- |
| ① 러너 폴더 브랜치 변경 | — | ✓ | ✓ | — | 드리프트 복구 | — |
| ② heartbeat 가 main 커밋 | ✓ | ✓ | — | — | — | — |
| ③ 리포트 오경로 | ✓ | — | — | — | queue-path 복구 | — |
| ④ 미push 반복 | — | ✓ | — | ✓ | stray 복구 | — |
| ⑤ fork 리포 push | ✓ | ✓ | ✓ | — | — | — |
| ⑥ 로컬 main 갈라짐 | — | ✓ | ✓ | — | divergence 복구 | — |
| (부가) 메모리 피크 | — | — | — | — | — | ✓ |

6건 모두 A+B+C+E 조합으로 구조적으로 막힘. D·F 는 "다시 안 생기게"하는 상위 가드.

## 10. Kyu 손작업 총계

- **1회**(R8 launchd plist).
- **1회**(R9 아이맥 CI 러너 등록).
- 이후 모든 라운드는 러너 자가 전환.

> 오늘 상태처럼 '러너가 막혀서 Kyu 손 기다림' 이 반복되는 패턴을 **구조적으로 2회 미만** 으로 줄임.

## 11. Kyu 결정 필요 포인트 (최대 3)

1. **격리 방향 (A + B + C) 전체 승인?** — 러너·허브·사람 git 폴더 분리. v8 의 가장 큰 패러다임 변경. "예" 면 R1~R4 바로 착수.
2. **F-ⓐ 아이맥 CI 전용 전환 승인?** — 맥북 16GB 포화 해소의 유일한 비-과금 안. "예" 면 R9 를 R4 와 병렬로 진행.
3. **D(launchd KeepAlive 자가 업데이트) 승인?** — Kyu 1회 plist 설치 비용으로 '설치 pending' 상태 영구 제거. 거부 시 R8 생략(자가 복구 E 만으로도 사고 대부분 커버).

## 12. 파기·대안 요약

- 지금 폴더 안에서 lock 만 추가: ① 외 5건 미해결. 기각.
- 모든 레포에 worktree 강제: pos 포크 흐름과 중복. relay 에만.
- 쉘 one-liner 복구: 상태 비저장 → 반복 감지 불가. 모듈화 유지.
- Cron 재시작: busy 세션 중단 위험. launchd KeepAlive 가 유일.

---

_본 문서는 구현 지시가 아닌 **승인 대기 계획서**. Kyu 승인 후 R1 부터 순차 착수._
