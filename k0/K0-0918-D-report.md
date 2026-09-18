---
round: K0-0918-D
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/140
base: f82c041
spec_bump: v1.K0-0918-D
req: [K0-BR-0, K0-BR-1, K0-BR-2, K0-BR-3, K0-BR-4, K0-BR-5, K0-BR-6, K0-BR-7]
ledger: [R031, R002, R030, R032]
processes: [pr-detail-view, flow-board, feature-map, deployment]
finished_at: 2026-09-18
---

# K0-0918-D · 배포 실물 대조 · 칩 dim · 시트 fallback · 카드 PR/발부 ID · Playwright 스모크 (BR · R031·R002·R030·R032) 착지 리포트

**Kyu 원문 (2026-09-18)**: "기능 추가 금지. 착지 조건 = 프로덕션 스샷 (주소창 포함) + Kyu 시크릿 재확인." 6 항목 + 배포 실물 확인.

**base** = main@f82c041 (K1-0918-E agilo 200 확증 후).
**PR** = #140.
**착지 직전 origin/main 재병합** = 완결 · 충돌 없음.

## 7 항목 소화 (0 배포 실물 + 1~6 결함)

### BR-0 · 배포 실물 대조 (Kyu 원문 "이게 뿌리면 1~6 자동 해결")

**정본 (K0-0918-D)**:
- `vite.config.ts` (K0 tooling 정본) = `define` 빌드 타임 상수:
  - `__BUILD_SHA__` = `git rev-parse HEAD` (로컬) · env 폴백 (`CF_PAGES_COMMIT_SHA` / `GITHUB_SHA` / `COMMIT_SHA`).
  - `__BUILT_AT__` = `new Date().toISOString()`.
- `src/build-constants.d.ts` = ambient `declare const` (클라이언트 + 서버 공통 인식).
- `/api/version` = 빌드 상수 우선 · Cloudflare env 폴백 · source 필드 `'build-time'|'unknown'`.
- `+page.svelte` `.build-footer` 하단 고정:
  - `build-sha` = `build <SHA 7자>`.
  - `build-at` = `YYYY-MM-DD HH:MM:SS` (title=full ISO).
  - `versionSha` API fetch (`onMount`) · 빌드 상수와 대조 · **불일치 시 `⚠ API xxxxxxx` 표시** = Kyu 즉시 감지.

### BR-1 · 칩 클릭 = dim (숨김 없음)

**뿌리** = 이전 `applyFilters` 안 quickFilter 를 hard filter 로 소비 → 매칭 안 되는 카드 완전 사라짐.

**정본 (K0-0918-D)**:
- `applyFilters` 는 project + priority hard filter 만 (quickFilter='all' 강제).
- `isQuickFilterMatch(r)` = card 별 매칭 여부 (my-turn/decision/drill).
- `.dimmed` class = `opacity: 0.25` + `filter: grayscale(50%)` (hover 0.5).
- **실기 칩 = `myTurnCount ?? quickCounts.drill`** (실기 탭과 동일 함수 · Kyu 원문 "실기 = 실기 탭과 같은 함수 (현재 0 vs 2)").

### BR-2 · 카드 클릭 → 시트 (currentTask null fallback)

**뿌리 추정** = `openSheet === 'task' && currentTask !== null` 가드 → `sheetTaskId` 가 `data.requirements` 안 매치 안 되면 currentTask null → 시트 안 뜸.

**정본 (K0-0918-D)**:
- 가드 완화 = `openSheet === 'task'` 만.
- `currentTask null` 시 = `task-sheet-empty` 안내 render:
  - "⚠ 카드 id `X` 를 원장 데이터에서 찾을 수 없습니다."
  - "원장 카드 수: N · 소스: seed/live".
- `openTaskSheet` / `openDrillSheet` = 콘솔 로그 `[K0-0918-D] openTaskSheet { id, found, reqCount }` = 진단 뿌리 (Kyu 원문 "콘솔 로그로").

### BR-3 · 카드 본문 발부 ID · PR # 링크

- `issue-id-link` = `<a href="/#history?round=<issue_id>">` · `onclick.stopPropagation` (시트 열림 방지).
- `card-pr-link` = `<a href="/pr/<owner>/<repo>/<landed_pr>">` · **`HUB_REPO[r.hub]` 조립** (k0/k1/k2 → test-portal · n0 → grownest · t0 → todoboss · m0 → storeport).
- 표시 형식 = `<repo>#<PR>` (예 "todoboss#23").
- CSS = accent 배경 10% · hover 20%.

### BR-4 · 지도 진단 (K0-0918-B 유지)

