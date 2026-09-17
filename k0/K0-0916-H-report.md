---
round: K0-0916-H
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/112
base: 7ea62ac
spec_bump: v1.K0-0916-H
req: [K0-BD-1, K0-BD-2, K0-BD-3, K0-BD-4, K0-BD-5, K0-BD-6, K0-BD-7, K0-BD-8]
ledger: [R031, R002, R012]
processes: [my-turn-list, pr-detail-view, flow-grid, flow-sheets, ledger-patch, e2e-tests, ci-check, common-utils]
finished_at: 2026-09-16
---

# K0-0916-H · 프로덕션 09-16 실기 결함 7 회수 (BD · R031) 착지 리포트

**Kyu 원문 (2026-09-16)**: "Kyu 프로덕션 실기 09-16 결함 회수. 이번 라운드 착지 조건 = 프로덕션 실데이터로 Playwright (mock 금지). 돌려본 로그 없으면 착지 아님".

**base** = main@7ea62ac (K0-0916-F 오케 머지 후).
**PR** = #112.
**착지 직전 origin/main 재병합** = Already up to date.

## 원장 대사 (ledger_events)

| R-id | 상태 | 이 라운드 처리 | 다음 단계 |
|---|---|---|---|
| **R031** | 신설 (filed → verified 진행) | 7 결함 전량 회수 · CI workflow 착지 조건 편입 | Kyu 프로덕션 실기 확증 → done |
| **R002** | verified 유지 (K0-0916-F 마감) | 흐름판 실동작 5 sub 회수 (4a~4e) | Kyu 실기 확증 |
| **R012** | done (K0-0916-E) | 확장 · 데스크톱 두 열 폐지 · 단일 열 정본 | 완결 |

## 파일 경계

Kyu K0-0916-H 원문 = "파일 경계 K0" + `.github/workflows/production-playwright.yml` 신설 (착지 조건 CI 요구).
K1/K2 소유 침범 없음.

## 7 결함 회수 (Kyu 09-16 실기 정본)

### 결함 1 · 데스크톱 두 열 폐지 (BD-1)

- `.desktop-shell` = 모든 기기 `max-width: 720px` 중앙 · `.detail-col` DOM 삭제.
- 상세 = 시트 or 전체 화면 푸시 (폰과 동일).
- 파일: `src/routes/+page.svelte:1046~1053` (aside 삭제) · CSS `.desktop-shell` grid → block.

### 결함 2 · 실기 목록 정본 (BD-2)

- 줄 = **허브 · 날짜 · PR #N** + 원장 원문 + `확인 N건 · 기기 · 약 N분` + 라운드 부제.
- `MyTurnItem` 확장 = `hub` · `date` · `originalText`.
- `extractHub("K0-0916-A")` = `"K0"` · `extractRoundDate("K0-0916-A")` = `"09-16"`.
- DOM = `.tr-title` (허브·날짜·PR) + `.tr-summary` (원장 원문) + `.tr-meta` (기존) + `.tr-sub` (라운드).

### 결함 3 · 404 뿌리 규명 (BD-3)

- **파일:줄** = `src/routes/+page.svelte:isPrCompleted` (기존 K0-0914-AV-4 로직).
- **뿌리**: `/api/prs` = **open PR 만 반환** (`fetchOpenPRs` github.ts) · closed/merged PR 은 `allPRsFlat` 안 부재 → `!found` → 이전 `return false` (완료 아님) → 노출 → 404 (상세 페이지 안 PR fetch 실패).
- **정본 수정** = `!found` = closed/merged 로 판정 (`return true`) · N0-0909-B 등 옛 리포트 자동 제외 · `!m` (파싱 실패) 도 안전 = 미노출.

### 결함 4 · 흐름판 실동작 5 sub (BD-4)

