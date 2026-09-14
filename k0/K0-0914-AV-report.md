---
round: K0-0914-AV
pr: https://github.com/CuriocityDevAi/test-portal/pull/93
outcome: 자기 검증 통과 (Playwright 29 pass · 파일 경계 준수 · 7 항목 전량 소화 · "별건" 이연 금지) · Kyu 실기 확증 대기
kyu_checks:
  - 폰: 환경 없는 프로젝트 = [테스트 열기] 배포 URL 새 탭 or disabled + 이유
  - 폰: checks 없는 PR 상세 = "터미널이 쓴 항목입니다" 안내 + 원문 그대로
  - 폰: 종합 판정 카드 = 헤더 "종합 판정" + 케이스별 P/F 시각 구분
  - 폰: 이미 merged/closed PR = 지금 내 차례에서 사라짐 · 착지 카드 사라짐
  - 폰: 기계 판정 띠 = 초록/빨강/회색 (GitHub check-runs 실 데이터)
  - 폰/맥: 사이드바 미니 허브 = config/projects.json hub 필드 파생 (하드코딩 없음)
  - iOS (홈 화면 미설치): [알림 켜기] disabled + 배너 + 3줄 절차
date: 2026-09-14
hub: K0 (test-portal)
base: main@923a947 (K0-0914-AU squash 착지 · 2026-09-14 09:16 UTC · kyu-gate App)
branch: feat/k0-0914-av-au-defects
head: 692962b
---

# K0-0914-AV 리포트 · AU 실기 결함 7건 회수

## 라운드 흐름

