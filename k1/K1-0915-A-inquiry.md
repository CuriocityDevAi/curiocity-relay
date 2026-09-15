# K1-0915-A · 심문 (§ ③ 정본)

**허브**: K1 (test-portal 배관 · K1-0914-A 재정의 정합)
**브랜치**: `feat/k1-0915-a-env-open-v2` (worktree · origin/main SHA `20de580` 기저 · 원 폴더 접근 없음 · 실측 확증)
**CYCLE**: v1.2 § ② 큐/스펙 게시 + § ③ 심문 · 즉시 구현 금지 · Kyu 답 회수 후 실행

---

## § ② 큐/스펙 실측

### 1. 큐 (test-portal 로컬)
```
ops/dispatch/inbox/  = 7건 (P2.2~2.6, P5, deeplink-todoboss · K1-0914-A 시점과 동일)
ops/dispatch/active/ = 0
ops/dispatch/await-kyu/ = 1 (20260727-1000-p2-2-0-access-before-real-data)
```
K1-0915-A = Kyu 직접 발부 · 큐 밖.

### 2. EPIC-STATE (main HEAD `20de580` 기저)
- Active = K0-0914-AV (실기 결함 회수 · 실기 대기) · K0-0914-AU (v2 화면 · 실기 대기) · K0-0914-AR (부르는 포털) · **K1-0914-A (배관 · MERGED · 실기 대기)** · 디자인 · P2 SUBMIT · K33
- Deferred = 8건 · STALE 없음.

### 3. 스펙 인용 (SPEC v1.62 최신)
- **§ AV-1 정본** (openTestMode 4단계 폴백) — 본 라운드 A 확장 대상: (a) deep-link · (b) expo · (c) devenv · (d) deployed · (e) none. K1-0915-A A1~A4 = **(c) devenv 경로 강화 + (a) deep-link + autologin 편입** = SPEC § AV-1 절 확장.
- **§ K1 배관 절 (v1.61)** = K1 = test-portal 배관 허브. 파일 경계 = K1 소유 `tools/kyu-bridge/**` · `.github/**` · relay 리포 전체. **K1-0915-A 추가 편입 필요** = `tools/kyu-devenv/**` · `src/routes/api/env/**` · `config/projects.json` (env 필드 예외).
- **§ AR-C (v1.59)** = Expo tunnel 실 확장 = K1-0914-A A3 착지 (`tools/kyu-bridge/src/expo.mjs`) 정합 유지.
- **§ AR-B2 (v1.61)** = Web Push 실 발송 = K1-0914-A A1 착지 · **본 라운드 무관** (env 열기와 별건).

### 4. 인증 실측
- `wrangler whoami` = OAuth 활성 (workers write) ✅
- `gh auth status` = `CuriocityDevAi` (repo · workflow) ✅
- **git binary** = `/Library/Developer/CommandLineTools/usr/bin/git v2.50.1` (Xcode license 문제 우회 · PATH 명시 필수 · **각 세션마다 재적용**)
- **Node** = v22.23.1 (`.nvmrc` 정합) ✅

### 5. 대상 3 리포 실측 (실 실행 계획)
| 리포 | 로컬 clone | 실 PR 지정 | 실측 상태 |
| --- | --- | --- | --- |
| todoboss | `~/projects/todoboss` ✅ | **#23** | **OPEN** · head `d33b397` · title "T0-0911-A · Step #4 판정 체계 확장 (결근·추가근무·기록없음·상세·태그 카운트)" |
| grownest | `~/projects/grownest` ✅ | Kyu 원문 = "아무 PR" | 최신 open PR 자동 선택 · N0-0914-A/N0-0909-A 등 |
| storeport | `~/projects/storeport` ✅ | **#5** | **CLOSED (docs · 2026-07-27)** · title "docs(roadmap): StorePort 전체 진척 지도 정본 (Kyu M0-0727-C)" · **PR 지정 실측 어긋남** |

---

## (a) 확인 질문 (블로킹 6건)

### Q1. K2 정체성 · 파일 경계 (미착지 신 허브?)
- Kyu 원문 = "K2(runner/api/runs/migrations/docs/testing) 침범 금지". 
- 실측: relay `k2/` 폴더 부재 · SPEC K2 언급은 **P2 sub-Phase K2 (Access · 이미 완료 · K0-0723 초기 정본)** 뿐 · 다른 K2 = 미착지.
- 해석 후보:
  - (a) **K2 = 신설 예정 러너 허브** (`tools/regression-runner/**` · `src/routes/api/runs/**` · `migrations/**` · `docs/testing/**` 소유). K1-0902/0903 옛 REG 러너 자산 인수 대상.
  - (b) K2 = 이 라운드에서 오케가 지정한 개념적 표시 · 실제 허브 신설은 별건.