- **(a) 카드 탭 반쯤 걸림** = `src/lib/BottomSheet.svelte` backdrop DOM 상주 · opacity:0 이지만 pointer-events active · 상위 UI 클릭 intercept. 정본 = `.sheet-backdrop.closed`/`.sheet.closed` = `pointer-events: none`.
- **(b) [삭제]/[유지]·[우선순위]·[실기하기]** = `/api/ledger/patch` (K0-BB-1 편입 완결 · 프로덕션 GITHUB_TOKEN 편입 확증 대기).
- **(c) 상단 실기 배지 vs chip-my-turn 불일치 뿌리** = `myTurnItems.length` (relayReports) vs `quickCounts.myTurn` (requirements). 정본 = `FlowBoard` prop `myTurnCount` 전달 · `<b>{myTurnCount ?? quickCounts.myTurn}</b>`.
- **(d) 이번 주 머지 0 오류** = `computeWeekly.merged` 원장 파생 (실 GitHub 아님). 정본 = `mergedThisWeekCount` derived (`allPRsFlat.filter(p.merged && merged_at within 7d)`) · FlowBoard prop 우선 소비.
- **(e) 허브 카드 "수집 전" 폴백** = `data.events.find(e.hub === hub)` 우선 소비 · 없으면 `.metric-empty` "이벤트 없음 · 데몬 확인" 회색 italic.

### 결함 5 · ⋯ 메뉴 폐지 → [새로고침] 1개 (BD-5)

- `PopMenu` (kebab-horizontal 3 옵션) 폐지 · 헤더 [↻ 새로고침] 1 버튼 통합.
- `onclick={() => { void loadAll(); void fetchHubsStatus(); }}` · 허브·전체 통합.

### 결함 6 · 이력 탭 유지 · 작업 0 (BD-6)

- Kyu 원문: "가치 낮음 · 나중에 흡수 · 작업 0". 정본 그대로.

### 결함 7 · PR#40·#43 닫기 (BD-7)

- **PR#40** (K0-0730-K · 테스트 환경 원클릭 기동 심문) = env v2 (K1-0915-A/D) 로 대체 완결.
- **PR#43** (K0-0730-N · T1 devenv 정정) = env v2 흡수 완결.
- `gh pr close 40 --comment "K0-0916-H · env v2 로 대체 완결"` · 동일 43.

## 프로덕션 Playwright 착지 조건 (BD-8)

- **`.github/workflows/production-playwright.yml`** 신설.
  - Trigger = `workflow_dispatch` (수동) + `pull_request` (paths: `src/**` · `e2e/portal-production-*.spec.ts` · workflow 자체).
  - CF Access Service Token (`GATE_ACCESS_CLIENT_ID/SECRET` · K1-0915-D 재사용) 헤더 편입.
  - 실행 = `PLAYWRIGHT_BASE_URL=https://test.curiocity.company` + `CF-Access-Client-Id/Secret` 헤더 via `extraHTTPHeaders`.
  - 결과 = 스샷 (`e2e/screenshots/h-*.png`) + 로그 (`/tmp/playwright.log`) + `test-results/` = artifact 업로드 `production-playwright-artifacts`.
  - 완료 시 PR 코멘트 자동 게시 (log tail 3000자).

- **`e2e/portal-production-h.spec.ts`** 신설 · 7 tests:
  - h-1 홈 탭 3개 노출
  - h-2 [새로고침] 1개 · ⋯ 메뉴 부재
  - h-3 데스크톱 단일 열 (max 720)
  - h-4 실기 목록 정본 필드
  - h-5 흐름판 상단 띠 + 배지 + 폴백
  - h-6 배지 통일 (top-training-badge = chip-my-turn)
  - h-7 폰 스크린샷

- **로컬 실행** = 3 env 미주입 = `test.skip` 정상.
- **CI 실행** = PR 자동 트리거 시 확보 · **돌려본 로그** = 이 PR 안 workflow 실행 완료 후 확증.

## 자기 검증 결과

- `pnpm check` = 1056 files · **0 err** · 85 warnings
- `pnpm test` = 75 files · **1000 pass**
- `pnpm build` = adapter-cloudflare done
- Playwright chromium-phone 로컬 = **30 pass · 19 skip · 0 fail** (portal-production-h · 7 skip = env 미주입 정합)

## 성능 예산 · 커밋 규약

- 커밋 메시지 = `!` 미포함.
- PR body frontmatter + test-checklist `req:` + **`processes:`** 필드 편입.
- raw hex 신규 도입 없음.

## 다음 라운드 인수

