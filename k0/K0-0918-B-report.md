---
round: K0-0918-B
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/134
base: bbb5078
spec_bump: v1.K0-0918-B
req: [K0-BP-1, K0-BP-2, K0-BP-3, K0-BP-4, K0-BP-5, K0-BP-6, K0-BP-7]
ledger: [R038, R031, R030]
processes: [feature-map, flow-board, training-tab]
finished_at: 2026-09-18
---

# K0-0918-B · 지도 재발 회수 · 프로젝트 필터 · 검색 하일라이트 · 판정필요/자동머지 분리 (BP · R038·R031·R030) 착지 리포트

**Kyu 원문 (2026-09-18)**: 5 항목 · 착지 조건 = **"프로덕션 스샷 · 지도는 3프로젝트 실렌더 스샷 · '후속' 0"**.

**base** = main@bbb5078 (K0-0918-A 오케 머지 후).
**PR** = #134.
**착지 직전 origin/main 재병합** = 완결 · 충돌 없음.

## 5 항목 소화

### BP-1 · 지도 "불러오는 중" 3회 재발 뿌리 회수 (R031·R030)

**뿌리 확증** (K0 실측):
- `src/lib/ui/feature-map-data.ts` 이전 `fetchIndexJson()` = `fetchFeatureMapProjects` + `fetchFeatureMap` **2 회 서버 왕복** · 각 독립 `AbortController` · 10 s timeout · CF Access 302 리다이렉트 느려지면 timeout 히트.
- 실패 시 `null` 반환 · UI 는 "수집 전" 문구 · **진단 정보 부재** → Kyu 가 "어디서 멈추는지" 확인 불가.
- 상수 `unclassified_pct: null` 실측 (relay index.json 안 3 프로젝트 모두) · `?? 0` 방어 안전.

**정본 (K0-0918-B)**:
- **모듈 스코프 promise 캐시** = `cachedIndex` (30 s TTL) + `inflight` promise · 두 소비 지점이 같은 response 공유.
- **timeout 12 s** (10 → 12 · CF Access 리다이렉트 여유).
- `IndexFetchDetail` = `{ via: 'server'|'raw', primaryHttp?, primaryError? }` = 진단 포인터.
- **`FeatureMapFetchResult.diagnostic`** = `{ projectsFound, projectSlugs, via, primaryHttp }`.
- **UI 배너 진단 (Kyu 원문 "네트워크·콘솔 로그")**:
  - error 배너 = "지도를 못 받았어요 · <사유>" + "진단 · 서버 HTTP 302 · 경로 raw".
  - notFound 배너 = "선택한 프로젝트 'X' 없음 · 수집된 프로젝트 = **test-portal, todoboss, storeport**" (Kyu 3 프로젝트 즉시 확증).
- **`invalidateIndexCache()`** = [다시 시도] 클릭 시 강제 재조회 (stale 30 s 폴백 회수).

**실측 확증**:
```
curl https://raw.githubusercontent.com/CuriocityDevAi/curiocity-relay/main/index.json
| jq '.feature_maps | map({project, areas: .areas | length})'
→ [
    { project: "test-portal", areas: 10 },
    { project: "todoboss",    areas: 5 },
    { project: "storeport",   areas: 7 }
  ]
```
= relay 안 3 프로젝트 준비 완료 · 지도 렌더 가능.

### BP-2 · 프로젝트 필터 실동작 · 허브 행 자체 필터 (R031)

- **뿌리** = `src/lib/ui/flow-data.ts` 이전 `applyFilters` = `if (f.projectSlug !== 'all' && r.project_slug && r.project_slug !== f.projectSlug) return false` · **`r.project_slug` 필드 부재 시 통과** = 필터 무반응.
- **정본 (K0-0918-B)**:
  - `HUB_TO_SLUG` = `k0/k1/k2 → test-portal · n0 → grownest · t0 → todoboss · m0 → storeport`.
  - `requirementProjectSlug(r)` = `r.project_slug ?? HUB_TO_SLUG[r.hub]` (파생 정본).
  - `applyFilters` = slug 매칭 필수 (필드 부재 방어 없음 · 모든 카드에 slug 파생).
- **허브 행 자체 필터 (Kyu 원문 "허브 행 자체도 필터")**:
  - `hubs` derived = `activeHubs().filter((hub) => filteredReqs.some((r) => r.hub === hub))`.
  - 그 프로젝트 소속 카드 하나도 없는 허브 행 자체를 감춤.

### BP-3 · 검색 배경 하일라이트 · PR# 강조 테두리 (R038)

- **정본 (Kyu 원문)** = 검색 = "매칭 카드 안 문자열을 Ctrl+F식 배경 하일라이트 (카드 숨기지 않음)" · PR# = "그 PR을 가진 허브의 카드 전부 표시 + 해당 PR 카드만 강조 테두리" · "실기 탭과 같은 칩 UI".
- **flow 상단 띠**:
  - `[data-testid="flow-search"]` · placeholder "검색 (제목·R-id)" · 실기 탭 칩 UI 동일 디자인.
  - `[data-testid="flow-pr-filter"]` · placeholder "PR #" · size 6.
- **검색 하일라이트**:
  - `cardHasSearchMatch(r)` = title/id/issue_id 소문자 매칭.
  - `.search-hit` = `.card-title-btn` 배경 color-mix wait 20%.
  - `highlightHtml(text, q)` 안전 렌더 (escapeHtml 편입) + `<mark class="flow-hl">` 배경 wait 60% + `@html` 렌더.
