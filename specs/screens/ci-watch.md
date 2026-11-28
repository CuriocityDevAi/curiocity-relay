# ci-watch 화면 명세서 (정본)

작성: 오케 2026-11-27 (Kyu 05:38 "ci-watch 도 설계서가 없는 대표적인 케이스같아") · 규약 = [README.md](./README.md) · 구현 = relay `scripts/ci-watch.mjs` + `scripts/watch/ci-watch-render.mjs` (기본 화면 · `~/.hub-runner/bin/ci-watch.sh`)

기본 화면은 **하나**다. 아래 요소가 전부 이 기본 화면에 있어야 한다. `--v2`(ci-watch-v2.mjs)는 실험 화면이며 기본 화면의 요소를 대신하지 않는다.

## 구역 순서 (위 → 아래)

머리줄 → 허브 큐 → CI 큐(표) → 진행 중 → 오늘 완료 → 주의(맨 아래)

## 요소

| ID | 구역 | 승인된 모습 | Kyu 원문 · 승인일 · 출처 | 현재 구현 | 일치 여부 |
|---|---|---|---|---|---|
| `CW-HEAD` | 머리줄 | `ci-watch v<버전> (<날짜>)` · 시각 · `●진행 N` · `■주의 N` · `✔오늘 N` · `runner v<버전>` · heartbeat. **●진행 N = 진행 중인 프롬프트 수**(CW-PROG 줄 수와 같음) | 11-25 10:47~11:04 확정 레이아웃 §1 · `ledger/decision-ci-watch-tui-layout-20261125.md:29` | `scripts/watch/ci-watch-render.mjs:793~797`(v1.18 M0-1127-A · `totalInProgress = pipelinePrompts.length`) | 일치 |
| `CW-HUBQ` | 허브 큐 | 제목 `─ 허브 큐 (m0 n · m1 n · …) ─` · 허브마다 한 줄: 오른쪽 칩 = 아직 안 집힌 프롬프트 · 아랫줄 `└ ⠹ <ID> 작업 중` = 실행 중일 때만 · 줄 오른쪽 끝 = 평균대기. 60초 넘게 안 집히면 그 칩 빨강 | Kyu 11-25 10:47 "허브 Queue 에 어떤작업들이 줄서있는지 … 눈에 잘 보" · 11-26 08:48 "평균대기시간은 허브별로 m0, m1, m2, m3, r0 에도" · `decision-ci-watch-tui-layout-20261125.md` · `decision-ci-watch-machines-20261126.md §4` | 同 | 일치 |
| `CW-CIQ` | CI 큐 | **풀 하나 = 한 줄 표** · 열 = `풀 · 대기 · MBP M1 · iMAC M1 · 클라우드 · 평균대기` · 열 제목 1회 · 고정 폭 · 실행 칸 `⠹<ID> <시간>` / `쉼(N)` / 빨강 `OFF` / 조회 실패 `?`(회색) · ID 자르지 않음 | Kyu 11-26 08:48 "좌측은 내부 MacbookPro M1 의 CI, 중간은 IMAC 의 CI, 우측은 Github의 클라우드 CI" · 10:31 "너 추천으로." · `decision-ci-watch-machines-20261126.md §1·2·5` | 同 | 일치 |
| `CW-CIQ-TODAY` | CI 큐 마지막 줄 | `오늘 처리(잡)` — 기계 열 아래 `N건 · 평균실행` (클라우드는 + 비용) | 同 §1 | 同 | 일치 |
| `CW-PROG` | 진행 중 | 제목 `─ 진행 중 (N) ─` · **프롬프트 한 건 = 한 줄** · `● <ID>  <허브>  <9단계 띠>  <현재 단계 이름>  <그 단계에 머문 시간>  <#PR>  <제목>` · 9단계 = **큐 · 작업 · 리포트 · PR · CI대기 · CI실행 · CI결과 · 리뷰 · 머지** · 띠 = `●` 지난 단계 · `◐` 현재 · `○` 남은 단계 · 줄 색: 정상 녹● / 느림 노▲ / 비정상 빨■(다음 줄 `└ 이유`) · 머지되면 줄에서 빠져 오늘 완료로. CI-less(`no_ci_repos` 명시 등록) → CI대기 건너뜀 · review 로 직행 (표시 없음). **미등록 리포**(어디에도 없음) → review 직행 + 색과 무관하게 다음 줄 `└ 미등록 리포 <이름>` 노랑 + 주의 구역 1줄 (거짓 경보 없음 · runner-config.json 에 추가 유도) | Kyu 11-24 14:13 "각 프롬프트가 현재 어떤 위치에 있는지 현 위치 를 녹색으로 표기해주고, 비정상적으로 오랫동안 해당 위치에서 움직이지 않으면 … 텍스트를 빨간색으로" · "노랑 추가 괜찮아." · `decision-pipeline-view-20261124.md` · 11-25 확정 레이아웃 §5 `decision-ci-watch-tui-layout-20261125.md:33,59-61` · 🔴 Kyu 11-27 05:38 재언급 · M0-1127-C 미등록 리포 표시 추가 | `ci-watch-render.mjs:985~1021`(v1.19 M0-1127-C) · data.pipelinePrompts (= buildExtendedView().inProgress) 를 받아 `stageStrip` + `stageLabel` + level→색으로 렌더. red 는 다음 줄 `└ 이유`. `c.unregisteredRepo` 있으면 색과 무관하게 노랑 `└ 미등록 리포 <이름>` 서브행 추가. `ci-watch.mjs` tick 안에서 `buildExtendedView({ skipFetch: true, skipGh: true })` 1회 호출로 공급. CI 없는 리포(`no_ci_repos`) 및 미등록 리포는 step 2.1 에서 `ci_pending` → `review` 로 직행(`shouldSkipCi`). 미등록만 `card.unregisteredRepo = repo` 플래그. 주의 구역: `unregisteredRepos` 추출(pipelinePrompts 에서 중복 제거) → 노랑 `⚠ 미등록 리포 <이름>` 1줄씩. 줄 제목 = 큐 파일 첫 줄 괄호 요지 우선(`readQueueTitle` ① 형식). | 일치 |
| `CW-DONE` | 오늘 완료 | 제목 `─ 오늘 완료 N ─` · 리포별 마지막 CI 시각·결과 · 기계별 오늘 PR·PT·잡 4줄(MBP · iMAC · 클라우드 · 전체 = 세 줄 합) · 클라우드 넘김 `폐지` 표기 | Kyu 11-26 (v1.13~v1.16 실화면 판정) · `decision-ci-watch-v110-20261126.md` · `decision-ci-zero-cloud-20261126.md` | 同 | 일치 |
| `CW-ALERT` | 주의 (맨 아래) | 줄에 속한 문제는 그 칸을 빨강 · **줄 밖 경보만** 맨 아래 `─ 주의 (N) ─` · 클라우드 잡이 생기면 빨간 경고 · 아이맥 heartbeat 끊김 경보(문턱 **12분** · 마지막 WIB 시각 표시) · **리포별 main 최신 CI 실패·시작실패·미실행 경보** (v1.23 · 문턱 15분 · 메시지 `<리포> main CI 실패 · <commit7> · <N분 전> — 다음 PR 머지 금지` · 시작실패는 "워크플로 파일 오류 의심" 추가) | Kyu 11-26 08:52 "특정 줄에 속하지 않은 경보는 … 그냥 주의 경보는 맨 아래에 여전히 두자." · `decision-ci-watch-machines-20261126.md §5` · v1.16 · 11-27 M2-1127-F 거짓 경보 보정 · 11-27 M0-1127-F `decision-storeport-ci-dead-20261127.md:20` (storeport#468 이 ci.yml 0초 실패 중 머지 — "실패 아닌 조용함" 사각지대) | `ci-watch-render.mjs:1115~1130`(v1.18 M0-1127-A: 주의 섹션을 countdown **위**로 이동 — 뿌리: `startCountdownTimer` 의 `\x1b[1A\r\x1b[2K` 가 마지막 줄 바로 위를 매 1초 덮어써서 주의 본문이 지워졌음. countdown 을 항상 마지막 줄로 만들면 setInterval 이 countdown 줄만 갱신) · v1.21 `computeImacHbAlerts(HB_STALE_MIN=12)` pure 함수 분리 · origin/main ts 보정 · v1.23 `computeMainCiAlerts` pure 함수(ci-watch.mjs) · 리포별 branch=main 최신 커밋 + 주 워크플로(storeport `ci.yml` · fork `CI`·`Lint`) run 매칭 → 실패/시작실패(startup_failure OR 0초 failure)/미실행(MAIN_CI_NO_RUN_MIN=15) 판정 · 기존 GH 캐시 주기(30초/5분)에 얹음 (REQ-3 호출 수 증가 없음) · runnerAlerts 선두에 삽입 → `■` 빨간 줄 | 일치 |
| `CW-RENDER` | 전체 | 줄바꿈 금지(터미널 폭으로 자름 · 한글 2칸) · 글자 위치 고정 · 바뀐 줄만 갱신 · 러너 로그 줄(`[claim]` · `[build-hubs]` 등)이 본 화면에 섞이면 안 됨 | Kyu 11-26 08:48 "글자 위치는 그대로 있고, 숫자만 갱신되면" · `decision-ci-watch-machines-20261126.md §6` | `ci-watch-render.mjs:1094~1102`(v1.18 M0-1127-A: `ERR_TAIL_SCREEN_FILTERS` 에 `/^\[build-hubs\]/` 추가) · err_tail 소스 = `hub-runner-v8.*.mjs collectErrTail()` 가 `~/.hub-runner/launchd.err.log` 꼬리를 읽어 `allJson.err_tail` 로 올림 → ci-watch 가 필터 미매칭 줄 2개를 회색으로 렌더 | 일치 (`[build-hubs]` 2줄 노출 뿌리 = 필터 누락 — 수정됨) |
| `CW-VERSION` | 머리줄 | 화면을 바꾸는 모든 PR 은 버전을 올린다 — 머리줄 버전 = 실제 코드 | `scripts/ci-watch.mjs:8` 주석 규칙 | `CI_WATCH_VERSION = '1.23'` · 이력 주석 `1.18 M0-1127-A` · `1.19 M0-1127-B` · `1.20 M2-1126-T/M0-1127-D` · `1.21 M2-1127-F` · `1.22 M3-1127-F` · `1.23 M0-1127-F` | 일치 |

## 웹 화면 (M2-1128-D)

구현 = `scripts/ci-watch-web/server.mjs` + `scripts/ci-watch-web/index.html` + `scripts/ci-watch-web/ui.js` · 데이터 수집 = `collectData()` (ci-watch.mjs에서 export) · 서버 = Node 내장 `http` · 바인드 = 아이맥 Tailscale IP `100.82.115.70:7700` 전용 (0.0.0.0 금지).

| 항목 | 값 |
|---|---|
| 접속 주소 | `http://100.82.115.70:7700` |
| 갱신 주기 | 브라우저 5초 fetch |
| 상태 스냅샷(로컬) | `~/.ci-watch-web/state.json` |
| 스냅샷 브랜치 | `ci-watch-state` (force-push · 커밋 1개 · main 오염 금지) · 60초 주기 |
| launchd 서비스 | `com.curiocity.ci-watch-web` |
| 설치 | `bash ~/projects/curiocity-relay/scripts/ci-watch-web/install.sh` |
| 제거 | `bash ~/projects/curiocity-relay/scripts/ci-watch-web/install.sh --uninstall` |

### 화면 요소 (CW-WEB-*)

| ID | 구역 | 명세 | 반응형 |
|---|---|---|---|
| `CW-WEB-HEAD` | 머리줄 | ci-watch · 버전 · 시각(데스크톱만) · CSS 스피너 · 마지막 갱신 N초 전 · 알약 4개(데스크톱): ●진행 N · ■주의 N(클릭→펼침) · ✔머지 N · 러너 버전. 폰: 알약 3개(진행·주의·러너). 30초 데이터 없으면 헤더 노랑 "데이터 지연". 진행 N ≠ relay claims started 수이면 회색 "데이터 불일치" | 공통 |
| `CW-WEB-HUBS` | 허브 카드 | 허브 5장 가로 나열. 각 카드: 허브명 · 모델 · CSS 스피너 + 파란 테두리(작업 중) · 프롬프트 ID · 제목(큐 파일 첫 줄 괄호 요지) · 진행 막대(경과/상한 — "N분 상한" 파싱, 없으면 60) · 경과/상한 텍스트. 쉴 때: "쉼" + 마지막 활동 시각 | 데스크톱만 |
| `CW-WEB-BOARD` | 9단계 보드 | 9칸(큐·작업·리포트·PR·CI대기·CI실행·CI결과·리뷰·머지). 카드: ID · 제목 · 단계 머문 시간. 느림(≥20분)=노랑 테두리, 비정상(≥45분)=빨강. 카드 클릭 = PR https 링크. 가로 스크롤 허용 | 데스크톱(전체), 폰(건수만 · 클릭→상세) |
| `CW-WEB-TIMELINE` | 오늘 타임라인 | 허브별 가로줄. 1 프롬프트 = 막대(claims started→done). 색: 코딩=파랑 · 리뷰(r0)=보라 · 진단(제목에 "진단")=주황 · 실패=빨강. 빈 칸=쉬는 시간. 범례 아래 | 데스크톱(전체), 폰(얇은 5줄 · 클릭→시간순 목록) |
| `CW-WEB-CI` | CI 기계 | MacBook·iMac·클라우드 3칸. 각 기계 4슬롯(SP-H·SP-L·FK-H·FK-L). 실행=파랑+잡 ID. 오늘 잡 수 · 토큰 행 | 데스크톱(전체), 폰(색 칩 4개+잡 수 · 클릭→상세) |
| `CW-WEB-ALERTS` | 주의 | 데스크톱: 머리줄 ■주의 N 알약 클릭 → 헤더 아래 펼침 패널. 폰: 주의 알약 → 상세 화면 | 공통 |
| `CW-WEB-DETAIL` | 폰 상세 화면 | 같은 페이지 안 화면 전환. 왼쪽 위 뒤로 버튼 ≥44px. 허브 카드 → 허브 상세(ID·제목·9단계 띠·경과/상한·PR링크·오늘 한 일 목록). 9단계/진행 → 카드 목록. 타임라인 → 프롬프트 시간순 목록. CI → 기계·풀 상세. 주의 → 경보 목록 | 폰만 |

**공통 규칙**: CSS 스피너 = 데이터와 무관하게 CSS animation. 터치 목표 ≥44px. 가로 스크롤 없음(9단계 보드 데스크톱 overflow-x 허용).  
**색 체계**: CSS 변수 전용(`--surface · --accent · --warn · --bad · --ok · --dim · --border`). 데이터 색만 원색 허용.  
**ui.js 분리**: DOM 그리기 = `ui.js` 단독(순수 JS · 의존성 없음 · textContent 전용). 오케의 핀 artifact 가 같은 `ui.js` 재사용.  
**스냅샷**: 아이맥 서버가 60초마다 `/api/state` 와 같은 JSON 을 `ci-watch-state` 브랜치에 `state.json` force-push. git plumbing(`hash-object`→`mktree`→`commit-tree`→`push --force`) 사용, 로컬 브랜치 전환 없음. 실패해도 웹 서빙 계속.

## 이력

- 11-24 14:13 9칸 파이프라인 확정 → 11-25 M2-1125-I·J(#34) 가 **`ci-watch-v2.mjs`(`--v2`)에만** 구현.
- 11-26 08:48 기계 3칸 요구 → 오케가 M2-1126-A 를 **v1 파일(`ci-watch.mjs`) 기준 · "기본 화면 = 이 레이아웃"** 으로 발부. 원장 대사에 11-25 확정 레이아웃을 "허브 큐/CI 큐 칩 규칙"으로만 인용하고 §5(진행 중 = 9단계 띠)를 빠뜨림 → 기본 화면의 진행 중 구역이 CI 잡 목록이 됨. Kyu 동의 없는 변경(= spec drift). 명세서가 없어 R0·오케 모두 못 잡음.
- 11-27 이 명세서 작성 · 복구 발부.
- 11-27 M0-1127-A 복구 완료 (v1.18): CW-PROG 띠 복구 · CW-HEAD `●진행 N` 프롬프트 수로 · CW-RENDER `[build-hubs]` 필터 · CW-ALERT countdown 위로 (덮어쓰기 해결) · CW-VERSION 1.18. `--v2` 는 유지하되 다음 라운드 제거 후보로 docs/ci-watch.md 표기. 보존 테스트 = `scripts/test/ci-watch-spec-guard.test.mjs`.
- 11-27 M0-1127-B (v1.19): 미등록 리포 거짓 경보 수정 — `shouldSkipCi` 로 CI 없는/미등록 리포 `ci_pending` → `review` 직행 · `defaultFetchPrState(X, undefined)` → null(storeport 추측 금지) · 줄 제목 = 큐 파일 첫 줄 괄호 요지 우선 · 리포 목록 `runner-config.json` ci_watch 섹션으로 config-driven · 테스트 `ci-watch-w119.test.mjs` 추가.
- 11-27 M0-1127-C (v1.19 same PR): 미등록 리포 표시 추가 — 명시 `no_ci_repos` ↔ 미등록 구분 · 미등록 카드 아래 노랑 `└ 미등록 리포 <이름>` 서브행 · 주의 구역 `⚠ 미등록 리포` 1줄(리포별 1회) · `curiocity-devai-method` → `no_ci_repos` 명시 등록 · 테스트 2건 추가(`W119-unregistered-flag` · `W119-noci-no-flag`).
- 11-27 M2-1127-F (v1.21): iMac heartbeat 거짓 경보 수정 — 문턱 `3분→12분`(주기 5분의 2배) · origin/main ts 보정(pull 지연 대응) · 경보 메시지에 마지막 WIB 시각 추가 · `computeImacHbAlerts` pure 함수 export · 테스트 `ci-watch-w121.test.mjs` 추가(5건).
- 11-28 M2-1128-D: 웹 화면 개편 — `ui.js` 분리(순수 JS · textContent 전용) · 데스크톱 허브 카드 5장 + 9단계 보드 + 오늘 타임라인 + CI 기계 3칸 · 폰 축소판 + 클릭 상세 화면(허브·보드·타임라인·CI·주의) · CSS 변수 전용 · 스냅샷 push(`ci-watch-state` 브랜치 · git plumbing · 60초). `install.sh` 웹 전용 clone + launchd 자동설치.
- 11-28 M2-1128-E: 코드 결함 수정 — `gitRefresh` 가 항상 `origin/main` 으로 reset 해서 PR 브랜치 파일을 덮어쓰는 문제 → `CI_WATCH_GIT_BRANCH` 환경변수(기본 `main`) 추가 · `install.sh --branch <name>` 플래그 추가(plist 에 `CI_WATCH_GIT_BRANCH` 치환). 머지 전 테스트 가능. 머지 후 `install.sh` (--branch 없음) 으로 main 추적 복원.
- 11-27 M0-1127-F (v1.23): 리포별 main 최신 CI 경보 추가 — `computeMainCiAlerts` pure 함수(ci-watch.mjs) · `MAIN_CI_WORKFLOWS` (storeport `ci.yml` · fork `CI`·`Lint`) · 경보 조건 3종(실패 · 시작실패=`startup_failure` OR 0초 failure · 미실행 `MAIN_CI_NO_RUN_MIN=15`) · 메시지 `<리포> main CI 실패 · <commit7> · <N분 전> — 다음 PR 머지 금지` (start 는 "워크플로 파일 오류 의심" 추가) · 기존 GH 캐시 주기(30초/5분)에 얹음 — `fetchMainCiStatusAll()` 을 `fetchGhQueueAndCloud` 안에서 호출 (호출 수 증가 없음 · 리포당 2회 API · 2 리포 = 4회) · 테스트 `ci-watch-w123.test.mjs` 추가(12건 · 검증의 검증 = `detectStartFailure=false` 면 분류 소실 확인). 뿌리: storeport#468 이 ci.yml 0초 실패 중 머지 — 어떤 화면에도 안 떠서 11시간 조용함(ledger `decision-storeport-ci-dead-20261127.md:20`).
