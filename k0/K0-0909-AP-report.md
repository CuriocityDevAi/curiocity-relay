---
round: K0-0909-AP
pr: https://github.com/CuriocityDevAi/test-portal/pull/89
outcome: 자기 검증 통과 (Playwright 14 pass · 폰+데스크톱 실 브라우저) · Kyu 실기 확증 대기
kyu_checks:
  - 폰: A 카드 3개 노출 + 허브 hidden + push 전환 관찰 + 56px 판정/버튼 + DirtyGuard + 스크롤 복원 + PR 케이스 렌더
  - 데스크톱: 3단 grid + 사이드바 4 링크 + 상세 안내 + 2단 반응형
date: 2026-09-09
hub: K0 (test-portal)
base: main@371d26a (K0-0907-AO squash 착지 · 2026-09-09 08:27 UTC · kyu-gate App)
branch: feat/k0-0909-ap-design-workflow
head: 81414ac
---

# K0-0909-AP 리포트 · 디자인 정본 확정 (Kyu 09-07) + AO 결함 인계

## 라운드 흐름

1. **AO 착지 확증** (main@371d26a · 2026-09-09 08:27 UTC · PR#88 kyu-gate App auto-merge)
2. **fetch + main merge** (`git checkout main && git pull --ff-only`) · base 명기
3. **큐 · EPIC-STATE 실측** (§ ②)
4. **Kyu 원문 = 착수 지시서** ([REQ][DOC][BUILD][REPORT] 형식 · 심문 게이트 우회 정합)
5. **AP-A1 ~ AP-E + docs + Playwright + PR** 소화

## 스코프 봉인 (Kyu 원문 정본)

**4 조건**: 디자인·워크플로 / 자동 승인 / 원버튼 환경 / 케이스 누적. 밖 확장 금지.

## AP-A1 · iOS 네이티브 푸시 전환

**뿌리**: Kyu 09-07 실측 = 상세가 즉시 표시만 · 전환 없음.

**정본** (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):
- L74: `import { PUSH_MS, SHEET_EASE } from '$lib/kit-motion';`
- L225-232: `pushMounted` state · `onMount` 안 rAF 2회 트리거
- L962-965: `<main class="detail" class:mounted={pushMounted} style:transition="transform ${PUSH_MS}ms ${SHEET_EASE}">`
- L1948-1954: CSS `main.detail` = `translateX(100%)` · `.mounted` = `translateX(0)` + `will-change:transform`

**성능 예산 400ms 정합**: PUSH_MS = 360ms · 첫 페인트는 즉시 (translateX 0 아닌 100% 시작 · 콘텐츠 mount 후 slide-in).

## AP-A2 · 홈 스크롤 복원 (±8px · 실측 diff 0px)

**뿌리 확증** (K0-0909-AP-A2 심문):
- 이전 (K0-0907-AO): `snapshot.restore(value)` = mount 즉시 호출 · loadAll async · **body height 아직 부족 시점 scrollTo = 무효** (콘텐츠 미렌더 · 실제 스크롤 안 움직임)
- Kyu 09-09 실측 = "뒤로 → 홈 상단으로 감"

**정본** (`src/routes/+page.svelte`):
- L250: `let pendingRestoreY = $state<number | null>(null);` (즉시 저장만)
- L263-274: `snapshot.capture` (`window.scrollY`) · `snapshot.restore` (`pendingRestoreY = value` + `applyPendingScroll()`)
- L319-338: `applyPendingScroll` = rAF 2회 안 body height 확인 · target + viewport × 0.5 이상이면 scrollTo · ±8px 오차 안 = pending 해제
- L182-186: `hasCachedList` 즉시 `seedFromCachedSlots` + `applyPendingScroll()` (SWR slot 값 즉시 반영)
- `loadAll finally` 안 `applyPendingScroll()` 재실행 (콘텐츠 fetch 후 body 확보)

**K1 어설션** (`tools/regression-runner/assertions/test-portal/ap-a2-home-scroll-restore.mjs`):
- 4 조건 = `pendingRestoreY` · `applyPendingScroll` · `snapshot` export · `loadAll finally 재실행`
- 실측: `pass · K0-0909-AP-A2 스크롤 복원 정본 4 조건 pass`

**Playwright 실측** (`e2e/portal-perf.spec.ts:88-118`):
- 800px 스크롤 → 상세 진입 → 뒤로 → **diff 0px** (예산 ±8px)
- 로그: `[SCROLL] before=800px · after=800px · diff=0px (예산 ±8px)`

## AP-B · 폰 홈 A 카드 그룹

**뿌리**: Kyu 09-07 정본 = 흰 카드 · 아이콘 타일 헤더 + 제목 (20px) + 건수 · GitHub 모바일 My Work 문법.

**정본** (`src/routes/+page.svelte`):
- 3 카드 = `[data-testid="section-todo"]` + `[data-testid="section-recent"]` + `[data-testid="section-projects"]` (신설)
- 각 카드 = `.card` 스타일 (흰 배경 · 그림자 · 12px border-radius)
- 헤더 = `.card-head` = `.card-icon-tile` (32×32 · octicon inbox/history/repo) + `h2` (20px 700) + `.card-count` badge
- `.card .row-title` 16px 정합
- 허브 카드 = `.card.hidden-until-aq` · `hidden` 속성 · `display:none !important`

**Playwright 실측** (`portal-smoke.spec.ts:(a)`):
- `section-todo` · `section-recent` · `section-projects` visible 확증
- `section-hub` `hidden` 속성 확증 (`expect(hidden).not.toBeNull()`)

## AP-C · 상세 1 · 56px 세로 + DirtyGuard

**정본** (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):
- L2651-2666 `.seg` = min-height 56px · font-size 17px 600 (Kyu 원문 "판정 3택 세로 크게")
- L2969-2979 `.primary, .secondary` = min-height 56px · font-size 16px 600 (하단 바 [환경 열기]/[결과 복사]/[제출])
- L917-948 `isDraftDirty` = `submitResult` 없고 (`verdict != null` or `verdict_reason.trim().length > 0`) 시 true
- L933-940 `goBack` = `isDraftDirty()` → `showDirtyGuard = true`
- L1942-1971 DirtyGuard `Dialog.Root` (bits-ui) = 시각 [여기 남기]/[그래도 나가기]

## AP-D · 데스크톱 3단 메일형

**정본**:
- `src/routes/+layout.svelte:52-63` = max-width 반응형 (480 → 900 → 1200)
- `src/routes/+page.svelte:363-380` = `.desktop-shell` grid · 사이드바 (nav 4 링크) + main.list-col + aside.detail-col
- CSS = 폰 (`display:block`) · 768~1023 (2단 · 340+1fr · 사이드바 미노출) · ≥1024 (3단 · 200+340+1fr)

**Playwright 실측** (`e2e/portal-desktop.spec.ts` · chromium-desktop 프로젝트 1280×800):
- d1 사이드바 4 링크 (`nav-todo/prs/projects/settings`) visible = pass
- d2 `.desktop-shell` grid + `grid-template-columns` 3 값 확증 = pass
- d3 상세 열 "왼쪽 목록에서" 안내 = pass
- d4 `.app` clientWidth ≥ 900 = pass

## AP-E · 동반 (raw hex 유지 · ALLOW_LIST 1)

- 자체 어설션 `al1-token-no-raw-hex` = **pass** 실측
- LauncherButton (QR code 색 옵션) 만 예외 유지
- 새 카드/그리드 등 K0-0909-AP 편입 코드 = raw hex 0

## 자기 검증 (Kyu 원문 착지 조건)

### QC 전량

```
pnpm check         → 1004 files · 0 err · 0 warn
pnpm test          → 68 files · 933 passed
pnpm build         → adapter-cloudflare · done
```

### Playwright 실 브라우저 (Kyu 원문 정본)

**chromium-phone (390×844)**:
```
smoke  8 (a~h) + perf 4 = 12 pass · 2 skip (mock 링크 부재 · 실기 정본)
[PERF] (2) 상세 케이스 렌더: 809ms (참고 관측)
[SCROLL] before=800px · after=800px · diff=0px (예산 ±8px · A2 실측 확증)
```

**chromium-desktop (1280×800)**:
```
d1 사이드바 4 링크 (877ms) · d2 3단 grid (860ms) · d3 상세 안내 (827ms) · d4 max-width (797ms)
4 pass
```

**어설션 파일 동봉**:
- `tools/regression-runner/assertions/test-portal/ap-a2-home-scroll-restore.mjs` (K1 · 4 조건)
- `tools/regression-runner/assertions/test-portal/ao4-pr-body-checklist.mjs` (K1 · PR#89 · 케이스 7건 pass)

### 스샷 첨부

- `e2e/screenshots/a-home-3sections.png` (A 카드 그룹 · 허브 미노출)
- `e2e/screenshots/b-detail-push.png` (상세 push in-frame)
- `e2e/screenshots/d-sheet-open.png` (설정 시트)
- `e2e/screenshots/e-home-back.png` (홈 복귀)
- `e2e/screenshots/h-checklist-restored.png` (체크리스트)
- **`e2e/screenshots/desktop-d1-sidebar.png`** (신설 · 데스크톱 사이드바)
- **`e2e/screenshots/desktop-d2-3col-grid.png`** (신설 · 3단 grid)
- **`e2e/screenshots/desktop-d3-detail-empty.png`** (신설 · 상세 안내)

## Kyu 실기 (처음 하는 사람 기준 · 폰/데스크톱 분리)

### 폰 (아이폰 · 390 폭)

1. **Cloudflare 배포 확증** (auto-deploy 1~3분)
    - `git ls-remote origin feat/k0-0909-ap-design-workflow` = `81414ac` 확인
    - Cloudflare Workers Builds 대시보드 = 새 버전 반영 대기
2. **아이폰 Safari 에서 `https://test.curiocity.company` 접속** (Access OTP 로그인)
3. **홈 화면 관찰**:
    - 흰 카드 3개 노출 = 할 일 · 최근 활동 · 프로젝트
    - 각 카드 헤더 = 왼쪽에 아이콘 (사각 타일) · 가운데 제목 (크게) · 오른쪽에 건수 (회색 badge)
    - 예전 있던 "허브" 카드는 **화면에 없음** (DOM 은 남아 있음 · AQ 라운드에서 부활 예정)
4. **최근 활동 첫 항목 탭**:
    - 상세 페이지가 **오른쪽에서 왼쪽으로 슬라이드**하며 나타남 (0.36초)
    - 즉시 표시 아님 = iOS 네이티브 느낌
5. **상세 하단 판정 버튼 관찰**:
    - [성공] [실패] [보류] 버튼이 **세로로 크게** (56px · 이전보다 두툼)
    - [결과 복사] · [제출] 도 세로로 크게
6. **판정 [성공] 클릭 · 뒤로가기**:
    - 상단 [←] 클릭 → **다이얼로그 노출** (판정 저장 안 됨 · [여기 남기]/[그래도 나가기])
    - [그래도 나가기] = 홈 복귀
7. **홈 800px 스크롤 → 상세 진입 → 뒤로가기 확증**:
    - 홈 아래로 스크롤 (프로젝트 카드 근처까지)
    - 카드 안 아무 항목 탭 → 상세 진입
    - 뒤로가기 → **스크롤이 원 위치 복원** (상단으로 튀지 않음)
8. **PR#89 상세 진입** (`/pr/CuriocityDevAi/test-portal/89`):
    - 케이스 7개 렌더 확증 (K0-0907-AO-4 회귀 상속 · body 안 test-checklist 유지)

### 데스크톱 (맥 브라우저 · 1280 폭 이상)

1. **`https://test.curiocity.company` 접속** (Access OTP 로그인)
2. **홈 화면 관찰**:
    - 화면이 **3단 grid** = 왼쪽 사이드바 (200px) + 가운데 카드 목록 (340px) + 오른쪽 상세 열
    - 사이드바 링크 4개 = 할 일 · PR 전체 · 프로젝트 · 설정
    - 오른쪽 상세 열 = 비었음 안내 = "왼쪽 목록에서 항목을 선택하세요"
3. **브라우저 창 900px 근처로 축소**:
    - 사이드바 **사라짐** (2단 = 목록 340px + 상세 1fr)
4. **브라우저 창 480px 이하로 축소**:
    - 폰 뷰 = 단일 컬럼 (A 카드 그룹만)

## 이연 순증감 (Kyu 원문 = "스코프 봉인 밖 확장 금지")

### AP 이연 회수 (AO → AP 인수 완결)
- iOS 네이티브 푸시 전환
- 홈 스크롤 위치 복원 (±8px 실측 확증)
- 흰 카드 A 그룹 · 아이콘 타일 · 20/16 폰트
- 상세 56px 세로 (판정 3택 · 하단 바)
- 데스크톱 3단 메일형
- DirtyGuard 다이얼로그

### AP 신규 이연 → AQ (Kyu 원문 = "허브 카드 AQ에서 상태판으로 부활 예정")
- 허브 상태판 부활 (기존 카드 코드 유지 · display:none)

### AP 잔여 이연 (원장 유지)
- PopMenu (bits-ui) · 필터 칩 · 시트 필터
- 중첩 푸시 확장 (상세 → 케이스 확대 · nav-stack 2단 · Kyu 원문 "스샷 필요한 행만 › 중첩 푸시")
- 이모지 → octicon 완결 (카드 헤더 아이콘 타일 편입 · 라운드 잔여)
- kit 복제 헤더 승격 (curiocity-kit 별건 EPIC)

### 원장 총 (AQ 편입) = 허브 상태판 + PopMenu + 중첩 푸시 확장 + octicon 완결 + kit 승격

## 미실행 · 미검증 명시

- **폰 실측 성능 값**: Playwright 상세 첫 페인트 (1) · 홈 복귀 (3) 는 mock 상태에서 recent-item 링크 부재로 skip (2/4 skip). **Kyu 폰 실기 정본** (Kyu 회신 c-2 동의).
- **중첩 푸시** (nav-stack 2단 = 상세 → 케이스 확대) = 구조만 편입 (PushPage 재사용 가능) · 실 편입은 AQ 별건.
- **이모지 → octicon 완결**: 헤더 아이콘 타일 (inbox/history/repo octicon) 편입 · settings 시트/버튼 이모지 잔여 = AQ.

## 커밋 · PR

- 커밋: `81414ac` (K0-0909-AP · 18 파일 · +607/-34)
- 브랜치: `feat/k0-0909-ap-design-workflow`
- PR: [#89](https://github.com/CuriocityDevAi/test-portal/pull/89)
- body 첫 줄: `**round**: \`K0-0909-AP\``

---

*정본 · K0-0909-AP-report · Kyu 폰·데스크톱 실기 확증 대기 · AQ 다음 라운드 (허브 상태판 + PopMenu + 중첩 푸시 확장 + octicon 완결 + kit 승격).*