- **K1 권고 (필요)**: (a) 해석 → **K1 = env 열기 · Web Push · kyu-bridge · relay** / **K2 = 러너 · migrations · testing** 로 정본 분리. 이번 라운드 K1 은 K2 소유 (`tools/regression-runner/**` · `migrations/**` · `src/routes/api/runs/**` · `docs/testing/**`) 편집 금지.
- **Kyu 회신 필요**: K2 정체성 (a·b) · 그리고 `src/routes/api/runs/**` = 지금은 부재 · 신설 대상? (K1 env 스트리밍 로그 = `/api/env/**` 소유 확증했으니 · runs 는 K2 · 별도)

### Q2. storeport PR#5 지정 실측 어긋남
- Kyu 원문 = "storeport 포크 PR#5" · 실측 = **CLOSED docs PR (M0-0727-C · 2026-07-27)**. 실 브랜치 checkout · 서버 기동 실 재현 불가.
- **K1 권고 (필요)**: (a) 최신 open PR (있다면) 대체 · (b) 없으면 리포 원본 main 브랜치로 시연 · (c) storeport 스코프 아예 제외 (2 리포 = todoboss + grownest 로만).
- **Kyu 회신 필요**: PR 번호 정정 · 또는 대체 시연 정본.

### Q3. autologin method 구체 방식
- Kyu 원문 = "레시피 autologin으로 세션 주입". 방식 후보:
  - (a) **URL 쿼리 파라미터** (예: `?test=1&autologin=admin` · 앱이 자체 개발 가드로 세션 부여 · deeplink 파일럿 SPEC § 16 정합) — 앱 협력 필요 (todoboss 이미 편입 · grownest·storeport 확인 필요).
  - (b) **Playwright/CDP 스크립트 주입** (kyu-bridge 안 headless script · localStorage 세팅 후 브라우저에 넘김) — deps 커짐 · 자작 최소 위배 우려.
  - (c) **cookie/localStorage 프리셋 파일** (Chrome `--enable-features=...` 우회 · Safari 미지원).
- **K1 권고 (필요)**: (a) 정본 · 앱이 이미 dev 세션 API 편입 (SPEC § 16.5) · 미편입 리포 = 회부. 브리지가 Chrome open 前 URL 조립만.
- **Kyu 회신 필요**: (a·b·c) · 미편입 리포 (grownest·storeport) 처리 (스킵 or 회부).

### Q4. Chrome 임시 프로필 정본 명령
- macOS Chrome CLI 실측:
  ```
  open -na "Google Chrome" --args --user-data-dir=/tmp/kyu-chrome-<uuid> --new-window <URL>
  ```
- 종료 hook = Chrome 프로세스 종료 감지 → `rm -rf /tmp/kyu-chrome-<uuid>` (탐지 = pgrep · lsof watchdog).
- Safari 사생활 창 = macOS Safari 는 CLI 사생활 창 미지원 · 대체 = `osascript` 로 신 창 + 히스토리 삭제 or Safari 미지원 명시.
- **K1 권고 (필요)**: Chrome 정본 · Safari = 안내 배너만 (개발자 직접 사생활 창 열기).
- **Kyu 회신 필요**: (a) Chrome 정본 · Safari = 안내 · (b) 다른 명령 강제 · (c) 두 브라우저 모두 지원 필수.

### Q5. auto-merge 규칙 · frontmatter 감지 vs kyu-gate app 변경
- Kyu 원문 = "test-portal 리포는 사람 판정 불요 — PR 본문 round frontmatter + 자기 검증 통과 표기 + CI 초록이면 kyu-gate가 머지".
- 현재 = `.github/workflows/kyu-gate-auto-merge.yml` (kyu-gate check_run 완료 후 auto-merge) + kyu-gate App 도장 (Kyu 판정 후).
- 신규 규칙 후보:
  - (a) 신 워크플로 (`.github/workflows/k1-auto-selfcheck-merge.yml`) — PR body 파싱 · `round: K1-*` frontmatter + `outcome: 자기 검증 통과*` 감지 시 kyu-gate 도장 우회 + Workers Builds SUCCESS 조건 시 squash.
  - (b) 기존 kyu-gate-auto-merge.yml 확장 — check_run 트리거 안 test-portal 조건 편입.
  - (c) `/api/gate` 신설 (Kyu 원문 "K2 계약 착지 후 B") = 이번 라운드는 **워크플로만** · API 는 B로 이연.
- **K1 권고 (필요)**: (c) 정본 · 이번 = 워크플로만 · frontmatter 감지 규칙 SPEC 정본화 · `/api/gate` = K2 계약 착지 후 별건.
- **Kyu 회신 필요**: (a·b·c) · 이번 라운드 스코프.