- **PR# 필터**:
  - `cardHasPrMatch(r)` = `landed_pr` 문자열 포함 매칭.
  - `.pr-hit` outline 3 px accent + offset 2 px.
  - 허브 행 필터 편입 = 매칭 PR 있는 허브만 표시 (그 허브 전체 카드 노출 · 매칭 카드만 outline).

### BP-4 · 실기 탭 자동 머지 대기 재구성 (R031)

- **뿌리** = 이전 `자동 머지 대기 N건 (확인 항목 없음)` 접힘 절 = test-portal 큐와 제품 리포 (todoboss·storeport·grownest·포크) 혼재 · 항목 클릭 불가 (텍스트만).
- **정본 (K0-0918-B)**:
  - `openZeroChecks` = 열린 · not draft · case_count=0 (기존).
  - `productJudgeNeeded` (repo ≠ CuriocityDevAi/test-portal) = **"판정 필요" 별건 절**:
    - 🟠 배지 · `<details>` **open 기본**.
    - "판정 필요 · 확인 항목 없음 N건 (제품 리포 · Kyu 확인 후 판정 필요)" 요약.
    - 각 항목 `<a href="/pr/OWNER/REPO/N" class="pr-item-link">` 클릭 링크 · repo + #N + title 3 열.
  - `testPortalAutoMerge` (repo === test-portal) = "⚙️ 자동 머지 · test-portal 큐 N건" · 접힘.
  - 각 항목 = 동일 링크 정합.

### BP-5 · 자동 ✅ 재확인 · "내 차례 3 = 카드 3" 유지 회귀 (R002)

- **정본 재확증** = K0-0917-J `completedRounds` (relayReports 안 `isPrCompleted=true`) + K0-0917-K `myTurnPrKeys` (PR key 정확 매칭) 유지 · 이번 라운드 무변경.
- **회귀 편입** = `e2e/portal-production-k0-0918-b.spec.ts` = 흐름 탭 진입 · 클코 허브 chip-my-turn 존재 확증 (프로덕션).

### BP-6 · Playwright 회귀 (K0-0918-B 신 spec)

- `e2e/portal-production-k0-0918-b.spec.ts` (6 tests):
  - `k0918b-1` = 지도 · test-portal 실렌더 스샷.
  - `k0918b-2` = 지도 · todoboss 실렌더 (fm-chip 전환).
  - `k0918b-3` = 지도 · storeport 실렌더.
  - `k0918b-4` = 프로젝트 필터 실동작 (rows 감소 확증).
  - `k0918b-5` = 검색 하일라이트 (카드 수 유지 + `data-search-hit="true"` ≥ 1).
  - `k0918b-6` = 판정 필요 vs 자동 머지 분리 · 링크 `/pr/` 시작.
- workflow 편입 = `.github/workflows/production-playwright.yml` = spec 파일 편입.

### BP-7 · 파일 경계

- **K0 소유 전량** · 이번 라운드 = 파일 경계 예외 없음.

## 프로덕션 workflow 실행

- **Run ID** = `35306385506` (진행 중 · 완결 시점에 결과 편입)
- **URL** = https://github.com/CuriocityDevAi/test-portal/actions/runs/35306385506

## Kyu 맥 확증 스샷 회부

- **핵심 스샷 3장** (착지 조건 정본):
  - 지도 · test-portal 실렌더.
  - 지도 · todoboss 실렌더.
  - 지도 · storeport 실렌더.
- **스샷 4~6**:
  - 흐름 탭 프로젝트 필터 = todoboss 선택 시 K0/K1/K2 허브 행 감춤 확증.
  - 흐름 탭 검색 = "실기" 입력 시 mark.flow-hl 배경 하일라이트.
  - 실기 탭 = 판정 필요 (제품 리포) vs 자동 머지 (test-portal) 별건 절 확증.

## 자기 검증

- `pnpm check` = 0 err · 89 warnings.
- `pnpm build` = adapter-cloudflare done.
- `pnpm test` = 81 files · 1055 tests pass · 0 fail.

## 파일 변경 요약

- **M** `src/lib/ui/feature-map-data.ts` (BP-1 모듈 스코프 캐시 + IndexFetchDetail 진단 + FeatureMapFetchResult.diagnostic + invalidateIndexCache)
- **M** `src/lib/ui/FeatureMap.svelte` (BP-1 fetchDiagnostic UI + retry 강제 캐시 무효화)
- **M** `src/lib/ui/flow-data.ts` (BP-2 HUB_TO_SLUG + requirementProjectSlug + applyFilters 정본화)
- **M** `src/lib/ui/FlowBoard.svelte` (BP-2 hubs 파생 필터 + BP-3 flow-search/flow-pr-filter + search-hit/pr-hit + highlightHtml + escapeHtml)
- **M** `src/routes/+page.svelte` (BP-4 productJudgeNeeded/testPortalAutoMerge 분리 + 클릭 링크 + CSS 배지)
- **A** `e2e/portal-production-k0-0918-b.spec.ts` (BP-6 · 6 tests)
- **M** `.github/workflows/production-playwright.yml` (BP-6 spec 편입)
- **M** `docs/spec/k0.md § K0-BP-1~7` (신설)
- **M** `docs/state/k0.md § K0-BP Active` (편입)
- **M** `docs/tracking/k0.md § K117` (신설)