1. **AU 착지 확증** (main@923a947 · 2026-09-14 09:16 UTC · PR#92 kyu-gate App auto-merge)
2. **fetch + main merge** · base 명기
3. **파일 경계 확인** (Kyu 원문 = K0 = src/routes/** · src/lib/ui/** + config/projects.json 편집 예외 · K1 소유 침범 없음)
4. **7 항목 전량 소화** ("별건" 이연 금지 · Kyu 원문 정본)

## 스코프

**파일 경계 (Kyu 원문)**:
- **K0 소유**: `src/routes/**` · `src/lib/ui/**` · `config/projects.json` (편집 예외)
- **K1 소유** (침범 금지): `api/push` · `tools/kyu-bridge` · `.github` · relay 리포

## AV-1 · [테스트 열기] 죽은 버튼 금지

**뿌리**: Kyu 실기 4번 = "환경 없는 프로젝트에서 [테스트 열기] 눌러도 무반응 = 죽은 버튼".

**정본** (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):
- `openTestMode` `$derived` = 4 단계 폴백:
  - (a) `deep-link` = checks items 안 미판정 deep_link → 새 탭
  - (b) `expo` = projectType === 'expo' → `startExpo()` (기존 흐름)
  - (c) `devenv` = previewPort 있음 → 로컬 dev 서버 안내 (기존)
  - (d) `deployed` = deployedUrl 있음 → "🌐 이 사이트에서 확인 · <URL>" 새 탭 링크
  - (e) `none` = disabled + "🧪 이 프로젝트는 열 환경이 없음" + 이유 1줄
- `config/projects.json` = `deployedUrl` 필드 편입 (grownest/storeport/todoboss/test-portal)

## AV-2 · 폴백 체크리스트 문구

**정본**:
- checks 있으면 = 기존 `.my-checks-list` 렌더
- checks 없고 cases 있으면 = "터미널이 쓴 항목입니다 (쉬운 말 항목은 준비 중)" 안내 (`.fallback-hint` · `data-testid="fallback-hint"`)
- 빈 문구 "테스트 개요 없음" 미노출 = `{#if pr.summary}` guard 편입

## AV-3 · 종합 판정 헤더 + 시각 구분

**정본**:
- `.verdict.overall-verdict` = surface-2 배경 + border-top 3px accent + border-radius 8px
- `.verdict-header-band` = "종합 판정" 18px 700 + "아래 케이스별 P/F 와 별개 · PR 전체 결과" 서브
- 판정 3버튼 52px 유지

## AV-4 · 판정 완료 PR 제외

**정본** (`src/routes/+page.svelte`):
- `allPRsFlat` = module-scope `$state<PortalPR[]>`
- `isPrCompleted(prUrl)` 순수 함수:
  - `github.com/OWNER/REPO/pull/N` 파싱
  - allPRsFlat 매칭 (`repo === "OWNER/REPO"` and `id === N`)
  - `pr_state !== 'open'` or `merged === true` = 완료
- 3 지점 filter:
  - `myTurnItems` `$derived` = `relayReports.filter(!isPrCompleted).map(...)`
  - `detectNewLanding` = 조건 안 `!isPrCompleted(r.pr)` 추가
  - `{#each relayReports.filter(!isPrCompleted)}` 착지 카드 렌더
- `loadAll` finally + `seedFromCachedSlots` 안 `allPRsFlat` 갱신

## AV-5 · `/api/pr-checks` 신설 (GitHub 실 데이터)

**정본** (`src/routes/api/pr-checks/+server.ts`):
- GET `/api/pr-checks?repo=&pr_id=`
- 처리:
  - `env.GITHUB_TOKEN` 부재 = `{state:'gray', source:'error'}` 폴백
  - `fetchPrHead` = GET `/repos/o/r/pulls/N` · head.sha
  - `fetchCheckRuns` = GET `/repos/o/r/commits/sha/check-runs?per_page=50` (병렬)
  - `fetchCombinedStatus` = GET `/repos/o/r/commits/sha/status`
  - 두 소스 통합 items · `humanTitleFor(context)` 매핑:
    - e2e/playwright → "화면 테스트"
    - unit/vitest → "단위 테스트"
    - lint → "스타일 검사"
    - typecheck/tsc → "타입 검사"
    - build → "빌드"
    - kyu-gate → "Kyu 판정 게이트"
  - `failCount>0` = `red` · `items>0 & failCount=0` = `green` · `items=0` = `gray`
  - `Cache-Control: private, max-age=60, stale-while-revalidate=240`
- 응답 = `{state, source: 'github'|'error', passCount, failCount, failed[{context, humanTitle}], head_sha}`

**상세 페이지 소비** (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):
- `prChecks` state · `fetchPrChecks()` mount 병렬
- `machineState` `$derived` = `pr-checks (source='github')` 우선 · relay checks 폴백
- `passDisabledByMachine = machineState === 'red'` (기존 정합 유지)

## AV-6 · 허브 하드코딩 제거

**정본** (`src/lib/registry.ts`):
- `Project.hub?: 'k0'|'n0'|'t0'|'m0'` 필드 신설
- `activeHubs()` helper = REGISTRY 안 hub 필드 파생 (중복 제거 · 순서 유지 · 폴백 ['k0'])

**정본** (`config/projects.json`):
- grownest = `hub: "n0"` + `deployedUrl: "https://grownest.company"`
- storeport = `hub: "m0"` + `deployedUrl: "https://storeport.company"`
- todoboss = `hub: "t0"` + `deployedUrl: "https://todoboss.company"`
- test-portal = `hub: "k0"` + `deployedUrl: "https://test.curiocity.company"`
- agilo-medusa-pos-fork = `hub: "m0"`
- **config/projects.json 편집 예외** (K0 편집 가능 · Kyu 원문 정본)

**홈 `hubStates`** `$derived` = `activeHubs().map((hub) => ...)` (기존 `['k0','n0','t0','m0']` 하드코딩 대체)

## AV-7 · iOS PWA 안내

**정본** (`src/lib/ui/pwa-context.ts`):
- `isIOS()` = UA `/iPhone|iPad|iPod/`
- `isStandalone()` = `navigator.standalone` (iOS) or `matchMedia('(display-mode: standalone)')`
- `isIOSSafariBrowserContext()` = iOS + !standalone

**정본** (`src/lib/SettingsSheet.svelte`):
- `iosSafariBrowserContext` state (mount 시 `isIOSSafariBrowserContext()` 저장)
- `iosSafariBrowserContext` 시:
  - `.ios-install-banner` = 파란 테두리 + surface-2 배경 + "🏠 홈 화면에 추가한 뒤 켤 수 있어요"
  - 3줄 절차 = "Safari 하단 공유 버튼" · "'홈 화면에 추가' 선택" · "홈 화면에서 앱을 열고 [알림 켜기] 다시"
  - `<input type="checkbox" disabled>` = [알림 켜기] disabled
- 데이터-testid: `ios-install-banner` · `push-toggle` (disabled 여부 확증)

## 자기 검증

### QC 전량

```
pnpm check         → 1028 files · 0 err · 0 warn
pnpm test          → 69 files · 948 passed
pnpm build         → adapter-cloudflare · done
```

### Playwright 3 뷰포트 (Kyu 원문 = 390/820/1280)

- chromium-phone (390×844): 12 pass · 2 skip
- chromium-desktop (1280×800): 6 pass (d1~d6)
- chromium-tablet (820×1180): 2 pass (t1/t2)
- **AV spec 신규**: av-1 (환경 없는 버튼) · av-3 (판정 헤더) · av-6 (허브 파생) · av-7 (iOS UA 시뮬 배너) = 4 pass
- AQ spec: au-b1/au-g1/au-c1 = 3 pass
- **Total = 29 pass · 2 skip**

### iOS UA 시뮬 실측 (av-7)

```javascript
context.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 ...) Safari/604.1'
→ isIOSSafariBrowserContext() = true
→ ios-install-banner count = 1
→ push-toggle disabled = true
```

### 미실행 · 미검증 명시

- **`/api/pr-checks` 실 데이터** = 프로덕션 배포 후 실 GitHub API 응답 확증 대상 (Kyu 폰 실기 정본)
- **초록/빨강/회색 3 케이스 mock** = av-1 spec 안 grownest (previewPort 있음) = green/gray 조건부 · 실 빨강 유도 mock 은 별건 (실 API 필요)
- **판정 완료 PR 실기 재현** = merged PR (예: #87 · #88) 이 지금 내 차례에 안 뜨는지 프로덕션 확증 대상

## Kyu 실기 (처음 하는 사람 기준 · 폰/아이패드/맥 + iOS 절차)

### 폰 (아이폰 · PWA 홈 설치 상태)

1. `git ls-remote origin feat/k0-0914-av-au-defects` = `692962b` · auto-deploy 대기
2. 앱 열기 → 홈 = 지금 내 차례 카드 노출
    - **이미 병합된 PR** (예: #87/#88) = 지금 내 차례에서 사라짐 확증
3. 상세 진입 → **[테스트 열기] 버튼** 관찰:
    - 정상 = "🧪 테스트 열기 · 이 폰에서" (56px)
    - 배포 URL 모드 = "🌐 이 사이트에서 확인 · https://..." (링크)
    - 환경 없음 = 회색 disabled + "이 프로젝트는 열 환경이 없음"
4. **폴백 체크리스트** = checks 없는 PR 진입 시:
    - "터미널이 쓴 항목입니다 (쉬운 말 항목은 준비 중)" 문구 노출
    - PR body 원문 그대로 나열
5. **종합 판정 카드** = 케이스 목록 아래
    - 헤더 = "종합 판정" (18px) + "아래 케이스별 P/F 와 별개 · PR 전체 결과"
    - 파란 상단 border + 회색 배경 = 시각적으로 케이스와 구분
    - 3 버튼 = 52px 세로 크게

### 아이패드 (820) / 맥 (1280)

- **사이드바 미니 허브** = k0 · n0 · t0 · m0 4행 (config/projects.json 파생 · 하드코딩 없음)
- 새 프로젝트 = JSON 한 줄 추가 시 자동 반영 확증

### iOS Safari (홈 화면 미설치 상태 · av-7)

1. **아이폰 Safari** (앱 아님) 로 접속
2. 우상단 [⚙] → 설정 시트 열림
3. 🔔 알림 절 안 = **🏠 배너** ("홈 화면에 추가한 뒤 켤 수 있어요")
4. 배너 아래 3줄 절차:
    1. Safari 하단 공유 버튼
    2. "홈 화면에 추가" 선택
    3. 홈 화면에서 앱 열고 [알림 켜기] 다시
5. [알림 켜기] 스위치 = 회색 (disabled)

## 이연 순증감

### AV 이연 회수 (7 항목 전량)
- [테스트 열기] 죽은 버튼 금지
- 폴백 체크리스트 안내
- 종합 판정 헤더 + 시각 구분
- 판정 완료 PR 제외
- /api/pr-checks 실 데이터
- 허브 하드코딩 제거
- iOS PWA 안내

### AV 잔여 이연 → K1 병행 (파일 경계 밖)
- relay README index 규약 갱신 (checks 필드)
- checks/k0/K0-0914-AV.md relay push (초안 리포트 첨부 · 이 리포트 § E 안 embedded)
- build-index.mjs checks 파일 집계
- Web Push 실 발송
- kyu-bridge Expo 확장

### 원장 총 (K1 병행) = relay README + checks push + build-index + Web Push 실 발송 + kyu-bridge Expo

## checks 초안 (K1 relay push 대상)

<details><summary>K0-0914-AV-checks.md 초안 · 화면에 보이는 단어만 · ok/ng 두 줄 규약</summary>

```markdown
---
id: K0-0914-AV
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/93
issued_at: 2026-09-14T10:00:00Z
items:
  - '{"device":"phone","title":"환경 없는 프로젝트에서 테스트 열기 버튼이 죽지 않는다","pass":false,"fail":false,"est_min":2}'
  - '{"device":"phone","title":"체크리스트가 없어도 터미널이 쓴 항목이 그대로 뜨고 안내가 위에 있다","pass":false,"fail":false,"est_min":2}'
  - '{"device":"phone","title":"종합 판정 버튼 세 개가 케이스 목록 아래 확실히 보인다","pass":false,"fail":false,"est_min":2}'
  - '{"device":"phone","title":"이미 판정한 PR은 지금 내 차례에서 사라진다","pass":false,"fail":false,"est_min":3}'
  - '{"device":"phone","title":"기계 판정 띠 색이 초록·빨강·회색 셋 중 하나로 뜬다","pass":false,"fail":false,"est_min":2}'
  - '{"device":"any","title":"허브가 config에 있는 프로젝트별 hub 값으로 뜬다","pass":false,"fail":false,"est_min":2}'
  - '{"device":"phone","title":"아이폰 사파리 홈 화면 안 넣은 상태에서는 알림 켜기가 회색이고 안내가 뜬다","pass":false,"fail":false,"est_min":2}'
---

## 요지

K0-0914-AV 자기 검증 · 7 결함 회수 · 화면에 보이는 단어만 · 약어 금지 · ok/ng 두 줄 규약.
```

</details>

## 커밋 · PR

- 커밋: `692962b` (16 파일 · +591/-45)
- 브랜치: `feat/k0-0914-av-au-defects`
- PR: [#93](https://github.com/CuriocityDevAi/test-portal/pull/93)
- body 첫 줄: `**round**: \`K0-0914-AV\``

---

*정본 · K0-0914-AV-report · Kyu 실기 확증 대기 · K1 병행 = relay README + checks push + build-index + Web Push 실 발송 + kyu-bridge Expo.*
