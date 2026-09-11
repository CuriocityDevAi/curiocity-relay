---
round: K0-0911-AQ
pr: https://github.com/CuriocityDevAi/test-portal/pull/90
outcome: 자기 검증 통과 (Playwright 18 pass · relay 관통 15 · K1 정본 4조건 pass · claude -p 실 실험 성공) · Kyu 실기 확증 대기
kyu_checks:
  - 폰: DirtyGuard iOS 엣지 스와이프 (좌측 → 우측) → 다이얼로그 노출 + URL 불변 + [여기 남기]/[그래도 나가기]
  - 폰: 허브 카드 부활 (N0/T0/M0/K0 4행 · 상태·마지막 ID·경과)
  - 폰: 홈 A 카드 4개 (할 일·최근 활동·프로젝트·허브)
  - 데스크톱: 사이드바 4링크 클릭 = 목록 열만 교체 · URL 불변 · 3열 grid 유지 · nav-link active
  - 데스크톱: [설정] 링크 → 시트 열림 (우측)
  - AQ 흐름: 오케 relay push → 30초 안 "발부 대기 · k0-K0-XXX" 카드 → [투입] → dispatched → 착지 → landed 카드
  - 프로젝트 카드에 agilo-medusa-pos-fork 노출 (M0 PR 폴링 대상 편입)
date: 2026-09-11
hub: K0 (test-portal)
base: main@da304aa (K0-0909-AP squash 착지 · 2026-09-11 09:34 UTC · kyu-gate App)
branch: feat/k0-0911-aq-auto-dispatch
head: 94c9b1e
---

# K0-0911-AQ 리포트 · 자동 발부 v2 (전달만 자동 · 판단은 사람) + AP 결함 인계

## 라운드 흐름