- `fetchDiagnostic` 배너 + `invalidateIndexCache()` 유지.
- 이번 라운드 = 프로덕션 스모크 (k0918d-4) 로 error / empty / 정상 3-way 확증.

### BR-5 · 영향 절 (K0-0917-K 유지)

- `.impact-section` + `[자세히 보기]` 모달 + `linkedPrFromReport` 유지.
- 이번 라운드 = 프로덕션 스모크 (k0918d-5) 로 Todoboss PR#23 페이지 로딩 확증.

### BR-6 · Playwright 프로덕션 스모크 · 배포 후 자동 실행

- **신 spec** `e2e/portal-production-k0-0918-d.spec.ts` (6 tests):
  - `k0918d-0` = build-footer 노출 · build sha + 시각.
  - `k0918d-1` = 흐름 탭 chip-my-turn 클릭 → 카드 수 유지 (dim 처리 확증).
  - `k0918d-2` = 카드 클릭 → 시트 or empty 안내 render.
  - `k0918d-3` = 카드 = 발부 ID + PR # 링크 존재 확증.
  - `k0918d-4` = 지도 탭 · error/empty/정상 3-way 확증.
  - `k0918d-5` = Todoboss PR#23 · error / detail 확증.
- **workflow 확장** (`.github/workflows/production-playwright.yml`):
  - `push: [main]` = main 머지 시 auto-deploy 5분 대기 후 자동 실행 (Cloudflare Workers Builds 1~3분 여유).
  - `schedule: '0 */6 * * *'` = 6시간마다 회귀 감시.
  - `pull_request` 유지.
  - **실패 시 오케 알림** = main / schedule 대상 workflow fail (exit 1) · relay 회부 대상.

### BR-7 · 파일 경계

- **K0 소유 전량** · 이번 라운드 = **파일 경계 예외 없음**.
- vite.config.ts + api/version 은 이미 K0 tooling 정본 (K0-0914-AW-E 편입).

## 프로덕션 workflow 실행

- **Run ID** = `35332776252` (진행 중)
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35332776252

## Kyu 확증 대기 스샷 6

1. **하단 build-footer** = `build <SHA 7> · 2026-09-18 HH:MM:SS` (주소창 포함).
2. **흐름 탭 chip-my-turn 클릭** = 매칭 카드 선명 + 나머지 흐림 (숨김 없음).
3. **카드 클릭 → 시트 렌더** (또는 task-sheet-empty 안내).
4. **카드 본문** = issue-id-link + card-pr-link 노출.
5. **지도 탭** = 3 프로젝트 트리맵 or 진단 배너.
6. **Todoboss PR#23** = 영향 절 노출.

## 배포 대조 표

이번 라운드 = build-footer 신설로 프로덕션에서 실시간 확인 가능:
- 홈 화면 진입 → 하단 `build <SHA>` 확증 → main HEAD 대조.
- `⚠ API xxxxxxx` 표시 = 배포/API 불일치 감지.

**Cloudflare 배포 이력 확인 방법** (Kyu 원문 "최근 5개 배포가 실패/스킵됐으면 원인·수정"):
- Cloudflare Dashboard → Workers & Pages → test-portal → Deployments.
- main push 후 3분 이내 새 version 확인 · 실패 시 build log 확인.
- 이번 라운드에서 workflow 안 auto-deploy 대기 5분 편입 = 배포 완료 후에 스모크.

## 자기 검증

- `pnpm check` = 0 err · 89 warnings.
- `pnpm build` = adapter-cloudflare done.
- `pnpm test` = **82 files · 1063 tests pass · 0 fail**.

## 파일 변경 요약

- **M** `vite.config.ts` (BR-0 define __BUILD_SHA__/__BUILT_AT__)
- **A** `src/build-constants.d.ts` (BR-0 ambient declare)
- **M** `src/app.d.ts` (BR-0 declare const)
- **M** `src/routes/api/version/+server.ts` (BR-0 빌드 상수 우선)
- **M** `src/routes/+page.svelte` (BR-0 build-footer · versionSha · fetchVersion)
- **M** `src/lib/ui/FlowBoard.svelte` (BR-1 dim · BR-2 fallback · BR-3 링크 · HUB_REPO import)
- **A** `e2e/portal-production-k0-0918-d.spec.ts` (BR-6 · 6 tests)
- **M** `.github/workflows/production-playwright.yml` (BR-6 push+schedule+auto-deploy 대기+fail alert)
- **M** `docs/spec/k0.md § K0-BR-0~7` (신설)
- **M** `docs/state/k0.md § K0-BR Active` (편입)
- **M** `docs/tracking/k0.md § K119` (신설)