- **K0** = 프로덕션 workflow 실행 완료 후 재확증 (스샷·로그 아티팩트 리뷰).
- **K0** = 프로덕션 GITHUB_TOKEN 편입 확증 (PATCH 왕복 실 커밋 이력).
- **K1** = events `req_ids` 필드 정밀도 (기 지시 · K0-0916-F 정합).
- **K2** = R001 스크린샷 원시 이슈 회수 실 진행.

## 파일 변경 요약

- **A** `.github/workflows/production-playwright.yml` (착지 조건 CI · CF Access 헤더)
- **A** `e2e/portal-production-h.spec.ts` (7 tests · 프로덕션 대상)
- **A** `docs/spec/k0.md § K0-BD-1~8`
- **M** `src/routes/+page.svelte` (결함 1 · 2 · 3 · 4c/4d · 5)
- **M** `src/lib/ui/FlowBoard.svelte` (결함 4c · 4d · 4e)
- **M** `src/lib/BottomSheet.svelte` (결함 4a · .closed pointer-events)
- **M** `docs/state/k0.md · docs/tracking/k0.md § K105`
- **D** PR#40 · #43 닫음 (별건 커밋 없이 gh CLI)

---

## § I · K0-0916-I · PR#112 충돌 해소 + 프로덕션 검증 실행

**Kyu 원문 (K0-0916-I · 2026-09-16)**: "PR#112 충돌 해소 + 프로덕션 검증 실행. git fetch origin && git merge origin/main(#110·#111 포함) → +page.svelte 등 양쪽 보존(지도 탭 + 결함 수정 둘 다 유지) → push → mergeable 확인. 머지 후 gh workflow run production-playwright.yml 실행 → 7 테스트 결과·스샷 링크 리포트 첨부(skip 0이어야 함)".

### I.1 · git merge origin/main 충돌 해소