### Q6. worktree vs clone · Kyu 작업 폴더 안전
- Kyu 원문 = "`~/projects/.kyu-env/<repo>/pr-<n>` worktree에 PR 브랜치 checkout+pull · Kyu 작업 폴더는 절대 건드리지 않음".
- 실측: `~/projects/todoboss` 는 Kyu 작업 폴더 · git worktree 는 원본 리포에서 파생. 
- 두 접근:
  - (a) **git worktree** = 원본 리포 `~/projects/<repo>` 에서 `git worktree add ~/projects/.kyu-env/<repo>/pr-<n> <branch>` 실행 (원본 리포에 참조 편입 · 원본 파일은 무변 · **원본 git 폴더 접근** 발생).
  - (b) **독립 clone** = `git clone <url> ~/projects/.kyu-env/<repo>/pr-<n>` (원본 완전 격리 · 디스크 2x · fetch/reset 만).
- **K1 권고**: (b) 정본 · Kyu 원문 "Kyu 작업 폴더는 절대 건드리지 않음" 강력 해석 · 원본 `.git` 디렉터리 참조도 회피.
- **Kyu 회신 필요**: (a·b) 선택.

---

## (b) 충돌 · 중복 지적 (2건)

### C1. 기존 kyu-bridge `/preview-start` 와 신 `/env/open` 관계
- 실측 = `tools/kyu-bridge/src/server.mjs:306 POST /preview-start` (K0-0824-AC 착지 · runPreviewFlow · dev 서버 기동 + 헬스체크 + LAN 주소).
- 신 `POST /env/open` = 상위 계층 (worktree 준비 + install + migrate + seed + start + browser + autologin).
- **K1 관측**: `/preview-start` 는 dev 서버 관제 · `/env/open` 은 워크플로 오케. `/env/open` 이 내부에서 `/preview-start` 로직 (`runPreviewFlow`) 호출 → 이중 정본 회피.
- **Kyu 판정 필요**: (a) 병존 · 내부 재사용 · (b) `/preview-start` 폐기 · `/env/open` 정본 · (c) `/env/open` = 새 흐름 · `/preview-start` = 옛 흐름 병행.

### C2. Chrome open 화이트리스트 (`tools/kyu-bridge/src/whitelist.mjs:21` `ALLOWED_HOSTS`)
- 현재 = `['localhost', '127.0.0.1']` (K0-0807-A Kyu 정본 · 외부 URL 거부).
- 신 흐름 = env 열기 시 `deployed URL (예: https://test.curiocity.company)` 또는 `배포 URL` 로 open · 화이트리스트 위배.
- **K1 관측**: env/open 안 open 로직은 **레시피 신뢰** (config/projects.json 안 URL) · 별도 화이트리스트 (`ENV_ALLOWED_HOSTS`) 편입 필요. 기존 `/open` 화이트리스트 유지 (보안).
- **Kyu 판정 필요**: (a) env/open 자체 화이트리스트 신설 · (b) `/open` 화이트리스트 확장 (외부 URL 허용 · 레시피 검증) · (c) 다른 대안.

---

## (c) 요구사항 자체 반론 (1건)

### R1. 실 실행 3 프로젝트 스코프 대비 라운드 무게
- Kyu 원문 = "Todoboss PR#23 · GrowNest 아무 PR · storeport 포크 PR#5 세 프로젝트에서 1~4 실 실행 로그 + 스샷 · 돌려본 로그 없으면 착지 아님".
- 실 소요 = 프로젝트당 worktree 준비 (~2분) + install (~30초~5분 · lockfile 새로면) + migrate/seed (~1분) + 서버 기동 (~1분) + 브라우저 실행 + 로그인 + 화면 진입 = **프로젝트당 5~10분** · 3개 = 15~30분 순수 · 실패 재시도 시 배 늘어.
- storeport PR#5 문제 (Q2) 별건.
- 이 라운드는 **인프라 라운드** (레시피 편입 + kyu-bridge 확장 + 워크플로 신설) 절반 + 실 실행 재현 절반. 코드 무게 대비 실 재현 요구 큼.
- **K1 반론**: **실 실행 재현은 Kyu 로컬 검증 대상** (K1 세션 = 브라우저 실행 하려면 launchd 데몬 재기동 + Kyu Chrome 프로세스 실측 필요). K1 은 **코드 착지 + 단위 검증 + 스캐폴딩 + 문서** · 실 3 프로젝트 실행은 **Kyu 실기 대상**.
- **Kyu 회신 필요**: (a) 라운드 유지 (실 실행 필수 · K1 자체 실행) · (b) K1 = 코드 + 단위 · 3 프로젝트 실 실행 = Kyu 실기 회부 (kyu_checks[] 편입) · (c) 축소 (1 리포 만 · todoboss 대표).