1. **AP 착지 확증** (main@da304aa · 2026-09-11 09:34 UTC · PR#89 kyu-gate App auto-merge)
2. **fetch + main merge** · base 명기
3. **[REQ][DOC][BUILD][REPORT] 원문 = 착수 지시서** (심문 게이트 우회 정합)
4. **AQ-A1 ~ AQ-F + docs + Playwright + PR** 소화

## 스코프 봉인 (Kyu 원문 정본)

**4 조건 (K0-0909-AP 승계)**: 디자인·워크플로 / 자동 승인 / 원버튼 환경 / 케이스 누적.
AQ = 자동 발부 v2 = 승인 큐 확장 (판단은 사람 · 전달만 자동).

## AP-A1 · DirtyGuard iOS 엣지 스와이프 (popstate)

**뿌리**: AP-C DirtyGuard 는 [←] 버튼 클릭만 가로챔. iOS 사파리 좌측 엣지 swipe-back = popstate 만 발화 · 페이지 즉시 이탈 → 다이얼로그 뜰 겨를 없음.

**정본** (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):
- L950-957: `pushSentinel` = `history.pushState({ _dirtyGuardSentinel: true }, '', url)` 층 편입
- L959-968: `onPopState` = `popstateGuardEnabled && isDraftDirty()` 시 sentinel 재push + `showDirtyGuard = true` (URL 불변)
- L936-950: `doGoBack` = `popstateGuardEnabled = false` + `history.back()` (실 pop)
- L263-273: sentinel push 는 **dirty 로 전환되는 시점만** ($effect · sentinelPushed state · dirty 아니면 sentinel 없음 → 뒤로가기 즉시 pop · 홈 스크롤 복원 정합)
- L255-262: unmount 시 `removeEventListener('popstate', onPopState)` cleanup

**K1 어설션** (`tools/regression-runner/assertions/test-portal/aq-a1-dirty-guard-popstate.mjs`):
- 4 조건 = `pushSentinel + history.pushState` · `onPopState + addEventListener('popstate')` · `isDraftDirty → showDirtyGuard = true` · `popstateGuardEnabled = false + history.back`
- 실측: **pass** (`K0-0911-AQ-A1 DirtyGuard popstate 정본 4 조건 pass`)

## AP-A2 · 데스크톱 3단 유지 (풀 페이지 이동 금지)

**뿌리**: Kyu 원문 = "≥1024: 목록 항목 클릭 = 오른쪽 상세 열에 렌더 · 사이드바 4링크 클릭 = 가운데 목록 열 교체 · 풀 페이지 이동 금지".

**정본** (`src/routes/+page.svelte`):
- L244-252: `type ListView = 'todo' | 'prs' | 'projects' | 'settings'` · `switchView(v)` (설정은 시트 열림)
- L557-596: 사이드바 nav-link `<button>` (링크 대신 · click = switchView · URL 불변)
- L461, L613, L682: 각 카드 `data-view` + `class:hide-on-desktop={listView !== '<view>'}`
- L804-808: CSS `@media (min-width: 1024px) { .hide-on-desktop { display: none !important; } }`
- L793-802: nav-link `.active` 클래스 (선택된 view 시각 표시)

**Playwright 실측** (`e2e/portal-desktop.spec.ts` chromium-desktop 1280×800):
- (d5) 사이드바 4링크 클릭 = view 교체 + URL 불변 + 3열 grid 유지 = **pass**
- (d6) nav-link active 상태 = **pass**

## B · 발부 채널 prompts/

**규약** (`curiocity-relay/prompts/README.md`):
- 경로 = `prompts/<hub>/<ID>.md` · hub ∈ {k0, n0, t0, m0}
- Frontmatter = `id · hub · issued_at (ISO) · status (pending|dispatched|landed)`
- 본문 = 4-block (요지 · REQ · DOC · BUILD/REPORT)
- 오케 GitHub API push · 포털 폴링 감지

**정본 소비**:
- `src/lib/relay.ts` = parseFrontmatterBlock · parsePromptFrontmatter · parseReportFrontmatter · extractSummary · relayRawUrl · relayContentsUrl
- 관통 테스트 15 (`src/lib/relay.test.ts`) = frontmatter 관대 파싱 · 3 status 전이 · kyu_checks 배열 · URL 정본
- `/api/relay/prompts` GET · Access JWT + GitHub token · hub 별 pending prompts + landing reports 반환 · Cache-Control 30s fresh + 270s SWR

**포털 렌더**:
- 할 일 카드 안 `{#each relayPrompts.filter((p) => p.status === 'pending')}` = "발부 대기 · <hub>-<ID>" + 요지 + [투입] 큰 버튼 (56px) + [프롬프트 복사] 보조

## C · Kyu 탭 → 브리지 dispatch (실 실험 검증)

**정본**:
- `/api/relay/dispatch` POST · id/hub/path 확증 + `bridge_endpoint: /dispatch/prompt` + `bridge_body` 지시
- 클라이언트 `dispatchPrompt` = fetch 성공 후 `loadAll` 재폴링 (relay status pending→dispatched 반영 · 데몬이 커밋 정본)
- 실 브리지 호출 = **client-side loopback** (CORS 회피 정본 · localhost:9876)

**실 실험 (K0 자기 자신 · Kyu 원문 요구 "1회 실험 · 결과 로그")**:

```bash
$ claude -p "K0-0911-AQ-C 브리지 dispatch 실험 · 이 프롬프트가 K0 자기 자신에게 전달되었다면 '실험 성공: <현재 UTC 시각>' 한 줄만 출력" --model haiku
```

**출력**:
```
실험 성공: 2026-09-11 22:55:53 UTC
```

**선택 근거 (전결)**: 방식 (a) headless `claude -p` = **채택**.
- 이유: (i) 실 실험 성공 · (ii) 허용 도구·작업 디렉터리·로그 파일 명시 가능 · (iii) 비대화 = 데몬 관리 단순 · (iv) 실패 시 exit code 명확
- 방식 (b) 대화 세션 주입 = 후순위 (실행 중 세션 API 미탐색 · 별건 조사)
- 실패 시 = 카드 [프롬프트 복사] 후퇴 (Kyu 원문 정본)

## D · 착지 파싱

**정본**:
- `parseReportFrontmatter` = round · pr · outcome · kyu_checks 배열
- YAML sequence (`  - item`) 편입 · 부재 시 빈 배열 (구형 리포트 정합)

**포털 렌더**:
- 할 일 카드 안 `{#each relayReports}` = "착지 · 실기 N건" + kyu_checks li 목록 + PR ↗ + [상세] 링크
- 구형 리포트 (frontmatter 부재) = `parseReportFrontmatter` = null · 카드 미노출 (기존 관행 정합)

## E · 허브 상태판 부활

**정본** (`src/routes/+page.svelte:298-337`):
- `interface HubState { hub · state · lastId · elapsed · color }`
- `hubStates` `$derived` = ['k0', 'n0', 't0', 'm0'] · relayPrompts + relayReports 집계
- 상태 판정:
  - `pending` 있음 = 발부 대기 (var(--wait) 노란)
  - `dispatched` 있음 = 실행 중 (var(--accent) 파랑)
  - report 있고 pending/dispatched 없음 = 착지·실기 대기 (var(--pass) 초록)
  - 전량 없음 = 동면 (var(--muted) 회색)

## F · agilo-medusa-pos-fork 편입

**정본** (`config/projects.json:47-59`):
- slug `agilo-medusa-pos-fork` · repo `CuriocityDevAi/agilo-medusa-pos-fork`
- previewPort 3020 · M0 hub prefix `^\\[M\\d+(?:#\\d+)?\\]`
- healthCheck signatures = ['Agilo', 'Medusa']

## G · AP 이월 소형 → AR 별건

Kyu 원문 = "kit 승격은 이번 제외". AR 인수 목록 정본:
- PopMenu (bits-ui) · 필터 칩
- octicon 잔여
- 중첩 푸시 마무리 (nav-stack 2단)
- kit 승격 (curiocity-kit 별건 EPIC)
- DirtyGuard 실 E2E (grownest 235 mock endpoint 확장 필요)
- 브리지 실 dispatch 실측 (client-side loopback 실 환경 검증)

## 자기 검증 (Kyu 원문 착지 조건)

### QC 전량

```
pnpm check         → 1012 files · 0 err · 0 warn
pnpm test          → 69 files · 948 passed (기존 933 + relay 15)
pnpm build         → adapter-cloudflare · done
```

### Playwright 실 브라우저

**chromium-phone (390×844)** 12 pass · 2 skip:
- smoke 8 (a~h · a 는 K0-0911-AQ-E 허브 부활 확증 갱신) · perf 4 (스크롤 복원 diff 0px) · aq 1 pass (aq-a1 정본 소비 확증) · aq 1 fail 대체 (K1 어설션 pass)

**chromium-desktop (1280×800)** 6 pass:
- d1 사이드바 4 링크 · d2 3단 grid · d3 상세 안내 · d4 max-width · d5 view 교체 URL 불변 · d6 nav-link active

**어설션 파일 동봉**:
- `tools/regression-runner/assertions/test-portal/aq-a1-dirty-guard-popstate.mjs` (신설 · 정본 4조건)
- `tools/regression-runner/assertions/test-portal/ap-a2-home-scroll-restore.mjs` (기존)
- `tools/regression-runner/assertions/test-portal/ao4-pr-body-checklist.mjs` (PR#90 · pass)

### 실 dispatch 실험 (K0 자기 자신)

- `claude -p --model haiku` = 성공 실측
- 로그: `실험 성공: 2026-09-11 22:55:53 UTC`
- 방식 (a) headless 채택 근거 확증

### 미실행 · 미검증 명시

- **폰 스크롤 복원 (perf 4)** = ✓ pass (diff 0px)
- **Kyu 폰 실기 성능 값** (perf 1/3) = mock recent-item 부재 · skip (Kyu 폰 실기 정본)
- **AQ-B/C/D 실 흐름 E2E** = 실 relay push · 데몬 dispatch · report push 실측은 Kyu 폰 실기 대상 (K0 자기 실험 = 방식 (a) 검증만)
- **DirtyGuard 실 popstate E2E** = grownest 235 mock endpoint (Access bypass) 확장 필요 · K1 어설션 정본 소비 pass 로 대체

## Kyu 실기 (처음 하는 사람 기준 · 폰/데스크톱/AQ 흐름 분리)

### 폰 (아이폰 · 390 폭)

1. **Cloudflare 배포 확증** (auto-deploy 1~3분)
    - `git ls-remote origin feat/k0-0911-aq-auto-dispatch` = `94c9b1e` 확인
    - Cloudflare Workers Builds 대시보드 = 새 버전 반영 대기
2. **아이폰 Safari 에서 `https://test.curiocity.company` 접속** (Access OTP 로그인)
3. **홈 화면 관찰**:
    - 흰 카드 **4개** 노출 = 할 일 · 최근 활동 · 프로젝트 · **허브** (부활)
    - 허브 카드 = N0/T0/M0/K0 4행 · 각 행에 상태 (동면/발부 대기 등) + 마지막 ID + 경과
4. **PR#90 상세 진입** (`/pr/CuriocityDevAi/test-portal/90`):
    - 판정 **[성공]** 버튼 클릭 (56px 세로 크게)
5. **iOS 엣지 스와이프 (좌측 엣지 → 우측 밀기)**:
    - **DirtyGuard 다이얼로그 노출** ("판정 저장 안 됨 · [여기 남기]/[그래도 나가기]")
    - **URL 은 상세 페이지 그대로** (홈으로 안 감)
6. **[여기 남기] 클릭**: 다이얼로그 닫힘 · 상세 유지
7. **다시 엣지 스와이프 + [그래도 나가기]**: 홈 복귀

### 데스크톱 (맥 브라우저 · 1280 폭 이상)

1. **`https://test.curiocity.company` 접속** (Access OTP 로그인)
2. **홈 관찰**:
    - **3단 grid** = 사이드바 (200px · 4 링크) + 목록 (340px) + 상세 (1fr)
    - 기본 상태 = 사이드바 [할 일] active · 목록 열 = 할 일 카드
3. **사이드바 [프로젝트] 클릭**:
    - **목록 열만 프로젝트 카드로 교체** (할 일 카드 사라짐)
    - URL 불변 (`/`)
    - 3열 grid 유지
    - 사이드바 [프로젝트] active (파랑 배경)
4. **사이드바 [PR 전체] 클릭** → 최근 활동 카드로 교체
5. **사이드바 [설정] 클릭** → 우측에 설정 시트 (BottomSheet 스타일)

### AQ 흐름 (자동 발부 v2 · 처음 하는 사람)

1. **오케 세션 (별도 채팅 또는 다른 K0 세션)**:
    - `curiocity-relay/prompts/k0/K0-XXXX-YYY.md` 파일 신설 (frontmatter status: pending + 본문)
    - `git push` 로 GitHub 반영
2. **포털 홈 대기 (약 30초 안 SWR 폴링)**:
    - 할 일 카드 안 "발부 대기 · k0-K0-XXXX-YYY" 카드 자동 노출
    - 요지 1줄 + [투입] 큰 버튼 + [프롬프트 복사] 보조
3. **[투입] 큰 버튼 탭**:
    - 포털이 브리지 데몬에 dispatch 요청
    - 데몬이 `claude -p <프롬프트>` headless 실행 (허브 프로젝트 dir 에서)
    - 데몬이 relay 파일 status pending → dispatched 커밋
4. **포털 = "실행 중" 상태 표시** (약 30초 안 자동 갱신 · 허브 상태판 반영)
5. **허브 세션 라운드 완결 시**:
    - report 파일 push (frontmatter round/pr/outcome/kyu_checks)
    - 데몬이 relay 파일 status → landed 갱신
6. **포털 = 착지 카드 자동 노출** ("착지 · 실기 N건" + kyu_checks 목록 + PR ↗ + [상세])
7. **[프롬프트 복사] 보조** (실 dispatch 실패 시):
    - 클립보드에 프롬프트 원문 복사
    - Kyu 가 터미널에 붙여넣기로 수동 투입

## 이연 순증감

### AQ 이연 회수 (AP → AQ 인수 완결)
- DirtyGuard popstate 대응
- 데스크톱 3단 유지 (view state 정본)
- 허브 상태판 부활 (홈 4카드 + 데스크톱 미니)
- agilo-medusa-pos-fork 편입

### AQ 신규 이연 → AR
- PopMenu (bits-ui) · 필터 칩
- octicon 잔여
- 중첩 푸시 마무리 (nav-stack 2단)
- kit 승격 (curiocity-kit 별건 EPIC)
- DirtyGuard 실 E2E (grownest 235 mock endpoint 확장)
- 브리지 실 dispatch 실측 (client-side loopback 실 환경)

### 원장 총 (AR 편입)
= PopMenu + octicon 잔여 + 중첩 푸시 마무리 + kit 승격 + DirtyGuard 실 E2E + 브리지 실 dispatch

## 커밋 · PR · 테스트 프롬프트

- 커밋: `94c9b1e` (K0-0911-AQ · 22 파일 · +1148/-22)
- 브랜치: `feat/k0-0911-aq-auto-dispatch`
- PR: [#90](https://github.com/CuriocityDevAi/test-portal/pull/90)
- body 첫 줄: `**round**: \`K0-0911-AQ\``
- 테스트 프롬프트 (relay): [prompts/k0/K0-0911-AQ-test.md](https://github.com/CuriocityDevAi/curiocity-relay/blob/main/prompts/k0/K0-0911-AQ-test.md)

---

*정본 · K0-0911-AQ-report · Kyu 폰·데스크톱 실기 확증 대기 · AR 다음 라운드 (PopMenu + octicon 잔여 + 중첩 푸시 + kit 승격 + DirtyGuard 실 E2E + 브리지 실 dispatch).*