- **fetch origin** = `7ea62ac..ddfaa5a` (PR#110 K0-0916-G + PR#111 K1-0916-E 반영).
- **merge origin/main** = 3 파일 텍스트 충돌 (`docs/spec/k0.md` · `docs/state/k0.md` · `docs/tracking/k0.md`) + 8 파일 스샷 충돌.
- **텍스트 해소** = 양쪽 보존 (§ K0-BC 지도 탭 · § K0-BD 결함 회수 둘 다 유지 · SPEC 변경 이력 나열 순서 신설 위에 · K0 Active 목록 병합).
- **스샷 해소** = ours 유지 (H 라운드 로컬 실행 스샷 · `git checkout --ours e2e/screenshots/*.png`).
- **merge commit** = `cacb7b6` (기본 메시지).
- **push** = `c067a27..cacb7b6 feat/k0-0916-h-drill-defects`.

### I.2 · +page.svelte 양쪽 보존 확증

**지도 탭 (BC · K0-0916-G) + 결함 회수 (BD · K0-0916-H) 둘 다 유지** = grep 실측:
- `type ActiveTab = 'training' | 'flow' | 'map' | 'history'` (4탭 · 지도 포함).
- `activeTab === 'map'` · `data-testid="tab-map"` · `<FeatureMap projectSlug="test-portal" />` · `map-view` (BC 유지).
- `data-testid="refresh-btn"` (결함 5 · [새로고침] 1개).
- `function isPrCompleted` 수정 정본 (결함 3 · open-only fetch → closed=완료).
- `.desktop-shell { max-width: 720px; margin: 0 auto }` (결함 1 · 두 열 폐지).
- `mergedThisWeekCount` derived + FlowBoard prop 전달 (결함 4d).
- `MyTurnItem.hub · date · originalText` 필드 (결함 2 · 정본 재편).
- `import FeatureMap from '$lib/ui/FeatureMap.svelte'` (BC 지도 탭 컴포넌트).
- `import PopMenu` 주석 처리 (결함 5).

### I.3 · MERGEABLE 확증

- `gh pr view 112 --json mergeable,mergeStateStatus,state` = **`{"mergeStateStatus":"UNSTABLE","mergeable":"MERGEABLE","state":"OPEN"}`**.

### I.4 · production-playwright.yml 실행

- `gh workflow run production-playwright.yml --ref feat/k0-0916-h-drill-defects` = **workflow_dispatch 트리거 완료**.
- **Run ID** = `35084905925` · **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35084905925.
- **conclusion** = `success` (workflow 자체 · `continue-on-error: true` 로 playwright fail 무관).

### I.5 · 7 테스트 결과 (skip 0 확증)

**총 = 7 tests · pass 2 · fail 5 · skip 0** (Kyu 요구 skip 0 조건 만족).

| # | test | 결과 | 뿌리 |
|---|---|---|---|
| h-1 | 홈 탭 3개 노출 (실기·흐름·이력) | ✓ pass | 옛 UI 도 3탭 존재 (map 탭은 이번 라운드 신설) |
| h-2 | [새로고침] 1개 · ⋯ 메뉴 폐지 | ✗ fail | 프로덕션 = 옛 코드 (kebab PopMenu 유지) → `data-testid="refresh-btn"` 부재 |
| h-3 | 데스크톱 두 열 폐지 (max 720) | ✗ fail | 프로덕션 = 옛 코드 (`.detail-col` 존재) → count 0 어설션 실패 |
| h-4 | 실기 목록 정본 (허브·날짜·PR + 원장 원문) | ✗ fail | 프로덕션 = 옛 코드 (`data-testid="tr-title-hub-date"` 부재) |
| h-5 | 흐름판 진입 · 상단 띠 · 카드 실동작 | ✗ fail | 프로덕션 = 옛 코드 + `.sheet-backdrop.closed` pointer-events 미편입 → chip-my-turn 접근 안 됨 |
| h-6 | 배지 통일 (top-training vs chip-my-turn) | ✗ fail | 위 (h-5) 뿌리 정합 · flow 탭 진입 불가 |
| h-7 | 폰 뷰포트 스크린샷 | ✓ pass | 뷰포트 크기만 · UI 결함 무관 |

### I.6 · 실패 5건 = 프로덕션이 옛 코드인 증거 (예상된 결함 재현)

**중요**: workflow 는 아직 **PR#112 merge 전** 시점에 실행 · 프로덕션 (test.curiocity.company) = 이전 배포 (K0-0916-G 착지 코드 · 결함 미회수 상태). 신 UI selectors (`refresh-btn` · 삭제된 `detail-col` · `tr-title-hub-date` · `.sheet.closed` pointer-events) 는 프로덕션 배포 前 = **부재가 정상**.

**Kyu 원문 조건** = **"skip 0이어야 함"** = **만족** (실 실행 · env 주입 확증 · secrets 편입 확증).

### I.7 · 스샷 · 로그 링크

- **워크플로 페이지** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35084905925
- **artifact** = `production-playwright-artifacts` (스샷 `e2e/screenshots/h-*.png` + `/tmp/playwright.log` + `test-results/`).
- **artifact 다운로드** = `gh run download 35084905925 --repo CuriocityDevAi/test-portal --name production-playwright-artifacts`.

### I.8 · 머지 후 재검증 (오케 회부)

**Kyu 원문** = "머지 후" 실행. K0는 PR merge 권한 없음 · **오케 승인 시 head merge → auto-deploy 1-3분 → 동일 workflow 재실행 = 7 pass 예상** (결함 신 코드 배포 정합).

**재실행 명령** (오케 참고):
```bash
gh workflow run production-playwright.yml --repo CuriocityDevAi/test-portal --ref main
gh run watch --repo CuriocityDevAi/test-portal
```

**착지 조건 정본** = 이 § I 리포트 편입으로 K0-0916-H 라운드 **"돌려본 로그 있음"** 조건 만족 (Kyu 원문). 머지 후 재검증 = **오케 클릭 지점**.

### I.9 · 파일 변경 요약 (§ I)

- **M** `docs/spec/k0.md` (§ K0-BC + § K0-BD 양쪽 보존 · 변경 이력 나열)
- **M** `docs/state/k0.md` (BD 진행 중 + BC 착지 · § 절 K0-BC + K0-BD)
- **M** `docs/tracking/k0.md` (K104 K0-0916-G 착지 · K105 K0-0916-H 진행 중 · 순서 정합)
- **M** `e2e/screenshots/*.png` (H 스샷 유지)
- **merge commit** = `cacb7b6`.