---

## (d) 역제안 (5건 · K0-0724-H 정본)

### D1. 환경 준비 상태 SSE (Server-Sent Events) 스트리밍
- Kyu 원문 = "진행 로그를 포털에 스트리밍(준비 중 · 설치 중 · 서버 기동 · 준비됨)".
- 방식 후보:
  - (a) SSE (`text/event-stream` · 브라우저 EventSource · 단방향) — 정본 · K1 브리지 loopback + 포털 fetch stream.
  - (b) WebSocket — 양방향 · 무겁 · 이번 스코프 밖.
  - (c) polling (`GET /env/status?job=<id>` 2초 간격) — 폴백 · 서버 부담.
- **K1 권고 (필요)**: (a) SSE 정본 · 지원.

### D2. jobId 정본 (env/open 응답 → 후속 GET/DELETE)
- job 관리 = jobId (예: `env-<repo>-<pr>-<epoch>`) + in-memory Map (kyu-bridge 데몬 안). 종료 시 정리.
- `GET /env/status/:jobId` · `DELETE /env/stop/:jobId` (환경 종료 · 프로필 정리 · 프로세스 kill).
- **K1 권고 (필요)**: 채택.

### D3. lockfile 변경 감지 (pnpm-lock.yaml · yarn.lock · package-lock.json)
- Kyu 원문 = "잠금파일 변경 시에만 의존성 설치".
- 감지 = `~/projects/.kyu-env/<repo>/pr-<n>/.k1-last-lock-hash` 파일에 이전 SHA-256 저장 · fetch+reset 후 재계산 · 다르면 install.
- **K1 권고 (필요)**: 채택.

### D4. 종료 hook · Chrome 프로세스 감지 + 프로필 청소
- macOS 는 pid 감지 = `lsof -i :<port>` or `pgrep -f 'user-data-dir=/tmp/kyu-chrome-<uuid>'` 폴링.
- 종료 감지 시 = `rm -rf /tmp/kyu-chrome-<uuid>` (프로필) + 데몬 워크플로 상태 = `closed`.
- 대안 = Kyu 명시적 [환경 종료] 버튼 (`DELETE /env/stop/:jobId`) 만 정본 · 프로세스 폴링 없음.
- **K1 권고 (필요)**: 명시적 종료 + 데몬 재기동 시 orphan 프로필 청소 (`ls /tmp/kyu-chrome-* -mtime +1 -exec rm -rf`). 프로세스 폴링 = 이 라운드 스코프 밖.

### D5. env-recipes.md · 신 프로젝트 등록 절차 (처음 하는 사람 기준)
- Kyu 원문 = "docs/env-recipes.md(레시피 규약 · 새 프로젝트 등록 절차 처음 하는 사람 기준)".
- **K1 권고 (필요)**: 아래 절 편입 정본
  - § 1 스키마 필드 정의 (JSON Schema)
  - § 2 4 프로젝트 예시 (todoboss · grownest · storeport · test-portal · expo agilo)
  - § 3 신 프로젝트 등록 5단계 (레시피 편입 · 로컬 clone · autologin 앱 편입 · 헬스체크 검증 · Kyu 실기)
  - § 4 화이트리스트 확장 절차 (`ENV_ALLOWED_HOSTS` 편입)
  - § 5 트러블슈팅 (lockfile · 포트 충돌 · Expo tunnel 실패)

---

## 결론 · Kyu 답 요청

**즉답 필수 (블로킹)**:
- Q1 (K2 정체성) · Q2 (storeport PR#5 정정) · Q3 (autologin method) · Q4 (Chrome/Safari 정본) · Q5 (auto-merge 워크플로 방식) · Q6 (worktree vs clone)
- C1 (`/preview-start` 관계) · C2 (env open 화이트리스트)
- R1 (실 실행 3 프로젝트 K1 자체 vs Kyu 실기)

**병행 확인** (실행 시 채택):
- D1 (SSE) · D2 (jobId) · D3 (lockfile 해시) · D4 (종료 hook) · D5 (env-recipes.md 목차)

**답 회수 후 K1 실행**: A1 (kyu-bridge /env/open) → A2 (레시피) → A3 (Chrome) → A4 (autologin) → A5 (auto-merge yml) → A6 (실행 · Kyu 답에 따라 K1 or Kyu 실기) → DOC → PR + relay push.

---

*K1-0915-A · 2026-09-15 · CYCLE v1.2 § ③ 정본 심문*
